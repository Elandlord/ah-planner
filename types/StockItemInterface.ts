import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

interface StockItemInterface {
    name: string;
    category: ProductCategoryEnum;
    quantity: number;
    purchaseDate: string;
    expiresAt?: string;
}

export type { StockItemInterface as default };
