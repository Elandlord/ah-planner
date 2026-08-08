import { ahFetch, getAnonymousAccessToken, getStoredTokens, getValidAccessToken } from '~~/server/utils/ahApi';
import type AhProductInterface from '~/types/AhProductInterface';

const MAX_CANDIDATES = 20;

interface SearchProduct {
    webshopId?: number;
    title?: string;
    brand?: string;
    salesUnitSize?: string;
    priceBeforeBonus?: number;
    currentPrice?: number;
    isBonus?: boolean;
    bonusMechanism?: string;
    images?: { url?: string }[];
}

interface SearchResponse {
    products?: SearchProduct[];
}

interface ResolvedSuggestion {
    query: string;
    product: AhProductInterface | null;
    bonusMechanism: string | null;
}

function mapProduct(product: SearchProduct): AhProductInterface {
    const price = product.priceBeforeBonus ?? product.currentPrice ?? 0;
    const current = product.currentPrice ?? price;
    return {
        id: product.webshopId ?? 0,
        title: product.title ?? '',
        brand: product.brand ?? '',
        salesUnitSize: product.salesUnitSize ?? '',
        price,
        bonusPrice: product.isBonus && current < price ? current : null,
        isBonus: product.isBonus ?? false,
        imageUrl: product.images?.length ? (product.images[0].url ?? null) : null,
    };
}

export default defineEventHandler(async (event) => {
    const body = await readBody<{ names?: string[] }>(event);
    const names = (body.names ?? []).slice(0, MAX_CANDIDATES);
    if (names.length === 0) {
        return { suggestions: [] };
    }

    const stored = await getStoredTokens();
    const accessToken = stored ? await getValidAccessToken() : await getAnonymousAccessToken();

    const suggestions: ResolvedSuggestion[] = [];
    for (const name of names) {
        try {
            const response = await ahFetch<SearchResponse>(
                `/mobile-services/product/search/v2?query=${encodeURIComponent(name)}&sortOn=RELEVANCE`,
                accessToken,
            );
            const first = response.products?.length ? response.products[0] : null;
            suggestions.push({
                query: name,
                product: first ? mapProduct(first) : null,
                bonusMechanism: first?.bonusMechanism ?? null,
            });
        } catch {
            suggestions.push({ query: name, product: null, bonusMechanism: null });
        }
    }

    return { suggestions };
});
