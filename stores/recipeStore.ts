import { defineStore } from 'pinia';
import type RecipeInterface from '~/types/RecipeInterface';
import type WeekPlanInterface from '~/types/WeekPlanInterface';
import type { DayPlanInterface } from '~/types/WeekPlanInterface';
import MealSlotEnum from '~/types/MealSlotEnum';
import { rankRecipes } from '~/composables/useRecipeMatch';
import { useReceiptStore } from '~/stores/receiptStore';
import { recipes } from '~/data/recipes';

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

/** Older week plans stored a bare recipe id per day, before there was a meal slot to pick. */
function migrateDayPlan(value: unknown): DayPlanInterface {
    if (typeof value === 'string') {
        return { [MealSlotEnum.dinner]: value };
    }
    return (value ?? {}) as DayPlanInterface;
}

function migrateWeekPlan(plan: Record<string, unknown>): WeekPlanInterface {
    const migrated: WeekPlanInterface = {};
    for (const [day, value] of Object.entries(plan)) {
        migrated[day] = migrateDayPlan(value);
    }
    return migrated;
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
        return { [getWeekStart(new Date())]: migrateWeekPlan(obj) };
    }

    const migrated: Record<string, WeekPlanInterface> = {};
    for (const [weekStart, plan] of Object.entries(obj)) {
        migrated[weekStart] = migrateWeekPlan((plan ?? {}) as Record<string, unknown>);
    }
    return migrated;
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
        household: parseStored<{ adults: number; children: number }>(
            'ah-planner-household',
            { adults: 2, children: 1 },
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
            return rankRecipes(this.availableRecipes, receiptStore.itemsWithPurchaseDate).map(
                (s) => s.recipe,
            );
        },

        weekPlan(state): WeekPlanInterface {
            return state.weekPlans[state.currentWeekStart] ?? {};
        },

        weekPlanRecipes(): Record<string, Partial<Record<MealSlotEnum, RecipeInterface | undefined>>> {
            const result: Record<string, Partial<Record<MealSlotEnum, RecipeInterface | undefined>>> = {};
            for (const [day, meals] of Object.entries(this.weekPlan)) {
                const dayResult: Partial<Record<MealSlotEnum, RecipeInterface | undefined>> = {};
                for (const [slot, recipeId] of Object.entries(meals) as [MealSlotEnum, string][]) {
                    dayResult[slot] = this.availableRecipes.find((r) => r.id === recipeId);
                }
                result[day] = dayResult;
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
                for (const [day, meals] of Object.entries(plan)) {
                    for (const [slot, plannedId] of Object.entries(meals) as [MealSlotEnum, string][]) {
                        if (plannedId === recipeId) {
                            delete meals[slot];
                            removedAny = true;
                        }
                    }
                    if (Object.keys(meals).length === 0) {
                        delete plan[day];
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

        assignToDay(day: string, recipeId: string, mealSlot: MealSlotEnum = MealSlotEnum.dinner): void {
            this.assignToDays([day], recipeId, mealSlot);
        },

        /** The same pan often feeds two days, so a recipe can take several at once. */
        assignToDays(days: string[], recipeId: string, mealSlot: MealSlotEnum = MealSlotEnum.dinner): void {
            if (!this.weekPlans[this.currentWeekStart]) {
                this.weekPlans[this.currentWeekStart] = {};
            }
            for (const day of days) {
                if (!this.weekPlans[this.currentWeekStart][day]) {
                    this.weekPlans[this.currentWeekStart][day] = {};
                }
                this.weekPlans[this.currentWeekStart][day][mealSlot] = recipeId;
            }
            this.persistWeekPlans();
        },

        replaceWeekPlan(plan: WeekPlanInterface): void {
            this.weekPlans[this.currentWeekStart] = plan;
            this.persistWeekPlans();
        },

        /** Dropping a day on another swaps that meal slot, so an occupied slot is never overwritten. */
        swapDays(from: string, to: string, mealSlot: MealSlotEnum = MealSlotEnum.dinner): void {
            const plan = this.weekPlans[this.currentWeekStart];
            const moving = plan?.[from]?.[mealSlot];
            if (!plan || !moving || from === to) {
                return;
            }
            if (!plan[to]) {
                plan[to] = {};
            }
            if (!plan[from]) {
                plan[from] = {};
            }
            const displaced = plan[to][mealSlot];
            plan[to][mealSlot] = moving;
            if (displaced) {
                plan[from][mealSlot] = displaced;
            } else {
                delete plan[from][mealSlot];
                if (Object.keys(plan[from]).length === 0) {
                    delete plan[from];
                }
            }
            this.persistWeekPlans();
        },

        setHousehold(adults: number, children: number): void {
            this.household = { adults: Math.max(0, adults), children: Math.max(0, children) };
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

        removeFromDay(day: string, mealSlot: MealSlotEnum = MealSlotEnum.dinner): void {
            const plan = this.weekPlans[this.currentWeekStart];
            if (plan?.[day]) {
                delete plan[day][mealSlot];
                if (Object.keys(plan[day]).length === 0) {
                    delete plan[day];
                }
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
