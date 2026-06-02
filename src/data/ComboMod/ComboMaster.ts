import { CharacterClass, ComboMod } from './ComboMod.ts';
import {ComboStep} from "./ComboStep.ts";

export class ComboMaster extends ComboMod {
    title          = 'Combo Master';
    description    = 'Reaching a 5-hit combo earns +1 crowd rating (once per combo).';
    allowedClasses = [CharacterClass.GrandDancer];

    onBeforeAction(step: ComboStep, history: readonly ComboStep[]): boolean {
        const alreadyTriggered = history.some(s => s.applicableComboMods.includes(this));
        if (!alreadyTriggered && history.length >= 4) {
            step.comboStack.addComboRating(1);
            return true;
        }
        return false;
    }
}
