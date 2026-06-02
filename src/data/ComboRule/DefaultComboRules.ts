import { ComboRule } from './ComboRule.ts';
import { ActionRepeatBreaker } from './ActionRepeatBreaker';
import { AirborneBreaker } from './AirborneBreaker';

export const DEFAULT_COMBO_RULES: ComboRule[] = [
    new ActionRepeatBreaker(),
    new AirborneBreaker(),
];
