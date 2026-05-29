import { PlayableCharacter, PlayableCharacterConfig } from './PlayableCharacter';

const PLAYABLE_CHARACTER_CONFIG: PlayableCharacterConfig = {
    name:      'Playable Character',
    maxHealth: 100,
    maxEnergy: 60,
    speed:     12,
};

export function createAllCharacters(): PlayableCharacter[] {
    return [new PlayableCharacter(PLAYABLE_CHARACTER_CONFIG)];
}
