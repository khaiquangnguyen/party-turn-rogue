import { CharacterClass, ComboMod } from './ComboMod.ts';
import {ComboStep} from "./ComboStep.ts";

export class AmateurDancer extends ComboMod {
    title          = 'Amateur Dancer';
    description    = 'Hitting with the same move 3 times in a row deals +5 bonus damage.';
    allowedClasses = [CharacterClass.GrandDancer];

    onBeforeAction(step: ComboStep, history: readonly ComboStep[]): boolean {
        const dir = step.action.input?.inputDirection;
        if (dir === undefined) return false;

        let consecutive = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].action.input?.inputDirection === dir) {
                consecutive++;
            } else {
                break;
            }
        }

        if (consecutive === 2) {
            step.comboStack.extraDamage += 5;
            return true;
        }
        return false;
    }
}
