import { describe, expect, it } from 'vitest';
import {
    extractRecipe,
    firstImage,
    parseIngredientLine,
    parseInstructions,
    parseMinutes,
    parseServings,
    recipeIdFor,
} from '~~/server/utils/recipeJsonLd';

function page(recipe: Record<string, unknown>): string {
    return `<html><head><script type="application/ld+json">${JSON.stringify(recipe)}</script></head></html>`;
}

describe('parseServings', () => {
    it('reads a plain number', () => {
        expect(parseServings(4)).toBe(4);
    });

    it('reads the number out of a list like ["2", "2 personen"]', () => {
        expect(parseServings(['2', '2 personen'])).toBe(2);
    });

    it('falls back to four when the page says nothing', () => {
        expect(parseServings(undefined)).toBe(4);
    });
});

describe('parseMinutes', () => {
    it('reads hours and minutes from an ISO duration', () => {
        expect(parseMinutes('PT1H15M')).toBe(75);
    });

    it('reads minutes alone', () => {
        expect(parseMinutes('PT20M')).toBe(20);
    });

    it('returns zero for a missing duration', () => {
        expect(parseMinutes(undefined)).toBe(0);
    });
});

describe('parseIngredientLine', () => {
    it('splits an amount from the ingredient', () => {
        expect(parseIngredientLine('400 gr gnocchi')).toMatchObject({
            name: 'gnocchi',
            amount: '400 gr',
            quantity: 400,
            unit: 'gr',
        });
    });

    it('keeps a line without an amount whole', () => {
        expect(parseIngredientLine('verse basilicum')).toMatchObject({
            name: 'verse basilicum',
            amount: '',
        });
    });
});

describe('parseInstructions', () => {
    it('reads HowToStep objects', () => {
        expect(parseInstructions([{ '@type': 'HowToStep', text: 'Verwarm de oven.' }]))
            .toEqual(['Verwarm de oven.']);
    });

    it('reads a nested HowToSection', () => {
        expect(parseInstructions([{ itemListElement: [{ text: 'Kook de gnocchi.' }] }]))
            .toEqual(['Kook de gnocchi.']);
    });

    it('splits a single text block into steps', () => {
        expect(parseInstructions('Stap een.\nStap twee.')).toEqual(['Stap een.', 'Stap twee.']);
    });
});

describe('firstImage', () => {
    it('takes a plain url', () => {
        expect(firstImage('https://example.test/a.jpg')).toBe('https://example.test/a.jpg');
    });

    it('takes the first of a list', () => {
        expect(firstImage(['https://example.test/a.jpg', 'b.jpg'])).toBe('https://example.test/a.jpg');
    });

    it('unwraps an ImageObject', () => {
        expect(firstImage({ url: 'https://example.test/a.jpg' })).toBe('https://example.test/a.jpg');
    });
});

describe('recipeIdFor', () => {
    it('makes a url friendly id', () => {
        expect(recipeIdFor('Gegratineerde gnocchi ovenschotel')).toBe('gegratineerde-gnocchi-ovenschotel');
    });
});

describe('extractRecipe', () => {
    it('reads a recipe out of a page', () => {
        const recipe = extractRecipe(page({
            '@type': 'Recipe',
            name: 'Gnocchi ovenschotel',
            description: 'Lekker  en snel ',
            recipeYield: ['2', '2 personen'],
            totalTime: 'PT42M',
            recipeIngredient: ['400 gr gnocchi', 'verse basilicum'],
            recipeInstructions: [{ '@type': 'HowToStep', text: 'Verwarm de oven.' }],
            image: 'https://example.test/gnocchi.jpg',
            keywords: 'oven, italiaans',
        }));
        expect(recipe).toMatchObject({
            name: 'Gnocchi ovenschotel',
            description: 'Lekker en snel',
            servings: 2,
            prepTimeMinutes: 42,
            tags: ['oven', 'italiaans'],
            imageUrl: 'https://example.test/gnocchi.jpg',
        });
        expect(recipe?.ingredients).toHaveLength(2);
    });

    it('finds a recipe inside an @graph', () => {
        const recipe = extractRecipe(page({
            '@graph': [{ '@type': 'WebPage' }, { '@type': 'Recipe', name: 'Soep' }],
        }));
        expect(recipe?.name).toBe('Soep');
    });

    it('returns nothing when the page has no recipe', () => {
        expect(extractRecipe('<html><body>geen recept</body></html>')).toBeNull();
    });

    it('survives broken json in a script block', () => {
        expect(extractRecipe('<script type="application/ld+json">{oops</script>')).toBeNull();
    });
});
