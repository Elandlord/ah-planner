// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useReceiptStore } from '~/stores/receiptStore';
import type ReceiptInterface from '~/types/ReceiptInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const MOCK_RECEIPT: ReceiptInterface = {
    id: 'receipt-1',
    date: '2026-01-10',
    storeName: 'Albert Heijn',
    total: 10.5,
    items: [
        { name: 'Melk', price: 1.5, quantity: 2, category: ProductCategoryEnum.zuivel },
        { name: 'Brood', price: 2.5, quantity: 1, category: ProductCategoryEnum.brood },
    ],
};

const MOCK_RECEIPT_2: ReceiptInterface = {
    id: 'receipt-2',
    date: '2026-01-20',
    storeName: 'Albert Heijn',
    total: 5,
    items: [{ name: 'melk', price: 1.5, quantity: 1, category: ProductCategoryEnum.zuivel }],
};

describe('receiptStore', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    describe('addReceipt', () => {
        it('adds a receipt to state and persists it to localStorage', () => {
            const store = useReceiptStore();

            store.addReceipt(MOCK_RECEIPT);

            expect(store.receipts).toEqual([MOCK_RECEIPT]);
            const stored = JSON.parse(localStorage.getItem('ah-planner-receipts') ?? '[]');
            expect(stored).toEqual([MOCK_RECEIPT]);
        });
    });

    describe('removeReceipt', () => {
        it('removes a receipt by id and persists the change', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            store.addReceipt(MOCK_RECEIPT_2);

            store.removeReceipt(MOCK_RECEIPT.id);

            expect(store.receipts).toEqual([MOCK_RECEIPT_2]);
            const stored = JSON.parse(localStorage.getItem('ah-planner-receipts') ?? '[]');
            expect(stored).toEqual([MOCK_RECEIPT_2]);
        });
    });

    describe('updateReceipt', () => {
        it('replaces the receipt with matching id and persists the change', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            const updated: ReceiptInterface = { ...MOCK_RECEIPT, total: 99 };

            store.updateReceipt(MOCK_RECEIPT.id, updated);

            expect(store.receipts).toEqual([updated]);
            const stored = JSON.parse(localStorage.getItem('ah-planner-receipts') ?? '[]');
            expect(stored).toEqual([updated]);
        });

        it('does nothing when no receipt matches the given id', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);

            store.updateReceipt('unknown-id', MOCK_RECEIPT_2);

            expect(store.receipts).toEqual([MOCK_RECEIPT]);
        });
    });

    describe('receiptCount', () => {
        it('returns the number of receipts', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            store.addReceipt(MOCK_RECEIPT_2);

            expect(store.receiptCount).toBe(2);
        });
    });

    describe('totalSpent', () => {
        it('sums the total of all receipts', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            store.addReceipt(MOCK_RECEIPT_2);

            expect(store.totalSpent).toBe(15.5);
        });
    });

    describe('averagePerReceipt', () => {
        it('divides total spent by receipt count', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            store.addReceipt(MOCK_RECEIPT_2);

            expect(store.averagePerReceipt).toBe(7.75);
        });

        it('returns 0 when there are no receipts', () => {
            const store = useReceiptStore();

            expect(store.averagePerReceipt).toBe(0);
        });
    });

    describe('allItems', () => {
        it('flattens items from all receipts', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            store.addReceipt(MOCK_RECEIPT_2);

            expect(store.allItems).toEqual([...MOCK_RECEIPT.items, ...MOCK_RECEIPT_2.items]);
        });
    });

    describe('spendingByCategory', () => {
        it('sums price * quantity per category', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            store.addReceipt(MOCK_RECEIPT_2);

            expect(store.spendingByCategory).toEqual({
                [ProductCategoryEnum.zuivel]: 1.5 * 2 + 1.5 * 1,
                [ProductCategoryEnum.brood]: 2.5 * 1,
            });
        });
    });

    describe('itemFrequency', () => {
        it('sums quantity per lowercased item name', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            store.addReceipt(MOCK_RECEIPT_2);

            expect(store.itemFrequency).toEqual({
                melk: 3,
                brood: 1,
            });
        });
    });

    describe('recentReceipts', () => {
        it('sorts receipts by date descending', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            store.addReceipt(MOCK_RECEIPT_2);

            expect(store.recentReceipts.map((r) => r.id)).toEqual([
                MOCK_RECEIPT_2.id,
                MOCK_RECEIPT.id,
            ]);
        });
    });

    describe('purchasedCategories', () => {
        it('returns the set of categories across all items', () => {
            const store = useReceiptStore();
            store.addReceipt(MOCK_RECEIPT);
            store.addReceipt(MOCK_RECEIPT_2);

            expect(store.purchasedCategories).toEqual(
                new Set([ProductCategoryEnum.zuivel, ProductCategoryEnum.brood]),
            );
        });
    });
});
