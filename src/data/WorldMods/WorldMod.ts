import {ComboStep} from "../ComboMod/ComboStep.ts";

export abstract class WorldMod {
    abstract title:       string;
    abstract description: string;

    onBeforeAction(_step: ComboStep, _history: readonly ComboStep[]): boolean { return false; }
    onAfterAction(_step: ComboStep, _history: readonly ComboStep[]): boolean  { return false; }
    onComboStart(_history: readonly ComboStep[]): void {}
    onComboEnd(_turnSteps: readonly ComboStep[]): void {}
}
