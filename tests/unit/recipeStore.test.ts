import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import MealSlotEnum from '~/types/MealSlotEnum';
import type WeekPlanInterface from '~/types/WeekPlanInterface';

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

    function planWith(plan: WeekPlanInterface) {
        const store = useRecipeStore();
        store.weekPlans = { [store.currentWeekStart]: { ...plan } };
        return store;
    }

    it('moves a recipe to an empty day', () => {
        const store = planWith({ Maandag: { [MealSlotEnum.dinner]: 'erwtensoep' } });
        store.swapDays('Maandag', 'Woensdag');
        expect(store.weekPlan).toEqual({ Woensdag: { [MealSlotEnum.dinner]: 'erwtensoep' } });
    });

    it('swaps two planned days instead of overwriting one', () => {
        const store = planWith({
            Maandag: { [MealSlotEnum.dinner]: 'erwtensoep' },
            Dinsdag: { [MealSlotEnum.dinner]: 'lasagne' },
        });
        store.swapDays('Maandag', 'Dinsdag');
        expect(store.weekPlan).toEqual({
            Maandag: { [MealSlotEnum.dinner]: 'lasagne' },
            Dinsdag: { [MealSlotEnum.dinner]: 'erwtensoep' },
        });
    });

    it('does nothing when the day it came from is empty', () => {
        const store = planWith({ Dinsdag: { [MealSlotEnum.dinner]: 'lasagne' } });
        store.swapDays('Maandag', 'Dinsdag');
        expect(store.weekPlan).toEqual({ Dinsdag: { [MealSlotEnum.dinner]: 'lasagne' } });
    });

    it('does nothing when dropped on itself', () => {
        const store = planWith({ Maandag: { [MealSlotEnum.dinner]: 'erwtensoep' } });
        store.swapDays('Maandag', 'Maandag');
        expect(store.weekPlan).toEqual({ Maandag: { [MealSlotEnum.dinner]: 'erwtensoep' } });
    });

    it('only swaps the given meal slot, leaving the other slot untouched', () => {
        const store = planWith({
            Maandag: { [MealSlotEnum.dinner]: 'erwtensoep', [MealSlotEnum.lunch]: 'soep' },
            Dinsdag: { [MealSlotEnum.dinner]: 'lasagne' },
        });
        store.swapDays('Maandag', 'Dinsdag', MealSlotEnum.dinner);
        expect(store.weekPlan).toEqual({
            Maandag: { [MealSlotEnum.dinner]: 'lasagne', [MealSlotEnum.lunch]: 'soep' },
            Dinsdag: { [MealSlotEnum.dinner]: 'erwtensoep' },
        });
    });

    it('plans one recipe on several days at once', () => {
        const store = planWith({});
        store.assignToDays(['Maandag', 'Dinsdag'], 'erwtensoep');
        expect(store.weekPlan).toEqual({
            Maandag: { [MealSlotEnum.dinner]: 'erwtensoep' },
            Dinsdag: { [MealSlotEnum.dinner]: 'erwtensoep' },
        });
    });

    it('plans a recipe onto the lunch slot without touching dinner', () => {
        const store = planWith({ Maandag: { [MealSlotEnum.dinner]: 'erwtensoep' } });
        store.assignToDays(['Maandag'], 'salade', MealSlotEnum.lunch);
        expect(store.weekPlan).toEqual({
            Maandag: { [MealSlotEnum.dinner]: 'erwtensoep', [MealSlotEnum.lunch]: 'salade' },
        });
    });
});
