import type AhSyncedReceiptInterface from '~/types/AhSyncedReceiptInterface';
import type AhProductInterface from '~/types/AhProductInterface';
import type AhListItemInterface from '~/types/AhListItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';
import { useReceiptStore } from '~/stores/receiptStore';
import { useProductCategories } from '~/composables/useProductCategories';

const SYNCED_ID_PREFIX = 'ah-';
const MAX_SYNC_PASSES = 6;

function toReceipt(
    synced: AhSyncedReceiptInterface,
    categoryOf: (name: string) => ProductCategoryEnum,
): ReceiptInterface {
    return {
        id: `${SYNCED_ID_PREFIX}${synced.transactionId}`,
        date: synced.date,
        items: synced.items.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: categoryOf(item.name),
        })),
        total: synced.total,
        storeName: 'Albert Heijn',
        discountTotal: synced.discountTotal,
        payments: synced.payments,
    };
}

export function useAhApi() {
    const receiptStore = useReceiptStore();
    const { categorizeProduct } = useProductCategories();

    async function fetchStatus(): Promise<boolean> {
        const response = await $fetch<{ connected: boolean }>('/api/ah/status');
        return response.connected;
    }

    async function connect(code: string): Promise<void> {
        await $fetch('/api/ah/connect', {
            method: 'POST',
            body: { code },
        });
    }

    async function startLogin(): Promise<string> {
        const response = await $fetch<{ loginUrl: string }>('/api/ah/login', { method: 'POST' });
        return response.loginUrl;
    }

    /** Receipts stored before payment data existed are fetched again so nothing stays half filled. */
    function completeSyncedIds(): string {
        return receiptStore.receipts
            .filter((receipt) => receipt.id.startsWith(SYNCED_ID_PREFIX) && receipt.payments)
            .map((receipt) => receipt.id.slice(SYNCED_ID_PREFIX.length))
            .join(',');
    }

    async function fetchCategories(names: string[]): Promise<Record<string, string>> {
        try {
            const response = await $fetch<{ categories: Record<string, string> }>(
                '/api/ah/categorize',
                { method: 'POST', body: { names } },
            );
            return response.categories;
        } catch {
            return {};
        }
    }

    function toKnownCategory(value: string | undefined): ProductCategoryEnum | null {
        return Object.values(ProductCategoryEnum).find((category) => category === value) ?? null;
    }

    async function syncPass(): Promise<number> {
        const response = await $fetch<{ receipts: AhSyncedReceiptInterface[] }>(
            '/api/ah/receipts',
            { query: { knownIds: completeSyncedIds() } },
        );

        const names = response.receipts.flatMap((receipt) => receipt.items.map((item) => item.name));
        const categories = await fetchCategories(names);
        const categoryOf = (name: string): ProductCategoryEnum =>
            toKnownCategory(categories[name]) ?? categorizeProduct(name);

        for (const synced of response.receipts) {
            const receipt = toReceipt(synced, categoryOf);
            const existing = receiptStore.receipts.some((stored) => stored.id === receipt.id);
            if (existing) {
                receiptStore.updateReceipt(receipt.id, receipt);
                continue;
            }
            receiptStore.addReceipt(receipt);
        }
        return response.receipts.length;
    }

    /** AH returns a limited page per call, so keep asking until a pass brings nothing back. */
    async function syncReceipts(): Promise<number> {
        let total = 0;
        for (let pass = 0; pass < MAX_SYNC_PASSES; pass += 1) {
            const count = await syncPass();
            total += count;
            if (count === 0) {
                break;
            }
        }
        return total;
    }

    async function searchProducts(query: string): Promise<AhProductInterface[]> {
        const response = await $fetch<{ products: AhProductInterface[] }>(
            '/api/ah/search',
            { query: { query } },
        );
        return response.products;
    }

    /** Reuses the same ranked matching the recipe shopping flow relies on. */
    async function resolveProducts(names: string[]): Promise<Map<string, AhProductInterface | null>> {
        if (names.length === 0) {
            return new Map();
        }
        const response = await $fetch<{ suggestions: { query: string; product: AhProductInterface | null }[] }>(
            '/api/ah/suggest',
            { method: 'POST', body: { names } },
        );
        return new Map(response.suggestions.map((suggestion) => [suggestion.query, suggestion.product]));
    }

    async function addToList(items: AhListItemInterface[]): Promise<number> {
        if (items.length === 0) {
            return 0;
        }
        const response = await $fetch<{ added: number }>('/api/ah/list-add', {
            method: 'POST',
            body: { items },
        });
        return response.added;
    }

    return {
        fetchStatus,
        connect,
        startLogin,
        syncReceipts,
        searchProducts,
        resolveProducts,
        addToList,
    };
}
