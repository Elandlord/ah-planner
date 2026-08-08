import type ReceiptInterface from '~/types/ReceiptInterface';

export interface ReceiptMonthGroup {
    key: string;
    label: string;
    total: number;
    receipts: ReceiptInterface[];
}

const MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

export function monthKey(date: string): string {
    const parsed = new Date(date);
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(date: string): string {
    const label = new Date(date).toLocaleDateString('nl-NL', MONTH_FORMAT);
    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function groupByMonth(receipts: ReceiptInterface[]): ReceiptMonthGroup[] {
    const groups = new Map<string, ReceiptMonthGroup>();

    for (const receipt of receipts) {
        const key = monthKey(receipt.date);
        const group = groups.get(key) ?? {
            key,
            label: monthLabel(receipt.date),
            total: 0,
            receipts: [],
        };
        group.total += receipt.total;
        group.receipts.push(receipt);
        groups.set(key, group);
    }

    return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}
