import { defineStore } from 'pinia';
import { normalizeProductName } from '~/composables/useReceiptParser';
import type CategoryOverridesInterface from '~/types/CategoryOverridesInterface';
import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

const STORAGE_KEY = 'ah-planner-category-overrides';

function loadFromStorage(): CategoryOverridesInterface {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return {};
    }
    try {
        return JSON.parse(stored) as CategoryOverridesInterface;
    } catch {
        return {};
    }
}

function saveToStorage(overrides: CategoryOverridesInterface): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export const useCategoryOverrideStore = defineStore('categoryOverride', {
    state: () => ({
        overrides: loadFromStorage(),
    }),

    getters: {
        overrideCount: (state): number => Object.keys(state.overrides).length,
    },

    actions: {
        setOverride(productName: string, category: ProductCategoryEnum): void {
            const key = normalizeProductName(productName);
            if (!key) {
                return;
            }
            this.overrides[key] = category;
            saveToStorage(this.overrides);
        },
    },
});
