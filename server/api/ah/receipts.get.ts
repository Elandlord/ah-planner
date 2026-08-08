import { ahGraphQl, getValidAccessToken } from '~~/server/utils/ahApi';
import { mapReceiptProducts } from '~~/server/utils/ahReceiptMapper';
import type { AhReceiptProduct } from '~~/server/utils/ahReceiptMapper';
import type AhSyncedReceiptInterface from '~/types/AhSyncedReceiptInterface';

const MAX_RECEIPTS_PER_SYNC = 50;
const RECEIPTS_PAGE_SIZE = 100;

const RECEIPTS_QUERY = `query Receipts($offset: Int!, $limit: Int!) {
    posReceiptsPage(pagination: {offset: $offset, limit: $limit}) {
        posReceipts {
            id
            dateTime
            totalAmount { amount }
        }
    }
}`;

const RECEIPT_DETAILS_QUERY = `query Receipt($id: String!) {
    posReceiptDetails(id: $id) {
        id
        products {
            id
            name
            quantity
            price { amount }
            amount { amount }
        }
        discounts {
            name
            amount { amount }
        }
        payments {
            method
            amount { amount }
        }
    }
}`;

interface ReceiptsResponse {
    posReceiptsPage?: {
        posReceipts?: {
            id: string;
            dateTime: string;
            totalAmount?: { amount?: number };
        }[];
    };
}

interface ReceiptDetailsResponse {
    posReceiptDetails?: {
        products?: AhReceiptProduct[];
        discounts?: { amount?: { amount?: number } }[];
        payments?: { method?: string; amount?: { amount?: number } }[];
    };
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const knownIds = typeof query.knownIds === 'string' && query.knownIds.length > 0
        ? new Set(query.knownIds.split(','))
        : new Set<string>();

    const accessToken = await getValidAccessToken();
    const page = await ahGraphQl<ReceiptsResponse>(
        RECEIPTS_QUERY,
        { offset: 0, limit: RECEIPTS_PAGE_SIZE },
        accessToken,
    );
    const summaries = page.posReceiptsPage?.posReceipts ?? [];

    const newSummaries = summaries
        .filter((summary) => !knownIds.has(summary.id))
        .slice(0, MAX_RECEIPTS_PER_SYNC);

    const receipts: AhSyncedReceiptInterface[] = [];
    for (const summary of newSummaries) {
        const detail = await ahGraphQl<ReceiptDetailsResponse>(
            RECEIPT_DETAILS_QUERY,
            { id: summary.id },
            accessToken,
        );
        const details = detail.posReceiptDetails;
        receipts.push({
            transactionId: summary.id,
            date: summary.dateTime,
            total: summary.totalAmount?.amount ?? 0,
            discountTotal: (details?.discounts ?? [])
                .reduce((sum, discount) => sum + (discount.amount?.amount ?? 0), 0),
            payments: (details?.payments ?? [])
                .filter((payment) => payment.method)
                .map((payment) => ({
                    method: payment.method ?? '',
                    amount: payment.amount?.amount ?? 0,
                })),
            items: mapReceiptProducts(details?.products ?? []),
        });
    }

    return { receipts, totalAvailable: summaries.length };
});
