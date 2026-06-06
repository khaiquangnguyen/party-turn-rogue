import { RegionInfo } from './RegionInfo.ts';
import { WorldMod   } from '../WorldMods/WorldMod.ts';
import { LinearMap  } from '../LinearMap/LinearMap.ts';

export class Expedition {
    readonly region:    RegionInfo;
    readonly worldMods: readonly WorldMod[];
    readonly map:       LinearMap;

    constructor(region: RegionInfo, worldMods: readonly WorldMod[], mapLength: number = 12) {
        this.region    = region;
        this.worldMods = worldMods;
        this.map       = new LinearMap(mapLength);
    }
}
