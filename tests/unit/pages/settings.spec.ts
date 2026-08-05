import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingsPage from '~/pages/settings.vue';

const { exportBackupMock, importBackupMock } = vi.hoisted(() => ({
    exportBackupMock: vi.fn(),
    importBackupMock: vi.fn(),
}));

vi.mock('~/composables/useDataBackup', () => ({
    useDataBackup: () => ({ exportBackup: exportBackupMock, importBackup: importBackupMock }),
}));

function makeFile(content: string): File {
    return new File([content], 'backup.json', { type: 'application/json' });
}

async function selectFile(wrapper: ReturnType<typeof mount>, file: File): Promise<void> {
    const input = wrapper.find('.hidden-input').element as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await wrapper.find('.hidden-input').trigger('change');
    await vi.waitFor(() => {
        if (wrapper.find('.status-message').text() === '') {
            throw new Error('waiting for the file to finish reading');
        }
    });
}

describe('pages/settings.vue', () => {
    beforeEach(() => {
        exportBackupMock.mockReset();
        importBackupMock.mockReset();
    });

    describe('export', () => {
        it('calls exportBackup and shows a success message', async () => {
            // #given
            const wrapper = mount(SettingsPage);

            // #when
            await wrapper.find('.action-btn').trigger('click');

            // #then
            expect(exportBackupMock).toHaveBeenCalledTimes(1);
            expect(wrapper.find('.status-message').text()).toBe('Back-up gedownload.');
            expect(wrapper.find('.status-message').classes()).not.toContain('status-error');
        });
    });

    describe('import', () => {
        it('opens the file picker when the import button is clicked', async () => {
            // #given
            const wrapper = mount(SettingsPage);
            const input = wrapper.find('.hidden-input').element as HTMLInputElement;
            const clickSpy = vi.spyOn(input, 'click');

            // #when
            await wrapper.find('.action-btn-secondary').trigger('click');

            // #then
            expect(clickSpy).toHaveBeenCalledTimes(1);
        });

        it('restores the backup and shows a success message when the file is valid', async () => {
            // #given
            const wrapper = mount(SettingsPage);

            // #when
            await selectFile(wrapper, makeFile('{"version":1}'));

            // #then
            expect(importBackupMock).toHaveBeenCalledWith('{"version":1}');
            expect(wrapper.find('.status-message').text()).toBe('Back-up hersteld.');
            expect(wrapper.find('.status-message').classes()).not.toContain('status-error');
        });

        it('shows the error message when restoring the backup fails', async () => {
            // #given
            importBackupMock.mockImplementation(() => {
                throw new Error('Ongeldig back-upbestand: geen geldige JSON.');
            });
            const wrapper = mount(SettingsPage);

            // #when
            await selectFile(wrapper, makeFile('not json'));

            // #then
            expect(wrapper.find('.status-message').text()).toBe(
                'Ongeldig back-upbestand: geen geldige JSON.',
            );
            expect(wrapper.find('.status-message').classes()).toContain('status-error');
        });

        it('resets the input value right after reading starts', async () => {
            // #given
            const wrapper = mount(SettingsPage);
            const input = wrapper.find('.hidden-input').element as HTMLInputElement;
            Object.defineProperty(input, 'files', { value: [makeFile('{"version":1}')], configurable: true });

            // #when
            await wrapper.find('.hidden-input').trigger('change');

            // #then
            expect(input.value).toBe('');
        });

        it('does nothing when no file is selected', async () => {
            // #given
            const wrapper = mount(SettingsPage);
            const input = wrapper.find('.hidden-input').element as HTMLInputElement;
            Object.defineProperty(input, 'files', { value: [], configurable: true });

            // #when
            await wrapper.find('.hidden-input').trigger('change');

            // #then
            expect(importBackupMock).not.toHaveBeenCalled();
        });
    });
});
