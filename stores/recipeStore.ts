import { defineStore } from 'pinia';
import type RecipeInterface from '~/types/RecipeInterface';
import { useReceiptStore } from '~/stores/receiptStore';
import { recipes } from '~/data/recipes';

export const useRecipeStore = defineStore('recipe', {
    state: () => ({
        allRecipes: recipes as RecipeInterface[],
        savedRecipeIds: JSON.parse(
            localStorage.getItem('ah-planner-saved-recipes') ?? '[]',
        ) as string[],
        weekPlan: JSON.parse(
            localStorage.getItem('ah-planner-week-plan') ?? '{}',
        ) as Record<string, string>,
    }),

    getters: {
        savedRecipes: (state): RecipeInterface[] =>
            state.allRecipes.filter((r) => state.savedRecipeIds.includes(r.id)),

        suggestedRecipes(): RecipeInterface[] {
            const receiptStore = useReceiptStore();
            const purchasedNames = new Set(
                receiptStore.allItems.map((i) => i.name.toLowerCase()),
            );
            const purchasedCategories = receiptStore.purchasedCategories;

            const scored = this.allRecipes.map((recipe) => {
                let score = 0;
                for (const ingredient of recipe.ingredients) {
                    if (purchasedNames.has(ingredient.name.toLowerCase())) {
                        score += 3;
                    } else if (purchasedCategories.has(ingredient.category)) {
                        score += 1;
                    }
                }
                return { recipe, score };
            });

            return scored
                .filter((s) => s.score > 0)
                .sort((a, b) => b.score - a.score)
                .map((s) => s.recipe);
        },

        weekPlanRecipes(state): Record<string, RecipeInterface | undefined> {
            const result: Record<string, RecipeInterface | undefined> = {};
            for (const [day, recipeId] of Object.entries(state.weekPlan)) {
                result[day] = state.allRecipes.find((r) => r.id === recipeId);
            }
            return result;
        },
    },

    actions: {
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
    },
});
