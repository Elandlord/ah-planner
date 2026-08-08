import type MonthlySpendInterface from '~/types/MonthlySpendInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import { groupByMonth } from '~/composables/useReceiptGrouping';
import { breakdownPayments } from '~/composables/useReceiptPayments';

export interface TrendLine {
    slope: number;
    intercept: number;
}

/** Least squares fit over the month index, so the line shows direction rather than noise. */
export function linearTrend(values: number[]): TrendLine {
    const count = values.length;
    if (count < 2) {
        return { slope: 0, intercept: values[0] ?? 0 };
    }
    const meanIndex = (count - 1) / 2;
    const meanValue = values.reduce((sum, value) => sum + value, 0) / count;

    let covariance = 0;
    let variance = 0;
    values.forEach((value, index) => {
        covariance += (index - meanIndex) * (value - meanValue);
        variance += (index - meanIndex) ** 2;
    });

    const slope = variance === 0 ? 0 : covariance / variance;
    return { slope, intercept: meanValue - slope * meanIndex };
}

export function trendValueAt(trend: TrendLine, index: number): number {
    return trend.intercept + trend.slope * index;
}

export function monthlySpend(receipts: ReceiptInterface[]): MonthlySpendInterface[] {
    return groupByMonth(receipts)
        .map((group) => {
            const breakdown = breakdownPayments(group.receipts);
            return {
                key: group.key,
                label: group.label,
                total: group.total,
                paidWithOwnMoney: breakdown.paidWithOwnMoney,
                paidWithSavings: breakdown.paidWithSavings,
                savingsByMethod: breakdown.savingsByMethod,
                discountTotal: breakdown.discountTotal,
                receiptCount: group.receipts.length,
            };
        })
        .reverse();
}

/** Every method that paid for something in this history, biggest contributor first. */
export function savingsMethods(months: MonthlySpendInterface[]): string[] {
    const totals = new Map<string, number>();
    for (const month of months) {
        for (const [method, amount] of Object.entries(month.savingsByMethod)) {
            totals.set(method, (totals.get(method) ?? 0) + amount);
        }
    }
    return [...totals.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([method]) => method);
}

export function useSpendingTrend() {
    return { monthlySpend, linearTrend, trendValueAt };
}
