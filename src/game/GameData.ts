import { PlayableCharacter } from './entities/PlayableCharacter';
import { WorldMod } from '../data/WorldMods/WorldMod';
import { ComboMod } from '../data/ComboMod/ComboMod.ts';
import { CombatAction, AttackDirection } from './entities/CombatTypes';
import type { ComboRule } from '../data/ComboRule/ComboRule.ts';

export interface RunPrepData {
    worldModifiers:     WorldMod[];
    comboMods:          ComboMod[];
    comboRules:         ComboRule[];
    actionsByDirection: Partial<Record<AttackDirection, CombatAction>>;
    specials:           CombatAction[];
}

let _selectedCharacter: PlayableCharacter | null = null;
let _runPrep:           RunPrepData | null        = null;

export const GameData = {
    setSelectedCharacter(char: PlayableCharacter): void {
        _selectedCharacter = char;
    },
    getSelectedCharacter(): PlayableCharacter | null {
        return _selectedCharacter;
    },
    setRunPrep(data: RunPrepData): void {
        _runPrep = data;
    },
    getRunPrep(): RunPrepData | null {
        return _runPrep;
    },
};
