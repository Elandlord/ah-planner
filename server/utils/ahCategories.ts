import { ahFetch, getAnonymousAccessToken, getStoredTokens, getValidAccessToken } from '~~/server/utils/ahApi';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const CACHE_KEY = 'categories.json';

/** AH's own product taxonomy, folded onto the categories this app reports on. */
const AH_MAIN_CATEGORIES: Record<string, ProductCategoryEnum> = {
    'Aardappel, groente, fruit': ProductCategoryEnum.groente,
    'Groente, aardappelen': ProductCategoryEnum.groente,
    'Fruit, verse sappen': ProductCategoryEnum.fruit,
    Vlees: ProductCategoryEnum.vlees,
    Vleeswaren: ProductCategoryEnum.vlees,
    Vis: ProductCategoryEnum.vis,
    'Zuivel, eieren': ProductCategoryEnum.zuivel,
    Kaas: ProductCategoryEnum.zuivel,
    Bakkerij: ProductCategoryEnum.brood,
    'Brood, bakkerij': ProductCategoryEnum.brood,
    'Ontbijtgranen, beleg': ProductCategoryEnum.brood,
    'Frisdrank, sappen, water': ProductCategoryEnum.dranken,
    'Koffie, thee': ProductCategoryEnum.dranken,
    'Bier, wijn, aperitieven': ProductCategoryEnum.dranken,
    'Pasta, rijst, wereldkeuken': ProductCategoryEnum.pasta,
    'Soepen, sauzen, kruiden, olie': ProductCategoryEnum.kruiden,
    'Koek, snoep, chocolade': ProductCategoryEnum.snacks,
    'Borrel, chips, snacks': ProductCategoryEnum.snacks,
    Tussendoortjes: ProductCategoryEnum.snacks,
    Diepvries: ProductCategoryEnum.diepvries,
    Huishouden: ProductCategoryEnum.huishouden,
    Drogisterij: ProductCategoryEnum.huishouden,
    Huisdier: ProductCategoryEnum.huishouden,
    'Koken, tafelen, vrije tijd': ProductCategoryEnum.huishouden,
    'Baby en kind': ProductCategoryEnum.huishouden,
    'Maaltijden, salades': ProductCategoryEnum.maaltijden,
    'Vegetarisch, vegan en plantaardig': ProductCategoryEnum.vega,
};

interface SearchResponse {
    products?: { mainCategory?: string }[];
}

export function toCategory(mainCategory: string | undefined): ProductCategoryEnum | null {
    if (!mainCategory) {
        return null;
    }
    return AH_MAIN_CATEGORIES[mainCategory] ?? null;
}

async function readCache(): Promise<Record<string, string>> {
    return (await useStorage('ah').getItem<Record<string, string>>(CACHE_KEY)) ?? {};
}

async function accessToken(): Promise<string> {
    const stored = await getStoredTokens();
    return stored ? getValidAccessToken() : getAnonymousAccessToken();
}

/**
 * Resolves receipt names to AH's own category by searching for the abbreviated line text.
 * Results are cached because receipt names repeat across every sync.
 */
export async function resolveCategories(names: string[]): Promise<Record<string, string>> {
    const cache = await readCache();
    const unknown = [...new Set(names)].filter((name) => !(name in cache));
    if (unknown.length === 0) {
        return cache;
    }

    const token = await accessToken();
    for (const name of unknown) {
        try {
            const response = await ahFetch<SearchResponse>(
                `/mobile-services/product/search/v2?sortOn=RELEVANCE&query=${encodeURIComponent(name)}`,
                token,
            );
            const category = toCategory(response.products?.[0]?.mainCategory);
            if (category) {
                cache[name] = category;
            }
        } catch {
            continue;
        }
    }

    await useStorage('ah').setItem(CACHE_KEY, cache);
    return cache;
}
