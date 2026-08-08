const PACK_PATTERN = /\b\d+\s*-?\s*(pack|pck|stuks)\b/i;
/** Nearly every query carries the house brand, so it says nothing about relevance. */
const IGNORED_WORDS = ['ah', 'biologisch', 'bio'];
const ORGANIC_PATTERN = /\b(biologisch|biologische|bio)\b/i;
const MULTIPACK_PENALTY = 0.35;
const ORGANIC_PENALTY = 0.15;
/** Titles this close together describe the same thing, so price decides between them. */
const SCORE_TOLERANCE = 0.4;
/** Dutch product names end on the thing itself: "Griekse feta" is feta, "feta dip" is dip. */
const HEAD_NOUN_BONUS = 0.6;

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
    const multipackPenalty = PACK_PATTERN.test(title) && !PACK_PATTERN.test(query)
        ? MULTIPACK_PENALTY
        : 0;
    /** Organic costs more, so it only wins when the recipe asked for it. */
    const organicPenalty = ORGANIC_PATTERN.test(title) && !ORGANIC_PATTERN.test(query)
        ? ORGANIC_PENALTY
        : 0;

    const head = queryWords[queryWords.length - 1];
    const titleHead = titleWords[titleWords.length - 1];
    const headBonus = titleHead === head || titleHead.startsWith(head) ? HEAD_NOUN_BONUS : 0;

    return coverage * 2 + tightness + exact + headBonus - multipackPenalty - organicPenalty;
}

function priceOf(product: MatchableProduct): number {
    return product.currentPrice ?? product.priceBeforeBonus ?? Number.POSITIVE_INFINITY;
}

export function pickBestProduct<T extends MatchableProduct>(query: string, products: T[]): T | null {
    const scored = products
        .map((product) => ({ product, score: matchScore(query, product.title ?? '') }))
        .filter((entry) => entry.score > 0);

    if (scored.length === 0) {
        return products[0] ?? null;
    }

    const bestScore = Math.max(...scored.map((entry) => entry.score));
    const contenders = scored.filter((entry) => entry.score >= bestScore - SCORE_TOLERANCE);

    return contenders
        .sort((a, b) => priceOf(a.product) - priceOf(b.product))[0].product;
}
