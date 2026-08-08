import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import UploadPage from '~/pages/upload.vue';
import ReceiptDropZone from '~/components/ReceiptDropZone.vue';

class FakeFileReader {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    result: string | ArrayBuffer | null = null;

    readAsDataURL(): void {
        // resolved manually in tests by invoking onload/onerror
    }
}

const RECEIPT_TEXT = ['Albert Heijn', 'MELK 1,29', 'BROOD 2,19', 'TOTAAL 3,48'].join('\n');

const ReceiptReviewStub = {
    name: 'ReceiptReview',
    props: ['modelValue'],
    template: '<div class="receipt-review-stub" />',
};

function mountPage() {
    return mount(UploadPage, {
        global: {
            components: {
                ReceiptDropZone,
                ReceiptReview: ReceiptReviewStub,
            },
        },
    });
}

describe('pages/upload.vue', () => {
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

    describe('upload errors', () => {
        const OriginalFileReader = global.FileReader;
        let readerInstance: FakeFileReader | undefined;

        afterEach(() => {
            global.FileReader = OriginalFileReader;
        });

        it('shows an error and advances the queue when a file fails to read', async () => {
            // #given
            global.FileReader = class extends FakeFileReader {
                constructor() {
                    super();
                    readerInstance = this;
                }
            } as unknown as typeof FileReader;

            const wrapper = mountPage();
            const failingFile = new File(['a'], 'receipt1.jpg', { type: 'image/jpeg' });
            const queuedFile = new File(['b'], 'receipt2.jpg', { type: 'image/jpeg' });

            // #when
            await wrapper
                .findComponent(ReceiptDropZone)
                .vm.$emit('filesSelected', [failingFile, queuedFile]);
            await nextTick();
            readerInstance?.onerror?.();
            await nextTick();

            // #then
            expect(wrapper.find('.error-message').text()).toBe('Kon bestand niet lezen.');
            expect(wrapper.find('.queue-indicator').exists()).toBe(false);
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
