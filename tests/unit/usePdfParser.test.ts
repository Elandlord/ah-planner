import { describe, it, expect, vi, beforeEach } from 'vitest';

const MOCK_PAGE_TEXT = 'Albert Heijn\nAH Halfvolle melk   1.29\nSUBTOTAAL   1.29';

const getTextContentMock = vi.hoisted(() => vi.fn());
const getPageMock = vi.hoisted(() => vi.fn());
const getDocumentMock = vi.hoisted(() => vi.fn());

vi.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: getDocumentMock,
}));

describe('extractTextFromPdf', () => {
    beforeEach(() => {
        getTextContentMock.mockResolvedValue({
            items: [
                { str: 'Albert Heijn' },
                { str: '\n' },
                { str: 'AH Halfvolle melk   1.29' },
                { str: '\n' },
                { str: 'SUBTOTAAL   1.29' },
            ],
        });

        getPageMock.mockResolvedValue({
            getTextContent: getTextContentMock,
        });

        getDocumentMock.mockReturnValue({
            promise: Promise.resolve({
                numPages: 1,
                getPage: getPageMock,
            }),
        });
    });

    it('extracts text from a single-page PDF', async () => {
        const { extractTextFromPdf } = await import('~/composables/usePdfParser');

        const mockFile = new File(['fake-pdf-content'], 'receipt.pdf', {
            type: 'application/pdf',
        });

        const result = await extractTextFromPdf(mockFile);

        expect(result).toContain('Albert Heijn');
        expect(result).toContain('AH Halfvolle melk   1.29');
        expect(result).toContain('SUBTOTAAL   1.29');
    });

    it('extracts text from a multi-page PDF', async () => {
        const secondPageTextContent = {
            items: [
                { str: 'Page 2 content' },
            ],
        };

        getDocumentMock.mockReturnValue({
            promise: Promise.resolve({
                numPages: 2,
                getPage: vi.fn()
                    .mockResolvedValueOnce({
                        getTextContent: getTextContentMock,
                    })
                    .mockResolvedValueOnce({
                        getTextContent: vi.fn().mockResolvedValue(secondPageTextContent),
                    }),
            }),
        });

        const { extractTextFromPdf } = await import('~/composables/usePdfParser');

        const mockFile = new File(['fake-pdf-content'], 'receipt.pdf', {
            type: 'application/pdf',
        });

        const result = await extractTextFromPdf(mockFile);

        expect(result).toContain('Albert Heijn');
        expect(result).toContain('Page 2 content');
    });

    it('filters out non-text items', async () => {
        getTextContentMock.mockResolvedValue({
            items: [
                { str: 'Text item' },
                { type: 'beginMarkedContent' },
                { str: 'Another text' },
            ],
        });

        const { extractTextFromPdf } = await import('~/composables/usePdfParser');

        const mockFile = new File(['fake-pdf-content'], 'receipt.pdf', {
            type: 'application/pdf',
        });

        const result = await extractTextFromPdf(mockFile);

        expect(result).toContain('Text item');
        expect(result).toContain('Another text');
    });

    it('calls getDocument with the file ArrayBuffer', async () => {
        const { extractTextFromPdf } = await import('~/composables/usePdfParser');

        const mockFile = new File(['fake-pdf-content'], 'receipt.pdf', {
            type: 'application/pdf',
        });

        await extractTextFromPdf(mockFile);

        expect(getDocumentMock).toHaveBeenCalledWith({
            data: expect.any(ArrayBuffer),
        });
    });

    it('fetches pages starting from page 1', async () => {
        const getPageSpy = vi.fn().mockResolvedValue({
            getTextContent: getTextContentMock,
        });

        getDocumentMock.mockReturnValue({
            promise: Promise.resolve({
                numPages: 2,
                getPage: getPageSpy,
            }),
        });

        const { extractTextFromPdf } = await import('~/composables/usePdfParser');

        const mockFile = new File(['fake-pdf-content'], 'receipt.pdf', {
            type: 'application/pdf',
        });

        await extractTextFromPdf(mockFile);

        expect(getPageSpy).toHaveBeenCalledWith(1);
        expect(getPageSpy).toHaveBeenCalledWith(2);
    });
});
