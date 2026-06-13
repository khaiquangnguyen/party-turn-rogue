import {
    AttackDirection,
    CombatActionInput,
    DancerCombatAction,
    DancerCombatSpecialAction,
    MoveType,
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
        input: new CombatActionInput(400, DOWN),
        moveTypes: [OnGround],
        damage: 2,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike C', animation: 'swordComboC',
        input: new CombatActionInput(400, LEFT),
        moveTypes: [OnGround],
        damage: 2,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike D', animation: 'swordComboD',
        input: new CombatActionInput(500, RIGHT),
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
    // ── Ground slashes ────────────────────────────────────────────────────────
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

    // ── Air moves ─────────────────────────────────────────────────────────────
    new DancerCombatSpecialAction({
        name: 'Air Slash', animation: 'airSlash',
        input: new CombatActionInput([{ key: UP, waitMs: 250 }, { key: LEFT, waitMs: 250 }, { key: RIGHT, waitMs: 300 }]),
        moveTypes: [OnAir],
        damage: 8,
        ratingReward: 0, ratingRequirement: 2,
    }),
    new DancerCombatSpecialAction({
        name: 'Air Slash Up', animation: 'airSlashUp',
        input: new CombatActionInput([{ key: UP, waitMs: 250 }, { key: UP, waitMs: 250 }, { key: LEFT, waitMs: 300 }]),
        moveTypes: [OnAir],
        damage: 8,
        ratingReward: 0, ratingRequirement: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Air Slash Down', animation: 'airSlashDown',
        input: new CombatActionInput([{ key: UP, waitMs: 250 }, { key: RIGHT, waitMs: 250 }, { key: DOWN, waitMs: 400 }]),
        moveTypes: [OnAir, ForceGround],
        damage: 10,
        ratingReward: 0, ratingRequirement: 3,
    }),

    // ── Elemental / throws (combo finishers) ──────────────────────────────────
    new DancerCombatSpecialAction({
        name: 'Shock Light', animation: 'shockLight',
        input: new CombatActionInput([{ key: DOWN, waitMs: 250 }, { key: LEFT, waitMs: 250 }, { key: RIGHT, waitMs: 400 }]),
        moveTypes: [ComboFinisher],
        damage: 7,
        ratingReward: 0, ratingRequirement: 2,
    }),
    new DancerCombatSpecialAction({
        name: 'Shock Heavy', animation: 'shockHeavy',
        input: new CombatActionInput([{ key: DOWN, waitMs: 250 }, { key: DOWN, waitMs: 250 }, { key: LEFT, waitMs: 250 }, { key: RIGHT, waitMs: 900 }]),
        moveTypes: [ComboFinisher],
        damage: 14,
        ratingReward: 0, ratingRequirement: 3,
    }),
    new DancerCombatSpecialAction({
        name: 'Throw Underarm', animation: 'throwUnderarm',
        input: new CombatActionInput([{ key: LEFT, waitMs: 250 }, { key: DOWN, waitMs: 250 }, { key: RIGHT, waitMs: 400 }]),
        moveTypes: [ComboFinisher],
        damage: 7,
        ratingReward: 0, ratingRequirement: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Throw Overarm', animation: 'throwOverarm',
        input: new CombatActionInput([{ key: RIGHT, waitMs: 250 }, { key: DOWN, waitMs: 250 }, { key: LEFT, waitMs: 400 }]),
        moveTypes: [ComboFinisher],
        damage: 9,
        ratingReward: 0, ratingRequirement: 2,
    }),
    new DancerCombatSpecialAction({
        name: 'Ground Slam', animation: 'groundSlam',
        input: new CombatActionInput([{ key: DOWN, waitMs: 250 }, { key: LEFT, waitMs: 250 }, { key: DOWN, waitMs: 250 }, { key: RIGHT, waitMs: 900 }]),
        moveTypes: [ComboFinisher, ForceGround],
        damage: 12,
        ratingReward: 0, ratingRequirement: 3,
    }),
];

// ── Combined pool ─────────────────────────────────────────────────────────────

export const GRAND_DANCER_ACTION_LIST: DancerCombatAction[] = [
    ...GRAND_DANCER_BASIC_ACTIONS,
    ...GRAND_DANCER_BASIC_ACTIONS_2,
    ...GRAND_DANCER_SPECIAL_ACTIONS,
];
