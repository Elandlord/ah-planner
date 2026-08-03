import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import SpendingPage from '~/pages/spending.vue';
import { useReceiptStore } from '~/stores/receiptStore';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

function createLocalStorageStub() {
    const entries = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => entries.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            entries.set(key, value);
        }),
    };
}

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
        date: '2026-01-10',
        items: [makeItem()],
        total: 1.29,
        storeName: 'Albert Heijn',
        ...overrides,
    };
}

function mountPage() {
    return mount(SpendingPage, {
        global: { stubs: { SpendingChart: true } },
    });
}

describe('spending page', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createLocalStorageStub());
        setActivePinia(createPinia());
    });

    describe('empty store', () => {
        it('renders the empty state and hides the stats and sections', () => {
            // #given
            useReceiptStore();

            // #when
            const wrapper = mountPage();

            // #then
            expect(wrapper.find('.empty-state').exists()).toBe(true);
            expect(wrapper.find('.stats-grid').exists()).toBe(false);
            expect(wrapper.find('.section').exists()).toBe(false);
        });
    });

    describe('seeded store', () => {
        it('renders the stat values from the store getters', () => {
            // #given
            const store = useReceiptStore();
            store.receipts = [
                makeReceipt({ id: 'receipt-1', total: 10.5 }),
                makeReceipt({ id: 'receipt-2', total: 5.25 }),
            ];

            // #when
            const wrapper = mountPage();

            // #then
            const statValues = wrapper.findAll('.stat-value').map((el) => el.text());
            expect(statValues).toEqual([
                `€${store.totalSpent.toFixed(2)}`,
                `${store.receiptCount}`,
                `€${store.averagePerReceipt.toFixed(2)}`,
            ]);
        });

        it('lists the top items in descending frequency order, capped at 10', () => {
            // #given
            const store = useReceiptStore();
            const items = Array.from({ length: 12 }, (_, index) =>
                makeItem({ name: `item-${index}`, quantity: 12 - index }),
            );
            store.receipts = [makeReceipt({ items })];

            // #when
            const wrapper = mountPage();

            // #then
            const topItems = wrapper.findAll('.top-item');
            expect(topItems).toHaveLength(10);

            const expectedOrder = Object.entries(store.itemFrequency)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([name]) => name);
            expect(topItems.map((el) => el.find('.top-item-name').text())).toEqual(
                expectedOrder,
            );
        });
    });
});
