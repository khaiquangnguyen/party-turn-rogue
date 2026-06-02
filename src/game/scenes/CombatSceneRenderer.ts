import { Scene } from 'phaser';
import { CombatScenePlayableCharacter, CombatSceneEnemyCharacter } from '../entities/CombatSceneCharacter';
import { PLAYER_ANIM_FRAMES } from '../playerAnimFrames';
import { AttackDirection } from '../entities/CombatTypes';
import { isAirborne } from '../../data/AutoComboCalculator';
import {ComboStep} from "../../data/ComboMod/ComboStep.ts";

// ── Layout constants ──────────────────────────────────────────────────────────

export const SCENE_W      = 3840;
export const SCENE_H      = 2160;
export const GROUND_Y     = SCENE_H * 0.8;       // 1728
export const PLAYER_X     = SCENE_W * 0.25;      // 960
export const SPRITE_SCALE = 14;

export const FIGHT_PLAYER_X = SCENE_W * 0.42;    // 1613
export const FIGHT_ENEMY_X  = SCENE_W * 0.55;    // 2112

export const ENEMY_SLOTS: { x: number; y: number }[] = [
    { x: SCENE_W * 0.72, y: GROUND_Y },          // slot 1 — center right
    { x: SCENE_W * 0.82, y: GROUND_Y },          // slot 2 — far right
    { x: SCENE_W * 0.62, y: GROUND_Y },          // slot 3 — near right
];

const MOVE_DURATION      = 380;
const IDLE_RETURN_MS     = 200;
const HP_BAR_W           = 400;
const HP_BAR_H           = 28;
const HP_BAR_ABOVE       = 60;
const AIRBORNE_Y_OFFSET  = 350;

// ── Renderer ──────────────────────────────────────────────────────────────────

export class CombatSceneRenderer {
    private readonly scene: Scene;
    private enemyHpBars: Phaser.GameObjects.Graphics[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
    }

    // ── Setup ─────────────────────────────────────────────────────────────────

    setup(
        players: CombatScenePlayableCharacter[],
        enemies: CombatSceneEnemyCharacter[],
    ): void {
        this.scene.cameras.main.setBackgroundColor(0xd4c9a8);
        this.createAnimations();
        this.createPlayerVisual(players);
        this.createEnemyVisuals(enemies);
    }

    // ── Animations ────────────────────────────────────────────────────────────

    private createAnimations(): void {
        const enemyDefs = [
            { key: 'ds-idle-anim',       sheet: 'ds-idle',        rate: 8,  loop: true  },
            { key: 'ds-death-anim',      sheet: 'ds-death',       rate: 8,  loop: false },
            { key: 'ds-hurt-anim',       sheet: 'ds-hurt',        rate: 10, loop: false },
            { key: 'ds-jump-attack-anim', sheet: 'ds-jump-attack', rate: 10, loop: false },
            { key: 'ds-flame1-anim',     sheet: 'ds-flame1',      rate: 12, loop: false },
            { key: 'ds-flame2-anim',     sheet: 'ds-flame2',      rate: 12, loop: false },
            { key: 'ds-flame3-anim',     sheet: 'ds-flame3',      rate: 12, loop: false },
        ];
        for (const d of enemyDefs) {
            if (!this.scene.anims.exists(d.key)) {
                this.scene.anims.create({
                    key:       d.key,
                    frames:    this.scene.anims.generateFrameNumbers(d.sheet, { start: 0, end: -1 }),
                    frameRate: d.rate,
                    repeat:    d.loop ? -1 : 0,
                });
            }
        }

        const animOverrides: Record<string, { rate: number; loop: boolean }> = {
            idle:  { rate: 10, loop: true  },
            hit:   { rate: 12, loop: false },
            guard: { rate:  8, loop: false },
        };
        const animDefaults = { rate: 14, loop: false };
        for (const [animKey, frames] of Object.entries(PLAYER_ANIM_FRAMES)) {
            const key = `player-${animKey}-anim`;
            if (this.scene.anims.exists(key)) continue;
            const { rate, loop } = animOverrides[animKey] ?? animDefaults;
            this.scene.anims.create({
                key,
                frames:    frames.map((_, i) => ({ key: `player-${animKey}-${i}` })),
                frameRate: rate,
                repeat:    loop ? -1 : 0,
            });
        }
    }

