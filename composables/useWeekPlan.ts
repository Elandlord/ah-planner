import type DietTagEnum from '~/types/DietTagEnum';
import type RecipeInterface from '~/types/RecipeInterface';

const DEFAULT_RUN_LENGTH = 2;

export interface HouseholdInterface {
    adults: number;
    children: number;
}

export function servingsPerDay(household: HouseholdInterface): number {
    return Math.max(1, household.adults + household.children);
}

export function servingsFor(days: number, household: HouseholdInterface): number {
    return Math.max(1, days) * servingsPerDay(household);
}

export function daysPerRecipe(weekPlan: Record<string, string>): Map<string, string[]> {
    const days = new Map<string, string[]>();
    for (const [day, recipeId] of Object.entries(weekPlan)) {
        days.set(recipeId, [...(days.get(recipeId) ?? []), day]);
    }
    return days;
}

/** Cooking once for two days means a week needs four recipes, not seven. */
export function recipesNeeded(dayCount: number, runLength = DEFAULT_RUN_LENGTH): number {
    return Math.ceil(dayCount / Math.max(1, runLength));
}

/**
 * Fills the week by giving each recipe a run of consecutive days, so leftovers land
 * on the day after they were cooked.
 */
export function buildWeekPlan(
    days: string[],
    recipes: RecipeInterface[],
    runLength = DEFAULT_RUN_LENGTH,
): Record<string, string> {
    const plan: Record<string, string> = {};
    if (recipes.length === 0) {
        return plan;
    }
    const size = Math.max(1, runLength);
    days.forEach((day, index) => {
        const recipe = recipes[Math.floor(index / size) % recipes.length];
        plan[day] = recipe.id;
    });
    return plan;
}

/** A recipe satisfies a restriction like "vegetarian" only if it carries that tag itself. */
export function matchesDietaryRestrictions(
    recipe: RecipeInterface,
    excludedDietaryTags: DietTagEnum[],
): boolean {
    const recipeTags = recipe.dietaryTags ?? [];
    return excludedDietaryTags.every((tag) => recipeTags.includes(tag));
}

export function excludeByDietaryTags(
    recipes: RecipeInterface[],
    excludedDietaryTags: DietTagEnum[],
): RecipeInterface[] {
    if (excludedDietaryTags.length === 0) {
        return recipes;
    }
    return recipes.filter((recipe) => matchesDietaryRestrictions(recipe, excludedDietaryTags));
}

export function pickRandom<T>(items: T[], count: number, random: () => number): T[] {
    const pool = [...items];
    const picked: T[] = [];
    while (pool.length > 0 && picked.length < count) {
        const index = Math.floor(random() * pool.length) % pool.length;
        picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
}

export function useWeekPlan() {
    return {
        buildWeekPlan,
        daysPerRecipe,
        excludeByDietaryTags,
        matchesDietaryRestrictions,
        pickRandom,
        recipesNeeded,
        servingsFor,
        servingsPerDay,
    };
}
