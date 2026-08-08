import { describe, expect, it, vi } from 'vitest';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';

vi.mock('~/stores/receiptStore', () => ({ useReceiptStore: vi.fn() }));

const {
    buildPatterns,
    isAbandoned,
    median,
    overdueRatio,
    patternScore,
    visitWeight,
} = await import('~/composables/useSuggestions');

const NOW = new Date('2026-08-08T12:00:00Z').getTime();
const MS_PER_DAY = 86_400_000;

function daysAgo(days: number): string {
    return new Date(NOW - days * MS_PER_DAY).toISOString();
}

function receipt(id: string, days: number, names: string[], total?: number): ReceiptInterface {
    return {
        id,
        date: daysAgo(days),
        items: names.map((name) => ({ name, price: 1, quantity: 1, category: ProductCategoryEnum.overig })),
        total: total ?? names.length,
        storeName: 'Albert Heijn',
    };
}

describe('median', () => {
    it('returns the middle value for an odd count', () => {
        expect(median([5, 1, 3])).toBe(3);
    });

    it('averages the two middle values for an even count', () => {
        expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it('returns zero for no values', () => {
        expect(median([])).toBe(0);
    });
});

describe('overdueRatio', () => {
    it('reaches 1 when the next purchase falls inside the lookahead window', () => {
        expect(overdueRatio(0, 7)).toBe(1);
    });

    it('marks a weekly staple bought yesterday as due for the coming week', () => {
        expect(overdueRatio(1, 7)).toBeGreaterThan(1);
    });

    it('stays below 1 for an item with a cycle longer than the week ahead', () => {
        expect(overdueRatio(1, 28)).toBeLessThan(1);
    });

    it('caps a long-forgotten item so it cannot dominate the ranking', () => {
        expect(overdueRatio(154, 2)).toBe(1.5);
    });
});

describe('patternScore', () => {
    it('ranks a frequent staple above a rare item at the same ratio', () => {
        expect(patternScore(1, 136)).toBeGreaterThan(patternScore(1, 3));
    });

    it('ranks a recently bought staple above a capped rare item', () => {
        expect(patternScore(1.18, 24)).toBeGreaterThan(patternScore(1.5, 5));
    });
});

describe('visitWeight', () => {
    it('gives a median basket a weight of one', () => {
        expect(visitWeight(50, 50)).toBe(1);
    });

    it('counts a small top-up shop for less', () => {
        expect(visitWeight(6, 50)).toBeCloseTo(0.25);
    });

    it('caps a single huge shop so it cannot stand in for a habit', () => {
        expect(visitWeight(500, 50)).toBe(2);
    });

    it('falls back to one when there is no median basket yet', () => {
        expect(visitWeight(20, 0)).toBe(1);
    });
});

describe('isAbandoned', () => {
    it('drops a rare item untouched for many intervals', () => {
        expect(isAbandoned(154, 2, 3)).toBe(true);
    });

    it('keeps a staple even when it is late', () => {
        expect(isAbandoned(30, 2, 136)).toBe(false);
    });

    it('keeps a rare item that is only slightly late', () => {
        expect(isAbandoned(10, 7, 3)).toBe(false);
    });
});

describe('buildPatterns', () => {
    it('ignores items bought fewer than three times', () => {
        const receipts = [
            receipt('a', 10, ['AH MACADAMIA']),
            receipt('b', 8, ['AH MACADAMIA']),
        ];
        expect(buildPatterns(receipts, NOW)).toHaveLength(0);
    });

    it('ranks a frequent staple above a stale rare item', () => {
        const receipts = [
            receipt('r1', 1, ['AH MELK LV']),
            receipt('r2', 3, ['AH MELK LV']),
            receipt('r3', 5, ['AH MELK LV']),
            receipt('r4', 7, ['AH MELK LV', 'PLEDGE CLEAN']),
            receipt('r5', 40, ['PLEDGE CLEAN']),
            receipt('r6', 42, ['PLEDGE CLEAN']),
        ];
        const patterns = buildPatterns(receipts, NOW);
        expect(patterns[0].name).toBe('AH MELK LV');
    });

    it('counts one purchase per shopping day, not per receipt line', () => {
        const receipts = [
            receipt('r1', 2, ['AH BANANEN', 'AH BANANEN']),
            receipt('r2', 4, ['AH BANANEN']),
            receipt('r3', 6, ['AH BANANEN']),
        ];
        expect(buildPatterns(receipts, NOW)[0].timesBought).toBe(3);
    });

    it('ranks an item from big shops above one bought only on top-ups', () => {
        const receipts = [
            receipt('big1', 2, ['AH MELK LV'], 70),
            receipt('big2', 9, ['AH MELK LV'], 70),
            receipt('big3', 16, ['AH MELK LV'], 70),
            receipt('top1', 3, ['SMINT'], 5),
            receipt('top2', 10, ['SMINT'], 5),
            receipt('top3', 17, ['SMINT'], 5),
        ];
        const patterns = buildPatterns(receipts, NOW);
        expect(patterns[0].name).toBe('AH MELK LV');
        expect(patterns[0].weightedTimesBought).toBeGreaterThan(patterns[1].weightedTimesBought);
    });

    it('reports a readable interval for a staple bought every two days', () => {
        const receipts = [0, 2, 4, 6, 8].map((days, index) =>
            receipt(`r${index}`, days, ['AH MELK LV']));
        const [pattern] = buildPatterns(receipts, NOW);
        expect(pattern.medianIntervalDays).toBe(2);
        expect(pattern.daysSinceLast).toBe(0);
    });
});
