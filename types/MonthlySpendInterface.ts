interface MonthlySpendInterface {
    key: string;
    label: string;
    total: number;
    paidWithOwnMoney: number;
    paidWithSavings: number;
    receiptCount: number;
}

export type { MonthlySpendInterface as default };
