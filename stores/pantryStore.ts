import { defineStore } from 'pinia';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type StockItemInterface from '~/types/StockItemInterface';

const STOCK_KEY = 'ah-planner-stock';
const PROCESSED_KEY = 'ah-planner-stock-processed-receipts';
const AUTO_ADD_KEY = 'ah-planner-stock-auto-add';

function parseStored<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored === null ? fallback : (JSON.parse(stored) as T);
    } catch {
        return fallback;
    }
}

export function stockKeyFor(name: string): string {
    return name.trim().toLowerCase();
}

export const usePantryStore = defineStore('pantry', {
    state: () => ({
        items: parseStored<StockItemInterface[]>(STOCK_KEY, []),
        processedReceiptIds: parseStored<string[]>(PROCESSED_KEY, []),
        autoAdd: parseStored<boolean>(AUTO_ADD_KEY, true),
    }),

    getters: {
        totalItems: (state): number =>
            state.items.reduce((sum, item) => sum + item.quantity, 0),

        isProcessed: (state) => (receiptId: string): boolean =>
            state.processedReceiptIds.includes(receiptId),
    },

    actions: {
        persist(): void {
            localStorage.setItem(STOCK_KEY, JSON.stringify(this.items));
            localStorage.setItem(PROCESSED_KEY, JSON.stringify(this.processedReceiptIds));
            localStorage.setItem(AUTO_ADD_KEY, JSON.stringify(this.autoAdd));
        },

        /** Buying something you already have tops it up rather than listing it twice. */
        addItem(item: StockItemInterface): void {
            const key = stockKeyFor(item.name);
            const existing = this.items.find((stored) => stockKeyFor(stored.name) === key);
            if (existing) {
                existing.quantity += item.quantity;
                existing.purchaseDate = item.purchaseDate;
                if (item.expiresAt) {
                    existing.expiresAt = item.expiresAt;
                }
            } else {
                this.items.push({ ...item });
            }
            this.persist();
        },

        addFromReceipt(receipt: ReceiptInterface): number {
            if (this.processedReceiptIds.includes(receipt.id)) {
                return 0;
            }
            for (const item of receipt.items) {
                this.addItem({
                    name: item.name,
                    category: item.category,
                    quantity: item.quantity,
                    purchaseDate: receipt.date,
                });
            }
            this.processedReceiptIds.push(receipt.id);
            this.persist();
            return receipt.items.length;
        },

        /** Only receipts never seen before, so a re-sync does not double your stock. */
        addFromNewReceipts(receipts: ReceiptInterface[]): number {
            return receipts.reduce((added, receipt) => added + this.addFromReceipt(receipt), 0);
        },

        /** Something can also be in the house without a receipt to prove it. */
        addManual(item: Omit<StockItemInterface, 'purchaseDate'> & { purchaseDate?: string }): void {
            this.addItem({
                ...item,
                name: item.name.trim(),
                quantity: Math.max(1, item.quantity),
                purchaseDate: item.purchaseDate ?? new Date().toISOString(),
            });
        },

        /** A date on the packaging beats any shelf-life estimate. */
        setExpiry(name: string, expiresAt: string | null): void {
            const item = this.items.find((stored) => stockKeyFor(stored.name) === stockKeyFor(name));
            if (!item) {
                return;
            }
            if (expiresAt) {
                item.expiresAt = expiresAt;
            } else {
                delete item.expiresAt;
            }
            this.persist();
        },

        increase(name: string): void {
            const item = this.items.find((stored) => stockKeyFor(stored.name) === stockKeyFor(name));
            if (item) {
                item.quantity += 1;
                this.persist();
            }
        },

        decrease(name: string): void {
            const key = stockKeyFor(name);
            const item = this.items.find((stored) => stockKeyFor(stored.name) === key);
            if (!item) {
                return;
            }
            if (item.quantity <= 1) {
                this.remove(name);
                return;
            }
            item.quantity -= 1;
            this.persist();
        },

        remove(name: string): void {
            const key = stockKeyFor(name);
            this.items = this.items.filter((stored) => stockKeyFor(stored.name) !== key);
            this.persist();
        },

        clear(): void {
            this.items = [];
            this.persist();
        },

        setAutoAdd(enabled: boolean): void {
            this.autoAdd = enabled;
            this.persist();
        },
    },
});
