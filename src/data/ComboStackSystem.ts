export class ComboStackSystem {
    comboLength:           number = 1;
    damageMultiplier:   number = 1;
    extraDamage:           number = 0;
    // combo stack system of dancer class
    comboRating:           number;

    constructor(inheritedCrowdRating = 0) {
        this.comboRating = inheritedCrowdRating;
    }

    addComboRating(amount: number): void {
        this.comboRating = Math.round(Math.min(10, this.comboRating + amount) * 10) / 10;
    }

    get finalMultiplier(): number {
        return this.damageMultiplier;
    }
}
