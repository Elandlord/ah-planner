import { describe, it, expect } from 'vitest';
import { topEntries } from '~/composables/useItemFrequency';

describe('topEntries', () => {
    it('returns an empty array for an empty frequency map', () => {
        const result = topEntries({}, 10);

        expect(result).toEqual([]);
    });

    it('returns all entries when there are fewer than the limit', () => {
        const result = topEntries({ melk: 3, brood: 1 }, 10);

        expect(result).toEqual([
            ['melk', 3],
            ['brood', 1],
        ]);
    });

    it('preserves insertion order for tied frequencies', () => {
        const result = topEntries({ melk: 2, brood: 2, kaas: 2 }, 10);

        expect(result).toEqual([
            ['melk', 2],
            ['brood', 2],
            ['kaas', 2],
        ]);
    });

    it('sorts entries by frequency descending and truncates to the limit', () => {
        const result = topEntries({ melk: 1, brood: 5, kaas: 3, appels: 2 }, 2);

        expect(result).toEqual([
            ['brood', 5],
            ['kaas', 3],
        ]);
    });
});
