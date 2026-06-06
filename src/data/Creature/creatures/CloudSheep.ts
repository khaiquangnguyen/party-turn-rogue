import { CreatureTemplate, Gender, pickRandomPersonalities } from '../CreatureTemplate.ts';
import { Need                      } from '../Need.ts';
import { SupportPassive, NoEnergyConsumeChance, AirLightningStrike, SpeedIncrease } from '../SupportPassive.ts';
import { FoodNeed                  } from '../FoodNeed.ts';
import { EdibleCloud               } from '../Food.ts';

export class CloudSheep extends CreatureTemplate {
    readonly name            = 'Cloud Sheep';
    readonly gender: Gender  = 'Unknown';
    readonly gifUrl          = "https://img.pokemondb.net/sprites/black-white/anim/normal/mareep.gif";
    readonly personalities   = pickRandomPersonalities(['Gentle', 'Skittish', 'Fluffy-minded', 'Drifter']);
    readonly needs:           readonly Need[]           = [new FoodNeed([new EdibleCloud()])];
    readonly supportPassives: readonly SupportPassive[] = [
        new NoEnergyConsumeChance(),
        new AirLightningStrike(),
        new SpeedIncrease(),
    ];
}
