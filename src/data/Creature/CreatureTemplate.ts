import { Need            } from './Need.ts';
import { SupportPassive  } from './SupportPassive.ts';

export type Gender = 'Male' | 'Female' | 'Unknown';

export function pickRandomPersonalities(pool: readonly string[], count = 2): string[] {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

export abstract class CreatureTemplate {
    abstract readonly name:            string;
    abstract readonly gender:          Gender;
    abstract readonly personalities:   readonly string[];
    abstract readonly gifUrl:          string | null;
    abstract readonly needs:           readonly Need[];
    abstract readonly supportPassives: readonly SupportPassive[];
}
