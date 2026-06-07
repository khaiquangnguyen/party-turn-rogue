import { CreatureTemplate, CreatureConstructor, SpeciesGender, pickRandomPersonalities } from '../CreatureTemplate.ts';
import { SupportPassive, NoEnergyConsumeChance, AirLightningStrike, SpeedIncrease } from '../SupportPassive.ts';
import { Food, SpecialFood, EdibleCloud } from '../Food.ts';
import { ALL_PERSONALITIES            } from '../Personality.ts';

export class AncientTortoise extends CreatureTemplate {
    readonly name             = 'Ancient Tortoise';
    readonly gender: SpeciesGender = 'Gendered';
    readonly gifUrl           = "https://img.pokemondb.net/sprites/black-white/anim/normal/torterra.gif";
    readonly personalities    = pickRandomPersonalities(ALL_PERSONALITIES);
    readonly acceptableFoods:    readonly Food[]        = [new EdibleCloud()];
    readonly allowedSpecialFoods: readonly SpecialFood[] = [];
    readonly supportPassives: readonly SupportPassive[] = [
        new NoEnergyConsumeChance(),
        new AirLightningStrike(),
        new SpeedIncrease(),
    ];
    readonly nextEvolution: CreatureConstructor | null = null;
}
