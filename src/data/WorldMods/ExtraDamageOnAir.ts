import { MoveType } from '../../game/entities/CombatTypes.ts';
import { WorldMod } from './WorldMod.ts';

import {ComboStep} from "../ComboMod/ComboStep.ts";

export class ExtraDamageOnAir extends WorldMod {
    title       = 'Raging Gale';
    description = 'Airborne attacks deal +0.5 bonus damage.';

    onBeforeAction(step: ComboStep, _history: readonly ComboStep[]): boolean {
        if (step.action.moveTypes.includes(MoveType.OnAir)) {
            step.comboStack.extraDamage += 0.5;
            return true;
        }
        return false;
    }
}
