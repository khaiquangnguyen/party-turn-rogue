// EnemyCharacter Class - Inherits from Character

import { Character, CharacterConfig } from './Character';

export enum EnemyType {
    MINION = 'Minion',
    ELITE = 'Elite',
    BOSS = 'Boss'
}

export interface EnemyCharacterConfig extends CharacterConfig {
    enemyType: EnemyType;
    level?: number;
    experienceReward?: number;
    goldReward?: number;
}

export class EnemyCharacter extends Character {
    private enemyType: EnemyType;
    private level: number;
    private experienceReward: number;
    private goldReward: number;

    constructor(config: EnemyCharacterConfig) {
        super(config);
        
        this.enemyType = config.enemyType;
        this.level = config.level ?? 1;
        this.experienceReward = config.experienceReward ?? this.calculateDefaultExpReward();
        this.goldReward = config.goldReward ?? this.calculateDefaultGoldReward();
    }

    private calculateDefaultExpReward(): number {
        const baseExp = 10;
        const typeMultiplier = this.getTypeMultiplier();
        return Math.floor(baseExp * this.level * typeMultiplier);
    }

    private calculateDefaultGoldReward(): number {
        const baseGold = 5;
        const typeMultiplier = this.getTypeMultiplier();
        return Math.floor(baseGold * this.level * typeMultiplier);
    }

    private getTypeMultiplier(): number {
        switch (this.enemyType) {
            case EnemyType.MINION:
                return 1;
            case EnemyType.ELITE:
                return 2.5;
            case EnemyType.BOSS:
                return 5;
            default:
                return 1;
        }
    }

    // Getters
    getEnemyType(): EnemyType {
        return this.enemyType;
    }

    getLevel(): number {
        return this.level;
    }

    getExperienceReward(): number {
        return this.experienceReward;
    }

    getGoldReward(): number {
        return this.goldReward;
    }

    // Check if this enemy is a boss
    isBoss(): boolean {
        return this.enemyType === EnemyType.BOSS;
    }

    // Check if this enemy is an elite
    isElite(): boolean {
        return this.enemyType === EnemyType.ELITE;
    }

    // Override getInfo for enemy-specific info
    getInfo(): string {
        return `${this.getName()} (Lv.${this.level} ${this.enemyType})`;
    }
}

