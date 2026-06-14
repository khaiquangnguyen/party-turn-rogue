import {
    AttackDirection,
    CombatActionInput,
    DancerCombatAction,
    DancerCombatSpecialAction,
    MoveType,
    SpecialStage,
} from '../../game/entities/CombatTypes.ts';

const { UP, DOWN, LEFT, RIGHT } = AttackDirection;
const { OnGround, OnAir, ForceGround, ComboFinisher } = MoveType;

// ── Basic combat actions (one per direction) ──────────────────────────────────

export const GRAND_DANCER_BASIC_ACTIONS: DancerCombatAction[] = [
    new DancerCombatAction({
        name: 'Sword Strike A', animation: 'swordComboA',
        input: new CombatActionInput(300, UP),
        moveTypes: [OnGround],
        damage: 2,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike B', animation: 'swordComboB',
        input: new CombatActionInput(300, DOWN),
        moveTypes: [OnGround],
        damage: 2,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike C', animation: 'swordComboC',
        input: new CombatActionInput(150, LEFT),
        moveTypes: [OnGround],
        damage: 2,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike D', animation: 'swordComboD',
        input: new CombatActionInput(150, RIGHT),
        moveTypes: [OnGround],
        damage: 2,
        ratingReward: 0.2,
    }),
];

export const GRAND_DANCER_BASIC_ACTIONS_2: DancerCombatAction[] = [
    new DancerCombatAction({
        name: 'Sword Strike A2', animation: 'swordComboA',
        input: new CombatActionInput(300, UP),
        moveTypes: [OnGround],
        damage: 2,
        ratingReward: 0.5,
    }),
    new DancerCombatAction({
        name: 'Sword Strike B2', animation: 'swordComboB',
        input: new CombatActionInput(400, DOWN),
        moveTypes: [OnGround],
        damage: 1,
        ratingReward: 0.5,
    }),
    new DancerCombatAction({
        name: 'Sword Strike C2', animation: 'swordComboC',
        input: new CombatActionInput(400, LEFT),
        moveTypes: [OnGround],
        damage: 1,
        ratingReward: 0.5,
    }),
    new DancerCombatAction({
        name: 'Sword Strike D2', animation: 'swordComboD',
        input: new CombatActionInput(500, RIGHT),
        moveTypes: [OnGround],
        damage: 1,
        ratingReward: 0.5,
    }),
];

// ── Special actions ───────────────────────────────────────────────────────────
// Each special is triggered by entering its direction sequence (3–4 keys) during planning or combat.

