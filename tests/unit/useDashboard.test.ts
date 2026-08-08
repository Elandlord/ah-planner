import { describe, expect, it } from 'vitest';
import { daysSince, summarise } from '~/composables/useDashboard';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptPaymentInterface from '~/types/ReceiptPaymentInterface';

const NOW = new Date('2026-08-08T12:00:00Z').getTime();

function receipt(
    id: string,
    date: string,
    total: number,
    payments?: ReceiptPaymentInterface[],
    discountTotal?: number,
): ReceiptInterface {
    return {
        id,
        date,
        items: [{ name: 'AH BANANEN', price: 1.49, quantity: 1, category: ProductCategoryEnum.fruit }],
        total,
        storeName: 'Albert Heijn',
        payments,
        discountTotal,
    };
}

describe('daysSince', () => {
    it('counts whole days back to a receipt', () => {
        expect(daysSince('2026-08-06T12:00:00.000Z', NOW)).toBe(2);
    });

    it('returns zero for today', () => {
        expect(daysSince('2026-08-08T09:00:00.000Z', NOW)).toBe(0);
    });
});

describe('summarise', () => {
    it('counts only the current month in the month total', () => {
        const summary = summarise([
            receipt('a', '2026-08-07T10:00:00.000Z', 69.81),
            receipt('b', '2026-07-26T10:00:00.000Z', 101.65),
        ], NOW);
        expect(summary.monthTotal).toBeCloseTo(69.81);
        expect(summary.monthReceipts).toBe(1);
    });

    it('averages earlier months without the running one', () => {
        const summary = summarise([
            receipt('a', '2026-08-07T10:00:00.000Z', 50),
            receipt('b', '2026-07-26T10:00:00.000Z', 100),
            receipt('c', '2026-06-26T10:00:00.000Z', 200),
        ], NOW);
        expect(summary.averageMonth).toBeCloseTo(150);
    });

    it('reports savings across the whole history', () => {
        const summary = summarise([
            receipt('a', '2026-08-07T10:00:00.000Z', 69.81, [
                { method: 'KOOPZEGELS', amount: 52 },
                { method: 'PINNEN', amount: 17.81 },
            ]),
            receipt('b', '2026-03-07T10:00:00.000Z', 90.99, [
                { method: 'EMBALLAGE', amount: 3 },
                { method: 'PINNEN', amount: 87.99 },
            ]),
        ], NOW);
        expect(summary.totalSavings).toBeCloseTo(55);
        expect(summary.monthSavings).toBeCloseTo(52);
    });

    it('describes the most recent visit', () => {
        const summary = summarise([
            receipt('a', '2026-08-06T10:00:00.000Z', 69.81),
            receipt('b', '2026-08-01T10:00:00.000Z', 20.63),
        ], NOW);
        expect(summary.lastReceiptDaysAgo).toBe(2);
        expect(summary.lastReceiptTotal).toBeCloseTo(69.81);
    });

    it('stays empty without receipts', () => {
        const summary = summarise([], NOW);
        expect(summary.totalReceipts).toBe(0);
        expect(summary.lastReceiptDaysAgo).toBeNull();
        expect(summary.averageMonth).toBe(0);
    });
});
