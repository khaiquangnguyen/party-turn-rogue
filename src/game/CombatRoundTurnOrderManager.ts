import { CombatSceneCharacter } from './entities/CombatSceneCharacter';

export class CombatRoundTurnOrderManager {
    private readonly allCharacters: CombatSceneCharacter[];
    private queue: CombatSceneCharacter[] = [];
    private roundNumber = 1;

    constructor(characters: CombatSceneCharacter[]) {
        this.allCharacters = characters;
        this.queue = this.buildOrder();
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    getRoundNumber(): number {
        return this.roundNumber;
    }

    /** The character whose turn it currently is, or null if the round just ended. */
    getCurrentActor(): CombatSceneCharacter | null {
        return this.queue[0] ?? null;
    }

    /** Ordered list of characters still to act this round. */
    getRemainingQueue(): readonly CombatSceneCharacter[] {
        return this.queue;
    }

    // ── Mutation ──────────────────────────────────────────────────────────────

    /**
     * Mark the current actor as having acted and advance to the next.
     * If all living characters have acted, a new round begins automatically.
     */
    confirmActed(): void {
        const actor = this.queue.shift();
        if (actor) actor.hasActedThisRound = true;

        // Skip dead characters remaining in the queue
        while (this.queue.length > 0 && !this.queue[0].isAlive) {
            this.queue.shift();
        }

        if (this.queue.length === 0) this.startNewRound();
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private startNewRound(): void {
        this.roundNumber++;
        for (const c of this.allCharacters) c.resetForNewRound();
        this.queue = this.buildOrder();
    }

    /** Sort living characters by speed descending; ties resolved player-first. */
    private buildOrder(): CombatSceneCharacter[] {
        return this.allCharacters
            .filter(c => c.isAlive)
            .sort((a, b) => {
                if (b.speed !== a.speed) return b.speed - a.speed;
                return a.isPlayer ? -1 : 1; // players win ties
            });
    }
}
