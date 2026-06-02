import { useEffect, useRef, useState, useCallback } from 'react';
import { EventBus } from '../game/EventBus';
import { Events } from '../game/Events';
import { GameData } from '../game/GameData';
import { AttackDirection } from '../game/entities/CombatTypes';
import { DEFAULT_COMBO_RULES } from '../data/ComboRule/DefaultComboRules';
import type { CombatSceneV2 } from '../game/scenes/CombatSceneV2';

// ── Snapshot / state types ────────────────────────────────────────────────────

interface PlayerSnapshot {
    name:      string;
    hp:        number;
    maxHp:     number;
    energy:    number;
    maxEnergy: number;
}

interface ActionCardInfo {
    direction: AttackDirection;
    dirKey:    string;
    name:      string;
}

interface SpecialCardInfo {
    name: string | null;
}

interface ComboEntry {
    dirKey:    string;
    name:      string;
    damage:    number;
    chainMult: number;
    isCounter: boolean;
}

interface PlannerEntry {
    direction:    AttackDirection;
    dirKey:       string;
    name:         string;
    damage:       number;
    atkMultiplier: number;
    comboRating:  number;
}

interface ComboModInfo {
    title:       string;
    description: string;
}

interface WorldModInfo {
    title:       string;
    description: string;
}

interface ComboRuleInfo {
    title:       string;
    description: string;
}

interface RhythmState {
    durationMs:      number;
    earlyWindowMs:   number;
    lateWindowMs:    number;
    startedAt:       number;
    nextPlannedDir?: AttackDirection;
}

interface ParryState {
    direction: AttackDirection;
    duration:  number;
    startedAt: number;
}

const DIR_KEYS: Record<AttackDirection, string> = {
    [AttackDirection.UP]:    'W',
    [AttackDirection.DOWN]:  'S',
    [AttackDirection.LEFT]:  'A',
    [AttackDirection.RIGHT]: 'D',
};

// ── Root component ────────────────────────────────────────────────────────────

