import { CombatAction } from '../game/entities/CombatTypes';
import { ACTION_LIST } from './ActionData';

class ActionStore {
    createActions(): CombatAction[] {
        return ACTION_LIST;
    }
}

export const actionStore = new ActionStore();
export { AttackDirection, MoveType } from '../game/entities/CombatTypes';
