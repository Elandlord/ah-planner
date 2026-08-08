import type BackupInterface from '~/types/BackupInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type RecipeInterface from '~/types/RecipeInterface';
import { useCategoryOverrideStore } from '~/stores/categoryOverrideStore';
import { useReceiptStore } from '~/stores/receiptStore';
import { useRecipeStore } from '~/stores/recipeStore';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import { downloadFile } from '~/composables/useReceiptExport';

const BACKUP_VERSION = 1;

export function isValidBackup(value: unknown): value is BackupInterface {
function isValidReceipt(value: unknown): value is ReceiptInterface {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const receipt = value as Record<string, unknown>;
    return Array.isArray(receipt.items) && typeof receipt.date === 'string';
}

function isValidRecipe(value: unknown): value is RecipeInterface {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const recipe = value as Record<string, unknown>;
    return typeof recipe.name === 'string' && Array.isArray(recipe.ingredients);
}

function isValidBackup(value: unknown): value is BackupInterface {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const backup = value as Record<string, unknown>;
    return (
        backup.version === BACKUP_VERSION &&
        Array.isArray(backup.receipts) &&
        backup.receipts.every(isValidReceipt) &&
        Array.isArray(backup.savedRecipeIds) &&
        typeof backup.weekPlan === 'object' &&
        backup.weekPlan !== null &&
        Array.isArray(backup.shoppingList) &&
        Array.isArray(backup.userRecipes) &&
        backup.userRecipes.every(isValidRecipe) &&
        typeof backup.categoryOverrides === 'object' &&
        backup.categoryOverrides !== null
    );
}

export function createBackup(): BackupInterface {
    const receiptStore = useReceiptStore();
    const recipeStore = useRecipeStore();
    const shoppingListStore = useShoppingListStore();
    const categoryOverrideStore = useCategoryOverrideStore();
    const { savedRecipeIds, weekPlan, userRecipes } = recipeStore.exportData();

    return {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        receipts: receiptStore.exportData(),
        savedRecipeIds,
        weekPlan,
        shoppingList: shoppingListStore.exportData(),
        userRecipes,
        categoryOverrides: categoryOverrideStore.overrides,
    };
}

function restoreBackup(backup: BackupInterface): void {
    const receiptStore = useReceiptStore();
    const recipeStore = useRecipeStore();
    const shoppingListStore = useShoppingListStore();
    const categoryOverrideStore = useCategoryOverrideStore();

    receiptStore.importData(backup.receipts);
    recipeStore.importData({
        savedRecipeIds: backup.savedRecipeIds,
        weekPlan: backup.weekPlan,
        userRecipes: backup.userRecipes,
    });
    shoppingListStore.importData(backup.shoppingList);
    categoryOverrideStore.importData(backup.categoryOverrides);
}

export function useDataBackup() {
    function exportBackup(): void {
        const backup = createBackup();
        const filename = `ah-planner-backup-${backup.exportedAt.slice(0, 10)}.json`;
        downloadFile(JSON.stringify(backup, null, 2), filename, 'application/json');
    }

    function importBackup(json: string): void {
        let parsed: unknown;
        try {
            parsed = JSON.parse(json);
        } catch {
            throw new Error('Ongeldig back-upbestand: geen geldige JSON.');
        }

        if (!isValidBackup(parsed)) {
            throw new Error('Ongeldig back-upbestand: onverwachte structuur.');
        }

        restoreBackup(parsed);
    }

    return { exportBackup, importBackup };
}
