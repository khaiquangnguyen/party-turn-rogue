// Character State Machine

export class CharacterState {
    readonly name: string;
    protected substates: Map<string, CharacterState> = new Map();
    protected currentSubstate: CharacterState | null = null;
    
    private onEnter?: () => void;
    private onUpdate?: (delta: number) => void;
    private onExit?: () => void;

    constructor(
        name: string,
        callbacks?: {
            onEnter?: () => void;
            onUpdate?: (delta: number) => void;
            onExit?: () => void;
        }
    ) {
        this.name = name;
        this.onEnter = callbacks?.onEnter;
        this.onUpdate = callbacks?.onUpdate;
        this.onExit = callbacks?.onExit;
    }

    enter(): void {
        this.onEnter?.();
    }

    update(delta: number): void {
        this.onUpdate?.(delta);
        this.currentSubstate?.update(delta);
    }

    exit(): void {
        this.currentSubstate?.exit();
        this.currentSubstate = null;
        this.onExit?.();
    }

    // Substate management
    addSubstate(substate: CharacterState): void {
        this.substates.set(substate.name, substate);
    }

    setSubstate(substateName: string): boolean {
        if (this.currentSubstate?.name === substateName) {
            return true;
        }

        const newSubstate = this.substates.get(substateName);
        if (!newSubstate) {
            console.warn(`Substate ${substateName} not found in state ${this.name}`);
            return false;
        }

        this.currentSubstate?.exit();
        this.currentSubstate = newSubstate;
        this.currentSubstate.enter();
        return true;
    }

    getCurrentSubstate(): CharacterState | null {
        return this.currentSubstate;
    }

    clearSubstate(): void {
        this.currentSubstate?.exit();
        this.currentSubstate = null;
    }
}

// Defend State with substates: defend, dodge, parry
export class DefendState extends CharacterState {
    constructor(callbacks?: {
        onEnter?: () => void;
        onUpdate?: (delta: number) => void;
        onExit?: () => void;
    }) {
        super('defending', callbacks);
        this.initializeSubstates();
    }

    private initializeSubstates(): void {
        this.addSubstate(new CharacterState('defend'));
        this.addSubstate(new CharacterState('dodge'));
        this.addSubstate(new CharacterState('parry'));
    }
}

// Dead State with substates
export class DeadState extends CharacterState {
    constructor(callbacks?: {
        onEnter?: () => void;
        onUpdate?: (delta: number) => void;
        onExit?: () => void;
    }) {
        super('dead', callbacks);
        this.initializeSubstates();
    }

    private initializeSubstates(): void {
        this.addSubstate(new CharacterState('dying'));
        this.addSubstate(new CharacterState('corpse'));
        this.addSubstate(new CharacterState('reviving'));
    }
}

// Damage types
export enum DamageType {
    PHYSICAL = 'Physical',
    MAGICAL = 'Magical',
    TRUE = 'True' // Ignores defense
}

// Damage result after applying modifiers
export interface DamageResult {
    originalDamage: number;
    finalDamage: number;
    damageType: DamageType;
    wasBlocked: boolean;
    wasParried: boolean;
    isCritical: boolean;
}

// Damage calculation info
export interface DamageInfo {
    amount: number;
    type: DamageType;
    isCritical?: boolean;
    canBeBlocked?: boolean;
    canBeParried?: boolean;
}

export class StateMachine {
    private states: Map<string, CharacterState> = new Map();
    private currentState: CharacterState | null = null;

    addState(state: CharacterState): void {
        this.states.set(state.name, state);
    }

    setState(stateName: string): boolean {
        if (this.currentState?.name === stateName) {
            return true;
        }

        const newState = this.states.get(stateName);
        if (!newState) {
            console.warn(`State ${stateName} not found`);
            return false;
        }

        this.currentState?.exit();
        this.currentState = newState;
        this.currentState.enter();
        return true;
    }

    getCurrentState(): CharacterState | null {
        return this.currentState;
    }

    getCurrentStateName(): string | null {
        return this.currentState?.name ?? null;
    }

    update(delta: number): void {
        this.currentState?.update(delta);
    }

    // Check if character is in a specific state
    isInState(stateName: string): boolean {
        return this.currentState?.name === stateName;
    }

    // Check if character is in a specific substate
    isInSubstate(substateName: string): boolean {
        return this.currentState?.getCurrentSubstate()?.name === substateName;
    }
}


