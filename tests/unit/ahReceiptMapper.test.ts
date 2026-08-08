import { describe, expect, it } from 'vitest';
import { mapReceiptProducts, toUnitPrice } from '~~/server/utils/ahReceiptMapper';

describe('toUnitPrice', () => {
    it('uses the unit price when AH provides one', () => {
        expect(toUnitPrice({ quantity: 2, price: { amount: 2.99 }, amount: { amount: 5.98 } })).toBe(2.99);
    });

    it('derives the unit price from the line total when price is null', () => {
        expect(toUnitPrice({ quantity: 2, price: null, amount: { amount: 3.98 } })).toBe(1.99);
    });

    it('treats a missing quantity as one', () => {
        expect(toUnitPrice({ amount: { amount: 1.49 } })).toBe(1.49);
    });

    it('returns zero when the receipt line has no amount', () => {
        expect(toUnitPrice({ name: 'EMBALLAGE' })).toBe(0);
    });
});

describe('mapReceiptProducts', () => {
    it('maps a real receipt line to a synced item', () => {
        const items = mapReceiptProducts([
            { id: 805259, name: 'AH SCHNITZEL', quantity: 2, price: { amount: 2.99 }, amount: { amount: 5.98 } },
        ]);
        expect(items).toEqual([{ name: 'AH SCHNITZEL', price: 2.99, quantity: 2 }]);
    });

    it('drops lines without a name', () => {
        const items = mapReceiptProducts([
            { name: '   ', amount: { amount: 1 } },
            { name: null, amount: { amount: 2 } },
            { name: 'AVOCADO', quantity: 1, amount: { amount: 2.99 } },
        ]);
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe('AVOCADO');
    });

    it('trims whitespace around names', () => {
        expect(mapReceiptProducts([{ name: '  AH BANANEN ', amount: { amount: 1.49 } }])[0].name)
            .toBe('AH BANANEN');
    });
});
