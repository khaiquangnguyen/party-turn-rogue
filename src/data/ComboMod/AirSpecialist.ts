import { MoveType } from '../../game/entities/CombatTypes';
import { CharacterClass, ComboMod } from './ComboMod.ts';
import { isAirborne } from '../AutoComboCalculator';
import {ComboStep} from "./ComboStep.ts";

export class AirSpecialist extends ComboMod {
    title          = 'Air Specialist';
    description    = 'Air attacks against an airborne enemy deal ×1.1 bonus damage.';
    allowedClasses = [CharacterClass.GrandDancer];

    onBeforeAction(step: ComboStep, _history: readonly ComboStep[]): boolean {
        if (step.action.moveTypes.includes(MoveType.OnAir) && isAirborne(step.activeEffects)) {
            step.comboStack.damageMultiplier += .1;
            return true;
        }
        return false;
    }
}
