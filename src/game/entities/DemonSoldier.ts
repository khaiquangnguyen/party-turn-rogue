import { EnemyCharacter, EnemyType } from './EnemyCharacter';
import { AttackDirection, HitInfo, ActionResult, CombatAction, CombatActionInput, EnemyCombatAction } from './CombatTypes';
import { DamageType } from './CharacterState';

export { AttackDirection };
export type { HitInfo, ActionResult, CombatAction };

// V1 helper — builds a list of hits for the legacy QTE combat scene.
function makeHits(count: number, damage: number, dir?: AttackDirection): HitInfo[] {
    const dirs = [AttackDirection.UP, AttackDirection.DOWN, AttackDirection.LEFT, AttackDirection.RIGHT];
    return Array.from({ length: count }, () => ({
        damage,
        direction:  dir ?? dirs[Math.floor(Math.random() * dirs.length)],
        damageType: DamageType.PHYSICAL,
    }));
}

export class DemonSoldier extends EnemyCharacter {
    readonly idleAnimKey   = 'ds-idle-anim';
    readonly hitAnimKey    = 'ds-hurt-anim';
    readonly deathAnimKey  = 'ds-death-anim';
    readonly defendAnimKey = 'ds-defend-anim';

    readonly actions: CombatAction[];

    constructor() {
        super({
            name:             'Demon Soldier',
            enemyType:        EnemyType.ELITE,
            maxHealth:        50,
            maxEnergy:        80,
            defense:          12,
            speed:            8,
            level:            1,
            experienceReward: 50,
            goldReward:       25,
        });
        this.actions = this.buildActions();
    }

    private buildActions(): CombatAction[] {
        return [
            new CombatAction({
                name:      'Strike',
                animation: 'ds-attack1',
                damage:    10,
                input:     new CombatActionInput(1200, AttackDirection.RIGHT),
            }),
            new CombatAction({
                name:      'Heavy Blow',
                animation: 'ds-attack2',
                damage:    14,
                input:     new CombatActionInput(1400, AttackDirection.DOWN),
            }),
            new CombatAction({
                name:      'Quick Slash',
                animation: 'ds-attack3',
                damage:    8,
                input:     new CombatActionInput(900, AttackDirection.UP),
            }),
            new CombatAction({
                name:      'Side Swipe',
                animation: 'ds-attack4',
                damage:    12,
                input:     new CombatActionInput(1100, AttackDirection.LEFT),
            }),
        ];
    }

    // V1: builds a result for the legacy QTE scene from a chosen action.
    buildActionResult(action: CombatAction): ActionResult {
        switch (action.name) {
            case 'Strike':
                return {
                    type:    'attack',
                    hits:    makeHits(Math.floor(Math.random() * 3) + 3, action.damage),
                    message: 'Demon Soldier launches a flurry of strikes!',
                };
            case 'Heavy Blow':
                return {
                    type:    'attack',
                    hits:    makeHits(Math.floor(Math.random() * 3) + 3, action.damage),
                    message: 'Demon Soldier delivers heavy blows!',
                };
            case 'Quick Slash':
                return {
                    type:    'attack',
                    hits:    makeHits(3, action.damage),
                    message: 'Demon Soldier slashes quickly!',
                };
            default:
                return {
                    type:    'attack',
                    hits:    makeHits(Math.floor(Math.random() * 2) + 3, action.damage, AttackDirection.DOWN),
                    message: 'Demon Soldier rains blows from above!',
                };
        }
    }

    // V1: returns a single action for the legacy QTE scene.
    chooseAction(): CombatAction {
        const r = Math.random();
        if (r < 0.35) return this.actions[0]; // Strike
        if (r < 0.60) return this.actions[1]; // Heavy Blow
        if (r < 0.80) return this.actions[2]; // Quick Slash
        return this.actions[3];               // Side Swipe
    }

    chooseTarget<T extends { isAlive: boolean }>(players: T[]): T | null {
        const alive = players.filter(p => p.isAlive);
        if (alive.length === 0) return null;
        return alive[Math.floor(Math.random() * alive.length)];
    }

    chooseAttackSequence(): EnemyCombatAction[] {
        const R = AttackDirection.RIGHT;
        const U = AttackDirection.UP;
        const D = AttackDirection.DOWN;
        const L = AttackDirection.LEFT;
        const r = Math.random();
        if (r < 0.35) return [
            new EnemyCombatAction({ name: 'Quick Slash', animation: 'ds-attack3', duration:  900, direction: U, damage:  8 }),
            new EnemyCombatAction({ name: 'Strike',      animation: 'ds-attack1', duration: 1200, direction: R, damage: 10 }),
        ];
        if (r < 0.65) return [
            new EnemyCombatAction({ name: 'Side Swipe',  animation: 'ds-attack4', duration: 1100, direction: L, damage: 12 }),
            new EnemyCombatAction({ name: 'Heavy Blow',  animation: 'ds-attack2', duration: 1400, direction: D, damage: 14 }),
        ];
        return [
            new EnemyCombatAction({ name: 'Quick Slash', animation: 'ds-attack3', duration:  900, direction: U, damage:  8 }),
            new EnemyCombatAction({ name: 'Strike',      animation: 'ds-attack1', duration: 1200, direction: R, damage: 10 }),
            new EnemyCombatAction({ name: 'Side Swipe',  animation: 'ds-attack4', duration: 1100, direction: L, damage: 12 }),
        ];
    }

    getInfo(): string { return `${this.getName()} (Lv.${this.getLevel()} ${this.getEnemyType()})`; }
}

export class BossDemonSoldier extends DemonSoldier {
    constructor() {
        super();
        // Double max HP.
        Object.defineProperty(this, 'maxHealth', { value: 100, writable: false, configurable: true });
        // Double each action's base damage.
        for (const action of this.actions) {
            Object.defineProperty(action, 'damage', { value: action.damage * 2, writable: false, configurable: true });
        }
    }

    override getName(): string { return 'Boss Demon Soldier'; }

    override chooseAttackSequence(): EnemyCombatAction[] {
        return super.chooseAttackSequence().map(a =>
            new EnemyCombatAction({
                name:      a.name,
                animation: a.animation,
                duration:  a.duration,
                direction: a.direction,
                damage:    a.damage * 2,
            }),
        );
    }

    override getInfo(): string { return `${this.getName()} (Boss)`; }
}
