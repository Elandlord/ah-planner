import type ReceiptInterface from '~/types/ReceiptInterface';

function startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function filterByWeek(receipts: ReceiptInterface[], weekOffset: number): ReceiptInterface[] {
    const now = new Date();
    const weekStart = startOfWeek(now);
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return receipts.filter((receipt) => {
        const date = new Date(receipt.date);
        return date >= weekStart && date < weekEnd;
    });
}

function filterByMonth(receipts: ReceiptInterface[], monthOffset: number): ReceiptInterface[] {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1);

    return receipts.filter((receipt) => {
        const date = new Date(receipt.date);
        return date >= targetMonth && date < monthEnd;
    });
}

function escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function toCsv(receipts: ReceiptInterface[]): string {
    const header = 'date,storeName,receiptTotal,itemName,quantity,price,category';
    const rows = receipts.flatMap((receipt) =>
        receipt.items.map((item) =>
            [
                escapeCsvField(receipt.date),
                escapeCsvField(receipt.storeName),
                receipt.total.toFixed(2),
                escapeCsvField(item.name),
                String(item.quantity),
                item.price.toFixed(2),
                escapeCsvField(item.category),
            ].join(','),
        ),
    );

    return [header, ...rows].join('\n');
}

function toJson(receipts: ReceiptInterface[]): string {
    return JSON.stringify(receipts, null, 2);
}

function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export {
    filterByWeek,
    filterByMonth,
    toCsv,
    toJson,
    downloadFile,
    escapeCsvField,
    startOfWeek,
};

export function useReceiptExport() {
    return {
        filterByWeek,
        filterByMonth,
        toCsv,
        toJson,
        downloadFile,
    };
}
