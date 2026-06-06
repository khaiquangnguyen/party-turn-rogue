import Phaser from 'phaser';
import { CharacterTemplate } from './CharacterTemplate';
import { PlayableCharacter } from './PlayableCharacter';
import { EnemyCharacter } from './EnemyCharacter';
import { HealthManager } from './HealthManager';
import { IEnergyManager, ManaEnergy } from './EnergyManager';
import { CombatEffect, ICombatTarget } from './CombatTypes';
import { Airborne } from './CombatEffects';
import { ActionDeck } from '../../data/ActionDeck.ts';
import { ComboModDeck } from '../../data/ComboMod/ComboMod.ts';

// ── Player combat config ──────────────────────────────────────────────────────

export interface PlayerCombatConfig {
    actionDeck:   ActionDeck;
    comboModDeck: ComboModDeck;
}

// ── Base ──────────────────────────────────────────────────────────────────────

export abstract class CombatSceneCharacter implements ICombatTarget {
    abstract readonly template: CharacterTemplate;
    abstract readonly isPlayer: boolean;

    abstract get idleAnimKey():          string;
    abstract get hitAnimKey():           string;
    abstract get deathAnimKey():         string;
    abstract get defendAnimKey():        string;
    abstract get counterAttackAnimKey(): string;

    sprite:        Phaser.GameObjects.Sprite | null = null;
    activeEffects: Map<Function, CombatEffect> = new Map();

    readonly healthManager: HealthManager;
    readonly energyManager: IEnergyManager;
    hasActedThisRound = false;

    get isAirborne(): boolean {
        return this.activeEffects.has(Airborne);
    }

    constructor(template: CharacterTemplate) {
        this.healthManager = new HealthManager(template.maxHealth);
        this.energyManager = new ManaEnergy(template.maxEnergy, 0);
    }

    get speed():   number  { return this.template.stats.speed; }
    get isAlive(): boolean { return this.healthManager.isAlive(); }
    get isDead():  boolean { return this.healthManager.isDead(); }

    damage(amount: number): number {
        return this.healthManager.damage(amount);
    }

    heal(amount: number): void {
        this.healthManager.heal(amount);
    }

    syncEffects(effects: Map<Function, CombatEffect>): void {
        this.activeEffects = new Map(effects);
    }

    applyEffect(effect: CombatEffect): void {
        effect.apply(this);
    }

    resetForNewRound(): void {
        this.hasActedThisRound = false;
    }

    resetStatusEffects(): void {
        this.activeEffects = new Map();
    }
}

// ── Playable ──────────────────────────────────────────────────────────────────

export class CombatScenePlayableCharacter extends CombatSceneCharacter {
    readonly template:     PlayableCharacter;
    readonly isPlayer      = true as const;
    readonly actionDeck:   ActionDeck;
    readonly comboModDeck: ComboModDeck;

    get idleAnimKey()          { return this.template.idleAnimKey; }
    get hitAnimKey()           { return this.template.hitAnimKey; }
    get deathAnimKey()         { return this.template.deathAnimKey; }
    get defendAnimKey()        { return this.template.defendAnimKey; }
    get counterAttackAnimKey() { return this.template.counterAttackAnimKey; }

    private constructor(template: PlayableCharacter, config: PlayerCombatConfig) {
        super(template);
        this.template     = template;
        this.actionDeck   = config.actionDeck;
        this.comboModDeck = config.comboModDeck;
    }

    static create(
        template: PlayableCharacter,
        config:   PlayerCombatConfig,
    ): CombatScenePlayableCharacter {
        return new CombatScenePlayableCharacter(template, config);
    }

    // V1 compat — does not require an ActionDeck; do not use in V2 input loop.
    static createLegacy(template: PlayableCharacter): CombatScenePlayableCharacter {
        return new CombatScenePlayableCharacter(template, null as unknown as PlayerCombatConfig);
    }

    onHit(): void {
        this.sprite?.play(this.hitAnimKey);
    }

    onParried(): void {
        this.sprite?.play(this.defendAnimKey);
    }

    performCounterAttack(): void {
        this.sprite?.play(this.counterAttackAnimKey);
    }
}

// ── Enemy ─────────────────────────────────────────────────────────────────────

export class CombatSceneEnemyCharacter extends CombatSceneCharacter {
    readonly template: EnemyCharacter;
    readonly isPlayer  = false as const;

    get idleAnimKey()          { return this.template.idleAnimKey; }
    get hitAnimKey()           { return this.template.hitAnimKey; }
    get deathAnimKey()         { return this.template.deathAnimKey; }
    get defendAnimKey()        { return this.template.defendAnimKey; }
    get counterAttackAnimKey() { return ''; }

    constructor(template: EnemyCharacter) {
        super(template);
        this.template = template;
    }
}
