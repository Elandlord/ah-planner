import { defineStore } from 'pinia';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';
import type ShoppingListItemSourceInterface from '~/types/ShoppingListItemSourceInterface';
import { useReceiptStore } from '~/stores/receiptStore';
import { useRecipeStore } from '~/stores/recipeStore';
import { topEntries } from '~/composables/useItemFrequency';
import { filterFreshItems, scoreRecipe } from '~/composables/useRecipeMatch';
import { normalizeProductName } from '~/composables/useReceiptParser';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const STORAGE_KEY = 'ah-planner-shopping-list';

function loadFromStorage(): ShoppingListItemInterface[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return [];
    }
    try {
        return JSON.parse(stored) as ShoppingListItemInterface[];
    } catch {
        return [];
    }
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

        estimatedPrices(): Record<string, number> {
            const receiptStore = useReceiptStore();
            return receiptStore.averagePriceByItem;
        },

        estimatedTotal(): number {
            return this.uncheckedItems.reduce((sum, item) => {
                const price = this.estimatedPrices[item.name.toLowerCase()];
                return price !== undefined ? sum + price : sum;
            }, 0);
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

            const topItems = topEntries(frequency, 20);

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

        generateFromWeekPlan(): void {
            const recipeStore = useRecipeStore();
            const receiptStore = useReceiptStore();
            const freshItems = filterFreshItems(receiptStore.itemsWithPurchaseDate, new Date());
            const purchasedNames = new Set(freshItems.map((i) => normalizeProductName(i.name)));
            const purchasedCategories = new Set(freshItems.map((i) => i.category));

            const missingByName = new Map<
                string,
                {
                    category: ProductCategoryEnum;
                    count: number;
                    sources: ShoppingListItemSourceInterface[];
                    amounts: string[];
                }
            >();

            for (const [day, recipe] of Object.entries(recipeStore.weekPlanRecipes)) {
                if (!recipe) {
                    continue;
                }

                const { missingIngredients } = scoreRecipe(recipe, purchasedNames, purchasedCategories);
                const missingNames = new Set(missingIngredients.map((name) => name.toLowerCase()));

                for (const ingredient of recipe.ingredients) {
                    const name = ingredient.name.toLowerCase();
                    if (!missingNames.has(name)) {
                        continue;
                    }

                    const source = { day, recipeName: recipe.name };
                    const existing = missingByName.get(name);
                    if (existing) {
                        existing.count += 1;
                        existing.sources.push(source);
                        existing.amounts.push(ingredient.amount);
                    } else {
                        missingByName.set(name, {
                            category: ingredient.category,
                            count: 1,
                            sources: [source],
                            amounts: [ingredient.amount],
                        });
                    }
                }
            }

            for (const [name, { category, count, sources, amounts }] of missingByName) {
                const existingItem = this.items.find(
                    (i) => i.name.toLowerCase() === name,
                );
                if (existingItem) {
                    continue;
                }

                this.items.push({
                    name,
                    category,
                    checked: false,
                    frequency: count,
                    sources,
                    amounts,
                });
            }
            saveToStorage(this.items);
        },

        exportData(): ShoppingListItemInterface[] {
            return this.items;
        },

        importData(items: ShoppingListItemInterface[]): void {
            this.items = items;
            saveToStorage(this.items);
        },
    },
});
