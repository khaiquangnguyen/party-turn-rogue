import { Boot } from './scenes/Boot';
import { CombatSceneV2 } from './scenes/CombatSceneV2';
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
    scene: [Boot, Preloader, CombatSceneV2],
};

let _targetScene = 'CombatScene';

export const setTargetScene = (scene: string) => { _targetScene = scene; };
export const getTargetScene = () => _targetScene;

const StartGame = (parent: string) => {
    return new Game({ ...config, scale: { ...config.scale as object, parent } });
};

export default StartGame;
