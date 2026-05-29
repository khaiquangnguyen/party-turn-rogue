import { CombatAction } from './CombatTypes';
import { MoveType } from './CombatTypes';

export abstract class ComboBuilderChainRule {
    abstract validate(from: CombatAction, to: CombatAction): boolean;
}

// ── ComboStarterRule ─────────────────────────────────────────────────────────
// Validates whether a single action is a legal combo opener.
// Only actions carrying MoveType.ComboStarter may begin a combo.

export abstract class ComboStarterRule {
    abstract validateStart(action: CombatAction): boolean;
}

export class MoveTypeStarterRule extends ComboStarterRule {
    validateStart(action: CombatAction): boolean {
        return action.moveTypes.includes(MoveType.ComboStarter);
    }
}

// ── HitstunStartupChainRule ──────────────────────────────────────────────────
// The next action's startup must exceed the previous action's hitstun,
// ensuring there's a window to cancel into the next move.

export class HitstunStartupChainRule extends ComboBuilderChainRule {
    validate(from: CombatAction, to: CombatAction): boolean {
        return to.startUpScore > from.hitstunScore;
    }
}

// ── MoveTypeChainRule ────────────────────────────────────────────────────────
// Valid move-type transitions. An action may carry multiple MoveTypes;
// the chain is valid if at least one (from → to) pair appears in the list.

type MoveTypePair = readonly [MoveType, MoveType];

const VALID_MOVE_TYPE_CHAINS: readonly MoveTypePair[] = [
    // Ground / air state transitions
    [MoveType.OnGround,      MoveType.OnGround],
    [MoveType.OnGround,      MoveType.ForceAir],
    [MoveType.OnAir,         MoveType.OnAir],
    [MoveType.OnAir,         MoveType.ForceGround],
    [MoveType.ForceGround,   MoveType.OnGround],
    [MoveType.ForceGround,   MoveType.ForceAir],
    [MoveType.ForceAir,      MoveType.OnAir],
    [MoveType.ForceAir,      MoveType.ForceGround],

    // Base attack combo chain
    [MoveType.BaseAtkCombo1, MoveType.BaseAtkCombo2],
    [MoveType.BaseAtkCombo2, MoveType.BaseAtkCombo3],
    [MoveType.BaseAtkCombo3, MoveType.BaseAtkCombo4],
    [MoveType.BaseAtkCombo4, MoveType.BaseAtkCombo5],

    // Any combo hit can cancel into a special
    [MoveType.BaseAtkCombo1, MoveType.Special1],
    [MoveType.BaseAtkCombo1, MoveType.Special2],
    [MoveType.BaseAtkCombo1, MoveType.Special3],
    [MoveType.BaseAtkCombo2, MoveType.Special1],
    [MoveType.BaseAtkCombo2, MoveType.Special2],
    [MoveType.BaseAtkCombo2, MoveType.Special3],
    [MoveType.BaseAtkCombo3, MoveType.Special1],
    [MoveType.BaseAtkCombo3, MoveType.Special2],
    [MoveType.BaseAtkCombo3, MoveType.Special3],
    [MoveType.BaseAtkCombo4, MoveType.Special1],
    [MoveType.BaseAtkCombo4, MoveType.Special2],
    [MoveType.BaseAtkCombo4, MoveType.Special3],
    [MoveType.BaseAtkCombo5, MoveType.Special1],
    [MoveType.BaseAtkCombo5, MoveType.Special2],
    [MoveType.BaseAtkCombo5, MoveType.Special3],

    // Special into ultimate
    [MoveType.Special1,      MoveType.Ultimate],
    [MoveType.Special2,      MoveType.Ultimate],
    [MoveType.Special3,      MoveType.Ultimate],

    // Buffs/debuffs can precede any attack type
    [MoveType.Buff,          MoveType.BaseAtkCombo1],
    [MoveType.Buff,          MoveType.Special1],
    [MoveType.Buff,          MoveType.Special2],
    [MoveType.Buff,          MoveType.Special3],
    [MoveType.Buff,          MoveType.Ultimate],
    [MoveType.Debuff,        MoveType.BaseAtkCombo1],
    [MoveType.Debuff,        MoveType.Special1],
    [MoveType.Debuff,        MoveType.Special2],
    [MoveType.Debuff,        MoveType.Special3],
    [MoveType.Debuff,        MoveType.Ultimate],
] as const;

// ── ComboEnderChainRule ──────────────────────────────────────────────────────
// Nothing may follow an action tagged ComboEnder.

export class ComboEnderChainRule extends ComboBuilderChainRule {
    validate(from: CombatAction, _to: CombatAction): boolean {
        return !from.moveTypes.includes(MoveType.ComboEnder);
    }
}

export class MoveTypeChainRule extends ComboBuilderChainRule {
    validate(from: CombatAction, to: CombatAction): boolean {
        for (const fromType of from.moveTypes) {
            for (const toType of to.moveTypes) {
                if (VALID_MOVE_TYPE_CHAINS.some(([a, b]) => a === fromType && b === toType)) {
                    return true;
                }
            }
        }
        return false;
    }
}
