import { EnemyCharacter, EnemyType } from './EnemyCharacter';
import { DamageType } from './CharacterState';
import { AttackDirection, HitInfo, ActionResult, CombatAction } from './CombatTypes';

export { AttackDirection };
export type { HitInfo, ActionResult, CombatAction };

function makeHits(count: number, damage: number, dir?: AttackDirection): HitInfo[] {
    const dirs = [AttackDirection.UP, AttackDirection.DOWN, AttackDirection.LEFT, AttackDirection.RIGHT];
    return Array.from({ length: count }, () => ({
        damage,
        direction:  dir ?? dirs[Math.floor(Math.random() * dirs.length)],
        damageType: DamageType.PHYSICAL,
    }));
}

export class DemonSoldier extends EnemyCharacter {
    readonly actions: CombatAction[];

    constructor() {
        super({
            name:             'Demon Soldier',
            enemyType:        EnemyType.ELITE,
            maxHealth:        120,
            maxEnergy:        80,
            defense:          12,
            magicResistance:  8,
            parryChance:      0.05,
            blockReduction:   0.5,
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
                animation: '',
                damage:    10,
                execute:   (a) => ({
                    type:    'attack',
                    hits:    makeHits(Math.floor(Math.random() * 3) + 3, a.damage),
                    message: 'Demon Soldier launches a flurry of strikes!',
                }),
            }),
            new CombatAction({
                name:      'Heavy Blow',
                animation: '',
                damage:    14,
                execute:   (a) => ({
                    type:    'attack',
                    hits:    makeHits(Math.floor(Math.random() * 3) + 3, a.damage),
                    message: 'Demon Soldier delivers heavy blows!',
                }),
            }),
            new CombatAction({
                name:      'Triple Slash',
                animation: '',
                damage:    8,
                execute:   (a) => ({
                    type:    'attack',
                    hits:    makeHits(3, a.damage),
                    message: 'Demon Soldier slashes three times!',
                }),
            }),
            new CombatAction({
                name:      'Aerial Assault',
                animation: '',
                damage:    12,
                execute:   (a) => ({
                    type:    'attack',
                    hits:    makeHits(Math.floor(Math.random() * 2) + 3, a.damage, AttackDirection.DOWN),
                    message: 'Demon Soldier rains blows from above!',
                }),
            }),
        ];
    }

    chooseAction(): CombatAction {
        const r = Math.random();
        if (r < 0.35) return this.actions[0]; // Strike
        if (r < 0.60) return this.actions[1]; // Heavy Blow
        if (r < 0.80) return this.actions[2]; // Triple Slash
        return this.actions[3];               // Aerial Assault
    }

    getInfo(): string { return `${this.getName()} (Lv.${this.getLevel()} ${this.getEnemyType()})`; }
}
