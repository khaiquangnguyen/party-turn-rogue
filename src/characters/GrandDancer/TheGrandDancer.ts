import { PlayableCharacter, PlayableCharacterConfig, PLAYER_SPRITE_PATH } from '../../game/entities/PlayableCharacter.ts';

export class TheGrandDancer extends PlayableCharacter {
    readonly idleAnimKey          = 'player-idle-anim';
    readonly hitAnimKey           = 'player-hit-anim';
    readonly deathAnimKey         = 'player-death-anim';
    readonly defendAnimKey        = 'player-guard-anim';
    readonly counterAttackAnimKey = 'player-standingSlash-anim';
    readonly spritePath           = PLAYER_SPRITE_PATH;

    constructor(config?: Partial<PlayableCharacterConfig>) {
        super({
            name:      'The Grand Dancer',
            maxEnergy: 10,
            speed:     14,
            ...config,
        });
    }
}
