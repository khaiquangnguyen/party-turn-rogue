import {CombatAction, CombatEffect} from "../../game/entities/CombatTypes.ts";
import {ComboStackSystem} from "../ComboStackSystem.ts";
import type {WorldMod} from "../WorldMods/WorldMod.ts";
import type {ComboRule} from "../ComboRule/ComboRule.ts";
import {ComboMod} from "./ComboMod.ts";
import type {SupportPassive} from "../Creature/SupportPassive.ts";

export interface ComboStep {
    readonly action: CombatAction;
    comboStack: ComboStackSystem;
    availableWorldMods:       readonly WorldMod[];
    availableComboMods:       readonly ComboMod[];
    availableComboRules:      readonly ComboRule[];
    availableCreaturePassives: readonly SupportPassive[];
    applicableWorldMods:       WorldMod[];
    applicableComboMods:       ComboMod[];
    applicableComboRules:      ComboRule[];
    applicableCreaturePassives: SupportPassive[];
    activeEffects: Map<Function, CombatEffect>;
    newEffects: CombatEffect[];
    lostEffects: CombatEffect[];
    finalDamage: number;
}