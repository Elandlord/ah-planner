import type BackupInterface from '~/types/BackupInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type RecipeInterface from '~/types/RecipeInterface';
import { useCategoryOverrideStore } from '~/stores/categoryOverrideStore';
import { useReceiptStore } from '~/stores/receiptStore';
import { getWeekStart, useRecipeStore } from '~/stores/recipeStore';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import { downloadFile } from '~/composables/useReceiptExport';

const BACKUP_VERSION = 2;

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
    if (
        !Array.isArray(backup.receipts) ||
        !backup.receipts.every(isValidReceipt) ||
        !Array.isArray(backup.savedRecipeIds) ||
        !Array.isArray(backup.shoppingList) ||
        !Array.isArray(backup.userRecipes) ||
        !backup.userRecipes.every(isValidRecipe) ||
        typeof backup.categoryOverrides !== 'object' ||
        backup.categoryOverrides === null
    ) {
        return false;
    }

    if (backup.version === 1) {
        return typeof backup.weekPlan === 'object' && backup.weekPlan !== null;
    }

    return backup.version === 2 && typeof backup.weekPlans === 'object' && backup.weekPlans !== null;
}

export function createBackup(): BackupInterface {
    const receiptStore = useReceiptStore();
    const recipeStore = useRecipeStore();
    const shoppingListStore = useShoppingListStore();
    const categoryOverrideStore = useCategoryOverrideStore();
    const { savedRecipeIds, weekPlans, userRecipes } = recipeStore.exportData();

    return {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        receipts: receiptStore.exportData(),
        savedRecipeIds,
        weekPlans,
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

    const weekPlans =
        backup.version === 1 ? { [getWeekStart(new Date())]: backup.weekPlan } : backup.weekPlans;

    receiptStore.importData(backup.receipts);
    recipeStore.importData({
        savedRecipeIds: backup.savedRecipeIds,
        weekPlans,
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
