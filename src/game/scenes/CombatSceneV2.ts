import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import {
    CombatSceneCharacter,
    CombatSceneEnemyCharacter,
    CombatScenePlayableCharacter,
} from '../entities/CombatSceneCharacter';
import { CombatRoundTurnOrderManager } from '../CombatRoundTurnOrderManager';
import { QTEEventType, AttackDirection, CombatAction, isChordStep, ScheduleEntryOverride } from '../entities/CombatTypes';
import { ComboStackSystem } from '../../data/ComboStackSystem';
import { WorldMod } from '../../data/WorldMods/WorldMod';
import { ComboRule } from '../../data/ComboRule/ComboRule.ts';
import { DEFAULT_COMBO_RULES } from '../../data/ComboRule/DefaultComboRules';
import { CombatConfig } from '../combatConfig';
import { EnemyCombatActionHandler } from '../entities/EnemyCombatActionHandler';
import { Events } from '../Events';
import { CombatSceneRenderer } from './CombatSceneRenderer';
import { GameData } from '../GameData';
import { loadRunPrep } from '../RunPrepStorage';
import { buildCombatInitData } from '../CombatCharacterFactory';
import { CombatFeatureFlags } from '../combatFeatureFlags';
import {calculateStepDamage} from "../../data/Combo.ts";
import {ComboStep} from "../../data/ComboMod/ComboStep.ts";
import {ComboMod} from "../../data/ComboMod/ComboMod.ts";
import {DancerCombatSpecialAction, TokenSpentRequirement} from "../entities/CombatTypes.ts";
import {findBestComboFromTokens} from "../../data/AutoComboCalculator.ts";
import type {SupportPassive} from "../../data/Creature/SupportPassive.ts";

// ── Input map ─────────────────────────────────────────────────────────────────

const WASD_MAP: Record<string, AttackDirection> = {
    W: AttackDirection.UP,
    A: AttackDirection.LEFT,
    S: AttackDirection.DOWN,
    D: AttackDirection.RIGHT,
};

const DIR_DISPLAY: Record<AttackDirection, string> = {
    [AttackDirection.UP]:    'W',
    [AttackDirection.DOWN]:  'S',
    [AttackDirection.LEFT]:  'A',
    [AttackDirection.RIGHT]: 'D',
};

interface ScheduledSubStep {
    expectedTimeMs: number
    expectedDir?:   AttackDirection    // tap or hold
    expectedDirs?:  AttackDirection[]  // chord
    holdMs?:        number             // hold duration; resolved on keyup
    resolved:       boolean
    timedCorrect:   boolean
    // for hold: tracks when the key was pressed (relative to sequenceStart)
    holdPressedAt?: number
}

interface ScheduledSpecialStage {
    subSteps:               ScheduledSubStep[]
    animation:              string
    damage:                 number
    executionTimeMs:        number
    resolved:               boolean
    timed:                  boolean
    playAnimationOnStageStart: boolean
}

interface ScheduledInput {
    expectedTimeMs:  number   // first key time (drives UI display)
    executionTimeMs: number   // when animation fires (= last sub-step for sequences)
    action:          CombatAction
    resolved:        boolean
    timed:           boolean
    subSteps?:       ScheduledSubStep[]
    specialStages?:  ScheduledSpecialStage[]
}

const TOKENS_PER_TURN        = 4;
const MOVE_SETTLE_MS         = 210;
const IDLE_RETURN_MS         = 100;
const ACTION_SETTLE_MS       = 250;
const INITIAL_INPUT_DELAY_MS = 1000;

// ── Init data ─────────────────────────────────────────────────────────────────

