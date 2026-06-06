import { ForceAirborne }  from './ComboMod/ForceAirborne';
import { Slammer }        from './ComboMod/Slammer';
import { AmateurDancer }  from './ComboMod/AmateurDancer';
import { ComboMaster }    from './ComboMod/ComboMaster';
import { HitAndRun }      from './ComboMod/HitAndRun';
import { AirSpecialist }  from './ComboMod/AirSpecialist';
import type { ComboMod }  from './ComboMod/ComboMod';

export const MAX_COMBO_MODS = 4;

export const COMBO_MOD_POOL: ComboMod[] = [
    new ForceAirborne(),
    new Slammer(),
    new AmateurDancer(),
    new ComboMaster(),
    new HitAndRun(),
    new AirSpecialist(),
];
