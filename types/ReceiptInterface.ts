import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import type ReceiptPaymentInterface from '~/types/ReceiptPaymentInterface';

interface ReceiptInterface {
    id: string;
    date: string;
    items: ReceiptItemInterface[];
    total: number;
    storeName: string;
    discountTotal?: number;
    payments?: ReceiptPaymentInterface[];
}

export type { ReceiptInterface as default };
