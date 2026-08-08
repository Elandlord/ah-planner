import type AhProductInterface from '~/types/AhProductInterface';

interface RecipeShoppingItemInterface {
    name: string;
    scaledAmount: string;
    packs: number;
    product: AhProductInterface | null;
    bonusMechanism: string | null;
    selected: boolean;
}

export type { RecipeShoppingItemInterface as default };
