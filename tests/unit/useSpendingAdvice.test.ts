import { describe, expect, it } from 'vitest';
import { adviseOnSpending } from '~/composables/useSpendingAdvice';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';

function receipt(
    id: string,
    lines: [string, number, number][],
    discountTotal = 0,
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
        discountTotal,
    };
}

describe('adviseOnSpending', () => {
    it('ranks the biggest spend first with its share', () => {
        const advice = adviseOnSpending([
            receipt('a', [['AH MELK LV', 1.30, 10], ['AH BANANEN', 1.40, 1]]),
        ]);
        expect(advice.topSpenders[0].name).toBe('AH MELK LV');
        expect(advice.topSpenders[0].share).toBeCloseTo(13 / 14.4);
    });

    it('values the gap between the average and the best price paid', () => {
        const advice = adviseOnSpending([
            receipt('a', [['AH AARDBEIEN', 5, 1]]),
            receipt('b', [['AH AARDBEIEN', 5, 1]]),
            receipt('c', [['AH AARDBEIEN', 2, 1]]),
        ]);
        const [gap] = advice.priceGaps;
        expect(gap.bestPrice).toBe(2);
        expect(gap.averagePrice).toBeCloseTo(4);
        expect(gap.potentialSaving).toBeCloseTo(6);
    });

    it('ignores an item bought too few times to judge', () => {
        const advice = adviseOnSpending([
            receipt('a', [['KAVIAAR', 50, 1]]),
            receipt('b', [['KAVIAAR', 10, 1]]),
        ]);
        expect(advice.priceGaps).toHaveLength(0);
    });

    it('ignores a gap too small to act on', () => {
        const advice = adviseOnSpending([
            receipt('a', [['AH BANANEN', 1.45, 1]]),
            receipt('b', [['AH BANANEN', 1.44, 1]]),
            receipt('c', [['AH BANANEN', 1.43, 1]]),
        ]);
        expect(advice.priceGaps).toHaveLength(0);
    });

    it('reports the share of the till the bonus already took off', () => {
        const advice = adviseOnSpending([receipt('a', [['AH MELK LV', 1.30, 100]], -13)]);
        expect(advice.discountShare).toBeCloseTo(0.1);
    });

    it('stays empty without receipts', () => {
        const advice = adviseOnSpending([]);
        expect(advice.tillTotal).toBe(0);
        expect(advice.topSpenders).toEqual([]);
        expect(advice.discountShare).toBe(0);
    });
});
