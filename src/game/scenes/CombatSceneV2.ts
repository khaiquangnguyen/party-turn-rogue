import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import {
    CombatSceneCharacter,
    CombatSceneEnemyCharacter,
    CombatScenePlayableCharacter,
} from '../entities/CombatSceneCharacter';
import { CombatRoundTurnOrderManager } from '../CombatRoundTurnOrderManager';
import { QTEEventType, AttackDirection, CombatAction } from '../entities/CombatTypes';
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
import {DancerCombatSpecialAction} from "../entities/CombatTypes.ts";
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

interface ScheduledInput {
    expectedTimeMs: number
    action:         CombatAction
    resolved:       boolean
    timed:          boolean
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

        EventBus.emit(Events.COMBAT_V2_INPUT_PHASE_START, {
            initialDelayMs: (500 + INITIAL_INPUT_DELAY_MS) / speed,
            moveSettleMs:   MOVE_SETTLE_MS / speed,
            actionSettleMs: ACTION_SETTLE_MS / speed,
        });

        await this.delay(500 / speed);

        const schedule = this.buildInputSchedule(plannedActions, speed);

        this.sceneRenderer.moveToCombatPositions(this.players, this.enemies, this._targetIndex);
        await this.delay(MOVE_SETTLE_MS / speed);

        EventBus.emit(Events.COMBAT_V2_SCHEDULE_START, {
            schedule:     schedule.map(e => ({ expectedTimeMs: e.expectedTimeMs, action: e.action })),
            earlyWindowMs: CombatConfig.inputEarlyWindow,
            lateWindowMs:  CombatConfig.inputLateWindow,
        });

        const sequenceStart = this.time.now;
        const { inputEarlyWindow, inputLateWindow } = CombatConfig;

        const onKeyDown = (event: KeyboardEvent) => {
            const dir = WASD_MAP[event.key.toUpperCase()];
            if (dir === undefined) return;
            event.preventDefault();

            const elapsed = this.time.now - sequenceStart;
            for (const entry of schedule) {
                if (!entry.resolved &&
                    elapsed >= entry.expectedTimeMs - inputEarlyWindow &&
                    elapsed <= entry.expectedTimeMs + inputLateWindow) {
                    entry.resolved = true;
                    entry.timed    = true;
                    this.cameras.main.shake(350, 0.008);
                    EventBus.emit(Events.COMBAT_V2_TIMED_INPUT);
                    break;
                }
            }
        };
        this.input.keyboard!.on('keydown', onKeyDown);

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

            const elapsed  = this.time.now - sequenceStart;
            const waitLeft = entry.expectedTimeMs - elapsed;
            if (waitLeft > 0) await this.delay(waitLeft);

            if (!entry.resolved) {
                entry.resolved = true;
            }

            const action = entry.action;
            if (action instanceof DancerCombatSpecialAction) {
                ratingPool = Math.max(0, ratingPool - action.ratingRequirement);
            }

            const prev = this.comboHistory[this.comboHistory.length - 1] ?? null;

            const step: ComboStep = {
                action,
                comboStack:                 new ComboStackSystem(ratingPool),
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

            calculateStepDamage(step, this.comboHistory);
            ratingPool = step.comboStack.comboRating;

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

            this.comboHistory.push(step);
            await this.delay(ACTION_SETTLE_MS / speed);
        }

        this.input.keyboard!.off('keydown', onKeyDown);

        const turnSteps = this.comboHistory.slice(turnStartIndex);
        for (const mod     of mods)     mod.onComboEnd(turnSteps);
        for (const wm      of this.worldMods) wm.onComboEnd(turnSteps);
        for (const passive of passives) passive.onComboEnd(turnSteps);
    }

    private buildInputSchedule(plannedActions: CombatAction[], speed: number): ScheduledInput[] {
        const schedule: ScheduledInput[] = [];
        let t = INITIAL_INPUT_DELAY_MS / speed;

        for (let i = 0; i < plannedActions.length; i++) {
            schedule.push({
                expectedTimeMs: t,
                action:         plannedActions[i],
                resolved:       false,
                timed:          false,
            });
            if (i < plannedActions.length - 1) {
                t += ACTION_SETTLE_MS / speed;
                t += (plannedActions[i].input?.waitTillNextInputDuration ?? 0) / speed;
            }
        }
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

        EventBus.emit(Events.COMBAT_V2_PLANNER_START, { maxSteps, tokenCounts: { ...tokenCounts } });
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
        const displayKey = input?.inputDirection != null
            ? DIR_DISPLAY[input.inputDirection]
            : input?.inputSequence != null
                ? input.inputSequence.map(d => DIR_DISPLAY[d]).join('')
                : input?.inputSpecialKey != null
                    ? String(input.inputSpecialKey)
                    : '?';

        EventBus.emit(Events.COMBAT_V2_PLANNER_ACTION, {
            action,
            displayKey,
            simulatedDamage: step.finalDamage,
            comboRating:     step.comboStack.comboRating,
            atkMultiplier:   step.comboStack.finalMultiplier,
            waitMs:          (input?.waitTillNextInputDuration ?? 0) / CombatConfig.inputPhaseSpeed,
            tokenCounts:     tokenCounts ? { ...tokenCounts } : undefined,
            sequenceSteps:   input?.inputSequenceSteps?.map(s => ({ dir: s.key, waitMs: s.waitMs / CombatConfig.inputPhaseSpeed })),
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

        const dealt = counterTarget.damage(30);
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
