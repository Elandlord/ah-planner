import { defineStore } from 'pinia';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';
import { useReceiptStore } from '~/stores/receiptStore';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const STORAGE_KEY = 'ah-planner-shopping-list';

function loadFromStorage(): ShoppingListItemInterface[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return [];
    }
    return JSON.parse(stored) as ShoppingListItemInterface[];
}

function saveToStorage(items: ShoppingListItemInterface[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const useShoppingListStore = defineStore('shoppingList', {
    state: () => ({
        items: loadFromStorage(),
    }),

    getters: {
        uncheckedItems: (state): ShoppingListItemInterface[] =>
            state.items.filter((item) => !item.checked),

        checkedItems: (state): ShoppingListItemInterface[] =>
            state.items.filter((item) => item.checked),

        itemsByCategory: (state): Record<string, ShoppingListItemInterface[]> => {
            const grouped: Record<string, ShoppingListItemInterface[]> = {};
            for (const item of state.items) {
                if (!grouped[item.category]) {
                    grouped[item.category] = [];
                }
                grouped[item.category].push(item);
            }
            return grouped;
        },
    },

    actions: {
        addItem(item: ShoppingListItemInterface): void {
            const existing = this.items.find(
                (i) => i.name.toLowerCase() === item.name.toLowerCase(),
            );
            if (existing) {
                existing.frequency += 1;
                existing.checked = false;
            } else {
                this.items.push(item);
            }
            saveToStorage(this.items);
        },

        removeItem(name: string): void {
            this.items = this.items.filter(
                (i) => i.name.toLowerCase() !== name.toLowerCase(),
            );
            saveToStorage(this.items);
        },

        toggleItem(name: string): void {
            const item = this.items.find(
                (i) => i.name.toLowerCase() === name.toLowerCase(),
            );
            if (item) {
                item.checked = !item.checked;
                saveToStorage(this.items);
            }
        },

        clearChecked(): void {
            this.items = this.items.filter((item) => !item.checked);
            saveToStorage(this.items);
        },

        generateFromHistory(): void {
            const receiptStore = useReceiptStore();
            const frequency = receiptStore.itemFrequency;
            const allItems = receiptStore.allItems;

            const topItems = Object.entries(frequency)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 20);

            for (const [name, freq] of topItems) {
                const existingItem = this.items.find(
                    (i) => i.name.toLowerCase() === name.toLowerCase(),
                );
                if (existingItem) {
                    continue;
                }

                const matchingItem = allItems.find(
                    (i) => i.name.toLowerCase() === name.toLowerCase(),
                );
                const category = matchingItem?.category ?? ProductCategoryEnum.overig;

                this.items.push({
                    name,
                    category,
                    checked: false,
                    frequency: freq,
                });
            }
            saveToStorage(this.items);
        },
    },
});
