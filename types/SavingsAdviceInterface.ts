interface PremiumAdviceInterface {
    bioSpend: number;
    bioBenefit: number;
    zegelGain: number;
    cost: number;
    net: number;
    doubleStampingLikely: boolean;
}

interface StoreScenarioInterface {
    percentage: number;
    grossSaving: number;
    lostBenefits: number;
    net: number;
}

export type { PremiumAdviceInterface, StoreScenarioInterface };
