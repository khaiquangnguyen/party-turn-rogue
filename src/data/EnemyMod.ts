// ── Enemy mod variants ────────────────────────────────────────────────────────

export type EnemyMod =
    | { kind: 'hp';          amount: number }
    | { kind: 'damage';      amount: number }
    | { kind: 'comboLength'; amount: number };

export const ENEMY_MOD_CHOICES: EnemyMod[] = [
    { kind: 'hp',          amount: 20  },
    { kind: 'damage',      amount: 3   },
    { kind: 'comboLength', amount: 1   },
];

export function enemyModLabel(mod: EnemyMod): string {
    switch (mod.kind) {
        case 'hp':          return `+${mod.amount} Enemy HP`;
        case 'damage':      return `+${mod.amount} Enemy Damage per hit`;
        case 'comboLength': return `+${mod.amount} Enemy Combo Length`;
    }
}

export function enemyModDescription(mod: EnemyMod): string {
    switch (mod.kind) {
        case 'hp':          return `All enemies gain ${mod.amount} additional max HP for the rest of the expedition.`;
        case 'damage':      return `All enemy attacks deal ${mod.amount} more damage for the rest of the expedition.`;
        case 'comboLength': return `Enemies attack ${mod.amount} more time(s) per combo for the rest of the expedition.`;
    }
}
