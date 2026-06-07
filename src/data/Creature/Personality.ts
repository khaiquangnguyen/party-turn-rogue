export type HappinessEvent =
    | 'expedition'
    | 'eating'
    | 'idle'
    | 'cloudy'
    | 'fasting'
    | 'beauty';

export abstract class Personality {
    abstract readonly name: string;
    // Returns happiness gained when this event occurs.
    // For 'beauty' events, pass the creature's beautyStats as value.
    abstract happinessGain(event: HappinessEvent, value?: number): number;
}

export class AdventureSpirit extends Personality {
    readonly name = 'Adventure Spirit';
    happinessGain(event: HappinessEvent): number {
        return event === 'expedition' ? 3 : 0;
    }
}

export class Foodie extends Personality {
    readonly name = 'Foodie';
    happinessGain(event: HappinessEvent): number {
        return event === 'eating' ? 3 : 0;
    }
}

export class Sloth extends Personality {
    readonly name = 'Sloth';
    happinessGain(event: HappinessEvent): number {
        return event === 'idle' ? 3 : 0;
    }
}

export class CloudLover extends Personality {
    readonly name = 'Cloud Lover';
    happinessGain(event: HappinessEvent): number {
        return event === 'cloudy' ? 3 : 0;
    }
}

export class Ascetic extends Personality {
    readonly name = 'Ascetic';
    happinessGain(event: HappinessEvent): number {
        return event === 'fasting' ? 3 : 0;
    }
}

export class Vain extends Personality {
    readonly name = 'Vain';
    // value = creature's beautyStats; falls back to 1 if not provided
    happinessGain(event: HappinessEvent, value = 1): number {
        return event === 'beauty' ? value : 0;
    }
}

export const ALL_PERSONALITIES: readonly Personality[] = [
    new AdventureSpirit(),
    new Foodie(),
    new Sloth(),
    new CloudLover(),
    new Ascetic(),
    new Vain(),
];
