import { Boot } from './scenes/Boot';
import { CombatScene } from './scenes/CombatScene';
import { AUTO, Game, Scale } from 'phaser';
import { Preloader } from './scenes/Preloader';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    backgroundColor: '#90ee90',
    pixelArt: true,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
        width: 3840,
        height: 2160,
        parent: 'game-container',
        fullscreenTarget: 'game-container',
    },
    scene: [Boot, Preloader, CombatScene],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, scale: { ...config.scale as object, parent } });
};

export default StartGame;
