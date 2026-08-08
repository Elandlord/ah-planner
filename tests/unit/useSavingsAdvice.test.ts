import { describe, expect, it } from 'vitest';
import { bioSpend, premiumAdvice, storeScenarios } from '~/composables/useSavingsAdvice';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptPaymentInterface from '~/types/ReceiptPaymentInterface';

function receipt(
    id: string,
    lines: [string, number, number][],
    payments?: ReceiptPaymentInterface[],
): ReceiptInterface {
    const items = lines.map(([name, price, quantity]) => ({
        name,
        price,
        quantity,
        category: ProductCategoryEnum.overig,
    }));
    return {
        id,
        date: '2026-08-07T10:09:00.000Z',
        items,
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        storeName: 'Albert Heijn',
        payments,
    };
}

describe('bioSpend', () => {
    it('adds up the organic lines', () => {
        const spend = bioSpend([
            receipt('a', [['AH BIO MELK', 2, 2], ['AH Biologisch ei', 3, 1], ['AH MELK LV', 1.3, 1]]),
        ]);
        expect(spend).toBeCloseTo(7);
    });

    it('does not match bio inside another word', () => {
        expect(bioSpend([receipt('a', [['BIOSCOOPKAART', 10, 1]])])).toBe(0);
    });
});

describe('premiumAdvice', () => {
    it('weighs the bio discount and zegel gain against the fee', () => {
        const advice = premiumAdvice([
            receipt('a', [['AH BIO MELK', 100, 1]], [
                { method: 'KOOPZEGELS', amount: 52 },
                { method: 'PINNEN', amount: 48 },
            ]),
        ]);
        expect(advice.bioBenefit).toBeCloseTo(10);
        expect(advice.zegelGain).toBeCloseTo(3);
        expect(advice.net).toBeCloseTo(1);
    });

    it('spots double stamping when far more is redeemed than one stamp per euro', () => {
        const advice = premiumAdvice([
            receipt('a', [['AH MELK LV', 100, 1]], [
                { method: 'KOOPZEGELS', amount: 52 },
                { method: 'PINNEN', amount: 48 },
            ]),
        ]);
        expect(advice.doubleStampingLikely).toBe(true);
    });

    it('does not claim double stamping on a big till with one small book', () => {
        const advice = premiumAdvice([
            receipt('a', [['AH MELK LV', 2000, 1]], [
                { method: 'KOOPZEGELS', amount: 52 },
                { method: 'PINNEN', amount: 1948 },
            ]),
        ]);
        expect(advice.doubleStampingLikely).toBe(false);
    });
});

describe('storeScenarios', () => {
    it('nets a cheaper basket against the benefits left behind', () => {
        const receipts = [
            receipt('a', [['AH BIO MELK', 100, 1]], [
                { method: 'KOOPZEGELS', amount: 52 },
                { method: 'PINNEN', amount: 948 },
            ]),
        ];
        const [scenario] = storeScenarios(receipts, [0.1]);
        expect(scenario.grossSaving).toBeCloseTo(94.8);
        expect(scenario.lostBenefits).toBeCloseTo(13);
        expect(scenario.net).toBeCloseTo(81.8);
    });

    it('returns one row per scenario', () => {
        expect(storeScenarios([], [0.05, 0.1, 0.15])).toHaveLength(3);
    });
});
