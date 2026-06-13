import { useEffect, useRef, useState, useCallback } from 'react';
import { animate } from 'animejs';
import { useCreatureGif } from '../hooks/useCreatureGif';
import { useNavigate } from 'react-router-dom';
import { EventBus } from '../game/EventBus';
import { Events } from '../game/Events';
import { GameData } from '../game/GameData';
import { AttackDirection, DancerCombatSpecialAction } from '../game/entities/CombatTypes';
import { DEFAULT_COMBO_RULES } from '../data/ComboRule/DefaultComboRules';
import { CombatConfig } from '../game/combatConfig';
import { CombatFeatureFlags } from '../game/combatFeatureFlags';
import { QTE_PARRY_WINDOW } from '../game/combatConstants';
import type { CombatSceneV2 } from '../game/scenes/CombatSceneV2';
import { saveRunPrep } from '../game/RunPrepStorage';
import { ResourceStorage } from '../game/ResourceStorage';
import { EdibleLightning, EdibleCloud } from '../data/Creature/Food';
import type { Food } from '../data/Creature/Food';
import { ENEMY_MOD_CHOICES, enemyModLabel, enemyModDescription } from '../data/EnemyMod';
import type { EnemyMod } from '../data/EnemyMod';
import { COMBO_MOD_POOL } from '../data/ComboModPool';
import type { ComboMod } from '../data/ComboMod/ComboMod';

// ── Snapshot / state types ────────────────────────────────────────────────────

interface PlayerSnapshot {
    name:  string;
    hp:    number;
    maxHp: number;
}

interface ActionCardInfo {
    direction: AttackDirection;
    dirKey:    string;
    name:      string;
}

interface SpecialCardInfo {
    name:              string | null;
    inputSeq:          AttackDirection[] | null;
    ratingRequirement: number;
    damage:            number;
}

interface ComboEntry {
    dirKey:    string;
    name:      string;
    damage:    number;
    chainMult: number;
    isCounter: boolean;
}

interface PlannerEntry {
    direction:     AttackDirection | null;
    displayKey:    string;
    name:          string;
    damage:        number;
    atkMultiplier: number;
    comboRating:   number;
    waitMs:        number;
    sequenceSteps?: { dir: AttackDirection; waitMs: number }[];
}

interface ComboModInfo {
    title:       string;
    description: string;
}

interface CompanionInfo {
    name:     string;
    gifUrl:   string | null;
    passives: { title: string; description: string }[];
}

// ── Reward choice ─────────────────────────────────────────────────────────────

interface RewardChoice {
    food:     Food;
    enemyMod: EnemyMod;
}

const FOOD_POOL: Food[] = [new EdibleLightning(), new EdibleCloud()];

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

interface InputPhaseState {
    initialDelayMs: number;
    moveSettleMs:   number;
    actionSettleMs: number;
    startedAt:      number;
}

interface ParryState {
    direction: AttackDirection;
    duration:  number;
    startedAt: number;
}

interface SwordState {
    direction:       AttackDirection;
    parryWindowStart: number;   // ms from mount when parry becomes allowed (= action.duration - QTE_PARRY_WINDOW)
    startedAt:       number;
}

const DIR_KEYS: Record<AttackDirection, string> = {
    [AttackDirection.UP]:    'W',
    [AttackDirection.DOWN]:  'S',
    [AttackDirection.LEFT]:  'A',
    [AttackDirection.RIGHT]: 'D',
};

// ── Root component ────────────────────────────────────────────────────────────

