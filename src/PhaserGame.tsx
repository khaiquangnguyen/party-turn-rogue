import {forwardRef, useEffect, useLayoutEffect, useRef} from 'react';
import StartGame, { setTargetScene } from './game/main';
import {EventBus} from './game/EventBus';
import { Events } from './game/Events';

export interface IRefPhaserGame {
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps {
    currentActiveScene?: (scene_instance: Phaser.Scene) => void;
    targetScene?: string;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame({currentActiveScene, targetScene}, ref) {
    const game = useRef<Phaser.Game | null>(null!);

    useLayoutEffect(() => {
        if (game.current === null) {
            if (targetScene) setTargetScene(targetScene);
            game.current = StartGame("game-container");

            if (typeof ref === 'function') {
                ref({game: game.current, scene: null});
            } else if (ref) {
                ref.current = {game: game.current, scene: null};
            }

        }

        return () => {
            if (game.current) {
                game.current.destroy(true);
                if (game.current !== null) {
                    game.current = null;
                }
            }
        }
    }, [ref]);

    useEffect(() => {
        EventBus.on(Events.CURRENT_SCENE_READY, (scene_instance: Phaser.Scene) => {
            if (currentActiveScene && typeof currentActiveScene === 'function') {

                currentActiveScene(scene_instance);

            }

            if (typeof ref === 'function') {
                ref({game: game.current, scene: scene_instance});
            } else if (ref) {
                ref.current = {game: game.current, scene: scene_instance};
            }

        });
        return () => {
            EventBus.removeListener(Events.CURRENT_SCENE_READY);
        }
    }, [currentActiveScene, ref]);

    return (
        <div id="game-container"></div>
    );

});
