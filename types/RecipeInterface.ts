import type RecipeIngredientInterface from '~/types/RecipeIngredientInterface';

interface RecipeInterface {
    id: string;
    name: string;
    description: string;
    servings: number;
    prepTimeMinutes: number;
    ingredients: RecipeIngredientInterface[];
    instructions: string[];
    tags: string[];
}

export type { RecipeInterface as default };