export default function CombatUI() {
    const navigate          = useNavigate();
    const sceneRef          = useRef<CombatSceneV2 | null>(null);
    const plannedSeqRef     = useRef<PlannerEntry[]>([]);
    const executionIdxRef   = useRef(0);

    const [player,       setPlayer]       = useState<PlayerSnapshot | null>(null);
    const [actions,      setActions]      = useState<ActionCardInfo[]>([]);
    const [specials,     setSpecials]     = useState<SpecialCardInfo[]>([]);
    const [worldMods,    setWorldMods]    = useState<WorldModInfo[]>([]);
    const [comboMods,    setComboMods]    = useState<ComboModInfo[]>([]);
    const [companions,   setCompanions]   = useState<CompanionInfo[]>([]);
    const [comboRules,   setComboRules]   = useState<ComboRuleInfo[]>([]);
    const [comboRating,  setComboRating]  = useState<number>(0);
    const [result,          setResult]          = useState<'victory' | 'defeat' | null>(null);
    const [victoryStep,     setVictoryStep]     = useState<'combo-mod' | 'reward' | 'none'>('none');
    const [comboModChoices, setComboModChoices] = useState<ComboMod[]>([]);
    const [rewardChoices,   setRewardChoices]   = useState<RewardChoice[]>([]);
    const [rhythm,       setRhythm]       = useState<RhythmState | null>(null);
    const [parry,        setParry]        = useState<ParryState | null>(null);
    const [sword,        setSword]        = useState<SwordState | null>(null);
    const [turnAnnounce, setTurnAnnounce] = useState<{ text: string; isPlayer: boolean } | null>(null);
    const [comboLog,     setComboLog]     = useState<ComboEntry[]>([]);
    const [isPlannerMode,  setIsPlannerMode]  = useState(false);
    const [plannerLog,     setPlannerLog]     = useState<PlannerEntry[]>([]);
    const [plannerMax,     setPlannerMax]     = useState(0);
    const [plannerStage,   setPlannerStage]   = useState<'planning' | 'auto-combo' | null>(null);
    const [phaseAnnounce,  setPhaseAnnounce]  = useState<{ text: string; color: string } | null>(null);
    const [feedback,     setFeedback]     = useState<{ text: string; color: string; id: number } | null>(null);
    const [inputPrompt,  setInputPrompt]  = useState<{ forcedDir: AttackDirection | null; plannedDir: AttackDirection | null } | null>(null);
    const [hitNumbers,   setHitNumbers]   = useState<{ id: number; damage: number; comboRating: number; atkMultiplier: number }[]>([]);
    const [inputPhase,      setInputPhase]      = useState<InputPhaseState | null>(null);
    const [executionIdx,    setExecutionIdx]    = useState(0);
    const [timedInputFlash,  setTimedInputFlash]  = useState(0);
    const [showInstructions, setShowInstructions] = useState(false);
    const [dirTokens, setDirTokens] = useState<Record<AttackDirection, number>>({
        [AttackDirection.UP]:    0,
        [AttackDirection.DOWN]:  0,
        [AttackDirection.LEFT]:  0,
        [AttackDirection.RIGHT]: 0,
    });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 't') setShowInstructions(v => !v);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const showFeedback = useCallback((text: string, color: string) => {
        setFeedback({ text, color, id: Date.now() });
        setTimeout(() => setFeedback(null), 900);
    }, []);

    const snapshot = useCallback(() => {
        const p = sceneRef.current?.players[0];
        if (!p) return;
        setPlayer({
            name:  p.template.getName(),
            hp:    p.healthManager.getCurrentHealth(),
            maxHp: p.healthManager.getMaxHealth(),
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
                const specs: SpecialCardInfo[] = deck.getAllSpecials().map(sp => ({
                    name:              sp.name,
                    inputSeq:          sp.input?.inputSequence ?? null,
                    ratingRequirement: sp instanceof DancerCombatSpecialAction ? sp.ratingRequirement : 0,
                    damage:            sp.damage,
                }));
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

            setCompanions((runPrep?.companions ?? []).map(c => ({
                name:     c.name,
                gifUrl:   c.gifUrl,
                passives: c.supportPassives.map(sp => ({ title: sp.title, description: sp.description })),
            })));
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
            setInputPhase(null); setExecutionIdx(0); setPlannerStage(null as 'planning' | 'auto-combo' | null);
            plannedSeqRef.current = []; executionIdxRef.current = 0;
            // dirTokens intentionally NOT reset here — unused tokens carry over to the next player turn
        };
        const onAttackStart = () => {
            setComboLog([]); setInputPrompt(null);
            executionIdxRef.current = 0; setExecutionIdx(0);
        };
        const onInputPrompt = (data: { forcedDir: AttackDirection | null }) => {
            const plannedDir = plannedSeqRef.current[0]?.direction ?? null;
            setInputPrompt({ forcedDir: data.forcedDir, plannedDir });
        };
        const onActionEnd = (data: {
            action:        { name: string; input?: { inputDirection: AttackDirection | null; inputSpecialKey?: number | null } | null } | null;
            chainMult:     number;
            actualDamage:  number;
            comboRating?:  number;
            atkMultiplier?: number;
            isCounter?:    boolean;
        }) => {
            snapshot();
            if (!data.isCounter) {
                executionIdxRef.current++;
                setExecutionIdx(executionIdxRef.current);
            }
            const inp    = data.action?.input;
            const dirKey = inp?.inputDirection != null  ? DIR_KEYS[inp.inputDirection]
                         : inp?.inputSpecialKey != null ? String(inp.inputSpecialKey)
                         : '—';
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
            if (r === 'victory') {
                const nodeIdx    = GameData.getSelectedExpedition()?.map.currentIndex ?? 0;
                const posInStage = nodeIdx % 4;  // 0=first, 3=last

                if (posInStage === 0) {
                    // First level of stage — combo mod reward.
                    const runPrep    = GameData.getRunPrep();
                    const ownedNames = new Set((runPrep?.comboMods ?? []).map(m => m.constructor.name));
                    const pool       = COMBO_MOD_POOL.filter(m => !ownedNames.has(m.constructor.name));
                    const choices: ComboMod[] = [];
                    for (let i = 0; i < 3 && pool.length; i++) {
                        choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
                    }
                    setComboModChoices(choices);
                    setVictoryStep('combo-mod');
                } else if (posInStage === 3) {
                    // Last level of stage — resource + enemy upgrade reward.
                    const enemyModPool = [...ENEMY_MOD_CHOICES];
                    const choices: RewardChoice[] = [];
                    for (let i = 0; i < 2; i++) {
                        const food     = FOOD_POOL[Math.floor(Math.random() * FOOD_POOL.length)];
                        const modIdx   = Math.floor(Math.random() * enemyModPool.length);
                        const enemyMod = enemyModPool.splice(modIdx, 1)[0];
                        choices.push({ food, enemyMod });
                    }
                    setRewardChoices(choices);
                    setVictoryStep('reward');
                } else {
                    setVictoryStep('none');
                }
            }
        };

        const onRhythmStart = (data: { durationMs: number; earlyWindowMs: number; lateWindowMs: number }) => {
            const entry = plannedSeqRef.current[executionIdxRef.current];
            // Only pass direction hint for direction-based actions; specials show via InputPhaseStrip
            const nextPlannedDir = entry?.direction ?? undefined;
            setRhythm({ ...data, startedAt: performance.now(), nextPlannedDir });
        };
        const onRhythmEnd = () => setRhythm(null);

        // Sword mounts here — before QTE_START — so it can strike 30ms before parry window opens.
        const onEnemyMoveStart = (data: { action: { direction: AttackDirection; duration: number } }) => {
            const parryWindowStart = data.action.duration - QTE_PARRY_WINDOW;
            setSword({ direction: data.action.direction, parryWindowStart, startedAt: performance.now() });
        };

        const onQteStart = (data: { direction: AttackDirection; duration: number }) => {
            setParry({ ...data, startedAt: performance.now() });
        };
        const onQteEnd = () => { setParry(null); setSword(null); };
        const onParry        = () => showFeedback('PARRY',          '#22c55e');
        const onWrongBlock   = () => showFeedback('BLOCK',          '#f59e0b');
        const onPlayerHit    = () => showFeedback('HIT',            '#ef4444');
        const onCounterAtk   = () => showFeedback('COUNTER ATTACK', '#a855f7');

        const onPlannerStart = (data: { maxSteps: number; tokenCounts: Record<AttackDirection, number> }) => {
            setIsPlannerMode(true);
            setPlannerLog([]);
            setPlannerMax(data.maxSteps);
            plannedSeqRef.current = [];
            setDirTokens({ ...data.tokenCounts });
            setPlannerStage(null);
            setPhaseAnnounce({ text: 'Planning Phase', color: '#0ea5e9' });
            setTimeout(() => setPhaseAnnounce(null), 1200);
        };
        const onPlannerStage = (data: { stage: 'planning' | 'auto-combo' }) => {
            setPlannerStage(data.stage);
        };
        const onPlannerAction = (data: {
            action:          { name: string; input?: { inputDirection: AttackDirection | null; inputSpecialKey?: number | null } };
            displayKey:      string;
            simulatedDamage: number;
            comboRating:     number;
            atkMultiplier:   number;
            waitMs:          number;
            tokenCounts?:    Record<AttackDirection, number>;
            sequenceSteps?:  { dir: AttackDirection; waitMs: number }[];
        }) => {
            const dir = data.action.input?.inputDirection ?? null;
            const entry: PlannerEntry = {
                direction:     dir,
                displayKey:    data.displayKey,
                name:          data.action.name,
                damage:        data.simulatedDamage,
                atkMultiplier: data.atkMultiplier,
                comboRating:   data.comboRating,
                waitMs:        data.waitMs,
                sequenceSteps: data.sequenceSteps,
            };
            setPlannerLog(prev => [...prev, entry]);
            plannedSeqRef.current = [...plannedSeqRef.current, entry];
            setComboRating(data.comboRating);
            if (data.tokenCounts) {
                setDirTokens({ ...data.tokenCounts });
            } else if (dir !== null) {
                setDirTokens(prev => ({ ...prev, [dir]: Math.max(0, (prev[dir] ?? 0) - 1) }));
            }
        };
        const onPlannerUndo = (data: { comboRating: number; tokenCounts?: Record<AttackDirection, number> }) => {
            const removed = plannedSeqRef.current[plannedSeqRef.current.length - 1];
            setPlannerLog(prev => prev.slice(0, -1));
            plannedSeqRef.current = plannedSeqRef.current.slice(0, -1);
            setComboRating(data.comboRating);
            if (data.tokenCounts) {
                setDirTokens({ ...data.tokenCounts });
            } else {
                const removedDir = removed?.direction ?? null;
                if (removedDir !== null) {
                    setDirTokens(prev => ({ ...prev, [removedDir]: (prev[removedDir] ?? 0) + 1 }));
                }
            }
        };
        const onPlannerEnd  = () => {
            setIsPlannerMode(false);
            setPlannerLog([]);
            setPhaseAnnounce({ text: 'Execute!', color: '#f59e0b' });
            setTimeout(() => setPhaseAnnounce(null), 900);
        };
        const onInputPhaseStart = (data: { initialDelayMs: number; moveSettleMs: number; actionSettleMs: number }) => {
            setInputPhase({ ...data, startedAt: performance.now() });
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
        EventBus.on(Events.COMBAT_V2_ENEMY_MOVE_START, onEnemyMoveStart);
        EventBus.on(Events.COMBAT_V2_QTE_START,       onQteStart);
        EventBus.on(Events.COMBAT_V2_QTE_END,         onQteEnd);
        EventBus.on(Events.COMBAT_V2_PARRY,          onParry);
        EventBus.on(Events.COMBAT_V2_WRONG_BLOCK,    onWrongBlock);
        EventBus.on(Events.COMBAT_V2_PLAYER_HIT,     onPlayerHit);
        EventBus.on(Events.COMBAT_V2_COUNTER_ATTACK, onCounterAtk);
        EventBus.on(Events.COMBAT_V2_PLANNER_START,     onPlannerStart);
        EventBus.on(Events.COMBAT_V2_PLANNER_STAGE,     onPlannerStage);
        EventBus.on(Events.COMBAT_V2_PLANNER_ACTION,    onPlannerAction);
        EventBus.on(Events.COMBAT_V2_PLANNER_UNDO,      onPlannerUndo);
        EventBus.on(Events.COMBAT_V2_PLANNER_END,       onPlannerEnd);
        EventBus.on(Events.COMBAT_V2_INPUT_PHASE_START, onInputPhaseStart);
        const onTimedInput = () => setTimedInputFlash(n => n + 1);
        EventBus.on(Events.COMBAT_V2_TIMED_INPUT, onTimedInput);

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
            EventBus.off(Events.COMBAT_V2_ENEMY_MOVE_START, onEnemyMoveStart);
            EventBus.off(Events.COMBAT_V2_QTE_START,       onQteStart);
            EventBus.off(Events.COMBAT_V2_QTE_END,         onQteEnd);
            EventBus.off(Events.COMBAT_V2_PARRY,          onParry);
            EventBus.off(Events.COMBAT_V2_WRONG_BLOCK,    onWrongBlock);
            EventBus.off(Events.COMBAT_V2_PLAYER_HIT,     onPlayerHit);
            EventBus.off(Events.COMBAT_V2_COUNTER_ATTACK, onCounterAtk);
            EventBus.off(Events.COMBAT_V2_PLANNER_START,     onPlannerStart);
            EventBus.off(Events.COMBAT_V2_PLANNER_STAGE,     onPlannerStage);
            EventBus.off(Events.COMBAT_V2_PLANNER_ACTION,    onPlannerAction);
            EventBus.off(Events.COMBAT_V2_PLANNER_UNDO,      onPlannerUndo);
            EventBus.off(Events.COMBAT_V2_PLANNER_END,       onPlannerEnd);
            EventBus.off(Events.COMBAT_V2_INPUT_PHASE_START, onInputPhaseStart);
            EventBus.off(Events.COMBAT_V2_TIMED_INPUT,       onTimedInput);
        };
    }, [snapshot, showFeedback]);

    const pickComboMod = useCallback((mod: ComboMod) => {
        const runPrep = GameData.getRunPrep();
        if (runPrep) {
            const updated = { ...runPrep, comboMods: [...runPrep.comboMods, mod] };
            GameData.setRunPrep(updated);
            saveRunPrep(updated);
        }
        GameData.advanceExpeditionNode();
        navigate('/expedition-map');
    }, [navigate]);

    const pickReward = useCallback((choice: RewardChoice) => {
        // Persist food resource permanently.
        ResourceStorage.addFood(choice.food);

        // Add enemy mod to the current run prep and persist it.
        const runPrep = GameData.getRunPrep();
        if (runPrep) {
            const updated = {
                ...runPrep,
                enemyMods: [...(runPrep.enemyMods ?? []), choice.enemyMod],
            };
            GameData.setRunPrep(updated);
            saveRunPrep(updated);
        }

        GameData.advanceExpeditionNode();
        navigate('/expedition-map');
    }, [navigate]);

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
                    companions={companions}
                    dirTokens={dirTokens}
                    isPlannerMode={isPlannerMode}
                    onSpecialSelect={i => EventBus.emit(Events.COMBAT_V2_SPECIAL_SELECTED, { index: i })}
                />
                {isPlannerMode
                    ? <PlannerStrip
                          log={plannerLog}
                          maxSteps={plannerMax}
                          stage={plannerStage}
                          onConfirm={() => EventBus.emit(Events.COMBAT_V2_AUTO_COMBO_REQUEST)}
                          onConfirmPlan={() => EventBus.emit(Events.COMBAT_V2_PLANNER_CONFIRM_REQUEST)}
                      />
                    : comboLog.length > 0 && <ComboLogStrip log={comboLog} />
                }
                {inputPrompt && !inputPhase && <PlayerInputPrompt forcedDir={inputPrompt.forcedDir} plannedDir={inputPrompt.plannedDir} />}
                {feedback && (
                    <CombatFeedbackText
                        key={feedback.id}
                        text={feedback.text}
                        color={feedback.color}
                    />
                )}
                {inputPhase ? (
                    <InputPhaseStrip
                        key={inputPhase.startedAt}
                        sequence={plannedSeqRef.current}
                        initialDelayMs={inputPhase.initialDelayMs}
                        moveSettleMs={inputPhase.moveSettleMs}
                        actionSettleMs={inputPhase.actionSettleMs}
                        earlyWindowMs={CombatConfig.inputEarlyWindow}
                        lateWindowMs={CombatConfig.inputLateWindow}
                        executionIdx={executionIdx}
                        startedAt={inputPhase.startedAt}
                        timedInputFlash={timedInputFlash}
                    />
                ) : rhythm ? (
                    <RhythmOverlay
                        key={rhythm.startedAt}
                        durationMs={rhythm.durationMs}
                        earlyWindowMs={rhythm.earlyWindowMs}
                        lateWindowMs={rhythm.lateWindowMs}
                        nextPlannedDir={rhythm.nextPlannedDir}
                    />
                ) : null}
                {parry && !CombatFeatureFlags.HideEnemyAttackCircle && (
                    <ParryOverlay
                        key={parry.startedAt}
                        direction={parry.direction}
                        duration={parry.duration}
                    />
                )}
            </div>

            {/* Sword strike animation — mounts on ENEMY_MOVE_START, strikes 30ms before parry window */}
            {sword && (
                <SwordStrikeOverlay
                    key={sword.startedAt}
                    direction={sword.direction}
                    parryWindowStart={sword.parryWindowStart}
                />
            )}

            {/* Companion GIFs — rendered behind the player */}
            {companions.map((c, i) => c.gifUrl && (
                <CompanionOverlay key={i} companion={c} index={i} />
            ))}

            {/* Floating hit numbers */}
            {hitNumbers.length > 0 && (
                <div className="absolute right-[35%] top-[35%] flex flex-col items-center gap-2 pointer-events-none">
                    {hitNumbers.map((h, i) => (
                        <HitNumber key={h.id} damage={h.damage} comboRating={h.comboRating} atkMultiplier={h.atkMultiplier} index={i} />
                    ))}
                </div>
            )}

            {/* Instructions button */}
            <div className="absolute top-3 right-3 pointer-events-auto z-30">
                <button
                    onClick={() => setShowInstructions(v => !v)}
                    className="px-2.5 py-1 text-xs font-bold uppercase tracking-widest bg-white/80 border border-gray-300 rounded-lg shadow hover:bg-white transition-colors text-gray-600"
                >
                    ? Instructions <span className="font-normal text-gray-400 normal-case">[T]</span>
                </button>
            </div>

            {/* Instructions dialog */}
            {showInstructions && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-auto z-40"
                    onClick={() => setShowInstructions(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col gap-5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-base font-black uppercase tracking-widest text-gray-800">How to Play</p>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                            >✕</button>
                        </div>

                        {/* Planning phase */}
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Planning Phase</p>
                            <div className="flex flex-col gap-1.5 text-sm text-gray-700 leading-snug">
                                <p><span className="font-bold text-purple-600">Stage 1 — Special</span>: Click a highlighted special to use it, or press <span className="font-bold">Tab</span> to skip.</p>
                                <p><span className="font-bold text-sky-600">Stage 2 — Auto Combo</span>: The best combo from remaining tokens is filled automatically. Press <span className="font-bold">Tab</span> to skip it, or <span className="font-bold">Enter</span> to confirm.</p>
                                <p><span className="font-bold">← →</span> — cycle target between enemies (available in both stages)</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* Input / execution phase */}
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Input Phase</p>
                            <div className="flex flex-col gap-1.5 text-sm text-gray-700 leading-snug">
                                <p>Nodes slide toward the hit zone — press the shown key as each node arrives to execute the action.</p>
                                <p>Hitting on time scores a <span className="font-bold text-green-600">timed</span> hit for bonus combo rating; late/early still connects but scores less.</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* Parry */}
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Parry (Enemy Turn)</p>
                            <div className="flex flex-col gap-1.5 text-sm text-gray-700 leading-snug">
                                <p>The sword telegraphs the enemy's attack direction. Press the <span className="font-bold">matching W A S D</span> direction inside the parry window to block.</p>
                                <p><span className="font-bold text-green-600">Correct direction + timing</span> = successful parry. Parry all attacks in a chain to perform a <span className="font-bold text-purple-600">counterstrike</span>.</p>
                                <p><span className="font-bold text-amber-500">Wrong direction</span> but correct timing = <span className="font-bold">wrong block</span> — the hit is absorbed but the parry chain resets.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowInstructions(false)}
                            className="mt-1 w-full py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold uppercase tracking-widest rounded-lg text-sm transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {/* Combat result overlay */}
            {result && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-auto">
                    {result === 'victory' && victoryStep === 'none' ? (
                        <div className="bg-white rounded-2xl px-12 py-8 text-center shadow-2xl flex flex-col items-center gap-6">
                            <p className="text-4xl font-bold tracking-widest uppercase text-amber-600">Victory</p>
                            <button
                                onClick={() => { GameData.advanceExpeditionNode(); navigate('/expedition-map'); }}
                                className="px-8 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold uppercase tracking-widest rounded-lg transition-colors shadow"
                            >
                                Continue →
                            </button>
                        </div>
                    ) : result === 'victory' && victoryStep === 'combo-mod' ? (
                        <div className="bg-white rounded-2xl px-8 py-8 text-center shadow-2xl flex flex-col items-center gap-5 w-full max-w-lg mx-4">
                            <p className="text-4xl font-bold tracking-widest uppercase text-amber-600">Victory!</p>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                Choose a Combo Mod
                            </p>
                            <div className="flex flex-col gap-3 w-full">
                                {comboModChoices.map((mod, i) => (
                                    <button
                                        key={i}
                                        onClick={() => pickComboMod(mod)}
                                        className="rounded-xl p-4 text-left border-2 border-gray-200 bg-gray-50 hover:border-amber-500 hover:bg-amber-50 transition-colors"
                                    >
                                        <p className="text-sm font-bold text-gray-900">{mod.title}</p>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{mod.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : result === 'victory' && victoryStep === 'reward' ? (
                        <div className="bg-white rounded-2xl px-8 py-8 text-center shadow-2xl flex flex-col items-center gap-5 w-full max-w-lg mx-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                Choose your reward
                            </p>
                            <div className="flex gap-3 w-full">
                                {rewardChoices.map((choice, i) => (
                                    <button
                                        key={i}
                                        onClick={() => pickReward(choice)}
                                        className="flex-1 rounded-xl p-4 text-left border-2 border-gray-200 bg-gray-50 hover:border-amber-500 hover:bg-amber-50 transition-colors flex flex-col gap-3"
                                    >
                                        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                                            <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-0.5">
                                                Resource
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">{choice.food.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                {choice.food.description}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                                            <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-0.5">
                                                Enemy Buff
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {enemyModLabel(choice.enemyMod)}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                {enemyModDescription(choice.enemyMod)}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl px-12 py-8 text-center shadow-2xl flex flex-col items-center gap-6">
                            <p className="text-4xl font-bold tracking-widest uppercase text-red-500">
                                Defeat
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate('/expedition-map')}
                                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase tracking-widest rounded-lg transition-colors"
                                >
                                    Retreat
                                </button>
                                <button
                                    onClick={() => navigate('/game')}
                                    className="px-6 py-3 bg-red-500 hover:bg-red-400 text-white font-bold uppercase tracking-widest rounded-lg transition-colors shadow"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Top info bar ──────────────────────────────────────────────────────────────

function TopBar({
    player, actions, specials, worldMods, comboMods, comboRules, comboRating, companions, dirTokens,
    isPlannerMode, onSpecialSelect,
}: {
    player:           PlayerSnapshot;
    actions:          ActionCardInfo[];
    specials:         SpecialCardInfo[];
    worldMods:        WorldModInfo[];
    comboMods:        ComboModInfo[];
    comboRules:       ComboRuleInfo[];
    comboRating:      number;
    companions:       CompanionInfo[];
    dirTokens:        Record<AttackDirection, number>;
    isPlannerMode:    boolean;
    onSpecialSelect?: (index: number) => void;
}) {
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);

    return (
        <div className="w-full bg-white/95 border-b border-gray-200 shadow-sm flex items-start gap-4 px-4 py-3 flex-wrap">

            {/* Player stats */}
            <div className="flex-shrink-0 min-w-[160px]">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Player</p>
                <p className="text-sm font-bold text-gray-900 mb-2">{player.name}</p>
                <div>
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
            </div>

            <div className="w-px self-stretch bg-gray-200" />

            {/* Action cards */}
            <div className="flex-shrink-0">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">Actions</p>
                <div className="flex gap-1.5 flex-wrap">
                    {actions.map(a => {
                        const tokenCount = dirTokens[a.direction];
                        return (
                            <div key={a.dirKey} className="relative bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-center w-24">
                                <span className={`absolute top-0.5 right-0.5 text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full leading-none ${
                                    tokenCount > 0
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-200 text-gray-400'
                                }`}>
                                    {tokenCount}
                                </span>
                                <span className="block text-xs font-bold text-amber-600 mb-0.5">[{a.dirKey}]</span>
                                <span className="block text-xs text-gray-700 leading-tight">{a.name}</span>
                            </div>
                        );
                    })}
                </div>
                {specials.some(s => s.name) && (
                    <div className="mt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Specials</p>
                        <div className="flex gap-1.5 flex-wrap">
                            {specials.map((s, i) => {
                                if (!s.name) return null;
                                const affordable = comboRating >= s.ratingRequirement;
                                const clickable  = isPlannerMode && affordable;
                                const seqLabel   = s.inputSeq
                                    ? s.inputSeq.map(d => PARRY_DIR_ARROW[d]).join('')
                                    : '?';
                                return (
                                    <div
                                        key={i}
                                        onClick={() => clickable && onSpecialSelect?.(i)}
                                        className={`rounded-lg px-2 py-1.5 text-left w-28 border transition-colors ${
                                            affordable
                                                ? 'bg-purple-50 border-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]'
                                                : 'bg-gray-50 border-gray-200 opacity-60'
                                        } ${clickable ? 'pointer-events-auto cursor-pointer hover:bg-purple-100 active:bg-purple-200' : 'pointer-events-none'}`}
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-xs font-mono font-bold tracking-widest ${affordable ? 'text-purple-600' : 'text-gray-400'}`}>
                                                {seqLabel}
                                            </span>
                                            <span className={`text-xs font-bold ${affordable ? 'text-amber-500' : 'text-gray-400'}`}>
                                                ★{s.ratingRequirement}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="block text-xs text-gray-700 leading-tight">{s.name}</span>
                                            <span className={`text-xs font-bold ${affordable ? 'text-red-500' : 'text-gray-400'}`}>~{s.damage}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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

            {companions.length > 0 && (
                <>
                    <div className="w-px self-stretch bg-gray-200" />
                    <div className="flex-shrink-0 max-w-[260px]">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">Companion</p>
                        <div className="flex flex-col gap-2">
                            {companions.map((c, i) => (
                                <CompanionTopBarEntry key={i} companion={c} />
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

    // How far the outer circle has shrunk when the parry window opens.
    // Outer shrinks linearly: r(t) = OUTER_R_START * (1 - t/duration)
    const parryOpenMs  = duration - QTE_PARRY_WINDOW;
    const rAtParryOpen = OUTER_R_START * (QTE_PARRY_WINDOW / duration);

    const [outerR,    setOuterR]    = useState(OUTER_R_START);
    const [parryOpen, setParryOpen] = useState(false);

    useEffect(() => {
        // Shrink outer circle to rAtParryOpen over the pre-window phase…
        const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
            setOuterR(rAtParryOpen);
        }));

        // …then open parry window: switch to green and continue shrinking to 0
        const t1 = setTimeout(() => {
            setParryOpen(true);
            setOuterR(0);
        }, parryOpenMs);

        return () => { cancelAnimationFrame(raf); clearTimeout(t1); };
    }, [parryOpenMs, rAtParryOpen]);

    const dangerColor = '#ef4444';
    const readyColor  = '#22c55e';
    const color       = parryOpen ? readyColor : dangerColor;

    return (
        <div className="w-full flex justify-center py-2 bg-black/5">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {/* Shrinking outer circle — red while winding up, green when parry opens */}
                <circle
                    cx={CX} cy={CX}
                    r={outerR}
                    fill={parryOpen ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'}
                    stroke={color}
                    strokeWidth="8"
                    style={{
                        transition: parryOpen
                            ? `r ${QTE_PARRY_WINDOW}ms linear`
                            : `r ${parryOpenMs}ms linear`,
                    }}
                />
                {/* Fixed inner parry-zone circle */}
                <circle
                    cx={CX} cy={CX} r={INNER_R}
                    fill={parryOpen ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.12)'}
                    stroke={color}
                    strokeWidth="4"
                    strokeDasharray="6 6"
                    style={{ transition: 'fill 0.05s, stroke 0.05s' }}
                />
                {/* Direction arrow */}
                {!CombatFeatureFlags.HideEnemyAttackDirection && (
                    <text
                        x={CX} y={CX}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="48"
                        fontWeight="bold"
                        fill="#1f2937"
                    >
                        {PARRY_DIR_ARROW[direction]}
                    </text>
                )}
            </svg>
        </div>
    );
}

// ── Sword strike overlay ──────────────────────────────────────────────────────
//
// Timing (all relative to component mount = ENEMY_MOVE_START):
//   0 ms                    : sword appears, pull-back starts
//   parryWindowStart - 100ms: pull-back ends, 50ms pause at full cock
//   parryWindowStart - 50ms : strike fires  ← 50ms before parry window opens
//   parryWindowStart        : parry window opens
//
// Positive angle = CW. transformOrigin = 'bottom center'.
// UP/DOWN: rotation + vertical translation. RIGHT/LEFT: translation only (thrust).

const SWORD_W              = 28;
const SWORD_H              = 240;
const GUARD_W              = 72;
const GUARD_H              = 20;
const STRIKE_DURATION      = 140;
const PAUSE_MS             = 50;
const STRIKE_BEFORE_PARRY  = 50;

interface SwordCfg {
    from:      number;   // initial blade rotation (deg)
    pullBack:  number;   // cocked rotation (deg)
    strike:    number;   // final rotation (deg)
    windupTX:  number;   // group translateX during wind-up (px)
    windupTY:  number;   // group translateY during wind-up (px)
    strikeTX:  number;   // group translateX at strike end (absolute, px)
    strikeTY:  number;   // group translateY at strike end (absolute, px)
    groupLeft: string;
    groupTop:  string;
    scaleX:    1 | -1;  // -1 flips sword for "behind" attacks
}

const SWORD_DIR_CONFIG: Record<AttackDirection, SwordCfg> = {
    // UP (W): pull-back 8→3 CW through 12 (240°→450°), move up; strike 3→6 CCW (450°→180°)
    [AttackDirection.UP]: {
        from: 240, pullBack: 450, strike: 180,
        windupTX: 0, windupTY: -120,
        strikeTX: 0, strikeTY: 0,
        groupLeft: '50%', groupTop: `calc(50% - ${SWORD_H}px)`,
        scaleX: 1,
    },
    // DOWN (S): pull-back 10→3 CCW through 6 (300°→90°), move down; strike 3→12 CW (90°→360°, arc through 6 and 9)
    [AttackDirection.DOWN]: {
        from: 300, pullBack: 90, strike: 360,
        windupTX: 0, windupTY: 120,
        strikeTX: 0, strikeTY: 0,
        groupLeft: '50%', groupTop: `calc(40% - ${SWORD_H}px)`,
        scaleX: 1,
    },
    // RIGHT (D) = forward: blade instantly at 9 o'clock (−90°), translate only
    [AttackDirection.RIGHT]: {
        from: -90, pullBack: -90, strike: -90,
        windupTX: 300, windupTY: 0,
        strikeTX: -80, strikeTY: 0,
        groupLeft: '50%', groupTop: `calc(50% - ${SWORD_H}px)`,
        scaleX: 1,
    },
    // LEFT (A) = backward: blade instantly at 3 o'clock (90°), at player's left side
    [AttackDirection.LEFT]: {
        from: 90, pullBack: 90, strike: 90,
        windupTX: -300, windupTY: 0,
        strikeTX: 80, strikeTY: 0,
        groupLeft: '20%', groupTop: `calc(50% - ${SWORD_H}px)`,
        scaleX: 1,
    },
};

function SwordStrikeOverlay({ direction, parryWindowStart }: { direction: AttackDirection; parryWindowStart: number }) {
    const groupRef = useRef<HTMLDivElement>(null);
    const bladeRef = useRef<HTMLDivElement>(null);
    const cfg      = SWORD_DIR_CONFIG[direction];

    useEffect(() => {
        const groupEl = groupRef.current;
        const bladeEl = bladeRef.current;
        if (!groupEl || !bladeEl) return;

        const strikeStart  = parryWindowStart - STRIKE_BEFORE_PARRY;
        const pullDuration = strikeStart - PAUSE_MS;
        const hasRotation  = cfg.from !== cfg.pullBack;  // RIGHT/LEFT are translate-only

        // Phase 1: pull-back — blade rotates (if applicable) and group translates
        const pullBladeAnim = hasRotation
            ? animate(bladeEl, {
                rotate:   [`${cfg.from}deg`, `${cfg.pullBack}deg`],
                duration: pullDuration,
                ease:     'out(3)',
              })
            : null;
        const pullGroupAnim = animate(groupEl, {
            translateX: cfg.windupTX,
            translateY: cfg.windupTY,
            duration:   pullDuration,
            ease:       'out(3)',
        });

        // Phase 2: strike after 50ms pause at full cock
        const strikeTimer = setTimeout(() => {
            if (hasRotation) {
                animate(bladeEl, {
                    rotate:   `${cfg.strike}deg`,
                    duration: STRIKE_DURATION,
                    ease:     'in(4)',
                });
            }
            animate(groupEl, {
                translateX: cfg.strikeTX,
                translateY: cfg.strikeTY,
                duration:   STRIKE_DURATION,
                ease:       'in(4)',
            });
        }, strikeStart);

        return () => {
            pullBladeAnim?.cancel();
            pullGroupAnim.cancel();
            clearTimeout(strikeTimer);
        };
    }, [cfg, parryWindowStart]);

    return (
        <div
            className="absolute pointer-events-none"
            style={{ left: cfg.groupLeft, top: cfg.groupTop, transform: 'translateX(-50%)' }}
        >
            {/* Animated group: handles translation */}
            <div ref={groupRef}>
                {/* Blade: rotates around its bottom-center */}
                <div
                    ref={bladeRef}
                        style={{
                            width:           SWORD_W,
                            height:          SWORD_H,
                            transformOrigin: 'bottom center',
                            transform:       `rotate(${cfg.from}deg)`,
                            position:        'relative',
                        }}
                    >
                        {/* Tip */}
                        <div style={{
                            position:  'absolute', top: 0, left: '50%',
                            transform: 'translateX(-50%)',
                            width:     SWORD_W, height: SWORD_H * 0.35,
                            background: 'linear-gradient(to bottom, #e2e8f0, #94a3b8)',
                            clipPath:  'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                        }} />
                        {/* Blade body */}
                        <div style={{
                            position: 'absolute', top: SWORD_H * 0.3, left: '50%',
                            transform: 'translateX(-50%)',
                            width: SWORD_W, height: SWORD_H * 0.45,
                            backgroundColor: '#94a3b8',
                            borderLeft: '2px solid #cbd5e1', borderRight: '2px solid #64748b',
                        }} />
                        {/* Crossguard */}
                        <div style={{
                            position: 'absolute', top: SWORD_H * 0.72, left: '50%',
                            transform: 'translateX(-50%)',
                            width: GUARD_W, height: GUARD_H,
                            backgroundColor: '#78716c', borderRadius: 5,
                        }} />
                        {/* Handle */}
                        <div style={{
                            position: 'absolute', top: SWORD_H * 0.72 + GUARD_H, left: '50%',
                            transform: 'translateX(-50%)',
                            width: SWORD_W - 8, height: SWORD_H * 0.22,
                            backgroundColor: '#292524', borderRadius: 3,
                        }} />
                        {/* Pommel */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: '50%',
                            transform: 'translateX(-50%)',
                            width: SWORD_W + 4, height: SWORD_W + 4,
                            backgroundColor: '#78716c', borderRadius: '50%',
                        }} />
                    </div>
            </div>
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

// ── Input phase rhythm strip ──────────────────────────────────────────────────

const BASE_PX_PER_MS = 0.22;
const HIT_X          = 110;
const NODE_R     = 26;
const TRACK_W    = 740;
const TRACK_H    = 80;

function BurstNode({ label }: { label: string }) {
    const [scale,   setScale]   = useState(1);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setScale(2.6);
                setOpacity(0);
            });
        });
    }, []);

    return (
        <div style={{
            position:        'absolute',
            left:            HIT_X - NODE_R,
            top:             TRACK_H / 2 - NODE_R,
            width:           NODE_R * 2,
            height:          NODE_R * 2,
            borderRadius:    '50%',
            backgroundColor: 'rgba(34,197,94,0.85)',
            border:          '3px solid #16a34a',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            transform:       `scale(${scale})`,
            opacity,
            transition:      'transform 0.42s ease-out, opacity 0.42s ease-out',
            zIndex:          10,
            pointerEvents:   'none',
            color:           'white',
            fontWeight:      900,
            fontSize:        NODE_R * 0.9,
            userSelect:      'none',
        }}>
            {label}
        </div>
    );
}

function InputPhaseStrip({
    sequence,
    initialDelayMs,
    moveSettleMs,
    actionSettleMs,
    earlyWindowMs,
    lateWindowMs,
    executionIdx,
    startedAt,
    timedInputFlash,
}: {
    sequence:        PlannerEntry[];
    initialDelayMs:  number;
    moveSettleMs:    number;
    actionSettleMs:  number;
    earlyWindowMs:   number;
    lateWindowMs:    number;
    executionIdx:    number;
    startedAt:       number;
    timedInputFlash: number;
}) {
    const [elapsed, setElapsed] = useState(0);
    const rafRef = useRef<number>(0);
    const [bursts,    setBursts]    = useState<{ id: number; label: string }[]>([]);
    const burstIdRef        = useRef(0);
    const flatNodesRef      = useRef<{ label: string; entryIdx: number; isSeqKey: boolean }[]>([]);
    const flatExecIdxRef    = useRef(0);

    useEffect(() => {
        const origin = startedAt;
        const tick = () => {
            setElapsed(performance.now() - origin);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [startedAt]);

    // Build flat node list — specials expand into one node per sequence key.
    interface FlatNode { label: string; entryIdx: number; isSeqKey: boolean }
    const flatNodes: FlatNode[] = [];
    const hitTimes: number[] = [];
    let firstEntryTransitionDone = false;

    for (let eIdx = 0; eIdx < sequence.length; eIdx++) {
        const entry = sequence[eIdx];
        const steps = entry.sequenceSteps;

        if (steps && steps.length > 0) {
            for (let sIdx = 0; sIdx < steps.length; sIdx++) {
                flatNodes.push({ label: PARRY_DIR_ARROW[steps[sIdx].dir], entryIdx: eIdx, isSeqKey: true });

                if (hitTimes.length === 0) {
                    hitTimes.push(initialDelayMs);
                } else if (sIdx === 0) {
                    const prevEntry = sequence[eIdx - 1];
                    const gap = (!firstEntryTransitionDone ? moveSettleMs : 0) + actionSettleMs + prevEntry.waitMs;
                    hitTimes.push(hitTimes[hitTimes.length - 1] + gap);
                    firstEntryTransitionDone = true;
                } else {
                    hitTimes.push(hitTimes[hitTimes.length - 1] + steps[sIdx - 1].waitMs);
                }
            }
        } else {
            flatNodes.push({
                label:    entry.direction !== null ? PARRY_DIR_ARROW[entry.direction] : entry.displayKey,
                entryIdx: eIdx,
                isSeqKey: false,
            });

            if (hitTimes.length === 0) {
                hitTimes.push(initialDelayMs);
            } else {
                const prevEntry = sequence[eIdx - 1];
                const gap = (!firstEntryTransitionDone ? moveSettleMs : 0) + actionSettleMs + prevEntry.waitMs;
                hitTimes.push(hitTimes[hitTimes.length - 1] + gap);
                firstEntryTransitionDone = true;
            }
        }
    }

    // First flat-node index that hasn't been executed yet.
    const flatExecutionIdx = flatNodes.filter(n => n.entryIdx < executionIdx).length;

    // Keep refs current so the burst useEffect can read them without stale closures.
    flatNodesRef.current   = flatNodes;
    flatExecIdxRef.current = flatExecutionIdx;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (timedInputFlash === 0) return;
        const node = flatNodesRef.current[flatExecIdxRef.current];
        if (!node) return;
        const id = burstIdRef.current++;
        setBursts(prev => [...prev, { id, label: node.label }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 600);
    }, [timedInputFlash]);

    const pxPerMs = BASE_PX_PER_MS * CombatConfig.inputPhaseSpeed;
    const earlyPx = earlyWindowMs * pxPerMs;
    const latePx  = lateWindowMs  * pxPerMs;

    return (
        <div className="w-full flex justify-center py-2 bg-black/5">
            <div className="bg-white/95 border border-gray-200 rounded-xl px-5 py-3 shadow-lg">
                <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-2">Input Phase</p>
                <div style={{ position: 'relative', width: TRACK_W, height: TRACK_H, overflow: 'hidden' }}>

                    {/* Track line */}
                    <div style={{
                        position: 'absolute', left: 0, right: 0,
                        top: TRACK_H / 2 - 2, height: 4,
                        backgroundColor: '#e5e7eb', borderRadius: 9999,
                    }} />

                    {/* Timing window highlight */}
                    <div style={{
                        position:        'absolute',
                        left:            HIT_X - latePx,
                        width:           latePx + earlyPx,
                        top:             TRACK_H / 2 - 8,
                        height:          16,
                        backgroundColor: 'rgba(34,197,94,0.35)',
                        borderRadius:    4,
                    }} />

                    {/* Hit zone ring */}
                    <div style={{
                        position:        'absolute',
                        left:            HIT_X - NODE_R,
                        top:             TRACK_H / 2 - NODE_R,
                        width:           NODE_R * 2,
                        height:          NODE_R * 2,
                        borderRadius:    '50%',
                        border:          '3px dashed #9ca3af',
                        backgroundColor: 'transparent',
                        zIndex:          1,
                    }} />

                    {/* Flat nodes */}
                    {flatNodes.map((node, i) => {
                        if (i < flatExecutionIdx) return null;
                        const x      = HIT_X + (hitTimes[i] - elapsed) * pxPerMs;
                        const isCurr = i === flatExecutionIdx;
                        const isNear = Math.abs(x - HIT_X) < NODE_R * 3;

                        if (x > TRACK_W + NODE_R * 2) return null;

                        return (
                            <div
                                key={i}
                                style={{
                                    position:        'absolute',
                                    left:            x - NODE_R,
                                    top:             TRACK_H / 2 - NODE_R,
                                    width:           NODE_R * 2,
                                    height:          NODE_R * 2,
                                    borderRadius:    '50%',
                                    border:          `3px solid ${isCurr ? '#f59e0b' : node.isSeqKey ? '#a855f7' : '#6b7280'}`,
                                    backgroundColor: isCurr ? '#fef3c7' : node.isSeqKey ? '#faf5ff' : '#f3f4f6',
                                    display:         'flex',
                                    alignItems:      'center',
                                    justifyContent:  'center',
                                    boxShadow:       isCurr && isNear ? '0 0 12px 4px rgba(245,158,11,0.5)' : 'none',
                                    zIndex:          2,
                                    opacity:         x < -NODE_R ? 0 : 1,
                                }}
                            >
                                <span style={{
                                    fontSize:   '1.1rem',
                                    fontWeight: 900,
                                    color:      isCurr ? '#92400e' : node.isSeqKey ? '#7e22ce' : '#374151',
                                    lineHeight: 1,
                                    userSelect: 'none',
                                }}>
                                    {node.label}
                                </span>
                            </div>
                        );
                    })}

                    {bursts.map(b => <BurstNode key={b.id} label={b.label} />)}
                </div>
            </div>
        </div>
    );
}

// ── Planner strip ─────────────────────────────────────────────────────────────


function PlannerStrip({
    log, maxSteps, stage, onConfirm, onConfirmPlan,
}: {
    log:           PlannerEntry[];
    maxSteps:      number;
    stage:         'planning' | 'auto-combo' | null;
    onConfirm:     () => void;
    onConfirmPlan: () => void;
}) {
    const totalDamage  = log.reduce((sum, e) => sum + e.damage, 0);
    const isFull       = log.length >= maxSteps;
    const hasAutoCombo = stage === 'auto-combo';

    return (
        <div className="bg-sky-50/95 border-b border-sky-300 flex flex-col">

            {/* Plan log row */}
            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
                <div className="flex-shrink-0 flex flex-col items-start mr-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-sky-600">Plan</span>
                    <span className={`text-xs font-bold tabular-nums ${isFull ? 'text-red-500' : 'text-sky-400'}`}>
                        {log.length}/{maxSteps}
                    </span>
                </div>

                {log.length === 0 ? (
                    <span className="text-xs text-sky-400 italic">
                        Click a special or press [Tab] for auto-combo…
                    </span>
                ) : (
                    log.map((entry, i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 rounded-lg border border-sky-200 bg-white text-xs overflow-hidden"
                        >
                            <div className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-1">
                                <span className="font-bold text-sky-600">[{entry.displayKey}]</span>
                                <span className="font-medium text-gray-800">{entry.name}</span>
                            </div>
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

                <div className="flex-shrink-0 flex items-center gap-2 ml-2">
                    {!hasAutoCombo ? (
                        <button
                            onClick={onConfirm}
                            className="px-2.5 py-1 text-xs font-bold uppercase tracking-widest rounded border border-sky-400 text-sky-600 bg-sky-100 hover:bg-sky-200 active:bg-sky-300 transition-colors pointer-events-auto"
                            title="Auto-fill best combo [Tab]"
                        >
                            Auto [Tab]
                        </button>
                    ) : (
                        <>
                            <span className="text-xs text-sky-400">[Del] clear auto</span>
                            <button
                                onClick={onConfirmPlan}
                                className="px-2.5 py-1 text-xs font-bold uppercase tracking-widest rounded border border-amber-400 text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors pointer-events-auto"
                            >
                                Confirm [Enter]
                            </button>
                        </>
                    )}
                </div>
            </div>
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
                        <span className="font-bold text-amber-600">[{entry.dirKey ?? '—'}]</span>
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

// ── Companion sub-components ──────────────────────────────────────────────────

function CompanionTopBarEntry({ companion }: { companion: CompanionInfo }) {
    const gifSrc = useCreatureGif(companion.gifUrl);
    return (
        <div className="flex items-start gap-2">
            {companion.gifUrl !== null && (
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded">
                    {gifSrc && <img src={gifSrc} alt={companion.name} className="w-full h-full object-contain rounded" />}
                </div>
            )}
            <div className="min-w-0">
                <p className="text-xs font-bold text-gray-700 mb-0.5">{companion.name}</p>
                {companion.passives.map((p, j) => (
                    <div key={j} className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1 mb-1">
                        <span className="block text-xs font-bold text-amber-700">{p.title}</span>
                        <span className="block text-xs text-amber-600 leading-tight">{p.description}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CompanionOverlay({ companion, index }: { companion: CompanionInfo; index: number }) {
    const gifSrc = useCreatureGif(companion.gifUrl);
    if (!gifSrc) return null;
    return (
        <img
            src={gifSrc}
            alt={companion.name}
            className="absolute pointer-events-none"
            style={{
                bottom: '18%',
                left:   `${13 - index * 6}%`,
                height: '120px',
                width:  'auto',
            }}
        />
    );
}
