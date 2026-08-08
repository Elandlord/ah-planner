import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const memory = new Map<string, string>();

vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
});

const { useRecipeStore } = await import('~/stores/recipeStore');

describe('swapDays', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('moves a recipe to an empty day', () => {
        const store = useRecipeStore();
        store.weekPlan = { Maandag: 'erwtensoep' };
        store.swapDays('Maandag', 'Woensdag');
        expect(store.weekPlan).toEqual({ Woensdag: 'erwtensoep' });
    });

    it('swaps two planned days instead of overwriting one', () => {
        const store = useRecipeStore();
        store.weekPlan = { Maandag: 'erwtensoep', Dinsdag: 'lasagne' };
        store.swapDays('Maandag', 'Dinsdag');
        expect(store.weekPlan).toEqual({ Maandag: 'lasagne', Dinsdag: 'erwtensoep' });
    });

    it('does nothing when the day it came from is empty', () => {
        const store = useRecipeStore();
        store.weekPlan = { Dinsdag: 'lasagne' };
        store.swapDays('Maandag', 'Dinsdag');
        expect(store.weekPlan).toEqual({ Dinsdag: 'lasagne' });
    });

    it('does nothing when dropped on itself', () => {
        const store = useRecipeStore();
        store.weekPlan = { Maandag: 'erwtensoep' };
        store.swapDays('Maandag', 'Maandag');
        expect(store.weekPlan).toEqual({ Maandag: 'erwtensoep' });
    });
});
