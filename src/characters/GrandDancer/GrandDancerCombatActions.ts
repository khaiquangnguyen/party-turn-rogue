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
        input: new CombatActionInput(600, UP),
        moveTypes: [OnGround],
        damage: 12, damageChainModifier: 1,
        baseRating: 1,
    }),
    new DancerCombatAction({
        name: 'Sword Strike B', animation: 'swordComboB',
        input: new CombatActionInput(700, DOWN),
        moveTypes: [OnGround],
        damage: 8, damageChainModifier: 1,
        baseRating: 1,
    }),
    new DancerCombatAction({
        name: 'Sword Strike C', animation: 'swordComboC',
        input: new CombatActionInput(800, LEFT),
        moveTypes: [OnGround],
        damage: 7, damageChainModifier: 1,
        baseRating: 1,
    }),
    new DancerCombatAction({
        name: 'Sword Strike D', animation: 'swordComboD',
        input: new CombatActionInput(1000, RIGHT),
        moveTypes: [OnGround],
        damage: 6, damageChainModifier: 1,
        baseRating: 1,
    }),
];

// ── Special actions ───────────────────────────────────────────────────────────

export const GRAND_DANCER_SPECIAL_ACTIONS: DancerCombatSpecialAction[] = [
    // ── Ground slashes ────────────────────────────────────────────────────────
    new DancerCombatSpecialAction({
        name: 'Standing Slash', animation: 'standingSlash',
        input: new CombatActionInput(600, RIGHT),
        moveTypes: [OnGround],
        damage: 9, damageChainModifier: 1.1,
        baseRating: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Crouch Slash', animation: 'crouchSlash',
        input: new CombatActionInput(600, DOWN),
        moveTypes: [OnGround],
        damage: 7, damageChainModifier: 1.1,
        baseRating: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Sword Slash', animation: 'swordSlash01',
        input: new CombatActionInput(600, RIGHT),
        moveTypes: [OnGround],
        damage: 7, damageChainModifier: 1.1,
        baseRating: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Sword Run Slash', animation: 'swordRunSlash',
        input: new CombatActionInput(600, RIGHT),
        moveTypes: [OnGround],
        damage: 8, damageChainModifier: 1.1,
        baseRating: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Sword Sprint Slash', animation: 'swordSprintSlash',
        input: new CombatActionInput(700, RIGHT),
        moveTypes: [OnGround],
        damage: 10, damageChainModifier: 1.1,
        baseRating: 1,
    }),

    // ── Air moves ─────────────────────────────────────────────────────────────
    new DancerCombatSpecialAction({
        name: 'Air Slash', animation: 'airSlash',
        input: new CombatActionInput(600, RIGHT),
        moveTypes: [OnAir],
        damage: 8, damageChainModifier: 1.1,
        baseRating: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Air Slash Up', animation: 'airSlashUp',
        input: new CombatActionInput(600, UP),
        moveTypes: [OnAir],
        damage: 8, damageChainModifier: 1.1,
        baseRating: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Air Slash Down', animation: 'airSlashDown',
        input: new CombatActionInput(700, DOWN),
        moveTypes: [OnAir, ForceGround],
        damage: 10, damageChainModifier: 1.2,
        baseRating: 2,
    }),

    // ── Elemental / throws (combo finishers) ──────────────────────────────────
    new DancerCombatSpecialAction({
        name: 'Shock Light', animation: 'shockLight',
        input: new CombatActionInput(700, RIGHT),
        moveTypes: [ComboFinisher],
        damage: 7, damageChainModifier: 1.1,
        baseRating: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Shock Heavy', animation: 'shockHeavy',
        input: new CombatActionInput(900, RIGHT),
        moveTypes: [ComboFinisher],
        damage: 14, damageChainModifier: 1.25,
        baseRating: 2,
    }),
    new DancerCombatSpecialAction({
        name: 'Throw Underarm', animation: 'throwUnderarm',
        input: new CombatActionInput(700, DOWN),
        moveTypes: [ComboFinisher],
        damage: 7, damageChainModifier: 1.1,
        baseRating: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Throw Overarm', animation: 'throwOverarm',
        input: new CombatActionInput(800, UP),
        moveTypes: [ComboFinisher],
        damage: 9, damageChainModifier: 1.2,
        baseRating: 1,
    }),
    new DancerCombatSpecialAction({
        name: 'Ground Slam', animation: 'groundSlam',
        input: new CombatActionInput(900, DOWN),
        moveTypes: [ComboFinisher, ForceGround],
        damage: 12, damageChainModifier: 1.25,
        baseRating: 2,
    }),
];

// ── Combined pool ─────────────────────────────────────────────────────────────

export const GRAND_DANCER_ACTION_LIST: DancerCombatAction[] = [...GRAND_DANCER_BASIC_ACTIONS, ...GRAND_DANCER_SPECIAL_ACTIONS];
