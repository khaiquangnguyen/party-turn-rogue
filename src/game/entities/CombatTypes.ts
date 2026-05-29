import { DamageType } from './CharacterState';

export enum MoveType {
    OnGround      = 0,
    OnAir         = 1,
    ForceGround   = 2,
    ForceAir      = 3,
    BaseAtkCombo1 = 4,
    BaseAtkCombo2 = 5,
    BaseAtkCombo3 = 6,
    BaseAtkCombo4 = 7,
    BaseAtkCombo5 = 8,
    Special1      = 9,
    Special2      = 10,
    Special3      = 11,
    Ultimate      = 12,
    Buff          = 13,
    Debuff        = 14,
    ComboStarter  = 15,
    ComboEnder    = 16,
}

export enum AttackDirection {
    UP    = 0,
    DOWN  = 1,
    LEFT  = 2,
    RIGHT = 3,
}

// Tuple: [timestamp_ms, direction]
export type InputStep = readonly [number, AttackDirection];

export class CombatActionInput {
    readonly inputDuration: number;
    readonly inputs: readonly InputStep[];

    constructor(inputDuration: number, inputs: readonly InputStep[]) {
        this.inputDuration = inputDuration;
        this.inputs        = inputs;
    }
}

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

export interface ActionConfig {
    name:                 string;
    animation:            string;
    input?:               CombatActionInput;
    moveTypes?:           MoveType[];
    damage?:              number;
    damageChainModifier?: number;
    energyCost?:          number;
    startUpScore?:        number;
    hitstunScore?:        number;
    totalScore?:          number;
    execute?:             (action: CombatAction) => ActionResult;
}

export class CombatAction {
    readonly name:      string;
    readonly animation: string;
    readonly input:     CombatActionInput | null;

    moveTypes:           MoveType[];
    damage:              number;
    damageChainModifier: number;
    energyCost:          number;
    startUpScore:        number;
    hitstunScore:        number;
    totalScore:          number;

    private readonly _execute?: (action: CombatAction) => ActionResult;

    constructor(config: ActionConfig) {
        this.name                = config.name;
        this.animation           = config.animation;
        this.input               = config.input               ?? null;
        this.moveTypes           = config.moveTypes           ?? [];
        this.damage              = config.damage              ?? 8;
        this.damageChainModifier = config.damageChainModifier ?? 1.1;
        this.energyCost          = config.energyCost          ?? 8;
        this.startUpScore        = config.startUpScore        ?? 10;
        this.hitstunScore        = config.hitstunScore        ?? 10;
        this.totalScore          = config.totalScore          ?? (this.startUpScore + this.hitstunScore);
        this._execute            = config.execute;
    }

    execute(): ActionResult {
        if (this._execute) return this._execute(this);
        return {
            type:      'attack',
            animation: this.animation,
            hits:      [{ damage: this.damage, direction: AttackDirection.RIGHT, damageType: DamageType.PHYSICAL }],
            message:   `${this.name}!`,
        };
    }
}
