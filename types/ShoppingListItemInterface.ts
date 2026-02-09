import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

interface ShoppingListItemInterface {
    name: string;
    category: ProductCategoryEnum;
    checked: boolean;
    frequency: number;
}

export type { ShoppingListItemInterface as default };
