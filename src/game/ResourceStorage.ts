// Persistent (cross-run) resource store — backed by localStorage.
// Keys are Food class names; values are integer quantities.

import type { Food } from '../data/Creature/Food';

export type ResourceCounts = Record<string, number>;

const STORAGE_KEY = 'party-turn-rogue:resources';

export const ResourceStorage = {
    load(): ResourceCounts {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as ResourceCounts) : {};
        } catch {
            return {};
        }
    },

    save(counts: ResourceCounts): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
        } catch {
            // quota exceeded — silently skip
        }
    },

    addFood(food: Food, qty = 1): ResourceCounts {
        const counts = this.load();
        const key    = food.constructor.name;
        counts[key]  = (counts[key] ?? 0) + qty;
        this.save(counts);
        return counts;
    },
};
