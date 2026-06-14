import {AttackDirection, CombatAction, ScheduleEntryOverride} from '../../game/entities/CombatTypes';
import {Airborne} from '../../game/entities/CombatEffects';
import {CharacterClass, ComboMod} from './ComboMod.ts';
import {ComboStep} from "./ComboStep.ts";

export class ForceAirborne extends ComboMod {
    title          = 'Force Airborne';
    description    = 'Pressing UP immediately after DOWN launches the enemy airborne and deals +5 bonus damage.';
    allowedClasses = [CharacterClass.GrandDancer];

    onBuildSchedule(
        action: CombatAction,
        actionIndex: number,
        plannedActions: readonly CombatAction[],
    ): ScheduleEntryOverride | null {
        if (actionIndex === 0) return null;
        const prev        = plannedActions[actionIndex - 1];
        const isUp        = action.input?.inputDirection === AttackDirection.UP;
        const prevIsDown  = prev?.input?.inputDirection === AttackDirection.DOWN;
        if (isUp && prevIsDown) return { tapToHoldMs: 500 };
        return null;
    }

    private isUpAfterDown(step: ComboStep, history: readonly ComboStep[]): boolean {
        const prev = history[history.length - 1];
        return step.action.input?.inputDirection === AttackDirection.UP
            && prev?.action.input?.inputDirection === AttackDirection.DOWN;
    }

    onBeforeAction(step: ComboStep, history: readonly ComboStep[]): boolean {
        if (!this.isUpAfterDown(step, history)) return false;
        step.comboStack.extraDamage += 5;
        return true;
    }

    onAfterAction(step: ComboStep, history: readonly ComboStep[]): boolean {
        if (!this.isUpAfterDown(step, history)) return false;
        step.activeEffects.set(Airborne, new Airborne());
        return true;
    }
}
