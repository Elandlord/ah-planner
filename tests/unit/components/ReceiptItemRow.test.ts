import { describe, it, expect } from 'vitest';
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import ReceiptItemRow from '~/components/ReceiptItemRow.vue';
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

function mountItemRow(item: ReceiptItemInterface) {
    return mount(ReceiptItemRow, {
        props: { modelValue: item },
    });
}

describe('ReceiptItemRow', () => {
    describe('category options', () => {
        it('renders an option for every ProductCategoryEnum value', () => {
            // #given
            const wrapper = mountItemRow(makeItem());

            // #when
            const optionValues = wrapper
                .findAll<HTMLOptionElement>('.item-category option')
                .map((option) => option.element.value);

            // #then
            expect(optionValues).toEqual(Object.values(ProductCategoryEnum));
        });
    });

    describe('remove', () => {
        it('emits remove when the remove button is clicked', async () => {
            // #given
            const wrapper = mountItemRow(makeItem());

            // #when
            await wrapper.find('.item-remove').trigger('click');

            // #then
            expect(wrapper.emitted('remove')).toHaveLength(1);
        });
    });

    describe('category corrections', () => {
        it('emits categoryChange with the picked category when the select changes', async () => {
            // #given
            const item = reactive(makeItem());
            const wrapper = mountItemRow(item);

            // #when
            await wrapper.find('.item-category').setValue(ProductCategoryEnum.groente);

            // #then
            expect(wrapper.emitted('categoryChange')).toEqual([[ProductCategoryEnum.groente]]);
        });

        it('updates the model before emitting categoryChange', async () => {
            // #given
            const item = reactive(makeItem());
            const wrapper = mountItemRow(item);

            // #when
            await wrapper.find('.item-category').setValue(ProductCategoryEnum.groente);

            // #then
            expect(item.category).toBe(ProductCategoryEnum.groente);
        });
    });

    describe('v-model updates', () => {
        it('updates the model when the name input changes', async () => {
            // #given
            const item = reactive(makeItem());
            const wrapper = mountItemRow(item);

            // #when
            await wrapper.find('.item-name').setValue('Bananen');

            // #then
            expect(item.name).toBe('Bananen');
        });

        it('updates the model when the quantity input changes', async () => {
            // #given
            const item = reactive(makeItem());
            const wrapper = mountItemRow(item);

            // #when
            await wrapper.find('.item-quantity').setValue(3);

            // #then
            expect(item.quantity).toBe(3);
        });

        it('updates the model when the price input changes', async () => {
            // #given
            const item = reactive(makeItem());
            const wrapper = mountItemRow(item);

            // #when
            await wrapper.find('.item-price').setValue(2.5);

            // #then
            expect(item.price).toBe(2.5);
        });
    });
});
