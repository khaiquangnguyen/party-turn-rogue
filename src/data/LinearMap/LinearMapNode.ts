export interface NodeReward {
    // reserved for future rewards
}

export class LinearMapNode {
    completed: boolean = false;
    readonly reward: NodeReward;

    constructor() {
        this.reward = {};
    }
}
