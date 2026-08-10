import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

vi.mock('~~/server/utils/ahApi', () => ({
    ahFetch: vi.fn(),
    getAnonymousAccessToken: vi.fn(),
    getStoredTokens: vi.fn(),
    getValidAccessToken: vi.fn(),
}));

const { ahFetch, getAnonymousAccessToken, getStoredTokens, getValidAccessToken } =
    await import('~~/server/utils/ahApi');
const { resolveCategories, toCategory } = await import('~~/server/utils/ahCategories');

describe('toCategory', () => {
    it('maps a known mainCategory to its ProductCategoryEnum value', () => {
        expect(toCategory('Vlees')).toBe(ProductCategoryEnum.vlees);
    });

    it('maps a known mainCategory with a comma in the name', () => {
        expect(toCategory('Vegetarisch, vegan en plantaardig')).toBe(ProductCategoryEnum.vega);
    });

    it('returns null for an unknown mainCategory', () => {
        expect(toCategory('Something AH invented last week')).toBeNull();
    });

    it('returns null when no mainCategory is given', () => {
        expect(toCategory(undefined)).toBeNull();
    });
});

describe('resolveCategories', () => {
    let cache: Record<string, string>;
    let getItem: ReturnType<typeof vi.fn>;
    let setItem: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        cache = {};
        getItem = vi.fn().mockImplementation(() => cache);
        setItem = vi.fn().mockImplementation((_key: string, value: Record<string, string>) => {
            cache = value;
        });
        vi.stubGlobal('useStorage', vi.fn().mockReturnValue({ getItem, setItem }));
    });

    it('returns cached names without calling ahFetch', async () => {
        cache = { 'AH MELK': ProductCategoryEnum.zuivel };

        const result = await resolveCategories(['AH MELK']);

        expect(result).toEqual({ 'AH MELK': ProductCategoryEnum.zuivel });
        expect(ahFetch).not.toHaveBeenCalled();
    });

    it('searches unknown names and writes the result to the cache', async () => {
        vi.mocked(getStoredTokens).mockResolvedValue(null);
        vi.mocked(getAnonymousAccessToken).mockResolvedValue('anon-token');
        vi.mocked(ahFetch).mockResolvedValue({ products: [{ mainCategory: 'Vlees' }] });

        const result = await resolveCategories(['AH SCHNITZEL']);

        expect(ahFetch).toHaveBeenCalledWith(
            expect.stringContaining(encodeURIComponent('AH SCHNITZEL')),
            'anon-token',
        );
        expect(result).toEqual({ 'AH SCHNITZEL': ProductCategoryEnum.vlees });
        expect(setItem).toHaveBeenCalledWith('categories.json', { 'AH SCHNITZEL': ProductCategoryEnum.vlees });
    });

    it('uses the valid access token when tokens are already stored', async () => {
        vi.mocked(getStoredTokens).mockResolvedValue({
            accessToken: 'stored',
            refreshToken: 'refresh',
            expiresAt: Date.now() + 60_000,
        });
        vi.mocked(getValidAccessToken).mockResolvedValue('valid-token');
        vi.mocked(ahFetch).mockResolvedValue({ products: [{ mainCategory: 'Vis' }] });

        await resolveCategories(['AH ZALM']);

        expect(getValidAccessToken).toHaveBeenCalled();
        expect(getAnonymousAccessToken).not.toHaveBeenCalled();
        expect(ahFetch).toHaveBeenCalledWith(expect.any(String), 'valid-token');
    });

    it('swallows an error for one name and keeps resolving the rest', async () => {
        vi.mocked(getStoredTokens).mockResolvedValue(null);
        vi.mocked(getAnonymousAccessToken).mockResolvedValue('anon-token');
        vi.mocked(ahFetch).mockImplementation(async (path: string) => {
            if (path.includes(encodeURIComponent('BAD ITEM'))) {
                throw new Error('AH search failed');
            }
            return { products: [{ mainCategory: 'Kaas' }] };
        });

        const result = await resolveCategories(['BAD ITEM', 'GOOD ITEM']);

        expect(result).toEqual({ 'GOOD ITEM': ProductCategoryEnum.zuivel });
        expect(setItem).toHaveBeenCalledWith('categories.json', { 'GOOD ITEM': ProductCategoryEnum.zuivel });
    });
});
