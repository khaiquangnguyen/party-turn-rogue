import { MoveType } from '../../game/entities/CombatTypes';
import { CharacterClass, ComboMod } from './ComboMod.ts';
import {ComboStep} from "./ComboStep.ts";

export class Slammer extends ComboMod {
    title          = 'Ground Slam';
    description    = 'Ground-slam attacks deal +6 bonus damage.';
    allowedClasses = [CharacterClass.GrandDancer];

    onBeforeAction(step: ComboStep, _history: readonly ComboStep[]): boolean {
        if (step.action.moveTypes.includes(MoveType.ForceGround)) {
            step.comboStack.extraDamage += 6;
            return true;
        }
        return false;
    }
}
