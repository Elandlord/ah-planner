import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

interface ReceiptItemInterface {
    name: string;
    price: number;
    quantity: number;
    category: ProductCategoryEnum;
    consumedAt?: string;
}

export type { ReceiptItemInterface as default };
