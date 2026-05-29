// Shared between CombatScene (Phaser) and React UI components

export const GAME_W = 3840;
export const GAME_H = 2160;

export const QTE_DURATION    = 800;  // ms per hit
export const QTE_PARRY_START = 600;  // ms — parry window opens at this point
export const QTE_MAX_RADIUS  = 320;  // logical px
export const QTE_INNER_RADIUS = 80;  // logical px (fixed parry-sweet-spot ring)

// Normalised Y of the QTE circle in the 3840×2160 canvas
// GROUND_Y = H*0.62 = 1339.2 → CHAR_Y = 1039.2 → QTE_BASE_Y = 459.2
export const QTE_NORM_Y = (GAME_H * 0.62 - 300 - 580) / GAME_H; // ≈ 0.2125

// Section fractions (used by both Phaser canvas sizing and React layout)
export const HUD_FRAC      = 1 / 6;   // top React stats bar
export const CONTROLS_FRAC = 1 / 6;   // bottom React controls bar
export const GAME_FRAC     = 4 / 6;   // Phaser canvas section

export interface QTEStartEvent {
    normX:        number;          // enemySprite.x / GAME_W (0–1)
    direction:    string;          // AttackDirection value
    hitIndex:     number;
    totalHits:    number;
    canBeBlocked: boolean;
}
