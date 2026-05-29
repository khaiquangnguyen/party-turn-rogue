import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';
import { GameData } from '../GameData';
import { PlayableCharacter } from '../entities/PlayableCharacter';
import { DemonSoldier, AttackDirection, HitInfo } from '../entities/DemonSoldier';
import { DamageType } from '../entities/CharacterState';
import { PLAYER_ANIM_FRAMES } from './Preloader';
import {
    GAME_W as W, GAME_H as H,
    QTE_DURATION, QTE_PARRY_START,
} from '../combatConstants';

// ─── Layout (4K 3840×2160) ───────────────────────────────────────────────────
const MID      = W / 2;
const PLAYER_X = MID / 2;       // 960  — spawn / idle position
const ENEMY_X  = MID + MID / 2; // 2880 — spawn / idle position
const GROUND_Y = H * 0.8;
const CHAR_Y   = GROUND_Y - 300;

// Combat-ready positions (both chars approach middle at turn start)
const PLAYER_COMBAT_X = MID - 550;  // 1370
const ENEMY_COMBAT_X  = MID + 550;  // 2470

// Attack dash targets (each char lunges past centre)
const PLAYER_ATTACK_X = MID + 200;  // 2120 — player dashes toward enemy
const ATTACK_X        = MID - 200;  // 1720 — enemy rushes toward player

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
    blue:  '#1155bb',
    red:   '#bb1111',
    white: '#ffffff',
};

type TurnOwner  = 'player' | 'enemy';
type QTEOutcome = 'parry' | 'none';

const DIR_SYMBOL: Record<AttackDirection, string> = {
    [AttackDirection.UP]:    '↑',
    [AttackDirection.DOWN]:  '↓',
    [AttackDirection.LEFT]:  '←',
    [AttackDirection.RIGHT]: '→',
};
const DIR_KEY: Record<AttackDirection, string> = {
    [AttackDirection.UP]:    'W',
    [AttackDirection.DOWN]:  'S',
    [AttackDirection.LEFT]:  'A',
    [AttackDirection.RIGHT]: 'D',
};
const DIR_ANIM: Record<AttackDirection, string> = {
    [AttackDirection.UP]:    'ds-flame1-anim',
    [AttackDirection.DOWN]:  'ds-flame2-anim',
    [AttackDirection.LEFT]:  'ds-flame3-anim',
    [AttackDirection.RIGHT]: 'ds-flame3-anim',
};

// Non-action player animation keys used by the scene directly
const PA = {
    idle:         'player-idle-anim',
    standingSlash:'player-standingSlash-anim', // used for counter-attack
    hit:          'player-hit-anim',
    guard:        'player-guard-anim',
} as const;

export interface CombatState {
    playerName:    string;
    playerSpeed:   number;
    playerHP:      number;
    playerMaxHP:   number;
    playerEN:      number;
    playerMaxEN:   number;
    enemyName:     string;
    enemyType:     string;
    enemyLevel:    number;
    enemySpeed:    number;
    enemyHP:       number;
    enemyMaxHP:    number;
    currentTurn:   'player' | 'enemy';
    buttonsEnabled: boolean;
    combatLog:     string;
    combatResult?: 'victory' | 'defeat';
}

// ─────────────────────────────────────────────────────────────────────────────

export class CombatScene extends Scene {
    private player!: PlayableCharacter;
    private enemy!:  DemonSoldier;

    private playerContainer!: GameObjects.Container;
    private playerSprite!:    GameObjects.Sprite;
    private enemySprite!:     GameObjects.Sprite;

    // QTE state (no Phaser visuals — React renders the circle)
    private qteActive    = false;
    private qteResolved  = false;
    private qteStartTime = 0;
    private qteDirection: AttackDirection | null = null;

    // Multi-hit sequence
    private pendingHits:   HitInfo[] = [];
    private pendingHitIdx  = 0;
    private pendingMsg     = '';

    // Parry tracking
    private comboParriedCount = 0;
    private comboTotalHits    = 0;

    // Turn
    private currentTurn:      TurnOwner = 'player';
    private isAnimating       = false;
    private combatApproached  = false;

