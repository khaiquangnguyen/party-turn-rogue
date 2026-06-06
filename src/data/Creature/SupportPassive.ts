import { ComboMod } from '../ComboMod/ComboMod.ts';

export abstract class SupportPassive extends ComboMod {}

// Each attack has a 10% chance to not consume energy.
export class NoEnergyConsumeChance extends SupportPassive {
    readonly title       = 'Energy Saver';
    readonly description = 'Each attack has a 10% chance to not consume energy.';
}

// Each air attack has a 10% chance of triggering a lightning strike (5 damage).
export class AirLightningStrike extends SupportPassive {
    readonly title             = 'Storm Conductor';
    readonly description       = 'Air attacks have a 10% chance to trigger a lightning strike, dealing 5 damage.';
    readonly lightningDamage   = 5;
    readonly procChance        = 0.1;
}

// Passively increases the creature owner's speed by 5.
export class SpeedIncrease extends SupportPassive {
    readonly title       = 'Gale Step';
    readonly description = 'Increases speed by 5.';
    readonly speedBonus  = 5;
}
