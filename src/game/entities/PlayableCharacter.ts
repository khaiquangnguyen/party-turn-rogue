import { CharacterTemplate, CharacterConfig } from './CharacterTemplate';
import { CombatAction } from './CombatTypes';
import { actionStore } from '../../data/ActionStore';

export const PLAYER_SPRITE_PATH = 'src/resources/player_prototype';

export interface PlayableCharacterConfig extends CharacterConfig {
    interruptThreshold?: number;
}

export abstract class PlayableCharacter extends CharacterTemplate {
    abstract readonly idleAnimKey:          string;
    abstract readonly hitAnimKey:           string;
    abstract readonly deathAnimKey:         string;
    abstract readonly defendAnimKey:        string;
    abstract readonly counterAttackAnimKey: string;
    abstract readonly spritePath:           string;

    readonly actions:            CombatAction[];
    readonly interruptThreshold: number;

    constructor(config?: Partial<PlayableCharacterConfig>) {
        super({
            name:      'Player',
            maxHealth: 60,
            maxEnergy: 60,
            speed:     12,
            attack:    10,
            ...config,
        });
        this.actions            = actionStore.createActions();
        this.interruptThreshold = config?.interruptThreshold ?? 4;
    }

    getAction(name: string): CombatAction | undefined {
        return this.actions.find(a => a.name === name);
    }

    getInfo(): string { return this.getName(); }
}
