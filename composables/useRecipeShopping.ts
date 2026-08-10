import type AhProductInterface from '~/types/AhProductInterface';
import type RecipeIngredientInterface from '~/types/RecipeIngredientInterface';
import type RecipeInterface from '~/types/RecipeInterface';
import type RecipeShoppingItemInterface from '~/types/RecipeShoppingItemInterface';

const WHOLE_UNITS = ['stuks', 'teentjes', 'el', 'tl', 'scheutje', 'blikje', 'pak'];
const PANTRY_WORDS = [
    'olie', 'azijn', 'zout', 'peper', 'suiker', 'bloem', 'kruiden', 'nootmuskaat',
    'kaneel', 'paprikapoeder', 'kerrie', 'sambal', 'ketjap', 'mosterd', 'bouillon',
    'tomatenpuree', 'honing', 'laurier', 'tijm', 'oregano', 'komijn',
];
const AMOUNT_PATTERN = /^([\d.,]+)\s*([a-zA-Z]*)/;
const UNIT_ALIASES: Record<string, string> = { gram: 'g', kg: 'kg', ml: 'ml', l: 'l' };

/** Older recipes carry a free text amount like "500g" or "1 stuk", so read it rather than rewrite it. */
export function parseAmount(amount: string): { quantity: number; unit: string } | null {
    const match = AMOUNT_PATTERN.exec(amount.trim());
    if (!match) {
        return null;
    }
    const quantity = parseFloat(match[1].replace(',', '.'));
    if (Number.isNaN(quantity)) {
        return null;
    }
    const raw = match[2].toLowerCase();
    return { quantity, unit: UNIT_ALIASES[raw] ?? (raw || 'stuks') };
}

/** Every ingredient can be shopped, even when no product query was written down. */
export function productQueryFor(ingredient: RecipeIngredientInterface): string {
    if (ingredient.productQuery) {
        return ingredient.productQuery;
    }
    const name = ingredient.name.split(',')[0].trim();
    return `AH ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

export function isPantryIngredient(ingredient: RecipeIngredientInterface): boolean {
    if (ingredient.pantry !== undefined) {
        return ingredient.pantry;
    }
    const name = ingredient.name.toLowerCase();
    return PANTRY_WORDS.some((word) => name.includes(word));
}

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
    const parsed = ingredient.quantity === undefined
        ? parseAmount(ingredient.amount)
        : { quantity: ingredient.quantity, unit: ingredient.unit ?? '' };
    if (!parsed) {
        return ingredient.amount;
    }
    const scaled = parsed.quantity * factor;
    const unit = parsed.unit;
    const rounded = WHOLE_UNITS.includes(unit) || (scaled > 0 && scaled < 1)
        ? Math.ceil(scaled)
        : Math.round(scaled);
    return `${rounded} ${unit}`.trim();
}

/** A jar of nutmeg lasts all year, so pantry staples never scale with the table. */
export function scalePacks(ingredient: RecipeIngredientInterface, factor: number): number {
    if (isPantryIngredient(ingredient)) {
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
        .map((ingredient) => {
            const match = resolved.get(productQueryFor(ingredient));
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
        const names = recipe.ingredients.map(productQueryFor);
        if (names.length === 0) {
            return new Map();
        }
        const response = await $fetch<{ suggestions: ResolvedSuggestion[] }>('/api/ah/suggest', {
            method: 'POST',
            body: { names },
        });
        return new Map(response.suggestions.map((suggestion) => [suggestion.query, suggestion]));
    }

    return {
        resolveIngredients,
        buildShoppingItems,
        scaleAmount,
        scalePacks,
        servingsFactor,
        productQueryFor,
    };
}
