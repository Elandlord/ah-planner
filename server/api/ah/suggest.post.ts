import { ahFetch, getAnonymousAccessToken, getStoredTokens, getValidAccessToken } from '~~/server/utils/ahApi';
import { pickBestProduct } from '~~/server/utils/ahProductMatch';
import type AhProductInterface from '~/types/AhProductInterface';

const MAX_CANDIDATES = 60;
const CACHE_KEY = 'products.v5.json';

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

/** Bonus prices change weekly, so a cached lookup is only good for the day it was made. */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface CachedSuggestion extends ResolvedSuggestion {
    storedAt: number;
}

export default defineEventHandler(async (event) => {
    const body = await readBody<{ names?: string[] }>(event);
    const names = [...new Set(body.names ?? [])].slice(0, MAX_CANDIDATES);
    if (names.length === 0) {
        return { suggestions: [] };
    }

    const storage = useStorage('ah');
    const cache = (await storage.getItem<Record<string, CachedSuggestion>>(CACHE_KEY)) ?? {};
    const fresh = Date.now() - CACHE_TTL_MS;

    const suggestions: ResolvedSuggestion[] = [];
    const missing: string[] = [];
    for (const name of names) {
        const cached = cache[name];
        if (cached && cached.storedAt > fresh) {
            suggestions.push({
                query: cached.query,
                product: cached.product,
                bonusMechanism: cached.bonusMechanism,
            });
            continue;
        }
        missing.push(name);
    }

    if (missing.length === 0) {
        return { suggestions };
    }

    const stored = await getStoredTokens();
    const accessToken = stored ? await getValidAccessToken() : await getAnonymousAccessToken();

    for (const name of missing) {
        let resolved: ResolvedSuggestion = { query: name, product: null, bonusMechanism: null };
        try {
            const response = await ahFetch<SearchResponse>(
                `/mobile-services/product/search/v2?query=${encodeURIComponent(name)}&sortOn=RELEVANCE`,
                accessToken,
            );
            const best = pickBestProduct(name, response.products ?? []);
            resolved = {
                query: name,
                product: best ? mapProduct(best) : null,
                bonusMechanism: best?.bonusMechanism ?? null,
            };
        } catch {
            resolved = { query: name, product: null, bonusMechanism: null };
        }
        cache[name] = { ...resolved, storedAt: Date.now() };
        suggestions.push(resolved);
    }

    await storage.setItem(CACHE_KEY, cache);
    return { suggestions };
});
