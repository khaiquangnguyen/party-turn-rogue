import { CreatureTemplate, CreatureConstructor, SpeciesGender, pickRandomPersonalities } from '../CreatureTemplate.ts';
import { SupportPassive, NoEnergyConsumeChance, AirLightningStrike, SpeedIncrease } from '../SupportPassive.ts';
import { Food, SpecialFood, EdibleCloud, EdibleLightning } from '../Food.ts';
import { ALL_PERSONALITIES            } from '../Personality.ts';

export class StormRam extends CreatureTemplate {
    readonly name             = 'Storm Ram';
    readonly gender: SpeciesGender = 'Gendered';
    readonly gifUrl           = "https://img.pokemondb.net/sprites/black-white/anim/normal/ampharos.gif";
    readonly personalities    = pickRandomPersonalities(ALL_PERSONALITIES);
    readonly acceptableFoods:    readonly Food[]        = [new EdibleCloud(), new EdibleLightning()];
    readonly allowedSpecialFoods: readonly SpecialFood[] = [];
    readonly supportPassives: readonly SupportPassive[] = [
        new NoEnergyConsumeChance(),
        new AirLightningStrike(),
        new SpeedIncrease(),
    ];
    readonly nextEvolution: CreatureConstructor | null = null;
}
