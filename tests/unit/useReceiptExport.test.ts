import { describe, it, expect } from 'vitest';
import {
    filterByWeek,
    filterByMonth,
    toCsv,
    toJson,
    escapeCsvField,
    startOfWeek,
} from '~/composables/useReceiptExport';
import type ReceiptInterface from '~/types/ReceiptInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

function makeReceipt(overrides: Partial<ReceiptInterface> = {}): ReceiptInterface {
    return {
        id: 'r1',
        date: '2026-02-09',
        storeName: 'Albert Heijn',
        total: 5.50,
        items: [
            {
                name: 'AH Melk',
                price: 1.29,
                quantity: 1,
                category: ProductCategoryEnum.zuivel,
            },
            {
                name: 'Bananen',
                price: 2.38,
                quantity: 2,
                category: ProductCategoryEnum.fruit,
            },
        ],
        ...overrides,
    };
}

describe('startOfWeek', () => {
    it('returns Monday for a Wednesday', () => {
        const wed = new Date('2026-02-04');
        const monday = startOfWeek(wed);
        expect(monday.getDay()).toBe(1);
        expect(monday.toISOString().split('T')[0]).toBe('2026-02-02');
    });

    it('returns Monday for a Sunday', () => {
        const sun = new Date('2026-02-08');
        const monday = startOfWeek(sun);
        expect(monday.getDay()).toBe(1);
        expect(monday.toISOString().split('T')[0]).toBe('2026-02-02');
    });

    it('returns same day for a Monday', () => {
        const mon = new Date('2026-02-02');
        const monday = startOfWeek(mon);
        expect(monday.toISOString().split('T')[0]).toBe('2026-02-02');
    });
});

describe('filterByWeek', () => {
    it('returns receipts within the current week', () => {
        const today = new Date();
        const receipts = [
            makeReceipt({ id: 'r1', date: today.toISOString().split('T')[0] }),
            makeReceipt({ id: 'r2', date: '2025-01-01' }),
        ];

        const result = filterByWeek(receipts, 0);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('r1');
    });

    it('returns empty array when no receipts match', () => {
        const receipts = [makeReceipt({ date: '2020-01-01' })];
        const result = filterByWeek(receipts, 0);
        expect(result).toHaveLength(0);
    });

    it('supports negative week offset for past weeks', () => {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const receipts = [
            makeReceipt({ id: 'r1', date: lastWeek.toISOString().split('T')[0] }),
        ];

        const result = filterByWeek(receipts, -1);
        expect(result).toHaveLength(1);
    });
});

describe('filterByMonth', () => {
    it('returns receipts within the current month', () => {
        const today = new Date();
        const receipts = [
            makeReceipt({ id: 'r1', date: today.toISOString().split('T')[0] }),
            makeReceipt({ id: 'r2', date: '2025-01-01' }),
        ];

        const result = filterByMonth(receipts, 0);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('r1');
    });

    it('returns empty array when no receipts match', () => {
        const receipts = [makeReceipt({ date: '2020-06-15' })];
        const result = filterByMonth(receipts, 0);
        expect(result).toHaveLength(0);
    });

    it('supports negative month offset for past months', () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const receipts = [
            makeReceipt({ id: 'r1', date: lastMonth.toISOString().split('T')[0] }),
        ];

        const result = filterByMonth(receipts, -1);
        expect(result).toHaveLength(1);
    });
});

describe('escapeCsvField', () => {
    it('returns plain string as-is', () => {
        expect(escapeCsvField('hello')).toBe('hello');
    });

    it('wraps field containing comma in quotes', () => {
        expect(escapeCsvField('hello, world')).toBe('"hello, world"');
    });

    it('wraps field containing double quote and escapes it', () => {
        expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    });

    it('wraps field containing newline', () => {
        expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    });
});

describe('toCsv', () => {
    it('generates header row', () => {
        const csv = toCsv([]);
        expect(csv).toBe('date,storeName,receiptTotal,itemName,quantity,price,category');
    });

    it('generates one row per item across receipts', () => {
        const receipts = [makeReceipt()];
        const csv = toCsv(receipts);
        const lines = csv.split('\n');

        expect(lines).toHaveLength(3);
        expect(lines[0]).toBe('date,storeName,receiptTotal,itemName,quantity,price,category');
        expect(lines[1]).toBe('2026-02-09,Albert Heijn,5.50,AH Melk,1,1.29,zuivel');
        expect(lines[2]).toBe('2026-02-09,Albert Heijn,5.50,Bananen,2,2.38,fruit');
    });

    it('escapes fields with special characters', () => {
        const receipt = makeReceipt({
            storeName: 'Albert "AH" Heijn',
            items: [
                {
                    name: 'Komkommer, groot',
                    price: 0.99,
                    quantity: 1,
                    category: ProductCategoryEnum.groente,
                },
            ],
        });

        const csv = toCsv([receipt]);
        const lines = csv.split('\n');

        expect(lines[1]).toContain('"Albert ""AH"" Heijn"');
        expect(lines[1]).toContain('"Komkommer, groot"');
    });

    it('handles multiple receipts', () => {
        const receipts = [
            makeReceipt({ id: 'r1' }),
            makeReceipt({ id: 'r2', storeName: 'Jumbo', items: [
                { name: 'Brood', price: 2.49, quantity: 1, category: ProductCategoryEnum.brood },
            ]}),
        ];

        const csv = toCsv(receipts);
        const lines = csv.split('\n');

        expect(lines).toHaveLength(4);
    });
});

describe('toJson', () => {
    it('returns formatted JSON string', () => {
        const receipts = [makeReceipt()];
        const json = toJson(receipts);
        const parsed = JSON.parse(json);

        expect(parsed).toHaveLength(1);
        expect(parsed[0].storeName).toBe('Albert Heijn');
        expect(parsed[0].items).toHaveLength(2);
    });

    it('returns empty array for no receipts', () => {
        const json = toJson([]);
        expect(JSON.parse(json)).toEqual([]);
    });

    it('preserves all receipt fields', () => {
        const receipt = makeReceipt();
        const json = toJson([receipt]);
        const parsed = JSON.parse(json)[0];

        expect(parsed.id).toBe('r1');
        expect(parsed.date).toBe('2026-02-09');
        expect(parsed.total).toBe(5.50);
        expect(parsed.items[0].category).toBe('zuivel');
    });
});
