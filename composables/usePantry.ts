import { computed } from 'vue';
import { filterFreshItems } from '~/composables/useRecipeMatch';
import { shelfLifeDaysFor } from '~/data/shelfLifeDays';
import { useReceiptStore } from '~/stores/receiptStore';
import type DatedReceiptItemInterface from '~/types/DatedReceiptItemInterface';
import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const EXPIRING_SOON_THRESHOLD_DAYS = 2;

export interface PantryItemInterface extends DatedReceiptItemInterface {
    daysRemaining: number;
    expiringSoon: boolean;
}

export function buildPantryItems(
    items: DatedReceiptItemInterface[],
    now: Date = new Date(),
): PantryItemInterface[] {
    return filterFreshItems(items, now).map((item) => {
        const ageInDays = (now.getTime() - new Date(item.purchaseDate).getTime()) / DAY_IN_MS;
        const daysRemaining = shelfLifeDaysFor(item.category) - ageInDays;

        return {
            ...item,
            daysRemaining,
            expiringSoon: daysRemaining <= EXPIRING_SOON_THRESHOLD_DAYS,
        };
    });
}

export interface StockFreshnessInputInterface {
    name: string;
    category: ProductCategoryEnum;
    quantity: number;
    purchaseDate: string;
    expiresAt?: string;
}

export interface StockFreshnessItemInterface extends StockFreshnessInputInterface {
    daysRemaining: number;
    expiringSoon: boolean;
}

/**
 * The stock you keep by hand shows everything you put in it. Passing its shelf life makes an
 * item worth flagging, never worth hiding, because only you can say it is gone. It carries no
 * receipt line, so it needs less than a receipt item does.
 */
export function buildStockItems(
    items: StockFreshnessInputInterface[],
    now: Date = new Date(),
): StockFreshnessItemInterface[] {
    return items.map((item) => {
        const daysRemaining = item.expiresAt
            ? (new Date(item.expiresAt).getTime() - now.getTime()) / DAY_IN_MS
            : shelfLifeDaysFor(item.category)
                - (now.getTime() - new Date(item.purchaseDate).getTime()) / DAY_IN_MS;

        return {
            ...item,
            daysRemaining,
            expiringSoon: daysRemaining <= EXPIRING_SOON_THRESHOLD_DAYS,
        };
    });
}

export function groupPantryItemsByCategory<T extends { category: string }>(
    items: T[],
): Record<string, T[]> {
    const grouped: Record<string, T[]> = {};
    for (const item of items) {
        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }
        grouped[item.category].push(item);
    }
    return grouped;
}

export function usePantry() {
    const receiptStore = useReceiptStore();

    const pantryItems = computed(() => buildPantryItems(receiptStore.itemsWithPurchaseDate));
    const itemsByCategory = computed(() => groupPantryItemsByCategory(pantryItems.value));
    const expiringSoonItems = computed(() => pantryItems.value.filter((item) => item.expiringSoon));

    function markItemUsed(item: PantryItemInterface): void {
        receiptStore.markItemUsed(item.receiptId, item.itemIndex);
    }

    return {
        pantryItems,
        itemsByCategory,
        expiringSoonItems,
        markItemUsed,
    };
}
