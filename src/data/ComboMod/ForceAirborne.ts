import { AttackDirection } from '../../game/entities/CombatTypes';
import { Airborne } from '../../game/entities/CombatEffects';
import { CharacterClass, ComboMod } from './ComboMod.ts';
import {ComboStep} from "./ComboStep.ts";

export class ForceAirborne extends ComboMod {
    title          = 'Force Airborne';
    description    = 'Pressing UP immediately after DOWN launches the enemy airborne and deals +5 bonus damage.';
    allowedClasses = [CharacterClass.GrandDancer];

    onAfterAction(step: ComboStep, history: readonly ComboStep[]): boolean {
        const prev           = history[history.length - 1];
        const currentIsUp    = step.action.input?.inputDirection === AttackDirection.UP;
        const previousIsDown = prev?.action.input?.inputDirection === AttackDirection.DOWN;
        if (currentIsUp && previousIsDown) {
            step.activeEffects.set(Airborne, new Airborne());
            step.comboStack.extraDamage += 5;
            return true;
        }
        return false;
    }
}
