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

const AH_PDF_RECEIPT = `8549
AANTAL   OMSCHRIJVING   PRIJS   BEDRAG
BONUSKAART   xx1430
AIRMILES NR. *   xx6101
1   AH BANANEN   1,42
2   ROERBAKGR   2,99   5,98 B
2   VALESS FILET   3,69   7,38 B
2   AH OVEN AARD   2,39   4,78 B
1   AH KIPFILET   2,99
2   AH ZUIVELSPR   1,39   2,78
2   ROND VOLK   1,89   3,78 B
6   AH MELK LV   1,39   8,34
2   QUAK CRUESLI   3,99   7,98 B
2   AH ALU PATE   0,29   0,58
2   AH ALU PATE   0,29   0,58
1   AH AARDBEIEN   4,65
1   AH HAVERMOUT   1,45
2   ALPRO KWARK   2,49   4,98 B
1   DZH YOGHURT   2,15
29   SUBTOTAAL   59,82
BONUS   MEX&HOLRBK40   -2,99
BONUS   ALLEAHAARDAP   -0,79
BONUS   ALLEVALESS*   -2,39
BONUS   ALLEALPROGEK   -2,49
BONUS   AHRONDHEEL   -1,80
BONUS   QUAKERCRUESL   -1,99
UW VOORDEEL   12,45
Waarvan
BONUS BOX PREMIUM   0,00
SUBTOTAAL   47,37
94   KOOPZEGELS PREMIUM   9,40
TOTAAL   56,77
SPAARACTIES:
8   eSPAARZEGELS PREMIUM
36   MIJN AH MILES PREMIUM
BETAALD MET:
PINNEN   56,77`;

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

describe('parseReceiptText - AH PDF format', () => {
    it('parses single-quantity items', () => {
        const items = parseReceiptText(AH_PDF_RECEIPT);
        const bananen = items.find((i) => i.name === 'AH BANANEN');

        expect(bananen).toBeDefined();
        expect(bananen?.quantity).toBe(1);
        expect(bananen?.price).toBe(1.42);
    });

    it('parses multi-quantity items with unit price', () => {
        const items = parseReceiptText(AH_PDF_RECEIPT);
        const roerbak = items.find((i) => i.name === 'ROERBAKGR');

        expect(roerbak).toBeDefined();
        expect(roerbak?.quantity).toBe(2);
        expect(roerbak?.price).toBe(2.99);
    });

    it('parses all product lines', () => {
        const items = parseReceiptText(AH_PDF_RECEIPT);

        expect(items.length).toBe(15);
    });

    it('ignores BONUS discount lines', () => {
        const items = parseReceiptText(AH_PDF_RECEIPT);
        const names = items.map((i) => i.name.toLowerCase());

        expect(names.some((n) => n.includes('bonus'))).toBe(false);
    });

    it('ignores header/metadata lines', () => {
        const items = parseReceiptText(AH_PDF_RECEIPT);
        const names = items.map((i) => i.name.toLowerCase());

        expect(names.some((n) => n.includes('bonuskaart'))).toBe(false);
        expect(names.some((n) => n.includes('airmiles'))).toBe(false);
        expect(names.some((n) => n.includes('koopzegels'))).toBe(false);
        expect(names.some((n) => n.includes('subtotaal'))).toBe(false);
    });

    it('ignores footer lines', () => {
        const items = parseReceiptText(AH_PDF_RECEIPT);
        const names = items.map((i) => i.name.toLowerCase());

        expect(names.some((n) => n.includes('pinnen'))).toBe(false);
        expect(names.some((n) => n.includes('spaaracties'))).toBe(false);
    });

    it('categorizes AH products correctly', () => {
        const items = parseReceiptText(AH_PDF_RECEIPT);

        const bananen = items.find((i) => i.name === 'AH BANANEN');
        expect(bananen?.category).toBe(ProductCategoryEnum.fruit);

        const melk = items.find((i) => i.name === 'AH MELK LV');
        expect(melk?.category).toBe(ProductCategoryEnum.zuivel);

        const kipfilet = items.find((i) => i.name === 'AH KIPFILET');
        expect(kipfilet?.category).toBe(ProductCategoryEnum.vlees);
    });

    it('parses statiegeld lines', () => {
        const text = `1   RIVELLA   0,89 K
+STATIEGELD   0,15`;
        const items = parseReceiptText(text);
        const statiegeld = items.find((i) => i.name === 'Statiegeld');

        expect(statiegeld).toBeDefined();
        expect(statiegeld?.price).toBe(0.15);
    });
});

describe('extractTotal', () => {
    it('extracts subtotaal from receipt', () => {
        const total = extractTotal(SAMPLE_RECEIPT);
        expect(total).toBe(14.19);
    });

    it('extracts first subtotaal from AH PDF receipt', () => {
        const total = extractTotal(AH_PDF_RECEIPT);
        expect(total).toBe(59.82);
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

    it('handles single-digit day and month', () => {
        const date = extractDate('17:22   7-2-2026');
        expect(date).toBe('2026-02-07');
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

    it('builds a complete receipt from AH PDF format', () => {
        const receipt = buildReceipt(AH_PDF_RECEIPT);

        expect(receipt.id).toBeTruthy();
        expect(receipt.storeName).toBe('Albert Heijn');
        expect(receipt.items.length).toBe(15);
        expect(receipt.total).toBe(59.82);
    });

    it('calculates total from items when not found in text', () => {
        const text = `Melk  1.29
Brood  2.49`;
        const receipt = buildReceipt(text);

        expect(receipt.total).toBeCloseTo(3.78);
    });
});
