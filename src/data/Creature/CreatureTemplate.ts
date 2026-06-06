import { Need            } from './Need.ts';
import { SupportPassive  } from './SupportPassive.ts';

export type Gender = 'Male' | 'Female' | 'Unknown';

export abstract class CreatureTemplate {
    abstract readonly name:             string;
    abstract readonly gender:           Gender;
    abstract readonly personalities:    readonly string[];
    abstract readonly needs:            readonly Need[];
    abstract readonly supportPassives:  readonly SupportPassive[];
}