    // ── Sprites ───────────────────────────────────────────────────────────────

    private createPlayerVisual(players: CombatScenePlayableCharacter[]): void {
        const player = players[0];
        if (!player) return;

        this.scene.add.ellipse(PLAYER_X, GROUND_Y, 220, 44, 0x000000, 0.10);

        const sprite = this.scene.add.sprite(PLAYER_X, GROUND_Y, 'player-idle-0')
            .setOrigin(0.5, 1)
            .setScale(SPRITE_SCALE);
        player.sprite = sprite;
        sprite.play('player-idle-anim');
    }

    private createEnemyVisuals(enemies: CombatSceneEnemyCharacter[]): void {
        this.enemyHpBars = [];

        enemies.forEach((enemy, i) => {
            const slot = ENEMY_SLOTS[i] ?? ENEMY_SLOTS[0];

            this.scene.add.ellipse(slot.x, slot.y, 220, 44, 0x000000, 0.10);

            const sprite = this.scene.add.sprite(slot.x, slot.y, 'ds-idle', 0)
                .setFlipX(true)
                .setScale(SPRITE_SCALE)
                .setOrigin(0.5, 1);
            enemy.sprite = sprite;
            sprite.play('ds-idle-anim');

            const bar = this.scene.add.graphics();
            this.enemyHpBars.push(bar);
            this.drawHpBar(bar, slot.x, enemy.healthManager.getCurrentHealth(), enemy.healthManager.getMaxHealth());
        });
    }

    // ── HP bars ───────────────────────────────────────────────────────────────

    updateEnemyHpBars(enemies: CombatSceneEnemyCharacter[]): void {
        enemies.forEach((enemy, i) => {
            const bar  = this.enemyHpBars[i];
            const slot = ENEMY_SLOTS[i] ?? ENEMY_SLOTS[0];
            if (bar) {
                this.drawHpBar(
                    bar,
                    slot.x,
                    enemy.healthManager.getCurrentHealth(),
                    enemy.healthManager.getMaxHealth(),
                );
            }
        });
    }

    private drawHpBar(
        graphics: Phaser.GameObjects.Graphics,
        centerX:  number,
        hp:       number,
        maxHp:    number,
    ): void {
        graphics.clear();

        const spriteTop = GROUND_Y - SPRITE_SCALE * 108;
        const by  = spriteTop - HP_BAR_ABOVE;
        const bx  = centerX - HP_BAR_W / 2;
        const pct = maxHp > 0 ? Math.max(0, hp / maxHp) : 0;

        graphics.fillStyle(0x374151, 0.9);
        graphics.fillRoundedRect(bx, by, HP_BAR_W, HP_BAR_H, 6);

        if (pct > 0) {
            const color = pct > 0.5 ? 0xef4444 : pct > 0.25 ? 0xf59e0b : 0x9ca3af;
            graphics.fillStyle(color, 1);
            graphics.fillRoundedRect(bx, by, HP_BAR_W * pct, HP_BAR_H, 6);
        }
    }

    // ── Character movement ────────────────────────────────────────────────────

    moveToCombatPositions(
        players: CombatScenePlayableCharacter[],
        enemies: CombatSceneEnemyCharacter[],
    ): void {
        const p = players[0];
        if (p?.sprite) {
            this.scene.tweens.add({
                targets:  p.sprite,
                x:        FIGHT_PLAYER_X,
                duration: MOVE_DURATION,
                ease:     'Power2',
            });
        }
        enemies.forEach((enemy, i) => {
            if (!enemy?.sprite) return;
            const fightX = FIGHT_ENEMY_X + i * 400;
            this.scene.tweens.add({
                targets:  enemy.sprite,
                x:        fightX,
                duration: MOVE_DURATION,
                ease:     'Power2',
            });
        });
    }

