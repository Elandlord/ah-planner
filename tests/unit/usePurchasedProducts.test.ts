import { describe, expect, it } from 'vitest';
import {
    distinctPurchasedProducts,
    searchPurchasedProducts,
} from '~/composables/usePurchasedProducts';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';

function receipt(id: string, date: string, names: string[]): ReceiptInterface {
    return {
        id,
        date,
        items: names.map((name) => ({
            name,
            quantity: 1,
            price: 1.49,
            category: ProductCategoryEnum.fruit,
        })),
        total: names.length,
        storeName: 'Albert Heijn',
    };
}

describe('distinctPurchasedProducts', () => {
    it('lists a product once however often it was bought', () => {
        const products = distinctPurchasedProducts([
            receipt('a', '2026-08-01T10:00:00.000Z', ['AH BANANEN', 'AH MELK LV']),
            receipt('b', '2026-08-07T10:00:00.000Z', ['AH BANANEN']),
        ]);
        expect(products).toHaveLength(2);
        expect(products[0]).toMatchObject({ name: 'AH BANANEN', timesBought: 2 });
    });

    it('treats different spellings of the same name as one product', () => {
        const products = distinctPurchasedProducts([
            receipt('a', '2026-08-01T10:00:00.000Z', ['AH BANANEN']),
            receipt('b', '2026-08-07T10:00:00.000Z', ['ah bananen ']),
        ]);
        expect(products).toHaveLength(1);
        expect(products[0].timesBought).toBe(2);
    });

    it('keeps the details of the most recent purchase', () => {
        const products = distinctPurchasedProducts([
            receipt('a', '2026-08-01T10:00:00.000Z', ['AH BANANEN']),
            receipt('b', '2026-08-07T10:00:00.000Z', ['ah bananen']),
        ]);
        expect(products[0].lastPurchase).toBe('2026-08-07T10:00:00.000Z');
        expect(products[0].name).toBe('ah bananen');
    });

    it('returns nothing without receipts', () => {
        expect(distinctPurchasedProducts([])).toEqual([]);
    });
});

describe('searchPurchasedProducts', () => {
    const products = distinctPurchasedProducts([
        receipt('a', '2026-08-01T10:00:00.000Z', ['AH BANANEN', 'AH MELK LV', 'AH AARDBEIEN']),
    ]);

    it('finds a product on part of its name', () => {
        expect(searchPurchasedProducts(products, 'melk').map((p) => p.name)).toEqual(['AH MELK LV']);
    });

    it('shows the most bought products when nothing is typed', () => {
        expect(searchPurchasedProducts(products, '', 2)).toHaveLength(2);
    });

    it('caps how many suggestions come back', () => {
        expect(searchPurchasedProducts(products, 'AH', 1)).toHaveLength(1);
    });
});
