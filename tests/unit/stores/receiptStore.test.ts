import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useReceiptStore } from '~/stores/receiptStore';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const deleteOriginal = vi.fn().mockResolvedValue(undefined);

vi.mock('~/composables/useReceiptOriginalStore', () => ({
    useReceiptOriginalStore: vi.fn(() => ({ deleteOriginal })),
}));

const STORAGE_KEY = 'ah-planner-receipts';

function createLocalStorageStub() {
    const entries = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => entries.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            entries.set(key, value);
        }),
    };
}

function makeItem(overrides: Partial<ReceiptItemInterface> = {}): ReceiptItemInterface {
    return {
        name: 'AH Melk',
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

function storedReceipts(): ReceiptInterface[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ReceiptInterface[];
}

describe('receiptStore', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createLocalStorageStub());
        setActivePinia(createPinia());
        deleteOriginal.mockClear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('addReceipt', () => {
        it('appends the receipt to the state', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.addReceipt(makeReceipt());

            // #then
            expect(store.receipts).toEqual([makeReceipt()]);
        });

        it('persists the receipts to storage', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.addReceipt(makeReceipt());

            // #then
            expect(storedReceipts()).toEqual([makeReceipt()]);
        });
    });

    describe('removeReceipt', () => {
        it('removes the receipt with the given id', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt(), makeReceipt({ id: 'receipt-2' })];

            // #when
            store.removeReceipt('receipt-1');

            // #then
            expect(store.receipts.map((receipt) => receipt.id)).toEqual(['receipt-2']);
        });

        it('keeps every receipt when the id is unknown', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt()];

            // #when
            store.removeReceipt('missing');

            // #then
            expect(store.receipts).toHaveLength(1);
        });

        it('persists the remaining receipts to storage', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt(), makeReceipt({ id: 'receipt-2' })];

            // #when
            store.removeReceipt('receipt-2');

            // #then
            expect(storedReceipts().map((receipt) => receipt.id)).toEqual(['receipt-1']);
        });

        it('deletes the stored original for the removed receipt', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt()];

            // #when
            store.removeReceipt('receipt-1');

            // #then
            expect(deleteOriginal).toHaveBeenCalledWith('receipt-1');
        });
    });

    describe('updateReceipt', () => {
        it('replaces the receipt with the given id', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt(), makeReceipt({ id: 'receipt-2' })];
            const updated = makeReceipt({ id: 'receipt-1', total: 9.99 });

            // #when
            store.updateReceipt('receipt-1', updated);

            // #then
            expect(store.receipts[0]).toEqual(updated);
        });

        it('leaves the state untouched when the id is unknown', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt()];

            // #when
            store.updateReceipt('missing', makeReceipt({ id: 'missing', total: 9.99 }));

            // #then
            expect(store.receipts).toEqual([makeReceipt()]);
        });

        it('does not write to storage when the id is unknown', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt()];

            // #when
            store.updateReceipt('missing', makeReceipt({ id: 'missing' }));

            // #then
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('receiptCount', () => {
        it('returns the number of receipts', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [makeReceipt(), makeReceipt({ id: 'receipt-2' })];

            // #then
            expect(store.receiptCount).toBe(2);
        });
    });

    describe('totalSpent', () => {
        it('sums the totals of every receipt', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [
                makeReceipt({ total: 10 }),
                makeReceipt({ id: 'receipt-2', total: 5.5 }),
            ];

            // #then
            expect(store.totalSpent).toBe(15.5);
        });
    });

    describe('averagePerReceipt', () => {
        it('divides the total spent by the receipt count', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [
                makeReceipt({ total: 10 }),
                makeReceipt({ id: 'receipt-2', total: 20 }),
            ];

            // #then
            expect(store.averagePerReceipt).toBe(15);
        });

        it('returns zero when there are no receipts', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [];

            // #then
            expect(store.averagePerReceipt).toBe(0);
        });
    });

    describe('allItems', () => {
        it('flattens the items of every receipt', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [
                makeReceipt({ items: [makeItem({ name: 'Melk' })] }),
                makeReceipt({
                    id: 'receipt-2',
                    items: [makeItem({ name: 'Brood' }), makeItem({ name: 'Kaas' })],
                }),
            ];

            // #then
            expect(store.allItems.map((item) => item.name)).toEqual(['Melk', 'Brood', 'Kaas']);
        });
    });

    describe('itemsWithPurchaseDate', () => {
        it('attaches the owning receipt date to each item', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [
                makeReceipt({
                    id: 'receipt-1',
                    date: '2026-01-10',
                    items: [makeItem({ name: 'Melk' })],
                }),
                makeReceipt({
                    id: 'receipt-2',
                    date: '2025-12-01',
                    items: [makeItem({ name: 'Rijst' })],
                }),
            ];

            // #when
            const dated = store.itemsWithPurchaseDate;

            // #then
            expect(dated).toEqual([
                expect.objectContaining({ name: 'Melk', purchaseDate: '2026-01-10' }),
                expect.objectContaining({ name: 'Rijst', purchaseDate: '2025-12-01' }),
            ]);
        });
    });

    describe('recentItems', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('only includes items from receipts within the last 14 days', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [
                makeReceipt({
                    id: 'receipt-recent',
                    date: '2026-01-10',
                    items: [makeItem({ name: 'Melk' })],
                }),
                makeReceipt({
                    id: 'receipt-old',
                    date: '2025-12-01',
                    items: [makeItem({ name: 'Rijst' })],
                }),
            ];

            // #when
            const names = store.recentItems.map((item) => item.name);

            // #then
            expect(names).toEqual(['Melk']);
        });
    });

    describe('spendingByCategory', () => {
        it('sums price times quantity per category', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [
                makeReceipt({
                    items: [
                        makeItem({ price: 2, quantity: 3, category: ProductCategoryEnum.zuivel }),
                        makeItem({ price: 1, quantity: 2, category: ProductCategoryEnum.groente }),
                    ],
                }),
                makeReceipt({
                    id: 'receipt-2',
                    items: [
                        makeItem({ price: 4, quantity: 1, category: ProductCategoryEnum.zuivel }),
                    ],
                }),
            ];

            // #then
            expect(store.spendingByCategory).toEqual({
                [ProductCategoryEnum.zuivel]: 10,
                [ProductCategoryEnum.groente]: 2,
            });
        });
    });

    describe('itemFrequency', () => {
        it('sums the quantities per lowercased item name', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [
                makeReceipt({
                    items: [
                        makeItem({ name: 'Melk', quantity: 2 }),
                        makeItem({ name: 'melk', quantity: 1 }),
                        makeItem({ name: 'Brood', quantity: 3 }),
                    ],
                }),
            ];

            // #then
            expect(store.itemFrequency).toEqual({ melk: 3, brood: 3 });
        });
    });

    describe('recentReceipts', () => {
        it('sorts the receipts from newest to oldest', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [
                makeReceipt({ id: 'old', date: '2026-01-01' }),
                makeReceipt({ id: 'new', date: '2026-03-01' }),
                makeReceipt({ id: 'middle', date: '2026-02-01' }),
            ];

            // #then
            expect(store.recentReceipts.map((receipt) => receipt.id)).toEqual([
                'new',
                'middle',
                'old',
            ]);
        });

        it('leaves the receipts in the state unsorted', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [
                makeReceipt({ id: 'old', date: '2026-01-01' }),
                makeReceipt({ id: 'new', date: '2026-03-01' }),
            ];

            // #when
            store.recentReceipts;

            // #then
            expect(store.receipts.map((receipt) => receipt.id)).toEqual(['old', 'new']);
        });
    });

    describe('exportData', () => {
        it('returns the current receipts', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt()];

            // #when
            const exported = store.exportData();

            // #then
            expect(exported).toEqual([makeReceipt()]);
        });
    });

    describe('importData', () => {
        it('replaces the receipts with the imported ones', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt()];

            // #when
            store.importData([makeReceipt({ id: 'receipt-2' })]);

            // #then
            expect(store.receipts).toEqual([makeReceipt({ id: 'receipt-2' })]);
        });

        it('persists the imported receipts to storage', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.importData([makeReceipt()]);

            // #then
            expect(storedReceipts()).toEqual([makeReceipt()]);
        });
    });

    describe('averagePriceByItem', () => {
        it('computes the quantity-weighted average price per lowercased item name', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [
                makeReceipt({
                    items: [
                        makeItem({ name: 'Melk', price: 1, quantity: 2 }),
                        makeItem({ name: 'melk', price: 2.5, quantity: 1 }),
                    ],
                }),
            ];

            // #then
            expect(store.averagePriceByItem).toEqual({ melk: (1 * 2 + 2.5 * 1) / 3 });
        });

        it('returns an empty record when there are no receipts', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [];

            // #then
            expect(store.averagePriceByItem).toEqual({});
        });
    });

    describe('state', () => {
        it('starts empty when the stored receipts are corrupted JSON', () => {
            // #given
            vi.stubGlobal('localStorage', createLocalStorageStub());
            localStorage.setItem(STORAGE_KEY, 'not-json{');

            // #when
            const store = useReceiptStore();

            // #then
            expect(store.receipts).toEqual([]);
        });
    });

    describe('markItemUsed', () => {
        it('sets consumedAt on the matching item', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt({ items: [makeItem({ name: 'Melk' })] })];

            // #when
            store.markItemUsed('receipt-1', 0);

            // #then
            expect(store.receipts[0].items[0].consumedAt).toBeDefined();
        });

        it('persists the change to storage', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt({ items: [makeItem({ name: 'Melk' })] })];

            // #when
            store.markItemUsed('receipt-1', 0);

            // #then
            expect(storedReceipts()[0].items[0].consumedAt).toBeDefined();
        });

        it('does nothing when the receipt id is unknown', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt({ items: [makeItem({ name: 'Melk' })] })];

            // #when
            store.markItemUsed('missing', 0);

            // #then
            expect(store.receipts[0].items[0].consumedAt).toBeUndefined();
        });

        it('does nothing when the item index is out of range', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt({ items: [makeItem({ name: 'Melk' })] })];

            // #when
            store.markItemUsed('receipt-1', 5);

            // #then
            expect(store.receipts[0].items[0].consumedAt).toBeUndefined();
        });
    });

    describe('purchasedCategories', () => {
        it('collects the unique categories of every item', () => {
            // #given
            const store = useReceiptStore();

            // #when
            store.receipts = [
                makeReceipt({
                    items: [
                        makeItem({ category: ProductCategoryEnum.zuivel }),
                        makeItem({ category: ProductCategoryEnum.zuivel }),
                        makeItem({ category: ProductCategoryEnum.fruit }),
                    ],
                }),
            ];

            // #then
            expect(store.purchasedCategories).toEqual(
                new Set([ProductCategoryEnum.zuivel, ProductCategoryEnum.fruit]),
            );
        });
    });
});
