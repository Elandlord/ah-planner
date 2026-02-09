import type RecipeInterface from '~/types/RecipeInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

interface RecipeScoreInterface {
    recipe: RecipeInterface;
    score: number;
    matchedIngredients: string[];
    missingIngredients: string[];
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
        const nameMatch = purchasedNames.has(ingredient.name.toLowerCase());
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
    items: ReceiptItemInterface[],
): RecipeScoreInterface[] {
    const purchasedNames = new Set(items.map((i) => i.name.toLowerCase()));
    const purchasedCategories = new Set(items.map((i) => i.category));

    return recipes
        .map((recipe) => scoreRecipe(recipe, purchasedNames, purchasedCategories))
        .filter((scored) => scored.score > 0)
        .sort((a, b) => b.score - a.score);
}

export function useRecipeMatch() {
    return {
        scoreRecipe,
        rankRecipes,
    };
}
