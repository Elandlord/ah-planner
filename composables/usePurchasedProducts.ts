import type ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type ReceiptInterface from '~/types/ReceiptInterface';

const SUGGESTION_LIMIT = 8;

export interface PurchasedProductInterface {
    name: string;
    category: ProductCategoryEnum;
    timesBought: number;
    lastPurchase: string;
}

/** One entry per product ever bought, most often bought first, with its latest details. */
export function distinctPurchasedProducts(
    receipts: ReceiptInterface[],
): PurchasedProductInterface[] {
    const products = new Map<string, PurchasedProductInterface>();

    for (const receipt of receipts) {
        for (const item of receipt.items) {
            const key = item.name.trim().toLowerCase();
            const existing = products.get(key);
            if (!existing) {
                products.set(key, {
                    name: item.name.trim(),
                    category: item.category,
                    timesBought: 1,
                    lastPurchase: receipt.date,
                });
                continue;
            }
            existing.timesBought += 1;
            if (new Date(receipt.date) > new Date(existing.lastPurchase)) {
                existing.lastPurchase = receipt.date;
                existing.category = item.category;
                existing.name = item.name.trim();
            }
        }
    }

    return [...products.values()].sort((a, b) => b.timesBought - a.timesBought);
}

export function searchPurchasedProducts(
    products: PurchasedProductInterface[],
    term: string,
    limit = SUGGESTION_LIMIT,
): PurchasedProductInterface[] {
    const needle = term.trim().toLowerCase();
    if (needle.length === 0) {
        return products.slice(0, limit);
    }
    return products
        .filter((product) => product.name.toLowerCase().includes(needle))
        .slice(0, limit);
}

export function usePurchasedProducts() {
    return { distinctPurchasedProducts, searchPurchasedProducts };
}
