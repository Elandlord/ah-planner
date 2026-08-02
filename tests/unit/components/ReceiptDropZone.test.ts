import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ReceiptDropZone from '~/components/ReceiptDropZone.vue';

function makeFile(name: string, type: string): File {
    return new File(['content'], name, { type });
}

describe('ReceiptDropZone', () => {
    describe('drop', () => {
        it('emits filesSelected only for image and pdf files', async () => {
            // #given
            const wrapper = mount(ReceiptDropZone);
            const image = makeFile('bon.jpg', 'image/jpeg');
            const pdf = makeFile('bon.pdf', 'application/pdf');
            const invalid = makeFile('notes.txt', 'text/plain');

            // #when
            await wrapper.find('.drop-zone').trigger('drop', {
                dataTransfer: { files: [image, pdf, invalid] },
            });

            // #then
            expect(wrapper.emitted('filesSelected')).toEqual([[[image, pdf]]]);
        });

        it('does not emit filesSelected when no files are valid', async () => {
            // #given
            const wrapper = mount(ReceiptDropZone);
            const invalid = makeFile('notes.txt', 'text/plain');

            // #when
            await wrapper.find('.drop-zone').trigger('drop', {
                dataTransfer: { files: [invalid] },
            });

            // #then
            expect(wrapper.emitted('filesSelected')).toBeUndefined();
        });
    });

    describe('drag state', () => {
        it('toggles the drop-zone--active class on dragover and dragleave', async () => {
            // #given
            const wrapper = mount(ReceiptDropZone);
            const dropZone = wrapper.find('.drop-zone');

            // #when
            await dropZone.trigger('dragover');

            // #then
            expect(dropZone.classes()).toContain('drop-zone--active');

            // #when
            await dropZone.trigger('dragleave');

            // #then
            expect(dropZone.classes()).not.toContain('drop-zone--active');
        });
    });

    describe('file input', () => {
        it('emits filesSelected and resets the input value on change', async () => {
            // #given
            const wrapper = mount(ReceiptDropZone);
            const image = makeFile('bon.jpg', 'image/jpeg');
            const input = wrapper.find('.file-input').element as HTMLInputElement;
            Object.defineProperty(input, 'files', { value: [image], configurable: true });
            Object.defineProperty(input, 'value', { value: 'C:\\fakepath\\bon.jpg', writable: true });

            // #when
            await wrapper.find('.file-input').trigger('change');

            // #then
            expect(wrapper.emitted('filesSelected')).toEqual([[[image]]]);
            expect(input.value).toBe('');
        });
    });
});
