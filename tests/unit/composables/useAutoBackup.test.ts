import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAutoBackup } from '~/composables/useAutoBackup';
import { useReceiptStore } from '~/stores/receiptStore';

function createLocalStorageStub() {
    const entries = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => entries.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            entries.set(key, value);
        }),
    };
}

// Real IndexedDB serialization can't structured-clone a stub with function properties,
// so this fake keeps handles by reference instead of round-tripping them.
function createIndexedDbStub() {
    const records = new Map<string, unknown>();

    function makeRequest<T>(run: () => T): { onsuccess?: () => void; onerror?: () => void; result?: T } {
        const request: { onsuccess?: () => void; onerror?: () => void; result?: T } = {};
        queueMicrotask(() => {
            request.result = run();
            request.onsuccess?.();
        });
        return request;
    }

    const objectStore = {
        put: (value: unknown, key: string) => {
            records.set(key, value);
        },
        get: (key: string) => makeRequest(() => records.get(key) ?? null),
        delete: (key: string) => {
            records.delete(key);
        },
    };

    return {
        open: () => {
            const request: {
                onupgradeneeded?: () => void;
                onsuccess?: () => void;
                result?: { createObjectStore: () => void; transaction: () => unknown; close: () => void };
            } = {};
            queueMicrotask(() => {
                request.result = {
                    createObjectStore: () => {},
                    transaction: () => {
                        const transaction: { objectStore: () => typeof objectStore; oncomplete?: () => void } = {
                            objectStore: () => objectStore,
                        };
                        queueMicrotask(() => transaction.oncomplete?.());
                        return transaction;
                    },
                    close: () => {},
                };
                request.onupgradeneeded?.();
                request.onsuccess?.();
            });
            return request;
        },
    };
}

function createWritableStreamStub() {
    return {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
    };
}

function createFileHandleStub(permission: PermissionState = 'granted') {
    return {
        queryPermission: vi.fn().mockResolvedValue(permission),
        requestPermission: vi.fn().mockResolvedValue(permission),
        createWritable: vi.fn().mockResolvedValue(createWritableStreamStub()),
    };
}

describe('useAutoBackup', () => {
    let fileHandle: ReturnType<typeof createFileHandleStub>;
    let showSaveFilePicker: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.stubGlobal('localStorage', createLocalStorageStub());
        vi.stubGlobal('indexedDB', createIndexedDbStub());
        setActivePinia(createPinia());

        fileHandle = createFileHandleStub();
        showSaveFilePicker = vi.fn().mockResolvedValue(fileHandle);
        vi.stubGlobal('window', { showSaveFilePicker });

        const { disable } = useAutoBackup();
        await disable();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        const { disable } = useAutoBackup();
        await disable();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    describe('isSupported', () => {
        it('is true when the browser exposes showSaveFilePicker', () => {
            // #given / #when
            const { isSupported } = useAutoBackup();

            // #then
            expect(isSupported.value).toBe(true);
        });

        it('is false when showSaveFilePicker is missing', () => {
            // #given
            vi.stubGlobal('window', {});

            // #when
            const { isSupported } = useAutoBackup();

            // #then
            expect(isSupported.value).toBe(false);
        });
    });

    describe('enable', () => {
        it('opens the save picker and marks auto-backup as enabled', async () => {
            // #given
            const { enable, isEnabled } = useAutoBackup();

            // #when
            await enable();

            // #then
            expect(showSaveFilePicker).toHaveBeenCalledTimes(1);
            expect(isEnabled.value).toBe(true);
        });

        it('writes an initial backup to the chosen file', async () => {
            // #given
            const { enable } = useAutoBackup();

            // #when
            await enable();

            // #then
            expect(fileHandle.createWritable).toHaveBeenCalledTimes(1);
        });
    });

    describe('store mutations', () => {
        it('debounces a write to the file after a store changes', async () => {
            // #given
            const { enable } = useAutoBackup();
            await enable();
            fileHandle.createWritable.mockClear();

            // #when
            useReceiptStore().receipts = [];
            await vi.advanceTimersByTimeAsync(1500);

            // #then
            expect(fileHandle.createWritable).toHaveBeenCalledTimes(1);
        });

        it('does not write after disable', async () => {
            // #given
            const { enable, disable } = useAutoBackup();
            await enable();
            await disable();
            fileHandle.createWritable.mockClear();

            // #when
            useReceiptStore().receipts = [];
            await vi.advanceTimersByTimeAsync(1500);

            // #then
            expect(fileHandle.createWritable).not.toHaveBeenCalled();
        });
    });

    describe('init', () => {
        it('resumes auto-backup when a stored handle still has permission', async () => {
            // #given
            const { enable, disable, isEnabled } = useAutoBackup();
            await enable();
            isEnabled.value = false;

            // #when
            const { init } = useAutoBackup();
            await init();

            // #then
            expect(isEnabled.value).toBe(true);

            // #cleanup
            await disable();
        });

        it('leaves auto-backup disabled when permission was revoked', async () => {
            // #given
            fileHandle.queryPermission.mockResolvedValue('prompt');
            const { enable, isEnabled } = useAutoBackup();
            await enable();
            isEnabled.value = false;

            // #when
            const { init } = useAutoBackup();
            await init();

            // #then
            expect(isEnabled.value).toBe(false);
        });
    });
});
