import { Scene } from 'phaser';
import { getTargetScene } from '../main';
import { PLAYER_ANIM_FRAMES } from '../playerAnimFrames';
import { GameData } from '../GameData';
import { buildCombatInitData } from '../CombatCharacterFactory';

import dsIdle       from '../../resources/demon_soldiers/Sprites/IDLE.png';
import dsDeath      from '../../resources/demon_soldiers/Sprites/DEATH.png';
import dsHurt       from '../../resources/demon_soldiers/Sprites/HURT.png';
import dsJumpAttack from '../../resources/demon_soldiers/Sprites/JUMP ATTACK.png';
import dsFlame1     from '../../resources/demon_soldiers/Sprites/ATTACK 1 (FLAMING SWORD).png';
import dsFlame2     from '../../resources/demon_soldiers/Sprites/ATTACK 2 (FLAMING SWORD).png';
import dsFlame3     from '../../resources/demon_soldiers/Sprites/ATTACK 3 (FLAMING SWORD).png';

export { PLAYER_ANIM_FRAMES };

const DS_FRAME_WIDTH  = 128;
const DS_FRAME_HEIGHT = 108;

export class Preloader extends Scene {
    constructor() { super('Preloader'); }

    init() {
        this.add.image(512, 384, 'background');
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);
        this.load.on('progress', (p: number) => { bar.width = 4 + (460 * p); });
    }

    preload() {
        this.load.setPath('assets');
        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');
        this.load.setPath('');

        const fc = { frameWidth: DS_FRAME_WIDTH, frameHeight: DS_FRAME_HEIGHT };
        this.load.spritesheet('ds-idle',        dsIdle,       fc);
        this.load.spritesheet('ds-death',       dsDeath,      fc);
        this.load.spritesheet('ds-hurt',        dsHurt,       fc);
        this.load.spritesheet('ds-jump-attack', dsJumpAttack, fc);
        this.load.spritesheet('ds-flame1',      dsFlame1,     fc);
        this.load.spritesheet('ds-flame2',      dsFlame2,     fc);
        this.load.spritesheet('ds-flame3',      dsFlame3,     fc);

        for (const [animKey, urls] of Object.entries(PLAYER_ANIM_FRAMES)) {
            urls.forEach((url, i) => this.load.image(`player-${animKey}-${i}`, url));
        }
    }

    create() {
        const runPrep = GameData.getRunPrep();
        // If runPrep is available, build and pass characters directly.
        // If not (e.g. direct browser refresh to /game), CombatSceneV2 will
        // hydrate from localStorage in its own init().
        const initData = runPrep ? buildCombatInitData(runPrep) : undefined;
        this.scene.start(getTargetScene(), initData);
    }
}
