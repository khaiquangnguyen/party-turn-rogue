import { AttackDirection, CombatAction, CombatSpecialAction } from '../game/entities/CombatTypes.ts';

const ALL_DIRECTIONS: readonly AttackDirection[] = [
    AttackDirection.UP,
    AttackDirection.DOWN,
    AttackDirection.LEFT,
    AttackDirection.RIGHT,
];

const ACTION_DECK_SIZE   = ALL_DIRECTIONS.length;
const SPECIAL_SLOT_COUNT = 2;

export class ActionDeck {
    private slots:       Map<AttackDirection, CombatAction>;
    private specialSlots: Array<CombatSpecialAction | null>;

    private constructor(slots: Map<AttackDirection, CombatAction>) {
        this.slots        = slots;
        this.specialSlots = Array(SPECIAL_SLOT_COUNT).fill(null);
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
        this.slots.set(action.input.inputDirection, action);
    }

    getAll(): readonly CombatAction[] {
        return ALL_DIRECTIONS.map(dir => this.slots.get(dir)!);
    }

    // ── Special slots ─────────────────────────────────────────────────────────

    getSpecialAction(index: number): CombatSpecialAction | null {
        this.assertSpecialIndex(index);
        return this.specialSlots[index];
    }

    setSpecialAction(index: number, action: CombatSpecialAction): void {
        this.assertSpecialIndex(index);
        this.specialSlots[index] = action;
    }

    clearSpecialAction(index: number): void {
        this.assertSpecialIndex(index);
        this.specialSlots[index] = null;
    }

    get specialSlotCount(): number {
        return SPECIAL_SLOT_COUNT;
    }

    private assertSpecialIndex(index: number): void {
        if (index < 0 || index >= SPECIAL_SLOT_COUNT) {
            throw new Error(`Special slot index ${index} is out of range (0–${SPECIAL_SLOT_COUNT - 1}).`);
        }
    }
}
