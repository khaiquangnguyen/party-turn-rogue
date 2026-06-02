import {resolveStepEffects} from "./AutoComboCalculator.ts";
import {ComboStep} from "./ComboMod/ComboStep.ts";

// ── Combo ─────────────────────────────────────────────────────────────────────
export function calculateStepDamage(step: ComboStep, history: readonly ComboStep[]): void {
    const initialEffects = new Map(step.activeEffects);
    step.applicableComboRules = [];
    step.applicableComboMods = [];
    step.applicableWorldMods = [];

    for (const rule of step.availableComboRules) {
        if (rule.onBeforeAction(step, history)) step.applicableComboRules.push(rule);
    }
    for (const mod of step.availableComboMods) {
        if (mod.onBeforeAction(step, history)) step.applicableComboMods.push(mod);
    }
    for (const wm of step.availableWorldMods) {
        if (wm.onBeforeAction(step, history)) step.applicableWorldMods.push(wm);
    }

    step.finalDamage = Math.ceil(step.action.damage * step.comboStack.finalMultiplier + step.comboStack.extraDamage);

    for (const mod of step.availableComboMods) {
        if (mod.onAfterAction(step, history) && !step.applicableComboMods.includes(mod)) step.applicableComboMods.push(mod);
    }
    for (const wm of step.availableWorldMods) {
        if (wm.onAfterAction(step, history) && !step.applicableWorldMods.includes(wm)) step.applicableWorldMods.push(wm);
    }
    for (const rule of step.availableComboRules) {
        if (rule.onAfterAction(step, history) && !step.applicableComboRules.includes(rule)) step.applicableComboRules.push(rule);
    }

    resolveStepEffects(step, initialEffects);
}