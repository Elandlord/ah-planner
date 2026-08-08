import { describe, expect, it } from 'vitest';
import { buildListPatchItems } from '~~/server/utils/ahShoppingList';

describe('buildListPatchItems', () => {
    it('sends strikeThrough, which AH requires to read the request at all', () => {
        const [item] = buildListPatchItems([{ productId: 601075, quantity: 2, name: 'AH Bananen' }]);
        expect(item).toEqual({
            description: 'AH Bananen',
            productId: 601075,
            quantity: 2,
            type: 'SHOPPABLE',
            originCode: 'PRD',
            searchTerm: 'AH Bananen',
            strikeThrough: false,
        });
    });

    it('drops items that never resolved to a product', () => {
        expect(buildListPatchItems([{ productId: 0, quantity: 1, name: 'AH MELK LV' }])).toEqual([]);
    });

    it('drops items with no quantity', () => {
        expect(buildListPatchItems([{ productId: 601075, quantity: 0 }])).toEqual([]);
    });

    it('falls back to the product id when no name is given', () => {
        expect(buildListPatchItems([{ productId: 601075, quantity: 1 }])[0].description)
            .toBe('Product 601075');
    });

    it('falls back when the name is only whitespace', () => {
        expect(buildListPatchItems([{ productId: 601075, quantity: 1, name: '  ' }])[0].description)
            .toBe('Product 601075');
    });

    it('keeps every valid item', () => {
        const items = buildListPatchItems([
            { productId: 1, quantity: 1, name: 'A' },
            { productId: 2, quantity: 3, name: 'B' },
        ]);
        expect(items).toHaveLength(2);
    });
});
