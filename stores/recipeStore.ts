import { defineStore } from 'pinia';
import type RecipeInterface from '~/types/RecipeInterface';
import type WeekPlanInterface from '~/types/WeekPlanInterface';
import type DietTagEnum from '~/types/DietTagEnum';
import { rankRecipes } from '~/composables/useRecipeMatch';
import { useReceiptStore } from '~/stores/receiptStore';
import { recipes } from '~/data/recipes';

interface HouseholdStateInterface {
    adults: number;
    children: number;
    excludedDietaryTags: DietTagEnum[];
}

const USER_RECIPE_ID_PREFIX = 'user-';
const WEEK_PLAN_KEY = 'ah-planner-week-plan';

function parseStored<T>(key: string, fallback: T): T {
    const stored = localStorage.getItem(key);
    if (!stored) {
        return fallback;
    }
    try {
        return JSON.parse(stored) as T;
    } catch {
        return fallback;
    }
}

function getWeekStart(date: Date): string {
    const start = new Date(date);
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    return start.toISOString().slice(0, 10);
}

function parseWeekPlans(key: string): Record<string, WeekPlanInterface> {
    const stored = localStorage.getItem(key);
    if (!stored) {
        return {};
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(stored);
    } catch {
        return {};
    }

    if (typeof parsed !== 'object' || parsed === null) {
        return {};
    }

    const obj = parsed as Record<string, unknown>;
    const values = Object.values(obj);
    const isLegacyFlatPlan = values.length > 0 && values.every((v) => typeof v === 'string');
    if (isLegacyFlatPlan) {
        return { [getWeekStart(new Date())]: obj as WeekPlanInterface };
    }

    return obj as Record<string, WeekPlanInterface>;
}

function nextUserRecipeId(existingRecipes: RecipeInterface[]): string {
    const usedIds = new Set(existingRecipes.map((r) => r.id));
    let index = 1;
    while (usedIds.has(`${USER_RECIPE_ID_PREFIX}${index}`)) {
        index += 1;
    }
    return `${USER_RECIPE_ID_PREFIX}${index}`;
}

