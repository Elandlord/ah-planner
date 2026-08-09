// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAhApi } from '~/composables/useAhApi';
import type AhProductInterface from '~/types/AhProductInterface';

const PRODUCT: AhProductInterface = {
    id: 42,
    title: 'AH Melk',
    brand: 'AH',
    salesUnitSize: '1 l',
    price: 1.29,
    bonusPrice: null,
    isBonus: false,
    imageUrl: null,
};

describe('useAhApi resolveProducts', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('maps each name to its resolved product', async () => {
        // #given
        const fetchMock = vi.fn().mockResolvedValue({
            suggestions: [
                { query: 'Melk', product: PRODUCT, bonusMechanism: null },
                { query: 'Onvindbaar', product: null, bonusMechanism: null },
            ],
        });
        vi.stubGlobal('$fetch', fetchMock);
        const { resolveProducts } = useAhApi();

        // #when
        const result = await resolveProducts(['Melk', 'Onvindbaar']);

        // #then
        expect(result.get('Melk')).toEqual(PRODUCT);
        expect(result.get('Onvindbaar')).toBeNull();
        expect(fetchMock).toHaveBeenCalledWith('/api/ah/suggest', {
            method: 'POST',
            body: { names: ['Melk', 'Onvindbaar'] },
        });
    });

    it('skips the request when there are no names', async () => {
        // #given
        const fetchMock = vi.fn();
        vi.stubGlobal('$fetch', fetchMock);
        const { resolveProducts } = useAhApi();

        // #when
        const result = await resolveProducts([]);

        // #then
        expect(result.size).toBe(0);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('useAhApi addToList', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('posts the resolved items to the list-add endpoint', async () => {
        // #given
        const fetchMock = vi.fn().mockResolvedValue({ added: 1 });
        vi.stubGlobal('$fetch', fetchMock);
        const { addToList } = useAhApi();

        // #when
        const added = await addToList([{ productId: 42, quantity: 1, name: 'Melk' }]);

        // #then
        expect(added).toBe(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/ah/list-add', {
            method: 'POST',
            body: { items: [{ productId: 42, quantity: 1, name: 'Melk' }] },
        });
    });

    it('skips the request when there are no items', async () => {
        // #given
        const fetchMock = vi.fn();
        vi.stubGlobal('$fetch', fetchMock);
        const { addToList } = useAhApi();

        // #when
        const added = await addToList([]);

        // #then
        expect(added).toBe(0);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
