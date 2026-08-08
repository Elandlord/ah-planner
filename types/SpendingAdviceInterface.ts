interface SpendingAdviceItemInterface {
    name: string;
    spend: number;
    share: number;
    quantity: number;
    averagePrice: number;
    bestPrice: number;
    potentialSaving: number;
}

interface SpendingAdviceInterface {
    tillTotal: number;
    discountTotal: number;
    discountShare: number;
    topSpenders: SpendingAdviceItemInterface[];
    priceGaps: SpendingAdviceItemInterface[];
    totalPotentialSaving: number;
    distinctItems: number;
}

export type { SpendingAdviceInterface as default, SpendingAdviceItemInterface };
