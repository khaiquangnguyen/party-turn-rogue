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

type TimedInputResult =
    | { kind: 'dir';     direction: AttackDirection; timed: boolean }
    | { kind: 'special'; action: CombatAction };

const ENERGY_PER_TURN       = 2;
const MOVE_SETTLE_MS        = 420;
const IDLE_RETURN_MS        = 200;
const ACTION_SETTLE_MS      = 500;
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
        this.worldMods        = GameData.getRunPrep()?.worldModifiers ?? [];
        this.comboRules       = DEFAULT_COMBO_RULES;
        this.creaturePassives = (GameData.getRunPrep()?.companions ?? []).flatMap(c => c.supportPassives);
        this.sceneRenderer = new CombatSceneRenderer(this);
        this.sceneRenderer.setup(this.players, this.enemies);

        // Give players their starting energy pool
        for (const p of this.players) {
            p.energyManager.restore(ENERGY_PER_TURN);
        }

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

            // Restore energy at the moment the turn is announced so the UI shows it immediately
            if (actor.isPlayer) {
                (actor as CombatScenePlayableCharacter).energyManager.restore(ENERGY_PER_TURN);
            }

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

        await this.waitForPlannerInput(actor, mods, passives, forcedDir);

        const speed = CombatConfig.inputPhaseSpeed;

        EventBus.emit(Events.COMBAT_V2_INPUT_PHASE_START, {
            initialDelayMs: (500 + INITIAL_INPUT_DELAY_MS) / speed,
            moveSettleMs:   MOVE_SETTLE_MS / speed,
            actionSettleMs: ACTION_SETTLE_MS / speed,
        });

        await this.delay(500 / speed);

        // ratingPool carries the combo rating through the turn; specials deduct from it
        let ratingPool = this.comboHistory.length > 0
            ? this.comboHistory[this.comboHistory.length - 1].comboStack.comboRating
            : 0;

        const lookupSpecial = (key: 1 | 2 | 3 | 4): CombatAction | null => {
            const sp = actor.actionDeck.getSpecialByKey(key);
            if (!sp) return null;
            if (sp instanceof DancerCombatSpecialAction && ratingPool < sp.ratingRequirement) return null;
            return sp;
        };

        const firstInput = await this.waitForNextTimedInput(INITIAL_INPUT_DELAY_MS / speed, lookupSpecial);
        if (!firstInput) return;
        let nextInput: TimedInputResult = firstInput;

        const turnStartIndex = this.comboHistory.length;

        if (turnStartIndex === 0) {
            for (const mod     of mods)    mod.onComboStart(this.comboHistory);
            for (const wm      of this.worldMods) wm.onComboStart(this.comboHistory);
            for (const passive of passives) passive.onComboStart(this.comboHistory);
        }

        EventBus.emit(Events.COMBAT_V2_PLAYER_ATTACK_START, { actor, target });

        this.sceneRenderer.moveToCombatPositions(this.players, this.enemies, this._targetIndex);
        await this.delay(MOVE_SETTLE_MS / speed);

        let isFirstAction = true;

        while (target.isAlive) {
            if (actor.energyManager.getCurrentEnergy() <= 0) break;
            if (!isFirstAction) actor.energyManager.consume(1);
            isFirstAction = false;

            // Resolve action from direction key or special key
            let action: CombatAction;
            if (nextInput.kind === 'special') {
                action = nextInput.action;
                if (action instanceof DancerCombatSpecialAction) {
                    ratingPool = Math.max(0, ratingPool - action.ratingRequirement);
                }
            } else {
                action = actor.actionDeck.getAction(nextInput.direction);
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

            if (actor.energyManager.getCurrentEnergy() <= 0) break;

            const waitMs = action.input?.waitTillNextInputDuration ?? 0;
            const next   = await this.waitForNextTimedInput(waitMs / speed, lookupSpecial);
            if (!next) break;

            nextInput = next;
        }

        const turnSteps = this.comboHistory.slice(turnStartIndex);
        for (const mod     of mods)    mod.onComboEnd(turnSteps);
        for (const wm      of this.worldMods) wm.onComboEnd(turnSteps);
        for (const passive of passives) passive.onComboEnd(turnSteps);
    }

    private waitForPlannerInput(
        actor:          CombatScenePlayableCharacter,
        mods:           readonly ComboMod[],
        passives:       readonly SupportPassive[],
        forcedFirstDir: AttackDirection | null,
    ): Promise<void> {
        const simulatedHistory: ComboStep[] = [...this.comboHistory];
        const maxSteps = 1 + actor.energyManager.getCurrentEnergy();

        this.correctTargetIndex();
        this.sceneRenderer.setTargetSelection(this._targetIndex, this.enemies);

        EventBus.emit(Events.COMBAT_V2_PLANNER_START, { maxSteps });

        // Tracks available combo rating for special requirements during planning
        let simRatingPool = this.comboHistory.length > 0
            ? this.comboHistory[this.comboHistory.length - 1].comboStack.comboRating
            : 0;
        // Snapshot of simRatingPool before each planned step, for undo
        const ratingPoolHistory: number[] = [];

        // Auto-place the forced first direction immediately
        if (forcedFirstDir !== null) {
            ratingPoolHistory.push(simRatingPool);
            simRatingPool = this.addSimulatedStep(
                actor, mods, passives, actor.actionDeck.getAction(forcedFirstDir), simulatedHistory, simRatingPool,
            );
        }
        const lockedCount = forcedFirstDir !== null ? 1 : 0;

        return new Promise(resolve => {
            const onKeyDown = (event: KeyboardEvent) => {
                // Always block these keys from reaching DOM-focused elements (e.g. Back button).
                const consumed = ['Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                  'Delete', 'Escape', 'Backspace', 'w', 'a', 's', 'd',
                                  'W', 'A', 'S', 'D', '1', '2', '3', '4'];
                if (consumed.includes(event.key)) event.preventDefault();

                if (event.key === 'Enter') {
                    this.input.keyboard!.off('keydown', onKeyDown);
                    EventBus.emit(Events.COMBAT_V2_PLANNER_END);
                    resolve();
                    return;
                }

                if (event.key === 'ArrowLeft') {
                    this.cycleTarget(-1);
                    return;
                }
                if (event.key === 'ArrowRight') {
                    this.cycleTarget(1);
                    return;
                }

                if (event.key === 'Delete' || event.key === 'Escape' || event.key === 'Backspace') {
                    if (simulatedHistory.length > this.comboHistory.length + lockedCount) {
                        simulatedHistory.pop();
                        simRatingPool = ratingPoolHistory.pop() ?? simRatingPool;
                        EventBus.emit(Events.COMBAT_V2_PLANNER_UNDO, { comboRating: simRatingPool });
                    }
                    return;
                }

                // 1-4: special action
                const specialKey = parseInt(event.key) as 1 | 2 | 3 | 4;
                if (specialKey >= 1 && specialKey <= 4) {
                    const sp = actor.actionDeck.getSpecialByKey(specialKey);
                    if (!sp) return;
                    if (simulatedHistory.length - this.comboHistory.length >= maxSteps) return;
                    if (sp instanceof DancerCombatSpecialAction && simRatingPool < sp.ratingRequirement) return;
                    const ratingAfterConsume = Math.max(
                        0, simRatingPool - (sp instanceof DancerCombatSpecialAction ? sp.ratingRequirement : 0),
                    );
                    ratingPoolHistory.push(simRatingPool);
                    simRatingPool = this.addSimulatedStep(actor, mods, passives, sp, simulatedHistory, ratingAfterConsume);
                    return;
                }

                // WASD: direction action
                const dir = WASD_MAP[event.key.toUpperCase()];
                if (dir === undefined) return;
                if (simulatedHistory.length - this.comboHistory.length >= maxSteps) return;
                ratingPoolHistory.push(simRatingPool);
                simRatingPool = this.addSimulatedStep(
                    actor, mods, passives, actor.actionDeck.getAction(dir), simulatedHistory, simRatingPool,
                );
            };

            this.input.keyboard!.on('keydown', onKeyDown);
        });
    }

    // Returns the new comboRating after the step (so callers can track the pool).
    private addSimulatedStep(
        _actor:           CombatScenePlayableCharacter,
        mods:             readonly ComboMod[],
        passives:         readonly SupportPassive[],
        action:           CombatAction,
        simulatedHistory: ComboStep[],
        startingRating:   number,
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
        });

        return step.comboStack.comboRating;
    }

    private waitForNextTimedInput(
        durationMs:     number,
        lookupSpecial?: (key: 1 | 2 | 3 | 4) => CombatAction | null,
    ): Promise<TimedInputResult | null> {
        const { inputEarlyWindow, inputLateWindow } = CombatConfig;
        const maxWait   = durationMs + inputLateWindow;
        const startTime = this.time.now;

        EventBus.emit(Events.COMBAT_V2_RHYTHM_START, {
            durationMs,
            earlyWindowMs: inputEarlyWindow,
            lateWindowMs:  inputLateWindow,
        });

        return new Promise(resolve => {
            let settled = false;

            const settle = (value: TimedInputResult | null) => {
                if (settled) return;
                settled = true;
                this.input.keyboard!.off('keydown', onKeyDown);
                EventBus.emit(Events.COMBAT_V2_RHYTHM_END);
                resolve(value);
            };

            const onKeyDown = (event: KeyboardEvent) => {
                const numKey = parseInt(event.key);
                if (numKey >= 1 && numKey <= 4) {
                    event.preventDefault();
                    const sp = lookupSpecial?.(numKey as 1 | 2 | 3 | 4) ?? null;
                    if (sp) settle({ kind: 'special', action: sp });
                    return;
                }
                const dir = WASD_MAP[event.key.toUpperCase()];
                if (dir === undefined) return;
                event.preventDefault();
                const elapsed = this.time.now - startTime;
                const timed   = elapsed >= durationMs - inputEarlyWindow &&
                                elapsed <= durationMs + inputLateWindow;
                settle({ kind: 'dir', direction: dir, timed });
            };

            this.input.keyboard!.on('keydown', onKeyDown);
            this.time.delayedCall(maxWait, () => settle(null));
        });
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
