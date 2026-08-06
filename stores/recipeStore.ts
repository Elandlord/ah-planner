import { defineStore } from 'pinia';
import type RecipeInterface from '~/types/RecipeInterface';
import { rankRecipes } from '~/composables/useRecipeMatch';
import { useReceiptStore } from '~/stores/receiptStore';
import { recipes } from '~/data/recipes';

const USER_RECIPE_ID_PREFIX = 'user-';

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
        savedRecipeIds: parseStored<string[]>('ah-planner-saved-recipes', []),
        weekPlan: parseStored<Record<string, string>>('ah-planner-week-plan', {}),
    }),

    getters: {
        availableRecipes: (state): RecipeInterface[] => [
            ...state.allRecipes,
            ...state.userRecipes,
        ],

        savedRecipes(): RecipeInterface[] {
            return this.availableRecipes.filter((r) => this.savedRecipeIds.includes(r.id));
        },

        suggestedRecipes(): RecipeInterface[] {
            const receiptStore = useReceiptStore();
            return rankRecipes(this.availableRecipes, receiptStore.allItems).map((s) => s.recipe);
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
            for (const [day, plannedId] of Object.entries(this.weekPlan)) {
                if (plannedId === recipeId) {
                    this.removeFromDay(day);
                }
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
            this.weekPlan[day] = recipeId;
            localStorage.setItem(
                'ah-planner-week-plan',
                JSON.stringify(this.weekPlan),
            );
        },

        removeFromDay(day: string): void {
            delete this.weekPlan[day];
            localStorage.setItem(
                'ah-planner-week-plan',
                JSON.stringify(this.weekPlan),
            );
        },

        exportData(): { savedRecipeIds: string[]; weekPlan: Record<string, string> } {
            return {
                savedRecipeIds: this.savedRecipeIds,
                weekPlan: this.weekPlan,
            };
        },

        importData(data: { savedRecipeIds: string[]; weekPlan: Record<string, string> }): void {
            this.savedRecipeIds = data.savedRecipeIds;
            this.weekPlan = data.weekPlan;
            localStorage.setItem(
                'ah-planner-saved-recipes',
                JSON.stringify(this.savedRecipeIds),
            );
            localStorage.setItem(
                'ah-planner-week-plan',
                JSON.stringify(this.weekPlan),
            );
        },
    },
});
