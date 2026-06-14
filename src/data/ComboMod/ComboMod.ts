import {CharacterClass} from '../../game/entities/CharacterEnums';
import {CombatAction, ScheduleEntryOverride} from '../../game/entities/CombatTypes';
import {ComboStep} from "./ComboStep.ts";

export { CharacterClass };

// ── Step data interface ───────────────────────────────────────────────────────

// ── Mod card base ─────────────────────────────────────────────────────────────

export abstract class ComboMod {
    abstract title:        string;
    abstract description:  string;
    // Empty means available to all classes.
    allowedClasses: readonly CharacterClass[] = [];

    // How many times this mod may fire (contribute) across the full combo. Default 1.
    applicableLimit = 1;

    // Returns true if this mod was applicable (and contributed) for this step.
    onBeforeAction(_step: ComboStep, _history: readonly ComboStep[]): boolean { return false; }
    onAfterAction(_step: ComboStep, _history: readonly ComboStep[]): boolean  { return false; }
    onComboStart(_history: readonly ComboStep[]): void {}
    onComboEnd(_turnSteps: readonly ComboStep[]): void {}

    // Called once per action when the input schedule is built. Return an override to change how
    // the input is presented to the player (e.g. convert a tap to a hold).
    onBuildSchedule(
        _action: CombatAction,
        _actionIndex: number,
        _plannedActions: readonly CombatAction[],
    ): ScheduleEntryOverride | null { return null; }
}

// ── Deck ──────────────────────────────────────────────────────────────────────

const COMBO_MOD_DECK_MAX = 4;

export class ComboModDeck {
    private cards: ComboMod[] = [];

    get maxSize(): number {
        return COMBO_MOD_DECK_MAX;
    }

    add(card: ComboMod): boolean {
        if (this.cards.length >= COMBO_MOD_DECK_MAX) return false;
        this.cards.push(card);
        return true;
    }

    getCards(): readonly ComboMod[] {
        return this.cards;
    }
}
