// Character Base Class

import { StateMachine, CharacterState, DefendState, DeadState, DamageInfo, DamageResult, DamageType } from './CharacterState';
import { HealthManager } from './HealthManager';
import { IEnergyManager, ManaEnergy } from './EnergyManager';

export interface CharacterConfig {
    name: string;
    maxHealth?: number;
    maxEnergy?: number;
    defense?: number;
    magicResistance?: number;
    parryChance?: number;
    blockReduction?: number;
    speed?: number;
}

export interface CharacterStats {
    defense: number;
    magicResistance: number;
    parryChance: number;      // 0-1 percentage
    blockReduction: number;   // 0-1 percentage of damage blocked when defending
    speed: number;            // determines turn order, higher goes first
}

export abstract class Character {
    protected name: string;
    
    protected stateMachine: StateMachine;
    protected healthManager: HealthManager;
    protected energyManager: IEnergyManager;
    protected stats: CharacterStats;

    constructor(config: CharacterConfig) {
        this.name = config.name;

        // Initialize health with default or provided value
        this.healthManager = new HealthManager(config.maxHealth ?? 100);

        // Initialize energy with default or provided value
        this.energyManager = new ManaEnergy(config.maxEnergy ?? 50);

        // Initialize stats
        this.stats = {
            defense: config.defense ?? 10,
            magicResistance: config.magicResistance ?? 10,
            parryChance: config.parryChance ?? 0.05,
            blockReduction: config.blockReduction ?? 0.5,
            speed: config.speed ?? 10
        };

        // Initialize state machine with default states
        this.stateMachine = new StateMachine();
        this.initializeStates();
    }

    protected initializeStates(): void {
        // Add default character states
        this.stateMachine.addState(new CharacterState('idle', {
            onEnter: () => console.log(`${this.name} is now idle`),
        }));

        this.stateMachine.addState(new CharacterState('walking', {
            onEnter: () => console.log(`${this.name} started walking`),
        }));

        this.stateMachine.addState(new CharacterState('attacking', {
            onEnter: () => console.log(`${this.name} is attacking`),
        }));

        // Defend state with substates (defend, dodge, parry)
        this.stateMachine.addState(new DefendState({
            onEnter: () => console.log(`${this.name} is defending`),
        }));

        this.stateMachine.addState(new CharacterState('hurt', {
            onEnter: () => console.log(`${this.name} was hurt`),
        }));

        // Dead state with substates (dying, corpse, reviving)
        this.stateMachine.addState(new DeadState({
            onEnter: () => console.log(`${this.name} has died`),
        }));

        this.stateMachine.addState(new CharacterState('casting', {
            onEnter: () => console.log(`${this.name} is casting`),
        }));

        this.stateMachine.addState(new CharacterState('stunned', {
            onEnter: () => console.log(`${this.name} is stunned`),
        }));

        // Set initial state to idle
        this.stateMachine.setState('idle');
    }

    // Getters
    getName(): string {
        return this.name;
    }

    getStateMachine(): StateMachine {
        return this.stateMachine;
    }

    getHealthManager(): HealthManager {
        return this.healthManager;
    }

    getEnergyManager(): IEnergyManager {
        return this.energyManager;
    }

    getStats(): CharacterStats {
        return { ...this.stats };
    }

    // State shortcuts
    setState(state: string): boolean {
        return this.stateMachine.setState(state);
    }

    setSubstate(substate: string): boolean {
        const currentState = this.stateMachine.getCurrentState();
        if (currentState) {
            return currentState.setSubstate(substate);
        }
        return false;
    }

    getCurrentState(): string | null {
        return this.stateMachine.getCurrentStateName();
    }

    getCurrentSubstate(): string | null {
        return this.stateMachine.getCurrentState()?.getCurrentSubstate()?.name ?? null;
    }

    isInState(stateName: string): boolean {
        return this.stateMachine.isInState(stateName);
    }

    isInSubstate(substateName: string): boolean {
        return this.stateMachine.isInSubstate(substateName);
    }

    // Health shortcuts
    isAlive(): boolean {
        return this.healthManager.isAlive();
    }

    isDead(): boolean {
        return this.healthManager.isDead();
    }

    // Enhanced damage mechanism
    takeDamage(damageInfo: DamageInfo): DamageResult {
        const result: DamageResult = {
            originalDamage: damageInfo.amount,
            finalDamage: damageInfo.amount,
            damageType: damageInfo.type,
            wasBlocked: false,
            wasParried: false,
            isCritical: damageInfo.isCritical ?? false
        };

        // Check if in defending state for special interactions
        const isDefending = this.isInState('defending');
        const currentSubstate = this.getCurrentSubstate();

        // Check for parry (if allowed and character is in parry substate)
        if (damageInfo.canBeParried !== false && isDefending && currentSubstate === 'parry') {
            const parryRoll = Math.random();
            if (parryRoll < this.stats.parryChance * 3) { // Triple parry chance when actively parrying
                result.wasParried = true;
                result.finalDamage = 0;
                console.log(`${this.name} parried the attack!`);
                return result;
            }
        }

        // Check for block (if allowed and character is in defend substate)
        if (damageInfo.canBeBlocked !== false && isDefending && currentSubstate === 'defend') {
            result.wasBlocked = true;
            result.finalDamage *= (1 - this.stats.blockReduction);
            console.log(`${this.name} blocked some damage!`);
        }

        // Apply defense/resistance reduction based on damage type
        if (damageInfo.type !== DamageType.TRUE) {
            const resistance = damageInfo.type === DamageType.PHYSICAL 
                ? this.stats.defense 
                : this.stats.magicResistance;
            
            // Damage reduction formula: damage * (100 / (100 + defense))
            result.finalDamage *= (100 / (100 + resistance));
        }

        // Round final damage
        result.finalDamage = Math.round(result.finalDamage);

        // Apply damage to health
        if (result.finalDamage > 0) {
            this.healthManager.damage(result.finalDamage);
            
            // Update state based on health
            if (this.healthManager.isDead()) {
                this.setState('dead');
                this.setSubstate('dying');
            } else {
                this.setState('hurt');
            }
        }

        console.log(`${this.name} took ${result.finalDamage} ${result.damageType} damage (original: ${result.originalDamage})`);
        return result;
    }

    // Simple damage method
    damage(amount: number, type: DamageType = DamageType.PHYSICAL): DamageResult {
        return this.takeDamage({ amount, type, canBeBlocked: true, canBeParried: true });
    }

    heal(amount: number): void {
        this.healthManager.heal(amount);
        
        // If was dead and now alive, start reviving
        if (this.isInState('dead') && this.healthManager.isAlive()) {
            this.setSubstate('reviving');
        }
    }

    // Defense actions
    defend(): void {
        this.setState('defending');
        this.setSubstate('defend');
    }

    parry(): void {
        this.setState('defending');
        this.setSubstate('parry');
    }

    // Update method for game loop
    update(delta: number): void {
        this.stateMachine.update(delta);
    }

    // Character info - abstract method for subclasses to implement
    abstract getInfo(): string;
}




