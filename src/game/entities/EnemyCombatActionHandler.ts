import { Scene } from 'phaser';
import { EnemyCombatAction, AttackDirection, QTEEventType, QTEOutcome } from './CombatTypes';
import { EventBus } from '../EventBus';
import { Events } from '../Events';

export class EnemyCombatActionHandler {
    private readonly scene:  Scene;
    private readonly action: EnemyCombatAction;

    constructor(scene: Scene, action: EnemyCombatAction) {
        this.scene  = scene;
        this.action = action;
    }

    // Resolves with the QTE outcome once the player presses a key or duration expires.
    execute(): Promise<QTEOutcome> {
        const promptTimer = this.scene.time.delayedCall(200, () => {
            EventBus.emit(Events.COMBAT_V2_QTE_START, {
                direction: this.action.direction,
                duration:  this.action.duration - 200,
            });
        });

        const keyW = this.scene.input.keyboard!.addKey('W');
        const keyA = this.scene.input.keyboard!.addKey('A');
        const keyS = this.scene.input.keyboard!.addKey('S');
        const keyD = this.scene.input.keyboard!.addKey('D');

        const cleanup = () => {
            keyW.destroy(); keyA.destroy(); keyS.destroy(); keyD.destroy();
            promptTimer.remove(false);
            EventBus.emit(Events.COMBAT_V2_QTE_END);
        };

        const toOutcome = (dir: AttackDirection | null): QTEOutcome => ({
            type:      dir === this.action.direction ? QTEEventType.Parry : 'None',
            direction: this.action.direction,
        });

        const timeout = new Promise<QTEOutcome>(resolve =>
            this.scene.time.delayedCall(this.action.duration, () => resolve(toOutcome(null)))
        );

        const keyPress = new Promise<QTEOutcome>(resolve => {
            keyW.on('down', () => resolve(toOutcome(AttackDirection.UP)));
            keyA.on('down', () => resolve(toOutcome(AttackDirection.LEFT)));
            keyS.on('down', () => resolve(toOutcome(AttackDirection.DOWN)));
            keyD.on('down', () => resolve(toOutcome(AttackDirection.RIGHT)));
        });

        return Promise.any([timeout, keyPress]).then(outcome => {
            cleanup();
            return outcome;
        });
    }
}
