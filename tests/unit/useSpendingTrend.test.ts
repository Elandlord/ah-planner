import { describe, expect, it } from 'vitest';
import { linearTrend, monthlySpend, trendValueAt } from '~/composables/useSpendingTrend';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptPaymentInterface from '~/types/ReceiptPaymentInterface';

function receipt(id: string, date: string, total: number, payments?: ReceiptPaymentInterface[]): ReceiptInterface {
    return {
        id,
        date,
        items: [{ name: 'AH BANANEN', price: 1.49, quantity: 1, category: ProductCategoryEnum.fruit }],
        total,
        storeName: 'Albert Heijn',
        payments,
    };
}

describe('linearTrend', () => {
    it('finds a rising slope for growing spend', () => {
        expect(linearTrend([100, 200, 300]).slope).toBeCloseTo(100);
    });

    it('finds a falling slope for shrinking spend', () => {
        expect(linearTrend([300, 200, 100]).slope).toBeCloseTo(-100);
    });

    it('reports a flat slope for equal months', () => {
        expect(linearTrend([150, 150, 150]).slope).toBeCloseTo(0);
    });

    it('handles a single month without dividing by zero', () => {
        expect(linearTrend([150])).toEqual({ slope: 0, intercept: 150 });
    });
});

describe('trendValueAt', () => {
    it('projects the fitted line at a month index', () => {
        expect(trendValueAt(linearTrend([100, 200, 300]), 3)).toBeCloseTo(400);
    });
});

describe('monthlySpend', () => {
    it('returns months oldest first so the chart reads left to right', () => {
        const months = monthlySpend([
            receipt('a', '2026-08-07T10:00:00.000Z', 69.81),
            receipt('b', '2026-07-26T10:00:00.000Z', 101.65),
        ]);
        expect(months.map((month) => month.label)).toEqual(['Juli 2026', 'Augustus 2026']);
    });

    it('splits own money from savings per month', () => {
        const [month] = monthlySpend([
            receipt('a', '2026-08-07T10:00:00.000Z', 69.81, [
                { method: 'KOOPZEGELS', amount: 52 },
                { method: 'PINNEN', amount: 17.81 },
            ]),
        ]);
        expect(month.paidWithOwnMoney).toBeCloseTo(17.81);
        expect(month.paidWithSavings).toBeCloseTo(52);
    });

    it('counts the receipts per month', () => {
        const months = monthlySpend([
            receipt('a', '2026-08-07T10:00:00.000Z', 69.81),
            receipt('b', '2026-08-01T10:00:00.000Z', 20.63),
        ]);
        expect(months[0].receiptCount).toBe(2);
    });
});
