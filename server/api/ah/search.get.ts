import { ahFetch, getAnonymousAccessToken, getStoredTokens, getValidAccessToken } from '~~/server/utils/ahApi';
import type AhProductInterface from '~/types/AhProductInterface';

interface SearchProduct {
    webshopId?: number;
    title?: string;
    brand?: string;
    salesUnitSize?: string;
    priceBeforeBonus?: number;
    currentPrice?: number;
    isBonus?: boolean;
    images?: { url?: string; width?: number }[];
}

interface SearchResponse {
    products?: SearchProduct[];
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
    const query = getQuery(event);
    const term = typeof query.query === 'string' ? query.query.trim() : '';
    if (!term) {
        throw createError({ statusCode: 400, statusMessage: 'Missing query' });
    }

    const stored = await getStoredTokens();
    const accessToken = stored ? await getValidAccessToken() : await getAnonymousAccessToken();

    const response = await ahFetch<SearchResponse>(
        `/mobile-services/product/search/v2?query=${encodeURIComponent(term)}&sortOn=RELEVANCE`,
        accessToken,
    );

    const products = (response.products ?? []).map(mapProduct);
    return { products };
});
