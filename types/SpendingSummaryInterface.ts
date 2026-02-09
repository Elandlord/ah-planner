import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

interface SpendingSummaryInterface {
    totalSpent: number;
    receiptCount: number;
    averagePerReceipt: number;
    spendingByCategory: Record<ProductCategoryEnum, number>;
}

export type { SpendingSummaryInterface as default };
