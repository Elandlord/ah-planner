export interface ListAddRequestItem {
    productId: number;
    quantity: number;
    name?: string;
}

export interface AhListPatchItem {
    description: string;
    productId: number;
    quantity: number;
    type: 'SHOPPABLE';
    originCode: 'PRD';
    searchTerm: string;
    strikeThrough: false;
}

/** AH rejects the whole PATCH with "Failed to read request" when strikeThrough is absent. */
export function buildListPatchItems(items: ListAddRequestItem[]): AhListPatchItem[] {
    return items
        .filter((item) => item.productId > 0 && item.quantity > 0)
        .map((item) => {
            const description = item.name?.trim() || `Product ${item.productId}`;
            return {
                description,
                productId: item.productId,
                quantity: item.quantity,
                type: 'SHOPPABLE' as const,
                originCode: 'PRD' as const,
                searchTerm: description,
                strikeThrough: false as const,
            };
        });
}
