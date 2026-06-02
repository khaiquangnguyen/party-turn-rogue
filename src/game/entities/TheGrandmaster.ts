import { PlayableCharacter, PlayableCharacterConfig, PLAYER_SPRITE_PATH } from './PlayableCharacter';

export class TheGrandmaster extends PlayableCharacter {
    readonly idleAnimKey          = 'player-idle-anim';
    readonly hitAnimKey           = 'player-hit-anim';
    readonly deathAnimKey         = 'player-death-anim';
    readonly defendAnimKey        = 'player-guard-anim';
    readonly counterAttackAnimKey = 'player-standingSlash-anim';
    readonly spritePath           = PLAYER_SPRITE_PATH;

    constructor(config?: Partial<PlayableCharacterConfig>) {
        super({
            name:      'The Grandmaster',
            maxEnergy: 10,
            speed:     14,
            ...config,
        });
    }
}
