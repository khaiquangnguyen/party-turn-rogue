import { Expedition       } from './Expedition.ts';
import { WorldMod         } from '../WorldMods/WorldMod.ts';
import { ExtraDamageOnAir } from '../WorldMods/ExtraDamageOnAir.ts';
import { ExtraDamageWhenCrashIntoGround } from '../WorldMods/ExtraDamageWhenCrashIntoGround.ts';
import { Neutral          } from '../WorldMods/Neutral.ts';

const EXPEDITION_COUNT   = { min: 5, max: 6 } as const;
const WORLD_MODS_PER_EXP = { min: 2, max: 3 } as const;
const MAP_LENGTH         = 5;

const ALL_WORLD_MODS: (() => WorldMod)[] = [
    () => new ExtraDamageOnAir(),
    () => new ExtraDamageWhenCrashIntoGround(),
    () => new Neutral(),
];

const REGION_NAMES = [
    { title: 'Ashfeld Plains',  description: 'Scorched grasslands where old wars left their mark.'    },
    { title: 'Crimson Bluffs',  description: 'Rust-red cliffs riddled with narrow combat corridors.'  },
    { title: 'Storm Canopy',    description: 'Dense forest canopy churned by perpetual gale winds.'   },
    { title: 'Saltmarsh Flats', description: 'Brackish lowlands where the ground gives underfoot.'    },
    { title: 'Ember Ravine',    description: 'A volcanic fissure still venting heat from below.'      },
    { title: 'Frostline Ridge', description: 'A high-altitude ridge where ice cracks the rock face.'  },
];

function pickRandom<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n && copy.length; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
    }
    return result;
}

function randInt(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

export class WorldMap {
    readonly expeditions: readonly Expedition[];

    constructor(expeditions: readonly Expedition[]) {
        this.expeditions = expeditions;
    }

    static generate(): WorldMap {
        const count   = randInt(EXPEDITION_COUNT.min, EXPEDITION_COUNT.max);
        const regions = pickRandom(REGION_NAMES, count);

        const expeditions = regions.map(region => {
            const modCount = randInt(WORLD_MODS_PER_EXP.min, WORLD_MODS_PER_EXP.max);
            const worldMods = pickRandom(ALL_WORLD_MODS, modCount).map(f => f());
            return new Expedition(region, worldMods, MAP_LENGTH);
        });

        return new WorldMap(expeditions);
    }
}
