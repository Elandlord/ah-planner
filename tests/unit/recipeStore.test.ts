// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRecipeStore } from '~/stores/recipeStore';
import { useReceiptStore } from '~/stores/receiptStore';
import type ReceiptInterface from '~/types/ReceiptInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const { MOCK_RECIPE, MOCK_RECIPE_2 } = vi.hoisted(() => {
    const mockRecipe = {
        id: 'test-recipe',
        name: 'Test Stamppot',
        description: 'Een test recept',
        servings: 4,
        prepTimeMinutes: 30,
        ingredients: [
            { name: 'aardappelen', amount: '1kg', category: 'groente' },
            { name: 'boerenkool', amount: '500g', category: 'groente' },
            { name: 'rookworst', amount: '1 stuk', category: 'vlees' },
            { name: 'melk', amount: '100ml', category: 'zuivel' },
        ],
        instructions: ['Stap 1', 'Stap 2'],
        tags: ['stamppot'],
    };

    const mockRecipe2 = {
        id: 'test-recipe-2',
        name: 'Test Pasta',
        description: 'Een pasta test',
        servings: 4,
        prepTimeMinutes: 20,
        ingredients: [
            { name: 'spaghetti', amount: '400g', category: 'pasta' },
            { name: 'gehakt', amount: '300g', category: 'vlees' },
            { name: 'tomatensaus', amount: '400ml', category: 'conserven' },
        ],
        instructions: ['Stap 1'],
        tags: ['pasta'],
    };

    return { MOCK_RECIPE: mockRecipe, MOCK_RECIPE_2: mockRecipe2 };
});

vi.mock('~/data/recipes', () => ({
    recipes: [MOCK_RECIPE, MOCK_RECIPE_2],
}));

describe('recipeStore', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    describe('toggleSaveRecipe', () => {
        it('adds a recipe id and persists it to localStorage', () => {
            const store = useRecipeStore();

            store.toggleSaveRecipe(MOCK_RECIPE.id);

            expect(store.savedRecipeIds).toEqual([MOCK_RECIPE.id]);
            const stored = JSON.parse(
                localStorage.getItem('ah-planner-saved-recipes') ?? '[]',
            );
            expect(stored).toEqual([MOCK_RECIPE.id]);
        });

        it('removes a recipe id when already saved and persists the change', () => {
            const store = useRecipeStore();
            store.toggleSaveRecipe(MOCK_RECIPE.id);

            store.toggleSaveRecipe(MOCK_RECIPE.id);

            expect(store.savedRecipeIds).toEqual([]);
            const stored = JSON.parse(
                localStorage.getItem('ah-planner-saved-recipes') ?? '[]',
            );
            expect(stored).toEqual([]);
        });
    });

    describe('assignToDay', () => {
        it('assigns a recipe id to a day and persists it to localStorage', () => {
            const store = useRecipeStore();

            store.assignToDay('monday', MOCK_RECIPE.id);

            expect(store.weekPlan.monday).toBe(MOCK_RECIPE.id);
            const stored = JSON.parse(localStorage.getItem('ah-planner-week-plan') ?? '{}');
            expect(stored).toEqual({ monday: MOCK_RECIPE.id });
        });
    });

    describe('removeFromDay', () => {
        it('removes the assignment for a day and persists the change', () => {
            const store = useRecipeStore();
            store.assignToDay('monday', MOCK_RECIPE.id);

            store.removeFromDay('monday');

            expect(store.weekPlan.monday).toBeUndefined();
            const stored = JSON.parse(localStorage.getItem('ah-planner-week-plan') ?? '{}');
            expect(stored).toEqual({});
        });
    });

    describe('savedRecipes', () => {
        it('returns full recipe objects for saved ids', () => {
            const store = useRecipeStore();
            store.toggleSaveRecipe(MOCK_RECIPE_2.id);

            expect(store.savedRecipes).toEqual([MOCK_RECIPE_2]);
        });
    });

    describe('weekPlanRecipes', () => {
        it('resolves recipe objects for each day in the week plan', () => {
            const store = useRecipeStore();
            store.assignToDay('monday', MOCK_RECIPE.id);

            expect(store.weekPlanRecipes.monday).toEqual(MOCK_RECIPE);
        });

        it('returns undefined for a day whose recipeId no longer resolves', () => {
            const store = useRecipeStore();
            store.assignToDay('monday', 'unknown-recipe-id');

            expect(store.weekPlanRecipes.monday).toBeUndefined();
        });
    });

    describe('suggestedRecipes', () => {
        it('ranks recipes by purchase match score and filters out zero-score recipes', () => {
            const recipeStore = useRecipeStore();
            const receiptStore = useReceiptStore();
            const receipt: ReceiptInterface = {
                id: 'r1',
                date: '2026-01-01',
                storeName: 'AH',
                total: 3,
                items: [
                    { name: 'aardappelen', price: 1.5, quantity: 1, category: ProductCategoryEnum.groente },
                    { name: 'boerenkool', price: 1.49, quantity: 1, category: ProductCategoryEnum.groente },
                ],
            };
            receiptStore.addReceipt(receipt);

            expect(recipeStore.suggestedRecipes).toEqual([MOCK_RECIPE]);
        });

        it('returns an empty array when nothing has been purchased', () => {
            const recipeStore = useRecipeStore();

            expect(recipeStore.suggestedRecipes).toEqual([]);
        });
    });
});
