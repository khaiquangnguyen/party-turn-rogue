import { AttackDirection } from '../../game/entities/CombatTypes';
import { ComboRule } from './ComboRule.ts';

import {ComboStep} from "../ComboMod/ComboStep.ts";

export class ActionRepeatBreaker extends ComboRule {
    title       = 'No Repeats';
    description = 'Repeating the same attack more than twice in a row (except RIGHT) zeroes the combo multiplier for that step.';

    onBeforeAction(step: ComboStep, history: readonly ComboStep[]): boolean {
        const dir = step.action.input?.inputDirection;
        if (dir === undefined || dir === AttackDirection.RIGHT) return false;

        let consecutive = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].action.input?.inputDirection === dir) {
                consecutive++;
            } else {
                break;
            }
        }

        if (consecutive >= 2) {
            step.comboStack.comboLength = 0;
            return true;
        }
        return false;
    }
}
