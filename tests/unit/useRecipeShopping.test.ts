import { describe, expect, it } from 'vitest';
import { buildShoppingItems, scaleAmount, scalePacks, servingsFactor } from '~/composables/useRecipeShopping';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type RecipeInterface from '~/types/RecipeInterface';

const GNOCCHI: RecipeInterface = {
    id: 'gnocchi',
    name: 'Gnocchi-bake',
    description: '',
    servings: 4,
    prepTimeMinutes: 45,
    ingredients: [
        {
            name: 'aardappelgnocchi',
            amount: '400 g',
            category: ProductCategoryEnum.pasta,
            quantity: 400,
            unit: 'g',
            productQuery: 'AH Gnocchi',
            packs: 1,
        },
        {
            name: 'knoflook',
            amount: '2 teentjes',
            category: ProductCategoryEnum.groente,
            quantity: 2,
            unit: 'teentjes',
            productQuery: 'AH Knoflook',
            packs: 1,
        },
        {
            name: 'zout en peper',
            amount: 'naar smaak',
            category: ProductCategoryEnum.kruiden,
        },
    ],
    instructions: [],
    tags: ['ovenschotel'],
};

const product = {
    id: 1,
    title: 'AH Gnocchi',
    brand: 'AH',
    salesUnitSize: '400 g',
    price: 1.99,
    bonusPrice: null,
    isBonus: false,
    imageUrl: null,
};

describe('servingsFactor', () => {
    it('doubles for twice the people', () => {
        expect(servingsFactor(4, 8)).toBe(2);
    });

    it('halves for half the table', () => {
        expect(servingsFactor(4, 2)).toBe(0.5);
    });

    it('falls back to one for a recipe without servings', () => {
        expect(servingsFactor(0, 4)).toBe(1);
    });
});

describe('scaleAmount', () => {
    it('scales a weight and keeps its unit', () => {
        expect(scaleAmount(GNOCCHI.ingredients[0], 1.5)).toBe('600 g');
    });

    it('rounds a countable ingredient up, since half a clove helps nobody', () => {
        expect(scaleAmount(GNOCCHI.ingredients[1], 0.75)).toBe('2 teentjes');
    });

    it('leaves an ingredient without a number untouched', () => {
        expect(scaleAmount(GNOCCHI.ingredients[2], 3)).toBe('naar smaak');
    });
});

describe('scalePacks', () => {
    it('never asks for less than one pack', () => {
        expect(scalePacks(GNOCCHI.ingredients[0], 0.25)).toBe(1);
    });

    it('rounds packs up so nothing runs short', () => {
        expect(scalePacks(GNOCCHI.ingredients[0], 2.2)).toBe(3);
    });
});

describe('buildShoppingItems', () => {
    it('skips ingredients that have no product to buy', () => {
        const items = buildShoppingItems(GNOCCHI, 4, new Map());
        expect(items.map((item) => item.name)).toEqual(['aardappelgnocchi', 'knoflook']);
    });

    it('scales the amounts to the chosen number of people', () => {
        const items = buildShoppingItems(GNOCCHI, 8, new Map());
        expect(items[0].scaledAmount).toBe('800 g');
        expect(items[0].packs).toBe(2);
    });

    it('selects only what actually resolved to a product', () => {
        const resolved = new Map([
            ['AH Gnocchi', { query: 'AH Gnocchi', product, bonusMechanism: null }],
            ['AH Knoflook', { query: 'AH Knoflook', product: null, bonusMechanism: null }],
        ]);
        const items = buildShoppingItems(GNOCCHI, 4, resolved);
        expect(items[0].selected).toBe(true);
        expect(items[1].selected).toBe(false);
    });
});

describe('scalePacks for pantry staples', () => {
    const nutmeg = {
        name: 'nootmuskaat',
        amount: '1 tl',
        category: ProductCategoryEnum.kruiden,
        quantity: 1,
        unit: 'tl',
        productQuery: 'AH Nootmuskaat gemalen',
        packs: 1,
        pantry: true,
    };

    it('never buys a second jar of nutmeg for a bigger table', () => {
        expect(scalePacks(nutmeg, 3)).toBe(1);
    });

    it('still scales the amount used in the recipe', () => {
        expect(scaleAmount(nutmeg, 3)).toBe('3 tl');
    });
});
