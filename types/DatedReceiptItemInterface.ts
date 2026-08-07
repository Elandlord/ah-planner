import type ReceiptItemInterface from '~/types/ReceiptItemInterface';

interface DatedReceiptItemInterface extends ReceiptItemInterface {
    purchaseDate: string;
}

export type { DatedReceiptItemInterface as default };
