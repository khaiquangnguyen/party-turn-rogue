import { MoveType } from '../../game/entities/CombatTypes';
import { CharacterClass, ComboMod } from './ComboMod.ts';
import {ComboStep} from "./ComboStep.ts";

export class Slammer extends ComboMod {
    title          = 'Ground Slam Rating';
    description    = 'Ground-slam attacks earn +1 crowd rating.';
    allowedClasses = [CharacterClass.GrandDancer];

    onBeforeAction(step: ComboStep, _history: readonly ComboStep[]): boolean {
        if (step.action.moveTypes.includes(MoveType.ForceGround)) {
            step.comboStack.addComboRating(1);
            return true;
        }
        return false;
    }
}