    // React bridge
    private combatLogText = '';

    constructor() { super('CombatScene'); }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    create(): void {
        const selected = GameData.getSelectedCharacter();
        this.player = selected ?? new PlayableCharacter();
        this.enemy = new DemonSoldier();

        this.createBackground();
        this.createEnemyAnimations();
        this.createPlayerAnimations();
        this.createPlayerVisual();
        this.createEnemyVisual();
        this.setupKeyboard();

        const onComboHit  = ({ actionName }: { actionName: string }) => this.onComboActionHit(actionName);
        const onComboDone = () => this.onComboDone();
        EventBus.on('player-combo-action-hit', onComboHit);
        EventBus.on('player-combo-done',       onComboDone);
        this.events.once('shutdown', () => {
            EventBus.off('player-combo-action-hit', onComboHit);
            EventBus.off('player-combo-done',       onComboDone);
        });

        this.determineTurnOrder();
        EventBus.emit('current-scene-ready', this);
    }

    // ─── Background ──────────────────────────────────────────────────────────

    private createBackground(): void {
        const lbl = { fontSize: '52px', fontFamily: 'Arial', letterSpacing: 8 };
        this.add.text(MID / 2,       70, 'PLAYER', { ...lbl, color: C.blue }).setOrigin(0.5, 0);
        this.add.text(MID + MID / 2, 70, 'ENEMY',  { ...lbl, color: C.red  }).setOrigin(0.5, 0);
    }

    // ─── Animations ──────────────────────────────────────────────────────────

    private createEnemyAnimations(): void {
        const defs = [
            { key: 'ds-idle-anim',   sheet: 'ds-idle',   rate: 8,  loop: true  },
            { key: 'ds-death-anim',  sheet: 'ds-death',  rate: 8,  loop: false },
            { key: 'ds-hurt-anim',   sheet: 'ds-hurt',   rate: 10, loop: false },
            { key: 'ds-flame1-anim', sheet: 'ds-flame1', rate: 12, loop: false },
            { key: 'ds-flame2-anim', sheet: 'ds-flame2', rate: 12, loop: false },
            { key: 'ds-flame3-anim', sheet: 'ds-flame3', rate: 12, loop: false },
        ];
        for (const d of defs) {
            if (!this.anims.exists(d.key)) {
                this.anims.create({
                    key: d.key,
                    frames: this.anims.generateFrameNumbers(d.sheet, { start: 0, end: -1 }),
                    frameRate: d.rate,
                    repeat: d.loop ? -1 : 0,
                });
            }
        }
    }

    private createPlayerAnimations(): void {
        const overrides: Record<string, { rate: number; loop: boolean }> = {
            idle:  { rate: 10, loop: true  },
            hit:   { rate: 12, loop: false },
            guard: { rate:  8, loop: false },
        };
        const defaults = { rate: 14, loop: false };

        for (const [animKey, frames] of Object.entries(PLAYER_ANIM_FRAMES)) {
            const key = `player-${animKey}-anim`;
            if (this.anims.exists(key)) continue;
            const { rate, loop } = overrides[animKey] ?? defaults;
            this.anims.create({
                key,
                frames: frames.map((_, i) => ({ key: `player-${animKey}-${i}` })),
                frameRate: rate,
                repeat: loop ? -1 : 0,
            });
        }
    }

    // ─── Visuals ─────────────────────────────────────────────────────────────

    private createPlayerVisual(): void {
        const scale = 14;

        this.add.ellipse(PLAYER_X, GROUND_Y, 200, 40, 0x000000, 0.10);

        this.playerSprite = this.add.sprite(0, 0, 'player-idle-0')
            .setOrigin(0.5, 1)
            .setScale(scale);

        // Container anchored at feet — move this for attack tweens
        this.playerContainer = this.add.container(PLAYER_X, GROUND_Y, [this.playerSprite]);
        this.playerSprite.play(PA.idle);
    }

