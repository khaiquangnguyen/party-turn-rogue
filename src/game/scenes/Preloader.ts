import { Scene } from 'phaser';

import dsIdle       from '../../resources/demon_soldiers/Sprites/IDLE.png';
import dsDeath      from '../../resources/demon_soldiers/Sprites/DEATH.png';
import dsHurt       from '../../resources/demon_soldiers/Sprites/HURT.png';
import dsJumpAttack from '../../resources/demon_soldiers/Sprites/JUMP ATTACK.png';
import dsFlame1     from '../../resources/demon_soldiers/Sprites/ATTACK 1 (FLAMING SWORD).png';
import dsFlame2     from '../../resources/demon_soldiers/Sprites/ATTACK 2 (FLAMING SWORD).png';
import dsFlame3     from '../../resources/demon_soldiers/Sprites/ATTACK 3 (FLAMING SWORD).png';

// Each glob must be a literal string — Vite resolves them at build time

const _idle             = import.meta.glob<string>('../../resources/player_prototype/Combat/SwordIdle/*.png',      { eager: true, query: '?url', import: 'default' });
const _airSlash         = import.meta.glob<string>('../../resources/player_prototype/Combat/AirSlash/*.png',       { eager: true, query: '?url', import: 'default' });
const _airSlashDown     = import.meta.glob<string>('../../resources/player_prototype/Combat/AirSlashDown/*.png',   { eager: true, query: '?url', import: 'default' });
const _airSlashUp       = import.meta.glob<string>('../../resources/player_prototype/Combat/AirSlashUp/*.png',     { eager: true, query: '?url', import: 'default' });
const _crouchSlash      = import.meta.glob<string>('../../resources/player_prototype/Combat/CrouchSlash/*.png',    { eager: true, query: '?url', import: 'default' });
const _groundSlam       = import.meta.glob<string>('../../resources/player_prototype/Combat/GroundSlam/*.png',     { eager: true, query: '?url', import: 'default' });
const _kickA            = import.meta.glob<string>('../../resources/player_prototype/Combat/KickA/*.png',          { eager: true, query: '?url', import: 'default' });
const _kickB            = import.meta.glob<string>('../../resources/player_prototype/Combat/KickB/*.png',          { eager: true, query: '?url', import: 'default' });
const _kickC            = import.meta.glob<string>('../../resources/player_prototype/Combat/KickC/*.png',          { eager: true, query: '?url', import: 'default' });
const _punchA           = import.meta.glob<string>('../../resources/player_prototype/Combat/PunchA/*.png',         { eager: true, query: '?url', import: 'default' });
const _punchB           = import.meta.glob<string>('../../resources/player_prototype/Combat/PunchB/*.png',         { eager: true, query: '?url', import: 'default' });
const _punchC           = import.meta.glob<string>('../../resources/player_prototype/Combat/PunchC/*.png',         { eager: true, query: '?url', import: 'default' });
const _shockHeavy       = import.meta.glob<string>('../../resources/player_prototype/Combat/ShockHeavy/*.png',     { eager: true, query: '?url', import: 'default' });
const _shockLight       = import.meta.glob<string>('../../resources/player_prototype/Combat/ShockLight/*.png',     { eager: true, query: '?url', import: 'default' });
const _standingSlash    = import.meta.glob<string>('../../resources/player_prototype/Combat/StandingSlash/*.png',  { eager: true, query: '?url', import: 'default' });
const _swordComboA      = import.meta.glob<string>('../../resources/player_prototype/Combat/SwordComboA/*.png',    { eager: true, query: '?url', import: 'default' });
const _swordComboB      = import.meta.glob<string>('../../resources/player_prototype/Combat/SwordComboB/*.png',    { eager: true, query: '?url', import: 'default' });
const _swordComboC      = import.meta.glob<string>('../../resources/player_prototype/Combat/SwordComboC/*.png',    { eager: true, query: '?url', import: 'default' });
const _swordComboD      = import.meta.glob<string>('../../resources/player_prototype/Combat/SwordComboD/*.png',    { eager: true, query: '?url', import: 'default' });
const _swordRunSlash    = import.meta.glob<string>('../../resources/player_prototype/Combat/SwordRunSlash/*.png',  { eager: true, query: '?url', import: 'default' });
const _swordSlash01     = import.meta.glob<string>('../../resources/player_prototype/Combat/SwordSlash01/*.png',   { eager: true, query: '?url', import: 'default' });
const _swordSprintSlash = import.meta.glob<string>('../../resources/player_prototype/Combat/SwordSprintSlash/*.png', { eager: true, query: '?url', import: 'default' });
const _throwOverarm     = import.meta.glob<string>('../../resources/player_prototype/Combat/ThrowOverarm/*.png',   { eager: true, query: '?url', import: 'default' });
const _throwUnderarm    = import.meta.glob<string>('../../resources/player_prototype/Combat/ThrowUnderarm/*.png',  { eager: true, query: '?url', import: 'default' });
const _hit              = import.meta.glob<string>('../../resources/player_prototype/Combat/Hit/*.png',            { eager: true, query: '?url', import: 'default' });
const _guard            = import.meta.glob<string>('../../resources/player_prototype/Combat/Guard/*.png',          { eager: true, query: '?url', import: 'default' });

function sortedUrls(glob: Record<string, string>): string[] {
    return Object.keys(glob).sort().map(k => glob[k]);
}

// Keys must match PlayerAnimation constants and the action.animation field
export const PLAYER_ANIM_FRAMES: Record<string, string[]> = {
    idle:             sortedUrls(_idle),
    airSlash:         sortedUrls(_airSlash),
    airSlashDown:     sortedUrls(_airSlashDown),
    airSlashUp:       sortedUrls(_airSlashUp),
    crouchSlash:      sortedUrls(_crouchSlash),
    groundSlam:       sortedUrls(_groundSlam),
    kickA:            sortedUrls(_kickA),
    kickB:            sortedUrls(_kickB),
    kickC:            sortedUrls(_kickC),
    punchA:           sortedUrls(_punchA),
    punchB:           sortedUrls(_punchB),
    punchC:           sortedUrls(_punchC),
    shockHeavy:       sortedUrls(_shockHeavy),
    shockLight:       sortedUrls(_shockLight),
    standingSlash:    sortedUrls(_standingSlash),
    swordComboA:      sortedUrls(_swordComboA),
    swordComboB:      sortedUrls(_swordComboB),
    swordComboC:      sortedUrls(_swordComboC),
    swordComboD:      sortedUrls(_swordComboD),
    swordRunSlash:    sortedUrls(_swordRunSlash),
    swordSlash01:     sortedUrls(_swordSlash01),
    swordSprintSlash: sortedUrls(_swordSprintSlash),
    throwOverarm:     sortedUrls(_throwOverarm),
    throwUnderarm:    sortedUrls(_throwUnderarm),
    hit:              sortedUrls(_hit),
    guard:            sortedUrls(_guard),
};

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
        this.scene.start('CombatScene');
    }
}
