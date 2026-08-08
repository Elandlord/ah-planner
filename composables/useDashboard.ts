import type DashboardSummaryInterface from '~/types/DashboardSummaryInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import { breakdownPayments } from '~/composables/useReceiptPayments';
import { monthKey } from '~/composables/useReceiptGrouping';
import { monthlySpend } from '~/composables/useSpendingTrend';

export function daysSince(date: string, now: number): number {
    return Math.floor((now - new Date(date).getTime()) / 86_400_000);
}

export function summarise(receipts: ReceiptInterface[], now: number): DashboardSummaryInterface {
    const currentKey = monthKey(new Date(now).toISOString());
    const thisMonth = receipts.filter((receipt) => monthKey(receipt.date) === currentKey);
    const months = monthlySpend(receipts);
    const earlierMonths = months.filter((month) => month.key !== currentKey);
    const payments = breakdownPayments(thisMonth);

    const sorted = [...receipts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return {
        monthTotal: payments.total,
        monthOwnMoney: payments.paidWithOwnMoney,
        monthSavings: payments.paidWithSavings,
        monthDiscount: payments.discountTotal,
        monthReceipts: thisMonth.length,
        averageMonth: earlierMonths.length === 0
            ? 0
            : earlierMonths.reduce((sum, month) => sum + month.total, 0) / earlierMonths.length,
        lastReceiptDaysAgo: sorted.length === 0 ? null : daysSince(sorted[0].date, now),
        lastReceiptTotal: sorted.length === 0 ? null : sorted[0].total,
        totalReceipts: receipts.length,
        totalSavings: breakdownPayments(receipts).paidWithSavings,
    };
}

export function useDashboard() {
    return { summarise, daysSince };
}
