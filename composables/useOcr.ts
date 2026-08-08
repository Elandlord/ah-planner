import { ref } from 'vue';
import { buildReceipt } from '~/composables/useReceiptParser';
import { extractTextFromPdf } from '~/composables/usePdfParser';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type CategoryOverridesInterface from '~/types/CategoryOverridesInterface';

const OCR_TIMEOUT_MS = 30000;

export function useOcr(getOverrides: () => CategoryOverridesInterface = () => ({})) {
    const isProcessing = ref(false);
    const progress = ref('');
    const rawText = ref('');
    const error = ref('');

    async function processImage(imageData: string): Promise<ReceiptInterface | null> {
        isProcessing.value = true;
        progress.value = 'OCR starten...';
        error.value = '';
        rawText.value = '';

        try {
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('nld');

            progress.value = 'Tekst herkennen...';

            let timeoutId: ReturnType<typeof setTimeout>;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error('OCR verwerking duurde te lang'));
                }, OCR_TIMEOUT_MS);
            });

            let data;
            try {
                ({ data } = await Promise.race([worker.recognize(imageData), timeoutPromise]));
            } catch (raceErr) {
                try {
                    await worker.terminate();
                } catch {
                    // best-effort cleanup of a stuck worker
                }
                throw raceErr;
            } finally {
                clearTimeout(timeoutId!);
            }

            await worker.terminate();

            rawText.value = data.text;
            progress.value = 'Bon verwerkt!';

            return buildReceipt(data.text, getOverrides());
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'OCR verwerking mislukt';
            return null;
        } finally {
            isProcessing.value = false;
        }
    }

    async function processPdf(file: File): Promise<ReceiptInterface | null> {
        isProcessing.value = true;
        progress.value = 'PDF verwerken...';
        error.value = '';
        rawText.value = '';

        try {
            progress.value = 'Tekst uit PDF extraheren...';
            const text = await extractTextFromPdf(file);

            rawText.value = text;
            progress.value = 'Bon verwerkt!';

            return buildReceipt(text, getOverrides());
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'PDF verwerking mislukt';
            return null;
        } finally {
            isProcessing.value = false;
        }
    }

    function processText(text: string): ReceiptInterface {
        rawText.value = text;
        return buildReceipt(text, getOverrides());
    }

    return {
        isProcessing,
        progress,
        rawText,
        error,
        processImage,
        processPdf,
        processText,
    };
}
