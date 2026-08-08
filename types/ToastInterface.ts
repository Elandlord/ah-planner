type ToastTone = 'success' | 'error' | 'info';

interface ToastInterface {
    id: number;
    message: string;
    tone: ToastTone;
}

export type { ToastInterface as default, ToastTone };
