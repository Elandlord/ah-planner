import type KoopzegelReturnInterface from '~/types/KoopzegelReturnInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';

const METHOD = 'KOOPZEGELS';
const BOOK_PAYOUT = 52;
const ZEGELS_PER_BOOK = 500;
const ZEGEL_PRICE = 0.1;

export const koopzegelBookCost = ZEGELS_PER_BOOK * ZEGEL_PRICE;

export function redeemedKoopzegels(receipts: ReceiptInterface[]): number {
    return receipts
        .flatMap((receipt) => receipt.payments ?? [])
        .filter((payment) => payment.method.toUpperCase() === METHOD)
        .reduce((sum, payment) => sum + payment.amount, 0);
}

/**
 * Buying zegels never appears as its own receipt line, so the money put in is derived
 * from the number of full books redeemed rather than measured.
 */
export function koopzegelReturn(receipts: ReceiptInterface[]): KoopzegelReturnInterface {
    const redeemed = redeemedKoopzegels(receipts);
    const books = redeemed / BOOK_PAYOUT;
    const invested = books * koopzegelBookCost;
    const gain = redeemed - invested;

    return {
        books,
        redeemed,
        invested,
        gain,
        returnPercentage: invested === 0 ? 0 : (gain / invested) * 100,
    };
}

export function useKoopzegels() {
    return { koopzegelReturn, redeemedKoopzegels, koopzegelBookCost };
}
