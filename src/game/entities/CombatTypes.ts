import { DamageType } from './CharacterState';

export enum MoveType {
    OnGround      = 0,
    OnAir         = 1,
    ForceGround   = 2,
    ForceAir      = 3,
    ComboFinisher = 4,
}

export enum AttackDirection {
    UP    = 0,
    DOWN  = 1,
    LEFT  = 2,
    RIGHT = 3,
}

// ── Combat effect ─────────────────────────────────────────────────────────────

export abstract class CombatEffect {
    abstract description: string;
    apply(_target: ICombatTarget): void {}
}

// ── Combat target ─────────────────────────────────────────────────────────────

export interface ICombatTarget {
    damage(amount: number, type: DamageType): number;
    applyEffect(effect: CombatEffect): void;
}

// ── Input ─────────────────────────────────────────────────────────────────────

export class CombatActionInput {
    readonly waitTillNextInputDuration: number;
    readonly inputDirection:            AttackDirection;

    constructor(waitTillNextInputDuration: number, inputDirection: AttackDirection) {
        this.waitTillNextInputDuration = waitTillNextInputDuration;
        this.inputDirection            = inputDirection;
    }
}

// ── Hit / QTE types ───────────────────────────────────────────────────────────

export interface HitInfo {
    damage:     number;
    direction:  AttackDirection;
    damageType: DamageType;
}

export interface ActionResult {
    type:       'attack' | 'defend';
    hits:       HitInfo[];
    animation?: string;
    message:    string;
}

export enum QTEEventType {
    Parry       = 'Parry',
    Interrupted = 'Interrupted',
}

export interface QTEInput {
    timestamp: number;
    direction: AttackDirection;
}

export interface QTEOutcome {
    type:      QTEEventType | 'None';
    direction: AttackDirection;
}

// ── Enemy combat action (V2) ──────────────────────────────────────────────────

export interface EnemyCombatActionConfig {
    name:      string;
    animation: string;
    duration:  number;
    direction: AttackDirection;
    damage?:   number;
}

export class EnemyCombatAction {
    readonly name:      string;
    readonly animation: string;
    readonly duration:  number;
    readonly direction: AttackDirection;
    readonly damage:    number;

    constructor(config: EnemyCombatActionConfig) {
        this.name      = config.name;
        this.animation = config.animation;
        this.duration  = config.duration;
        this.direction = config.direction;
        this.damage    = config.damage ?? 10;
    }
}

// ── Attack multiplier ─────────────────────────────────────────────────────────

export class AttackMultiplier {
    comboLength:         number = 1;
    airDamageMultiplier: number = 1;
    extraDamage:         number = 0;

    get finalMultiplier(): number {
        return this.comboLength * this.airDamageMultiplier;
    }
}

// ── Combat action ─────────────────────────────────────────────────────────────

export interface ActionConfig {
    name:                 string;
    animation:            string;
    input?:               CombatActionInput;
    moveTypes?:           MoveType[];
    damage?:              number;
    damageChainModifier?: number;
    energyCost?:          number;
    effects?:             CombatEffect[];
}

export class CombatAction {
    readonly name:      string;
    readonly animation: string;
    readonly input:     CombatActionInput | null;

    moveTypes:           MoveType[];
    damage:              number;
    damageChainModifier: number;
    energyCost:          number;
    effects:             CombatEffect[];

    constructor(config: ActionConfig) {
        this.name                = config.name;
        this.animation           = config.animation;
        this.input               = config.input               ?? null;
        this.moveTypes           = config.moveTypes           ?? [];
        this.damage              = config.damage              ?? 8;
        this.damageChainModifier = config.damageChainModifier ?? 1.1;
        this.energyCost          = config.energyCost          ?? 1;
        this.effects             = config.effects             ?? [];
    }

    execute(target: ICombatTarget, multiplier = new AttackMultiplier()): number {
        const dealt = target.damage(Math.round(this.damage * multiplier.finalMultiplier + multiplier.extraDamage), DamageType.PHYSICAL);
        for (const effect of this.effects) {
            effect.apply(target);
        }
        return dealt;
    }
}

export class CombatSpecialAction extends CombatAction {
    constructor(config: Omit<ActionConfig, 'energyCost'>) {
        super({ ...config, energyCost: 0 });
    }
}

// ── Dancer combat actions ─────────────────────────────────────────────────────

export interface DancerActionConfig extends ActionConfig {
    baseRating?: number;
}

export class DancerCombatAction extends CombatAction {
    readonly baseRating: number;

    constructor(config: DancerActionConfig) {
        super(config);
        this.baseRating = config.baseRating ?? 1;
    }
}

export class DancerCombatSpecialAction extends DancerCombatAction {
    constructor(config: Omit<DancerActionConfig, 'energyCost'>) {
        super({ ...config, energyCost: 0 });
    }
}
