import { CreatureTemplate, CreatureConstructor, SpeciesGender, pickRandomPersonalities } from '../CreatureTemplate.ts';
import { SupportPassive, NoEnergyConsumeChance, AirLightningStrike, SpeedIncrease } from '../SupportPassive.ts';
import { Food, SpecialFood, EdibleLightning } from '../Food.ts';
import { ThunderPhoenix               } from './ThunderPhoenix.ts';
import { ALL_PERSONALITIES            } from '../Personality.ts';

export class ThunderBird extends CreatureTemplate {
    readonly name             = 'Thunder Bird';
    readonly gender: SpeciesGender = 'Gendered';
    readonly gifUrl           = "https://img.pokemondb.net/sprites/black-white/anim/normal/zapdos.gif";
    readonly personalities    = pickRandomPersonalities(ALL_PERSONALITIES);
    readonly acceptableFoods:    readonly Food[]        = [new EdibleLightning()];
    readonly allowedSpecialFoods: readonly SpecialFood[] = [];
    readonly supportPassives: readonly SupportPassive[] = [
        new NoEnergyConsumeChance(),
        new AirLightningStrike(),
        new SpeedIncrease(),
    ];
    readonly nextEvolution: CreatureConstructor | null = ThunderPhoenix;
}
