import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';

const memory = new Map<string, string>();

vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
});

const { usePantryStore } = await import('~/stores/pantryStore');

function receipt(id: string, items: [string, number][]): ReceiptInterface {
    return {
        id,
        date: '2026-08-07T10:09:00.000Z',
        items: items.map(([name, quantity]) => ({
            name,
            quantity,
            price: 1.49,
            category: ProductCategoryEnum.fruit,
        })),
        total: 10,
        storeName: 'Albert Heijn',
    };
}

describe('pantryStore', () => {
    beforeEach(() => {
        memory.clear();
        setActivePinia(createPinia());
    });

    it('adds every line of a receipt to the stock', () => {
        const store = usePantryStore();
        store.addFromReceipt(receipt('ah-1', [['AH BANANEN', 2], ['AH MELK LV', 6]]));
        expect(store.items).toHaveLength(2);
        expect(store.totalItems).toBe(8);
    });

    it('does not add the same receipt twice', () => {
        const store = usePantryStore();
        const bon = receipt('ah-1', [['AH BANANEN', 2]]);
        store.addFromReceipt(bon);
        store.addFromReceipt(bon);
        expect(store.totalItems).toBe(2);
    });

    it('only takes receipts it has not seen before', () => {
        const store = usePantryStore();
        store.addFromReceipt(receipt('ah-1', [['AH BANANEN', 1]]));
        const added = store.addFromNewReceipts([
            receipt('ah-1', [['AH BANANEN', 1]]),
            receipt('ah-2', [['AH MELK LV', 6]]),
        ]);
        expect(added).toBe(1);
        expect(store.totalItems).toBe(7);
    });

    it('tops up an item it already holds instead of listing it twice', () => {
        const store = usePantryStore();
        store.addFromReceipt(receipt('ah-1', [['AH BANANEN', 2]]));
        store.addFromReceipt(receipt('ah-2', [['ah bananen', 3]]));
        expect(store.items).toHaveLength(1);
        expect(store.items[0].quantity).toBe(5);
    });

    it('increases and decreases an item', () => {
        const store = usePantryStore();
        store.addFromReceipt(receipt('ah-1', [['AH BANANEN', 2]]));
        store.increase('AH BANANEN');
        expect(store.items[0].quantity).toBe(3);
        store.decrease('AH BANANEN');
        expect(store.items[0].quantity).toBe(2);
    });

    it('removes an item when the last one is used up', () => {
        const store = usePantryStore();
        store.addFromReceipt(receipt('ah-1', [['AH BANANEN', 1]]));
        store.decrease('AH BANANEN');
        expect(store.items).toHaveLength(0);
    });

    it('deletes an item outright', () => {
        const store = usePantryStore();
        store.addFromReceipt(receipt('ah-1', [['AH BANANEN', 4]]));
        store.remove('ah bananen');
        expect(store.items).toHaveLength(0);
    });

    it('remembers whether new receipts fill the stock by themselves', () => {
        const store = usePantryStore();
        expect(store.autoAdd).toBe(true);
        store.setAutoAdd(false);
        expect(JSON.parse(memory.get('ah-planner-stock-auto-add') ?? 'true')).toBe(false);
    });
});