export const useRecipeStore = defineStore('recipe', {
    state: () => ({
        allRecipes: recipes as RecipeInterface[],
        userRecipes: parseStored<RecipeInterface[]>('ah-planner-user-recipes', []),
        importedRecipes: parseStored<RecipeInterface[]>('ah-planner-imported-recipes', []),
        household: parseStored<HouseholdStateInterface>(
            'ah-planner-household',
            { adults: 2, children: 1, excludedDietaryTags: [] },
        ),
        savedRecipeIds: parseStored<string[]>('ah-planner-saved-recipes', []),
        weekPlans: parseWeekPlans(WEEK_PLAN_KEY),
        currentWeekStart: getWeekStart(new Date()),
    }),

    getters: {
        availableRecipes: (state): RecipeInterface[] => [
            ...state.importedRecipes,
            ...state.allRecipes,
            ...state.userRecipes,
        ],

        savedRecipes(): RecipeInterface[] {
            return this.availableRecipes.filter((r) => this.savedRecipeIds.includes(r.id));
        },

        suggestedRecipes(): RecipeInterface[] {
            const receiptStore = useReceiptStore();
            return rankRecipes(
                this.availableRecipes,
                receiptStore.itemsWithPurchaseDate,
                new Date(),
                this.household.excludedDietaryTags,
            ).map((s) => s.recipe);
        },

        weekPlan(state): WeekPlanInterface {
            return state.weekPlans[state.currentWeekStart] ?? {};
        },

        weekPlanRecipes(): Record<string, RecipeInterface | undefined> {
            const result: Record<string, RecipeInterface | undefined> = {};
            for (const [day, recipeId] of Object.entries(this.weekPlan)) {
                result[day] = this.availableRecipes.find((r) => r.id === recipeId);
            }
            return result;
        },
    },

    actions: {
        addRecipe(recipe: Omit<RecipeInterface, 'id'>): RecipeInterface {
            const created = { ...recipe, id: nextUserRecipeId(this.availableRecipes) };
            this.userRecipes.push(created);
            this.persistUserRecipes();
            return created;
        },

        updateRecipe(recipeId: string, changes: Partial<Omit<RecipeInterface, 'id'>>): void {
            const recipe = this.userRecipes.find((r) => r.id === recipeId);
            if (!recipe) {
                return;
            }
            Object.assign(recipe, changes);
            this.persistUserRecipes();
        },

        deleteRecipe(recipeId: string): void {
            const index = this.userRecipes.findIndex((r) => r.id === recipeId);
            if (index === -1) {
                return;
            }
            this.userRecipes.splice(index, 1);
            this.persistUserRecipes();

            if (this.savedRecipeIds.includes(recipeId)) {
                this.toggleSaveRecipe(recipeId);
            }

            let removedAny = false;
            for (const plan of Object.values(this.weekPlans)) {
                for (const [day, plannedId] of Object.entries(plan)) {
                    if (plannedId === recipeId) {
                        delete plan[day];
                        removedAny = true;
                    }
                }
            }
            if (removedAny) {
                this.persistWeekPlans();
            }
        },

        persistUserRecipes(): void {
            localStorage.setItem(
                'ah-planner-user-recipes',
                JSON.stringify(this.userRecipes),
            );
        },

        toggleSaveRecipe(recipeId: string): void {
            const index = this.savedRecipeIds.indexOf(recipeId);
            if (index === -1) {
                this.savedRecipeIds.push(recipeId);
            } else {
                this.savedRecipeIds.splice(index, 1);
            }
            localStorage.setItem(
                'ah-planner-saved-recipes',
                JSON.stringify(this.savedRecipeIds),
            );
        },

        assignToDay(day: string, recipeId: string): void {
            this.assignToDays([day], recipeId);
        },

        /** The same pan often feeds two days, so a recipe can take several at once. */
        assignToDays(days: string[], recipeId: string): void {
            if (!this.weekPlans[this.currentWeekStart]) {
                this.weekPlans[this.currentWeekStart] = {};
            }
            for (const day of days) {
                this.weekPlans[this.currentWeekStart][day] = recipeId;
            }
            this.persistWeekPlans();
        },

        replaceWeekPlan(plan: WeekPlanInterface): void {
            this.weekPlans[this.currentWeekStart] = plan;
            this.persistWeekPlans();
        },

        /** Dropping a day on another swaps them, so an occupied day is never overwritten. */
        swapDays(from: string, to: string): void {
            const plan = this.weekPlans[this.currentWeekStart];
            const moving = plan?.[from];
            if (!plan || !moving || from === to) {
                return;
            }
            const displaced = plan[to];
            plan[to] = moving;
            if (displaced) {
                plan[from] = displaced;
            } else {
                delete plan[from];
            }
            this.persistWeekPlans();
        },

        setHousehold(adults: number, children: number): void {
            this.household = {
                ...this.household,
                adults: Math.max(0, adults),
                children: Math.max(0, children),
            };
            localStorage.setItem('ah-planner-household', JSON.stringify(this.household));
        },

        setExcludedDietaryTags(excludedDietaryTags: DietTagEnum[]): void {
            this.household = { ...this.household, excludedDietaryTags };
            localStorage.setItem('ah-planner-household', JSON.stringify(this.household));
        },

        importRecipe(recipe: RecipeInterface): void {
            const existing = this.importedRecipes.findIndex((r) => r.id === recipe.id);
            if (existing === -1) {
                this.importedRecipes.unshift(recipe);
            } else {
                this.importedRecipes[existing] = recipe;
            }
            localStorage.setItem(
                'ah-planner-imported-recipes',
                JSON.stringify(this.importedRecipes),
            );
        },

        removeImportedRecipe(recipeId: string): void {
            this.importedRecipes = this.importedRecipes.filter((r) => r.id !== recipeId);
            localStorage.setItem(
                'ah-planner-imported-recipes',
                JSON.stringify(this.importedRecipes),
            );
        },

        removeFromDay(day: string): void {
            const plan = this.weekPlans[this.currentWeekStart];
            if (plan) {
                delete plan[day];
            }
            this.persistWeekPlans();
        },

        persistWeekPlans(): void {
            localStorage.setItem(WEEK_PLAN_KEY, JSON.stringify(this.weekPlans));
        },

        exportData(): {
            savedRecipeIds: string[];
            weekPlans: Record<string, WeekPlanInterface>;
            userRecipes: RecipeInterface[];
        } {
            return {
                savedRecipeIds: this.savedRecipeIds,
                weekPlans: this.weekPlans,
                userRecipes: this.userRecipes,
            };
        },

        importData(data: {
            savedRecipeIds: string[];
            weekPlans: Record<string, WeekPlanInterface>;
            userRecipes: RecipeInterface[];
        }): void {
            this.savedRecipeIds = data.savedRecipeIds;
            this.weekPlans = data.weekPlans;
            this.userRecipes = data.userRecipes;
            localStorage.setItem(
                'ah-planner-saved-recipes',
                JSON.stringify(this.savedRecipeIds),
            );
            this.persistWeekPlans();
            this.persistUserRecipes();
        },
    },
});

export { getWeekStart };
