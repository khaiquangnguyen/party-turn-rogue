import { HexCoord               } from './HexCoord.ts';
import { HexNode, NodeVisibility } from './HexNode.ts';
import { NodeInfo, EncounterNodeInfo, ResourceNodeInfo } from './NodeInfo.ts';

export class HexMap {
    private readonly _nodes: Map<string, HexNode> = new Map();

    addNode(coord: HexCoord, info: NodeInfo | null = null): HexNode {
        const node = new HexNode(coord, info);
        this._nodes.set(coord.key(), node);
        return node;
    }

    getNode(coord: HexCoord): HexNode | undefined {
        return this._nodes.get(coord.key());
    }

    hasNode(coord: HexCoord): boolean {
        return this._nodes.has(coord.key());
    }

    get allNodes(): HexNode[] {
        return Array.from(this._nodes.values());
    }

    getNeighbors(coord: HexCoord): HexNode[] {
        return coord.neighbors()
            .map(c => this._nodes.get(c.key()))
            .filter((n): n is HexNode => n !== undefined);
    }

    revealAround(coord: HexCoord, radius: number = 1): void {
        for (const node of this._nodes.values()) {
            if (coord.distanceTo(node.coord) <= radius) {
                node.visibility = NodeVisibility.Visible;
            }
        }
    }

    // Distributes the given encounters and resources onto empty nodes, excluding
    // the coords in `reservedCoords` (e.g. entry and exit).
    // Candidate nodes are sorted by distance from `originCoord` and split into
    // equal-sized zones; one node is picked at random within each zone, giving
    // spread without pure clustering.
    distributeRandom(
        encounters:    EncounterNodeInfo[],
        resources:     ResourceNodeInfo[],
        originCoord:   HexCoord,
        reservedCoords: HexCoord[] = [],
    ): void {
        const items: NodeInfo[] = [...encounters, ...resources];
        if (items.length === 0) return;

        const reservedKeys = new Set(reservedCoords.map(c => c.key()));
        const candidates = Array.from(this._nodes.values())
            .filter(n => !reservedKeys.has(n.coord.key()) && n.isEmpty)
            .sort((a, b) => a.coord.distanceTo(originCoord) - b.coord.distanceTo(originCoord));

        if (candidates.length < items.length) {
            throw new Error(
                `Not enough empty nodes (${candidates.length}) to place ${items.length} items`,
            );
        }

        // Shuffle items so encounter/resource types are interleaved across zones
        const shuffledItems = shuffled(items);

        const zoneSize = candidates.length / shuffledItems.length;
        for (let i = 0; i < shuffledItems.length; i++) {
            const zoneStart = Math.floor(i * zoneSize);
            const zoneEnd   = Math.floor((i + 1) * zoneSize);
            const zone      = candidates.slice(zoneStart, zoneEnd);
            const pick      = zone[Math.floor(Math.random() * zone.length)];
            pick.info       = shuffledItems[i];
        }
    }
}

function shuffled<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}
