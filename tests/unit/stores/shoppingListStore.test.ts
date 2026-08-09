import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import { useReceiptStore } from '~/stores/receiptStore';
import { useRecipeStore } from '~/stores/recipeStore';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';
import type RecipeInterface from '~/types/RecipeInterface';
import type RecipeIngredientInterface from '~/types/RecipeIngredientInterface';
import type WeekPlanInterface from '~/types/WeekPlanInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import MealSlotEnum from '~/types/MealSlotEnum';

const STORAGE_KEY = 'ah-planner-shopping-list';

function createLocalStorageStub() {
    const entries = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => entries.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            entries.set(key, value);
        }),
    };
}

function makeListItem(
    overrides: Partial<ShoppingListItemInterface> = {},
): ShoppingListItemInterface {
    return {
        name: 'Melk',
        category: ProductCategoryEnum.zuivel,
        checked: false,
        frequency: 1,
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

function seedWeekPlan(weekPlan: Record<string, string>, recipes: RecipeInterface[]): void {
    const recipeStore = useRecipeStore();
    recipeStore.allRecipes = [];
    recipeStore.userRecipes = recipes;
    const nested: WeekPlanInterface = {};
    for (const [day, recipeId] of Object.entries(weekPlan)) {
        nested[day] = { [MealSlotEnum.dinner]: recipeId };
    }
    recipeStore.weekPlans[recipeStore.currentWeekStart] = nested;
}

function storedItems(): ShoppingListItemInterface[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ShoppingListItemInterface[];
}

describe('shoppingListStore', () => {
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

    describe('addItem', () => {
        it('appends an item that is not on the list yet', () => {
            // #given
            const store = useShoppingListStore();

            // #when
            store.addItem(makeListItem());

            // #then
            expect(store.items).toEqual([makeListItem()]);
        });

        it('increments the frequency of an existing item instead of adding it twice', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ frequency: 2 })];

            // #when
            store.addItem(makeListItem({ name: 'melk' }));

            // #then
            expect(store.items).toEqual([makeListItem({ frequency: 3 })]);
        });

        it('unchecks an existing item', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ checked: true })];

            // #when
            store.addItem(makeListItem());

            // #then
            expect(store.items[0].checked).toBe(false);
        });

        it('persists the items to storage', () => {
            // #given
            const store = useShoppingListStore();

            // #when
            store.addItem(makeListItem());

            // #then
            expect(storedItems()).toEqual([makeListItem()]);
        });
    });

    describe('removeItem', () => {
        it('removes the item with the given name regardless of casing', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem(), makeListItem({ name: 'Brood' })];

            // #when
            store.removeItem('mELk');

            // #then
            expect(store.items.map((item) => item.name)).toEqual(['Brood']);
        });

        it('persists the remaining items to storage', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem(), makeListItem({ name: 'Brood' })];

            // #when
            store.removeItem('Brood');

            // #then
            expect(storedItems().map((item) => item.name)).toEqual(['Melk']);
        });
    });

    describe('toggleItem', () => {
        it('checks an unchecked item', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ checked: false })];

            // #when
            store.toggleItem('melk');

            // #then
            expect(store.items[0].checked).toBe(true);
        });

        it('unchecks a checked item', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ checked: true })];

            // #when
            store.toggleItem('Melk');

            // #then
            expect(store.items[0].checked).toBe(false);
        });

        it('does not write to storage when the item is unknown', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem()];

            // #when
            store.toggleItem('missing');

            // #then
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('clearChecked', () => {
        it('keeps only the unchecked items', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [
                makeListItem({ name: 'Melk', checked: true }),
                makeListItem({ name: 'Brood', checked: false }),
            ];

            // #when
            store.clearChecked();

            // #then
            expect(store.items.map((item) => item.name)).toEqual(['Brood']);
        });

        it('persists the remaining items to storage', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ checked: true })];

            // #when
            store.clearChecked();

            // #then
            expect(storedItems()).toEqual([]);
        });
    });

    describe('generateFromHistory', () => {
        it('adds the purchased items with their frequency and category', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([
                makeItem({ name: 'Melk', quantity: 2 }),
                makeItem({ name: 'Appels', quantity: 1, category: ProductCategoryEnum.fruit }),
            ]);

            // #when
            store.generateFromHistory();

            // #then
            expect(store.items).toEqual([
                { name: 'melk', category: ProductCategoryEnum.zuivel, checked: false, frequency: 2 },
                {
                    name: 'appels',
                    category: ProductCategoryEnum.fruit,
                    checked: false,
                    frequency: 1,
                },
            ]);
        });

        it('falls back to the overig category when no purchased item matches', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([makeItem({ name: 'Kaas' })]);
            vi.spyOn(useReceiptStore(), 'itemFrequency', 'get').mockReturnValue({ mystery: 1 });

            // #when
            store.generateFromHistory();

            // #then
            expect(store.items).toEqual([
                {
                    name: 'mystery',
                    category: ProductCategoryEnum.overig,
                    checked: false,
                    frequency: 1,
                },
            ]);
        });

        it('adds at most the twenty most frequent items', () => {
            // #given
            const store = useShoppingListStore();
            const purchased = Array.from({ length: 25 }, (unused, index) =>
                makeItem({ name: `item-${index}`, quantity: 25 - index }),
            );
            seedPurchasedItems(purchased);

            // #when
            store.generateFromHistory();

            // #then
            expect(store.items.map((item) => item.name)).toEqual(
                purchased.slice(0, 20).map((item) => item.name),
            );
        });

        it('skips items that are already on the list', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ name: 'Melk', frequency: 1 })];
            seedPurchasedItems([makeItem({ name: 'melk', quantity: 5 })]);

            // #when
            store.generateFromHistory();

            // #then
            expect(store.items).toEqual([makeListItem({ name: 'Melk', frequency: 1 })]);
        });

        it('falls back to the overig category when no receipt item matches', () => {
            // #given
            const store = useShoppingListStore();
            const receiptStore = useReceiptStore();
            seedPurchasedItems([makeItem({ name: 'Kaas', category: ProductCategoryEnum.zuivel })]);
            vi.spyOn(receiptStore, 'itemFrequency', 'get').mockReturnValue({ mystery: 1 });

            // #when
            store.generateFromHistory();

            // #then
            expect(store.items[0]).toEqual(
                makeListItem({ name: 'mystery', category: ProductCategoryEnum.overig }),
            );
        });

        it('persists the generated items to storage', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([makeItem({ name: 'Melk', quantity: 2 })]);

            // #when
            store.generateFromHistory();

            // #then
            expect(storedItems().map((item) => item.name)).toEqual(['melk']);
        });

        it('defaults to ProductCategoryEnum.overig when no purchased item matches the frequency entry', () => {
            // #given
            const store = useShoppingListStore();
            const receiptStore = useReceiptStore();
            seedPurchasedItems([makeItem({ name: 'Kaas' })]);
            vi.spyOn(receiptStore, 'itemFrequency', 'get').mockReturnValue({ mystery: 1 });

            // #when
            store.generateFromHistory();

            // #then
            expect(store.items).toEqual([
                { name: 'mystery', category: ProductCategoryEnum.overig, checked: false, frequency: 1 },
            ]);
        });
    });

    describe('generateFromWeekPlan', () => {
        it('adds the missing ingredients of an assigned recipe', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([]);
            seedWeekPlan(
                { monday: 'recipe-1' },
                [
                    makeRecipe({
                        id: 'recipe-1',
                        ingredients: [
                            makeIngredient({ name: 'boerenkool', category: ProductCategoryEnum.groente }),
                        ],
                    }),
                ],
            );

            // #when
            store.generateFromWeekPlan();

            // #then
            expect(store.items).toEqual([
                {
                    name: 'boerenkool',
                    category: ProductCategoryEnum.groente,
                    checked: false,
                    frequency: 1,
                    sources: [{ day: 'monday', recipeName: 'Pannenkoeken' }],
                    amounts: ['100ml'],
                },
            ]);
        });

        it('does not add ingredients already covered by purchase history', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([makeItem({ name: 'melk' })]);
            seedWeekPlan(
                { monday: 'recipe-1' },
                [makeRecipe({ id: 'recipe-1', ingredients: [makeIngredient({ name: 'melk' })] })],
            );

            // #when
            store.generateFromWeekPlan();

            // #then
            expect(store.items).toEqual([]);
        });

        it('matches purchased items with a size suffix by normalized name', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([makeItem({ name: 'Melk 1L' })]);
            seedWeekPlan(
                { monday: 'recipe-1' },
                [makeRecipe({ id: 'recipe-1', ingredients: [makeIngredient({ name: 'melk' })] })],
            );

            // #when
            store.generateFromWeekPlan();

            // #then
            expect(store.items).toEqual([]);
        });

        it('sums the frequency when an ingredient repeats across assigned recipes', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([]);
            seedWeekPlan(
                { monday: 'recipe-1', tuesday: 'recipe-2' },
                [
                    makeRecipe({
                        id: 'recipe-1',
                        ingredients: [makeIngredient({ name: 'uien', category: ProductCategoryEnum.groente })],
                    }),
                    makeRecipe({
                        id: 'recipe-2',
                        ingredients: [makeIngredient({ name: 'uien', category: ProductCategoryEnum.groente })],
                    }),
                ],
            );

            // #when
            store.generateFromWeekPlan();

            // #then
            expect(store.items).toEqual([
                {
                    name: 'uien',
                    category: ProductCategoryEnum.groente,
                    checked: false,
                    frequency: 2,
                    sources: [
                        { day: 'monday', recipeName: 'Pannenkoeken' },
                        { day: 'tuesday', recipeName: 'Pannenkoeken' },
                    ],
                    amounts: ['100ml', '100ml'],
                },
            ]);
        });

        it('skips ingredients that are already on the list', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ name: 'boerenkool', category: ProductCategoryEnum.groente })];
            seedPurchasedItems([]);
            seedWeekPlan(
                { monday: 'recipe-1' },
                [
                    makeRecipe({
                        id: 'recipe-1',
                        ingredients: [makeIngredient({ name: 'boerenkool', category: ProductCategoryEnum.groente })],
                    }),
                ],
            );

            // #when
            store.generateFromWeekPlan();

            // #then
            expect(store.items).toEqual([
                makeListItem({ name: 'boerenkool', category: ProductCategoryEnum.groente }),
            ]);
        });

        it('ignores days without an assigned recipe', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([]);
            seedWeekPlan({ monday: 'missing-recipe' }, []);

            // #when
            store.generateFromWeekPlan();

            // #then
            expect(store.items).toEqual([]);
        });

        it('persists the generated items to storage', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([]);
            seedWeekPlan(
                { monday: 'recipe-1' },
                [makeRecipe({ id: 'recipe-1', ingredients: [makeIngredient({ name: 'boerenkool' })] })],
            );

            // #when
            store.generateFromWeekPlan();

            // #then
            expect(storedItems().map((item) => item.name)).toEqual(['boerenkool']);
        });
    });

    describe('exportData', () => {
        it('returns the current items', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem()];

            // #when
            const exported = store.exportData();

            // #then
            expect(exported).toEqual([makeListItem()]);
        });
    });

    describe('importData', () => {
        it('replaces the items with the imported ones', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem()];

            // #when
            store.importData([makeListItem({ name: 'Brood' })]);

            // #then
            expect(store.items).toEqual([makeListItem({ name: 'Brood' })]);
        });

        it('persists the imported items to storage', () => {
            // #given
            const store = useShoppingListStore();

            // #when
            store.importData([makeListItem()]);

            // #then
            expect(storedItems()).toEqual([makeListItem()]);
        });
    });

    describe('uncheckedItems', () => {
        it('returns only the items that are not checked', () => {
            // #given
            const store = useShoppingListStore();

            // #when
            store.items = [
                makeListItem({ name: 'Melk', checked: false }),
                makeListItem({ name: 'Brood', checked: true }),
            ];

            // #then
            expect(store.uncheckedItems.map((item) => item.name)).toEqual(['Melk']);
        });
    });

    describe('checkedItems', () => {
        it('returns only the items that are checked', () => {
            // #given
            const store = useShoppingListStore();

            // #when
            store.items = [
                makeListItem({ name: 'Melk', checked: false }),
                makeListItem({ name: 'Brood', checked: true }),
            ];

            // #then
            expect(store.checkedItems.map((item) => item.name)).toEqual(['Brood']);
        });
    });

    describe('estimatedPrices', () => {
        it('exposes the average purchase price per lowercased item name', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([makeItem({ name: 'Melk', price: 1.5, quantity: 2 })]);

            // #then
            expect(store.estimatedPrices).toEqual({ melk: 1.5 });
        });
    });

    describe('estimatedTotal', () => {
        it('sums the estimated price of every unchecked item', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([
                makeItem({ name: 'Melk', price: 1.5, quantity: 1 }),
                makeItem({ name: 'Brood', price: 2.5, quantity: 1 }),
            ]);
            store.items = [
                makeListItem({ name: 'Melk', checked: false }),
                makeListItem({ name: 'Brood', checked: false }),
            ];

            // #then
            expect(store.estimatedTotal).toBe(4);
        });

        it('excludes checked items from the total', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([makeItem({ name: 'Melk', price: 1.5, quantity: 1 })]);
            store.items = [makeListItem({ name: 'Melk', checked: true })];

            // #then
            expect(store.estimatedTotal).toBe(0);
        });

        it('ignores items without purchase history', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([]);
            store.items = [makeListItem({ name: 'Onbekend', checked: false })];

            // #then
            expect(store.estimatedTotal).toBe(0);
        });
    });

    describe('state', () => {
        it('starts empty when the stored items are corrupted JSON', () => {
            // #given
            vi.stubGlobal('localStorage', createLocalStorageStub());
            localStorage.setItem(STORAGE_KEY, 'not-json{');

            // #when
            const store = useShoppingListStore();

            // #then
            expect(store.items).toEqual([]);
        });
    });

    describe('itemsByCategory', () => {
        it('groups the items by their category', () => {
            // #given
            const store = useShoppingListStore();
            const melk = makeListItem({ name: 'Melk' });
            const kaas = makeListItem({ name: 'Kaas' });
            const appels = makeListItem({ name: 'Appels', category: ProductCategoryEnum.fruit });

            // #when
            store.items = [melk, kaas, appels];

            // #then
            expect(store.itemsByCategory).toEqual({
                [ProductCategoryEnum.zuivel]: [melk, kaas],
                [ProductCategoryEnum.fruit]: [appels],
            });
        });
    });
});
