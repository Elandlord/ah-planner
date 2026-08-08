import type AhProductInterface from '~/types/AhProductInterface';

interface ProposalItemInterface {
    name: string;
    product: AhProductInterface | null;
    bonusMechanism: string | null;
    quantity: number;
    selected: boolean;
    timesBought: number;
    daysSinceLast: number;
    medianIntervalDays: number;
}

export type { ProposalItemInterface as default };
