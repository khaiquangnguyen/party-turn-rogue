import { Scene } from 'phaser';
import { PLAYER_ANIM_FRAMES } from '../playerAnimFrames';

export class IdleShowcaseScene extends Scene {
    constructor() {
        super('IdleShowcaseScene');
    }

    preload() {
        PLAYER_ANIM_FRAMES.idle.forEach((url, i) =>
            this.load.image(`player-idle-${i}`, url)
        );
    }

    create() {
        const { width, height } = this.scale;

        this.anims.create({
            key:       'player-idle-anim',
            frames:    PLAYER_ANIM_FRAMES.idle.map((_, i) => ({ key: `player-idle-${i}` })),
            frameRate: 10,
            repeat:    -1,
        });

        this.add.sprite(width / 2, height, 'player-idle-0')
            .setOrigin(0.5, 1)
            .setScale(3)
            .play('player-idle-anim');
    }
}
