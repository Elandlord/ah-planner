import { ref } from 'vue';
import type AhProductInterface from '~/types/AhProductInterface';
import type RecipeInterface from '~/types/RecipeInterface';
import { productQueryFor } from '~/composables/useRecipeShopping';

const BATCH_SIZE = 50;

interface ResolvedSuggestion {
    query: string;
    product: AhProductInterface | null;
    bonusMechanism: string | null;
}

const bonusByRecipe = ref(new Map<string, number>());
const loading = ref(false);

export function countBonusProducts(
    recipe: RecipeInterface,
    resolved: Map<string, ResolvedSuggestion>,
): number {
    const queries = new Set(recipe.ingredients.map(productQueryFor));
    return [...queries].filter((query) => resolved.get(query)?.product?.isBonus).length;
}

/** Ties keep their original order, so a bonus never buries a recipe that fits better. */
export function sortByBonus(
    recipes: RecipeInterface[],
    counts: Map<string, number>,
): RecipeInterface[] {
    return [...recipes].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
}

export function chunk<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        batches.push(items.slice(index, index + size));
    }
    return batches;
}

export function useRecipeBonus() {
    async function loadBonusData(recipes: RecipeInterface[]): Promise<void> {
        if (loading.value || recipes.length === 0) {
            return;
        }
        loading.value = true;
        try {
            const queries = [...new Set(recipes.flatMap((recipe) =>
                recipe.ingredients.map(productQueryFor)))];
            const resolved = new Map<string, ResolvedSuggestion>();

            for (const batch of chunk(queries, BATCH_SIZE)) {
                const response = await $fetch<{ suggestions: ResolvedSuggestion[] }>(
                    '/api/ah/suggest',
                    { method: 'POST', body: { names: batch } },
                );
                for (const suggestion of response.suggestions) {
                    resolved.set(suggestion.query, suggestion);
                }
                const counts = new Map(bonusByRecipe.value);
                for (const recipe of recipes) {
                    counts.set(recipe.id, countBonusProducts(recipe, resolved));
                }
                bonusByRecipe.value = counts;
            }
        } finally {
            loading.value = false;
        }
    }

    function bonusCountFor(recipeId: string): number {
        return bonusByRecipe.value.get(recipeId) ?? 0;
    }

    return { bonusByRecipe, bonusCountFor, loadBonusData, loading };
}
