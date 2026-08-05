import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { useReceiptOriginalStore } from '~/composables/useReceiptOriginalStore';

describe('useReceiptOriginalStore', () => {
    beforeEach(() => {
        vi.stubGlobal('indexedDB', new IDBFactory());
    });

    describe('saveOriginal / getOriginal', () => {
        it('stores the file and returns it again by id', async () => {
            // #given
            const { saveOriginal, getOriginal } = useReceiptOriginalStore();
            const file = new Blob(['receipt-bytes'], { type: 'image/png' });

            // #when
            const stored = await saveOriginal('receipt-1', file);
            const result = await getOriginal('receipt-1');

            // #then
            expect(stored).toBe(true);
            expect(result?.size).toBe(file.size);
            expect(result?.type).toBe('image/png');
        });

        it('returns null for an id that was never stored', async () => {
            // #given
            const { getOriginal } = useReceiptOriginalStore();

            // #when
            const result = await getOriginal('missing');

            // #then
            expect(result).toBeNull();
        });

        it('refuses to store a file larger than the size cap', async () => {
            // #given
            const { saveOriginal, getOriginal, MAX_ORIGINAL_BYTES } = useReceiptOriginalStore();
            const oversizedFile = { size: MAX_ORIGINAL_BYTES + 1 } as Blob;

            // #when
            const stored = await saveOriginal('receipt-2', oversizedFile);
            const result = await getOriginal('receipt-2');

            // #then
            expect(stored).toBe(false);
            expect(result).toBeNull();
        });
    });

    describe('deleteOriginal', () => {
        it('removes a previously stored file', async () => {
            // #given
            const { saveOriginal, getOriginal, deleteOriginal } = useReceiptOriginalStore();
            await saveOriginal('receipt-3', new Blob(['bytes']));

            // #when
            await deleteOriginal('receipt-3');

            // #then
            expect(await getOriginal('receipt-3')).toBeNull();
        });

        it('does not throw when the id was never stored', async () => {
            // #given
            const { deleteOriginal } = useReceiptOriginalStore();

            // #when / #then
            await expect(deleteOriginal('missing')).resolves.toBeUndefined();
        });
    });
});
