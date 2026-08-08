interface DashboardSummaryInterface {
    monthTotal: number;
    monthOwnMoney: number;
    monthSavings: number;
    monthDiscount: number;
    monthReceipts: number;
    averageMonth: number;
    lastReceiptDaysAgo: number | null;
    lastReceiptTotal: number | null;
    totalReceipts: number;
    totalSavings: number;
}

export type { DashboardSummaryInterface as default };
