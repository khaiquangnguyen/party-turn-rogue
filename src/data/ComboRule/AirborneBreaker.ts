import { AttackDirection } from '../../game/entities/CombatTypes';
import { Airborne } from '../../game/entities/CombatEffects';
import { ComboRule } from './ComboRule.ts';
import { isAirborne } from '../AutoComboCalculator';
import {ComboStep} from "../ComboMod/ComboStep.ts";

export class AirborneBreaker extends ComboRule {
    title       = 'Gravity Pull';
    description = 'Any non-UP attack against an airborne enemy removes the Airborne effect (no slam — they simply fall).';

    onAfterAction(step: ComboStep, _history: readonly ComboStep[]): boolean {
        if (!isAirborne(step.activeEffects)) return false;
        if (step.action.input?.inputDirection === AttackDirection.UP) return false;
        step.activeEffects.delete(Airborne);
        return true;
    }
}
