import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ReceiptsPage from '~/pages/receipts.vue';
import { useReceiptStore } from '~/stores/receiptStore';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const { downloadFileMock } = vi.hoisted(() => ({
    downloadFileMock: vi.fn(),
}));

vi.mock('~/composables/useReceiptExport', async (importOriginal) => {
    const actual = await importOriginal<typeof import('~/composables/useReceiptExport')>();
    return {
        ...actual,
        downloadFile: downloadFileMock,
        useReceiptExport: () => ({
            filterByWeek: actual.filterByWeek,
            filterByMonth: actual.filterByMonth,
            toCsv: actual.toCsv,
            toJson: actual.toJson,
            downloadFile: downloadFileMock,
        }),
    };
});

function makeItem(overrides: Partial<ReceiptItemInterface> = {}): ReceiptItemInterface {
    return {
        name: 'AH Melk',
        price: 1.29,
        quantity: 1,
        category: ProductCategoryEnum.zuivel,
        ...overrides,
    };
}

function makeReceipt(overrides: Partial<ReceiptInterface> = {}): ReceiptInterface {
    return {
        id: 'receipt-1',
        date: new Date().toISOString().split('T')[0],
        items: [makeItem()],
        total: 1.29,
        storeName: 'Albert Heijn',
        ...overrides,
    };
}

function mountPage() {
    return mount(ReceiptsPage, { attachTo: document.body });
}

describe('pages/receipts.vue', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
        downloadFileMock.mockReset();
    });

    describe('empty state', () => {
        it('renders the empty state and hides the toolbar when there are no receipts', () => {
            // #given
            const wrapper = mountPage();

            // #then
            expect(wrapper.find('.empty-state').text()).toBe(
                'Nog geen bonnen opgeslagen. Upload je eerste bon.',
            );
            expect(wrapper.find('.toolbar').exists()).toBe(false);
        });
    });

    describe('receipt list', () => {
        it('lists the store, date and total per receipt', () => {
            // #given
            useReceiptStore().receipts = [makeReceipt()];

            // #when
            const wrapper = mountPage();

            // #then
            expect(wrapper.find('.receipt-store').text()).toBe('Albert Heijn');
            expect(wrapper.find('.receipt-total').text()).toBe('€1.29');
        });

        it('expands and collapses the receipt items on click', async () => {
            // #given
            useReceiptStore().receipts = [makeReceipt()];
            const wrapper = mountPage();

            // #when
            await wrapper.find('.receipt-summary').trigger('click');

            // #then
            expect(wrapper.find('.receipt-items').isVisible()).toBe(true);

            // #when
            await wrapper.find('.receipt-summary').trigger('click');

            // #then
            expect(wrapper.find('.receipt-items').isVisible()).toBe(false);
        });

        it('removes the receipt from the store when delete is clicked', async () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [makeReceipt()];
            const wrapper = mountPage();
            await wrapper.find('.receipt-summary').trigger('click');

            // #when
            await wrapper.find('.delete-btn').trigger('click');

            // #then
            expect(store.receipts).toEqual([]);
        });
    });

    describe('filtering', () => {
        it('shows only receipts from the current week when the week tab is active', async () => {
            // #given
            useReceiptStore().receipts = [
                makeReceipt({ id: 'this-week' }),
                makeReceipt({ id: 'old', date: '2020-01-01' }),
            ];
            const wrapper = mountPage();

            // #when
            await wrapper.findAll('.filter-tab')[1].trigger('click');

            // #then
            expect(wrapper.findAll('.receipt-card')).toHaveLength(1);
        });

        it('shows the period-specific empty state when no receipts match the filter', async () => {
            // #given
            useReceiptStore().receipts = [makeReceipt({ date: '2020-01-01' })];
            const wrapper = mountPage();

            // #when
            await wrapper.findAll('.filter-tab')[1].trigger('click');

            // #then
            expect(wrapper.find('.empty-state').text()).toBe(
                'Geen bonnen gevonden voor deze periode.',
            );
        });
    });

    describe('selection', () => {
        it('selects every filtered receipt and updates the export button label', async () => {
            // #given
            useReceiptStore().receipts = [makeReceipt({ id: 'r1' }), makeReceipt({ id: 'r2' })];
            const wrapper = mountPage();

            // #when
            await wrapper.find('.select-all-label input').trigger('change');

            // #then
            expect(wrapper.find('.export-btn').text()).toBe('Exporteer (2)');
        });

        it('unselects every receipt when toggled again', async () => {
            // #given
            useReceiptStore().receipts = [makeReceipt({ id: 'r1' })];
            const wrapper = mountPage();
            await wrapper.find('.select-all-label input').trigger('change');

            // #when
            await wrapper.find('.select-all-label input').trigger('change');

            // #then
            expect(wrapper.find('.export-btn').text()).toBe('Exporteer');
        });
    });

    describe('export', () => {
        it('downloads a CSV file with the filtered receipts', async () => {
            // #given
            useReceiptStore().receipts = [makeReceipt()];
            const wrapper = mountPage();
            await wrapper.find('.export-btn').trigger('click');

            // #when
            await wrapper.findAll('.export-option')[0].trigger('click');

            // #then
            expect(downloadFileMock).toHaveBeenCalledTimes(1);
            const [, filename, mimeType] = downloadFileMock.mock.calls[0];
            expect(filename).toBe('bonnen.csv');
            expect(mimeType).toBe('text/csv');
        });

        it('downloads a JSON file with the filtered receipts', async () => {
            // #given
            useReceiptStore().receipts = [makeReceipt()];
            const wrapper = mountPage();
            await wrapper.find('.export-btn').trigger('click');

            // #when
            await wrapper.findAll('.export-option')[1].trigger('click');

            // #then
            expect(downloadFileMock).toHaveBeenCalledTimes(1);
            const [, filename, mimeType] = downloadFileMock.mock.calls[0];
            expect(filename).toBe('bonnen.json');
            expect(mimeType).toBe('application/json');
        });
    });
});
