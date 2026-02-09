import { ref } from 'vue';
import { buildReceipt } from '~/composables/useReceiptParser';
import type ReceiptInterface from '~/types/ReceiptInterface';

export function useOcr() {
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
            const { data } = await worker.recognize(imageData);
            await worker.terminate();

            rawText.value = data.text;
            progress.value = 'Bon verwerkt!';

            return buildReceipt(data.text);
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'OCR verwerking mislukt';
            return null;
        } finally {
            isProcessing.value = false;
        }
    }

    function processText(text: string): ReceiptInterface {
        rawText.value = text;
        return buildReceipt(text);
    }

    return {
        isProcessing,
        progress,
        rawText,
        error,
        processImage,
        processText,
    };
}
