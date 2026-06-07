import { CreatureTemplate           } from './CreatureTemplate.ts';
import { SupportPassive             } from './SupportPassive.ts';
import { FoodTaste, TasteSentiment,
         pickRandomTastePreferences  } from './Food.ts';
import { SpecialFood, Berry         } from './Food.ts';
import { pickRandomSpecialFoods,
         pickRandomBerries           } from './AllFoods.ts';

export type InstanceGender = 'Male' | 'Female';

export interface TrackedTastePreference {
    readonly taste:           FoodTaste;
    readonly sentiment:       TasteSentiment;
    shown:                    boolean;
    readonly revealThreshold: number;
}

export interface TrackedFood<T extends SpecialFood | Berry> {
    readonly food:            T;
    shown:                    boolean;
    readonly revealThreshold: number;
}

function randomThreshold(): number {
    return Math.floor(Math.random() * 5) + 3; // 3–7 feedings
}

export class Creature {
    readonly template:             CreatureTemplate;
    readonly personalizedName:     string;
    readonly activePassives:       SupportPassive[];
    readonly gender:               InstanceGender | null;
    readonly tastePreferences:     TrackedTastePreference[];
    readonly favoriteSpecialFoods: TrackedFood<SpecialFood>[];
    readonly favoriteBerries:      TrackedFood<Berry>[];
    feedCount:                     number;
    happinessScore:                number;
    beautyScore:                   number;

    constructor(template: CreatureTemplate, personalizedName: string) {
        this.template         = template;
        this.personalizedName = personalizedName;
        this.activePassives   = [...template.supportPassives];
        this.gender           = template.gender === 'Genderless'
                                    ? null
                                    : Math.random() < 0.5 ? 'Male' : 'Female';

        this.tastePreferences = pickRandomTastePreferences().map(pref => ({
            taste:           pref.taste,
            sentiment:       pref.sentiment,
            shown:           false,
            revealThreshold: randomThreshold(),
        }));

        const specialCount          = Math.floor(Math.random() * 2) + 1;
        this.favoriteSpecialFoods   = pickRandomSpecialFoods(specialCount).map(food => ({
            food,
            shown:           false,
            revealThreshold: randomThreshold(),
        }));

        const berryCount     = Math.floor(Math.random() * 2) + 1;
        this.favoriteBerries = pickRandomBerries(berryCount).map(food => ({
            food,
            shown:           false,
            revealThreshold: randomThreshold(),
        }));

        this.feedCount      = 0;
        this.happinessScore = 0;
        this.beautyScore    = 0;
    }

    recordFeeding(): void {
        this.feedCount++;
        for (const pref of this.tastePreferences) {
            if (!pref.shown && this.feedCount >= pref.revealThreshold) pref.shown = true;
        }
        for (const entry of this.favoriteSpecialFoods) {
            if (!entry.shown && this.feedCount >= entry.revealThreshold) entry.shown = true;
        }
        for (const entry of this.favoriteBerries) {
            if (!entry.shown && this.feedCount >= entry.revealThreshold) entry.shown = true;
        }
    }
}
