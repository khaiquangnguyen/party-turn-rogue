// Axial coordinates (q, r) for a hex grid.
export class HexCoord {
    constructor(
        readonly q: number,
        readonly r: number,
    ) {}

    get s(): number { return -this.q - this.r; }

    equals(other: HexCoord): boolean {
        return this.q === other.q && this.r === other.r;
    }

    key(): string { return `${this.q},${this.r}`; }

    neighbors(): HexCoord[] {
        return [
            new HexCoord(this.q + 1, this.r),
            new HexCoord(this.q - 1, this.r),
            new HexCoord(this.q,     this.r + 1),
            new HexCoord(this.q,     this.r - 1),
            new HexCoord(this.q + 1, this.r - 1),
            new HexCoord(this.q - 1, this.r + 1),
        ];
    }

    distanceTo(other: HexCoord): number {
        return Math.max(
            Math.abs(this.q - other.q),
            Math.abs(this.r - other.r),
            Math.abs(this.s - other.s),
        );
    }
}
