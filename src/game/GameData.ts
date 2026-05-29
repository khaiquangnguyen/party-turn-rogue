import { PlayableCharacter } from './entities/PlayableCharacter';

let _selectedCharacter: PlayableCharacter | null = null;

export const GameData = {
    setSelectedCharacter(char: PlayableCharacter): void {
        _selectedCharacter = char;
    },
    getSelectedCharacter(): PlayableCharacter | null {
        return _selectedCharacter;
    }
};
