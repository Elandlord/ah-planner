import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRecipeStore } from '~/stores/recipeStore';
import { useReceiptStore } from '~/stores/receiptStore';
import type RecipeInterface from '~/types/RecipeInterface';
import type RecipeIngredientInterface from '~/types/RecipeIngredientInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const SAVED_RECIPES_KEY = 'ah-planner-saved-recipes';
const USER_RECIPES_KEY = 'ah-planner-user-recipes';
const WEEK_PLAN_KEY = 'ah-planner-week-plan';

function createLocalStorageStub() {
    const entries = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => entries.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            entries.set(key, value);
        }),
    };
}

function makeIngredient(
    overrides: Partial<RecipeIngredientInterface> = {},
): RecipeIngredientInterface {
    return {
        name: 'melk',
        amount: '100ml',
        category: ProductCategoryEnum.zuivel,
        ...overrides,
    };
}

function makeRecipe(overrides: Partial<RecipeInterface> = {}): RecipeInterface {
    return {
        id: 'recipe-1',
        name: 'Pannenkoeken',
        description: 'Nederlandse pannenkoeken.',
        servings: 4,
        prepTimeMinutes: 20,
        ingredients: [makeIngredient()],
        instructions: ['Bak de pannenkoeken.'],
        tags: ['klassiek'],
        ...overrides,
    };
}

function makeItem(overrides: Partial<ReceiptItemInterface> = {}): ReceiptItemInterface {
    return {
        name: 'melk',
        price: 1.29,
        quantity: 1,
        category: ProductCategoryEnum.zuivel,
        ...overrides,
    };
}

function makeReceipt(overrides: Partial<ReceiptInterface> = {}): ReceiptInterface {
    return {
        id: 'receipt-1',
        date: '2026-01-10',
        items: [makeItem()],
        total: 1.29,
        storeName: 'Albert Heijn',
        ...overrides,
    };
}

function seedPurchasedItems(items: ReceiptItemInterface[]): void {
    const receiptStore = useReceiptStore();
    receiptStore.receipts = [makeReceipt({ items })];
}

