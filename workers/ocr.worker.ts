import { createWorker } from 'tesseract.js';

self.onmessage = async (event: MessageEvent<{ imageData: string }>) => {
    try {
        self.postMessage({ type: 'progress', message: 'OCR starten...' });

        const worker = await createWorker('nld');

        self.postMessage({ type: 'progress', message: 'Tekst herkennen...' });

        const { data } = await worker.recognize(event.data.imageData);

        await worker.terminate();

        self.postMessage({ type: 'result', text: data.text });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'OCR verwerking mislukt';
        self.postMessage({ type: 'error', message });
    }
};