    private createEnemyVisual(): void {
        this.add.ellipse(ENEMY_X, GROUND_Y, 220, 44, 0x000000, 0.10);
        this.enemySprite = this.add.sprite(ENEMY_X, GROUND_Y, 'ds-idle')
            .setFlipX(true).setScale(14).setOrigin(0.5, 1);
        this.enemySprite.play('ds-idle-anim');
    }

    // ─── Keyboard ────────────────────────────────────────────────────────────

    private setupKeyboard(): void {
        this.input.keyboard!.on('keydown-W', () => this.onQTEKey('w'));
        this.input.keyboard!.on('keydown-A', () => this.onQTEKey('a'));
        this.input.keyboard!.on('keydown-S', () => this.onQTEKey('s'));
        this.input.keyboard!.on('keydown-D', () => this.onQTEKey('d'));
    }

    private onQTEKey(key: 'w' | 'a' | 's' | 'd'): void {
        if (!this.qteActive || this.qteResolved) return;
        const inWindow = (this.time.now - this.qteStartTime) >= QTE_PARRY_START;
        if (!inWindow) return;
        const map: Record<string, AttackDirection> = { w: AttackDirection.UP, s: AttackDirection.DOWN, a: AttackDirection.LEFT, d: AttackDirection.RIGHT };
        if (map[key] === this.qteDirection) this.resolveQTE('parry');
    }

    // ─── QTE core — visuals are now in React ─────────────────────────────────

    private startHit(hit: HitInfo, hitIdx: number, totalHits: number): void {
        this.enemySprite.play(DIR_ANIM[hit.direction]);
        this.enemySprite.once('animationcomplete', () => this.enemySprite.play('ds-idle-anim'));

        this.qteActive    = true;
        this.qteResolved  = false;
        this.qteDirection = hit.direction;
        this.qteStartTime = this.time.now;

        this.time.delayedCall(QTE_DURATION, () => {
            if (!this.qteResolved) this.resolveQTE('none');
        });

        EventBus.emit('combat-qte-start', {
            normX:     this.enemySprite.x / W,
            direction: hit.direction,
            hitIndex:  hitIdx,
            totalHits,
        });
    }

    private resolveQTE(outcome: QTEOutcome): void {
        if (this.qteResolved) return;
        this.qteResolved = true;
        this.qteActive   = false;

        EventBus.emit('combat-qte-end');

        if (outcome === 'none') {
            this.comboParriedCount = 0;
        } else {
            this.cameras.main.shake(100, 0.008);
            this.comboParriedCount++;
            if (this.comboParriedCount >= this.player.interruptThreshold) {
                this.applyHit(this.pendingHits[this.pendingHitIdx], outcome, this.pendingHitIdx, this.pendingHits.length);
                this.interruptEnemyTurn();
                return;
            }
        }

        const hit   = this.pendingHits[this.pendingHitIdx];
        const alive = this.applyHit(hit, outcome, this.pendingHitIdx, this.pendingHits.length);
        if (!alive) return;

        this.pendingHitIdx++;
        if (this.pendingHitIdx < this.pendingHits.length) {
            this.time.delayedCall(200, () => this.startNextHit());
        } else {
            this.endEnemyTurn();
        }
    }

    private startNextHit(): void {
        const hit = this.pendingHits[this.pendingHitIdx];
        this.startHit(hit, this.pendingHitIdx, this.pendingHits.length);
        this.emitCombatState(`Hit ${this.pendingHitIdx + 1} / ${this.pendingHits.length} — ${DIR_SYMBOL[hit.direction]}  ${DIR_KEY[hit.direction]}`);
    }

