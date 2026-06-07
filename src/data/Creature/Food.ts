export type FoodTaste =
    | 'Sweet' | 'Salty' | 'Sour' | 'Bitter' | 'Spicy' | 'Earthy' | 'Electric'
    | 'Misty' | 'Frosty' | 'Radiant' | 'Airy';

export const ALL_TASTES: readonly FoodTaste[] = [
    'Sweet', 'Salty', 'Sour', 'Bitter', 'Spicy', 'Earthy', 'Electric',
    'Misty', 'Frosty', 'Radiant', 'Airy',
];

export type TasteSentiment = 'like' | 'dislike';

export interface TastePreference {
    readonly taste:     FoodTaste;
    readonly sentiment: TasteSentiment;
}

export function pickRandomTastePreferences(count = 2): TastePreference[] {
    const shuffled = [...ALL_TASTES].sort(() => Math.random() - 0.5);
    const picked   = shuffled.slice(0, Math.min(count, shuffled.length));
    return picked.map(taste => ({
        taste,
        sentiment: Math.random() < 0.5 ? 'like' : 'dislike',
    }));
}

export abstract class Food {
    abstract readonly name:        string;
    abstract readonly description: string;
    abstract readonly taste:       FoodTaste;
}

// Rare, magical, or world-specific foods that are not berries.
export abstract class SpecialFood extends Food {}

// Standard berries found across the world.
export abstract class Berry extends Food {}

export class EdibleLightning extends SpecialFood {
    readonly name        = 'Edible Lightning';
    readonly description = 'A crackling bolt of condensed electrical energy, safely edible for storm creatures.';
    readonly taste:       FoodTaste = 'Electric';
}

export class EdibleCloud extends SpecialFood {
    readonly name        = 'Edible Cloud';
    readonly description = 'A soft, billowing mass of flavored cloud matter favoured by sky creatures.';
    readonly taste:       FoodTaste = 'Sweet';
}
