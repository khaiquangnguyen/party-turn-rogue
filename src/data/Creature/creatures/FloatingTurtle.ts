import { CreatureTemplate, Gender, pickRandomPersonalities } from '../CreatureTemplate.ts';
import { Need                      } from '../Need.ts';
import { SupportPassive, NoEnergyConsumeChance, AirLightningStrike, SpeedIncrease } from '../SupportPassive.ts';
import { FoodNeed                  } from '../FoodNeed.ts';
import { EdibleCloud               } from '../Food.ts';

export class FloatingTurtle extends CreatureTemplate {
    readonly name            = 'Floating Turtle';
    readonly gender: Gender  = 'Unknown';
    readonly gifUrl          = "https://img.pokemondb.net/sprites/black-white/anim/normal/torkoal.gif";
    readonly personalities   = pickRandomPersonalities(['Stoic', 'Patient', 'Wandering', 'Ancient']);
    readonly needs:           readonly Need[]           = [new FoodNeed([new EdibleCloud()])];
    readonly supportPassives: readonly SupportPassive[] = [
        new NoEnergyConsumeChance(),
        new AirLightningStrike(),
        new SpeedIncrease(),
    ];
}
