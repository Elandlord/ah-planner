import { describe, it, expect } from 'vitest';
import { scoreRecipe, rankRecipes, filterFreshItems } from '~/composables/useRecipeMatch';
import { normalizeProductName } from '~/composables/useReceiptParser';
import type RecipeInterface from '~/types/RecipeInterface';
import type DatedReceiptItemInterface from '~/types/DatedReceiptItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const MOCK_RECIPE: RecipeInterface = {
    id: 'test-recipe',
    name: 'Test Stamppot',
    description: 'Een test recept',
    servings: 4,
    prepTimeMinutes: 30,
    ingredients: [
        { name: 'aardappelen', amount: '1kg', category: ProductCategoryEnum.groente },
        { name: 'boerenkool', amount: '500g', category: ProductCategoryEnum.groente },
        { name: 'rookworst', amount: '1 stuk', category: ProductCategoryEnum.vlees },
        { name: 'melk', amount: '100ml', category: ProductCategoryEnum.zuivel },
    ],
    instructions: ['Stap 1', 'Stap 2'],
    tags: ['stamppot'],
};

const MOCK_RECIPE_2: RecipeInterface = {
    id: 'test-recipe-2',
    name: 'Test Pasta',
    description: 'Een pasta test',
    servings: 4,
    prepTimeMinutes: 20,
    ingredients: [
        { name: 'spaghetti', amount: '400g', category: ProductCategoryEnum.pasta },
        { name: 'gehakt', amount: '300g', category: ProductCategoryEnum.vlees },
        { name: 'tomatensaus', amount: '400ml', category: ProductCategoryEnum.conserven },
    ],
    instructions: ['Stap 1'],
    tags: ['pasta'],
};

describe('scoreRecipe', () => {
    it('scores exact name matches with 3 points', () => {
        const purchasedNames = new Set(['aardappelen', 'boerenkool']);
        const purchasedCategories = new Set<ProductCategoryEnum>([]);

        const result = scoreRecipe(MOCK_RECIPE, purchasedNames, purchasedCategories);

        expect(result.score).toBe(6);
        expect(result.matchedIngredients).toContain('aardappelen');
        expect(result.matchedIngredients).toContain('boerenkool');
    });

    it('scores category matches with 1 point', () => {
        const purchasedNames = new Set<string>([]);
        const purchasedCategories = new Set([ProductCategoryEnum.groente]);

        const result = scoreRecipe(MOCK_RECIPE, purchasedNames, purchasedCategories);

        expect(result.score).toBe(2);
    });

    it('tracks missing ingredients', () => {
        const purchasedNames = new Set(['aardappelen']);
        const purchasedCategories = new Set<ProductCategoryEnum>([]);

        const result = scoreRecipe(MOCK_RECIPE, purchasedNames, purchasedCategories);

        expect(result.missingIngredients).toContain('boerenkool');
        expect(result.missingIngredients).toContain('rookworst');
        expect(result.missingIngredients).toContain('melk');
    });

    it('returns zero score for no matches', () => {
        const purchasedNames = new Set<string>([]);
        const purchasedCategories = new Set<ProductCategoryEnum>([]);

        const result = scoreRecipe(MOCK_RECIPE, purchasedNames, purchasedCategories);

        expect(result.score).toBe(0);
    });

    it('prefers name match over category match', () => {
        const purchasedNames = new Set(['aardappelen']);
        const purchasedCategories = new Set([ProductCategoryEnum.groente]);

        const result = scoreRecipe(MOCK_RECIPE, purchasedNames, purchasedCategories);

        expect(result.score).toBe(4);
    });

    it('matches ingredients as substrings of prefixed purchased names', () => {
        const purchasedNames = new Set([
            normalizeProductName('AH Kipfilet'),
            normalizeProductName('AH Melk LV'),
        ]);
        const purchasedCategories = new Set<ProductCategoryEnum>([]);

        const result = scoreRecipe(MOCK_RECIPE, purchasedNames, purchasedCategories);

        expect(result.matchedIngredients).toContain('melk');
        expect(result.score).toBeGreaterThanOrEqual(3);
    });
});

describe('rankRecipes', () => {
    const NOW = new Date('2026-01-20T12:00:00Z');

    const MOCK_ITEMS: DatedReceiptItemInterface[] = [
        {
            name: 'aardappelen',
            price: 1.5,
            quantity: 1,
            category: ProductCategoryEnum.groente,
            purchaseDate: '2026-01-18',
        },
        {
            name: 'boerenkool',
            price: 1.49,
            quantity: 1,
            category: ProductCategoryEnum.groente,
            purchaseDate: '2026-01-18',
        },
        {
            name: 'rookworst',
            price: 2.99,
            quantity: 1,
            category: ProductCategoryEnum.vlees,
            purchaseDate: '2026-01-18',
        },
    ];

    it('ranks recipes by score descending', () => {
        const ranked = rankRecipes([MOCK_RECIPE, MOCK_RECIPE_2], MOCK_ITEMS, NOW);

        expect(ranked.length).toBeGreaterThan(0);
        expect(ranked[0].recipe.id).toBe('test-recipe');
    });

    it('filters out recipes with zero score', () => {
        const items: DatedReceiptItemInterface[] = [
            {
                name: 'chocola',
                price: 2.0,
                quantity: 1,
                category: ProductCategoryEnum.snacks,
                purchaseDate: '2026-01-18',
            },
        ];

        const ranked = rankRecipes([MOCK_RECIPE, MOCK_RECIPE_2], items, NOW);

        expect(ranked.every((r) => r.score > 0)).toBe(true);
    });

    it('returns empty array for no items', () => {
        const ranked = rankRecipes([MOCK_RECIPE], [], NOW);
        expect(ranked).toEqual([]);
    });

    it('excludes items bought before their category shelf-life window', () => {
        const items: DatedReceiptItemInterface[] = [
            {
                name: 'aardappelen',
                price: 1.5,
                quantity: 1,
                category: ProductCategoryEnum.groente,
                purchaseDate: '2025-12-01',
            },
        ];

        const ranked = rankRecipes([MOCK_RECIPE], items, NOW);

        expect(ranked).toEqual([]);
    });
});

describe('filterFreshItems', () => {
    const NOW = new Date('2026-01-20T12:00:00Z');

    it('keeps items purchased within their category shelf-life window', () => {
        const items: DatedReceiptItemInterface[] = [
            {
                name: 'rijst',
                price: 2.0,
                quantity: 1,
                category: ProductCategoryEnum.rijst,
                purchaseDate: '2025-06-01',
            },
        ];

        expect(filterFreshItems(items, NOW)).toEqual(items);
    });

    it('drops items purchased outside their category shelf-life window', () => {
        const items: DatedReceiptItemInterface[] = [
            {
                name: 'vis',
                price: 5.0,
                quantity: 1,
                category: ProductCategoryEnum.vis,
                purchaseDate: '2026-01-01',
            },
        ];

        expect(filterFreshItems(items, NOW)).toEqual([]);
    });
});
