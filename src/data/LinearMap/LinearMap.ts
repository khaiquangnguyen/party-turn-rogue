import { LinearMapNode } from './LinearMapNode.ts';

export class LinearMap {
    readonly nodes: readonly LinearMapNode[];
    private _currentIndex: number = 0;

    constructor(length: number) {
        this.nodes = Array.from({ length }, () => new LinearMapNode());
    }

    get currentIndex(): number { return this._currentIndex; }

    get currentNode(): LinearMapNode | null {
        return this.nodes[this._currentIndex] ?? null;
    }

    get isComplete(): boolean { return this._currentIndex >= this.nodes.length; }

    advanceNode(): void {
        if (this.isComplete) return;
        this.nodes[this._currentIndex].completed = true;
        this._currentIndex++;
    }
}
