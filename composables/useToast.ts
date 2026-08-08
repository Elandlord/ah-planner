import { ref } from 'vue';
import type ToastInterface from '~/types/ToastInterface';
import type { ToastTone } from '~/types/ToastInterface';

const DISMISS_AFTER_MS = 5000;
const MAX_VISIBLE = 4;

const toasts = ref<ToastInterface[]>([]);
let nextId = 0;

export function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

export function pushToast(message: string, tone: ToastTone = 'info'): number {
    nextId += 1;
    const toast: ToastInterface = { id: nextId, message, tone };
    toasts.value = [...toasts.value, toast].slice(-MAX_VISIBLE);
    setTimeout(() => dismissToast(toast.id), DISMISS_AFTER_MS);
    return toast.id;
}

export function clearToasts(): void {
    toasts.value = [];
}

export function useToast() {
    return {
        toasts,
        success: (message: string) => pushToast(message, 'success'),
        error: (message: string) => pushToast(message, 'error'),
        info: (message: string) => pushToast(message, 'info'),
        dismiss: dismissToast,
    };
}
