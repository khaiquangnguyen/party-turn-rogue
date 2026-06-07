import { Berry, FoodTaste } from './Food.ts';

export class PechaBerry extends Berry {
    readonly name        = 'Pecha Berry';
    readonly description = 'A pink, sweet berry with a honey-like fragrance. Popular with gentle creatures.';
    readonly taste:       FoodTaste = 'Sweet';
}

export class OranBerry extends Berry {
    readonly name        = 'Oran Berry';
    readonly description = 'A small blue berry with a mild sweetness. Commonly found in meadows.';
    readonly taste:       FoodTaste = 'Sweet';
}

export class CheriBerry extends Berry {
    readonly name        = 'Cheri Berry';
    readonly description = 'A bright red berry packed with fiery heat. Loved by bold, strong-tempered creatures.';
    readonly taste:       FoodTaste = 'Spicy';
}

export class TamatoBerry extends Berry {
    readonly name        = 'Tamato Berry';
    readonly description = 'A large, round berry whose spiciness intensifies the more it ripens.';
    readonly taste:       FoodTaste = 'Spicy';
}

export class AspearBerry extends Berry {
    readonly name        = 'Aspear Berry';
    readonly description = 'A hard, pale-yellow berry with a sharp, lingering sourness.';
    readonly taste:       FoodTaste = 'Sour';
}

export class GanlonBerry extends Berry {
    readonly name        = 'Ganlon Berry';
    readonly description = 'A deep-blue berry that puckers the mouth with intense tartness.';
    readonly taste:       FoodTaste = 'Sour';
}

export class RawstBerry extends Berry {
    readonly name        = 'Rawst Berry';
    readonly description = 'A large, rough-skinned berry with a clean, long-lasting bitter note.';
    readonly taste:       FoodTaste = 'Bitter';
}

export class AguavBerry extends Berry {
    readonly name        = 'Aguav Berry';
    readonly description = 'A twisted green berry whose bitterness is said to clear a foggy mind.';
    readonly taste:       FoodTaste = 'Bitter';
}

export class PamtreBerry extends Berry {
    readonly name        = 'Pamtre Berry';
    readonly description = 'A dark violet berry with a briny, mineral flavour unusual among berries.';
    readonly taste:       FoodTaste = 'Salty';
}

export class CornBerry extends Berry {
    readonly name        = 'Cornn Berry';
    readonly description = 'A striped, starchy berry with a dry, grainy saltiness that clings to the tongue.';
    readonly taste:       FoodTaste = 'Salty';
}

export class KelpsyBerry extends Berry {
    readonly name        = 'Kelpsy Berry';
    readonly description = 'A blue, root-like berry that carries a deep, mossy earthiness from the soil.';
    readonly taste:       FoodTaste = 'Earthy';
}

export class WikiBerry extends Berry {
    readonly name        = 'Wiki Berry';
    readonly description = 'A rough, bark-coloured berry with a woody, earthy taste reminiscent of ancient forests.';
    readonly taste:       FoodTaste = 'Earthy';
}

export class WacanBerry extends Berry {
    readonly name        = 'Wacan Berry';
    readonly description = 'A crackling yellow berry that hums with stored electrical charge. Unique to storm-touched areas.';
    readonly taste:       FoodTaste = 'Electric';
}

export const ALL_BERRIES: readonly Berry[] = [
    new PechaBerry(),
    new OranBerry(),
    new CheriBerry(),
    new TamatoBerry(),
    new AspearBerry(),
    new GanlonBerry(),
    new RawstBerry(),
    new AguavBerry(),
    new PamtreBerry(),
    new CornBerry(),
    new KelpsyBerry(),
    new WikiBerry(),
    new WacanBerry(),
];
