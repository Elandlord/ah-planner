import { describe, expect, it } from 'vitest';
import { categoriesFor, filterRecipes, matchesSearch } from '~/composables/useRecipeFilters';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type RecipeInterface from '~/types/RecipeInterface';

function recipe(
    name: string,
    tags: string[],
    prepTimeMinutes = 45,
    ingredients: string[] = ['gnocchi'],
): RecipeInterface {
    return {
        id: name.toLowerCase(),
        name,
        description: `${name} beschrijving`,
        servings: 4,
        prepTimeMinutes,
        ingredients: ingredients.map((ingredient) => ({
            name: ingredient,
            amount: '100 g',
            category: ProductCategoryEnum.overig,
        })),
        instructions: [],
        tags,
    };
}

describe('categoriesFor', () => {
    it('groups a tag onto its menu category', () => {
        expect(categoriesFor(recipe('Tomatensoep', ['soep', 'winter']))).toContain('Soep');
    });

    it('marks a short recipe as quick', () => {
        expect(categoriesFor(recipe('Wrap', ['wraps'], 10))).toContain('Snel');
    });

    it('can sit in more than one category', () => {
        expect(categoriesFor(recipe('Lasagne', ['oven', 'italiaans']))).toEqual(
            expect.arrayContaining(['Pasta', 'Ovenschotel']),
        );
    });

    it('matches a category regardless of tag casing', () => {
        expect(categoriesFor(recipe('Kikkererwtencurry', ['Vega']))).toContain('Vega');
    });
});

describe('matchesSearch', () => {
    it('finds a recipe by ingredient', () => {
        expect(matchesSearch(recipe('Bake', ['oven'], 45, ['aubergine']), 'auberg')).toBe(true);
    });

    it('finds a recipe by name', () => {
        expect(matchesSearch(recipe('Erwtensoep', ['soep']), 'erwten')).toBe(true);
    });

    it('matches everything on an empty search', () => {
        expect(matchesSearch(recipe('Erwtensoep', ['soep']), '  ')).toBe(true);
    });

    it('rejects what does not match', () => {
        expect(matchesSearch(recipe('Erwtensoep', ['soep']), 'tiramisu')).toBe(false);
    });

    it('finds a recipe by tag regardless of casing', () => {
        expect(matchesSearch(recipe('Kikkererwtencurry', ['Vega']), 'vega')).toBe(true);
    });
});

describe('filterRecipes', () => {
    const all = [
        recipe('Erwtensoep', ['soep']),
        recipe('Zalm wrap', ['wraps', 'vis'], 10, ['gerookte zalm']),
        recipe('Lasagne', ['oven', 'italiaans']),
    ];

    it('keeps everything under Alles', () => {
        expect(filterRecipes(all, 'Alles', '')).toHaveLength(3);
    });

    it('narrows to one category', () => {
        expect(filterRecipes(all, 'Soep', '').map((r) => r.name)).toEqual(['Erwtensoep']);
    });

    it('combines category and search', () => {
        expect(filterRecipes(all, 'Snel', 'zalm').map((r) => r.name)).toEqual(['Zalm wrap']);
    });
});
