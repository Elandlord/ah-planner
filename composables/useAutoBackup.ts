import { computed, ref } from 'vue';
import { createBackup } from '~/composables/useDataBackup';
import { useCategoryOverrideStore } from '~/stores/categoryOverrideStore';
import { useReceiptStore } from '~/stores/receiptStore';
import { useRecipeStore } from '~/stores/recipeStore';
import { useShoppingListStore } from '~/stores/shoppingListStore';

const DB_NAME = 'ah-planner-autobackup';
const STORE_NAME = 'handles';
const DB_VERSION = 1;
const HANDLE_KEY = 'backup-file';
const WRITE_DEBOUNCE_MS = 1500;

let fileHandle: FileSystemFileHandle | null = null;
let unsubscribers: Array<() => void> = [];
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const isEnabled = ref(false);
const lastError = ref('');

function isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    db.close();
}

async function loadHandle(): Promise<FileSystemFileHandle | null> {
    const db = await openDb();
    const result = await new Promise<FileSystemFileHandle | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(HANDLE_KEY);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
    });
    db.close();

    return result;
}

async function clearHandle(): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(HANDLE_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    db.close();
}

async function performWrite(): Promise<void> {
    if (!fileHandle) {
        return;
    }

    try {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(createBackup(), null, 2));
        await writable.close();
        lastError.value = '';
    } catch (error) {
        lastError.value =
            error instanceof Error ? error.message : 'Automatisch back-uppen mislukt.';
    }
}

function scheduleWrite(): void {
    if (writeTimer) {
        clearTimeout(writeTimer);
    }
    writeTimer = setTimeout(() => {
        performWrite().catch(() => {});
    }, WRITE_DEBOUNCE_MS);
}

function subscribeToStores(): void {
    if (unsubscribers.length > 0) {
        return;
    }
    unsubscribers = [
        useReceiptStore().$subscribe(scheduleWrite),
        useRecipeStore().$subscribe(scheduleWrite),
        useShoppingListStore().$subscribe(scheduleWrite),
        useCategoryOverrideStore().$subscribe(scheduleWrite),
    ];
}

function unsubscribeFromStores(): void {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribers = [];
    if (writeTimer) {
        clearTimeout(writeTimer);
        writeTimer = null;
    }
}

async function enable(): Promise<void> {
    if (!isSupported() || !window.showSaveFilePicker) {
        return;
    }

    const handle = await window.showSaveFilePicker({
        suggestedName: 'ah-planner-backup.json',
        types: [{ description: 'JSON back-up', accept: { 'application/json': ['.json'] } }],
    });

    fileHandle = handle;
    await storeHandle(handle);
    isEnabled.value = true;
    subscribeToStores();
    await performWrite();
}

async function disable(): Promise<void> {
    unsubscribeFromStores();
    fileHandle = null;
    isEnabled.value = false;
    await clearHandle();
}

async function init(): Promise<void> {
    if (!isSupported()) {
        return;
    }

    const handle = await loadHandle();
    if (!handle) {
        return;
    }

    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
        return;
    }

    fileHandle = handle;
    isEnabled.value = true;
    subscribeToStores();
}

export function useAutoBackup() {
    return {
        isSupported: computed(() => isSupported()),
        isEnabled,
        lastError,
        enable,
        disable,
        init,
    };
}
