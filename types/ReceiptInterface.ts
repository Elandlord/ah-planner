import type ReceiptItemInterface from '~/types/ReceiptItemInterface';

interface ReceiptInterface {
    id: string;
    date: string;
    items: ReceiptItemInterface[];
    total: number;
    storeName: string;
}

export type { ReceiptInterface as default };
