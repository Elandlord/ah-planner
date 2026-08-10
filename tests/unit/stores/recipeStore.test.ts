import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRecipeStore } from '~/stores/recipeStore';
import { useReceiptStore } from '~/stores/receiptStore';
import type RecipeInterface from '~/types/RecipeInterface';
import type RecipeIngredientInterface from '~/types/RecipeIngredientInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import DietTagEnum from '~/types/DietTagEnum';
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
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-12T12:00:00Z'));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    describe('state', () => {
        it('starts empty when the stored user recipes are corrupted JSON', () => {
            // #given
            vi.stubGlobal('localStorage', createLocalStorageStub());
            localStorage.setItem(USER_RECIPES_KEY, 'not-json{');

            // #when
            const store = useRecipeStore();

            // #then
            expect(store.userRecipes).toEqual([]);
        });

        it('starts empty when the stored saved recipe ids are corrupted JSON', () => {
            // #given
            vi.stubGlobal('localStorage', createLocalStorageStub());
            localStorage.setItem(SAVED_RECIPES_KEY, 'not-json{');

            // #when
            const store = useRecipeStore();

            // #then
            expect(store.savedRecipeIds).toEqual([]);
        });

        it('starts empty when the stored week plan is corrupted JSON', () => {
            // #given
            vi.stubGlobal('localStorage', createLocalStorageStub());
            localStorage.setItem(WEEK_PLAN_KEY, 'not-json{');

            // #when
            const store = useRecipeStore();

            // #then
            expect(store.weekPlan).toEqual({});
        });

        it('migrates a legacy flat day-to-recipe week plan into the current week', () => {
            // #given
            vi.stubGlobal('localStorage', createLocalStorageStub());
            localStorage.setItem(WEEK_PLAN_KEY, JSON.stringify({ woensdag: 'recipe-1' }));

            // #when
            const store = useRecipeStore();

            // #then
            expect(store.weekPlan).toEqual({ woensdag: 'recipe-1' });
            expect(store.weekPlans).toEqual({ [store.currentWeekStart]: { woensdag: 'recipe-1' } });
        });
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

        it('excludes recipes that miss a dietary tag the household requires', () => {
            // #given
            const store = useRecipeStore();
            store.allRecipes = [
                makeRecipe({
                    id: 'meaty',
                    ingredients: [makeIngredient({ name: 'melk' })],
                }),
                makeRecipe({
                    id: 'veggie',
                    ingredients: [makeIngredient({ name: 'melk' })],
                    dietaryTags: [DietTagEnum.vegetarian],
                }),
            ];
            seedPurchasedItems([makeItem({ name: 'melk' })]);
            store.setExcludedDietaryTags([DietTagEnum.vegetarian]);

            // #when
            const suggested = store.suggestedRecipes;

            // #then
            expect(suggested.map((recipe) => recipe.id)).toEqual(['veggie']);
        });
    });

    describe('setExcludedDietaryTags', () => {
        it('persists the household dietary restrictions', () => {
            // #given
            const store = useRecipeStore();

            // #when
            store.setExcludedDietaryTags([DietTagEnum.vegetarian, DietTagEnum.vegan]);

            // #then
            expect(store.household.excludedDietaryTags).toEqual([
                DietTagEnum.vegetarian,
                DietTagEnum.vegan,
            ]);
        });

        it('keeps the household size when restrictions change', () => {
            // #given
            const store = useRecipeStore();
            store.setHousehold(3, 2);

            // #when
            store.setExcludedDietaryTags([DietTagEnum.glutenFree]);

            // #then
            expect(store.household).toEqual({
                adults: 3,
                children: 2,
                excludedDietaryTags: [DietTagEnum.glutenFree],
            });
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
            store.weekPlans[store.currentWeekStart] = { maandag: 'recipe-2', dinsdag: 'recipe-1' };

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
            store.weekPlans[store.currentWeekStart] = { maandag: 'missing' };

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
            store.weekPlans[store.currentWeekStart] = { woensdag: 'recipe-1' };

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
                JSON.stringify({ [store.currentWeekStart]: { woensdag: 'recipe-1' } }),
            );
        });
    });

    describe('exportData', () => {
        it('returns the saved recipe ids, the week plans and the user recipes', () => {
            // #given
            const store = useRecipeStore();
            store.savedRecipeIds = ['recipe-1'];
            store.weekPlans[store.currentWeekStart] = { woensdag: 'recipe-1' };
            store.userRecipes = [makeRecipe({ id: 'user-1' })];

            // #when
            const exported = store.exportData();

            // #then
            expect(exported).toEqual({
                savedRecipeIds: ['recipe-1'],
                weekPlans: { [store.currentWeekStart]: { woensdag: 'recipe-1' } },
                userRecipes: [makeRecipe({ id: 'user-1' })],
            });
        });
    });

    describe('importData', () => {
        it('replaces the saved recipe ids, the week plans and the user recipes', () => {
            // #given
            const store = useRecipeStore();
            store.savedRecipeIds = ['recipe-1'];
            store.weekPlans[store.currentWeekStart] = { woensdag: 'recipe-1' };
            store.userRecipes = [makeRecipe({ id: 'user-1' })];

            // #when
            store.importData({
                savedRecipeIds: ['recipe-2'],
                weekPlans: { '2026-01-05': { dinsdag: 'recipe-2' } },
                userRecipes: [makeRecipe({ id: 'user-2' })],
            });

            // #then
            expect(store.savedRecipeIds).toEqual(['recipe-2']);
            expect(store.weekPlans).toEqual({ '2026-01-05': { dinsdag: 'recipe-2' } });
            expect(store.userRecipes).toEqual([makeRecipe({ id: 'user-2' })]);
        });

        it('persists the imported data to storage', () => {
            // #given
            const store = useRecipeStore();

            // #when
            store.importData({
                savedRecipeIds: ['recipe-2'],
                weekPlans: { '2026-01-05': { dinsdag: 'recipe-2' } },
                userRecipes: [makeRecipe({ id: 'user-2' })],
            });

            // #then
            expect(localStorage.getItem(SAVED_RECIPES_KEY)).toBe(JSON.stringify(['recipe-2']));
            expect(localStorage.getItem(WEEK_PLAN_KEY)).toBe(
                JSON.stringify({ '2026-01-05': { dinsdag: 'recipe-2' } }),
            );
            expect(localStorage.getItem(USER_RECIPES_KEY)).toBe(
                JSON.stringify([makeRecipe({ id: 'user-2' })]),
            );
        });
    });

    describe('removeFromDay', () => {
        it('removes the recipe assigned to the given day', () => {
            // #given
            const store = useRecipeStore();
            store.weekPlans[store.currentWeekStart] = { woensdag: 'recipe-1', donderdag: 'recipe-2' };

            // #when
            store.removeFromDay('woensdag');

            // #then
            expect(store.weekPlan).toEqual({ donderdag: 'recipe-2' });
        });

        it('persists the week plan to storage', () => {
            // #given
            const store = useRecipeStore();
            store.weekPlans[store.currentWeekStart] = { woensdag: 'recipe-1' };

            // #when
            store.removeFromDay('woensdag');

            // #then
            expect(localStorage.getItem(WEEK_PLAN_KEY)).toBe(
                JSON.stringify({ [store.currentWeekStart]: {} }),
            );
        });
    });

    describe('deleteRecipe', () => {
        it('removes the recipe from every planned week, not just the current one', () => {
            // #given
            const store = useRecipeStore();
            store.userRecipes = [makeRecipe({ id: 'recipe-1' })];
            store.weekPlans = {
                [store.currentWeekStart]: { woensdag: 'recipe-1' },
                '2026-01-05': { maandag: 'recipe-1', dinsdag: 'recipe-2' },
            };

            // #when
            store.deleteRecipe('recipe-1');

            // #then
            expect(store.weekPlans).toEqual({
                [store.currentWeekStart]: {},
                '2026-01-05': { dinsdag: 'recipe-2' },
            });
        });
    });

    describe('currentWeekStart', () => {
        it('defaults to the Monday of the current week', () => {
            // #given / #when
            const store = useRecipeStore();

            // #then
            expect(store.currentWeekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});
