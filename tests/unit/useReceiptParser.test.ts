import { describe, it, expect } from 'vitest';
import {
    parseReceiptText,
    extractTotal,
    extractDate,
    buildReceipt,
} from '~/composables/useReceiptParser';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const SAMPLE_RECEIPT = `Albert Heijn
Winkelcentrum
Datum: 15-01-2026

AH Halfvolle melk   1.29
AH Boerenkool       1.49
Kipfilet             5.99
2 x Bananen         2.38
AH Spaghetti        0.89
Geraspte kaas        2.15

SUBTOTAAL           14.19
PIN                 14.19`;

describe('parseReceiptText', () => {
    it('parses standard price lines', () => {
        const items = parseReceiptText(SAMPLE_RECEIPT);

        expect(items.length).toBe(6);
        expect(items[0]).toEqual({
            name: 'AH Halfvolle melk',
            price: 1.29,
            quantity: 1,
            category: ProductCategoryEnum.zuivel,
        });
    });

    it('parses quantity prefix lines', () => {
        const items = parseReceiptText(SAMPLE_RECEIPT);
        const bananen = items.find((i) => i.name.includes('Bananen'));

        expect(bananen).toBeDefined();
        expect(bananen?.quantity).toBe(2);
        expect(bananen?.price).toBe(2.38);
    });

    it('categorizes products correctly', () => {
        const items = parseReceiptText(SAMPLE_RECEIPT);

        const boerenkool = items.find((i) => i.name.includes('Boerenkool'));
        expect(boerenkool?.category).toBe(ProductCategoryEnum.groente);

        const kipfilet = items.find((i) => i.name.includes('Kipfilet'));
        expect(kipfilet?.category).toBe(ProductCategoryEnum.vlees);

        const spaghetti = items.find((i) => i.name.includes('Spaghetti'));
        expect(spaghetti?.category).toBe(ProductCategoryEnum.pasta);

        const kaas = items.find((i) => i.name.includes('kaas'));
        expect(kaas?.category).toBe(ProductCategoryEnum.zuivel);
    });

    it('ignores header and footer lines', () => {
        const items = parseReceiptText(SAMPLE_RECEIPT);
        const names = items.map((i) => i.name.toLowerCase());

        expect(names.some((n) => n.includes('albert'))).toBe(false);
        expect(names.some((n) => n.includes('subtotaal'))).toBe(false);
        expect(names.some((n) => n.includes('pin'))).toBe(false);
    });

    it('handles comma decimal separator', () => {
        const text = 'AH Brood  2,49';
        const items = parseReceiptText(text);

        expect(items[0].price).toBe(2.49);
    });

    it('returns empty array for empty text', () => {
        const items = parseReceiptText('');
        expect(items).toEqual([]);
    });
});

describe('extractTotal', () => {
    it('extracts subtotaal from receipt', () => {
        const total = extractTotal(SAMPLE_RECEIPT);
        expect(total).toBe(14.19);
    });

    it('returns 0 when no total found', () => {
        const total = extractTotal('some random text');
        expect(total).toBe(0);
    });

    it('handles comma decimal', () => {
        const total = extractTotal('TOTAAL  25,50');
        expect(total).toBe(25.50);
    });
});

describe('extractDate', () => {
    it('extracts date from receipt', () => {
        const date = extractDate(SAMPLE_RECEIPT);
        expect(date).toBe('2026-01-15');
    });

    it('handles dash-separated dates', () => {
        const date = extractDate('Datum: 05-12-2025');
        expect(date).toBe('2025-12-05');
    });

    it('handles two-digit year', () => {
        const date = extractDate('03/02/26');
        expect(date).toBe('2026-02-03');
    });

    it('returns today if no date found', () => {
        const date = extractDate('no date here');
        const today = new Date().toISOString().split('T')[0];
        expect(date).toBe(today);
    });
});

describe('buildReceipt', () => {
    it('builds a complete receipt object', () => {
        const receipt = buildReceipt(SAMPLE_RECEIPT);

        expect(receipt.id).toBeTruthy();
        expect(receipt.storeName).toBe('Albert Heijn');
        expect(receipt.date).toBe('2026-01-15');
        expect(receipt.items.length).toBe(6);
        expect(receipt.total).toBe(14.19);
    });

    it('calculates total from items when not found in text', () => {
        const text = `Melk  1.29
Brood  2.49`;
        const receipt = buildReceipt(text);

        expect(receipt.total).toBeCloseTo(3.78);
    });
});
