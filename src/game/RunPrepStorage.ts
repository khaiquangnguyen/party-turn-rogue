import { GRAND_DANCER_BASIC_ACTIONS, GRAND_DANCER_SPECIAL_ACTIONS } from '../characters/GrandDancer/GrandDancerCombatActions.ts';
import { ForceAirborne } from '../data/ComboMod/ForceAirborne';
import { GroundSlamRating } from '../data/ComboMod/GroundSlamRating';
import { AmateurDancer } from '../data/ComboMod/AmateurDancer';
import { ComboMaster } from '../data/ComboMod/ComboMaster';
import { HitAndRun } from '../data/ComboMod/HitAndRun';
import { AirSpecialist } from '../data/ComboMod/AirSpecialist';
import { ExtraDamageWhenCrashIntoGround } from '../data/WorldMods/ExtraDamageWhenCrashIntoGround.ts';
import { ActionRepeatBreaker } from '../data/ComboRule/ActionRepeatBreaker';
import { AirborneBreaker } from '../data/ComboRule/AirborneBreaker';
import { DEFAULT_COMBO_RULES } from '../data/ComboRule/DefaultComboRules';
import { CombatAction, AttackDirection } from './entities/CombatTypes';
import type { ComboMod } from '../data/ComboMod/ComboMod.ts';
import type { WorldMod } from '../data/WorldMods/WorldMod';
import type { ComboRule } from '../data/ComboRule/ComboRule.ts';
import type { RunPrepData } from './GameData';
import {ExtraDamageOnAir} from "../data/WorldMods/ExtraDamageOnAir.ts";

const STORAGE_KEY = 'party-turn-rogue:run-prep';

// ── Registries ────────────────────────────────────────────────────────────────

const COMBO_MOD_REGISTRY: Record<string, () => ComboMod> = {
    ForceAirborne:   () => new ForceAirborne(),
    GroundSlamRating: () => new GroundSlamRating(),
    AmateurDancer:   () => new AmateurDancer(),
    Amateur:         () => new AmateurDancer(),   // backward-compat for old saves
    ComboMaster:     () => new ComboMaster(),
    HitAndRun:       () => new HitAndRun(),
    AirSpecialist:   () => new AirSpecialist(),
};

const WORLD_MOD_REGISTRY: Record<string, () => WorldMod> = {
    GroundSlamDamageIncreased:    () => new ExtraDamageWhenCrashIntoGround(),
    AirDamageIncreased:           () => new ExtraDamageOnAir(), 
};

const COMBO_RULE_REGISTRY: Record<string, () => ComboRule> = {
    ActionRepeatBreaker: () => new ActionRepeatBreaker(),
    AirborneBreaker:     () => new AirborneBreaker(),
};

// ── Storage schema ────────────────────────────────────────────────────────────

interface StoredRunPrep {
    worldModNames:  string[];
    comboModNames:  string[];
    comboRuleNames: string[];
    actionNames:    Record<string, string>;   // dir (number key) → action.name
    specialNames:   string[];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function saveRunPrep(data: RunPrepData): void {
    const stored: StoredRunPrep = {
        worldModNames:  data.worldModifiers.map(m => m.constructor.name),
        comboModNames:  data.comboMods.map(m => m.constructor.name),
        comboRuleNames: data.comboRules.map(r => r.constructor.name),
        actionNames:    Object.fromEntries(
            Object.entries(data.actionsByDirection)
                .filter(([, a]) => !!a)
                .map(([dir, a]) => [dir, a!.name]),
        ),
        specialNames: data.specials.map(s => s.name),
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
        // storage quota exceeded or unavailable — silently skip
    }
}

export function loadRunPrep(): RunPrepData | null {
    let raw: string | null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
    if (!raw) return null;

    try {
        const s: StoredRunPrep = JSON.parse(raw);

        const worldModifiers = s.worldModNames
            .map(n => WORLD_MOD_REGISTRY[n]?.())
            .filter((m): m is WorldMod => !!m);

        const comboMods = s.comboModNames
            .map(n => COMBO_MOD_REGISTRY[n]?.())
            .filter((m): m is ComboMod => !!m);

        const storedRules = (s.comboRuleNames ?? [])
            .map(n => COMBO_RULE_REGISTRY[n]?.())
            .filter((r): r is ComboRule => !!r);
        const comboRules = storedRules.length ? storedRules : [...DEFAULT_COMBO_RULES];

        const actionsByDirection: Partial<Record<AttackDirection, CombatAction>> = {};
        for (const [dirStr, name] of Object.entries(s.actionNames)) {
            const dir    = Number(dirStr) as AttackDirection;
            const action = GRAND_DANCER_BASIC_ACTIONS.find(a => a.name === name);
            if (action) actionsByDirection[dir] = action;
        }

        const specials = s.specialNames
            .map(n => GRAND_DANCER_SPECIAL_ACTIONS.find(a => a.name === n))
            .filter((a): a is NonNullable<typeof a> => !!a);

        return { worldModifiers, comboMods, comboRules, actionsByDirection, specials };
    } catch {
        return null;
    }
}
