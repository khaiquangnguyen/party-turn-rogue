// Each glob must be a literal string — Vite resolves them at build time
const _idle             = import.meta.glob<string>('../resources/player_prototype/Combat/SwordIdle/*.png',      { eager: true, query: '?url', import: 'default' });
const _airSlash         = import.meta.glob<string>('../resources/player_prototype/Combat/AirSlash/*.png',       { eager: true, query: '?url', import: 'default' });
const _airSlashDown     = import.meta.glob<string>('../resources/player_prototype/Combat/AirSlashDown/*.png',   { eager: true, query: '?url', import: 'default' });
const _airSlashUp       = import.meta.glob<string>('../resources/player_prototype/Combat/AirSlashUp/*.png',     { eager: true, query: '?url', import: 'default' });
const _crouchSlash      = import.meta.glob<string>('../resources/player_prototype/Combat/CrouchSlash/*.png',    { eager: true, query: '?url', import: 'default' });
const _groundSlam       = import.meta.glob<string>('../resources/player_prototype/Combat/GroundSlam/*.png',     { eager: true, query: '?url', import: 'default' });
const _kickA            = import.meta.glob<string>('../resources/player_prototype/Combat/KickA/*.png',          { eager: true, query: '?url', import: 'default' });
const _kickB            = import.meta.glob<string>('../resources/player_prototype/Combat/KickB/*.png',          { eager: true, query: '?url', import: 'default' });
const _kickC            = import.meta.glob<string>('../resources/player_prototype/Combat/KickC/*.png',          { eager: true, query: '?url', import: 'default' });
const _punchA           = import.meta.glob<string>('../resources/player_prototype/Combat/PunchA/*.png',         { eager: true, query: '?url', import: 'default' });
const _punchB           = import.meta.glob<string>('../resources/player_prototype/Combat/PunchB/*.png',         { eager: true, query: '?url', import: 'default' });
const _punchC           = import.meta.glob<string>('../resources/player_prototype/Combat/PunchC/*.png',         { eager: true, query: '?url', import: 'default' });
const _shockHeavy       = import.meta.glob<string>('../resources/player_prototype/Combat/ShockHeavy/*.png',     { eager: true, query: '?url', import: 'default' });
const _shockLight       = import.meta.glob<string>('../resources/player_prototype/Combat/ShockLight/*.png',     { eager: true, query: '?url', import: 'default' });
const _standingSlash    = import.meta.glob<string>('../resources/player_prototype/Combat/StandingSlash/*.png',  { eager: true, query: '?url', import: 'default' });
const _swordComboA      = import.meta.glob<string>('../resources/player_prototype/Combat/SwordComboA/*.png',    { eager: true, query: '?url', import: 'default' });
const _swordComboB      = import.meta.glob<string>('../resources/player_prototype/Combat/SwordComboB/*.png',    { eager: true, query: '?url', import: 'default' });
const _swordComboC      = import.meta.glob<string>('../resources/player_prototype/Combat/SwordComboC/*.png',    { eager: true, query: '?url', import: 'default' });
const _swordComboD      = import.meta.glob<string>('../resources/player_prototype/Combat/SwordComboD/*.png',    { eager: true, query: '?url', import: 'default' });
const _swordRunSlash    = import.meta.glob<string>('../resources/player_prototype/Combat/SwordRunSlash/*.png',  { eager: true, query: '?url', import: 'default' });
const _swordSlash01     = import.meta.glob<string>('../resources/player_prototype/Combat/SwordSlash01/*.png',   { eager: true, query: '?url', import: 'default' });
const _swordSprintSlash = import.meta.glob<string>('../resources/player_prototype/Combat/SwordSprintSlash/*.png', { eager: true, query: '?url', import: 'default' });
const _throwOverarm     = import.meta.glob<string>('../resources/player_prototype/Combat/ThrowOverarm/*.png',   { eager: true, query: '?url', import: 'default' });
const _throwUnderarm    = import.meta.glob<string>('../resources/player_prototype/Combat/ThrowUnderarm/*.png',  { eager: true, query: '?url', import: 'default' });
const _hit              = import.meta.glob<string>('../resources/player_prototype/Combat/Hit/*.png',            { eager: true, query: '?url', import: 'default' });
const _guard            = import.meta.glob<string>('../resources/player_prototype/Combat/Guard/*.png',          { eager: true, query: '?url', import: 'default' });
const _bowAim           = import.meta.glob<string>('../resources/player_prototype/Combat/BowAim/*.png',         { eager: true, query: '?url', import: 'default' });
const _bowDraw          = import.meta.glob<string>('../resources/player_prototype/Combat/BowDraw/*.png',        { eager: true, query: '?url', import: 'default' });
const _bowFire          = import.meta.glob<string>('../resources/player_prototype/Combat/BowFire/*.png',        { eager: true, query: '?url', import: 'default' });
const _gunFire          = import.meta.glob<string>('../resources/player_prototype/Combat/GunFire/*.png',        { eager: true, query: '?url', import: 'default' });
const _gunReload        = import.meta.glob<string>('../resources/player_prototype/Combat/GunReload/*.png',      { eager: true, query: '?url', import: 'default' });
const _gunRunFire       = import.meta.glob<string>('../resources/player_prototype/Combat/GunRunFire/*.png',     { eager: true, query: '?url', import: 'default' });

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
    bowAim:           sortedUrls(_bowAim),
    bowDraw:          sortedUrls(_bowDraw),
    bowFire:          sortedUrls(_bowFire),
    gunFire:          sortedUrls(_gunFire),
    gunReload:        sortedUrls(_gunReload),
    gunRunFire:       sortedUrls(_gunRunFire),
};
