import { ActionDeck } from '../data/ActionDeck.ts';
import { ComboModDeck } from '../data/ComboMod/ComboMod.ts';
import { GRAND_DANCER_BASIC_ACTIONS } from '../characters/GrandDancer/GrandDancerCombatActions.ts';
import { AttackDirection, CombatSpecialAction } from './entities/CombatTypes';
import { CombatScenePlayableCharacter, CombatSceneEnemyCharacter } from './entities/CombatSceneCharacter';
import { TheGrandDancer } from '../characters/GrandDancer/TheGrandDancer.ts';
import { DemonSoldier } from './entities/DemonSoldier';
import type { RunPrepData } from './GameData';
import type { CombatSceneV2InitData } from './scenes/CombatSceneV2';

const ALL_DIRS = [
    AttackDirection.UP,
    AttackDirection.DOWN,
    AttackDirection.LEFT,
    AttackDirection.RIGHT,
] as const;

export function buildCombatInitData(runPrep: RunPrepData): CombatSceneV2InitData {
    const dirActions = ALL_DIRS
        .map(dir => runPrep.actionsByDirection[dir])
        .filter((a): a is NonNullable<typeof a> => !!a);

    const actionDeck = ActionDeck.create(dirActions.length === 4 ? dirActions : GRAND_DANCER_BASIC_ACTIONS);

    runPrep.specials.forEach((special, i) => {
        if (i < actionDeck.specialSlotCount && special instanceof CombatSpecialAction) {
            actionDeck.setSpecialAction(i, special);
        }
    });

    const comboModDeck = new ComboModDeck();
    for (const mod of runPrep.comboMods) {
        comboModDeck.add(mod);
    }

    const player = CombatScenePlayableCharacter.create(
        new TheGrandDancer(),
        { actionDeck, comboModDeck },
    );

    return {
        players: [player],
        enemies: [new CombatSceneEnemyCharacter(new DemonSoldier())],
    };
}
