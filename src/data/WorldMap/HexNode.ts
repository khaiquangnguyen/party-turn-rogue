import { HexCoord } from './HexCoord.ts';
import { NodeInfo  } from './NodeInfo.ts';

export enum NodeVisibility {
    Hidden  = 'Hidden',
    Visible = 'Visible',
}

export class HexNode {
    readonly coord: HexCoord;
    info:           NodeInfo | null;
    visibility:     NodeVisibility;
    visited:        boolean;

    constructor(coord: HexCoord, info: NodeInfo | null = null) {
        this.coord      = coord;
        this.info       = info;
        this.visibility = NodeVisibility.Hidden;
        this.visited    = false;
    }

    get isEmpty(): boolean { return this.info === null; }
}
