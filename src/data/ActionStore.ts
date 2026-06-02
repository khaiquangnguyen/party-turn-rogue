import { CombatAction } from '../game/entities/CombatTypes';
import { GRAND_DANCER_ACTION_LIST } from '../characters/GrandDancer/GrandDancerCombatActions';

class ActionStore {
    createActions(): CombatAction[] {
        return GRAND_DANCER_ACTION_LIST;
    }
}

export const actionStore = new ActionStore();
export { AttackDirection, MoveType } from '../game/entities/CombatTypes';
