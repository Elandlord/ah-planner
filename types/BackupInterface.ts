import type CategoryOverridesInterface from '~/types/CategoryOverridesInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type RecipeInterface from '~/types/RecipeInterface';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';
import type WeekPlanInterface from '~/types/WeekPlanInterface';

interface BackupInterfaceV1 {
    version: 1;
    exportedAt: string;
    receipts: ReceiptInterface[];
    savedRecipeIds: string[];
    weekPlan: Record<string, string>;
    shoppingList: ShoppingListItemInterface[];
    userRecipes: RecipeInterface[];
    categoryOverrides: CategoryOverridesInterface;
}

interface BackupInterfaceV2 {
    version: 2;
    exportedAt: string;
    receipts: ReceiptInterface[];
    savedRecipeIds: string[];
    weekPlans: Record<string, WeekPlanInterface>;
    shoppingList: ShoppingListItemInterface[];
    userRecipes: RecipeInterface[];
    categoryOverrides: CategoryOverridesInterface;
}

type BackupInterface = BackupInterfaceV1 | BackupInterfaceV2;

export type { BackupInterface as default, BackupInterfaceV1, BackupInterfaceV2 };
