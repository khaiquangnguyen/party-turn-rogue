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
        damage: 12,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike B', animation: 'swordComboB',
        input: new CombatActionInput(400, DOWN),
        moveTypes: [OnGround],
        damage: 8,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike C', animation: 'swordComboC',
        input: new CombatActionInput(400, LEFT),
        moveTypes: [OnGround],
        damage: 7,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike D', animation: 'swordComboD',
        input: new CombatActionInput(500, RIGHT),
        moveTypes: [OnGround],
        damage: 6,
        ratingReward: 0.2,
    }),
];

export const GRAND_DANCER_BASIC_ACTIONS_2: DancerCombatAction[] = [
    new DancerCombatAction({
        name: 'Sword Strike A2', animation: 'swordComboA',
        input: new CombatActionInput(300, UP),
        moveTypes: [OnGround],
        damage: 18,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike B2', animation: 'swordComboB',
        input: new CombatActionInput(400, DOWN),
        moveTypes: [OnGround],
        damage: 12,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike C2', animation: 'swordComboC',
        input: new CombatActionInput(400, LEFT),
        moveTypes: [OnGround],
        damage: 10,
        ratingReward: 0.2,
    }),
    new DancerCombatAction({
        name: 'Sword Strike D2', animation: 'swordComboD',
        input: new CombatActionInput(500, RIGHT),
        moveTypes: [OnGround],
        damage: 9,
        ratingReward: 0.2,
    }),
];

// ── Special actions ───────────────────────────────────────────────────────────

export const GRAND_DANCER_SPECIAL_ACTIONS: DancerCombatSpecialAction[] = [
    // ── Ground slashes ────────────────────────────────────────────────────────
    new DancerCombatSpecialAction({
        name: 'Standing Slash', animation: 'standingSlash',
        input: new CombatActionInput(300, { type: 'special', key: 1 }),
        moveTypes: [OnGround],
        damage: 9,
        ratingReward: 0, ratingRequirement: 2,
    }),
    new DancerCombatSpecialAction({
        name: 'Crouch Slash', animation: 'crouchSlash',
        input: new CombatActionInput(300, { type: 'special', key: 2 }),
        moveTypes: [OnGround],
        damage: 7,
        ratingReward: 0, ratingRequirement: 2,
    }),
    new DancerCombatSpecialAction({
        name: 'Sword Slash', animation: 'swordSlash01',
        input: new CombatActionInput(300, { type: 'special', key: 3 }),
        moveTypes: [OnGround],
        damage: 7,
        ratingReward: 0, ratingRequirement: 2,
    }),
    new DancerCombatSpecialAction({
        name: 'Sword Run Slash', animation: 'swordRunSlash',
        input: new CombatActionInput(300, { type: 'special', key: 4 }),
        moveTypes: [OnGround],
        damage: 8,
        ratingReward: 0, ratingRequirement: 3,
    }),
    new DancerCombatSpecialAction({
        name: 'Sword Sprint Slash', animation: 'swordSprintSlash',
        input: new CombatActionInput(400, { type: 'special', key: 1 }),
        moveTypes: [OnGround],
        damage: 10,
        ratingReward: 0, ratingRequirement: 3,
    }),

    // ── Air moves ─────────────────────────────────────────────────────────────
    new DancerCombatSpecialAction({
        name: 'Air Slash', animation: 'airSlash',
        input: new CombatActionInput(300, { type: 'special', key: 2 }),
        moveTypes: [OnAir],
        damage: 8,
        ratingReward: 0, ratingRequirement: 3,
    }),
    new DancerCombatSpecialAction({
        name: 'Air Slash Up', animation: 'airSlashUp',
        input: new CombatActionInput(300, { type: 'special', key: 3 }),
        moveTypes: [OnAir],
        damage: 8,
        ratingReward: 0, ratingRequirement: 3,
    }),
    new DancerCombatSpecialAction({
        name: 'Air Slash Down', animation: 'airSlashDown',
        input: new CombatActionInput(400, { type: 'special', key: 4 }),
        moveTypes: [OnAir, ForceGround],
        damage: 10,
        ratingReward: 0, ratingRequirement: 5,
    }),

    // ── Elemental / throws (combo finishers) ──────────────────────────────────
    new DancerCombatSpecialAction({
        name: 'Shock Light', animation: 'shockLight',
        input: new CombatActionInput(400, { type: 'special', key: 1 }),
        moveTypes: [ComboFinisher],
        damage: 7,
        ratingReward: 0, ratingRequirement: 3,
    }),
    new DancerCombatSpecialAction({
        name: 'Shock Heavy', animation: 'shockHeavy',
        input: new CombatActionInput(900, { type: 'special', key: 2 }),
        moveTypes: [ComboFinisher],
        damage: 14,
        ratingReward: 0, ratingRequirement: 6,
    }),
    new DancerCombatSpecialAction({
        name: 'Throw Underarm', animation: 'throwUnderarm',
        input: new CombatActionInput(400, { type: 'special', key: 3 }),
        moveTypes: [ComboFinisher],
        damage: 7,
        ratingReward: 0, ratingRequirement: 3,
    }),
    new DancerCombatSpecialAction({
        name: 'Throw Overarm', animation: 'throwOverarm',
        input: new CombatActionInput(400, { type: 'special', key: 4 }),
        moveTypes: [ComboFinisher],
        damage: 9,
        ratingReward: 0, ratingRequirement: 4,
    }),
    new DancerCombatSpecialAction({
        name: 'Ground Slam', animation: 'groundSlam',
        input: new CombatActionInput(900, { type: 'special', key: 1 }),
        moveTypes: [ComboFinisher, ForceGround],
        damage: 12,
        ratingReward: 0, ratingRequirement: 6,
    }),
];

// ── Combined pool ─────────────────────────────────────────────────────────────

export const GRAND_DANCER_ACTION_LIST: DancerCombatAction[] = [
    ...GRAND_DANCER_BASIC_ACTIONS,
    ...GRAND_DANCER_BASIC_ACTIONS_2,
    ...GRAND_DANCER_SPECIAL_ACTIONS,
];
