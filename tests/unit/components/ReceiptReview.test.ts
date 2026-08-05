import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ReceiptReview from '~/components/ReceiptReview.vue';
import ReceiptItemRow from '~/components/ReceiptItemRow.vue';
import { useCategoryOverrideStore } from '~/stores/categoryOverrideStore';
import type ReceiptInterface from '~/types/ReceiptInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const getOriginal = vi.fn();

vi.mock('~/composables/useReceiptOriginalStore', () => ({
    useReceiptOriginalStore: vi.fn(() => ({ getOriginal })),
}));

function createLocalStorageStub() {
    const entries = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => entries.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            entries.set(key, value);
        }),
    };
}

function makeReceipt(): ReceiptInterface {
    return {
        id: 'receipt-1',
        date: '2026-01-15',
        items: [
            {
                name: 'AH ZUIVELSPR',
                price: 1.39,
                quantity: 2,
                category: ProductCategoryEnum.overig,
            },
        ],
        total: 2.78,
        storeName: 'Albert Heijn',
    };
}

function mountReview(receipt: ReceiptInterface) {
    return mount(ReceiptReview, {
        props: { modelValue: receipt },
        global: {
            components: { ReceiptItemRow },
        },
    });
}

describe('ReceiptReview', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createLocalStorageStub());
        setActivePinia(createPinia());
        getOriginal.mockReset();
    });

    describe('category corrections', () => {
        it('remembers a corrected category for the product', async () => {
            // #given
            const wrapper = mountReview(reactive(makeReceipt()));
            const store = useCategoryOverrideStore();

            // #when
            await wrapper.find('.item-category').setValue(ProductCategoryEnum.zuivel);

            // #then
            expect(store.overrides).toEqual({ 'ah zuivelspr': ProductCategoryEnum.zuivel });
        });

        it('does not remember anything while no category is corrected', () => {
            // #given
            mountReview(reactive(makeReceipt()));

            // #when
            const store = useCategoryOverrideStore();

            // #then
            expect(store.overrides).toEqual({});
        });
    });

    describe('view original', () => {
        it('does not show the button when no original was stored', () => {
            // #given
            const wrapper = mountReview(reactive(makeReceipt()));

            // #then
            expect(wrapper.find('.view-original-btn').exists()).toBe(false);
        });

        it('opens the stored original in a new tab when clicked', async () => {
            // #given
            const blob = new Blob(['bytes'], { type: 'image/png' });
            getOriginal.mockResolvedValue(blob);
            vi.stubGlobal('open', vi.fn());
            vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:receipt-1') });
            const wrapper = mountReview(reactive({ ...makeReceipt(), hasOriginal: true }));

            // #when
            await wrapper.find('.view-original-btn').trigger('click');
            await flushPromises();

            // #then
            expect(getOriginal).toHaveBeenCalledWith('receipt-1');
            expect(window.open).toHaveBeenCalledWith('blob:receipt-1', '_blank');
        });
    });
});
