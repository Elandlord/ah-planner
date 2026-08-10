import type DietTagEnum from '~/types/DietTagEnum';
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
    dietaryTags?: DietTagEnum[];
    imageUrl?: string;
}

export type { RecipeInterface as default };
