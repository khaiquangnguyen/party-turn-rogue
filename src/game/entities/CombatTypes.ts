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

// Tokens-spent-this-turn gate on special actions.
// 'any'         — total tokens spent (any direction) must reach `total`.
// 'directional' — each direction in `perDir` must have that many tokens spent.
export type TokenSpentRequirement =
    | { mode: 'any';         total:  number }
    | { mode: 'directional'; perDir: Partial<Record<AttackDirection, number>> };

// ── Combat effect ─────────────────────────────────────────────────────────────

export abstract class CombatEffect {
    abstract description: string;
    apply(_target: ICombatTarget): void {}
}

// ── Combat target ─────────────────────────────────────────────────────────────

export interface ICombatTarget {
    damage(amount: number): number;
    applyEffect(effect: CombatEffect): void;
}

// ── Input ─────────────────────────────────────────────────────────────────────

export type TapStep   = { key: AttackDirection;   waitMs: number; holdMs?: number };
export type ChordStep = { keys: AttackDirection[]; waitMs: number };
export type SequenceStep = TapStep | ChordStep;

export function isChordStep(s: SequenceStep): s is ChordStep { return 'keys' in s; }

export interface SpecialStage {
    input:                   CombatActionInput;
    animation:               string;
    damage?:                 number;
    playAnimationOnStageStart?: boolean;
}

export type ActionInputKey =
    | { type: 'direction'; direction: AttackDirection }
    | { type: 'special';   key: 1 | 2 | 3 | 4 }
    | { type: 'sequence';  steps: SequenceStep[] }
    | { type: 'hold';      direction: AttackDirection; durationMs: number }
    | { type: 'chord';     directions: AttackDirection[] };

export class CombatActionInput {
    readonly waitTillNextInputDuration: number;
    private readonly _spec: ActionInputKey;

    // Direction / special-key form:  new CombatActionInput(waitMs, direction | inputKey)
    // Sequence form:                 new CombatActionInput(steps)  — each step's waitMs is the delay before that key
    constructor(waitOrSteps: number | SequenceStep[], input?: AttackDirection | ActionInputKey) {
        if (Array.isArray(waitOrSteps)) {
            this._spec = { type: 'sequence', steps: waitOrSteps };
            this.waitTillNextInputDuration = 0;
        } else {
            this.waitTillNextInputDuration = waitOrSteps;
            this._spec = typeof input === 'number'
                ? { type: 'direction', direction: input as AttackDirection }
                : input as ActionInputKey;
        }
    }

    get inputDirection(): AttackDirection | null {
        return this._spec.type === 'direction' ? this._spec.direction : null;
    }

    get inputHold(): { direction: AttackDirection; durationMs: number } | null {
        return this._spec.type === 'hold' ? this._spec : null;
    }

    get inputChord(): AttackDirection[] | null {
        return this._spec.type === 'chord' ? this._spec.directions : null;
    }

    get inputSpecialKey(): (1 | 2 | 3 | 4) | null {
        return this._spec.type === 'special' ? this._spec.key : null;
    }

    // Keys only for tap-only sequences; null if sequence contains chord steps
    get inputSequence(): AttackDirection[] | null {
        if (this._spec.type !== 'sequence') return null;
        if (this._spec.steps.some(isChordStep)) return null;
        return (this._spec.steps as TapStep[]).map(s => s.key);
    }

    // Full steps with per-key wait durations
    get inputSequenceSteps(): SequenceStep[] | null {
        return this._spec.type === 'sequence' ? this._spec.steps : null;
    }
}

// ── Schedule overrides (set by combo mods at build time) ──────────────────────

export interface ScheduleEntryOverride {
    /** Convert a simple direction tap into a hold requiring this many ms */
    tapToHoldMs?: number;
}

// ── Hit / QTE types ───────────────────────────────────────────────────────────

export interface HitInfo {
    damage:    number;
    direction: AttackDirection;
}

export interface ActionResult {
    type:       'attack' | 'defend';
    hits:       HitInfo[];
    animation?: string;
    message:    string;
}

export enum QTEEventType {
    Parry       = 'Parry',
    WrongBlock  = 'WrongBlock',
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
        const dealt = target.damage(Math.round(this.damage * multiplier.finalMultiplier + multiplier.extraDamage));
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
    ratingReward?:        number;
    ratingRequirement?: number;
}

export class DancerCombatAction extends CombatAction {
    readonly ratingReward: number;

    constructor(config: DancerActionConfig) {
        super(config);
        this.ratingReward = config.ratingReward ?? 1;
    }
}

export type DancerSpecialActionConfig = Omit<DancerActionConfig, 'animation' | 'energyCost'> & {
    animation?:              string;
    stages?:                 SpecialStage[];
    ratingRequirement?:      number;
    tokenSpentRequirement?:  TokenSpentRequirement;
};

export class DancerCombatSpecialAction extends DancerCombatAction {
    readonly ratingRequirement:     number;
    readonly tokenSpentRequirement: TokenSpentRequirement | null;
    readonly stages:                SpecialStage[] | null;

    constructor(config: DancerSpecialActionConfig) {
        super({
            ...config,
            animation:  config.animation ?? config.stages?.[0]?.animation ?? '',
            damage:     config.damage    ?? config.stages?.[0]?.damage,
            energyCost: 0,
        });
        this.ratingRequirement     = config.ratingRequirement     ?? 0;
        this.tokenSpentRequirement = config.tokenSpentRequirement ?? null;
        this.stages                = config.stages                ?? null;
    }
}
