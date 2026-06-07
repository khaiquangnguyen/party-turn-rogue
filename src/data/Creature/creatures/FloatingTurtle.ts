import { CreatureTemplate, CreatureConstructor, SpeciesGender, pickRandomPersonalities } from '../CreatureTemplate.ts';
import { SupportPassive, NoEnergyConsumeChance, AirLightningStrike, SpeedIncrease } from '../SupportPassive.ts';
import { Food, SpecialFood, EdibleCloud } from '../Food.ts';
import { AncientTortoise              } from './AncientTortoise.ts';
import { ALL_PERSONALITIES            } from '../Personality.ts';

export class FloatingTurtle extends CreatureTemplate {
    readonly name             = 'Floating Turtle';
    readonly gender: SpeciesGender = 'Gendered';
    readonly gifUrl           = "https://img.pokemondb.net/sprites/black-white/anim/normal/torkoal.gif";
    readonly personalities    = pickRandomPersonalities(ALL_PERSONALITIES);
    readonly acceptableFoods:    readonly Food[]        = [new EdibleCloud()];
    readonly allowedSpecialFoods: readonly SpecialFood[] = [];
    readonly supportPassives: readonly SupportPassive[] = [
        new NoEnergyConsumeChance(),
        new AirLightningStrike(),
        new SpeedIncrease(),
    ];
    readonly nextEvolution: CreatureConstructor | null = AncientTortoise;
}
