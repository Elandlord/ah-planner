import type AhProductInterface from '~/types/AhProductInterface';
import type ProposalItemInterface from '~/types/ProposalItemInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import { useReceiptStore } from '~/stores/receiptStore';

const MIN_PURCHASES = 3;
const MAX_SUGGESTIONS = 20;
const LOOKAHEAD_DAYS = 7;
const MAX_OVERDUE_RATIO = 1.5;
const ABANDONED_INTERVAL_FACTOR = 3;
const ABANDONED_MIN_PURCHASES = 8;
const DUE_THRESHOLD = 1;
const MIN_VISIT_WEIGHT = 0.25;
const MAX_VISIT_WEIGHT = 2;
const BONUS_DUE_THRESHOLD = 0.6;
const MS_PER_DAY = 86_400_000;

export interface PurchasePattern {
    name: string;
    timesBought: number;
    weightedTimesBought: number;
    daysSinceLast: number;
    medianIntervalDays: number;
    typicalQuantity: number;
    overdueRatio: number;
    score: number;
}

interface ResolvedSuggestion {
    query: string;
    product: AhProductInterface | null;
    bonusMechanism: string | null;
}

export function median(values: number[]): number {
    if (values.length === 0) {
        return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
}

/**
 * Ratio of 1 means due now, allowing for the next few days of shopping.
 * Capped so an item forgotten for months cannot outrank a weekly staple.
 */
export function overdueRatio(daysSinceLast: number, medianIntervalDays: number): number {
    const ratio = (daysSinceLast + LOOKAHEAD_DAYS) / medianIntervalDays;
    return Math.min(ratio, MAX_OVERDUE_RATIO);
}

/**
 * A EUR 6 top-up is weaker evidence of a habit than a EUR 70 weekly shop,
 * so every visit counts relative to the median basket.
 */
export function visitWeight(receiptTotal: number, medianTotal: number): number {
    if (medianTotal <= 0) {
        return 1;
    }
    const weight = receiptTotal / medianTotal;
    return Math.min(Math.max(weight, MIN_VISIT_WEIGHT), MAX_VISIT_WEIGHT);
}

/** Frequent purchases carry a more trustworthy interval, so they outrank rare ones. */
export function patternScore(ratio: number, weightedTimesBought: number): number {
    return ratio * Math.sqrt(weightedTimesBought);
}

export function isAbandoned(
    daysSinceLast: number,
    medianIntervalDays: number,
    timesBought: number,
): boolean {
    if (timesBought >= ABANDONED_MIN_PURCHASES) {
        return false;
    }
    return daysSinceLast > medianIntervalDays * ABANDONED_INTERVAL_FACTOR;
}

/** Everything ever bought, most often bought first, so the whole history can be browsed. */
export function historyPatterns(receipts: ReceiptInterface[], now: number): PurchasePattern[] {
    return allPatterns(receipts, now).sort((a, b) => b.timesBought - a.timesBought);
}

export function buildPatterns(receipts: ReceiptInterface[], now: number): PurchasePattern[] {
    return allPatterns(receipts, now)
        .filter((pattern) => pattern.timesBought >= MIN_PURCHASES)
        .filter((pattern) => !isAbandoned(
            pattern.daysSinceLast,
            pattern.medianIntervalDays,
            pattern.timesBought,
        ))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SUGGESTIONS);
}

function allPatterns(receipts: ReceiptInterface[], now: number): PurchasePattern[] {
    const purchases = new Map<
        string,
        { dates: number[]; quantities: number[]; weights: Map<number, number>; label: string }
    >();
    const medianTotal = median(receipts.map((receipt) => receipt.total));

    for (const receipt of receipts) {
        const timestamp = new Date(receipt.date).getTime();
        const weight = visitWeight(receipt.total, medianTotal);
        for (const item of receipt.items) {
            const key = item.name.toLowerCase();
            const entry = purchases.get(key)
                ?? { dates: [], quantities: [], weights: new Map<number, number>(), label: item.name };
            entry.dates.push(timestamp);
            entry.quantities.push(item.quantity);
            entry.weights.set(timestamp, weight);
            purchases.set(key, entry);
        }
    }

    const patterns: PurchasePattern[] = [];

    for (const entry of purchases.values()) {
        const uniqueDates = [...new Set(entry.dates)].sort((a, b) => a - b);
        const intervals = uniqueDates
            .slice(1)
            .map((date, index) => (date - uniqueDates[index]) / MS_PER_DAY);
        const medianIntervalDays = Math.max(1, median(intervals));
        const daysSinceLast = Math.max(0, (now - uniqueDates[uniqueDates.length - 1]) / MS_PER_DAY);
        const timesBought = uniqueDates.length;
        const weightedTimesBought = uniqueDates
            .reduce((sum, date) => sum + (entry.weights.get(date) ?? 1), 0);
        const ratio = overdueRatio(daysSinceLast, medianIntervalDays);
        patterns.push({
            name: entry.label,
            timesBought,
            weightedTimesBought,
            daysSinceLast: Math.round(daysSinceLast),
            medianIntervalDays: Math.round(medianIntervalDays),
            typicalQuantity: Math.max(1, Math.round(median(entry.quantities))),
            overdueRatio: ratio,
            score: patternScore(ratio, weightedTimesBought),
        });
    }

    return patterns;
}

export function useSuggestions() {
    const receiptStore = useReceiptStore();

    async function resolve(patterns: PurchasePattern[], preselect: boolean): Promise<ProposalItemInterface[]> {
        if (patterns.length === 0) {
            return [];
        }

        const response = await $fetch<{ suggestions: ResolvedSuggestion[] }>('/api/ah/suggest', {
            method: 'POST',
            body: { names: patterns.map((pattern) => pattern.name) },
        });

        const resolvedByQuery = new Map(
            response.suggestions.map((suggestion) => [suggestion.query, suggestion]),
        );

        return patterns.map((pattern) => {
            const resolved = resolvedByQuery.get(pattern.name);
            const product = resolved?.product ?? null;
            const isBonus = product?.isBonus ?? false;
            const threshold = isBonus ? BONUS_DUE_THRESHOLD : DUE_THRESHOLD;
            return {
                name: pattern.name,
                product,
                bonusMechanism: resolved?.bonusMechanism ?? null,
                quantity: pattern.typicalQuantity,
                selected: preselect && pattern.overdueRatio >= threshold,
                timesBought: pattern.timesBought,
                daysSinceLast: pattern.daysSinceLast,
                medianIntervalDays: pattern.medianIntervalDays,
            };
        });
    }

    function buildProposal(): Promise<ProposalItemInterface[]> {
        return resolve(buildPatterns(receiptStore.receipts, Date.now()), true);
    }

    function historyNames(): PurchasePattern[] {
        return historyPatterns(receiptStore.receipts, Date.now());
    }

    function resolveNames(patterns: PurchasePattern[]): Promise<ProposalItemInterface[]> {
        return resolve(patterns, false);
    }

    return { buildProposal, historyNames, resolveNames };
}
