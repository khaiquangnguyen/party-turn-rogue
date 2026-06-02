import { CombatEffect, ICombatTarget } from './CombatTypes';

export class Airborne extends CombatEffect {
    description = 'Target is forced into the air.';
    apply(_target: ICombatTarget): void {}
}

export class Ground extends CombatEffect {
    description = 'Target is slammed to the ground.';
    apply(_target: ICombatTarget): void {}
}

export class Vulnerable extends CombatEffect {
    description = 'Target takes increased damage.';
    apply(_target: ICombatTarget): void {}
}
