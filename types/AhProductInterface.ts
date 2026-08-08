interface AhProductInterface {
    id: number;
    title: string;
    brand: string;
    salesUnitSize: string;
    price: number;
    bonusPrice: number | null;
    isBonus: boolean;
    imageUrl: string | null;
}

export type { AhProductInterface as default };
