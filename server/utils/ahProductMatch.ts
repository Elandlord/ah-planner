const PACK_PATTERN = /\b\d+\s*-?\s*(pack|pck|stuks)\b/i;
/** Nearly every query carries the house brand, so it says nothing about relevance. */
const IGNORED_WORDS = ['ah', 'biologisch', 'bio'];

export interface MatchableProduct {
    title?: string;
    priceBeforeBonus?: number;
    currentPrice?: number;
}

function words(value: string): string[] {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
}

/**
 * Relevance from the shop puts eggs first for "AH Uien", so rank on how completely and how
 * tightly a title covers the query instead of trusting the order.
 */
export function matchScore(query: string, title: string): number {
    const allQueryWords = words(query);
    const meaningful = allQueryWords.filter((word) => !IGNORED_WORDS.includes(word));
    const queryWords = meaningful.length > 0 ? meaningful : allQueryWords;
    const titleWords = words(title);
    if (queryWords.length === 0 || titleWords.length === 0) {
        return 0;
    }

    const covered = queryWords.filter((word) =>
        titleWords.some((candidate) => candidate === word || candidate.startsWith(word)));
    if (covered.length === 0) {
        return 0;
    }

    const coverage = covered.length / queryWords.length;
    const tightness = covered.length / titleWords.length;
    const exact = title.toLowerCase() === query.toLowerCase() ? 1 : 0;
    const multipackPenalty = PACK_PATTERN.test(title) && !PACK_PATTERN.test(query) ? 0.35 : 0;

    return coverage * 2 + tightness + exact - multipackPenalty;
}

export function pickBestProduct<T extends MatchableProduct>(query: string, products: T[]): T | null {
    let best: T | null = null;
    let bestScore = 0;
    let bestPrice = Number.POSITIVE_INFINITY;

    for (const product of products) {
        const score = matchScore(query, product.title ?? '');
        if (score <= 0) {
            continue;
        }
        const price = product.currentPrice ?? product.priceBeforeBonus ?? Number.POSITIVE_INFINITY;
        if (score > bestScore || (score === bestScore && price < bestPrice)) {
            best = product;
            bestScore = score;
            bestPrice = price;
        }
    }

    return best ?? products[0] ?? null;
}
