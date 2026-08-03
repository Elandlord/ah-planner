export function topEntries(frequency: Record<string, number>, limit: number): [string, number][] {
    return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit);
}

export function useItemFrequency() {
    return {
        topEntries,
    };
}
