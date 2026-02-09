import type { TextItem } from 'pdfjs-dist/types/src/display/api';

const Y_TOLERANCE = 2;

function reconstructLines(items: TextItem[]): string[] {
    const lines: string[] = [];
    let currentLine: string[] = [];
    let lastY: number | null = null;

    for (const item of items) {
        const y = Math.round(item.transform[5]);

        if (lastY !== null && Math.abs(y - lastY) > Y_TOLERANCE) {
            lines.push(currentLine.join(' ').trim());
            currentLine = [];
        }

        currentLine.push(item.str);
        lastY = y;
    }

    if (currentLine.length > 0) {
        lines.push(currentLine.join(' ').trim());
    }

    return lines.filter(Boolean);
}

export async function extractTextFromPdf(file: File): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const textItems = textContent.items.filter(
            (item): item is TextItem => 'str' in item,
        );

        const pageLines = reconstructLines(textItems);
        allLines.push(...pageLines);
    }

    return allLines.join('\n');
}
