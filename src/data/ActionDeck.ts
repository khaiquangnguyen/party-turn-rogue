import { AttackDirection, CombatAction } from '../game/entities/CombatTypes.ts';

const ALL_DIRECTIONS: readonly AttackDirection[] = [
    AttackDirection.UP,
    AttackDirection.DOWN,
    AttackDirection.LEFT,
    AttackDirection.RIGHT,
];

const ACTION_DECK_SIZE = ALL_DIRECTIONS.length;

export class ActionDeck {
    private slots:   Map<AttackDirection, CombatAction>;
    private _specials: CombatAction[];

    private constructor(slots: Map<AttackDirection, CombatAction>) {
        this.slots    = slots;
        this._specials = [];
    }

    static create(actions: readonly CombatAction[]): ActionDeck {
        if (actions.length !== ACTION_DECK_SIZE) {
            throw new Error(`ActionDeck requires exactly ${ACTION_DECK_SIZE} actions, got ${actions.length}.`);
        }

        const slots = new Map<AttackDirection, CombatAction>();

        for (const action of actions) {
            if (!action.input) {
                throw new Error(`Action "${action.name}" has no input and cannot be assigned to a direction slot.`);
            }
            const dir = action.input.inputDirection;
            if (dir === null) {
                throw new Error(`Action "${action.name}" uses a special key and cannot be assigned to a direction slot.`);
            }
            if (slots.has(dir)) {
                throw new Error(`Duplicate direction slot: two actions share direction ${AttackDirection[dir]}.`);
            }
            slots.set(dir, action);
        }

        for (const dir of ALL_DIRECTIONS) {
            if (!slots.has(dir)) {
                throw new Error(`No action assigned for direction ${AttackDirection[dir]}.`);
            }
        }

        return new ActionDeck(slots);
    }

    // ── Direction slots ───────────────────────────────────────────────────────

    getAction(direction: AttackDirection): CombatAction {
        return this.slots.get(direction)!;
    }

    setAction(action: CombatAction): void {
        if (!action.input) {
            throw new Error(`Action "${action.name}" has no input and cannot be assigned to a direction slot.`);
        }
        const dir = action.input.inputDirection;
        if (dir === null) throw new Error(`Action "${action.name}" uses a special key and cannot be assigned to a direction slot.`);
        this.slots.set(dir, action);
    }

    getAll(): readonly CombatAction[] {
        return ALL_DIRECTIONS.map(dir => this.slots.get(dir)!);
    }

    // ── Special actions (sequence-based) ──────────────────────────────────────

    addSpecial(action: CombatAction): void {
        this._specials.push(action);
    }

    getAllSpecials(): readonly CombatAction[] {
        return this._specials;
    }

    /**
     * Returns the special whose input sequence matches the longest suffix of `buffer`,
     * or null if no complete match. Prefers longer sequences when multiple match.
     */
    findBySequence(buffer: AttackDirection[]): CombatAction | null {
        let best: CombatAction | null = null;
        let bestLen = 0;
        for (const sp of this._specials) {
            const seq = sp.input?.inputSequence;
            if (!seq || seq.length > buffer.length || seq.length <= bestLen) continue;
            const suffix = buffer.slice(-seq.length);
            if (suffix.every((d, i) => d === seq[i])) {
                bestLen = seq.length;
                best    = sp;
            }
        }
        return best;
    }

    /**
     * Returns true if any suffix of `buffer` is a strict prefix of any special's sequence
     * (i.e., there's still a possible sequence in progress).
     */
    hasPartialSequence(buffer: AttackDirection[]): boolean {
        for (const sp of this._specials) {
            const seq = sp.input?.inputSequence;
            if (!seq) continue;
            for (let start = 0; start < buffer.length; start++) {
                const tail = buffer.slice(start);
                if (tail.length < seq.length && tail.every((d, i) => d === seq[i])) return true;
            }
        }
        return false;
    }

    // ── Legacy slot API (kept for backward-compat reads) ─────────────────────

    getSpecialAction(index: number): CombatAction | null {
        return this._specials[index] ?? null;
    }

    setSpecialAction(index: number, action: CombatAction): void {
        this._specials[index] = action;
    }

    get specialSlotCount(): number {
        return this._specials.length;
    }
}
