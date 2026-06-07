import { SpecialFood, Berry, EdibleCloud, EdibleLightning } from './Food.ts';
import { ALL_BERRIES                                       } from './Berries.ts';
import { ALL_SKY_FOODS                                     } from './SkyFoods.ts';

export const ALL_SPECIAL_FOODS: readonly SpecialFood[] = [
    new EdibleCloud(),
    new EdibleLightning(),
    ...ALL_SKY_FOODS,
];

export const ALL_BERRY_FOODS: readonly Berry[] = ALL_BERRIES;

export function pickRandomSpecialFoods(count: number): SpecialFood[] {
    return [...ALL_SPECIAL_FOODS].sort(() => Math.random() - 0.5).slice(0, count);
}

export function pickRandomBerries(count: number): Berry[] {
    return [...ALL_BERRY_FOODS].sort(() => Math.random() - 0.5).slice(0, count);
}
