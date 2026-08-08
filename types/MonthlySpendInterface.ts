interface MonthlySpendInterface {
    key: string;
    label: string;
    total: number;
    paidWithOwnMoney: number;
    paidWithSavings: number;
    savingsByMethod: Record<string, number>;
    discountTotal: number;
    receiptCount: number;
}

export type { MonthlySpendInterface as default };
