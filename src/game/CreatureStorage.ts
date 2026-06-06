import { CreatureTemplate } from '../data/Creature/CreatureTemplate';
import { CloudSheep       } from '../data/Creature/creatures/CloudSheep';
import { ThunderBird      } from '../data/Creature/creatures/ThunderBird';
import { FloatingTurtle   } from '../data/Creature/creatures/FloatingTurtle';

const STORAGE_KEY = 'party-turn-rogue:creatures';

export const CREATURE_POOL: CreatureTemplate[] = [
    new CloudSheep(),
    new ThunderBird(),
    new FloatingTurtle(),
];

const CREATURE_REGISTRY: Record<string, () => CreatureTemplate> = {
    CloudSheep:     () => new CloudSheep(),
    ThunderBird:    () => new ThunderBird(),
    FloatingTurtle: () => new FloatingTurtle(),
};

export const CreatureStorage = {
    loadNames(): string[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as string[]) : [];
        } catch {
            return [];
        }
    },

    saveNames(names: string[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
        } catch {}
    },

    addCreature(creature: CreatureTemplate): void {
        const names = this.loadNames();
        const key   = creature.constructor.name;
        if (!names.includes(key)) names.push(key);
        this.saveNames(names);
    },

    loadCreatures(): CreatureTemplate[] {
        return this.loadNames()
            .map(n => CREATURE_REGISTRY[n]?.())
            .filter((c): c is CreatureTemplate => !!c);
    },

    randomFromPool(): CreatureTemplate {
        return CREATURE_POOL[Math.floor(Math.random() * CREATURE_POOL.length)];
    },
};
