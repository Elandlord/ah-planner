import { defineStore } from 'pinia';
import { useReceiptOriginalStore } from '~/composables/useReceiptOriginalStore';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import type DatedReceiptItemInterface from '~/types/DatedReceiptItemInterface';
import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

const STORAGE_KEY = 'ah-planner-receipts';
const RECENT_PURCHASE_WINDOW_DAYS = 14;

function loadFromStorage(): ReceiptInterface[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return [];
    }
    try {
        return JSON.parse(stored) as ReceiptInterface[];
    } catch {
        return [];
    }
}

function saveToStorage(receipts: ReceiptInterface[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
}

export const useReceiptStore = defineStore('receipt', {
    state: () => ({
        receipts: loadFromStorage(),
    }),

    getters: {
        receiptCount: (state): number => state.receipts.length,

        totalSpent: (state): number =>
            state.receipts.reduce((sum, receipt) => sum + receipt.total, 0),

        averagePerReceipt(): number {
            if (this.receiptCount === 0) {
                return 0;
            }
            return this.totalSpent / this.receiptCount;
        },

        allItems: (state): ReceiptItemInterface[] =>
            state.receipts.flatMap((receipt) => receipt.items),

        itemsWithPurchaseDate: (state): DatedReceiptItemInterface[] =>
            state.receipts.flatMap((receipt) =>
                receipt.items.map((item) => ({ ...item, purchaseDate: receipt.date })),
            ),

        recentItems: (state): ReceiptItemInterface[] => {
            const cutoff = Date.now() - RECENT_PURCHASE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
            return state.receipts
                .filter((receipt) => new Date(receipt.date).getTime() >= cutoff)
                .flatMap((receipt) => receipt.items);
        },

        spendingByCategory(): Record<string, number> {
            const spending: Record<string, number> = {};
            for (const item of this.allItems) {
                const current = spending[item.category] ?? 0;
                spending[item.category] = current + item.price * item.quantity;
            }
            return spending;
        },

        itemFrequency(): Record<string, number> {
            const frequency: Record<string, number> = {};
            for (const item of this.allItems) {
                const key = item.name.toLowerCase();
                frequency[key] = (frequency[key] ?? 0) + item.quantity;
            }
            return frequency;
        },

        recentReceipts: (state): ReceiptInterface[] =>
            [...state.receipts].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            ),

        purchasedCategories(): Set<ProductCategoryEnum> {
            const categories = new Set<ProductCategoryEnum>();
            for (const item of this.allItems) {
                categories.add(item.category);
            }
            return categories;
        },

        averagePriceByItem(): Record<string, number> {
            const totals: Record<string, { sum: number; quantity: number }> = {};
            for (const item of this.allItems) {
                const key = item.name.toLowerCase();
                const current = totals[key] ?? { sum: 0, quantity: 0 };
                current.sum += item.price * item.quantity;
                current.quantity += item.quantity;
                totals[key] = current;
            }

            const averages: Record<string, number> = {};
            for (const [name, { sum, quantity }] of Object.entries(totals)) {
                averages[name] = sum / quantity;
            }
            return averages;
        },
    },

    actions: {
        addReceipt(receipt: ReceiptInterface): void {
            this.receipts.push(receipt);
            saveToStorage(this.receipts);
        },

        removeReceipt(receiptId: string): void {
            this.receipts = this.receipts.filter((r) => r.id !== receiptId);
            saveToStorage(this.receipts);
            useReceiptOriginalStore().deleteOriginal(receiptId).catch(() => {});
        },

        updateReceipt(receiptId: string, updatedReceipt: ReceiptInterface): void {
            const index = this.receipts.findIndex((r) => r.id === receiptId);
            if (index === -1) {
                return;
            }
            this.receipts[index] = updatedReceipt;
            saveToStorage(this.receipts);
        },

        exportData(): ReceiptInterface[] {
            return this.receipts;
        },

        importData(receipts: ReceiptInterface[]): void {
            this.receipts = receipts;
            saveToStorage(this.receipts);
        },
    },
});
