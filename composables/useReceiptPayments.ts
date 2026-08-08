import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptPaymentInterface from '~/types/ReceiptPaymentInterface';

/** Methods that move real money out of your account. Anything else is saved-up value. */
const OWN_MONEY_METHODS = ['PINNEN', 'CONTANT', 'CREDITCARD', 'IDEAL', 'MAESTRO', 'APPLEPAY'];

const METHOD_LABELS: Record<string, string> = {
    PINNEN: 'Pinnen',
    CONTANT: 'Contant',
    KOOPZEGELS: 'Koopzegels',
    EMBALLAGE: 'Emballage',
    AIRMILES: 'Air Miles',
    CADEAUKAART: 'Cadeaukaart',
    BONUSKAART: 'Bonuskaart',
};

export interface PaymentBreakdown {
    total: number;
    paidWithOwnMoney: number;
    paidWithSavings: number;
    savingsByMethod: Record<string, number>;
    discountTotal: number;
}

export function isOwnMoney(method: string): boolean {
    return OWN_MONEY_METHODS.includes(method.toUpperCase());
}

export function paymentLabel(method: string): string {
    const upper = method.toUpperCase();
    return METHOD_LABELS[upper] ?? upper.charAt(0) + upper.slice(1).toLowerCase();
}

export function breakdownPayments(receipts: ReceiptInterface[]): PaymentBreakdown {
    const breakdown: PaymentBreakdown = {
        total: 0,
        paidWithOwnMoney: 0,
        paidWithSavings: 0,
        savingsByMethod: {},
        discountTotal: 0,
    };

    for (const receipt of receipts) {
        breakdown.total += receipt.total;
        breakdown.discountTotal += Math.abs(receipt.discountTotal ?? 0);

        const payments: ReceiptPaymentInterface[] = receipt.payments ?? [];
        if (payments.length === 0) {
            breakdown.paidWithOwnMoney += receipt.total;
            continue;
        }

        for (const payment of payments) {
            if (isOwnMoney(payment.method)) {
                breakdown.paidWithOwnMoney += payment.amount;
                continue;
            }
            breakdown.paidWithSavings += payment.amount;
            const label = paymentLabel(payment.method);
            breakdown.savingsByMethod[label] = (breakdown.savingsByMethod[label] ?? 0) + payment.amount;
        }
    }

    return breakdown;
}

export function useReceiptPayments() {
    return { breakdownPayments, isOwnMoney, paymentLabel };
}
