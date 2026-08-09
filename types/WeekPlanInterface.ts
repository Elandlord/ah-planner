import type MealSlotEnum from '~/types/MealSlotEnum';

type DayPlanInterface = Partial<Record<MealSlotEnum, string>>;
type WeekPlanInterface = Record<string, DayPlanInterface>;

export type { WeekPlanInterface as default, DayPlanInterface };
