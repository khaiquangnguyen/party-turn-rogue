import { PlayableCharacter } from './PlayableCharacter';
import { TheGrandDancer } from '../../characters/GrandDancer/TheGrandDancer';

export function createAllCharacters(): PlayableCharacter[] {
    return [new TheGrandDancer()];
}
