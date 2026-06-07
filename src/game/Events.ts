export const Events = {
    // ── Scene ─────────────────────────────────────────────────────────────────
    CURRENT_SCENE_READY:             'current-scene-ready',

    // ── V1 combat ─────────────────────────────────────────────────────────────
    COMBAT_UPDATE:                   'combat-update',
    COMBAT_QTE_START:                'combat-qte-start',
    COMBAT_QTE_END:                  'combat-qte-end',
    COMBAT_ENDED:                    'combat-ended',
    VICTORY:                         'victory',
    DEFEAT:                          'defeat',

    // ── V1 combat — player actions ────────────────────────────────────────────
    PLAYER_COMBO_ACTION_HIT:         'player-combo-action-hit',
    PLAYER_COMBO_DONE:               'player-combo-done',

    // ── V2 combat — turn ──────────────────────────────────────────────────────
    COMBAT_V2_TURN_START:            'combat-v2-turn-start',
    COMBAT_V2_TURN_END:              'combat-v2-turn-end',
    COMBAT_V2_ENDED:                 'combat-v2-ended',

    // ── V2 combat — player ────────────────────────────────────────────────────
    COMBAT_V2_PLAYER_INPUT_PROMPT:   'combat-v2-player-input-prompt',
    COMBAT_V2_PLAYER_ATTACK_START:   'combat-v2-player-attack-start',
    COMBAT_V2_PLAYER_ACTION_END:     'combat-v2-player-action-end',
    COMBAT_V2_RHYTHM_START:          'combat-v2-rhythm-start',
    COMBAT_V2_RHYTHM_END:            'combat-v2-rhythm-end',
    COMBAT_V2_INPUT_PHASE_START:     'combat-v2-input-phase-start',

    // ── V2 combat — planner ───────────────────────────────────────────────────
    COMBAT_V2_PLANNER_START:         'combat-v2-planner-start',
    COMBAT_V2_PLANNER_ACTION:        'combat-v2-planner-action',
    COMBAT_V2_PLANNER_UNDO:          'combat-v2-planner-undo',
    COMBAT_V2_PLANNER_END:           'combat-v2-planner-end',

    // ── V2 combat — enemy ─────────────────────────────────────────────────────
    COMBAT_V2_ENEMY_ATTACK_START:    'combat-v2-enemy-attack-start',
    COMBAT_V2_ENEMY_MOVE_START:      'combat-v2-enemy-move-start',
    COMBAT_V2_QTE_START:             'combat-v2-qte-start',
    COMBAT_V2_QTE_END:               'combat-v2-qte-end',
    COMBAT_V2_PARRY:                 'combat-v2-parry',
    COMBAT_V2_WRONG_BLOCK:           'combat-v2-wrong-block',
    COMBAT_V2_PLAYER_HIT:            'combat-v2-player-hit',
    COMBAT_V2_INTERRUPTED:           'combat-v2-interrupted',
    COMBAT_V2_COUNTER_ATTACK:        'combat-v2-counter-attack',
    COMBAT_V2_PLAY_ANIM:             'combat-v2-play-anim',
} as const;
