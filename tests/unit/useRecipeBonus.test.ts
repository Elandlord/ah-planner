import { describe, expect, it } from 'vitest';
import { chunk, countBonusProducts, sortByBonus } from '~/composables/useRecipeBonus';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type RecipeInterface from '~/types/RecipeInterface';

function product(isBonus: boolean) {
    return {
        id: 1,
        title: 'AH Gnocchi',
        brand: 'AH',
        salesUnitSize: '400 g',
        price: 1.99,
        bonusPrice: isBonus ? 1.49 : null,
        isBonus,
        imageUrl: null,
    };
}

const recipe: RecipeInterface = {
    id: 'gnocchi',
    name: 'Gnocchi bake',
    description: '',
    servings: 4,
    prepTimeMinutes: 30,
    ingredients: [
        { name: 'gnocchi', amount: '400 g', category: ProductCategoryEnum.pasta, productQuery: 'AH Gnocchi' },
        { name: 'mozzarella', amount: '150 g', category: ProductCategoryEnum.zuivel, productQuery: 'AH Mozzarella' },
    ],
    instructions: [],
    tags: [],
};

describe('countBonusProducts', () => {
    it('counts the ingredients that are in the bonus', () => {
        const resolved = new Map([
            ['AH Gnocchi', { query: 'AH Gnocchi', product: product(true), bonusMechanism: '1 + 1 gratis' }],
            ['AH Mozzarella', { query: 'AH Mozzarella', product: product(false), bonusMechanism: null }],
        ]);
        expect(countBonusProducts(recipe, resolved)).toBe(1);
    });

    it('counts nothing when nothing resolved', () => {
        expect(countBonusProducts(recipe, new Map())).toBe(0);
    });

    it('counts a product once even when two ingredients ask for it', () => {
        const twice: RecipeInterface = {
            ...recipe,
            ingredients: [recipe.ingredients[0], { ...recipe.ingredients[0], name: 'extra gnocchi' }],
        };
        const resolved = new Map([
            ['AH Gnocchi', { query: 'AH Gnocchi', product: product(true), bonusMechanism: null }],
        ]);
        expect(countBonusProducts(twice, resolved)).toBe(1);
    });
});

describe('sortByBonus', () => {
    it('puts the recipe with the most bonus ingredients first', () => {
        const recipes = [{ ...recipe, id: 'a' }, { ...recipe, id: 'b' }];
        const sorted = sortByBonus(recipes, new Map([['a', 0], ['b', 2]]));
        expect(sorted.map((r) => r.id)).toEqual(['b', 'a']);
    });

    it('leaves the original order for a tie', () => {
        const recipes = [{ ...recipe, id: 'a' }, { ...recipe, id: 'b' }];
        const sorted = sortByBonus(recipes, new Map([['a', 1], ['b', 1]]));
        expect(sorted.map((r) => r.id)).toEqual(['a', 'b']);
    });
});

describe('chunk', () => {
    it('splits a list into batches', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('returns nothing for an empty list', () => {
        expect(chunk([], 10)).toEqual([]);
    });
});
