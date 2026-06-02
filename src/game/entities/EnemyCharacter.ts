import { CharacterTemplate, CharacterConfig } from './CharacterTemplate';
import { CombatAction, EnemyCombatAction } from './CombatTypes';

export enum EnemyType {
    MINION = 'Minion',
    ELITE  = 'Elite',
    BOSS   = 'Boss',
}

export interface EnemyCharacterConfig extends CharacterConfig {
    enemyType:          EnemyType;
    level?:             number;
    experienceReward?:  number;
    goldReward?:        number;
}

export abstract class EnemyCharacter extends CharacterTemplate {
    abstract readonly idleAnimKey:   string;
    abstract readonly hitAnimKey:    string;
    abstract readonly deathAnimKey:  string;
    abstract readonly defendAnimKey: string;

    abstract chooseAction():          CombatAction;
    abstract chooseAttackSequence():  EnemyCombatAction[];
    abstract chooseTarget<T extends { isAlive: boolean }>(players: T[]): T | null;

    private readonly enemyType:         EnemyType;
    private readonly level:             number;
    private readonly experienceReward:  number;
    private readonly goldReward:        number;

    constructor(config: EnemyCharacterConfig) {
        super(config);
        this.enemyType        = config.enemyType;
        this.level            = config.level ?? 1;
        this.experienceReward = config.experienceReward ?? this.calculateDefaultExpReward();
        this.goldReward       = config.goldReward       ?? this.calculateDefaultGoldReward();
    }

    private calculateDefaultExpReward(): number {
        return Math.floor(10 * this.level * this.getTypeMultiplier());
    }

    private calculateDefaultGoldReward(): number {
        return Math.floor(5 * this.level * this.getTypeMultiplier());
    }

    private getTypeMultiplier(): number {
        switch (this.enemyType) {
            case EnemyType.MINION: return 1;
            case EnemyType.ELITE:  return 2.5;
            case EnemyType.BOSS:   return 5;
            default:               return 1;
        }
    }

    getEnemyType(): EnemyType { return this.enemyType; }
    getLevel():     number    { return this.level; }
    getExperienceReward(): number { return this.experienceReward; }
    getGoldReward():       number { return this.goldReward; }
    isBoss():  boolean { return this.enemyType === EnemyType.BOSS; }
    isElite(): boolean { return this.enemyType === EnemyType.ELITE; }

    getInfo(): string {
        return `${this.getName()} (Lv.${this.level} ${this.enemyType})`;
    }
}
