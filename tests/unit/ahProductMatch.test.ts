import { describe, expect, it } from 'vitest';
import { matchScore, pickBestProduct } from '~~/server/utils/ahProductMatch';

describe('matchScore', () => {
    it('rates an exact title highest', () => {
        expect(matchScore('AH Gnocchi', 'AH Gnocchi'))
            .toBeGreaterThan(matchScore('AH Gnocchi', 'AH Gevulde gnocchi tomaat & mozzarella'));
    });

    it('rates a title that misses the query at zero', () => {
        expect(matchScore('AH Gele uien', 'AH Haringfilet met uitjes 4-pack')).toBe(0);
    });

    it('prefers a single item over a multipack', () => {
        expect(matchScore('AH Knoflook', 'AH Knoflook'))
            .toBeGreaterThan(matchScore('AH Knoflook', 'AH Knoflook 3-pack'));
    });
});

describe('pickBestProduct', () => {
    it('skips the shop ordering when the first hit is unrelated', () => {
        const best = pickBestProduct('AH Gele uien', [
            { title: 'AH Biologisch Eieren S M L 3pack', currentPrice: 19.47 },
            { title: 'AH Gele uien', currentPrice: 1.09 },
        ]);
        expect(best?.title).toBe('AH Gele uien');
    });

    it('takes the cheaper option when two titles match equally well', () => {
        const best = pickBestProduct('AH Mozzarella', [
            { title: 'AH Mozzarella', currentPrice: 1.29 },
            { title: 'AH Mozzarella', currentPrice: 0.99 },
        ]);
        expect(best?.currentPrice).toBe(0.99);
    });

    it('falls back to the first result when nothing matches', () => {
        const best = pickBestProduct('AH Sterrenstof', [{ title: 'AH Bananen', currentPrice: 1.49 }]);
        expect(best?.title).toBe('AH Bananen');
    });

    it('returns nothing for an empty result set', () => {
        expect(pickBestProduct('AH Gnocchi', [])).toBeNull();
    });
});
