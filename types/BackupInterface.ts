import type CategoryOverridesInterface from '~/types/CategoryOverridesInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type RecipeInterface from '~/types/RecipeInterface';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';

interface BackupInterface {
    version: 1;
    exportedAt: string;
    receipts: ReceiptInterface[];
    savedRecipeIds: string[];
    weekPlan: Record<string, string>;
    shoppingList: ShoppingListItemInterface[];
    userRecipes: RecipeInterface[];
    categoryOverrides: CategoryOverridesInterface;
}

export type { BackupInterface as default };
