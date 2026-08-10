import { describe, expect, it } from 'vitest';
import {
    buildWeekPlan,
    daysPerRecipe,
    excludeByDietaryTags,
    matchesDietaryRestrictions,
    pickRandom,
    recipesNeeded,
    servingsFor,
    servingsPerDay,
} from '~/composables/useWeekPlan';
import DietTagEnum from '~/types/DietTagEnum';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type RecipeInterface from '~/types/RecipeInterface';

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

function recipe(id: string, dietaryTags: DietTagEnum[] = []): RecipeInterface {
    return {
        id,
        name: id,
        description: '',
        servings: 4,
        prepTimeMinutes: 30,
        ingredients: [{ name: 'gnocchi', amount: '400 g', category: ProductCategoryEnum.pasta }],
        instructions: [],
        tags: [],
        dietaryTags,
    };
}

describe('servingsPerDay', () => {
    it('counts a toddler as a mouth to feed', () => {
        expect(servingsPerDay({ adults: 2, children: 1 })).toBe(3);
    });

    it('never drops below one', () => {
        expect(servingsPerDay({ adults: 0, children: 0 })).toBe(1);
    });
});

describe('servingsFor', () => {
    it('turns two days for a family of three into six servings', () => {
        expect(servingsFor(2, { adults: 2, children: 1 })).toBe(6);
    });
});

describe('recipesNeeded', () => {
    it('needs four recipes for a week when you cook for two days', () => {
        expect(recipesNeeded(7, 2)).toBe(4);
    });

    it('needs one per day when you cook daily', () => {
        expect(recipesNeeded(7, 1)).toBe(7);
    });
});

describe('buildWeekPlan', () => {
    it('gives each recipe two days in a row', () => {
        const plan = buildWeekPlan(DAYS, [recipe('a'), recipe('b'), recipe('c'), recipe('d')], 2);
        expect(plan).toEqual({
            Maandag: 'a',
            Dinsdag: 'a',
            Woensdag: 'b',
            Donderdag: 'b',
            Vrijdag: 'c',
            Zaterdag: 'c',
            Zondag: 'd',
        });
    });

    it('wraps around when there are fewer recipes than runs', () => {
        const plan = buildWeekPlan(DAYS, [recipe('a'), recipe('b')], 2);
        expect(plan.Zaterdag).toBe('a');
    });

    it('returns nothing without recipes', () => {
        expect(buildWeekPlan(DAYS, [], 2)).toEqual({});
    });
});

describe('daysPerRecipe', () => {
    it('collects the days a recipe covers', () => {
        const days = daysPerRecipe({ Maandag: 'a', Dinsdag: 'a', Woensdag: 'b' });
        expect(days.get('a')).toEqual(['Maandag', 'Dinsdag']);
        expect(days.get('b')).toEqual(['Woensdag']);
    });
});

describe('pickRandom', () => {
    it('picks the requested number without repeating', () => {
        const picked = pickRandom(['a', 'b', 'c', 'd'], 3, () => 0);
        expect(picked).toEqual(['a', 'b', 'c']);
    });

    it('stops when the pool runs out', () => {
        expect(pickRandom(['a'], 4, () => 0)).toEqual(['a']);
    });
});

describe('matchesDietaryRestrictions', () => {
    it('matches a recipe carrying every required tag', () => {
        const veggie = recipe('a', [DietTagEnum.vegetarian]);
        expect(matchesDietaryRestrictions(veggie, [DietTagEnum.vegetarian])).toBe(true);
    });

    it('rejects a recipe missing a required tag', () => {
        const meaty = recipe('a');
        expect(matchesDietaryRestrictions(meaty, [DietTagEnum.vegetarian])).toBe(false);
    });

    it('matches anything when no restrictions are set', () => {
        expect(matchesDietaryRestrictions(recipe('a'), [])).toBe(true);
    });
});

describe('excludeByDietaryTags', () => {
    it('drops the stamppot with spek from a vegetarian household', () => {
        const stamppot = recipe('stamppot');
        const veggieStew = recipe('veggie-stew', [DietTagEnum.vegetarian]);

        const filtered = excludeByDietaryTags([stamppot, veggieStew], [DietTagEnum.vegetarian]);

        expect(filtered).toEqual([veggieStew]);
    });

    it('returns every recipe unchanged when nothing is restricted', () => {
        const recipes = [recipe('a'), recipe('b', [DietTagEnum.vegan])];
        expect(excludeByDietaryTags(recipes, [])).toEqual(recipes);
    });
});
