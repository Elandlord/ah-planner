import { normalizeProductName } from '~/composables/useReceiptParser';
import { shelfLifeDaysFor } from '~/data/shelfLifeDays';
import type RecipeInterface from '~/types/RecipeInterface';
import type DatedReceiptItemInterface from '~/types/DatedReceiptItemInterface';
import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

interface RecipeScoreInterface {
    recipe: RecipeInterface;
    score: number;
    matchedIngredients: string[];
    missingIngredients: string[];
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function filterFreshItems(
    items: DatedReceiptItemInterface[],
    now: Date,
): DatedReceiptItemInterface[] {
    return items.filter((item) => {
        const ageInDays = (now.getTime() - new Date(item.purchaseDate).getTime()) / DAY_IN_MS;
        return ageInDays <= shelfLifeDaysFor(item.category);
    });
}

export function scoreRecipe(
    recipe: RecipeInterface,
    purchasedNames: Set<string>,
    purchasedCategories: Set<ProductCategoryEnum>,
): RecipeScoreInterface {
    const matchedIngredients: string[] = [];
    const missingIngredients: string[] = [];
    let score = 0;

    for (const ingredient of recipe.ingredients) {
        const normalizedIngredient = normalizeProductName(ingredient.name);
        const ingredientPattern = new RegExp(`\\b${escapeRegExp(normalizedIngredient)}`);
        const nameMatch = [...purchasedNames].some((name) => ingredientPattern.test(name));
        const categoryMatch = purchasedCategories.has(ingredient.category);

        if (nameMatch) {
            score += 3;
            matchedIngredients.push(ingredient.name);
        } else if (categoryMatch) {
            score += 1;
            matchedIngredients.push(ingredient.name);
        } else {
            missingIngredients.push(ingredient.name);
        }
    }

    return { recipe, score, matchedIngredients, missingIngredients };
}

export function rankRecipes(
    recipes: RecipeInterface[],
    items: DatedReceiptItemInterface[],
    now: Date = new Date(),
): RecipeScoreInterface[] {
    const freshItems = filterFreshItems(items, now);
    const purchasedNames = new Set(freshItems.map((i) => normalizeProductName(i.name)));
    const purchasedCategories = new Set(freshItems.map((i) => i.category));

    return recipes
        .map((recipe) => scoreRecipe(recipe, purchasedNames, purchasedCategories))
        .filter((scored) => scored.score > 0)
        .sort((a, b) => b.score - a.score);
}

export function useRecipeMatch() {
    return {
        scoreRecipe,
        rankRecipes,
        filterFreshItems,
    };
}
