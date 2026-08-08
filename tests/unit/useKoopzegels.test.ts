import { describe, expect, it } from 'vitest';
import { koopzegelReturn, redeemedKoopzegels } from '~/composables/useKoopzegels';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptPaymentInterface from '~/types/ReceiptPaymentInterface';

function receipt(id: string, total: number, payments?: ReceiptPaymentInterface[]): ReceiptInterface {
    return {
        id,
        date: '2026-08-07T10:09:00.000Z',
        items: [{ name: 'AH BANANEN', price: 1.49, quantity: 1, category: ProductCategoryEnum.fruit }],
        total,
        storeName: 'Albert Heijn',
        payments,
    };
}

describe('redeemedKoopzegels', () => {
    it('adds up every koopzegel payment', () => {
        const total = redeemedKoopzegels([
            receipt('a', 69.81, [{ method: 'KOOPZEGELS', amount: 52 }, { method: 'PINNEN', amount: 17.81 }]),
            receipt('b', 90.99, [{ method: 'KOOPZEGELS', amount: 52 }, { method: 'PINNEN', amount: 38.99 }]),
        ]);
        expect(total).toBeCloseTo(104);
    });

    it('ignores emballage', () => {
        expect(redeemedKoopzegels([receipt('a', 10, [{ method: 'EMBALLAGE', amount: 3 }])])).toBe(0);
    });
});

describe('koopzegelReturn', () => {
    it('turns a redeemed book into its cost and gain', () => {
        const result = koopzegelReturn([receipt('a', 69.81, [{ method: 'KOOPZEGELS', amount: 52 }])]);
        expect(result.books).toBeCloseTo(1);
        expect(result.invested).toBeCloseTo(49);
        expect(result.gain).toBeCloseTo(3);
        expect(result.returnPercentage).toBeCloseTo(6.12, 1);
    });

    it('scales over many books', () => {
        const receipts = Array.from({ length: 20 }, (unused, index) =>
            receipt(`r${index}`, 69.81, [{ method: 'KOOPZEGELS', amount: 52 }]));
        const result = koopzegelReturn(receipts);
        expect(result.redeemed).toBeCloseTo(1040);
        expect(result.invested).toBeCloseTo(980);
        expect(result.gain).toBeCloseTo(60);
    });

    it('stays at zero without koopzegels', () => {
        const result = koopzegelReturn([receipt('a', 20, [{ method: 'PINNEN', amount: 20 }])]);
        expect(result).toEqual({ books: 0, redeemed: 0, invested: 0, gain: 0, returnPercentage: 0 });
    });
});
