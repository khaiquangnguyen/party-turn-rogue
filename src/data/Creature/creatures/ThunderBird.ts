import { CreatureTemplate, Gender, pickRandomPersonalities } from '../CreatureTemplate.ts';
import { Need                      } from '../Need.ts';
import { SupportPassive, NoEnergyConsumeChance, AirLightningStrike, SpeedIncrease } from '../SupportPassive.ts';
import { FoodNeed                  } from '../FoodNeed.ts';
import { EdibleLightning           } from '../Food.ts';

export class ThunderBird extends CreatureTemplate {
    readonly name            = 'Thunder Bird';
    readonly gender: Gender  = 'Unknown';
    readonly gifUrl          = "https://img.pokemondb.net/sprites/black-white/anim/normal/zapdos.gif";
    readonly personalities   = pickRandomPersonalities(['Bold', 'Volatile', 'Proud', 'Restless']);
    readonly needs:           readonly Need[]           = [new FoodNeed([new EdibleLightning()])];
    readonly supportPassives: readonly SupportPassive[] = [
        new NoEnergyConsumeChance(),
        new AirLightningStrike(),
        new SpeedIncrease(),
    ];
}
