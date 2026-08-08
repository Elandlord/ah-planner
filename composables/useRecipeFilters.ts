import type RecipeInterface from '~/types/RecipeInterface';

const QUICK_MINUTES = 20;

/** Tags are free text, so the menu groups them into the handful of things you actually pick from. */
const CATEGORY_TAGS: Record<string, string[]> = {
    Soep: ['soep'],
    Salade: ['salade'],
    Pasta: ['pasta', 'noedels', 'italiaans'],
    Ovenschotel: ['oven', 'ovenschotel', 'stoofpot'],
    Stamppot: ['stamppot'],
    Lunch: ['wraps', 'lunch', 'brood'],
    Vega: ['vegetarisch', 'vega'],
    Vis: ['vis'],
    Vlees: ['vlees', 'kip'],
};

export const recipeCategories = ['Alles', 'Snel', ...Object.keys(CATEGORY_TAGS)];

export function categoriesFor(recipe: RecipeInterface): string[] {
    const found = Object.entries(CATEGORY_TAGS)
        .filter(([, tags]) => tags.some((tag) => recipe.tags.includes(tag)))
        .map(([category]) => category);
    if (recipe.prepTimeMinutes <= QUICK_MINUTES) {
        found.push('Snel');
    }
    return found;
}

export function matchesSearch(recipe: RecipeInterface, term: string): boolean {
    const needle = term.trim().toLowerCase();
    if (needle.length === 0) {
        return true;
    }
    return recipe.name.toLowerCase().includes(needle)
        || recipe.description.toLowerCase().includes(needle)
        || recipe.tags.some((tag) => tag.includes(needle))
        || recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(needle));
}

export function filterRecipes(
    recipes: RecipeInterface[],
    category: string,
    term: string,
): RecipeInterface[] {
    return recipes
        .filter((recipe) => category === 'Alles' || categoriesFor(recipe).includes(category))
        .filter((recipe) => matchesSearch(recipe, term));
}

export function useRecipeFilters() {
    return { filterRecipes, categoriesFor, matchesSearch, recipeCategories };
}
