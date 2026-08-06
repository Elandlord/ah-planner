import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCategoryOverrideStore } from '~/stores/categoryOverrideStore';
import type CategoryOverridesInterface from '~/types/CategoryOverridesInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const STORAGE_KEY = 'ah-planner-category-overrides';

function createLocalStorageStub(initial: string | null = null) {
    const entries = new Map<string, string>();
    if (initial !== null) {
        entries.set(STORAGE_KEY, initial);
    }
    return {
        getItem: vi.fn((key: string) => entries.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            entries.set(key, value);
        }),
    };
}

function storedOverrides(): CategoryOverridesInterface {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as CategoryOverridesInterface;
}

describe('categoryOverrideStore', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createLocalStorageStub());
        setActivePinia(createPinia());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('state', () => {
        it('starts empty when nothing is stored', () => {
            // #given
            const store = useCategoryOverrideStore();

            // #when
            const overrides = store.overrides;

            // #then
            expect(overrides).toEqual({});
        });

        it('starts empty when the stored overrides are corrupted JSON', () => {
            // #given
            vi.stubGlobal('localStorage', createLocalStorageStub('not-json{'));
            setActivePinia(createPinia());

            // #when
            const store = useCategoryOverrideStore();

            // #then
            expect(store.overrides).toEqual({});
        });

        it('restores overrides from local storage', () => {
            // #given
            vi.stubGlobal(
                'localStorage',
                createLocalStorageStub(JSON.stringify({ 'ah zuivelspr': ProductCategoryEnum.zuivel })),
            );
            setActivePinia(createPinia());

            // #when
            const store = useCategoryOverrideStore();

            // #then
            expect(store.overrides).toEqual({ 'ah zuivelspr': ProductCategoryEnum.zuivel });
        });
    });

    describe('setOverride', () => {
        it('stores the correction under the normalized product name', () => {
            // #given
            const store = useCategoryOverrideStore();

            // #when
            store.setOverride('  AH  Zuivelspr 500g ', ProductCategoryEnum.zuivel);

            // #then
            expect(store.overrides).toEqual({ 'ah zuivelspr': ProductCategoryEnum.zuivel });
        });

        it('persists the corrections to local storage', () => {
            // #given
            const store = useCategoryOverrideStore();

            // #when
            store.setOverride('AH Kokosmelk', ProductCategoryEnum.conserven);

            // #then
            expect(storedOverrides()).toEqual({ 'ah kokosmelk': ProductCategoryEnum.conserven });
        });

        it('replaces an earlier correction for the same product', () => {
            // #given
            const store = useCategoryOverrideStore();
            store.setOverride('AH Kokosmelk', ProductCategoryEnum.zuivel);

            // #when
            store.setOverride('AH Kokosmelk', ProductCategoryEnum.conserven);

            // #then
            expect(store.overrides).toEqual({ 'ah kokosmelk': ProductCategoryEnum.conserven });
        });

        it('ignores a product name that normalizes to nothing', () => {
            // #given
            const store = useCategoryOverrideStore();

            // #when
            store.setOverride('   ', ProductCategoryEnum.overig);

            // #then
            expect(store.overrides).toEqual({});
        });
    });

    describe('overrideCount', () => {
        it('counts the stored corrections', () => {
            // #given
            const store = useCategoryOverrideStore();
            store.setOverride('AH Kokosmelk', ProductCategoryEnum.conserven);
            store.setOverride('AH Zuivelspr', ProductCategoryEnum.zuivel);

            // #when
            const count = store.overrideCount;

            // #then
            expect(count).toBe(2);
        });
    });
});
