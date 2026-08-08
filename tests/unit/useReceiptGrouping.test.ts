import { describe, expect, it } from 'vitest';
import { groupByMonth, monthKey, monthLabel } from '~/composables/useReceiptGrouping';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';

function receipt(id: string, date: string, total: number): ReceiptInterface {
    return { id, date, items: [], total, storeName: 'Albert Heijn' };
}

describe('monthKey', () => {
    it('pads the month so keys sort correctly', () => {
        expect(monthKey('2026-07-05T10:00:00.000Z')).toBe('2026-07');
    });
});

describe('monthLabel', () => {
    it('returns a capitalised Dutch month and year', () => {
        expect(monthLabel('2026-07-05T10:00:00.000Z')).toBe('Juli 2026');
    });
});

describe('groupByMonth', () => {
    it('groups receipts per calendar month, newest month first', () => {
        const groups = groupByMonth([
            receipt('a', '2026-08-07T10:00:00.000Z', 69.81),
            receipt('b', '2026-07-26T10:00:00.000Z', 101.65),
            receipt('c', '2026-08-01T10:00:00.000Z', 20.63),
        ]);
        expect(groups.map((group) => group.label)).toEqual(['Augustus 2026', 'Juli 2026']);
        expect(groups[0].receipts).toHaveLength(2);
    });

    it('totals the spend per month', () => {
        const groups = groupByMonth([
            receipt('a', '2026-08-07T10:00:00.000Z', 69.81),
            receipt('c', '2026-08-01T10:00:00.000Z', 20.63),
        ]);
        expect(groups[0].total).toBeCloseTo(90.44);
    });

    it('returns nothing for no receipts', () => {
        expect(groupByMonth([])).toEqual([]);
    });
});
