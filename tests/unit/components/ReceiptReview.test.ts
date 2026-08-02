import { describe, it, expect, vi } from 'vitest';
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import ReceiptReview from '~/components/ReceiptReview.vue';
import ReceiptItemRow from '~/components/ReceiptItemRow.vue';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

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
        id: 'b1',
        date: '2026-01-15',
        items: [makeItem(), makeItem({ name: 'Bananen', price: 2, quantity: 3 })],
        total: 7.29,
        storeName: 'Albert Heijn',
        ...overrides,
    };
}

function mountReview(receipt: ReceiptInterface, listeners: Record<string, () => void> = {}) {
    return mount(ReceiptReview, {
        props: { modelValue: receipt, ...listeners },
        global: { components: { ReceiptItemRow } },
    });
}

describe('ReceiptReview', () => {
    describe('add item', () => {
        it('appends a new empty item when the add button is clicked', async () => {
            // #given
            const receipt = reactive(makeReceipt());
            const wrapper = mountReview(receipt);

            // #when
            await wrapper.find('.add-item-btn').trigger('click');

            // #then
            expect(receipt.items[2]).toEqual({
                name: '',
                price: 0,
                quantity: 1,
                category: ProductCategoryEnum.overig,
            });
        });

        it('renders a row for every item after adding one', async () => {
            // #given
            const receipt = reactive(makeReceipt());
            const wrapper = mountReview(receipt);

            // #when
            await wrapper.find('.add-item-btn').trigger('click');

            // #then
            expect(wrapper.findAllComponents(ReceiptItemRow)).toHaveLength(3);
        });
    });

    describe('remove item', () => {
        it('removes the item at the index of the row that emitted remove', async () => {
            // #given
            const receipt = reactive(makeReceipt());
            const wrapper = mountReview(receipt);

            // #when
            await wrapper.findAllComponents(ReceiptItemRow)[0].vm.$emit('remove');

            // #then
            expect(receipt.items.map((item) => item.name)).toEqual(['Bananen']);
        });
    });

    describe('total', () => {
        it('displays the sum of price times quantity across all items', () => {
            // #given
            const wrapper = mountReview(reactive(makeReceipt()));

            // #then
            expect(wrapper.find('.total-display').text()).toBe('Totaal: €7.29');
        });

        it('displays a zero total when there are no items', () => {
            // #given
            const wrapper = mountReview(reactive(makeReceipt({ items: [] })));

            // #then
            expect(wrapper.find('.total-display').text()).toBe('Totaal: €0.00');
        });
    });

    describe('actions', () => {
        it('emits save when the save button is clicked', async () => {
            // #given
            const onSave = vi.fn();
            const wrapper = mountReview(reactive(makeReceipt()), { onSave });

            // #when
            await wrapper.find('.btn-save').trigger('click');

            // #then
            expect(onSave).toHaveBeenCalledTimes(1);
        });

        it('emits cancel when the cancel button is clicked', async () => {
            // #given
            const onCancel = vi.fn();
            const wrapper = mountReview(reactive(makeReceipt()), { onCancel });

            // #when
            await wrapper.find('.btn-cancel').trigger('click');

            // #then
            expect(onCancel).toHaveBeenCalledTimes(1);
        });
    });
});
