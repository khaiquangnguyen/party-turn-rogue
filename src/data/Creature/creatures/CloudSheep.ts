import { CreatureTemplate, Gender } from '../CreatureTemplate.ts';
import { Need                      } from '../Need.ts';
import { SupportPassive, NoEnergyConsumeChance, AirLightningStrike, SpeedIncrease } from '../SupportPassive.ts';
import { FoodNeed                  } from '../FoodNeed.ts';
import { EdibleCloud               } from '../Food.ts';

export class CloudSheep extends CreatureTemplate {
    readonly name            = 'Cloud Sheep';
    readonly gender: Gender  = 'Unknown';
    readonly personalities   = ['Gentle', 'Skittish', 'Fluffy-minded', 'Drifter'] as const;
    readonly needs:           readonly Need[]           = [new FoodNeed([new EdibleCloud()])];
    readonly supportPassives: readonly SupportPassive[] = [
        new NoEnergyConsumeChance(),
        new AirLightningStrike(),
        new SpeedIncrease(),
    ];
}
