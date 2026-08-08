import type AhSyncedReceiptItemInterface from '~/types/AhSyncedReceiptItemInterface';
import type ReceiptPaymentInterface from '~/types/ReceiptPaymentInterface';

interface AhSyncedReceiptInterface {
    transactionId: string;
    date: string;
    total: number;
    discountTotal: number;
    payments: ReceiptPaymentInterface[];
    items: AhSyncedReceiptItemInterface[];
}

export type { AhSyncedReceiptInterface as default };
