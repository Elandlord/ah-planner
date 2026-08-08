import { defineStore } from 'pinia';
import type RecipeInterface from '~/types/RecipeInterface';
import { useReceiptStore } from '~/stores/receiptStore';
import { recipes } from '~/data/recipes';

export const useRecipeStore = defineStore('recipe', {
    state: () => ({
        builtInRecipes: recipes as RecipeInterface[],
        importedRecipes: JSON.parse(
            localStorage.getItem('ah-planner-imported-recipes') ?? '[]',
        ) as RecipeInterface[],
        savedRecipeIds: JSON.parse(
            localStorage.getItem('ah-planner-saved-recipes') ?? '[]',
        ) as string[],
        weekPlan: JSON.parse(
            localStorage.getItem('ah-planner-week-plan') ?? '{}',
        ) as Record<string, string>,
        household: JSON.parse(
            localStorage.getItem('ah-planner-household') ?? '{"adults":2,"children":1}',
        ) as { adults: number; children: number },
    }),

    getters: {
        /** Imported recipes stay on this machine, so they live in the browser, not in the repo. */
        allRecipes: (state): RecipeInterface[] => [...state.importedRecipes, ...state.builtInRecipes],

        savedRecipes(): RecipeInterface[] {
            return this.allRecipes.filter((r) => this.savedRecipeIds.includes(r.id));
        },

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

        weekPlanRecipes(): Record<string, RecipeInterface | undefined> {
            const result: Record<string, RecipeInterface | undefined> = {};
            for (const [day, recipeId] of Object.entries(this.weekPlan)) {
                result[day] = this.allRecipes.find((r) => r.id === recipeId);
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

        assignToDay(day: string, recipeId: string): void {
            this.assignToDays([day], recipeId);
        },

        assignToDays(days: string[], recipeId: string): void {
            for (const day of days) {
                this.weekPlan[day] = recipeId;
            }
            localStorage.setItem(
                'ah-planner-week-plan',
                JSON.stringify(this.weekPlan),
            );
        },

        replaceWeekPlan(plan: Record<string, string>): void {
            this.weekPlan = plan;
            localStorage.setItem(
                'ah-planner-week-plan',
                JSON.stringify(this.weekPlan),
            );
        },

        setHousehold(adults: number, children: number): void {
            this.household = { adults: Math.max(0, adults), children: Math.max(0, children) };
            localStorage.setItem('ah-planner-household', JSON.stringify(this.household));
        },

        /** Dropping a day on another swaps them, so an occupied day is never silently overwritten. */
        swapDays(from: string, to: string): void {
            const moving = this.weekPlan[from];
            if (!moving || from === to) {
                return;
            }
            const displaced = this.weekPlan[to];
            this.weekPlan[to] = moving;
            if (displaced) {
                this.weekPlan[from] = displaced;
            } else {
                delete this.weekPlan[from];
            }
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
