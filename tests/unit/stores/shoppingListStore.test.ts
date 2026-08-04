import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import { useReceiptStore } from '~/stores/receiptStore';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

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

function storedItems(): ShoppingListItemInterface[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ShoppingListItemInterface[];
}

describe('shoppingListStore', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createLocalStorageStub());
        setActivePinia(createPinia());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
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

        it('persists the generated items to storage', () => {
            // #given
            const store = useShoppingListStore();
            seedPurchasedItems([makeItem({ name: 'Melk', quantity: 2 })]);

            // #when
            store.generateFromHistory();

            // #then
            expect(storedItems().map((item) => item.name)).toEqual(['melk']);
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
