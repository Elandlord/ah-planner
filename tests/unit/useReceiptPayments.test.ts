import { describe, expect, it } from 'vitest';
import { breakdownPayments, isOwnMoney, paymentLabel } from '~/composables/useReceiptPayments';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptPaymentInterface from '~/types/ReceiptPaymentInterface';

function receipt(
    total: number,
    payments?: ReceiptPaymentInterface[],
    discountTotal?: number,
): ReceiptInterface {
    return {
        id: `ah-${total}`,
        date: '2026-08-07T10:09:00.000Z',
        items: [{ name: 'AH BANANEN', price: 1.49, quantity: 1, category: ProductCategoryEnum.fruit }],
        total,
        storeName: 'Albert Heijn',
        payments,
        discountTotal,
    };
}

describe('isOwnMoney', () => {
    it('counts a card payment as own money', () => {
        expect(isOwnMoney('PINNEN')).toBe(true);
    });

    it('does not count koopzegels as own money', () => {
        expect(isOwnMoney('KOOPZEGELS')).toBe(false);
    });

    it('does not count emballage as own money', () => {
        expect(isOwnMoney('EMBALLAGE')).toBe(false);
    });
});

describe('paymentLabel', () => {
    it('uses a Dutch label for a known method', () => {
        expect(paymentLabel('KOOPZEGELS')).toBe('Koopzegels');
    });

    it('title-cases an unknown method', () => {
        expect(paymentLabel('SPAARKAART')).toBe('Spaarkaart');
    });
});

describe('breakdownPayments', () => {
    it('splits a receipt paid partly with koopzegels', () => {
        const result = breakdownPayments([
            receipt(69.81, [
                { method: 'KOOPZEGELS', amount: 52 },
                { method: 'PINNEN', amount: 17.81 },
            ]),
        ]);
        expect(result.paidWithOwnMoney).toBeCloseTo(17.81);
        expect(result.paidWithSavings).toBeCloseTo(52);
        expect(result.savingsByMethod).toEqual({ Koopzegels: 52 });
    });

    it('keeps emballage separate from koopzegels', () => {
        const result = breakdownPayments([
            receipt(90.99, [
                { method: 'KOOPZEGELS', amount: 52 },
                { method: 'EMBALLAGE', amount: 3 },
                { method: 'PINNEN', amount: 35.99 },
            ]),
        ]);
        expect(result.savingsByMethod).toEqual({ Koopzegels: 52, Emballage: 3 });
    });

    it('treats a receipt without payment data as fully self paid', () => {
        const result = breakdownPayments([receipt(43.36)]);
        expect(result.paidWithOwnMoney).toBeCloseTo(43.36);
        expect(result.paidWithSavings).toBe(0);
    });

    it('sums the bonus discount as a positive amount', () => {
        const result = breakdownPayments([receipt(69.81, undefined, -13.06)]);
        expect(result.discountTotal).toBeCloseTo(13.06);
    });
});
