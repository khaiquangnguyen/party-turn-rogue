import { Scene } from 'phaser';
import { EnemyCombatAction, AttackDirection, QTEEventType, QTEOutcome } from './CombatTypes';
import { EventBus } from '../EventBus';
import { Events } from '../Events';
import { QTE_PARRY_WINDOW } from '../combatConstants';

export class EnemyCombatActionHandler {
    private readonly scene:  Scene;
    private readonly action: EnemyCombatAction;

    constructor(scene: Scene, action: EnemyCombatAction) {
        this.scene  = scene;
        this.action = action;
    }

    // Resolves with the QTE outcome once the player presses a key or duration expires.
    execute(): Promise<QTEOutcome> {
        // Gate: key presses only count as parry during the last QTE_PARRY_WINDOW ms.
        let parryWindowOpen = false;
        const parryWindowTimer = this.scene.time.delayedCall(
            this.action.duration - QTE_PARRY_WINDOW,
            () => { parryWindowOpen = true; },
        );

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
            parryWindowTimer.remove(false);
            EventBus.emit(Events.COMBAT_V2_QTE_END);
        };

        const toOutcome = (dir: AttackDirection | null): QTEOutcome => {
            if (dir === null) return { type: 'None', direction: this.action.direction };
            if (dir === this.action.direction) return { type: QTEEventType.Parry, direction: this.action.direction };
            return { type: QTEEventType.WrongBlock, direction: this.action.direction };
        };

        const timeout = new Promise<QTEOutcome>(resolve =>
            this.scene.time.delayedCall(this.action.duration, () => resolve(toOutcome(null)))
        );

        // Early presses are silently ignored; only presses within the parry window resolve.
        const keyPress = new Promise<QTEOutcome>(resolve => {
            const check = (dir: AttackDirection) => { if (parryWindowOpen) resolve(toOutcome(dir)); };
            keyW.on('down', () => check(AttackDirection.UP));
            keyA.on('down', () => check(AttackDirection.LEFT));
            keyS.on('down', () => check(AttackDirection.DOWN));
            keyD.on('down', () => check(AttackDirection.RIGHT));
        });

        return Promise.any([timeout, keyPress]).then(outcome => {
            cleanup();
            return outcome;
        });
    }
}
