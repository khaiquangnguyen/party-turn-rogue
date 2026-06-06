import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    GRAND_DANCER_BASIC_ACTIONS,
    GRAND_DANCER_BASIC_ACTIONS_2,
    GRAND_DANCER_SPECIAL_ACTIONS
} from '../characters/GrandDancer/GrandDancerCombatActions.ts';
import {AttackDirection, CombatAction, MoveType} from '../game/entities/CombatTypes';
import {COMBO_MOD_POOL} from '../data/ComboModPool';
import {ExtraDamageWhenCrashIntoGround} from '../data/WorldMods/ExtraDamageWhenCrashIntoGround.ts';
import {WorldMod} from '../data/WorldMods/WorldMod';
import {ComboRule} from '../data/ComboRule/ComboRule.ts';
import {DEFAULT_COMBO_RULES} from '../data/ComboRule/DefaultComboRules';
import {GameData} from '../game/GameData';
import {loadRunPrep, saveRunPrep} from '../game/RunPrepStorage';
import {ExtraDamageOnAir} from "../data/WorldMods/ExtraDamageOnAir.ts";
import {CreatureStorage} from '../game/CreatureStorage.ts';
import {CombatConfig} from '../game/combatConfig.ts';
import type {CreatureTemplate} from '../data/Creature/CreatureTemplate.ts';
import {useCreatureGif} from '../hooks/useCreatureGif.ts';

// ── Static pools ──────────────────────────────────────────────────────────────

const WORLD_MODIFIER_POOL: WorldMod[] = [
    new ExtraDamageWhenCrashIntoGround(),
    new ExtraDamageOnAir(),
];

const BASIC_BY_DIR: Partial<Record<AttackDirection, CombatAction[]>> = {};
for (const action of [...GRAND_DANCER_BASIC_ACTIONS, ...GRAND_DANCER_BASIC_ACTIONS_2]) {
    const dir = action.input?.inputDirection;
    if (dir == null) continue;
    (BASIC_BY_DIR[dir] ??= []).push(action);
}

const AVAILABLE_DIRS = Object.keys(BASIC_BY_DIR).map(Number) as AttackDirection[];

