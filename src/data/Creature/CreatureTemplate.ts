import { SupportPassive  } from './SupportPassive.ts';
import { Personality     } from './Personality.ts';
import { Food, SpecialFood } from './Food.ts';

// 'Gendered' means instances get a randomly assigned Male/Female; 'Genderless' means no gender at all.
export type SpeciesGender = 'Gendered' | 'Genderless';

export type CreatureConstructor = { new(): CreatureTemplate };

export function pickRandomPersonalities(pool: readonly Personality[], count = 2): Personality[] {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

export abstract class CreatureTemplate {
    abstract readonly name:           string;
    abstract readonly gender:         SpeciesGender;
    abstract readonly personalities:  readonly Personality[];
    abstract readonly gifUrl:         string | null;
    abstract readonly acceptableFoods:    readonly Food[];
    abstract readonly allowedSpecialFoods: readonly SpecialFood[];
    abstract readonly supportPassives:    readonly SupportPassive[];
    abstract readonly nextEvolution:  CreatureConstructor | null;
}
