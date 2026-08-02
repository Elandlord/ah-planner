// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import { useReceiptStore } from '~/stores/receiptStore';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const MOCK_ITEM: ShoppingListItemInterface = {
    name: 'Melk',
    category: ProductCategoryEnum.zuivel,
    checked: false,
    frequency: 1,
};

describe('shoppingListStore', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    describe('addItem', () => {
        it('adds a new item and persists it to localStorage', () => {
            const store = useShoppingListStore();

            store.addItem(MOCK_ITEM);

            expect(store.items).toEqual([MOCK_ITEM]);
            const stored = JSON.parse(localStorage.getItem('ah-planner-shopping-list') ?? '[]');
            expect(stored).toEqual([MOCK_ITEM]);
        });

        it('increments frequency and resets checked when the item already exists (case-insensitive)', () => {
            const store = useShoppingListStore();
            store.addItem(MOCK_ITEM);
            store.toggleItem('Melk');

            store.addItem({ ...MOCK_ITEM, name: 'melk', frequency: 1 });

            expect(store.items).toHaveLength(1);
            expect(store.items[0].frequency).toBe(2);
            expect(store.items[0].checked).toBe(false);
        });
    });

    describe('removeItem', () => {
        it('removes an item by name case-insensitively and persists the change', () => {
            const store = useShoppingListStore();
            store.addItem(MOCK_ITEM);

            store.removeItem('melk');

            expect(store.items).toEqual([]);
            const stored = JSON.parse(localStorage.getItem('ah-planner-shopping-list') ?? '[]');
            expect(stored).toEqual([]);
        });
    });

    describe('toggleItem', () => {
        it('toggles the checked state of a matching item case-insensitively', () => {
            const store = useShoppingListStore();
            store.addItem(MOCK_ITEM);

            store.toggleItem('melk');
            expect(store.items[0].checked).toBe(true);

            store.toggleItem('MELK');
            expect(store.items[0].checked).toBe(false);
        });

        it('does nothing when no item matches the given name', () => {
            const store = useShoppingListStore();
            store.addItem(MOCK_ITEM);

            store.toggleItem('unknown');

            expect(store.items[0].checked).toBe(false);
        });
    });

    describe('clearChecked', () => {
        it('removes only checked items and persists the change', () => {
            const store = useShoppingListStore();
            store.addItem(MOCK_ITEM);
            store.addItem({ ...MOCK_ITEM, name: 'Brood', category: ProductCategoryEnum.brood });
            store.toggleItem('Melk');

            store.clearChecked();

            expect(store.items.map((i) => i.name)).toEqual(['Brood']);
            const stored = JSON.parse(localStorage.getItem('ah-planner-shopping-list') ?? '[]');
            expect(stored.map((i: ShoppingListItemInterface) => i.name)).toEqual(['Brood']);
        });
    });

    describe('generateFromHistory', () => {
        it('pulls the top 20 items by frequency from receipt history', () => {
            const shoppingListStore = useShoppingListStore();
            const receiptStore = useReceiptStore();

            const items = Array.from({ length: 25 }, (_, i) => ({
                name: `item-${i}`,
                price: 1,
                quantity: 25 - i,
                category: ProductCategoryEnum.overig,
            }));
            const receipt: ReceiptInterface = {
                id: 'r1',
                date: '2026-01-01',
                storeName: 'AH',
                total: 100,
                items,
            };
            receiptStore.addReceipt(receipt);

            shoppingListStore.generateFromHistory();

            expect(shoppingListStore.items).toHaveLength(20);
            expect(shoppingListStore.items.map((i) => i.name)).toEqual(
                items.slice(0, 20).map((i) => i.name),
            );
        });

        it('resolves category from a matching receipt item', () => {
            const shoppingListStore = useShoppingListStore();
            const receiptStore = useReceiptStore();
            const receipt: ReceiptInterface = {
                id: 'r1',
                date: '2026-01-01',
                storeName: 'AH',
                total: 5,
                items: [
                    { name: 'Kaas', price: 5, quantity: 1, category: ProductCategoryEnum.zuivel },
                ],
            };
            receiptStore.addReceipt(receipt);

            shoppingListStore.generateFromHistory();

            expect(shoppingListStore.items[0].category).toBe(ProductCategoryEnum.zuivel);
        });

        it('defaults to ProductCategoryEnum.overig when no receipt item matches', () => {
            const shoppingListStore = useShoppingListStore();
            const receiptStore = useReceiptStore();
            const receipt: ReceiptInterface = {
                id: 'r1',
                date: '2026-01-01',
                storeName: 'AH',
                total: 5,
                items: [
                    { name: 'Kaas', price: 5, quantity: 1, category: ProductCategoryEnum.zuivel },
                ],
            };
            receiptStore.addReceipt(receipt);
            vi.spyOn(receiptStore, 'itemFrequency', 'get').mockReturnValue({ mystery: 1 });

            shoppingListStore.generateFromHistory();

            expect(shoppingListStore.items[0].name).toBe('mystery');
            expect(shoppingListStore.items[0].category).toBe(ProductCategoryEnum.overig);
        });

        it('skips items that are already on the shopping list', () => {
            const shoppingListStore = useShoppingListStore();
            const receiptStore = useReceiptStore();
            shoppingListStore.addItem({
                name: 'Melk',
                category: ProductCategoryEnum.zuivel,
                checked: false,
                frequency: 1,
            });
            const receipt: ReceiptInterface = {
                id: 'r1',
                date: '2026-01-01',
                storeName: 'AH',
                total: 5,
                items: [
                    { name: 'melk', price: 1.5, quantity: 5, category: ProductCategoryEnum.zuivel },
                ],
            };
            receiptStore.addReceipt(receipt);

            shoppingListStore.generateFromHistory();

            expect(shoppingListStore.items).toHaveLength(1);
            expect(shoppingListStore.items[0].frequency).toBe(1);
        });
    });
});
