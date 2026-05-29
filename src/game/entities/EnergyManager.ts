// Energy Manager Interface and Implementations

export interface IEnergyManager {
    getCurrentEnergy(): number;
    getMaxEnergy(): number;
    getEnergyPercentage(): number;
    consume(amount: number): boolean;
    restore(amount: number): number;
    canConsume(amount: number): boolean;
    reset(): void;
}

export class ManaEnergy implements IEnergyManager {
    private currentMana: number;
    private maxMana: number;
    private manaRegenRate: number;

    constructor(maxMana: number, initialMana?: number, regenRate: number = 1.0) {
        this.maxMana = maxMana;
        this.currentMana = initialMana ?? maxMana;
        this.manaRegenRate = regenRate;
    }

    getCurrentEnergy(): number {
        return this.currentMana;
    }

    getMaxEnergy(): number {
        return this.maxMana;
    }

    getEnergyPercentage(): number {
        return (this.currentMana / this.maxMana) * 100;
    }

    consume(amount: number): boolean {
        if (!this.canConsume(amount)) {
            return false;
        }
        this.currentMana -= amount;
        return true;
    }

    restore(amount: number): number {
        const previousMana = this.currentMana;
        this.currentMana = Math.min(this.currentMana + amount, this.maxMana);
        return this.currentMana - previousMana;
    }

    canConsume(amount: number): boolean {
        return this.currentMana >= amount;
    }

    reset(): void {
        this.currentMana = this.maxMana;
    }

    getRegenRate(): number {
        return this.manaRegenRate;
    }

    setRegenRate(rate: number): void {
        this.manaRegenRate = rate;
    }

    regenerate(delta: number): number {
        return this.restore(this.manaRegenRate * delta);
    }

    setMaxMana(newMax: number, restoreToFull: boolean = false): void {
        this.maxMana = newMax;
        if (restoreToFull) {
            this.currentMana = this.maxMana;
        } else {
            this.currentMana = Math.min(this.currentMana, this.maxMana);
        }
    }
}