export default function CombatUI() {
    const sceneRef          = useRef<CombatSceneV2 | null>(null);
    const plannedSeqRef     = useRef<PlannerEntry[]>([]);
    const executionIdxRef   = useRef(0);

    const [player,       setPlayer]       = useState<PlayerSnapshot | null>(null);
    const [actions,      setActions]      = useState<ActionCardInfo[]>([]);
    const [specials,     setSpecials]     = useState<SpecialCardInfo[]>([]);
    const [worldMods,    setWorldMods]    = useState<WorldModInfo[]>([]);
    const [comboMods,    setComboMods]    = useState<ComboModInfo[]>([]);
    const [comboRules,   setComboRules]   = useState<ComboRuleInfo[]>([]);
    const [comboRating,  setComboRating]  = useState<number>(0);
    const [result,       setResult]       = useState<'victory' | 'defeat' | null>(null);
    const [rhythm,       setRhythm]       = useState<RhythmState | null>(null);
    const [parry,        setParry]        = useState<ParryState | null>(null);
    const [turnAnnounce, setTurnAnnounce] = useState<{ text: string; isPlayer: boolean } | null>(null);
    const [comboLog,     setComboLog]     = useState<ComboEntry[]>([]);
    const [isPlannerMode,  setIsPlannerMode]  = useState(false);
    const [plannerLog,     setPlannerLog]     = useState<PlannerEntry[]>([]);
    const [plannerMax,     setPlannerMax]     = useState(0);
    const [phaseAnnounce,  setPhaseAnnounce]  = useState<{ text: string; color: string } | null>(null);
    const [feedback,     setFeedback]     = useState<{ text: string; color: string; id: number } | null>(null);
    const [inputPrompt,  setInputPrompt]  = useState<{ forcedDir: AttackDirection | null; plannedDir: AttackDirection | null } | null>(null);
    const [hitNumbers,   setHitNumbers]   = useState<{ id: number; damage: number; comboRating: number; atkMultiplier: number }[]>([]);

    const showFeedback = useCallback((text: string, color: string) => {
        setFeedback({ text, color, id: Date.now() });
        setTimeout(() => setFeedback(null), 900);
    }, []);

    const snapshot = useCallback(() => {
        const p = sceneRef.current?.players[0];
        if (!p) return;
        setPlayer({
            name:      p.template.getName(),
            hp:        p.healthManager.getCurrentHealth(),
            maxHp:     p.healthManager.getMaxHealth(),
            energy:    p.energyManager.getCurrentEnergy(),
            maxEnergy: p.energyManager.getMaxEnergy(),
        });
    }, []);

    useEffect(() => {
        const onSceneReady = (scene: CombatSceneV2) => {
            sceneRef.current = scene;
            snapshot();

            const p = scene.players[0];
            if (p) {
                const deck    = p.actionDeck;
                const allDirs = [
                    AttackDirection.UP,
                    AttackDirection.DOWN,
                    AttackDirection.LEFT,
                    AttackDirection.RIGHT,
                ];
                setActions(allDirs.map(dir => ({
                    direction: dir,
                    dirKey:    DIR_KEYS[dir],
                    name:      deck.getAction(dir).name,
                })));
                const specs: SpecialCardInfo[] = [];
                for (let i = 0; i < deck.specialSlotCount; i++) {
                    specs.push({ name: deck.getSpecialAction(i)?.name ?? null });
                }
                setSpecials(specs);
            }

            const runPrep = GameData.getRunPrep();
            if (runPrep) {
                setWorldMods(runPrep.worldModifiers.map(m => ({ title: m.title, description: m.description })));
                setComboRules(DEFAULT_COMBO_RULES.map(r => ({ title: r.title, description: r.description })));
            }

            if (p) {
                const cards = p.comboModDeck.getCards();
                setComboMods(cards.map(m => ({ title: m.title, description: m.description })));
            }
        };

        const onTurnStart = ({ isPlayer, comboRating }: { isPlayer: boolean; comboRating: number }) => {
            snapshot();
            setComboRating(comboRating);
            setTurnAnnounce({ text: isPlayer ? 'Your Turn' : 'Enemy Turn', isPlayer });
            setTimeout(() => setTurnAnnounce(null), 900);
        };
        const onTurnEnd   = () => {
            snapshot();
            setComboLog([]); setHitNumbers([]); setIsPlannerMode(false); setPlannerLog([]); setPhaseAnnounce(null);
            plannedSeqRef.current = []; executionIdxRef.current = 0;
        };
        const onAttackStart = () => { setComboLog([]); setInputPrompt(null); executionIdxRef.current = 0; };
        const onInputPrompt = (data: { forcedDir: AttackDirection | null }) => {
            const plannedDir = plannedSeqRef.current[0]?.direction ?? null;
            setInputPrompt({ forcedDir: data.forcedDir, plannedDir });
        };
        const onActionEnd = (data: {
            action:        { name: string; input?: { inputDirection: AttackDirection } } | null;
            chainMult:     number;
            actualDamage:  number;
            comboRating?:  number;
            atkMultiplier?: number;
            isCounter?:    boolean;
        }) => {
            snapshot();
            if (!data.isCounter) executionIdxRef.current++;
            const dir    = data.action?.input?.inputDirection;
            const dirKey = dir !== undefined ? DIR_KEYS[dir] : '—';
            const cr   = data.comboRating;
            const mult = data.atkMultiplier ?? 1;
            setComboLog(prev => [...prev, {
                dirKey,
                name:      data.isCounter ? 'Counter Attack' : (data.action?.name ?? ''),
                damage:    data.actualDamage,
                chainMult: data.chainMult,
                isCounter: !!data.isCounter,
            }]);
            if (cr !== undefined) setComboRating(cr);
            const id = Date.now() + Math.random();
            setHitNumbers(prev => [...prev, { id, damage: data.actualDamage, comboRating: cr ?? 0, atkMultiplier: mult }]);
            setTimeout(() => setHitNumbers(prev => prev.filter(e => e.id !== id)), 1800);
        };
        const onEnded = ({ result: r }: { result: 'victory' | 'defeat' }) => {
            setResult(r);
            setRhythm(null);
            setParry(null);
            setInputPrompt(null);
            setTurnAnnounce(null);
            setHitNumbers([]);
            snapshot();
        };

        const onRhythmStart = (data: { durationMs: number; earlyWindowMs: number; lateWindowMs: number }) => {
            const nextPlannedDir = plannedSeqRef.current[executionIdxRef.current]?.direction;
            setRhythm({ ...data, startedAt: performance.now(), nextPlannedDir });
        };
        const onRhythmEnd = () => setRhythm(null);

        const onQteStart = (data: { direction: AttackDirection; duration: number }) => {
            setParry({ ...data, startedAt: performance.now() });
        };
        const onQteEnd       = () => setParry(null);
        const onParry        = () => showFeedback('PARRY',          '#22c55e');
        const onPlayerHit    = () => showFeedback('HIT',            '#ef4444');
        const onCounterAtk   = () => showFeedback('COUNTER ATTACK', '#a855f7');

        const onPlannerStart = (data: { maxSteps: number }) => {
            setIsPlannerMode(true);
            setPlannerLog([]);
            setPlannerMax(data.maxSteps);
            plannedSeqRef.current = [];
            setPhaseAnnounce({ text: 'Planning Phase', color: '#0ea5e9' });
            setTimeout(() => setPhaseAnnounce(null), 1200);
        };
        const onPlannerAction = (data: {
            action:          { name: string; input?: { inputDirection: AttackDirection } };
            simulatedDamage: number;
            comboRating:     number;
            atkMultiplier:   number;
        }) => {
            const dir    = data.action.input?.inputDirection;
            const dirKey = dir !== undefined ? DIR_KEYS[dir] : '—';
            const entry: PlannerEntry = {
                direction:     dir ?? AttackDirection.UP,
                dirKey,
                name:          data.action.name,
                damage:        data.simulatedDamage,
                atkMultiplier: data.atkMultiplier,
                comboRating:   data.comboRating,
            };
            setPlannerLog(prev => [...prev, entry]);
            plannedSeqRef.current = [...plannedSeqRef.current, entry];
        };
        const onPlannerUndo = () => {
            setPlannerLog(prev => prev.slice(0, -1));
            plannedSeqRef.current = plannedSeqRef.current.slice(0, -1);
        };
        const onPlannerEnd  = () => {
            setIsPlannerMode(false);
            setPlannerLog([]);
            setPhaseAnnounce({ text: 'Execute!', color: '#f59e0b' });
            setTimeout(() => setPhaseAnnounce(null), 900);
        };

        EventBus.on(Events.CURRENT_SCENE_READY,            onSceneReady);
        EventBus.on(Events.COMBAT_V2_TURN_START,           onTurnStart);
        EventBus.on(Events.COMBAT_V2_TURN_END,             onTurnEnd);
        EventBus.on(Events.COMBAT_V2_PLAYER_INPUT_PROMPT,  onInputPrompt);
        EventBus.on(Events.COMBAT_V2_PLAYER_ATTACK_START,  onAttackStart);
        EventBus.on(Events.COMBAT_V2_PLAYER_ACTION_END,    onActionEnd);
        EventBus.on(Events.COMBAT_V2_ENDED,             onEnded);
        EventBus.on(Events.COMBAT_V2_RHYTHM_START,      onRhythmStart);
        EventBus.on(Events.COMBAT_V2_RHYTHM_END,        onRhythmEnd);
        EventBus.on(Events.COMBAT_V2_QTE_START,      onQteStart);
        EventBus.on(Events.COMBAT_V2_QTE_END,        onQteEnd);
        EventBus.on(Events.COMBAT_V2_PARRY,          onParry);
        EventBus.on(Events.COMBAT_V2_PLAYER_HIT,     onPlayerHit);
        EventBus.on(Events.COMBAT_V2_COUNTER_ATTACK, onCounterAtk);
        EventBus.on(Events.COMBAT_V2_PLANNER_START,  onPlannerStart);
        EventBus.on(Events.COMBAT_V2_PLANNER_ACTION, onPlannerAction);
        EventBus.on(Events.COMBAT_V2_PLANNER_UNDO,   onPlannerUndo);
        EventBus.on(Events.COMBAT_V2_PLANNER_END,    onPlannerEnd);

        return () => {
            EventBus.off(Events.CURRENT_SCENE_READY,            onSceneReady);
            EventBus.off(Events.COMBAT_V2_TURN_START,           onTurnStart);
            EventBus.off(Events.COMBAT_V2_TURN_END,             onTurnEnd);
            EventBus.off(Events.COMBAT_V2_PLAYER_INPUT_PROMPT,  onInputPrompt);
            EventBus.off(Events.COMBAT_V2_PLAYER_ATTACK_START,  onAttackStart);
            EventBus.off(Events.COMBAT_V2_PLAYER_ACTION_END,   onActionEnd);
            EventBus.off(Events.COMBAT_V2_ENDED,             onEnded);
            EventBus.off(Events.COMBAT_V2_RHYTHM_START,      onRhythmStart);
            EventBus.off(Events.COMBAT_V2_RHYTHM_END,        onRhythmEnd);
            EventBus.off(Events.COMBAT_V2_QTE_START,      onQteStart);
            EventBus.off(Events.COMBAT_V2_QTE_END,        onQteEnd);
            EventBus.off(Events.COMBAT_V2_PARRY,          onParry);
            EventBus.off(Events.COMBAT_V2_PLAYER_HIT,     onPlayerHit);
            EventBus.off(Events.COMBAT_V2_COUNTER_ATTACK, onCounterAtk);
            EventBus.off(Events.COMBAT_V2_PLANNER_START,  onPlannerStart);
            EventBus.off(Events.COMBAT_V2_PLANNER_ACTION, onPlannerAction);
            EventBus.off(Events.COMBAT_V2_PLANNER_UNDO,   onPlannerUndo);
            EventBus.off(Events.COMBAT_V2_PLANNER_END,    onPlannerEnd);
        };
    }, [snapshot, showFeedback]);

    if (!player) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-10">

            {/* Turn announcement */}
            {turnAnnounce && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <p className={`text-5xl font-black uppercase tracking-widest drop-shadow-lg ${
                        turnAnnounce.isPlayer ? 'text-amber-500' : 'text-red-500'
                    }`}>
                        {turnAnnounce.text}
                    </p>
                </div>
            )}

            {/* Phase announcement */}
            {phaseAnnounce && (
                <PhaseAnnounce text={phaseAnnounce.text} color={phaseAnnounce.color} />
            )}

            {/* Top section: info bar + combo log + feedback + timing overlays */}
            <div className="absolute top-0 left-0 right-0 flex flex-col">
                <TopBar
                    player={player}
                    actions={actions}
                    specials={specials}
                    worldMods={worldMods}
                    comboMods={comboMods}
                    comboRules={comboRules}
                    comboRating={comboRating}
                />
                {isPlannerMode
                    ? <PlannerStrip log={plannerLog} maxSteps={plannerMax} />
                    : comboLog.length > 0 && <ComboLogStrip log={comboLog} />
                }
                {inputPrompt && <PlayerInputPrompt forcedDir={inputPrompt.forcedDir} plannedDir={inputPrompt.plannedDir} />}
                {feedback && (
                    <CombatFeedbackText
                        key={feedback.id}
                        text={feedback.text}
                        color={feedback.color}
                    />
                )}
                {rhythm && (
                    <RhythmOverlay
                        key={rhythm.startedAt}
                        durationMs={rhythm.durationMs}
                        earlyWindowMs={rhythm.earlyWindowMs}
                        lateWindowMs={rhythm.lateWindowMs}
                        nextPlannedDir={rhythm.nextPlannedDir}
                    />
                )}
                {parry && (
                    <ParryOverlay
                        key={parry.startedAt}
                        direction={parry.direction}
                        duration={parry.duration}
                    />
                )}
            </div>

            {/* Floating hit numbers */}
            {hitNumbers.length > 0 && (
                <div className="absolute right-[35%] top-[35%] flex flex-col items-center gap-2 pointer-events-none">
                    {hitNumbers.map((h, i) => (
                        <HitNumber key={h.id} damage={h.damage} comboRating={h.comboRating} atkMultiplier={h.atkMultiplier} index={i} />
                    ))}
                </div>
            )}

            {/* Combat result overlay */}
            {result && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-auto">
                    <div className="bg-white rounded-2xl px-12 py-8 text-center shadow-2xl">
                        <p className={`text-4xl font-bold tracking-widest uppercase ${
                            result === 'victory' ? 'text-amber-600' : 'text-red-500'
                        }`}>
                            {result === 'victory' ? 'Victory' : 'Defeat'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Top info bar ──────────────────────────────────────────────────────────────

function TopBar({
    player, actions, specials, worldMods, comboMods, comboRules, comboRating,
}: {
    player:      PlayerSnapshot;
    actions:     ActionCardInfo[];
    specials:    SpecialCardInfo[];
    worldMods:   WorldModInfo[];
    comboMods:   ComboModInfo[];
    comboRules:  ComboRuleInfo[];
    comboRating: number;
}) {
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);

    return (
        <div className="w-full bg-white/95 border-b border-gray-200 shadow-sm flex items-start gap-4 px-4 py-3 flex-wrap">

            {/* Player stats */}
            <div className="flex-shrink-0 min-w-[160px]">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Player</p>
                <p className="text-sm font-bold text-gray-900 mb-2">{player.name}</p>
                <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                        <span>HP</span>
                        <span>{player.hp} / {player.maxHp}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-36">
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width:           `${hpPct}%`,
                                backgroundColor: hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444',
                            }}
                        />
                    </div>
                </div>
                <div className="flex gap-0.5 flex-wrap">
                    {Array.from({ length: player.maxEnergy }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-full border transition-colors ${
                                i < player.energy
                                    ? 'bg-amber-400 border-amber-500'
                                    : 'bg-gray-100 border-gray-200'
                            }`}
                        />
                    ))}
                </div>
            </div>

            <div className="w-px self-stretch bg-gray-200" />

            {/* Action cards */}
            <div className="flex-shrink-0">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">Actions</p>
                <div className="flex gap-1.5 flex-wrap">
                    {actions.map(a => (
                        <div key={a.dirKey} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-center w-24">
                            <span className="block text-xs font-bold text-amber-600 mb-0.5">[{a.dirKey}]</span>
                            <span className="block text-xs text-gray-700 leading-tight">{a.name}</span>
                        </div>
                    ))}
                </div>
                {specials.some(s => s.name) && (
                    <div className="flex gap-1.5 mt-1.5">
                        {specials.map((s, i) => s.name ? (
                            <div key={i} className="bg-purple-50 border border-purple-200 rounded-lg px-2 py-1.5 text-center w-24">
                                <span className="block text-xs font-bold text-purple-600 mb-0.5">SP{i + 1}</span>
                                <span className="block text-xs text-gray-700 leading-tight">{s.name}</span>
                            </div>
                        ) : null)}
                    </div>
                )}
            </div>

            {worldMods.length > 0 && (
                <>
                    <div className="w-px self-stretch bg-gray-200" />
                    <div className="flex-shrink-0 max-w-[220px]">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">World</p>
                        <div className="flex flex-col gap-1.5">
                            {worldMods.map((m, i) => (
                                <div key={i} className="rounded-md bg-blue-50 border border-blue-200 px-2 py-1">
                                    <span className="block text-xs font-bold text-blue-700 mb-0.5">{m.title}</span>
                                    <span className="block text-xs text-blue-600 leading-tight">{m.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {comboMods.length > 0 && (
                <>
                    <div className="w-px self-stretch bg-gray-200" />
                    <div className="flex-shrink-0 max-w-[260px]">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">Combo Mods</p>
                        <div className="flex flex-col gap-1.5">
                            {comboMods.map((m, i) => (
                                <div key={i} className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1">
                                    <span className="block text-xs font-bold text-amber-700 mb-0.5">{m.title}</span>
                                    <span className="block text-xs text-amber-600 leading-tight">{m.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {comboRules.length > 0 && (
                <>
                    <div className="w-px self-stretch bg-gray-200" />
                    <div className="flex-shrink-0 max-w-[260px]">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">Combo Rules</p>
                        <div className="flex flex-col gap-1.5">
                            {comboRules.map((r, i) => (
                                <div key={i} className="rounded-md bg-red-50 border border-red-200 px-2 py-1">
                                    <span className="block text-xs font-bold text-red-700 mb-0.5">{r.title}</span>
                                    <span className="block text-xs text-red-600 leading-tight">{r.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <>
                <div className="w-px self-stretch bg-gray-200" />
                <div className="flex-shrink-0 min-w-[80px]">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">Rating</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-amber-500 leading-none">{comboRating}</span>
                        <span className="text-xs text-gray-400">/ 10</span>
                    </div>
                </div>
            </>
        </div>
    );
}

// ── Rhythm overlay ────────────────────────────────────────────────────────────

function RhythmOverlay({ durationMs, earlyWindowMs, lateWindowMs, nextPlannedDir }: {
    durationMs:      number;
    earlyWindowMs:   number;
    lateWindowMs:    number;
    nextPlannedDir?: AttackDirection;
}) {
    const TRACK_W   = 480;
    const TARGET_X  = 400;
    const CIRCLE_R  = 32; // px radius of target circle

    const pxPerMs  = TARGET_X / durationMs;
    const earlyPx  = earlyWindowMs * pxPerMs;
    const latePx   = lateWindowMs  * pxPerMs;

    const [markerX, setMarkerX] = useState(0);

    useEffect(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setMarkerX(TARGET_X);
            });
        });
    }, []);

    return (
        <div className="w-full flex justify-center py-2 bg-black/5">
            <div className="bg-white/95 border border-gray-200 rounded-xl px-5 py-3 shadow-lg">
                <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-2">Next Input</p>
                <div className="relative" style={{ width: TRACK_W, height: CIRCLE_R * 2 }}>
                    {/* Track */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 bg-gray-100 rounded-full"
                        style={{ left: 0, right: 0, height: 6 }}
                    />
                    {/* Timing window */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 bg-green-300/60 rounded"
                        style={{
                            left:   TARGET_X - earlyPx,
                            width:  earlyPx + latePx,
                            height: 16,
                        }}
                    />
                    {/* Target circle with planned direction */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 rounded-full border-4 border-amber-400 bg-amber-50 flex items-center justify-center"
                        style={{ left: TARGET_X - CIRCLE_R, width: CIRCLE_R * 2, height: CIRCLE_R * 2 }}
                    >
                        {nextPlannedDir !== undefined && (
                            <span className="text-3xl font-black text-amber-700 leading-none select-none">
                                {PARRY_DIR_ARROW[nextPlannedDir]}
                            </span>
                        )}
                    </div>
                    {/* Moving marker */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-700 shadow"
                        style={{
                            left:       markerX - 10,
                            transition: `left ${durationMs}ms linear`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ── Parry circle overlay ──────────────────────────────────────────────────────

const PARRY_DIR_ARROW: Record<AttackDirection, string> = {
    [AttackDirection.UP]:    '↑',
    [AttackDirection.DOWN]:  '↓',
    [AttackDirection.LEFT]:  '←',
    [AttackDirection.RIGHT]: '→',
};

function ParryOverlay({ direction, duration }: { direction: AttackDirection; duration: number }) {
    const OUTER_R_START = 144;
    const INNER_R       = 40;
    const PADDING       = 20;
    const SIZE          = (OUTER_R_START + PADDING) * 2;
    const CX            = SIZE / 2;

    const [outerR, setOuterR] = useState(OUTER_R_START);

    useEffect(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setOuterR(0);
            });
        });
    }, []);

    return (
        <div className="w-full flex justify-center py-2 bg-black/5">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {/* Shrinking outer circle */}
                <circle
                    cx={CX} cy={CX}
                    r={outerR}
                    fill="rgba(239,68,68,0.08)"
                    stroke="#ef4444"
                    strokeWidth="8"
                    style={{ transition: `r ${duration}ms linear` }}
                />
                {/* Fixed inner parry-zone circle */}
                <circle
                    cx={CX} cy={CX} r={INNER_R}
                    fill="rgba(239,68,68,0.12)"
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeDasharray="6 6"
                />
                {/* Direction arrow */}
                <text
                    x={CX}
                    y={CX}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="48"
                    fontWeight="bold"
                    fill="#1f2937"
                >
                    {PARRY_DIR_ARROW[direction]}
                </text>
            </svg>
        </div>
    );
}

// ── Combat feedback text ──────────────────────────────────────────────────────

function CombatFeedbackText({ text, color }: { text: string; color: string }) {
    const [opacity, setOpacity] = useState(1);
    const [scale,   setScale]   = useState(1.3);

    useEffect(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setScale(1);
            });
        });
        const t = setTimeout(() => setOpacity(0), 500);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            className="w-full text-center py-1 pointer-events-none select-none"
            style={{
                opacity,
                transform:  `scale(${scale})`,
                transition: 'opacity 0.4s ease-out, transform 0.2s ease-out',
                transformOrigin: 'center top',
            }}
        >
            <p
                className="text-4xl font-black uppercase tracking-widest drop-shadow-2xl whitespace-nowrap"
                style={{ color }}
            >
                {text}
            </p>
        </div>
    );
}

// ── Player input prompt (static timing circle) ───────────────────────────────

function PlayerInputPrompt({ forcedDir, plannedDir }: { forcedDir: AttackDirection | null; plannedDir?: AttackDirection | null }) {
    const OUTER_R = 144;
    const INNER_R = 40;
    const PADDING = 20;
    const SIZE    = (OUTER_R + PADDING) * 2;
    const CX      = SIZE / 2;

    const shownDir = forcedDir ?? plannedDir ?? null;

    return (
        <div className="w-full flex justify-center py-2 bg-black/5">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {/* Static outer circle — amber, no animation */}
                <circle
                    cx={CX} cy={CX} r={OUTER_R}
                    fill="rgba(245,158,11,0.08)"
                    stroke="#f59e0b"
                    strokeWidth="8"
                />
                {/* Inner zone circle */}
                <circle
                    cx={CX} cy={CX} r={INNER_R}
                    fill="rgba(245,158,11,0.12)"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    strokeDasharray="6 6"
                />
                {shownDir !== null && (
                    <text
                        x={CX} y={CX}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="96"
                        fontWeight="bold"
                        fill="#1f2937"
                    >
                        {PARRY_DIR_ARROW[shownDir]}
                    </text>
                )}
            </svg>
        </div>
    );
}

// ── Floating hit number ───────────────────────────────────────────────────────

function HitNumber({ damage, comboRating, atkMultiplier, index }: { damage: number; comboRating: number; atkMultiplier: number; index: number }) {
    const [opacity, setOpacity] = useState(1);
    const [translateY, setTranslateY] = useState(0);

    useEffect(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTranslateY(-80);
                setTimeout(() => setOpacity(0), 1400);
            });
        });
    }, []);

    return (
        <div
            className="pointer-events-none select-none text-center"
            style={{
                opacity,
                transform:  `translateY(${translateY - index * 120}px)`,
                transition: 'transform 1.2s ease-out, opacity 0.4s ease-out 1.4s',
            }}
        >
            <div style={{ fontSize: '9rem', lineHeight: 1, fontWeight: 900, color: '#ef4444', textShadow: '0 6px 20px rgba(239,68,68,0.6)', filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.4))' }}>
                -{damage}
            </div>
            <div className="flex items-center justify-center gap-6 mt-2">
                {atkMultiplier !== 1 && (
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: '#22c55e', textShadow: '0 3px 10px rgba(34,197,94,0.5)' }}>
                        ×{atkMultiplier.toFixed(2)}
                    </div>
                )}
                {comboRating > 0 && (
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: '#f59e0b', textShadow: '0 3px 10px rgba(245,158,11,0.5)' }}>
                        ★ {comboRating}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Phase announce ────────────────────────────────────────────────────────────

function PhaseAnnounce({ text, color }: { text: string; color: string }) {
    const [opacity, setOpacity] = useState(1);
    const [scale,   setScale]   = useState(1.15);

    useEffect(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setScale(1));
        });
        const t = setTimeout(() => setOpacity(0), 700);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            style={{ opacity, transition: 'opacity 0.5s ease-out' }}
        >
            <p
                className="text-7xl font-black uppercase tracking-widest drop-shadow-2xl"
                style={{
                    color,
                    transform:  `scale(${scale})`,
                    transition: 'transform 0.25s ease-out',
                    textShadow: `0 0 40px ${color}88`,
                }}
            >
                {text}
            </p>
        </div>
    );
}

// ── Planner strip ─────────────────────────────────────────────────────────────

function PlannerStrip({ log, maxSteps }: { log: PlannerEntry[]; maxSteps: number }) {
    const totalDamage = log.reduce((sum, e) => sum + e.damage, 0);
    const isFull      = log.length >= maxSteps;

    return (
        <div className="bg-sky-50/95 border-b border-sky-300 flex items-center gap-2 px-4 py-2 overflow-x-auto">
            <div className="flex-shrink-0 flex flex-col items-start mr-1">
                <span className="text-xs font-bold uppercase tracking-widest text-sky-600">Plan</span>
                <span className={`text-xs font-bold tabular-nums ${isFull ? 'text-red-500' : 'text-sky-400'}`}>
                    {log.length}/{maxSteps}
                </span>
            </div>

            {log.length === 0 ? (
                <span className="text-xs text-sky-400 italic">Press WASD to plan your combo…</span>
            ) : (
                log.map((entry, i) => (
                    <div
                        key={i}
                        className="flex-shrink-0 rounded-lg border border-sky-200 bg-white text-xs overflow-hidden"
                    >
                        {/* Header row: key + name */}
                        <div className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-1">
                            <span className="font-bold text-sky-600">[{entry.dirKey}]</span>
                            <span className="font-medium text-gray-800">{entry.name}</span>
                        </div>
                        {/* Stats row */}
                        <div className="flex items-center gap-0 border-t border-sky-100 divide-x divide-sky-100">
                            <span className="px-2 py-1 font-bold text-red-500 bg-red-50/60">~{entry.damage}</span>
                            <span className="px-2 py-1 font-bold text-green-600 bg-green-50/60">×{entry.atkMultiplier.toFixed(2)}</span>
                            <span className="px-2 py-1 font-bold text-amber-600 bg-amber-50/60">★{entry.comboRating}</span>
                        </div>
                    </div>
                ))
            )}

            {log.length > 0 && (
                <div className="ml-auto flex-shrink-0 bg-red-50 border border-red-200 rounded-lg px-3 py-1 text-xs font-bold text-red-500">
                    ~{totalDamage} total
                </div>
            )}

            <span className="flex-shrink-0 text-xs text-sky-400 ml-2">[Enter] confirm · [Del/Esc] undo</span>
        </div>
    );
}

// ── Combo log strip ───────────────────────────────────────────────────────────

function ComboLogStrip({ log }: { log: ComboEntry[] }) {
    const total = log.reduce((sum, e) => sum + e.damage, 0);

    return (
        <div className="bg-amber-50/95 border-b border-amber-200 flex items-center gap-2 px-4 py-2 overflow-x-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 flex-shrink-0 mr-1">
                Combo
            </span>

            {log.map((entry, i) => (
                <div
                    key={i}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1 border text-xs ${
                        entry.isCounter
                            ? 'bg-purple-50 border-purple-300 text-purple-800'
                            : 'bg-white border-amber-200 text-gray-800'
                    }`}
                >
                    {!entry.isCounter && (
                        <span className="font-bold text-amber-600">[{entry.dirKey}]</span>
                    )}
                    <span className="font-medium">{entry.name}</span>
                    <span className="font-bold text-red-500">−{entry.damage}</span>
                    {entry.chainMult > 1 && (
                        <span className="text-green-600 font-bold">
                            ×{entry.chainMult.toFixed(2)}
                        </span>
                    )}
                </div>
            ))}

            {log.length > 1 && (
                <div className="ml-auto flex-shrink-0 bg-red-50 border border-red-200 rounded-lg px-3 py-1 text-xs font-bold text-red-600">
                    Total −{total}
                </div>
            )}
        </div>
    );
}
