import type BackupInterface from '~/types/BackupInterface';
import { useReceiptStore } from '~/stores/receiptStore';
import { useRecipeStore } from '~/stores/recipeStore';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import { downloadFile } from '~/composables/useReceiptExport';

const BACKUP_VERSION = 1;

function isValidBackup(value: unknown): value is BackupInterface {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const backup = value as Record<string, unknown>;
    return (
        backup.version === BACKUP_VERSION &&
        Array.isArray(backup.receipts) &&
        Array.isArray(backup.savedRecipeIds) &&
        typeof backup.weekPlan === 'object' &&
        backup.weekPlan !== null &&
        Array.isArray(backup.shoppingList)
    );
}

function createBackup(): BackupInterface {
    const receiptStore = useReceiptStore();
    const recipeStore = useRecipeStore();
    const shoppingListStore = useShoppingListStore();
    const { savedRecipeIds, weekPlan } = recipeStore.exportData();

    return {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        receipts: receiptStore.exportData(),
        savedRecipeIds,
        weekPlan,
        shoppingList: shoppingListStore.exportData(),
    };
}

function restoreBackup(backup: BackupInterface): void {
    const receiptStore = useReceiptStore();
    const recipeStore = useRecipeStore();
    const shoppingListStore = useShoppingListStore();

    receiptStore.importData(backup.receipts);
    recipeStore.importData({
        savedRecipeIds: backup.savedRecipeIds,
        weekPlan: backup.weekPlan,
    });
    shoppingListStore.importData(backup.shoppingList);
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