    private applyHit(hit: HitInfo, outcome: QTEOutcome, idx: number, total: number): boolean {
        const popY = CHAR_Y - 380;

        if (outcome === 'parry') {
            this.spawnFloatingText(PLAYER_X, popY, 'PARRY!', '#ffcc00', '140px');
            this.flashSprite(this.playerSprite, 0xffcc00);
            this.cameras.main.shake(120, 0.008);
            this.emitCombatState(`PARRY! Hit ${idx + 1}/${total}`);
            return true;
        }

        const result = this.player.damage(hit.damage, DamageType.TRUE);
        this.emitCombatState(`${this.pendingMsg} — Hit ${idx + 1}/${total} — ${result.finalDamage} dmg`);

        this.playerSprite.play(PA.hit);
        this.playerSprite.once('animationcomplete', () => {
            if (this.player.isAlive()) this.playerSprite.play(PA.idle);
        });

        this.flashSprite(this.playerSprite, 0xff4444);
        this.spawnDamageNumber(PLAYER_X + (idx % 2 === 0 ? -80 : 80), CHAR_Y - 300 - idx * 50, result.finalDamage);

        if (result.finalDamage > 0) this.cameras.main.shake(80, 0.005);

        if (this.player.isDead()) { this.time.delayedCall(400, () => this.onPlayerDied()); return false; }
        return true;
    }

    // ─── Turn system ─────────────────────────────────────────────────────────

    private determineTurnOrder(): void {
        const ps = this.player.getStats().speed;
        const es = this.enemy.getStats().speed;
        this.currentTurn = ps >= es ? 'player' : 'enemy';
        const first = this.currentTurn === 'player' ? this.player.getName() : this.enemy.getName();
        const spd   = this.currentTurn === 'player' ? ps : es;
        if (this.currentTurn === 'enemy') this.isAnimating = true;
        this.emitCombatState(`Combat starts!  ${first} goes first  (SPD ${spd}).`);
        if (this.currentTurn === 'enemy') this.time.delayedCall(600, () => this.executeEnemyTurn());
    }

    private endPlayerTurn(): void {
        this.currentTurn      = 'enemy';
        this.combatApproached = false;
        this.isAnimating      = true;
        this.emitCombatState("Enemy's turn...");
        this.tweens.add({ targets: this.playerContainer, x: PLAYER_X, duration: 500, ease: 'Quad.easeOut' });
        this.tweens.add({
            targets: this.enemySprite,
            x: ENEMY_X, duration: 500, ease: 'Quad.easeOut',
            onComplete: () => this.time.delayedCall(400, () => this.executeEnemyTurn()),
        });
    }

    private endEnemyTurn(): void {
        if (this.comboParriedCount === this.comboTotalHits && this.comboTotalHits > 0) {
            this.time.delayedCall(200, () => this.triggerCounterAttack());
            return;
        }
        this.tweens.add({ targets: this.enemySprite, x: ENEMY_X, duration: 500, ease: 'Quad.easeOut' });
        this.tweens.add({
            targets: this.playerContainer,
            x: PLAYER_X, duration: 500, ease: 'Quad.easeOut',
            onComplete: () => {
                this.currentTurn      = 'player';
                this.isAnimating      = false;
                this.combatApproached = false;
                this.emitCombatState('Your turn!  Choose an action.');
            },
        });
    }

    // ─── Combo action hit (from React timing overlay) ────────────────────────

    private onComboActionHit(actionName: string): void {
        if (this.currentTurn !== 'player') return;
        const action = this.player.getAction(actionName);
        if (!action) return;

        const phaserAnimKey = `player-${action.animation}-anim`;

        const doAttack = () => {
            this.tweens.add({
                targets: this.playerContainer,
                x: PLAYER_ATTACK_X, duration: 140, ease: 'Quad.easeIn',
                onComplete: () => {
                    this.player.getEnergyManager().consume(action.energyCost);
                    const result = this.enemy.damage(action.damage, DamageType.TRUE);

                    this.playerSprite.play(phaserAnimKey);
                    this.playerSprite.once('animationcomplete', () => {
                        if (this.player.isAlive()) this.playerSprite.play(PA.idle);
                    });

                    this.flashSprite(this.enemySprite, 0xff4444);
                    this.shakeSprite(this.enemySprite);
                    this.spawnDamageNumber(ENEMY_COMBAT_X, CHAR_Y - 300, result.finalDamage);
                    this.cameras.main.shake(120, 0.008);

                    this.emitCombatState(`${actionName}! ${result.finalDamage} dmg.`);

                    if (this.enemy.isDead()) {
                        this.time.delayedCall(300, () => this.onEnemyDied());
                    }

                    this.tweens.add({
                        targets: this.playerContainer,
                        x: PLAYER_COMBAT_X, duration: 200, ease: 'Quad.easeOut',
                    });
                },
            });
        };

        if (!this.combatApproached) {
            this.combatApproached = true;
            this.tweens.add({ targets: this.enemySprite, x: ENEMY_COMBAT_X, duration: 400, ease: 'Quad.easeOut' });
            this.tweens.add({
                targets: this.playerContainer,
                x: PLAYER_COMBAT_X, duration: 400, ease: 'Quad.easeOut',
                onComplete: doAttack,
            });
        } else {
            doAttack();
        }
    }

