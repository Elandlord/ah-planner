import type ReceiptItemInterface from '~/types/ReceiptItemInterface';

interface DatedReceiptItemInterface extends ReceiptItemInterface {
    purchaseDate: string;
    receiptId: string;
    itemIndex: number;
}

export type { DatedReceiptItemInterface as default };
