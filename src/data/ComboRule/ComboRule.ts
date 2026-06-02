import {ComboStep} from "../ComboMod/ComboStep.ts";

export abstract class ComboRule {
    abstract title:       string;
    abstract description: string;

    onBeforeAction(_step: ComboStep, _history: readonly ComboStep[]): boolean { return false; }
    onAfterAction(_step: ComboStep, _history: readonly ComboStep[]): boolean  { return false; }
}
