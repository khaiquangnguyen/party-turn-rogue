export interface CharacterConfig {
    name:       string;
    maxHealth?: number;
    maxEnergy?: number;
    speed?:     number;
    attack?:    number;
}

export interface CharacterStats {
    speed:  number;
    attack: number;
}

export abstract class CharacterTemplate {
    protected readonly name: string;
    readonly maxHealth:      number;
    readonly maxEnergy:      number;
    readonly stats:          CharacterStats;

    constructor(config: CharacterConfig) {
        this.name      = config.name;
        this.maxHealth = config.maxHealth ?? 100;
        this.maxEnergy = config.maxEnergy ?? 50;
        this.stats = {
            speed:  config.speed  ?? 10,
            attack: config.attack ?? 10,
        };
    }

    getName(): string { return this.name; }

    abstract getInfo(): string;
}
