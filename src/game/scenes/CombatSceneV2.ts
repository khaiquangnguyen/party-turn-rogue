import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import {
    CombatSceneCharacter,
    CombatSceneEnemyCharacter,
    CombatScenePlayableCharacter,
} from '../entities/CombatSceneCharacter';
import { CombatRoundTurnOrderManager } from '../CombatRoundTurnOrderManager';
import { QTEEventType, AttackDirection } from '../entities/CombatTypes';
import { ComboStackSystem } from '../../data/ComboStackSystem';
import { DamageType } from '../entities/CharacterState';
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

// ── Input map ─────────────────────────────────────────────────────────────────

const WASD_MAP: Record<string, AttackDirection> = {
    W: AttackDirection.UP,
    A: AttackDirection.LEFT,
    S: AttackDirection.DOWN,
    D: AttackDirection.RIGHT,
};

const ENERGY_PER_TURN  = 3;
const MOVE_SETTLE_MS   = 420;
const IDLE_RETURN_MS   = 200;

// ── Init data ─────────────────────────────────────────────────────────────────

export interface CombatSceneV2InitData {
    players: CombatScenePlayableCharacter[];
    enemies: CombatSceneEnemyCharacter[];
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export class CombatSceneV2 extends Scene {
    readonly players: CombatScenePlayableCharacter[] = [];
    readonly enemies: CombatSceneEnemyCharacter[]   = [];

    private turnManager!:   CombatRoundTurnOrderManager;
    private sceneRenderer!: CombatSceneRenderer;
    private worldMods:      readonly WorldMod[]  = [];
    private comboRules:     readonly ComboRule[]  = [];
    private comboHistory:   ComboStep[]           = [];

    // Last direction the enemy attacked with — used by ForceFollowLastEnemyInput.
    // Null means no enemy has acted yet (or enemy just died): free input allowed.
    private lastEnemyInputDir: AttackDirection | null = null;

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

    create(): void {
        this.worldMods     = GameData.getRunPrep()?.worldModifiers ?? [];
        this.comboRules    = DEFAULT_COMBO_RULES;
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

    // ── Player turn ───────────────────────────────────────────────────────────

    private async handlePlayerTurn(actor: CombatScenePlayableCharacter): Promise<void> {
        const target = this.enemies.find(e => e.isAlive) ?? null;
        if (!target) return;

        const mods      = actor.comboModDeck.getCards();
        const forcedDir: AttackDirection | null =
            CombatFeatureFlags.ForceFollowLastEnemyInput ? this.lastEnemyInputDir : null;

        await this.waitForPlannerInput(actor, mods, forcedDir);

        if (CombatFeatureFlags.ShowPlayerInputPrompt) {
            EventBus.emit(Events.COMBAT_V2_PLAYER_INPUT_PROMPT, { forcedDir });
        }

        const startDir = await this.waitForFirstInput(forcedDir);
        let nextDir    = startDir;

        const turnStartIndex = this.comboHistory.length;

        if (turnStartIndex === 0) {
            for (const mod of mods) mod.onComboStart(this.comboHistory);
            for (const wm of this.worldMods) wm.onComboStart(this.comboHistory);
        }

        EventBus.emit(Events.COMBAT_V2_PLAYER_ATTACK_START, { actor, target });

        this.sceneRenderer.moveToCombatPositions(this.players, this.enemies);
        await this.delay(MOVE_SETTLE_MS);

        let isFirstAction = true;

        while (target.isAlive) {
            if (actor.energyManager.getCurrentEnergy() <= 0) break;
            if (!isFirstAction) actor.energyManager.consume(1);
            isFirstAction = false;

            const action = actor.actionDeck.getAction(nextDir);
            const prev   = this.comboHistory[this.comboHistory.length - 1] ?? null;

            const step: ComboStep = {
                action,
                comboStack:                new ComboStackSystem(prev?.comboStack.comboRating ?? 0),
                availableWorldMods:        this.worldMods,
                availableComboMods: mods,
                availableComboRules:       this.comboRules,
                applicableWorldMods:       [],
                applicableComboMods:            [],
                applicableComboRules:      [],
                activeEffects:             prev ? new Map(prev.activeEffects) : new Map(),
                newEffects:                [],
                lostEffects:               [],
                finalDamage:               0,
            };

            calculateStepDamage(step, this.comboHistory);

            this.sceneRenderer.playPlayerAttack(actor, `player-${action.animation}-anim`);

            const actualDamage = target.damage(step.finalDamage, DamageType.PHYSICAL);
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
                chainMult:    1,
                actualDamage,
                comboRating:  step.comboStack.comboRating,
                atkMultiplier: step.comboStack.finalMultiplier,
            });

            this.comboHistory.push(step);

            await this.delay(500);

            if (actor.energyManager.getCurrentEnergy() <= 0) break;

            const waitMs = action.input?.waitTillNextInputDuration ?? 0;
            const next   = await this.waitForNextTimedInput(waitMs);
            if (!next) break;

            nextDir = next.direction;
        }

        const turnSteps = this.comboHistory.slice(turnStartIndex);
        for (const mod of mods) mod.onComboEnd(turnSteps);
        for (const wm of this.worldMods) wm.onComboEnd(turnSteps);
    }