const DIR_LABEL: Record<AttackDirection, string> = {
    [AttackDirection.UP]: '↑  W',
    [AttackDirection.DOWN]: '↓  S',
    [AttackDirection.LEFT]: '←  A',
    [AttackDirection.RIGHT]: '→  D',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickRandom<T>(pool: T[], n: number): T[] {
    const copy = [...pool];
    const result: T[] = [];
    for (let i = 0; i < n && copy.length; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
    }
    return result;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REQUIRED_MODS = 1;
const REQUIRED_SPECIALS = 4;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RunPreparePage() {
    const navigate = useNavigate();

    const [availableCreatures] = useState<CreatureTemplate[]>(() => CreatureStorage.loadCreatures());
    const [selectedCompanions, setSelectedCompanions] = useState<Set<number>>(() => new Set());

    const toggleCompanion = (i: number) => setSelectedCompanions(prev => {
        const next = new Set(prev);
        if (next.has(i)) {
            next.delete(i);
        } else if (next.size < CombatConfig.maxCompanions) {
            next.add(i);
        }
        return next;
    });

    const [worldModifiers] = useState<WorldMod[]>(() => {
        const expedition = GameData.getSelectedExpedition();
        if (expedition) return [...expedition.worldMods];
        const stored = loadRunPrep();
        return stored?.worldModifiers.length ? stored.worldModifiers : pickRandom(WORLD_MODIFIER_POOL, 2);
    });

    const [comboRules] = useState<ComboRule[]>(() => [...DEFAULT_COMBO_RULES]);

    const [selectedMods, setSelectedMods] = useState<Set<number>>(() => new Set());

    const [selectedActions, setSelectedActions] = useState<Partial<Record<AttackDirection, CombatAction>>>(
        () => {
            const stored = loadRunPrep();
            const storedDirs = stored ? Object.keys(stored.actionsByDirection).map(Number) : [];
            if (stored && AVAILABLE_DIRS.every(d => storedDirs.includes(d))) {
                return stored.actionsByDirection;
            }
            return Object.fromEntries(
                AVAILABLE_DIRS.map(dir => [dir, BASIC_BY_DIR[dir]![0]]),
            ) as Partial<Record<AttackDirection, CombatAction>>;
        },
    );

    const [selectedSpecials, setSelectedSpecials] = useState<Set<number>>(() => {
        const stored = loadRunPrep();
        if (!stored) return new Set();
        return new Set(
            stored.specials
                .map(s => GRAND_DANCER_SPECIAL_ACTIONS.findIndex(a => a.name === s.name))
                .filter(i => i >= 0),
        );
    });

    const toggleMod = (i: number) => setSelectedMods(prev => {
        const next = new Set(prev);
        if (next.has(i)) {
            next.delete(i);
        } else if (next.size < REQUIRED_MODS) {
            next.add(i);
        }
        return next;
    });

    const toggleSpecial = (i: number) => setSelectedSpecials(prev => {
        const next = new Set(prev);
        if (next.has(i)) {
            next.delete(i);
        } else if (next.size < REQUIRED_SPECIALS) {
            next.add(i);
        }
        return next;
    });

    const canBegin =
        selectedMods.size === REQUIRED_MODS &&
        selectedSpecials.size === REQUIRED_SPECIALS;

    const handleBeginRun = () => {
        const runPrep = {
            worldModifiers,
            comboMods:          [...selectedMods].map(i => COMBO_MOD_POOL[i]),
            comboRules,
            actionsByDirection: selectedActions,
            specials:           [...selectedSpecials].map(i => GRAND_DANCER_SPECIAL_ACTIONS[i]),
            enemyMods:          [],
            companions:         [...selectedCompanions].map(i => availableCreatures[i]),
        };
        GameData.setRunPrep(runPrep);
        saveRunPrep(runPrep);
        navigate('/expedition-map');
    };

    const missing: string[] = [];
    if (selectedMods.size < REQUIRED_MODS)
        missing.push(`${REQUIRED_MODS - selectedMods.size} combo mod${REQUIRED_MODS - selectedMods.size > 1 ? 's' : ''}`);
    if (selectedSpecials.size < REQUIRED_SPECIALS)
        missing.push(`${REQUIRED_SPECIALS - selectedSpecials.size} special${REQUIRED_SPECIALS - selectedSpecials.size > 1 ? 's' : ''}`);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">

            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
                <button
                    onClick={() => navigate('/world-map')}
                    className="text-gray-400 hover:text-gray-700 text-sm uppercase tracking-widest transition-colors"
                >
                    ← Back
                </button>
                <h1 className="text-base font-bold uppercase tracking-widest text-amber-600">
                    Run Prepare
                </h1>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-10">

                    {/* World Modifiers */}
                    <section>
                        <SectionHeader label="World"/>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {worldModifiers.map((mod, i) => (
                                <div
                                    key={i}
                                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                                >
                                    <p className="text-sm font-bold text-gray-900 mb-1">
                                        {mod.title}
                                    </p>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {mod.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Combo Rules */}
                    <section>
                        <SectionHeader label="Combo Rules"/>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {comboRules.map((rule, i) => (
                                <div
                                    key={i}
                                    className="bg-white border border-red-200 rounded-lg p-4 shadow-sm"
                                >
                                    <p className="text-sm font-bold text-red-700 mb-1">
                                        {rule.title}
                                    </p>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {rule.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Combo Mods */}
                    <section>
                        <SectionHeader
                            label="Combo Mods"
                            count={selectedMods.size}
                            required={REQUIRED_MODS}
                        />
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            {COMBO_MOD_POOL.map((mod, i) => {
                                const selected = selectedMods.has(i);
                                const locked = !selected && selectedMods.size >= REQUIRED_MODS;
                                return (
                                    <SelectableCard
                                        key={i}
                                        selected={selected}
                                        locked={locked}
                                        onClick={() => toggleMod(i)}
                                    >
                                        <p className="text-sm font-bold text-gray-900 mb-1">
                                            {mod.constructor.name}
                                        </p>
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            {mod.description}
                                        </p>
                                    </SelectableCard>
                                );
                            })}
                        </div>
                    </section>

                    {/* Combat Actions */}
                    <section>
                        <SectionHeader label="Combat Actions"/>
                        <div className="flex flex-col gap-3 mt-4">
                            {AVAILABLE_DIRS.map(dir => {
                                const actions = BASIC_BY_DIR[dir]!;
                                const current = selectedActions[dir];
                                return (
                                    <div key={dir} className="flex items-start gap-4">
                                        <span className="w-14 pt-2 shrink-0 text-sm font-mono font-bold text-amber-600">
                                            {DIR_LABEL[dir]}
                                        </span>
                                        <div className="flex-1 flex gap-2 flex-wrap">
                                            {actions.map(action => {
                                                const active = current?.name === action.name;
                                                return (
                                                    <button
                                                        key={action.name}
                                                        onClick={() =>
                                                            setSelectedActions(prev => ({...prev, [dir]: action}))
                                                        }
                                                        className={`px-3 py-2 rounded text-sm text-left transition-colors border ${
                                                            active
                                                                ? 'border-amber-500 bg-amber-50 text-gray-900'
                                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
                                                        }`}
                                                    >
                                                        <span className="block font-medium">{action.name}</span>
                                                        <span className="block text-xs text-gray-400 mt-0.5">
                                                            {action.damage} dmg · {action.moveTypes.map(t => MoveType[t]).join(' · ')}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Specials */}
                    <section>
                        <SectionHeader
                            label="Specials"
                            count={selectedSpecials.size}
                            required={REQUIRED_SPECIALS}
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                            {GRAND_DANCER_SPECIAL_ACTIONS.map((action, i) => {
                                const selected = selectedSpecials.has(i);
                                const locked = !selected && selectedSpecials.size >= REQUIRED_SPECIALS;
                                return (
                                    <SelectableCard
                                        key={action.name}
                                        selected={selected}
                                        locked={locked}
                                        onClick={() => toggleSpecial(i)}
                                    >
                                        <p className="text-sm font-bold text-gray-900">
                                            {action.name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {action.damage} dmg
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {action.moveTypes.map(t => MoveType[t]).join(' · ')}
                                        </p>
                                    </SelectableCard>
                                );
                            })}
                        </div>
                    </section>

                    {/* Companions */}
                    {availableCreatures.length > 0 && (
                        <section>
                            <SectionHeader
                                label="Companion"
                                count={selectedCompanions.size}
                                required={CombatConfig.maxCompanions}
                            />
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                {availableCreatures.map((creature, i) => {
                                    const selected = selectedCompanions.has(i);
                                    const locked   = !selected && selectedCompanions.size >= CombatConfig.maxCompanions;
                                    return (
                                        <CompanionCard
                                            key={i}
                                            creature={creature}
                                            selected={selected}
                                            locked={locked}
                                            onClick={() => toggleCompanion(i)}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Begin Run */}
                    <div className="pb-4">
                        <button
                            disabled={!canBegin}
                            onClick={handleBeginRun}
                            className={`w-full py-4 font-bold uppercase tracking-widest rounded-lg text-base transition-colors ${
                                canBegin
                                    ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            Begin Run →
                        </button>
                        {!canBegin && (
                            <p className="text-center text-xs text-gray-400 mt-2 uppercase tracking-widest">
                                Select {missing.join(' and ')}
                            </p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
                           label,
                           count,
                           required,
                       }: {
    label: string;
    count?: number;
    required?: number;
}) {
    return (
        <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 shrink-0">
                {label}
            </h2>
            {required !== undefined && count !== undefined && (
                <span
                    className={`text-xs font-mono shrink-0 ${count >= required ? 'text-amber-600' : 'text-gray-400'}`}>
                    {count} / {required}
                </span>
            )}
            <div className="flex-1 h-px bg-gray-200"/>
        </div>
    );
}

function CompanionCard({
    creature, selected, locked, onClick,
}: {
    creature: CreatureTemplate;
    selected: boolean;
    locked:   boolean;
    onClick:  () => void;
}) {
    const gifSrc = useCreatureGif(creature.gifUrl);
    return (
        <SelectableCard selected={selected} locked={locked} onClick={onClick}>
            <div className="flex items-start gap-3">
                {creature.gifUrl !== null && (
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded">
                        {gifSrc
                            ? <img src={gifSrc} alt={creature.name} className="w-full h-full object-contain rounded" />
                            : <span className="text-xs text-gray-300">…</span>
                        }
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{creature.name}</p>
                    <p className="text-xs text-gray-400 italic mb-1.5">
                        {creature.personalities.join(' · ')}
                    </p>
                    <div className="flex flex-col gap-1">
                        {creature.supportPassives.map((p, j) => (
                            <span key={j} className="text-xs text-amber-700 font-medium">{p.title}</span>
                        ))}
                    </div>
                </div>
            </div>
        </SelectableCard>
    );
}

function SelectableCard({
                            selected,
                            locked,
                            onClick,
                            children,
                        }: {
    selected: boolean;
    locked: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={locked}
            className={`rounded-lg p-4 text-left transition-colors border shadow-sm ${
                selected
                    ? 'border-amber-500 bg-amber-50'
                    : locked
                        ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                        : 'border-gray-200 bg-white hover:border-gray-400'
            }`}
        >
            {children}
        </button>
    );
}
