import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

export default interface CategoryOverridesInterface {
    [normalizedProductName: string]: ProductCategoryEnum;
}
