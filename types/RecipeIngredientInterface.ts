import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

interface RecipeIngredientInterface {
    name: string;
    amount: string;
    category: ProductCategoryEnum;
    quantity?: number;
    unit?: string;
    productQuery?: string;
    packs?: number;
    pantry?: boolean;
}

export type { RecipeIngredientInterface as default };
