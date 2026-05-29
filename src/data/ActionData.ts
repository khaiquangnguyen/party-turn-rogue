import { CombatAction, CombatActionInput, AttackDirection, MoveType } from '../game/entities/CombatTypes';

const { UP, DOWN, RIGHT } = AttackDirection;
const {
    OnGround, OnAir, ForceGround,
    BaseAtkCombo1, BaseAtkCombo2, BaseAtkCombo3, BaseAtkCombo4,
    Special1, Special2,
    ComboStarter, ComboEnder,
} = MoveType;

export const ACTION_LIST: CombatAction[] = [

    // ── Punch chain ───────────────────────────────────────────────────────────
    new CombatAction({
        name: 'Punch A', animation: 'punchA',
        input: new CombatActionInput(600, [[300, UP]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnGround],
        damage: 5, damageChainModifier: 1.1, energyCost: 3,
        startUpScore: 6, hitstunScore: 8, totalScore: 14,
    }),
    new CombatAction({
        name: 'Punch B', animation: 'punchB',
        input: new CombatActionInput(700, [[200, UP], [500, UP]]),
        moveTypes: [BaseAtkCombo2, OnGround],
        damage: 6, damageChainModifier: 1.1, energyCost: 4,
        startUpScore: 8, hitstunScore: 10, totalScore: 18,
    }),
    new CombatAction({
        name: 'Punch C', animation: 'punchC',
        input: new CombatActionInput(800, [[200, RIGHT], [500, UP], [700, RIGHT]]),
        moveTypes: [BaseAtkCombo3, OnGround],
        damage: 9, damageChainModifier: 1.15, energyCost: 7,
        startUpScore: 10, hitstunScore: 12, totalScore: 22,
    }),

    // ── Kick chain ────────────────────────────────────────────────────────────
    new CombatAction({
        name: 'Kick A', animation: 'kickA',
        input: new CombatActionInput(600, [[300, DOWN]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnGround],
        damage: 6, damageChainModifier: 1.1, energyCost: 4,
        startUpScore: 8, hitstunScore: 8, totalScore: 16,
    }),
    new CombatAction({
        name: 'Kick B', animation: 'kickB',
        input: new CombatActionInput(700, [[200, DOWN], [500, DOWN]]),
        moveTypes: [BaseAtkCombo2, OnGround],
        damage: 7, damageChainModifier: 1.1, energyCost: 5,
        startUpScore: 10, hitstunScore: 10, totalScore: 20,
    }),
    new CombatAction({
        name: 'Kick C', animation: 'kickC',
        input: new CombatActionInput(800, [[200, DOWN], [450, RIGHT], [700, DOWN]]),
        moveTypes: [BaseAtkCombo3, OnGround, ComboEnder],
        damage: 10, damageChainModifier: 1.2, energyCost: 8,
        startUpScore: 12, hitstunScore: 14, totalScore: 26,
    }),

    // ── Ground slashes ────────────────────────────────────────────────────────
    new CombatAction({
        name: 'Standing Slash', animation: 'standingSlash',
        input: new CombatActionInput(600, [[300, RIGHT]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnGround],
        damage: 9, damageChainModifier: 1.1, energyCost: 7,
        startUpScore: 10, hitstunScore: 12, totalScore: 22,
    }),
    new CombatAction({
        name: 'Crouch Slash', animation: 'crouchSlash',
        input: new CombatActionInput(600, [[300, DOWN]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnGround],
        damage: 7, damageChainModifier: 1.1, energyCost: 5,
        startUpScore: 6, hitstunScore: 8, totalScore: 14,
    }),
    new CombatAction({
        name: 'Sword Slash', animation: 'swordSlash01',
        input: new CombatActionInput(600, [[300, RIGHT]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnGround],
        damage: 7, damageChainModifier: 1.1, energyCost: 5,
        startUpScore: 8, hitstunScore: 10, totalScore: 18,
    }),
    new CombatAction({
        name: 'Sword Run Slash', animation: 'swordRunSlash',
        input: new CombatActionInput(600, [[200, RIGHT]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnGround],
        damage: 8, damageChainModifier: 1.1, energyCost: 6,
        startUpScore: 8, hitstunScore: 10, totalScore: 18,
    }),
    new CombatAction({
        name: 'Sword Sprint Slash', animation: 'swordSprintSlash',
        input: new CombatActionInput(700, [[200, RIGHT], [500, RIGHT]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnGround],
        damage: 10, damageChainModifier: 1.1, energyCost: 8,
        startUpScore: 10, hitstunScore: 12, totalScore: 22,
    }),

    // ── Sword combo chain ─────────────────────────────────────────────────────
    new CombatAction({
        name: 'Sword Combo A', animation: 'swordComboA',
        input: new CombatActionInput(600, [[300, RIGHT]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnGround],
        damage: 6, damageChainModifier: 1.1, energyCost: 4,
        startUpScore: 8, hitstunScore: 10, totalScore: 18,
    }),
    new CombatAction({
        name: 'Sword Combo B', animation: 'swordComboB',
        input: new CombatActionInput(700, [[200, RIGHT], [550, DOWN]]),
        moveTypes: [BaseAtkCombo2, OnGround],
        damage: 7, damageChainModifier: 1.1, energyCost: 5,
        startUpScore: 10, hitstunScore: 12, totalScore: 22,
    }),
    new CombatAction({
        name: 'Sword Combo C', animation: 'swordComboC',
        input: new CombatActionInput(800, [[150, RIGHT], [400, UP], [700, RIGHT]]),
        moveTypes: [BaseAtkCombo3, OnGround],
        damage: 8, damageChainModifier: 1.15, energyCost: 6,
        startUpScore: 12, hitstunScore: 14, totalScore: 26,
    }),
    new CombatAction({
        name: 'Sword Combo D', animation: 'swordComboD',
        input: new CombatActionInput(1000, [[150, DOWN], [400, RIGHT], [650, UP], [900, RIGHT]]),
        moveTypes: [BaseAtkCombo4, OnGround, ComboEnder],
        damage: 12, damageChainModifier: 1.2, energyCost: 10,
        startUpScore: 14, hitstunScore: 18, totalScore: 32,
    }),

    // ── Air moves ─────────────────────────────────────────────────────────────
    new CombatAction({
        name: 'Air Slash', animation: 'airSlash',
        input: new CombatActionInput(600, [[300, RIGHT]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnAir],
        damage: 8, damageChainModifier: 1.1, energyCost: 8,
        startUpScore: 8, hitstunScore: 10, totalScore: 18,
    }),
    new CombatAction({
        name: 'Air Slash Up', animation: 'airSlashUp',
        input: new CombatActionInput(600, [[300, UP]]),
        moveTypes: [ComboStarter, BaseAtkCombo1, OnAir],
        damage: 8, damageChainModifier: 1.1, energyCost: 8,
        startUpScore: 8, hitstunScore: 10, totalScore: 18,
    }),
    new CombatAction({
        name: 'Air Slash Down', animation: 'airSlashDown',
        input: new CombatActionInput(700, [[200, DOWN], [550, DOWN]]),
        moveTypes: [BaseAtkCombo2, OnAir, ForceGround, ComboEnder],
        damage: 10, damageChainModifier: 1.2, energyCost: 10,
        startUpScore: 10, hitstunScore: 14, totalScore: 24,
    }),

    // ── Specials ──────────────────────────────────────────────────────────────
    new CombatAction({
        name: 'Shock Light', animation: 'shockLight',
        input: new CombatActionInput(700, [[200, RIGHT], [500, UP]]),
        moveTypes: [Special1],
        damage: 7, damageChainModifier: 1.1, energyCost: 5,
        startUpScore: 8, hitstunScore: 10, totalScore: 18,
    }),
    new CombatAction({
        name: 'Shock Heavy', animation: 'shockHeavy',
        input: new CombatActionInput(900, [[150, RIGHT], [400, UP], [700, RIGHT], [850, DOWN]]),
        moveTypes: [Special2, ComboEnder],
        damage: 14, damageChainModifier: 1.25, energyCost: 16,
        startUpScore: 18, hitstunScore: 22, totalScore: 40,
    }),
    new CombatAction({
        name: 'Throw Underarm', animation: 'throwUnderarm',
        input: new CombatActionInput(700, [[200, DOWN], [500, RIGHT]]),
        moveTypes: [Special1],
        damage: 7, damageChainModifier: 1.1, energyCost: 5,
        startUpScore: 8, hitstunScore: 10, totalScore: 18,
    }),
    new CombatAction({
        name: 'Throw Overarm', animation: 'throwOverarm',
        input: new CombatActionInput(800, [[200, UP], [500, RIGHT], [750, UP]]),
        moveTypes: [Special2, ComboEnder],
        damage: 9, damageChainModifier: 1.2, energyCost: 8,
        startUpScore: 12, hitstunScore: 14, totalScore: 26,
    }),
    new CombatAction({
        name: 'Ground Slam', animation: 'groundSlam',
        input: new CombatActionInput(900, [[200, DOWN], [500, DOWN], [800, DOWN]]),
        moveTypes: [Special1, ForceGround, ComboEnder],
        damage: 12, damageChainModifier: 1.25, energyCost: 14,
        startUpScore: 16, hitstunScore: 20, totalScore: 36,
    }),
];
