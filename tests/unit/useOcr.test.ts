import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOcr } from '~/composables/useOcr';
import { extractTextFromPdf } from '~/composables/usePdfParser';

const SAMPLE_RECEIPT = `Albert Heijn
Winkelcentrum
Datum: 15-01-2026

AH Halfvolle melk   1.29
AH Boerenkool       1.49
Kipfilet             5.99
2 x Bananen         2.38
AH Spaghetti        0.89
Geraspte kaas        2.15

SUBTOTAAL           14.19
PIN                 14.19`;

const mockWorker = {
    recognize: vi.fn(),
    terminate: vi.fn(),
};

vi.mock('tesseract.js', () => ({
    createWorker: vi.fn(() => Promise.resolve(mockWorker)),
}));

vi.mock('~/composables/usePdfParser', () => ({
    extractTextFromPdf: vi.fn(),
}));

describe('useOcr', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('processText', () => {
        it('returns the parsed receipt synchronously and sets rawText', () => {
            // #given
            const { processText, rawText } = useOcr();

            // #when
            const receipt = processText(SAMPLE_RECEIPT);

            // #then
            expect(rawText.value).toBe(SAMPLE_RECEIPT);
            expect(receipt.storeName).toBe('Albert Heijn');
            expect(receipt.items.length).toBe(6);
            expect(receipt.total).toBe(14.19);
        });
    });

    describe('processImage', () => {
        it('toggles isProcessing, updates progress, terminates the worker, and returns the parsed receipt', async () => {
            // #given
            mockWorker.recognize.mockResolvedValue({ data: { text: SAMPLE_RECEIPT } });
            const { processImage, isProcessing, progress } = useOcr();

            // #when
            const promise = processImage('data:image/png;base64,fake');
            expect(isProcessing.value).toBe(true);
            const receipt = await promise;

            // #then
            expect(isProcessing.value).toBe(false);
            expect(progress.value).toBe('Bon verwerkt!');
            expect(mockWorker.terminate).toHaveBeenCalled();
            expect(receipt?.storeName).toBe('Albert Heijn');
            expect(receipt?.items.length).toBe(6);
            expect(receipt?.total).toBe(14.19);
        });

        it('sets error and returns null when recognition fails', async () => {
            // #given
            mockWorker.recognize.mockRejectedValue(new Error('recognition failed'));
            const { processImage, isProcessing, error } = useOcr();

            // #when
            const receipt = await processImage('data:image/png;base64,fake');

            // #then
            expect(error.value).toBe('recognition failed');
            expect(isProcessing.value).toBe(false);
            expect(receipt).toBeNull();
        });

        it('times out and resets state when the worker never resolves', async () => {
            // #given
            vi.useFakeTimers();
            mockWorker.recognize.mockReturnValue(new Promise(() => {}));
            const { processImage, isProcessing, error } = useOcr();

            // #when
            const promise = processImage('data:image/png;base64,fake');
            await vi.waitFor(() => expect(mockWorker.recognize).toHaveBeenCalled(), {
                timeout: 1000,
            });
            await vi.advanceTimersByTimeAsync(30000);
            const receipt = await promise;

            // #then
            expect(receipt).toBeNull();
            expect(error.value).toBe('OCR verwerking duurde te lang');
            expect(isProcessing.value).toBe(false);
            expect(mockWorker.terminate).toHaveBeenCalled();

            vi.useRealTimers();
        });
    });

    describe('processPdf', () => {
        it('returns the parsed receipt on the happy path', async () => {
            // #given
            vi.mocked(extractTextFromPdf).mockResolvedValue(SAMPLE_RECEIPT);
            const { processPdf } = useOcr();
            const file = new File(['fake'], 'receipt.pdf', { type: 'application/pdf' });

            // #when
            const receipt = await processPdf(file);

            // #then
            expect(receipt?.storeName).toBe('Albert Heijn');
            expect(receipt?.items.length).toBe(6);
            expect(receipt?.total).toBe(14.19);
        });

        it('sets error and returns null when extraction fails', async () => {
            // #given
            vi.mocked(extractTextFromPdf).mockRejectedValue(new Error('extraction failed'));
            const { processPdf, error } = useOcr();
            const file = new File(['fake'], 'receipt.pdf', { type: 'application/pdf' });

            // #when
            const receipt = await processPdf(file);

            // #then
            expect(error.value).toBe('extraction failed');
            expect(receipt).toBeNull();
        });
    });
});
