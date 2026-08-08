import type AhSyncedReceiptItemInterface from '~/types/AhSyncedReceiptItemInterface';

export interface AhReceiptProduct {
    id?: number;
    name?: string | null;
    quantity?: number | null;
    price?: { amount?: number | null } | null;
    amount?: { amount?: number | null } | null;
}

export function toUnitPrice(product: AhReceiptProduct): number {
    const unit = product.price?.amount;
    if (typeof unit === 'number' && unit > 0) {
        return unit;
    }
    const total = product.amount?.amount ?? 0;
    const quantity = product.quantity && product.quantity > 0 ? product.quantity : 1;
    return total / quantity;
}

export function mapReceiptProducts(products: AhReceiptProduct[]): AhSyncedReceiptItemInterface[] {
    return products
        .filter((product) => (product.name ?? '').trim().length > 0)
        .map((product) => ({
            name: (product.name ?? '').trim(),
            price: toUnitPrice(product),
            quantity: product.quantity && product.quantity > 0 ? product.quantity : 1,
        }));
}
