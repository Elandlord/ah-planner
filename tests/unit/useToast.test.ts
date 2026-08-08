import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearToasts, dismissToast, pushToast, useToast } from '~/composables/useToast';

describe('useToast', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        clearToasts();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows a success toast', () => {
        pushToast('50 bonnen bijgewerkt.', 'success');
        const { toasts } = useToast();
        expect(toasts.value).toHaveLength(1);
        expect(toasts.value[0].tone).toBe('success');
    });

    it('drops a toast after its lifetime', () => {
        pushToast('klaar', 'success');
        const { toasts } = useToast();
        vi.advanceTimersByTime(5000);
        expect(toasts.value).toHaveLength(0);
    });

    it('keeps only the most recent toasts', () => {
        const { toasts } = useToast();
        ['a', 'b', 'c', 'd', 'e'].forEach((message) => pushToast(message));
        expect(toasts.value).toHaveLength(4);
        expect(toasts.value[0].message).toBe('b');
    });

    it('dismisses a toast on demand', () => {
        const id = pushToast('weg hiermee');
        const { toasts } = useToast();
        dismissToast(id);
        expect(toasts.value).toHaveLength(0);
    });

    it('gives every toast its own id', () => {
        const first = pushToast('een');
        const second = pushToast('twee');
        expect(second).not.toBe(first);
    });
});
