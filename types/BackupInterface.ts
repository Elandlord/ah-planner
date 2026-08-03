import type ReceiptInterface from '~/types/ReceiptInterface';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';

interface BackupInterface {
    version: 1;
    exportedAt: string;
    receipts: ReceiptInterface[];
    savedRecipeIds: string[];
    weekPlan: Record<string, string>;
    shoppingList: ShoppingListItemInterface[];
}

export type { BackupInterface as default };
