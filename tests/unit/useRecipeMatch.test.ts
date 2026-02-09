import { describe, it, expect } from 'vitest';
import { scoreRecipe, rankRecipes } from '~/composables/useRecipeMatch';
import type RecipeInterface from '~/types/RecipeInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
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
});

describe('rankRecipes', () => {
    const MOCK_ITEMS: ReceiptItemInterface[] = [
        { name: 'aardappelen', price: 1.50, quantity: 1, category: ProductCategoryEnum.groente },
        { name: 'boerenkool', price: 1.49, quantity: 1, category: ProductCategoryEnum.groente },
        { name: 'rookworst', price: 2.99, quantity: 1, category: ProductCategoryEnum.vlees },
    ];

    it('ranks recipes by score descending', () => {
        const ranked = rankRecipes([MOCK_RECIPE, MOCK_RECIPE_2], MOCK_ITEMS);

        expect(ranked.length).toBeGreaterThan(0);
        expect(ranked[0].recipe.id).toBe('test-recipe');
    });

    it('filters out recipes with zero score', () => {
        const items: ReceiptItemInterface[] = [
            { name: 'chocola', price: 2.00, quantity: 1, category: ProductCategoryEnum.snacks },
        ];

        const ranked = rankRecipes([MOCK_RECIPE, MOCK_RECIPE_2], items);

        expect(ranked.every((r) => r.score > 0)).toBe(true);
    });

    it('returns empty array for no items', () => {
        const ranked = rankRecipes([MOCK_RECIPE], []);
        expect(ranked).toEqual([]);
    });
});
