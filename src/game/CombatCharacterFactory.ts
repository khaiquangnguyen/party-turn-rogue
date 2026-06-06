import { ActionDeck } from '../data/ActionDeck.ts';
import { ComboModDeck } from '../data/ComboMod/ComboMod.ts';
import { GRAND_DANCER_BASIC_ACTIONS } from '../characters/GrandDancer/GrandDancerCombatActions.ts';
import { AttackDirection } from './entities/CombatTypes';
import { CombatScenePlayableCharacter, CombatSceneEnemyCharacter } from './entities/CombatSceneCharacter';
import { TheGrandDancer } from '../characters/GrandDancer/TheGrandDancer.ts';
import { DemonSoldier, BossDemonSoldier } from './entities/DemonSoldier';
import { GameData } from './GameData';
import type { RunPrepData } from './GameData';
import type { CombatSceneV2InitData } from './scenes/CombatSceneV2';
import type { EnemyMod } from '../data/EnemyMod';

const ALL_DIRS = [
    AttackDirection.UP,
    AttackDirection.DOWN,
    AttackDirection.LEFT,
    AttackDirection.RIGHT,
] as const;

// ── Apply enemy mods to a DemonSoldier ────────────────────────────────────────

function applyEnemyMods(enemy: DemonSoldier, mods: EnemyMod[]): DemonSoldier {
    if (!mods.length) return enemy;

    let hpBonus          = 0;
    let damageBonus      = 0;
    let comboLengthBonus = 0;

    for (const mod of mods) {
        if      (mod.kind === 'hp')          hpBonus          += mod.amount;
        else if (mod.kind === 'damage')      damageBonus      += mod.amount;
        else if (mod.kind === 'comboLength') comboLengthBonus += mod.amount;
    }

    // We create a patched subclass inline rather than mutating the original.
    const base = enemy;

    if (hpBonus > 0) {
        // CharacterTemplate.maxHealth is readonly; override via Object.defineProperty.
        Object.defineProperty(base, 'maxHealth', { value: base.maxHealth + hpBonus, writable: false });
    }

    if (damageBonus > 0) {
        // Patch each action's damage value.
        for (const action of base.actions) {
            (action as { damage: number }).damage += damageBonus;
        }
        // Also patch chooseAttackSequence results by wrapping it.
        const origChoose = base.chooseAttackSequence.bind(base);
        base.chooseAttackSequence = () =>
            origChoose().map(a => {
                (a as { damage: number }).damage += damageBonus;
                return a;
            });
    }

    if (comboLengthBonus > 0) {
        const origChoose = base.chooseAttackSequence.bind(base);
        base.chooseAttackSequence = () => {
            const seq = origChoose();
            // Duplicate the last action comboLengthBonus times.
            const extra = Array.from({ length: comboLengthBonus }, () => seq[seq.length - 1]);
            return [...seq, ...extra];
        };
    }

    return base;
}

// ── Public factory ────────────────────────────────────────────────────────────

export function buildCombatInitData(runPrep: RunPrepData): CombatSceneV2InitData {
    const dirActions = ALL_DIRS
        .map(dir => runPrep.actionsByDirection[dir])
        .filter((a): a is NonNullable<typeof a> => !!a);

    const actionDeck = ActionDeck.create(dirActions.length === 4 ? dirActions : GRAND_DANCER_BASIC_ACTIONS);

    runPrep.specials.forEach((special, i) => {
        if (i < actionDeck.specialSlotCount) {
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

    const enemyMods   = runPrep.enemyMods ?? [];
    const nodeIdx     = GameData.getSelectedExpedition()?.map.currentIndex ?? 0;
    const stageIdx    = Math.floor(nodeIdx / 4);   // 0, 1, or 2
    const posInStage  = nodeIdx % 4;
    const isBossNode  = posInStage === 3;

    // Regular enemies: stageIdx + 1 per stage (1, 2, 3).
    // Boss node: replace one regular slot with the boss — total stays stageIdx + 1.
    const regularCount = isBossNode ? stageIdx : stageIdx + 1;
    const enemies = [
        ...Array.from({ length: regularCount }, () =>
            new CombatSceneEnemyCharacter(applyEnemyMods(new DemonSoldier(), enemyMods)),
        ),
        ...(isBossNode
            ? [new CombatSceneEnemyCharacter(applyEnemyMods(new BossDemonSoldier(), enemyMods))]
            : []),
    ];

    return {
        players: [player],
        enemies,
    };
}