export interface CombatSceneV2InitData {
    players: CombatScenePlayableCharacter[];
    enemies: CombatSceneEnemyCharacter[];
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export class CombatSceneV2 extends Scene {
    readonly players: CombatScenePlayableCharacter[] = [];
    readonly enemies: CombatSceneEnemyCharacter[]   = [];

    private turnManager!:        CombatRoundTurnOrderManager;
    private sceneRenderer!:     CombatSceneRenderer;
    private worldMods:           readonly WorldMod[]        = [];
    private comboRules:          readonly ComboRule[]        = [];
    private creaturePassives:    readonly SupportPassive[]   = [];
    private comboHistory:        ComboStep[]                 = [];

    // Last direction the enemy attacked with — used by ForceFollowLastEnemyInput.
    // Null means no enemy has acted yet (or enemy just died): free input allowed.
    private lastEnemyInputDir: AttackDirection | null = null;

    // Tokens not spent during the previous planning phase carry over to the next player turn.
    private carryoverTokenCounts: Record<AttackDirection, number> = {
        [AttackDirection.UP]:    0,
        [AttackDirection.DOWN]:  0,
        [AttackDirection.LEFT]:  0,
        [AttackDirection.RIGHT]: 0,
    };

    // Index into this.enemies for the currently selected target.
    private _targetIndex = 0;

    constructor() {
        super('CombatSceneV2');
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    init(data?: CombatSceneV2InitData): void {
        this.players.length = 0;
        this.enemies.length = 0;

        if (data?.players?.length) {
            this.players.push(...data.players);
            if (data.enemies) this.enemies.push(...data.enemies);
            return;
        }

        // No initData — browser refresh on /game. Hydrate from localStorage.
        const runPrep = GameData.getRunPrep() ?? (() => {
            const stored = loadRunPrep();
            if (stored) GameData.setRunPrep(stored);
            return stored;
        })();

        if (runPrep) {
            const built = buildCombatInitData(runPrep);
            this.players.push(...built.players);
            this.enemies.push(...built.enemies);
        }
    }

    update(): void {
        this.sceneRenderer?.update(this.enemies);
    }

    create(): void {
        this.carryoverTokenCounts = {
            [AttackDirection.UP]:    0,
            [AttackDirection.DOWN]:  0,
            [AttackDirection.LEFT]:  0,
            [AttackDirection.RIGHT]: 0,
        };
        this.worldMods        = GameData.getRunPrep()?.worldModifiers ?? [];
        this.comboRules       = DEFAULT_COMBO_RULES;
        this.creaturePassives = (GameData.getRunPrep()?.companions ?? []).flatMap(c => c.supportPassives);
        this.sceneRenderer = new CombatSceneRenderer(this);
        this.sceneRenderer.setup(this.players, this.enemies);

        const all: CombatSceneCharacter[] = [...this.players, ...this.enemies];
        this.turnManager = new CombatRoundTurnOrderManager(all);

        EventBus.emit(Events.CURRENT_SCENE_READY, this);
        this.startCombatLoop();
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    getCurrentActor(): CombatSceneCharacter | null {
        return this.turnManager.getCurrentActor();
    }

    getRoundNumber(): number {
        return this.turnManager.getRoundNumber();
    }

    getAllCharacters(): CombatSceneCharacter[] {
        return [...this.players, ...this.enemies];
    }

    // ── Combat loop ───────────────────────────────────────────────────────────

    private async startCombatLoop(): Promise<void> {
        while (true) {
            if (!this.checkCombatContinues()) return;

            const actor = this.turnManager.getCurrentActor();
            if (!actor) return;

            EventBus.emit(Events.COMBAT_V2_TURN_START, {
                actor,
                isPlayer:    actor.isPlayer,
                round:       this.turnManager.getRoundNumber(),
                queue:       this.turnManager.getRemainingQueue(),
                comboRating: this.comboHistory[this.comboHistory.length - 1]?.comboStack.comboRating ?? 0,
            });

            await this.delay(1000);

            if (actor.isPlayer) {
                await this.handlePlayerTurn(actor as CombatScenePlayableCharacter);
            } else {
                await this.handleEnemyTurn(actor as CombatSceneEnemyCharacter);
            }

            if (!this.checkCombatContinues()) return;

            // Clear all status effects so each turn starts fresh
            for (const c of [...this.players, ...this.enemies]) {
                c.resetStatusEffects();
            }
            this.sceneRenderer.updateEnemyAirbornePositions(this.enemies);

            // Return characters to rest positions
            this.sceneRenderer.moveToRestPositions(this.players, this.enemies);
            await this.delay(MOVE_SETTLE_MS);

            this.turnManager.confirmActed();
            EventBus.emit(Events.COMBAT_V2_TURN_END, {
                actor,
                round: this.turnManager.getRoundNumber(),
            });

            await this.delay(200);
        }
    }

    // ── Target helpers ────────────────────────────────────────────────────────

    private aliveEnemyIndices(): number[] {
        return this.enemies.map((e, i) => e.isAlive ? i : -1).filter(i => i >= 0);
    }

    private correctTargetIndex(): void {
        const alive = this.aliveEnemyIndices();
        if (alive.length === 0) return;
        if (!this.enemies[this._targetIndex]?.isAlive) {
            this._targetIndex = alive[0];
        }
    }

    private cycleTarget(delta: 1 | -1): void {
        const alive = this.aliveEnemyIndices();
        if (alive.length <= 1) return;
        const pos     = alive.indexOf(this._targetIndex);
        const nextPos = (pos + delta + alive.length) % alive.length;
        this._targetIndex = alive[nextPos];
        this.sceneRenderer.setTargetSelection(this._targetIndex, this.enemies);
    }

    // ── Player turn ───────────────────────────────────────────────────────────

    private async handlePlayerTurn(actor: CombatScenePlayableCharacter): Promise<void> {
        this.correctTargetIndex();
        const target = this.enemies[this._targetIndex] ?? null;
        if (!target?.isAlive) return;

        const mods      = actor.comboModDeck.getCards();
        const passives  = this.creaturePassives;
        const forcedDir: AttackDirection | null =
            CombatFeatureFlags.ForceFollowLastEnemyInput ? this.lastEnemyInputDir : null;

        const newTokens = this.generateTokens();
        const mergedCounts: Record<AttackDirection, number> = { ...this.carryoverTokenCounts };
        for (const t of newTokens) mergedCounts[t]++;
        const { carryoverTokenCounts, plannedActions } =
            await this.waitForPlannerInput(actor, mods, passives, forcedDir, mergedCounts);
        this.carryoverTokenCounts = carryoverTokenCounts;

        if (plannedActions.length === 0) return;

        const speed = CombatConfig.inputPhaseSpeed;

        const schedule = this.buildInputSchedule(plannedActions, speed, mods);

        EventBus.emit(Events.COMBAT_V2_INPUT_PHASE_START, {
            hitTimesMs: schedule.map(e => e.expectedTimeMs),
            nodeMeta:   schedule.map(e => {
                if (!e.subSteps || e.subSteps.length === 0) return {};
                if (e.subSteps.length === 1) {
                    const s = e.subSteps[0];
                    if (s.holdMs !== undefined) return { holdMs: s.holdMs };
                    if (s.expectedDirs)         return { chordDirs: s.expectedDirs };
                    return {};
                }
                return { seqStepHolds: e.subSteps.map(s => s.holdMs) };
            }),
        });

        const sequenceStart = this.time.now;

        this.sceneRenderer.moveToCombatPositions(this.players, this.enemies, this._targetIndex);
        await this.delay(MOVE_SETTLE_MS / speed);

        EventBus.emit(Events.COMBAT_V2_SCHEDULE_START, {
            schedule:     schedule.map(e => ({ expectedTimeMs: e.expectedTimeMs, action: e.action })),
            earlyWindowMs: CombatConfig.inputEarlyWindow,
            lateWindowMs:  CombatConfig.inputLateWindow,
        });
        const { inputEarlyWindow, inputLateWindow } = CombatConfig;

        // Track keys currently held: dir -> time pressed (relative to sequenceStart)
        const pressedKeys  = new Set<AttackDirection>();
        const keyPressedAt = new Map<AttackDirection, number>();

        const holdChargeIntervals = new Map<ScheduledSubStep, ReturnType<typeof setInterval>>();

        const resolveSubStep = (step: ScheduledSubStep, correct: boolean) => {
            const chargeInterval = holdChargeIntervals.get(step);
            if (chargeInterval !== undefined) {
                clearInterval(chargeInterval);
                holdChargeIntervals.delete(step);
            }
            step.resolved     = true;
            step.timedCorrect = correct;
            if (correct) {
                this.cameras.main.shake(350, 0.008);
                EventBus.emit(Events.COMBAT_V2_TIMED_INPUT);
            }
        };

        const startHoldCharge = (step: ScheduledSubStep) => {
            if (holdChargeIntervals.has(step)) return;
            const interval = setInterval(() => this.cameras.main.shake(80, 0.003), 100);
            holdChargeIntervals.set(step, interval);
        };

        // Returns 'resolved' | 'pending' (window open, keep waiting) | 'skip' (out of window or not a chord)
        const tryChordSubStep = (step: ScheduledSubStep, elapsed: number): 'resolved' | 'pending' | 'skip' => {
            if (!step.expectedDirs) return 'skip';
            const inWindow = elapsed >= step.expectedTimeMs - inputEarlyWindow &&
                             elapsed <= step.expectedTimeMs + inputLateWindow;
            if (!inWindow) return 'skip';
            if (!step.expectedDirs.every(d => pressedKeys.has(d))) return 'pending';
            resolveSubStep(step, true);
            return 'resolved';
        };

        const onKeyDown = (event: KeyboardEvent) => {
            const dir = WASD_MAP[event.key.toUpperCase()];
            if (dir === undefined) return;
            event.preventDefault();

            const elapsed = this.time.now - sequenceStart;

            if (!pressedKeys.has(dir)) {
                pressedKeys.add(dir);
                keyPressedAt.set(dir, elapsed);
            }

            for (const entry of schedule) {
                if (entry.resolved) continue;

                if (entry.specialStages) {
                    const activeStage = entry.specialStages.find(s => !s.resolved);
                    if (!activeStage) continue;

                    const nextStep = activeStage.subSteps.find(s => !s.resolved);
                    if (!nextStep) continue;

                    if (nextStep.expectedDirs) {
                        // Chord sub-step in special stage
                        const chordResult = tryChordSubStep(nextStep, elapsed);
                        if (chordResult === 'skip') continue;    // out of window — try next entry
                        if (chordResult === 'pending') break;    // window open, waiting for more keys
                        // 'resolved'
                        if (activeStage.subSteps.every(s => s.resolved)) {
                            activeStage.resolved = true;
                            activeStage.timed    = activeStage.subSteps.every(s => s.timedCorrect);
                            if (entry.specialStages.every(s => s.resolved)) {
                                entry.resolved = true;
                                entry.timed    = entry.specialStages.every(s => s.timed);
                            }
                        }
                        break;
                    }

                    if (nextStep.holdMs !== undefined) {
                        // Hold sub-step in special stage: record press, resolve on keyup
                        const inWindow = elapsed >= nextStep.expectedTimeMs - inputEarlyWindow &&
                                         elapsed <= nextStep.expectedTimeMs + inputLateWindow;
                        if (inWindow && dir === nextStep.expectedDir && nextStep.holdPressedAt === undefined) {
                            nextStep.holdPressedAt = elapsed;
                            startHoldCharge(nextStep);
                        }
                        continue;
                    }

                    const inWindow = elapsed >= nextStep.expectedTimeMs - inputEarlyWindow &&
                                     elapsed <= nextStep.expectedTimeMs + inputLateWindow;
                    if (!inWindow) continue;

                    nextStep.resolved     = true;
                    nextStep.timedCorrect = (dir === nextStep.expectedDir);

                    if (nextStep.timedCorrect) {
                        this.cameras.main.shake(350, 0.008);
                        EventBus.emit(Events.COMBAT_V2_TIMED_INPUT);
                    }

                    if (activeStage.subSteps.every(s => s.resolved)) {
                        activeStage.resolved = true;
                        activeStage.timed    = activeStage.subSteps.every(s => s.timedCorrect);
                        if (entry.specialStages.every(s => s.resolved)) {
                            entry.resolved = true;
                            entry.timed    = entry.specialStages.every(s => s.timed);
                        }
                    }
                    break;
                } else if (entry.subSteps) {
                    const nextStep = entry.subSteps.find(s => !s.resolved);
                    if (!nextStep) continue;

                    if (nextStep.expectedDirs) {
                        // Chord sub-step
                        const chordResult = tryChordSubStep(nextStep, elapsed);
                        if (chordResult === 'skip') continue;    // out of window — try next entry
                        if (chordResult === 'pending') break;    // window open, waiting for more keys
                        // 'resolved'
                        if (entry.subSteps.every(s => s.resolved)) {
                            entry.resolved = true;
                            entry.timed    = entry.subSteps.every(s => s.timedCorrect);
                        }
                        break;
                    }

                    if (nextStep.holdMs !== undefined) {
                        // Hold sub-step: record press time, resolution deferred to keyup
                        const inWindow = elapsed >= nextStep.expectedTimeMs - inputEarlyWindow &&
                                         elapsed <= nextStep.expectedTimeMs + inputLateWindow;
                        if (inWindow && dir === nextStep.expectedDir && nextStep.holdPressedAt === undefined) {
                            nextStep.holdPressedAt = elapsed;
                            startHoldCharge(nextStep);
                        }
                        continue;
                    }

                    const inWindow = elapsed >= nextStep.expectedTimeMs - inputEarlyWindow &&
                                     elapsed <= nextStep.expectedTimeMs + inputLateWindow;
                    if (!inWindow) continue;

                    nextStep.resolved     = true;
                    nextStep.timedCorrect = (dir === nextStep.expectedDir);

                    if (entry.subSteps.every(s => s.resolved)) {
                        entry.resolved = true;
                        entry.timed    = entry.subSteps.every(s => s.timedCorrect);
                        if (entry.timed) {
                            this.cameras.main.shake(350, 0.008);
                            EventBus.emit(Events.COMBAT_V2_TIMED_INPUT);
                        }
                    }
                    break;
                } else {
                    const inWindow = elapsed >= entry.expectedTimeMs - inputEarlyWindow &&
                                     elapsed <= entry.expectedTimeMs + inputLateWindow;
                    if (!inWindow) continue;
                    entry.resolved = true;
                    entry.timed    = true;
                    this.cameras.main.shake(350, 0.008);
                    EventBus.emit(Events.COMBAT_V2_TIMED_INPUT);
                    break;
                }
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            const dir = WASD_MAP[event.key.toUpperCase()];
            if (dir === undefined) return;

            const elapsed = this.time.now - sequenceStart;
            pressedKeys.delete(dir);
            keyPressedAt.delete(dir);

            const resolveHoldInSubSteps = (subSteps: ScheduledSubStep[]): boolean => {
                const nextStep = subSteps.find(s => !s.resolved);
                if (!nextStep || nextStep.expectedDir !== dir || nextStep.holdMs === undefined) return false;
                if (nextStep.holdPressedAt === undefined) return false;

                const heldFor = elapsed - nextStep.holdPressedAt;
                resolveSubStep(nextStep, heldFor >= nextStep.holdMs * 0.75);
                return true;
            };

            for (const entry of schedule) {
                if (entry.resolved) continue;

                if (entry.specialStages) {
                    const activeStage = entry.specialStages.find(s => !s.resolved);
                    if (!activeStage) continue;
                    if (!resolveHoldInSubSteps(activeStage.subSteps)) continue;

                    if (activeStage.subSteps.every(s => s.resolved)) {
                        activeStage.resolved = true;
                        activeStage.timed    = activeStage.subSteps.every(s => s.timedCorrect);
                        if (entry.specialStages.every(s => s.resolved)) {
                            entry.resolved = true;
                            entry.timed    = entry.specialStages.every(s => s.timed);
                        }
                    }
                    break;
                }

                const subSteps = entry.subSteps;
                if (!subSteps) continue;
                if (!resolveHoldInSubSteps(subSteps)) continue;

                if (subSteps.every(s => s.resolved)) {
                    entry.resolved = true;
                    entry.timed    = subSteps.every(s => s.timedCorrect);
                }
                break;
            }
        };

        this.input.keyboard!.on('keydown', onKeyDown);
        this.input.keyboard!.on('keyup',   onKeyUp);

        let ratingPool = this.comboHistory.length > 0
            ? this.comboHistory[this.comboHistory.length - 1].comboStack.comboRating
            : 0;

        const turnStartIndex = this.comboHistory.length;

        if (turnStartIndex === 0) {
            for (const mod     of mods)     mod.onComboStart(this.comboHistory);
            for (const wm      of this.worldMods) wm.onComboStart(this.comboHistory);
            for (const passive of passives) passive.onComboStart(this.comboHistory);
        }

        EventBus.emit(Events.COMBAT_V2_PLAYER_ATTACK_START, { actor, target });

        for (const entry of schedule) {
            if (!target.isAlive) break;

            const action = entry.action;

            if (action instanceof DancerCombatSpecialAction) {
                ratingPool = Math.max(0, ratingPool - action.ratingRequirement);
            }

            const prev = this.comboHistory[this.comboHistory.length - 1] ?? null;
            const step: ComboStep = {
                action,
                comboStack:                new ComboStackSystem(ratingPool),
                availableWorldMods:        this.worldMods,
                availableComboMods:        mods,
                availableComboRules:       this.comboRules,
                availableCreaturePassives: passives,
                applicableWorldMods:       [],
                applicableComboMods:       [],
                applicableComboRules:      [],
                applicableCreaturePassives:[],
                activeEffects: prev ? new Map(prev.activeEffects) : new Map(),
                newEffects:    [],
                lostEffects:   [],
                finalDamage:   0,
            };
            calculateStepDamage(step, this.comboHistory);
            ratingPool = step.comboStack.comboRating;

            if (entry.specialStages) {
                // ── Multi-stage special: fire each stage when its time arrives ──
                let totalDealt = 0;
                for (const stage of entry.specialStages) {
                    if (!target.isAlive) break;

                    if (stage.playAnimationOnStageStart) {
                        this.sceneRenderer.playPlayerAttack(actor, `player-${stage.animation}-anim`);
                    }

                    const elapsed  = this.time.now - sequenceStart;
                    const waitLeft = stage.executionTimeMs - elapsed;
                    if (waitLeft > 0) await this.delay(waitLeft);

                    if (!stage.resolved) {
                        for (const s of stage.subSteps) s.resolved = true;
                        stage.resolved = true;
                        stage.timed    = false;
                    }

                    if (!stage.playAnimationOnStageStart) {
                        this.sceneRenderer.playPlayerAttack(actor, `player-${stage.animation}-anim`);
                    }
                    const dealt = target.damage(stage.damage);
                    totalDealt += dealt;
                    for (const effect of action.effects) effect.apply(target);
                    this.sceneRenderer.updateEnemyHpBars(this.enemies);
                    this.sceneRenderer.playEnemyHit(target);

                    await this.delay(ACTION_SETTLE_MS / speed);
                }

                entry.resolved = true;
                entry.timed    = entry.specialStages.every(s => s.timed);

                this.sceneRenderer.showStepEffects(step, target);
                target.syncEffects(step.activeEffects);
                this.sceneRenderer.updateEnemyAirbornePositions(this.enemies);

                EventBus.emit(Events.COMBAT_V2_PLAYER_ACTION_END, {
                    actor,
                    target,
                    action,
                    chainMult:     1,
                    actualDamage:  totalDealt,
                    comboRating:   ratingPool,
                    atkMultiplier: step.comboStack.finalMultiplier,
                });

            } else {
                // ── Single-animation action ────────────────────────────────────
                const elapsed  = this.time.now - sequenceStart;
                const waitLeft = entry.executionTimeMs - elapsed;
                if (waitLeft > 0) await this.delay(waitLeft);

                if (!entry.resolved) {
                    if (entry.subSteps) {
                        for (const s of entry.subSteps) s.resolved = true;
                        entry.timed = false;
                    }
                    entry.resolved = true;
                }

                this.sceneRenderer.playPlayerAttack(actor, `player-${action.animation}-anim`);

                const actualDamage = target.damage(step.finalDamage);
                for (const effect of action.effects) effect.apply(target);
                this.sceneRenderer.updateEnemyHpBars(this.enemies);
                this.sceneRenderer.playEnemyHit(target);
                this.sceneRenderer.showStepEffects(step, target);

                target.syncEffects(step.activeEffects);
                this.sceneRenderer.updateEnemyAirbornePositions(this.enemies);

                EventBus.emit(Events.COMBAT_V2_PLAYER_ACTION_END, {
                    actor,
                    target,
                    action,
                    chainMult:     1,
                    actualDamage,
                    comboRating:   ratingPool,
                    atkMultiplier: step.comboStack.finalMultiplier,
                });

                await this.delay(ACTION_SETTLE_MS / speed);
            }

            this.comboHistory.push(step);
        }

        this.input.keyboard!.off('keydown', onKeyDown);
        this.input.keyboard!.off('keyup',   onKeyUp);
        for (const interval of holdChargeIntervals.values()) clearInterval(interval);
        holdChargeIntervals.clear();

        const turnSteps = this.comboHistory.slice(turnStartIndex);
        for (const mod     of mods)     mod.onComboEnd(turnSteps);
        for (const wm      of this.worldMods) wm.onComboEnd(turnSteps);
        for (const passive of passives) passive.onComboEnd(turnSteps);

        await this.delay(500);
        if (actor.isAlive) actor.sprite?.play(actor.idleAnimKey);
    }

    private buildInputSchedule(plannedActions: CombatAction[], speed: number, mods: readonly ComboMod[] = []): ScheduledInput[] {
        const schedule: ScheduledInput[] = [];
        let t = INITIAL_INPUT_DELAY_MS / speed;

        for (let i = 0; i < plannedActions.length; i++) {
            const action = plannedActions[i];

            // ── Multi-stage special ───────────────────────────────────────────
            if (action instanceof DancerCombatSpecialAction && action.stages) {
                const specialStages: ScheduledSpecialStage[] = [];
                let stageT = t;

                for (const stage of action.stages) {
                    const seqSteps = stage.input.inputSequenceSteps ?? [];
                    const subSteps: ScheduledSubStep[] = [];
                    let stepT = stageT;

                    for (let j = 0; j < seqSteps.length; j++) {
                        const s = seqSteps[j];
                        stepT += s.waitMs / speed;
                        if (isChordStep(s)) {
                            subSteps.push({ expectedTimeMs: stepT, expectedDirs: s.keys, resolved: false, timedCorrect: false });
                        } else {
                            subSteps.push({ expectedTimeMs: stepT, expectedDir: s.key, holdMs: s.holdMs, resolved: false, timedCorrect: false });
                        }
                    }

                    const lastSubStep = subSteps[subSteps.length - 1];
                    const executionTimeMs = lastSubStep
                        ? lastSubStep.expectedTimeMs + (lastSubStep.holdMs ?? 0) / speed
                        : stageT;

                    specialStages.push({
                        subSteps,
                        animation:               stage.animation,
                        damage:                  stage.damage ?? action.damage,
                        executionTimeMs,
                        resolved:                false,
                        timed:                   false,
                        playAnimationOnStageStart: stage.playAnimationOnStageStart ?? false,
                    });

                    // Next stage's first input is spaced by this stage's last-key waitMs only
                    stageT = executionTimeMs
                        + (stage.input.waitTillNextInputDuration / speed);
                }

                const lastStage = specialStages[specialStages.length - 1];
                schedule.push({
                    expectedTimeMs:  t,
                    executionTimeMs: lastStage?.executionTimeMs ?? t,
                    action,
                    resolved:       false,
                    timed:          false,
                    specialStages,
                });

                if (i < plannedActions.length - 1) {
                    t = (lastStage?.executionTimeMs ?? t) + ACTION_SETTLE_MS / speed;
                }
                continue;
            }

            // ── Single-input / sequence action ────────────────────────────────
            const inp     = action.input;
            const seqSteps = inp?.inputSequenceSteps;
            let executionTimeMs = t;
            let subSteps: ScheduledSubStep[] | undefined;

            if (seqSteps && seqSteps.length > 0) {
                subSteps = [];
                let stepT = t;
                for (let j = 0; j < seqSteps.length; j++) {
                    const s = seqSteps[j];
                    stepT += s.waitMs / speed;
                    if (isChordStep(s)) {
                        subSteps.push({ expectedTimeMs: stepT, expectedDirs: s.keys, resolved: false, timedCorrect: false });
                    } else {
                        subSteps.push({ expectedTimeMs: stepT, expectedDir: s.key, holdMs: s.holdMs, resolved: false, timedCorrect: false });
                    }
                }
                executionTimeMs = subSteps[subSteps.length - 1].expectedTimeMs;
            } else if (inp?.inputHold) {
                // Top-level hold: single sub-step with holdMs; action fires after hold completes
                const h = inp.inputHold;
                const stepT = t + inp.waitTillNextInputDuration / speed;
                subSteps = [{ expectedTimeMs: stepT, expectedDir: h.direction, holdMs: h.durationMs, resolved: false, timedCorrect: false }];
                executionTimeMs = stepT + h.durationMs / speed;
            } else if (inp?.inputChord) {
                // Top-level chord: single sub-step with expectedDirs
                const stepT = t + inp.waitTillNextInputDuration / speed;
                subSteps = [{ expectedTimeMs: stepT, expectedDirs: inp.inputChord, resolved: false, timedCorrect: false }];
                executionTimeMs = stepT;
            } else if (inp?.inputDirection !== null && inp?.inputDirection !== undefined) {
                // Simple tap — let combo mods convert it to a hold
                const override: ScheduleEntryOverride = mods.reduce<ScheduleEntryOverride>(
                    (acc, mod) => ({ ...acc, ...mod.onBuildSchedule(action, i, plannedActions) }),
                    {},
                );
                if (override.tapToHoldMs !== undefined) {
                    subSteps = [{ expectedTimeMs: t, expectedDir: inp.inputDirection, holdMs: override.tapToHoldMs, resolved: false, timedCorrect: false }];
                    executionTimeMs = t + override.tapToHoldMs / speed;
                }
            }

            schedule.push({
                expectedTimeMs:  t,
                executionTimeMs,
                action,
                resolved: false,
                timed:    false,
                subSteps,
            });

            if (i < plannedActions.length - 1) {
                t = executionTimeMs + ACTION_SETTLE_MS / speed;
                t += (action.input?.waitTillNextInputDuration ?? 0) / speed;
            }
        }
        console.log('[InputSchedule]', schedule.map(e => ({
            action:         e.action.name,
            expectedTimeMs: e.expectedTimeMs,
            executionTimeMs: e.executionTimeMs,
            subSteps:       e.subSteps?.map(s => ({ dir: s.expectedDir, expectedTimeMs: s.expectedTimeMs })),
            specialStages:  e.specialStages?.map(st => ({
                animation:      st.animation,
                executionTimeMs: st.executionTimeMs,
                subSteps:       st.subSteps.map(s => ({ dir: s.expectedDir, expectedTimeMs: s.expectedTimeMs })),
            })),
        })));
        return schedule;
    }

    private waitForPlannerInput(
        actor:              CombatScenePlayableCharacter,
        mods:               readonly ComboMod[],
        passives:           readonly SupportPassive[],
        forcedFirstDir:     AttackDirection | null,
        initialTokenCounts: Record<AttackDirection, number>,
    ): Promise<{ carryoverTokenCounts: Record<AttackDirection, number>; plannedActions: CombatAction[] }> {
        const simulatedHistory: ComboStep[] = [...this.comboHistory];
        const initialHistoryLength = simulatedHistory.length;
        const tokenCounts: Record<AttackDirection, number> = { ...initialTokenCounts };
        const maxSteps = Object.values(tokenCounts).reduce((a, b) => a + b, 0);

        this.correctTargetIndex();
        this.sceneRenderer.setTargetSelection(this._targetIndex, this.enemies);

        let simRatingPool = this.comboHistory.length > 0
            ? this.comboHistory[this.comboHistory.length - 1].comboStack.comboRating
            : 0;

        type UndoEntry =
            | { kind: 'auto';    undo: () => void }
            | { kind: 'special'; undo: () => void; action: CombatAction };

        const undoStack: UndoEntry[] = [];
        let autoComboUndoCount = 0;

        // Pre-compute auto-combo once from the initial token snapshot.
        // Specials don't consume tokens, so this result never changes during planning.
        const previewTokens = { ...tokenCounts };
        if (forcedFirstDir !== null && previewTokens[forcedFirstDir] > 0) {
            previewTokens[forcedFirstDir]--;
        }
        const cachedBestSeq = findBestComboFromTokens(
            previewTokens, actor.actionDeck, mods, this.worldMods, this.comboRules, passives,
        );

        EventBus.emit(Events.COMBAT_V2_PLANNER_START, {
            maxSteps,
            tokenCounts:        { ...tokenCounts },
            initialTokenCounts: { ...initialTokenCounts },
        });
        EventBus.emit(Events.COMBAT_V2_PLANNER_STAGE, { stage: 'planning' });

        // ── Step appliers ─────────────────────────────────────────────────────

        const addDirStep = (dir: AttackDirection): boolean => {
            if (tokenCounts[dir] <= 0) return false;
            const prevRating = simRatingPool;
            tokenCounts[dir]--;
            simRatingPool = this.addSimulatedStep(
                actor, mods, passives, actor.actionDeck.getAction(dir), simulatedHistory, simRatingPool, tokenCounts,
            );
            undoStack.push({ kind: 'auto', undo: () => {
                simulatedHistory.pop();
                tokenCounts[dir]++;
                simRatingPool = prevRating;
                EventBus.emit(Events.COMBAT_V2_PLANNER_UNDO, { comboRating: prevRating, tokenCounts: { ...tokenCounts } });
            }});
            return true;
        };

        const addSpecialStep = (special: CombatAction): void => {
            const prevRating = simRatingPool;
            const ratingCost = special instanceof DancerCombatSpecialAction ? special.ratingRequirement : 0;
            simRatingPool = this.addSimulatedStep(
                actor, mods, passives, special, simulatedHistory,
                Math.max(0, simRatingPool - ratingCost), tokenCounts,
            );
            undoStack.push({ kind: 'special', action: special, undo: () => {
                simulatedHistory.pop();
                simRatingPool = prevRating;
                EventBus.emit(Events.COMBAT_V2_PLANNER_UNDO, { comboRating: prevRating, tokenCounts: { ...tokenCounts } });
            }});
        };

        // ── Auto-combo helpers ────────────────────────────────────────────────

        // Remove the auto-combo block (only call when top of stack is 'auto').
        const drainAutoCombo = (): void => {
            for (let i = 0; i < autoComboUndoCount; i++) undoStack.pop()!.undo();
            autoComboUndoCount = 0;
        };

        // Append auto-combo to wherever the plan currently ends; no-op if already applied.
        const applyAutoCombo = (): void => {
            if (autoComboUndoCount > 0) return;
            if (forcedFirstDir !== null && addDirStep(forcedFirstDir)) autoComboUndoCount++;
            for (const dir of cachedBestSeq) {
                if (addDirStep(dir)) autoComboUndoCount++;
            }
            EventBus.emit(Events.COMBAT_V2_PLANNER_STAGE, { stage: 'auto-combo' });
        };

        const handleDelete = (): void => {
            if (undoStack.length === 0) return;
            const last = undoStack[undoStack.length - 1];
            if (last.kind === 'special') {
                undoStack.pop()!.undo();
            } else {
                drainAutoCombo();
                EventBus.emit(Events.COMBAT_V2_PLANNER_STAGE, { stage: 'planning' });
            }
        };

        return new Promise<{ carryoverTokenCounts: Record<AttackDirection, number>; plannedActions: CombatAction[] }>(resolve => {
            const finish = () => {
                this.input.keyboard!.off('keydown', onKeyDown);
                EventBus.off(Events.COMBAT_V2_SPECIAL_SELECTED,       onSpecialSelected);
                EventBus.off(Events.COMBAT_V2_AUTO_COMBO_REQUEST,      applyAutoCombo);
                EventBus.off(Events.COMBAT_V2_PLANNER_CONFIRM_REQUEST, finish);
                EventBus.emit(Events.COMBAT_V2_PLANNER_END);
                const plannedActions = simulatedHistory.slice(initialHistoryLength).map(s => s.action);
                resolve({ carryoverTokenCounts: { ...tokenCounts }, plannedActions });
            };

            const onSpecialSelected = ({ index }: { index: number }) => {
                const sp = actor.actionDeck.getAllSpecials()[index];
                if (!sp) return;
                if (
                    sp instanceof DancerCombatSpecialAction &&
                    sp.tokenSpentRequirement &&
                    !this.meetsTokenSpentRequirement(sp.tokenSpentRequirement, tokenCounts, initialTokenCounts)
                ) return;
                addSpecialStep(sp);
            };

            const onKeyDown = (event: KeyboardEvent) => {
                const consumed = ['Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Delete', 'Escape', 'Backspace'];
                if (consumed.includes(event.key)) event.preventDefault();

                if (event.key === 'Enter')      { finish(); return; }
                if (event.key === 'Tab')         { applyAutoCombo(); return; }
                if (event.key === 'ArrowLeft')   { this.cycleTarget(-1); return; }
                if (event.key === 'ArrowRight')  { this.cycleTarget(1);  return; }
                if (event.key === 'Delete' || event.key === 'Escape' || event.key === 'Backspace') {
                    handleDelete();
                }
            };

            this.input.keyboard!.on('keydown', onKeyDown);
            EventBus.on(Events.COMBAT_V2_SPECIAL_SELECTED,       onSpecialSelected);
            EventBus.on(Events.COMBAT_V2_AUTO_COMBO_REQUEST,      applyAutoCombo);
            EventBus.on(Events.COMBAT_V2_PLANNER_CONFIRM_REQUEST, finish);
        });
    }

    private meetsTokenSpentRequirement(
        req:                TokenSpentRequirement,
        tokenCounts:        Record<AttackDirection, number>,
        initialTokenCounts: Record<AttackDirection, number>,
    ): boolean {
        const dirs = [AttackDirection.UP, AttackDirection.DOWN, AttackDirection.LEFT, AttackDirection.RIGHT];
        if (req.mode === 'any') {
            const totalSpent = dirs.reduce((sum, d) => sum + Math.max(0, initialTokenCounts[d] - tokenCounts[d]), 0);
            return totalSpent >= req.total;
        }
        for (const [dirStr, required] of Object.entries(req.perDir)) {
            const dir   = Number(dirStr) as AttackDirection;
            const spent = Math.max(0, initialTokenCounts[dir] - tokenCounts[dir]);
            if (spent < (required ?? 0)) return false;
        }
        return true;
    }

    private generateTokens(): AttackDirection[] {
        const dirs = [AttackDirection.UP, AttackDirection.DOWN, AttackDirection.LEFT, AttackDirection.RIGHT];
        const tokens: AttackDirection[] = [];
        for (let i = 0; i < TOKENS_PER_TURN; i++) {
            tokens.push(dirs[Math.floor(Math.random() * dirs.length)]);
        }
        return tokens;
    }

    // Returns the new comboRating after the step (so callers can track the pool).
    private addSimulatedStep(
        _actor:           CombatScenePlayableCharacter,
        mods:             readonly ComboMod[],
        passives:         readonly SupportPassive[],
        action:           CombatAction,
        simulatedHistory: ComboStep[],
        startingRating:   number,
        tokenCounts?:     Record<AttackDirection, number>,
    ): number {
        const prev = simulatedHistory[simulatedHistory.length - 1] ?? null;
        const step: ComboStep = {
            action,
            comboStack:                 new ComboStackSystem(startingRating),
            availableWorldMods:         this.worldMods,
            availableComboMods:         mods,
            availableComboRules:        this.comboRules,
            availableCreaturePassives:  passives,
            applicableWorldMods:         [],
            applicableComboMods:         [],
            applicableComboRules:        [],
            applicableCreaturePassives:  [],
            activeEffects: prev ? new Map(prev.activeEffects) : new Map(),
            newEffects:    [],
            lostEffects:   [],
            finalDamage:   0,
        };

        calculateStepDamage(step, simulatedHistory);
        simulatedHistory.push(step);

        const input = action.input;
        const speed = CombatConfig.inputPhaseSpeed;

        const seqStepDisplay = (s: import('../entities/CombatTypes').SequenceStep): string =>
            isChordStep(s) ? s.keys.map(d => DIR_DISPLAY[d]).join('+')
                           : DIR_DISPLAY[s.key] + (s.holdMs ? `(${s.holdMs}ms)` : '');

        const stageSequences = action instanceof DancerCombatSpecialAction && action.stages
            ? action.stages.map(stage => ({
                animation:  stage.animation,
                steps: (stage.input.inputSequenceSteps ?? []).map(s => ({
                    dir:    isChordStep(s) ? s.keys[0] : s.key,
                    waitMs: s.waitMs / speed,
                    label:  seqStepDisplay(s),
                    holdMs: isChordStep(s) ? undefined : s.holdMs,
                })),
            }))
            : undefined;

        const displayKey = stageSequences
            ? stageSequences.map(s => s.steps.map(k => k.label).join('')).join(' → ')
            : input?.inputDirection != null
                ? DIR_DISPLAY[input.inputDirection]
                : input?.inputHold != null
                    ? `[${DIR_DISPLAY[input.inputHold.direction]}](${input.inputHold.durationMs}ms)`
                    : input?.inputChord != null
                        ? input.inputChord.map(d => DIR_DISPLAY[d]).join('+')
                        : input?.inputSequenceSteps != null
                            ? input.inputSequenceSteps.map(seqStepDisplay).join('')
                            : input?.inputSpecialKey != null
                                ? String(input.inputSpecialKey)
                                : '?';

        EventBus.emit(Events.COMBAT_V2_PLANNER_ACTION, {
            action,
            displayKey,
            simulatedDamage: step.finalDamage,
            comboRating:     step.comboStack.comboRating,
            atkMultiplier:   step.comboStack.finalMultiplier,
            waitMs:          (input?.waitTillNextInputDuration ?? 0) / speed,
            tokenCounts:     tokenCounts ? { ...tokenCounts } : undefined,
            sequenceSteps:   input?.inputSequenceSteps?.map(s => ({
                dir:    isChordStep(s) ? s.keys[0] : s.key,
                waitMs: s.waitMs / speed,
                label:  seqStepDisplay(s),
            })),
            stageSequences,
        });

        return step.comboStack.comboRating;
    }

    // ── Enemy turn ────────────────────────────────────────────────────────────

    private async handleEnemyTurn(actor: CombatSceneEnemyCharacter): Promise<void> {
        await this.executeEnemyAttackSequence(actor);
    }

    private async executeEnemyAttackSequence(actor: CombatSceneEnemyCharacter): Promise<void> {
        const chain        = actor.template.chooseAttackSequence();
        const alivePlayers = this.players.filter(p => p.isAlive);
        const target       = actor.template.chooseTarget(alivePlayers);
        const threshold    = target?.template.interruptThreshold ?? 4;
        const actorIndex   = this.enemies.indexOf(actor);

        EventBus.emit(Events.COMBAT_V2_ENEMY_ATTACK_START, { actor, target, chain });

        // Only the acting enemy moves to the front; others hide
        this.sceneRenderer.moveToCombatPositions(this.players, this.enemies, actorIndex);
        await this.delay(MOVE_SETTLE_MS);

        let continuousParryCount = 0;
        let counterAttacked      = false;

        for (const action of chain) {
            if (!target?.isAlive || !this.players.some(p => p.isAlive)) return;

            EventBus.emit(Events.COMBAT_V2_ENEMY_MOVE_START, { actor, target, action });
            this.sceneRenderer.repositionEnemyForAttack(actor, action.direction);
            const outcome = await new EnemyCombatActionHandler(this, action).execute();

            // Track last enemy input direction regardless of outcome
            this.lastEnemyInputDir = action.direction;

            actor.sprite?.play('ds-flame1-anim');
            actor.sprite?.once('animationcomplete', () => {
                this.time.delayedCall(IDLE_RETURN_MS, () => {
                    actor.sprite?.play('ds-idle-anim');
                });
            });

            if (outcome.type === QTEEventType.Parry) {
                this.cameras.main.shake(350, 0.008);
                target.onParried();
                continuousParryCount++;
                EventBus.emit(Events.COMBAT_V2_PARRY, { action, continuousParryCount, outcome });
                if (continuousParryCount >= threshold || continuousParryCount === chain.length) {
                    counterAttacked = true;
                    break;
                }
            } else if (outcome.type === QTEEventType.WrongBlock) {
                // Timed press but wrong direction — blocked but no parry credit
                continuousParryCount = 0;
                EventBus.emit(Events.COMBAT_V2_WRONG_BLOCK, {});
            } else {
                target.sprite?.setTint(0xff4444);
                target.onHit();
                target.sprite?.once('animationcomplete', () => {
                    target.sprite?.clearTint();
                    this.time.delayedCall(IDLE_RETURN_MS, () => {
                        target.sprite?.play(target.idleAnimKey);
                    });
                });
                continuousParryCount = 0;
                if (target.isAlive) {
                    target.damage(action.damage);
                }
                EventBus.emit(Events.COMBAT_V2_PLAYER_HIT, { damage: action.damage });
            }

            await this.delay(200);
        }

        if (counterAttacked && target) {
            await this.triggerCounterAttack(target, actor);
        }

        // If the enemy is dead, the forced-input direction is no longer meaningful
        if (!actor.isAlive) {
            this.lastEnemyInputDir = null;
        }
    }

    private async triggerCounterAttack(
        attacker:      CombatScenePlayableCharacter,
        counterTarget: CombatSceneEnemyCharacter,
    ): Promise<void> {
        attacker.performCounterAttack();
        attacker.sprite?.once('animationcomplete', () => {
            this.time.delayedCall(IDLE_RETURN_MS, () => {
                attacker.sprite?.play(attacker.idleAnimKey);
            });
        });

        EventBus.emit(Events.COMBAT_V2_COUNTER_ATTACK, { attacker, counterTarget });

        const dealt = counterTarget.damage(5);
        this.sceneRenderer.updateEnemyHpBars(this.enemies);

        counterTarget.sprite?.clearTint();
        counterTarget.sprite?.play(counterTarget.hitAnimKey);
        counterTarget.sprite?.once('animationcomplete', () => {
            this.time.delayedCall(IDLE_RETURN_MS, () => {
                if (counterTarget.isAlive) counterTarget.sprite?.play(counterTarget.idleAnimKey);
                else                       counterTarget.sprite?.play(counterTarget.deathAnimKey);
            });
        });

        EventBus.emit(Events.COMBAT_V2_PLAYER_ACTION_END, {
            actor:        attacker,
            target:       counterTarget,
            action:       null,
            chainMult:    1,
            actualDamage: dealt,
            isCounter:    true,
        });

        await this.delay(800);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private checkCombatContinues(): boolean {
        if (!this.players.some(p => p.isAlive)) {
            EventBus.emit(Events.COMBAT_V2_ENDED, { result: 'defeat' });
            return false;
        }
        if (!this.enemies.some(e => e.isAlive)) {
            EventBus.emit(Events.COMBAT_V2_ENDED, { result: 'victory' });
            return false;
        }
        return true;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => this.time.delayedCall(ms, resolve));
    }
}
