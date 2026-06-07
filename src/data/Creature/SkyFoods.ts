import { SpecialFood, FoodTaste } from './Food.ts';

export class NimbusFoam extends SpecialFood {
    readonly name        = 'Nimbus Foam';
    readonly description = 'A weightless froth scraped from the underside of low-hanging clouds. Dissolves on the tongue like a cool breath of mountain air.';
    readonly taste:       FoodTaste = 'Misty';
}

export class CirrusDrift extends SpecialFood {
    readonly name        = 'Cirrus Drift';
    readonly description = 'Thin, wispy strands of high-altitude cloud pulled into loose tangles. Leaves the faintest cool mist long after swallowed.';
    readonly taste:       FoodTaste = 'Misty';
}

export class HailstoneCandy extends SpecialFood {
    readonly name        = 'Hailstone Candy';
    readonly description = 'A pearl-white crystal that forms during violent hailstorms. Delivers a sharp, clean iciness that numbs the palate pleasantly.';
    readonly taste:       FoodTaste = 'Frosty';
}

export class FrostVeilShard extends SpecialFood {
    readonly name        = 'Frost Veil Shard';
    readonly description = 'A fragment of frozen cloud-mist that never fully melts. Carries a lingering cold that feels like breathing at a mountain summit.';
    readonly taste:       FoodTaste = 'Frosty';
}

export class SunbeamNectar extends SpecialFood {
    readonly name        = 'Sunbeam Nectar';
    readonly description = 'A warm golden liquid that pools at cloud gaps when sunlight filters through. Carries the gentle, honeyed warmth of a noon sky.';
    readonly taste:       FoodTaste = 'Radiant';
}

export class AuroraFlake extends SpecialFood {
    readonly name        = 'Aurora Flake';
    readonly description = 'A shimmering sliver that drifts down from aurora-lit skies. Tastes faintly luminous, like light given texture.';
    readonly taste:       FoodTaste = 'Radiant';
}

export class WindFloss extends SpecialFood {
    readonly name        = 'Wind Floss';
    readonly description = 'Gossamer threads spun from sustained high-altitude gales. Near-weightless, with a clean, open freshness like an endless open sky.';
    readonly taste:       FoodTaste = 'Airy';
}

export class ZephyrPuff extends SpecialFood {
    readonly name        = 'Zephyr Puff';
    readonly description = 'A light, hollow sphere formed by spiralling updrafts. Pops in the mouth releasing a rush of cool, odourless breeze.';
    readonly taste:       FoodTaste = 'Airy';
}

export const ALL_SKY_FOODS: readonly SpecialFood[] = [
    new NimbusFoam(),
    new CirrusDrift(),
    new HailstoneCandy(),
    new FrostVeilShard(),
    new SunbeamNectar(),
    new AuroraFlake(),
    new WindFloss(),
    new ZephyrPuff(),
];
