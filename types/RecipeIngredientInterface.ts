import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

interface RecipeIngredientInterface {
    name: string;
    amount: string;
    category: ProductCategoryEnum;
}

export type { RecipeIngredientInterface as default };