    moveToRestPositions(
        players: CombatScenePlayableCharacter[],
        enemies: CombatSceneEnemyCharacter[],
    ): void {
        const p = players[0];
        if (p?.sprite) {
            this.scene.tweens.add({
                targets:  p.sprite,
                x:        PLAYER_X,
                duration: MOVE_DURATION,
                ease:     'Power2',
            });
        }
        enemies.forEach((enemy, i) => {
            if (!enemy?.sprite) return;
            const slot = ENEMY_SLOTS[i] ?? ENEMY_SLOTS[0];
            this.scene.tweens.add({
                targets:  enemy.sprite,
                x:        slot.x,
                duration: MOVE_DURATION,
                ease:     'Power2',
            });
        });
    }

    // ── Airborne ──────────────────────────────────────────────────────────────

    updateEnemyAirbornePositions(enemies: CombatSceneEnemyCharacter[]): void {
        enemies.forEach((enemy, i) => {
            if (!enemy?.sprite) return;
            const slot    = ENEMY_SLOTS[i] ?? ENEMY_SLOTS[0];
            const targetY = enemy.isAirborne ? slot.y - AIRBORNE_Y_OFFSET : slot.y;
            this.scene.tweens.add({
                targets:  enemy.sprite,
                y:        targetY,
                duration: MOVE_DURATION,
                ease:     'Power2',
            });
        });
    }

    // ── Attack animations ─────────────────────────────────────────────────────

    playPlayerAttack(actor: CombatScenePlayableCharacter, animKey: string): void {
        actor.sprite?.play(animKey);
        actor.sprite?.once('animationcomplete', () => {
            this.scene.time.delayedCall(IDLE_RETURN_MS, () => {
                actor.sprite?.play('player-idle-anim');
            });
        });
    }

    playEnemyHit(target: CombatSceneEnemyCharacter): void {
        this.scene.cameras.main.shake(120, 0.004);
        target.sprite?.clearTint();
        target.sprite?.play(target.hitAnimKey);
        target.sprite?.once('animationcomplete', () => {
            this.scene.time.delayedCall(IDLE_RETURN_MS, () => {
                if (target.isAlive) target.sprite?.play(target.idleAnimKey);
                else                target.sprite?.play(target.deathAnimKey);
            });
        });
    }

    showStepEffects(step: ComboStep, target: CombatSceneEnemyCharacter): void {
        const tx = target.sprite?.x ?? 0;
        const ty = target.sprite?.y ?? 0;

        const airborne = isAirborne(step.activeEffects);
        if (airborne && step.action.input?.inputDirection === AttackDirection.UP) {
            this.showEffectText('AIR HIT ×1.5', tx, ty - (target.isAirborne ? AIRBORNE_Y_OFFSET : 0), '#ffe066');
        }

        if (airborne && step.action.input?.inputDirection === AttackDirection.DOWN) {
            this.showEffectText('GROUNDED!', tx, ty - AIRBORNE_Y_OFFSET, '#f97316');
        }

        for (const effect of step.newEffects) {
            this.showEffectText(effect.description.split('.')[0], tx, ty, '#88ddff');
        }
        for (const effect of step.lostEffects) {
            this.showEffectText(effect.description.split('.')[0] + ' ended', tx, ty, '#aaaaaa');
        }
    }

    // ── Effect text ───────────────────────────────────────────────────────────

    showEffectText(
        text:    string,
        targetX: number,
        targetY: number,
        color:   string = '#ffffff',
    ): void {
        const label = this.scene.add.text(targetX, targetY - 80, text, {
            fontSize:   '52px',
            fontFamily: 'Arial Black, sans-serif',
            color,
            stroke:        '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5, 1);

        this.scene.tweens.add({
            targets:  label,
            y:        targetY - 260,
            alpha:    0,
            duration: 1200,
            ease:     'Power2',
            onComplete: () => label.destroy(),
        });
    }
}
