import ProductCategoryEnum from '~/types/ProductCategoryEnum';

export const DEFAULT_SHELF_LIFE_DAYS = 14;

export const SHELF_LIFE_DAYS_BY_CATEGORY: Record<ProductCategoryEnum, number> = {
    [ProductCategoryEnum.groente]: 7,
    [ProductCategoryEnum.fruit]: 7,
    [ProductCategoryEnum.vlees]: 4,
    [ProductCategoryEnum.vis]: 3,
    [ProductCategoryEnum.zuivel]: 10,
    [ProductCategoryEnum.brood]: 5,
    [ProductCategoryEnum.dranken]: 30,
    [ProductCategoryEnum.pasta]: 365,
    [ProductCategoryEnum.rijst]: 365,
    [ProductCategoryEnum.conserven]: 365,
    [ProductCategoryEnum.kruiden]: 180,
    [ProductCategoryEnum.snacks]: 60,
    [ProductCategoryEnum.diepvries]: 90,
    [ProductCategoryEnum.maaltijden]: 4,
    [ProductCategoryEnum.vega]: 8,
    [ProductCategoryEnum.huishouden]: 365,
    [ProductCategoryEnum.overig]: DEFAULT_SHELF_LIFE_DAYS,
};

export function shelfLifeDaysFor(category: ProductCategoryEnum): number {
    return SHELF_LIFE_DAYS_BY_CATEGORY[category] ?? DEFAULT_SHELF_LIFE_DAYS;
}
