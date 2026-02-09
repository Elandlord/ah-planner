import { defineStore } from 'pinia';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import type ProductCategoryEnum from '~/types/ProductCategoryEnum';

const STORAGE_KEY = 'ah-planner-receipts';

function loadFromStorage(): ReceiptInterface[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return [];
    }
    return JSON.parse(stored) as ReceiptInterface[];
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
    },

    actions: {
        addReceipt(receipt: ReceiptInterface): void {
            this.receipts.push(receipt);
            saveToStorage(this.receipts);
        },

        removeReceipt(receiptId: string): void {
            this.receipts = this.receipts.filter((r) => r.id !== receiptId);
            saveToStorage(this.receipts);
        },

        updateReceipt(receiptId: string, updatedReceipt: ReceiptInterface): void {
            const index = this.receipts.findIndex((r) => r.id === receiptId);
            if (index === -1) {
                return;
            }
            this.receipts[index] = updatedReceipt;
            saveToStorage(this.receipts);
        },
    },
});
