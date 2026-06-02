import { WorldMod } from './WorldMod.ts';
import { Ground } from '../../game/entities/CombatEffects.ts';

import {ComboStep} from "../ComboMod/ComboStep.ts";

export class ExtraDamageWhenCrashIntoGround extends WorldMod {
    title       = 'Spiked Earth';
    description = 'Slamming enemies into the ground deals +2 bonus damage.';

    onBeforeAction(step: ComboStep, _history: readonly ComboStep[]): boolean {
        if (step.newEffects.some(e => e instanceof Ground)) {
            step.comboStack.extraDamage += 2;
            return true;
        }
        return false;
    }
}
