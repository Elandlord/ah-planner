import { describe, it, expect } from 'vitest';
import {
    buildPantryItems,
    buildStockItems,
    groupPantryItemsByCategory,
    EXPIRING_SOON_THRESHOLD_DAYS,
} from '~/composables/usePantry';
import type DatedReceiptItemInterface from '~/types/DatedReceiptItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const NOW = new Date('2026-01-20T12:00:00Z');

describe('buildPantryItems', () => {
    it('excludes items past their category shelf life', () => {
        const items: DatedReceiptItemInterface[] = [
            {
                name: 'vis',
                price: 5.0,
                quantity: 1,
                category: ProductCategoryEnum.vis,
                purchaseDate: '2026-01-01',
                receiptId: 'receipt-1',
                itemIndex: 0,
            },
        ];

        expect(buildPantryItems(items, NOW)).toEqual([]);
    });

    it('flags items within the expiring-soon threshold', () => {
        const items: DatedReceiptItemInterface[] = [
            {
                name: 'melk',
                price: 1.5,
                quantity: 1,
                category: ProductCategoryEnum.zuivel,
                purchaseDate: '2026-01-12',
                receiptId: 'receipt-1',
                itemIndex: 0,
            },
        ];

        const [pantryItem] = buildPantryItems(items, NOW);

        expect(pantryItem.expiringSoon).toBe(true);
        expect(pantryItem.daysRemaining).toBeLessThanOrEqual(EXPIRING_SOON_THRESHOLD_DAYS);
    });

    it('does not flag freshly purchased items as expiring soon', () => {
        const items: DatedReceiptItemInterface[] = [
            {
                name: 'rijst',
                price: 2.0,
                quantity: 1,
                category: ProductCategoryEnum.rijst,
                purchaseDate: '2026-01-19',
                receiptId: 'receipt-1',
                itemIndex: 0,
            },
        ];

        const [pantryItem] = buildPantryItems(items, NOW);

        expect(pantryItem.expiringSoon).toBe(false);
    });

    it('excludes items marked as consumed', () => {
        const items: DatedReceiptItemInterface[] = [
            {
                name: 'rijst',
                price: 2.0,
                quantity: 1,
                category: ProductCategoryEnum.rijst,
                purchaseDate: '2026-01-19',
                receiptId: 'receipt-1',
                itemIndex: 0,
                consumedAt: '2026-01-20T08:00:00Z',
            },
        ];

        expect(buildPantryItems(items, NOW)).toEqual([]);
    });
});

describe('groupPantryItemsByCategory', () => {
    it('buckets items by category', () => {
        const items = buildPantryItems(
            [
                {
                    name: 'melk',
                    price: 1.5,
                    quantity: 1,
                    category: ProductCategoryEnum.zuivel,
                    purchaseDate: '2026-01-19',
                    receiptId: 'receipt-1',
                    itemIndex: 0,
                },
                {
                    name: 'kaas',
                    price: 3.0,
                    quantity: 1,
                    category: ProductCategoryEnum.zuivel,
                    purchaseDate: '2026-01-19',
                    receiptId: 'receipt-1',
                    itemIndex: 0,
                },
                {
                    name: 'rijst',
                    price: 2.0,
                    quantity: 1,
                    category: ProductCategoryEnum.rijst,
                    purchaseDate: '2026-01-19',
                    receiptId: 'receipt-1',
                    itemIndex: 0,
                },
            ],
            NOW,
        );

        const grouped = groupPantryItemsByCategory(items);

        expect(grouped[ProductCategoryEnum.zuivel]).toHaveLength(2);
        expect(grouped[ProductCategoryEnum.rijst]).toHaveLength(1);
    });
});

describe('buildStockItems', () => {
    it('keeps an item that is past its shelf life instead of hiding it', () => {
        const items = buildStockItems(
            [{
                name: 'AH MELK LV',
                quantity: 1,
                category: ProductCategoryEnum.zuivel,
                purchaseDate: '2026-07-01T10:00:00.000Z',
            }],
            new Date('2026-08-09T10:00:00.000Z'),
        );
        expect(items).toHaveLength(1);
        expect(items[0].daysRemaining).toBeLessThan(0);
    });

    it('reports what is still fresh', () => {
        const items = buildStockItems(
            [{
                name: 'AH BANANEN',
                quantity: 1,
                category: ProductCategoryEnum.fruit,
                purchaseDate: '2026-08-08T10:00:00.000Z',
            }],
            new Date('2026-08-09T10:00:00.000Z'),
        );
        expect(items[0].expiringSoon).toBe(false);
    });
});

describe('buildStockItems with a date given by hand', () => {
    it('counts down to your own date instead of the shelf life estimate', () => {
        const [item] = buildStockItems(
            [{
                name: 'AH MELK LV',
                quantity: 1,
                category: ProductCategoryEnum.zuivel,
                purchaseDate: '2026-08-01T10:00:00.000Z',
                expiresAt: '2026-08-19T10:00:00.000Z',
            }],
            new Date('2026-08-09T10:00:00.000Z'),
        );
        expect(Math.round(item.daysRemaining)).toBe(10);
    });

    it('flags your own date once it is close', () => {
        const [item] = buildStockItems(
            [{
                name: 'AH MELK LV',
                quantity: 1,
                category: ProductCategoryEnum.zuivel,
                purchaseDate: '2026-08-08T10:00:00.000Z',
                expiresAt: '2026-08-10T10:00:00.000Z',
            }],
            new Date('2026-08-09T10:00:00.000Z'),
        );
        expect(item.expiringSoon).toBe(true);
    });
});
