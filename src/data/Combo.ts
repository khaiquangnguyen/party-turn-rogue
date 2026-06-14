import {resolveStepEffects} from "./AutoComboCalculator.ts";
import {ComboStep} from "./ComboMod/ComboStep.ts";
import {DancerCombatAction} from "../game/entities/CombatTypes.ts";

// ── Combo ─────────────────────────────────────────────────────────────────────
export function calculateStepDamage(step: ComboStep, history: readonly ComboStep[]): void {
    const initialEffects = new Map(step.activeEffects);
    step.applicableComboRules       = [];
    step.applicableComboMods        = [];
    step.applicableWorldMods        = [];
    step.applicableCreaturePassives = [];

    // Returns how many times mod has fired: prior steps + already added this step.
    const modAppliedCount = (mod: (typeof step.availableComboMods)[number]) =>
        history.filter(s => s.applicableComboMods.includes(mod)).length
        + (step.applicableComboMods.includes(mod) ? 1 : 0);

    for (const rule of step.availableComboRules) {
        if (rule.onBeforeAction(step, history)) step.applicableComboRules.push(rule);
    }
    for (const mod of step.availableComboMods) {
        if (modAppliedCount(mod) >= mod.applicableLimit) continue;
        if (mod.onBeforeAction(step, history)) step.applicableComboMods.push(mod);
    }
    for (const wm of step.availableWorldMods) {
        if (wm.onBeforeAction(step, history)) step.applicableWorldMods.push(wm);
    }
    for (const passive of step.availableCreaturePassives) {
        if (passive.onBeforeAction(step, history)) step.applicableCreaturePassives.push(passive);
    }

    step.finalDamage = Math.ceil(step.action.damage * step.comboStack.finalMultiplier + step.comboStack.extraDamage);

    for (const mod of step.availableComboMods) {
        if (modAppliedCount(mod) >= mod.applicableLimit) continue;
        if (mod.onAfterAction(step, history) && !step.applicableComboMods.includes(mod)) step.applicableComboMods.push(mod);
    }
    for (const wm of step.availableWorldMods) {
        if (wm.onAfterAction(step, history) && !step.applicableWorldMods.includes(wm)) step.applicableWorldMods.push(wm);
    }
    for (const rule of step.availableComboRules) {
        if (rule.onAfterAction(step, history) && !step.applicableComboRules.includes(rule)) step.applicableComboRules.push(rule);
    }
    for (const passive of step.availableCreaturePassives) {
        if (passive.onAfterAction(step, history) && !step.applicableCreaturePassives.includes(passive)) step.applicableCreaturePassives.push(passive);
    }

    resolveStepEffects(step, initialEffects);

    if (step.action instanceof DancerCombatAction) {
        step.comboStack.addComboRating(step.action.ratingReward);
    }
}