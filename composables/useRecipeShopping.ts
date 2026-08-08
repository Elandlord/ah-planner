import type AhProductInterface from '~/types/AhProductInterface';
import type RecipeIngredientInterface from '~/types/RecipeIngredientInterface';
import type RecipeInterface from '~/types/RecipeInterface';
import type RecipeShoppingItemInterface from '~/types/RecipeShoppingItemInterface';

const WHOLE_UNITS = ['stuks', 'teentjes', 'el', 'tl', 'scheutje'];

interface ResolvedSuggestion {
    query: string;
    product: AhProductInterface | null;
    bonusMechanism: string | null;
}

export function servingsFactor(recipeServings: number, servings: number): number {
    if (recipeServings <= 0) {
        return 1;
    }
    return servings / recipeServings;
}

/** Half an egg or a third of a clove helps nobody, so whole units round up. */
export function scaleAmount(ingredient: RecipeIngredientInterface, factor: number): string {
    if (ingredient.quantity === undefined) {
        return ingredient.amount;
    }
    const scaled = ingredient.quantity * factor;
    const unit = ingredient.unit ?? '';
    const rounded = WHOLE_UNITS.includes(unit) ? Math.ceil(scaled) : Math.round(scaled);
    return `${rounded} ${unit}`.trim();
}

/** A jar of nutmeg lasts all year, so pantry staples never scale with the table. */
export function scalePacks(ingredient: RecipeIngredientInterface, factor: number): number {
    if (ingredient.pantry) {
        return 1;
    }
    return Math.max(1, Math.ceil((ingredient.packs ?? 1) * factor));
}

export function buildShoppingItems(
    recipe: RecipeInterface,
    servings: number,
    resolved: Map<string, ResolvedSuggestion>,
): RecipeShoppingItemInterface[] {
    const factor = servingsFactor(recipe.servings, servings);
    return recipe.ingredients
        .filter((ingredient) => ingredient.productQuery)
        .map((ingredient) => {
            const match = resolved.get(ingredient.productQuery ?? '');
            return {
                name: ingredient.name,
                scaledAmount: scaleAmount(ingredient, factor),
                packs: scalePacks(ingredient, factor),
                product: match?.product ?? null,
                bonusMechanism: match?.bonusMechanism ?? null,
                selected: match?.product !== null && match?.product !== undefined,
            };
        });
}

export function useRecipeShopping() {
    async function resolveIngredients(recipe: RecipeInterface): Promise<Map<string, ResolvedSuggestion>> {
        const names = recipe.ingredients
            .map((ingredient) => ingredient.productQuery)
            .filter((query): query is string => Boolean(query));
        if (names.length === 0) {
            return new Map();
        }
        const response = await $fetch<{ suggestions: ResolvedSuggestion[] }>('/api/ah/suggest', {
            method: 'POST',
            body: { names },
        });
        return new Map(response.suggestions.map((suggestion) => [suggestion.query, suggestion]));
    }

    return { resolveIngredients, buildShoppingItems, scaleAmount, scalePacks, servingsFactor };
}