export const GRAND_DANCER_SPECIAL_ACTIONS: DancerCombatSpecialAction[] = [
    // ── Ground slashes (single-stage) ─────────────────────────────────────────
    new DancerCombatSpecialAction({
        name: 'Standing Slash', animation: 'standingSlash',
        input: new CombatActionInput([{ key: UP, waitMs: 250 }, { key: UP, waitMs: 250 }, { key: DOWN, waitMs: 300 }]),
        moveTypes: [OnGround],
        damage: 9,
        ratingReward: 0, ratingRequirement: 2,
    }),
    new DancerCombatSpecialAction({
        name: 'Crouch Slash', animation: 'crouchSlash',
        input: new CombatActionInput([{ key: DOWN, waitMs: 250 }, { key: DOWN, waitMs: 250 }, { key: UP, waitMs: 300 }]),
        moveTypes: [OnGround],
        damage: 7,
        ratingReward: 0, ratingRequirement: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Sword Slash', animation: 'swordSlash01',
        input: new CombatActionInput([{ key: LEFT, waitMs: 250 }, { key: RIGHT, waitMs: 250 }, { key: LEFT, waitMs: 300 }]),
        moveTypes: [OnGround],
        damage: 7,
        ratingReward: 0, ratingRequirement: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Sword Run Slash', animation: 'swordRunSlash',
        input: new CombatActionInput([{ key: RIGHT, waitMs: 250 }, { key: RIGHT, waitMs: 250 }, { key: UP, waitMs: 300 }]),
        moveTypes: [OnGround],
        damage: 8,
        ratingReward: 0, ratingRequirement: 2,
    }),
    new DancerCombatSpecialAction({
        name: 'Sword Sprint Slash', animation: 'swordSprintSlash',
        input: new CombatActionInput([{ key: UP, waitMs: 250 }, { key: DOWN, waitMs: 250 }, { key: UP, waitMs: 400 }]),
        moveTypes: [OnGround],
        damage: 10,
        ratingReward: 0, ratingRequirement: 3,
    }),

    // ── Air Slash (multi-stage) ───────────────────────────────────────────────
    // Stage 1 → airSlash  |  Stage 2 → airSlashUp  |  Stage 3 → airSlashDown
    new DancerCombatSpecialAction({
        name: 'Air Slash',
        moveTypes: [OnAir],
        ratingReward: 0, ratingRequirement: 2,
        stages: [
            {
                input:     new CombatActionInput([{ key: UP, waitMs: 250 }, { key: LEFT, waitMs: 250 }, { key: RIGHT, waitMs: 300 }]),
                animation: 'airSlash',
                damage:    8,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: UP, waitMs: 300 }]),
                animation: 'airSlashUp',
                damage:    8,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: DOWN, waitMs: 400 }]),
                animation: 'airSlashDown',
                damage:    10,
            } as SpecialStage,
        ],
    }),

    // ── Combo finishers ───────────────────────────────────────────────────────

    // Shock (multi-stage): Stage 1 → shockLight  |  Stage 2 → shockHeavy
    new DancerCombatSpecialAction({
        name: 'Shock',
        moveTypes: [ComboFinisher],
        ratingReward: 0, ratingRequirement: 2,
        stages: [
            {
                input:     new CombatActionInput([{ key: DOWN, waitMs: 250 }, { key: LEFT, waitMs: 250 }, { key: RIGHT, waitMs: 400 }]),
                animation: 'shockLight',
                damage:    7,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: DOWN, waitMs: 300 }]),
                animation: 'shockHeavy',
                damage:    14,
            } as SpecialStage,
        ],
    }),

    // Throw (multi-stage): Stage 1 → throwUnderarm  |  Stage 2 → throwOverarm
    new DancerCombatSpecialAction({
        name: 'Throw',
        moveTypes: [ComboFinisher],
        ratingReward: 0, ratingRequirement: 1,
        stages: [
            {
                input:     new CombatActionInput([{ key: LEFT, waitMs: 250 }, { key: DOWN, waitMs: 250 }, { key: RIGHT, waitMs: 400 }]),
                animation: 'throwUnderarm',
                damage:    7,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: RIGHT, waitMs: 300 }]),
                animation: 'throwOverarm',
                damage:    9,
            } as SpecialStage,
        ],
    }),

    // Ground Slam (single-stage combo finisher)
    new DancerCombatSpecialAction({
        name: 'Ground Slam', animation: 'groundSlam',
        input: new CombatActionInput([{ key: DOWN, waitMs: 250 }, { key: LEFT, waitMs: 250 }, { key: DOWN, waitMs: 250 }, { key: RIGHT, waitMs: 900 }]),
        moveTypes: [ComboFinisher, ForceGround],
        damage: 12,
        ratingReward: 0, ratingRequirement: 3,
    }),

    // ── Kick Combo (multi-stage) ──────────────────────────────────────────────
    // Stage 1 → kickA  |  Stage 2 → kickB  |  Stage 3 → kickC
    new DancerCombatSpecialAction({
        name: 'Kick Combo',
        moveTypes: [OnGround],
        ratingReward: 0, ratingRequirement: 1,
        stages: [
            {
                input:     new CombatActionInput([{ key: RIGHT, waitMs: 250 }, { key: DOWN, waitMs: 250 }, { key: RIGHT, waitMs: 300 }]),
                animation: 'kickA',
                damage:    5,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: LEFT, waitMs: 300 }]),
                animation: 'kickB',
                damage:    6,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: UP, waitMs: 400 }]),
                animation: 'kickC',
                damage:    9,
            } as SpecialStage,
        ],
    }),

    // ── Punch Combo (multi-stage) ─────────────────────────────────────────────
    // Stage 1 → punchA  |  Stage 2 → punchB  |  Stage 3 → punchC
    new DancerCombatSpecialAction({
        name: 'Punch Combo',
        moveTypes: [OnGround],
        ratingReward: 0, ratingRequirement: 3,
        stages: [
            {
                input:     new CombatActionInput([{ key: LEFT, waitMs: 250 }, { key: LEFT, waitMs: 250 }, { key: RIGHT, waitMs: 300 }]),
                animation: 'punchA',
                damage:    1,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: RIGHT, waitMs: 300 }]),
                animation: 'punchB',
                damage:    2,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: DOWN, waitMs: 400 }]),
                animation: 'punchC',
                damage:    3,
            } as SpecialStage,
        ],
    }),

    // ── Fire Bow (multi-stage) ────────────────────────────────────────────────
    // Stage 1 → bowAim  |  Stage 2 → bowDraw  |  Stage 3 → bowFire
    // Requires 6 total input tokens spent this turn (any direction).
    new DancerCombatSpecialAction({
        name: 'Fire Bow',
        moveTypes: [OnGround],
        ratingReward: 0, ratingRequirement: 0,
        tokenSpentRequirement: { mode: 'any', total: 3 },
        stages: [
            {
                input:     new CombatActionInput([{ key: UP, waitMs: 200 },{ key: RIGHT, waitMs: 200, holdMs: 600 }]),
                animation: 'bowDraw',
                playAnimationOnStageStart: true,
                damage:    1,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: RIGHT, waitMs: 300 }]),
                animation: 'bowFire',
                damage:    1,
            } as SpecialStage,
        ],
    }),

    // ── Gun Combo (multi-stage) ───────────────────────────────────────────────
    // Stage 1 → gunFire  |  Stage 2 → gunFire  |  Stage 3 → gunReload  |  Stage 4 → gunRunFire
    // Requires 2 tokens spent of each direction this turn.
    new DancerCombatSpecialAction({
        name: 'Gun Combo',
        moveTypes: [OnGround],
        ratingReward: 0, ratingRequirement: 0,
        tokenSpentRequirement: {
            mode: 'directional',
            perDir: {
                [UP]:    1,
                [DOWN]:  1,
                [LEFT]:  1,
                [RIGHT]: 1,
            },
        },
        stages: [
            {
                input:     new CombatActionInput([{ key: RIGHT, waitMs: 500 }, { key: UP, waitMs: 500 }]),
                animation: 'gunFire',
                damage:    1,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: RIGHT, waitMs: 500 }]),
                animation: 'gunFire',
                damage:    1,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: DOWN, waitMs: 500 }, { key: LEFT, waitMs: 500 }]),
                animation: 'gunReload',
                damage:    1,
            } as SpecialStage,
            {
                input:     new CombatActionInput([{ key: RIGHT, waitMs: 500 }, { key: RIGHT, waitMs: 500 }]),
                animation: 'gunRunFire',
                damage:    1,
            } as SpecialStage,
        ],
    }),
];

// ── Combined pool ─────────────────────────────────────────────────────────────

export const GRAND_DANCER_ACTION_LIST: DancerCombatAction[] = [
    ...GRAND_DANCER_BASIC_ACTIONS,
    ...GRAND_DANCER_BASIC_ACTIONS_2,
    ...GRAND_DANCER_SPECIAL_ACTIONS,
];
