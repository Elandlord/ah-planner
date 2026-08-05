const DB_NAME = 'ah-planner-originals';
const STORE_NAME = 'originals';
const DB_VERSION = 1;
const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024;

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

async function saveOriginal(id: string, file: Blob): Promise<boolean> {
    if (file.size > MAX_ORIGINAL_BYTES) {
        return false;
    }

    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(file, id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    db.close();

    return true;
}

async function getOriginal(id: string): Promise<Blob | null> {
    const db = await openDb();
    const result = await new Promise<Blob | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
    });
    db.close();

    return result;
}

async function deleteOriginal(id: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    db.close();
}

export function useReceiptOriginalStore() {
    return {
        saveOriginal,
        getOriginal,
        deleteOriginal,
        MAX_ORIGINAL_BYTES,
    };
}
