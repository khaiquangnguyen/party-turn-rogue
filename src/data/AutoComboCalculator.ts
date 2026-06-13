import {AttackDirection, CombatEffect, MoveType} from '../game/entities/CombatTypes';
import {Airborne} from '../game/entities/CombatEffects';
import {ActionDeck} from './ActionDeck';
import {ComboMod} from './ComboMod/ComboMod.ts';
import {ComboStackSystem} from './ComboStackSystem';
import {WorldMod} from './WorldMods/WorldMod';
import type {ComboRule} from './ComboRule/ComboRule.ts';
import {calculateStepDamage} from "./Combo.ts";
import {ComboStep} from "./ComboMod/ComboStep.ts";
import type {SupportPassive} from "./Creature/SupportPassive.ts";

const ALL_DIRECTIONS: AttackDirection[] = [
    AttackDirection.UP,
    AttackDirection.DOWN,
    AttackDirection.LEFT,
    AttackDirection.RIGHT,
];

const MAX_SEARCH_DEPTH = 8;

// ── Effect helpers ────────────────────────────────────────────────────────────

export function isAirborne(effects: Map<Function, CombatEffect>): boolean {
    return effects.has(Airborne);
}

export function resolveStepEffects(
    step:           ComboStep,
    initialEffects: Map<Function, CombatEffect>,
): void {
    const isDownInput = step.action.input?.inputDirection === AttackDirection.DOWN;
    if (step.action.moveTypes.includes(MoveType.ForceGround) || (isDownInput && isAirborne(step.activeEffects))) {
        step.activeEffects.delete(Airborne);
    }

    step.newEffects  = [...step.activeEffects.values()].filter(e => !initialEffects.has(e.constructor));
    step.lostEffects = [...initialEffects.values()].filter(e => !step.activeEffects.has(e.constructor));
}

// ── Step processor ────────────────────────────────────────────────────────────
// Runs the full step lifecycle: rules → mods → world-mod damage → after-actions
// → effect resolution. Sets step.finalDamage in place.

// ── Simulator ─────────────────────────────────────────────────────────────────

function simulateDamage(
    directions: AttackDirection[],
    actionDeck: ActionDeck,
    mods:       readonly ComboMod[],
    worldMods:  readonly WorldMod[],
    rules:      readonly ComboRule[]    = [],
    passives:   readonly SupportPassive[] = [],
): number {
    const history: ComboStep[] = [];
    let total = 0;

    for (const dir of directions) {
        const action = actionDeck.getAction(dir);
        const prev   = history[history.length - 1] ?? null;

        const step: ComboStep = {
            action,
            comboStack:                new ComboStackSystem(prev?.comboStack.comboRating ?? 0),
            availableWorldMods:        worldMods,
            availableComboMods:        mods,
            availableComboRules:       rules,
            availableCreaturePassives: passives,
            applicableWorldMods:        [],
            applicableComboMods:        [],
            applicableComboRules:       [],
            applicableCreaturePassives: [],
            activeEffects:             prev ? new Map(prev.activeEffects) : new Map(),
            newEffects:                [],
            lostEffects:               [],
            finalDamage:               0,
        };

        calculateStepDamage(step, history);
        total += step.finalDamage;

        history.push(step);
    }

    return total;
}

// ── Full-turn simulator (includes onComboEnd effects) ─────────────────────────

function simulateFullTurnDamage(
    directions: AttackDirection[],
    actionDeck: ActionDeck,
    mods:       readonly ComboMod[],
    worldMods:  readonly WorldMod[],
    rules:      readonly ComboRule[],
    passives:   readonly SupportPassive[],
): number {
    const history: ComboStep[] = [];

    for (const dir of directions) {
        const action = actionDeck.getAction(dir);
        const prev   = history[history.length - 1] ?? null;

        const step: ComboStep = {
            action,
            comboStack:                new ComboStackSystem(prev?.comboStack.comboRating ?? 0),
            availableWorldMods:        worldMods,
            availableComboMods:        mods,
            availableComboRules:       rules,
            availableCreaturePassives: passives,
            applicableWorldMods:        [],
            applicableComboMods:        [],
            applicableComboRules:       [],
            applicableCreaturePassives: [],
            activeEffects:             prev ? new Map(prev.activeEffects) : new Map(),
            newEffects:                [],
            lostEffects:               [],
            finalDamage:               0,
        };

        calculateStepDamage(step, history);
        history.push(step);
    }

    // Apply end-of-turn hooks (may patch finalDamage, e.g. HitAndRun).
    for (const mod     of mods)     mod.onComboEnd(history);
    for (const wm      of worldMods) wm.onComboEnd(history);
    for (const passive of passives)  passive.onComboEnd(history);

    return history.reduce((sum, s) => sum + s.finalDamage, 0);
}

// ── Token-pool search ─────────────────────────────────────────────────────────
// Finds the permutation of the provided token multiset that maximises total
// damage.  With a pool of ≤ 8 tokens the worst-case search space is 8! = 40 320
// leaf evaluations — well within real-time budget.

export function findBestComboFromTokens(
    tokenCounts: Record<AttackDirection, number>,
    actionDeck:  ActionDeck,
    mods:        readonly ComboMod[],
    worldMods:   readonly WorldMod[]       = [],
    rules:       readonly ComboRule[]      = [],
    passives:    readonly SupportPassive[] = [],
): AttackDirection[] {
    const pool  = { ...tokenCounts };
    const total = (Object.values(pool) as number[]).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    let bestDamage = -1;
    let bestSeq:    AttackDirection[] = [];
    const current:  AttackDirection[] = [];

    function search(): void {
        if (current.length === total) {
            const dmg = simulateFullTurnDamage(current, actionDeck, mods, worldMods, rules, passives);
            if (dmg > bestDamage) {
                bestDamage = dmg;
                bestSeq    = [...current];
            }
            return;
        }
        for (const dir of ALL_DIRECTIONS) {
            if (pool[dir] <= 0) continue;
            pool[dir]--;
            current.push(dir);
            search();
            current.pop();
            pool[dir]++;
        }
    }

    search();
    return bestSeq;
}

// ── Public entry point (energy-based, kept for backward compat) ───────────────

export function findBestCombo(
    energy:     number,
    actionDeck: ActionDeck,
    mods:       readonly ComboMod[],
    worldMods:  readonly WorldMod[]       = [],
    rules:      readonly ComboRule[]      = [],
    firstDir:   AttackDirection | null    = null,
    passives:   readonly SupportPassive[] = [],
): AttackDirection[] {
    const depth = Math.min(energy, MAX_SEARCH_DEPTH);
    if (depth === 0) return [];

    let bestDamage   = -1;
    let bestSequence: AttackDirection[] = [];
    const current: AttackDirection[]   = [];

    function search(remaining: number): void {
        if (remaining === 0) {
            const dmg = simulateDamage(current, actionDeck, mods, worldMods, rules, passives);
            if (dmg > bestDamage) {
                bestDamage   = dmg;
                bestSequence = [...current];
            }
            return;
        }
        const dirs = current.length === 0 && firstDir !== null ? [firstDir] : ALL_DIRECTIONS;
        for (const dir of dirs) {
            current.push(dir);
            search(remaining - 1);
            current.pop();
        }
    }

    search(depth);
    return bestSequence;
}
