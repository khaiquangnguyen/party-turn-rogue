import { PlayableCharacter } from './entities/PlayableCharacter';
import { WorldMod } from '../data/WorldMods/WorldMod';
import { ComboMod } from '../data/ComboMod/ComboMod.ts';
import { CombatAction, AttackDirection } from './entities/CombatTypes';
import type { ComboRule } from '../data/ComboRule/ComboRule.ts';
import type { Expedition } from '../data/WorldMap/Expedition.ts';
import type { EnemyMod } from '../data/EnemyMod';
import type { CreatureTemplate } from '../data/Creature/CreatureTemplate.ts';

export interface RunPrepData {
    worldModifiers:     WorldMod[];
    comboMods:          ComboMod[];
    comboRules:         ComboRule[];
    actionsByDirection: Partial<Record<AttackDirection, CombatAction>>;
    specials:           CombatAction[];
    enemyMods:          EnemyMod[];
    companions:         CreatureTemplate[];
}

let _selectedCharacter:  PlayableCharacter | null = null;
let _runPrep:            RunPrepData | null        = null;
let _selectedExpedition: Expedition | null         = null;

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
    setSelectedExpedition(exp: Expedition): void {
        _selectedExpedition = exp;
    },
    getSelectedExpedition(): Expedition | null {
        return _selectedExpedition;
    },
    advanceExpeditionNode(): void {
        _selectedExpedition?.map.advanceNode();
    },
    addEnemyMod(mod: EnemyMod): void {
        if (!_runPrep) return;
        _runPrep = { ..._runPrep, enemyMods: [..._runPrep.enemyMods, mod] };
    },
};
