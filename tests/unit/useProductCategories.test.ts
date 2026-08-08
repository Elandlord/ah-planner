import { describe, expect, it } from 'vitest';
import { categorizeProduct, keywordMatchesToken, tokenize } from '~/composables/useProductCategories';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

describe('tokenize', () => {
    it('splits a receipt line into lowercase words', () => {
        expect(tokenize('AH Vloerbrood volkoren heel')).toEqual(['ah', 'vloerbrood', 'volkoren', 'heel']);
    });

    it('keeps a plus sign so cheese grades survive', () => {
        expect(tokenize('DZH MILD 45+')).toEqual(['dzh', 'mild', '45+']);
    });
});

describe('keywordMatchesToken', () => {
    it('requires a whole word for short keywords', () => {
        expect(keywordMatchesToken('ui', 'fruitsap')).toBe(false);
        expect(keywordMatchesToken('ui', 'ui')).toBe(true);
    });

    it('matches a truncated receipt word against a longer keyword', () => {
        expect(keywordMatchesToken('tagliatelle', 'tagliate')).toBe(true);
    });

    it('matches a keyword inside a compound word', () => {
        expect(keywordMatchesToken('groente', 'ovengroente')).toBe(true);
    });
});

describe('categorizeProduct', () => {
    it.each([
        ['AH FRUITSAP', ProductCategoryEnum.dranken],
        ['AH MELK LV', ProductCategoryEnum.zuivel],
        ['DZH YOGHURT', ProductCategoryEnum.zuivel],
        ['VLOER VOLK', ProductCategoryEnum.brood],
        ['BL BESSEN', ProductCategoryEnum.fruit],
        ['MAGNUM IJS', ProductCategoryEnum.diepvries],
        ['BIO TAGLIATE', ProductCategoryEnum.pasta],
        ['AH ALU PATE', ProductCategoryEnum.vlees],
        ['ANDRELON', ProductCategoryEnum.huishouden],
        ['PUREERSOEP', ProductCategoryEnum.conserven],
    ])('files %s under %s', (name, expected) => {
        expect(categorizeProduct(name)).toBe(expected);
    });

    it('falls back to overig for an unknown brand', () => {
        expect(categorizeProduct('PLAID ORGANI')).toBe(ProductCategoryEnum.overig);
    });
});