    // ─── Combo done (React signals all bars finished) ────────────────────────

    private onComboDone(): void {
        if (this.currentTurn !== 'player') return;
        this.endPlayerTurn();
    }

    // ─── Enemy turn ──────────────────────────────────────────────────────────

    private executeEnemyTurn(): void {
        if (!this.enemy.isAlive()) return;
        this.isAnimating = true;

        const action = this.enemy.chooseAction();
        const result = action.execute();

        this.pendingHits       = result.hits;
        this.pendingHitIdx     = 0;
        this.pendingMsg        = result.message;
        this.comboParriedCount = 0;
        this.comboTotalHits    = result.hits.length;

        this.spawnFloatingText(MID, CHAR_Y - 200, 'ENEMY TURN', '#ff5544', '160px');
        this.emitCombatState(`${this.enemy.getName()} is preparing to attack...`);

        this.time.delayedCall(1000, () => {
            this.emitCombatState(`${this.enemy.getName()} uses ${action.name}!`);
            this.tweens.add({ targets: this.playerContainer, x: PLAYER_COMBAT_X, duration: 500, ease: 'Quad.easeOut' });
            this.tweens.add({
                targets: this.enemySprite,
                x: ENEMY_COMBAT_X, duration: 500, ease: 'Quad.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: this.enemySprite,
                        x: ATTACK_X, duration: 300, ease: 'Quad.easeIn',
                        onComplete: () => {
                            const firstHit = result.hits[0];
                            this.startHit(firstHit, 0, result.hits.length);
                            this.emitCombatState(`Hit 1 / ${result.hits.length} — ${DIR_SYMBOL[firstHit.direction]}  ${DIR_KEY[firstHit.direction]}`);
                        },
                    });
                },
            });
        });
    }

    // ─── Interrupt (threshold parries mid-combo) ──────────────────────────────

    private interruptEnemyTurn(): void {
        this.pendingHits = [];
        this.spawnFloatingText(MID, CHAR_Y - 400, 'INTERRUPTED!', '#ffcc00', '150px');
        this.emitCombatState('Combo interrupted!');
        this.time.delayedCall(200, () => this.triggerCounterAttack());
    }

    // ─── Full-parry counter ───────────────────────────────────────────────────

    private triggerCounterAttack(): void {
        this.emitCombatState('PERFECT PARRY!  Launching counter!');
        this.spawnFloatingText(PLAYER_X, CHAR_Y - 620, 'FULL PARRY! COUNTER!', '#ffcc00', '130px');

        this.playerSprite.play(PA.standingSlash);

        this.tweens.add({
            targets: this.playerContainer,
            x: PLAYER_ATTACK_X, duration: 200, ease: 'Quad.easeIn',
            onComplete: () => {
                const dmg = 30;
                this.enemy.damage(dmg, DamageType.TRUE);
                this.emitCombatState(`Counter strike! ${dmg} true damage!`);
                this.cameras.main.shake(140, 0.012);
                this.shakeSprite(this.enemySprite);
                this.enemySprite.setTintFill(0xff4444);
                this.time.delayedCall(150, () => this.enemySprite.clearTint());
                this.spawnDamageNumber(this.enemySprite.x, CHAR_Y - 300, dmg);

                const enemyDied = this.enemy.isDead();
                this.tweens.add({ targets: this.enemySprite, x: ENEMY_X, duration: 450, ease: 'Quad.easeOut' });
                this.tweens.add({
                    targets: this.playerContainer,
                    x: PLAYER_X, duration: 450, ease: 'Quad.easeOut',
                    onComplete: () => {
                        this.playerSprite.play(PA.idle);
                        this.combatApproached = false;
                        if (enemyDied) { this.onEnemyDied(); return; }
                        this.currentTurn = 'player';
                        this.isAnimating  = false;
                        this.emitCombatState('Your turn!  Choose an action.');
                    },
                });
            },
        });
    }

    // ─── End states ──────────────────────────────────────────────────────────

    private onEnemyDied(): void {
        this.enemySprite.play('ds-death-anim');
        this.emitCombatState(`${this.enemy.getName()} has been defeated!`, 'victory');
        this.tweens.add({ targets: this.playerContainer, x: PLAYER_X, duration: 700, ease: 'Quad.easeOut' });
        this.time.delayedCall(2500, () => EventBus.emit('combat-ended', { result: 'victory' }));
    }

    private onPlayerDied(): void {
        this.tweens.add({
            targets: this.playerContainer,
            alpha: 0, y: GROUND_Y + 80, duration: 700,
        });
        this.tweens.add({ targets: this.enemySprite, x: ENEMY_X, duration: 700, ease: 'Quad.easeOut' });
        this.emitCombatState(`${this.player.getName()} has fallen!`, 'defeat');
        this.time.delayedCall(2500, () => EventBus.emit('combat-ended', { result: 'defeat' }));
    }



    // ─── React bridge ────────────────────────────────────────────────────────

    private emitCombatState(log?: string, combatResult?: 'victory' | 'defeat'): void {
        if (log !== undefined) this.combatLogText = log;

        const ph = this.player.getHealthManager();
        const pe = this.player.getEnergyManager();
        const eh = this.enemy.getHealthManager();

        const state: CombatState = {
            playerName:     this.player.getName(),
            playerSpeed:    this.player.getStats().speed,
            playerHP:       ph.getCurrentHealth(),
            playerMaxHP:    ph.getMaxHealth(),
            playerEN:       pe.getCurrentEnergy(),
            playerMaxEN:    pe.getMaxEnergy(),
            enemyName:      this.enemy.getName(),
            enemyType:      this.enemy.getEnemyType(),
            enemyLevel:     this.enemy.getLevel(),
            enemySpeed:     this.enemy.getStats().speed,
            enemyHP:        eh.getCurrentHealth(),
            enemyMaxHP:     eh.getMaxHealth(),
            currentTurn:    this.currentTurn,
            buttonsEnabled: !combatResult && this.currentTurn === 'player' && !this.isAnimating,
            combatLog:      this.combatLogText,
            combatResult,
        };

        EventBus.emit('combat-update', state);
    }

    // ─── FX ──────────────────────────────────────────────────────────────────

    private flashSprite(sprite: GameObjects.Sprite, color: number): void {
        sprite.setTintFill(color);
        this.time.delayedCall(200, () => sprite.clearTint());
    }

    private shakeSprite(sprite: GameObjects.Sprite): void {
        const ox = sprite.x;
        this.tweens.add({ targets: sprite, x: ox + 40, duration: 55, yoyo: true, repeat: 3, onComplete: () => { sprite.x = ox; } });
    }

    private spawnDamageNumber(x: number, y: number, damage: number): void {
        const txt = this.add.text(x, y, `-${damage}`, {
            fontSize: '90px', fontFamily: 'Arial', fontStyle: 'bold',
            color: '#cc1111', stroke: C.white, strokeThickness: 10,
        }).setOrigin(0.5).setDepth(10);
        this.tweens.add({ targets: txt, y: y - 220, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => txt.destroy() });
    }

    private spawnFloatingText(x: number, y: number, text: string, color: string, size = '120px'): void {
        const txt = this.add.text(x, y, text, {
            fontSize: size, fontFamily: 'Arial', fontStyle: 'bold',
            color, stroke: C.white, strokeThickness: 12,
        }).setOrigin(0.5).setDepth(25);
        this.tweens.add({ targets: txt, y: y - 260, alpha: 0, duration: 1100, ease: 'Quad.easeOut', onComplete: () => txt.destroy() });
    }
}
