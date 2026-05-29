import { Character, CharacterConfig } from './Character';
import { CombatAction } from './CombatTypes';
import { actionStore } from '../../data/ActionStore';

export const PLAYER_SPRITE_PATH = 'src/resources/player_prototype';

export interface PlayableCharacterConfig extends CharacterConfig {
    interruptThreshold?: number;
}

export class PlayableCharacter extends Character {
    readonly spritePath: string = PLAYER_SPRITE_PATH;
    readonly actions: CombatAction[];
    readonly interruptThreshold: number;

    constructor(config?: Partial<PlayableCharacterConfig>) {
        super({
            name:            'Player',
            maxHealth:       100,
            maxEnergy:       60,
            defense:         10,
            magicResistance: 5,
            parryChance:     0.10,
            blockReduction:  0.5,
            speed:           12,
            ...config,
        });
        this.actions = actionStore.createActions();
        this.interruptThreshold = config?.interruptThreshold ?? 4;
    }

    getAction(name: string): CombatAction | undefined {
        return this.actions.find(a => a.name === name);
    }

    getInfo(): string {
        return this.getName();
    }
}
