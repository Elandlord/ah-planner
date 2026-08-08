import type ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ShoppingListItemSourceInterface from '~/types/ShoppingListItemSourceInterface';

interface ShoppingListItemInterface {
    name: string;
    category: ProductCategoryEnum;
    checked: boolean;
    frequency: number;
    sources?: ShoppingListItemSourceInterface[];
    amounts?: string[];
}

export type { ShoppingListItemInterface as default };
