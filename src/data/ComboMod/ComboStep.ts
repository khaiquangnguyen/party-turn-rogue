import {CombatAction, CombatEffect} from "../../game/entities/CombatTypes.ts";
import {ComboStackSystem} from "../ComboStackSystem.ts";
import type {WorldMod} from "../WorldMods/WorldMod.ts";
import type {ComboRule} from "../ComboRule/ComboRule.ts";
import {ComboMod} from "./ComboMod.ts";

export interface ComboStep {
    readonly action: CombatAction;
    comboStack: ComboStackSystem;
    availableWorldMods: readonly WorldMod[];
    availableComboMods: readonly ComboMod[];
    availableComboRules: readonly ComboRule[];
    applicableWorldMods: WorldMod[];
    applicableComboMods: ComboMod[];
    applicableComboRules: ComboRule[];
    activeEffects: Map<Function, CombatEffect>;
    newEffects: CombatEffect[];
    lostEffects: CombatEffect[];
    finalDamage: number;
}