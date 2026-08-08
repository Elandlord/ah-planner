import type ReceiptInterface from '~/types/ReceiptInterface';
import type SpendingAdviceInterface from '~/types/SpendingAdviceInterface';
import type { SpendingAdviceItemInterface } from '~/types/SpendingAdviceInterface';

const TOP_LIMIT = 8;
const MIN_PURCHASES_FOR_GAP = 3;
const MIN_SAVING = 2;

interface ItemTotals {
    spend: number;
    quantity: number;
    prices: number[];
}

function collect(receipts: ReceiptInterface[]): Map<string, ItemTotals> {
    const totals = new Map<string, ItemTotals>();
    for (const receipt of receipts) {
        for (const item of receipt.items) {
            const entry = totals.get(item.name) ?? { spend: 0, quantity: 0, prices: [] };
            entry.spend += item.price * item.quantity;
            entry.quantity += item.quantity;
            entry.prices.push(item.price);
            totals.set(item.name, entry);
        }
    }
    return totals;
}

function toItem(name: string, totals: ItemTotals, tillTotal: number): SpendingAdviceItemInterface {
    const averagePrice = totals.quantity === 0 ? 0 : totals.spend / totals.quantity;
    const bestPrice = Math.min(...totals.prices);
    return {
        name,
        spend: totals.spend,
        share: tillTotal === 0 ? 0 : totals.spend / tillTotal,
        quantity: totals.quantity,
        averagePrice,
        bestPrice,
        potentialSaving: (averagePrice - bestPrice) * totals.quantity,
    };
}

export function adviseOnSpending(receipts: ReceiptInterface[]): SpendingAdviceInterface {
    const tillTotal = receipts.reduce((sum, receipt) => sum + receipt.total, 0);
    const discountTotal = receipts
        .reduce((sum, receipt) => sum + Math.abs(receipt.discountTotal ?? 0), 0);

    const entries = [...collect(receipts).entries()].map(([name, totals]) => ({
        item: toItem(name, totals, tillTotal),
        purchases: totals.prices.length,
    }));
    const items = entries.map((entry) => entry.item);

    const priceGaps = entries
        .filter((entry) => entry.purchases >= MIN_PURCHASES_FOR_GAP)
        .map((entry) => entry.item)
        .filter((item) => item.potentialSaving >= MIN_SAVING)
        .sort((a, b) => b.potentialSaving - a.potentialSaving)
        .slice(0, TOP_LIMIT);

    return {
        tillTotal,
        discountTotal,
        discountShare: tillTotal === 0 ? 0 : discountTotal / tillTotal,
        topSpenders: [...items].sort((a, b) => b.spend - a.spend).slice(0, TOP_LIMIT),
        priceGaps,
        totalPotentialSaving: items.reduce((sum, item) => sum + Math.max(item.potentialSaving, 0), 0),
        distinctItems: items.length,
    };
}

export function useSpendingAdvice() {
    return { adviseOnSpending };
}
