import { CreatureTemplate, Gender } from '../CreatureTemplate.ts';
import { Need                      } from '../Need.ts';
import { SupportPassive, NoEnergyConsumeChance, AirLightningStrike, SpeedIncrease } from '../SupportPassive.ts';
import { FoodNeed                  } from '../FoodNeed.ts';
import { EdibleLightning           } from '../Food.ts';

export class ThunderBird extends CreatureTemplate {
    readonly name            = 'Thunder Bird';
    readonly gender: Gender  = 'Unknown';
    readonly personalities   = ['Bold', 'Volatile', 'Proud', 'Restless'] as const;
    readonly needs:           readonly Need[]           = [new FoodNeed([new EdibleLightning()])];
    readonly supportPassives: readonly SupportPassive[] = [
        new NoEnergyConsumeChance(),
        new AirLightningStrike(),
        new SpeedIncrease(),
    ];
}