describe('recipeStore', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createLocalStorageStub());
        setActivePinia(createPinia());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('suggestedRecipes', () => {
        it('scores an ingredient matched by name higher than one matched by category', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [
                makeRecipe({
                    id: 'category-match',
                    ingredients: [makeIngredient({ name: 'yoghurt' })],
                }),
                makeRecipe({
                    id: 'name-match',
                    ingredients: [makeIngredient({ name: 'melk' })],
                }),
            ];
            seedPurchasedItems([makeItem({ name: 'Melk' })]);

            // #when
            const suggested = store.suggestedRecipes;

            // #then
            expect(suggested.map((recipe) => recipe.id)).toEqual(['name-match', 'category-match']);
        });

        it('excludes recipes without a single matching ingredient', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [
                makeRecipe({
                    id: 'no-match',
                    ingredients: [
                        makeIngredient({ name: 'zalm', category: ProductCategoryEnum.vis }),
                    ],
                }),
                makeRecipe({
                    id: 'match',
                    ingredients: [makeIngredient({ name: 'melk' })],
                }),
            ];
            seedPurchasedItems([makeItem({ name: 'melk' })]);

            // #when
            const suggested = store.suggestedRecipes;

            // #then
            expect(suggested.map((recipe) => recipe.id)).toEqual(['match']);
        });

        it('sorts the recipes by descending total score', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [
                makeRecipe({
                    id: 'score-1',
                    ingredients: [makeIngredient({ name: 'yoghurt' })],
                }),
                makeRecipe({
                    id: 'score-6',
                    ingredients: [
                        makeIngredient({ name: 'melk' }),
                        makeIngredient({ name: 'kaas' }),
                    ],
                }),
                makeRecipe({
                    id: 'score-4',
                    ingredients: [
                        makeIngredient({ name: 'melk' }),
                        makeIngredient({ name: 'yoghurt' }),
                    ],
                }),
            ];
            seedPurchasedItems([makeItem({ name: 'melk' }), makeItem({ name: 'kaas' })]);

            // #when
            const suggested = store.suggestedRecipes;

            // #then
            expect(suggested.map((recipe) => recipe.id)).toEqual(['score-6', 'score-4', 'score-1']);
        });

        it('returns no recipes when nothing was purchased', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [makeRecipe()];

            // #when
            const suggested = store.suggestedRecipes;

            // #then
            expect(suggested).toEqual([]);
        });
    });

    describe('savedRecipes', () => {
        it('returns the recipes matching the saved ids', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [makeRecipe(), makeRecipe({ id: 'recipe-2' })];

            // #when
            store.savedRecipeIds = ['recipe-2'];

            // #then
            expect(store.savedRecipes.map((recipe) => recipe.id)).toEqual(['recipe-2']);
        });

        it('returns nothing when no recipe is saved', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [makeRecipe()];

            // #when
            store.savedRecipeIds = [];

            // #then
            expect(store.savedRecipes).toEqual([]);
        });
    });

    describe('toggleSaveRecipe', () => {
        it('saves a recipe that was not saved yet', () => {
            // #given
            const store = useRecipeStore();

            // #when
            store.toggleSaveRecipe('recipe-1');

            // #then
            expect(store.savedRecipeIds).toEqual(['recipe-1']);
        });

        it('unsaves a recipe that was already saved', () => {
            // #given
            const store = useRecipeStore();
            store.savedRecipeIds = ['recipe-1', 'recipe-2'];

            // #when
            store.toggleSaveRecipe('recipe-1');

            // #then
            expect(store.savedRecipeIds).toEqual(['recipe-2']);
        });

        it('persists the saved ids to storage', () => {
            // #given
            const store = useRecipeStore();

            // #when
            store.toggleSaveRecipe('recipe-1');

            // #then
            expect(localStorage.getItem(SAVED_RECIPES_KEY)).toBe(JSON.stringify(['recipe-1']));
        });
    });

    describe('weekPlanRecipes', () => {
        it('maps every planned day to its recipe', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [makeRecipe(), makeRecipe({ id: 'recipe-2' })];

            // #when
            store.weekPlan = { maandag: 'recipe-2', dinsdag: 'recipe-1' };

            // #then
            expect(store.weekPlanRecipes).toEqual({
                maandag: store.allRecipes[1],
                dinsdag: store.allRecipes[0],
            });
        });

        it('maps a day with an unknown recipe id to undefined', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [makeRecipe()];

            // #when
            store.weekPlan = { maandag: 'missing' };

            // #then
            expect(store.weekPlanRecipes.maandag).toBeUndefined();
        });
    });

    describe('assignToDay', () => {
        it('stores the recipe id for the given day', () => {
            // #given
            const store = useRecipeStore();

            // #when
            store.assignToDay('woensdag', 'recipe-1');

            // #then
            expect(store.weekPlan).toEqual({ woensdag: 'recipe-1' });
        });

        it('replaces the recipe already assigned to that day', () => {
            // #given
            const store = useRecipeStore();
            store.weekPlan = { woensdag: 'recipe-1' };

            // #when
            store.assignToDay('woensdag', 'recipe-2');

            // #then
            expect(store.weekPlan).toEqual({ woensdag: 'recipe-2' });
        });

        it('persists the week plan to storage', () => {
            // #given
            const store = useRecipeStore();

            // #when
            store.assignToDay('woensdag', 'recipe-1');

            // #then
            expect(localStorage.getItem(WEEK_PLAN_KEY)).toBe(
                JSON.stringify({ woensdag: 'recipe-1' }),
            );
        });
    });

    describe('addRecipe', () => {
        it('stores the recipe under a generated id', () => {
            // #given
            const store = useRecipeStore();
            const { id, ...recipe } = makeRecipe({ name: 'Eigen recept' });

            // #when
            const created = store.addRecipe(recipe);

            // #then
            expect(created.id).toBe('user-1');
            expect(store.userRecipes).toEqual([created]);
        });

        it('never reuses an id already taken by a built-in recipe', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [makeRecipe({ id: 'user-1' })];
            const { id, ...recipe } = makeRecipe();

            // #when
            const created = store.addRecipe(recipe);

            // #then
            expect(created.id).toBe('user-2');
        });

        it('never reuses an id already taken by another user recipe', () => {
            // #given
            const store = useRecipeStore();
            store.userRecipes = [makeRecipe({ id: 'user-1' }), makeRecipe({ id: 'user-2' })];
            const { id, ...recipe } = makeRecipe();

            // #when
            const created = store.addRecipe(recipe);

            // #then
            expect(created.id).toBe('user-3');
        });

        it('persists the user recipes to storage', () => {
            // #given
            const store = useRecipeStore();
            const { id, ...recipe } = makeRecipe();

            // #when
            const created = store.addRecipe(recipe);

            // #then
            expect(localStorage.getItem(USER_RECIPES_KEY)).toBe(JSON.stringify([created]));
        });

        it('makes the recipe available for pantry matching', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [];
            const { id, ...recipe } = makeRecipe({
                ingredients: [makeIngredient({ name: 'melk' })],
            });
            seedPurchasedItems([makeItem({ name: 'melk' })]);

            // #when
            const created = store.addRecipe(recipe);

            // #then
            expect(store.suggestedRecipes.map((r) => r.id)).toEqual([created.id]);
        });

        it('makes the recipe available for the week plan', () => {
            // #given
            const store = useRecipeStore();
            const { id, ...recipe } = makeRecipe();
            const created = store.addRecipe(recipe);

            // #when
            store.assignToDay('maandag', created.id);

            // #then
            expect(store.weekPlanRecipes.maandag).toEqual(created);
        });

        it('makes the recipe available to save', () => {
            // #given
            const store = useRecipeStore();
            const { id, ...recipe } = makeRecipe();
            const created = store.addRecipe(recipe);

            // #when
            store.toggleSaveRecipe(created.id);

            // #then
            expect(store.savedRecipes).toEqual([created]);
        });
    });

    describe('updateRecipe', () => {
        it('applies the changes to the user recipe', () => {
            // #given
            const store = useRecipeStore();
            store.userRecipes = [makeRecipe({ id: 'user-1' })];

            // #when
            store.updateRecipe('user-1', { name: 'Nieuwe naam', servings: 2 });

            // #then
            expect(store.userRecipes[0].name).toBe('Nieuwe naam');
            expect(store.userRecipes[0].servings).toBe(2);
        });

        it('persists the user recipes to storage', () => {
            // #given
            const store = useRecipeStore();
            store.userRecipes = [makeRecipe({ id: 'user-1' })];

            // #when
            store.updateRecipe('user-1', { name: 'Nieuwe naam' });

            // #then
            expect(localStorage.getItem(USER_RECIPES_KEY)).toBe(
                JSON.stringify(store.userRecipes),
            );
        });

        it('leaves a built-in recipe untouched', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [makeRecipe({ id: 'stamppot-boerenkool' })];

            // #when
            store.updateRecipe('stamppot-boerenkool', { name: 'Nieuwe naam' });

            // #then
            expect(store.allRecipes[0].name).toBe('Pannenkoeken');
        });
    });

    describe('deleteRecipe', () => {
        it('removes the user recipe', () => {
            // #given
            const store = useRecipeStore();
            store.userRecipes = [makeRecipe({ id: 'user-1' }), makeRecipe({ id: 'user-2' })];

            // #when
            store.deleteRecipe('user-1');

            // #then
            expect(store.userRecipes.map((r) => r.id)).toEqual(['user-2']);
        });

        it('persists the user recipes to storage', () => {
            // #given
            const store = useRecipeStore();
            store.userRecipes = [makeRecipe({ id: 'user-1' })];

            // #when
            store.deleteRecipe('user-1');

            // #then
            expect(localStorage.getItem(USER_RECIPES_KEY)).toBe(JSON.stringify([]));
        });

        it('unsaves the deleted recipe', () => {
            // #given
            const store = useRecipeStore();
            store.userRecipes = [makeRecipe({ id: 'user-1' })];
            store.savedRecipeIds = ['user-1', 'recipe-2'];

            // #when
            store.deleteRecipe('user-1');

            // #then
            expect(store.savedRecipeIds).toEqual(['recipe-2']);
        });

        it('clears every day the deleted recipe was planned on', () => {
            // #given
            const store = useRecipeStore();
            store.userRecipes = [makeRecipe({ id: 'user-1' })];
            store.weekPlan = { maandag: 'user-1', dinsdag: 'recipe-2', woensdag: 'user-1' };

            // #when
            store.deleteRecipe('user-1');

            // #then
            expect(store.weekPlan).toEqual({ dinsdag: 'recipe-2' });
        });

        it('leaves a built-in recipe untouched', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [makeRecipe({ id: 'stamppot-boerenkool' })];

            // #when
            store.deleteRecipe('stamppot-boerenkool');

            // #then
            expect(store.allRecipes.map((r) => r.id)).toEqual(['stamppot-boerenkool']);
        });
    });

    describe('removeFromDay', () => {
        it('removes the recipe assigned to the given day', () => {
            // #given
            const store = useRecipeStore();
            store.weekPlan = { woensdag: 'recipe-1', donderdag: 'recipe-2' };

            // #when
            store.removeFromDay('woensdag');

            // #then
            expect(store.weekPlan).toEqual({ donderdag: 'recipe-2' });
        });

        it('persists the week plan to storage', () => {
            // #given
            const store = useRecipeStore();
            store.weekPlan = { woensdag: 'recipe-1' };

            // #when
            store.removeFromDay('woensdag');

            // #then
            expect(localStorage.getItem(WEEK_PLAN_KEY)).toBe(JSON.stringify({}));
        });
    });
});
