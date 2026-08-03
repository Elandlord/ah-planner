import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import IndexPage from '~/pages/index.vue';
import ReceiptDropZone from '~/components/ReceiptDropZone.vue';

const RECEIPT_TEXT = ['Albert Heijn', 'MELK 1,29', 'BROOD 2,19', 'TOTAAL 3,48'].join('\n');

const ReceiptReviewStub = {
    name: 'ReceiptReview',
    props: ['modelValue'],
    template: '<div class="receipt-review-stub" />',
};

function mountPage() {
    return mount(IndexPage, {
        global: {
            components: {
                ReceiptDropZone,
                ReceiptReview: ReceiptReviewStub,
            },
        },
    });
}

describe('pages/index.vue', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    describe('upload state', () => {
        it('renders the drop zone and no receipt review initially', () => {
            // #given
            const wrapper = mountPage();

            // #then
            expect(wrapper.findComponent(ReceiptDropZone).exists()).toBe(true);
            expect(wrapper.find('.receipt-review-stub').exists()).toBe(false);
        });
    });

    describe('manual entry', () => {
        it('shows and hides the textarea when the toggle is clicked', async () => {
            // #given
            const wrapper = mountPage();

            // #then
            expect(wrapper.find('.manual-textarea').exists()).toBe(false);

            // #when
            await wrapper.find('.toggle-manual').trigger('click');

            // #then
            expect(wrapper.find('.manual-textarea').exists()).toBe(true);

            // #when
            await wrapper.find('.toggle-manual').trigger('click');

            // #then
            expect(wrapper.find('.manual-textarea').exists()).toBe(false);
        });
    });

    describe('manual processing', () => {
        it('replaces the upload state with the receipt review after processing text', async () => {
            // #given
            const wrapper = mountPage();
            await wrapper.find('.toggle-manual').trigger('click');
            await wrapper.find('.manual-textarea').setValue(RECEIPT_TEXT);

            // #when
            await wrapper.find('.process-btn').trigger('click');

            // #then
            expect(wrapper.find('.receipt-review-stub').exists()).toBe(true);
            expect(wrapper.findComponent(ReceiptDropZone).exists()).toBe(false);
        });
    });
});