    private waitForPlannerInput(
        actor:         CombatScenePlayableCharacter,
        mods:          readonly ComboMod[],
        forcedFirstDir: AttackDirection | null,
    ): Promise<void> {
        const simulatedHistory: ComboStep[] = [...this.comboHistory];
        const maxSteps  = 1 + actor.energyManager.getCurrentEnergy();

        EventBus.emit(Events.COMBAT_V2_PLANNER_START, { maxSteps });

        // Auto-place the forced first direction immediately
        if (forcedFirstDir !== null) {
            this.addSimulatedStep(actor, mods, forcedFirstDir, simulatedHistory);
        }
        const lockedCount = forcedFirstDir !== null ? 1 : 0;

        return new Promise(resolve => {
            const onKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Enter') {
                    this.input.keyboard!.off('keydown', onKeyDown);
                    EventBus.emit(Events.COMBAT_V2_PLANNER_END);
                    resolve();
                    return;
                }

                if (event.key === 'Delete' || event.key === 'Escape' || event.key === 'Backspace') {
                    if (simulatedHistory.length > this.comboHistory.length + lockedCount) {
                        simulatedHistory.pop();
                        EventBus.emit(Events.COMBAT_V2_PLANNER_UNDO);
                    }
                    return;
                }

                const dir = WASD_MAP[event.key.toUpperCase()];
                if (dir === undefined) return;
                if (simulatedHistory.length - this.comboHistory.length >= maxSteps) return;

                this.addSimulatedStep(actor, mods, dir, simulatedHistory);
            };

            this.input.keyboard!.on('keydown', onKeyDown);
        });
    }

    private addSimulatedStep(
        actor:             CombatScenePlayableCharacter,
        mods:              readonly ComboMod[],
        dir:               AttackDirection,
        simulatedHistory:  ComboStep[],
    ): void {
        const prev   = simulatedHistory[simulatedHistory.length - 1] ?? null;
        const action = actor.actionDeck.getAction(dir);
        const step: ComboStep = {
            action,
            comboStack:          new ComboStackSystem(prev?.comboStack.comboRating ?? 0),
            availableWorldMods:  this.worldMods,
            availableComboMods:  mods,
            availableComboRules: this.comboRules,
            applicableWorldMods:  [],
            applicableComboMods:  [],
            applicableComboRules: [],
            activeEffects: prev ? new Map(prev.activeEffects) : new Map(),
            newEffects:    [],
            lostEffects:   [],
            finalDamage:   0,
        };

        calculateStepDamage(step, simulatedHistory);
        simulatedHistory.push(step);

        EventBus.emit(Events.COMBAT_V2_PLANNER_ACTION, {
            action,
            simulatedDamage: step.finalDamage,
            comboRating:     step.comboStack.comboRating,
            atkMultiplier:   step.comboStack.finalMultiplier,
        });
    }

    private waitForFirstInput(forcedDir: AttackDirection | null): Promise<AttackDirection> {
        return new Promise(resolve => {
            const onKeyDown = (event: KeyboardEvent) => {
                const dir = WASD_MAP[event.key.toUpperCase()];
                if (dir === undefined) return;
                if (forcedDir !== null && dir !== forcedDir) return;
                this.input.keyboard!.off('keydown', onKeyDown);
                resolve(dir);
            };
            this.input.keyboard!.on('keydown', onKeyDown);
        });
    }

    private waitForNextTimedInput(
        durationMs: number,
    ): Promise<{ direction: AttackDirection; timed: boolean } | null> {
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

            const settle = (value: { direction: AttackDirection; timed: boolean } | null) => {
                if (settled) return;
                settled = true;
                this.input.keyboard!.off('keydown', onKeyDown);
                EventBus.emit(Events.COMBAT_V2_RHYTHM_END);
                resolve(value);
            };

            const onKeyDown = (event: KeyboardEvent) => {
                const dir = WASD_MAP[event.key.toUpperCase()];
                if (dir === undefined) return;
                const elapsed = this.time.now - startTime;
                const timed   = elapsed >= durationMs - inputEarlyWindow &&
                                elapsed <= durationMs + inputLateWindow;
                settle({ direction: dir, timed });
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

        EventBus.emit(Events.COMBAT_V2_ENEMY_ATTACK_START, { actor, target, chain });

        // Move to fight position
        this.sceneRenderer.moveToCombatPositions(this.players, this.enemies);
        await this.delay(MOVE_SETTLE_MS);

        let continuousParryCount = 0;
        let counterAttacked      = false;

        for (const action of chain) {
            if (!target?.isAlive || !this.players.some(p => p.isAlive)) return;

            EventBus.emit(Events.COMBAT_V2_ENEMY_MOVE_START, { actor, target, action });
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
                    target.damage(action.damage, DamageType.TRUE);
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

        const dealt = counterTarget.damage(30, DamageType.TRUE);
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
