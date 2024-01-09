import { Tile } from './Tile';

export const zoom = (tile: Tile): Tile[] => {
    const x0 = 2 * tile.x;
    const y0 = 2 * tile.y;
    const z = tile.z + 1;
    const tiles: Tile[] = [];
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            tiles.push({ x: x0 + i, y: y0 + j, z: z});
        }
    }
    return tiles;
}

export function deZoom(tile: Tile): Tile | undefined {
    if (tile.z === 0) {
        return;
    }

    const x = Math.floor(tile.x / 2);
    const y = Math.floor(tile.y / 2);
    const z = tile.z - 1;

    return { x, y, z };
}

export const getAllChildTiles = (root: Tile, maxLevel: number): Tile[] => {
    const tiles: Tile[] = []

    const recursion = (current: Tile) => {
        if (current.z === maxLevel) {
            tiles.push(current);
            return;
        }
        
        tiles.push(current);
        
        const children = zoom(current);
        children.forEach((child) => {
            recursion(child);
        });
    }

    recursion(root);
    return tiles;
};
