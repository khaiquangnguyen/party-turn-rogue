import { CharacterClass, ComboMod } from './ComboMod.ts';
import {ComboStep} from "./ComboStep.ts";

export class HitAndRun extends ComboMod {
    title          = 'Hit and Run';
    description    = 'Ending your turn after exactly one hit earns +1 crowd rating.';
    allowedClasses = [CharacterClass.GrandDancer];

    onComboEnd(turnSteps: readonly ComboStep[]): void {
        if (turnSteps.length === 1) {
            turnSteps[0].comboStack.addComboRating(1);
        }
    }
}
