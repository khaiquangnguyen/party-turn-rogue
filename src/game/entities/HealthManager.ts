// Health Manager Class

export class HealthManager {
    private currentHealth: number;
    private maxHealth: number;
    private minHealth: number = 0;

    constructor(maxHealth: number, initialHealth?: number) {
        this.maxHealth = maxHealth;
        this.currentHealth = initialHealth ?? maxHealth;
    }

    getCurrentHealth(): number {
        return this.currentHealth;
    }

    getMaxHealth(): number {
        return this.maxHealth;
    }

    getHealthPercentage(): number {
        return (this.currentHealth / this.maxHealth) * 100;
    }

    isAlive(): boolean {
        return this.currentHealth > this.minHealth;
    }

    isDead(): boolean {
        return !this.isAlive();
    }

    heal(amount: number): number {
        const previousHealth = this.currentHealth;
        this.currentHealth = Math.min(this.currentHealth + amount, this.maxHealth);
        return this.currentHealth - previousHealth;
    }

    damage(amount: number): number {
        const previousHealth = this.currentHealth;
        this.currentHealth = Math.max(this.currentHealth - amount, this.minHealth);
        return previousHealth - this.currentHealth;
    }

    setMaxHealth(newMax: number, healToFull: boolean = false): void {
        this.maxHealth = newMax;
        if (healToFull) {
            this.currentHealth = this.maxHealth;
        } else {
            this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
        }
    }

    reset(): void {
        this.currentHealth = this.maxHealth;
    }
}

