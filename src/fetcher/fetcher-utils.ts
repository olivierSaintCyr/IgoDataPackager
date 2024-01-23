import { Tile } from './Tile';
import TileGrid from 'ol/tilegrid/TileGrid';
import { fromExtent } from 'ol/geom/Polygon.js';
import { MultiPolygon, Polygon, Position } from 'geojson';
import { transformExtent } from 'ol/proj.js';
import { GEOJSON_PROJECTION } from '../constants';
import intersect from '@turf/intersect';
import centroid from '@turf/centroid';
import { TileCoord } from 'ol/tilecoord';
import proj4 from 'proj4';

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

export const isTileInsideTileGrid = (tile: Tile, tileGrid: TileGrid): boolean => {
    const extent = tileGrid.getTileCoordExtent([ tile.z, tile.x, tile.y]);
    return !extent.includes(NaN);
}

export const getAllChildTiles = (root: Tile, maxLevel: number, tileGrid: TileGrid): Tile[] => {
    const tiles: Tile[] = []

    const recursion = (current: Tile) => {
        if (!isTileInsideTileGrid(current, tileGrid)) {
            return;
        }

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

export const getTilePolygon = (tile: Tile, tileGrid: TileGrid, tileProj: string): Polygon => {
    const extent = tileGrid.getTileCoordExtent([tile.z, tile.x, tile.y]);
    const transformedExtent = transformExtent(extent, tileProj, GEOJSON_PROJECTION);
    
    const polygon = fromExtent(transformedExtent);
    const coordinates = polygon.getCoordinates()
    return {
        type: "Polygon",
        coordinates,
    };
}


export const isTileInPolygon = (tile: Tile, polygon: Polygon, tileGrid: TileGrid, tileProj: string): boolean => {
    const tilePolygon = getTilePolygon(tile, tileGrid, tileProj);
    return !!intersect(tilePolygon, polygon);
}

export const isTileInMultiPolygon = (tile: Tile, multipolygon: MultiPolygon, tileGrid: TileGrid, tileProj: string): boolean => {
    const tilePolygon = getTilePolygon(tile, tileGrid, tileProj);
    
    for (const coordinates of multipolygon.coordinates) {
        const polygon: Polygon = {
            type: "Polygon",
            coordinates,
        }

        if (!!intersect(tilePolygon, polygon)) {
            return true;
        }
    }
    return false;
}

export const getNeighboringTiles = (tile: Tile, tileGrid: TileGrid): Tile[] => {
    const { x: startX, y: startY, z } = tile;
    const tiles: Tile[] = [];
    const deltas = [1, -1];

    for (const i of deltas) {
        const neighboor = {
            x: startX + i,
            y: startY,
            z
        }

        if (isTileInsideTileGrid(neighboor, tileGrid)) {
            tiles.push(neighboor);
        }
    }

    for (const j of deltas) {
        const neighboor = {
            x: startX,
            y: startY + j,
            z
        }

        if (isTileInsideTileGrid(neighboor, tileGrid)) {
            tiles.push(neighboor);
        } 
    }
    return tiles;
}

const tileCoordToTile = (tileCoord: TileCoord): Tile => {
    return {
        x: tileCoord[1],
        y: tileCoord[2],
        z: tileCoord[0],
    }
}

const getAllTileInPolygonAtLevel = (
    polygon: Polygon,
    center: Position,
    z: number,
    tileGrid: TileGrid,
    tileProj: string,
) => {

    const getTileXY = ({ x, y }: Tile) => `${x},${y}`;

    const centerProj = proj4(GEOJSON_PROJECTION, tileProj, center)
    console.log({center, centerProj})
    const centerTileCoord = tileGrid.getTileCoordForCoordAndZ([centerProj[0], centerProj[1]], z);
    const centerTile = tileCoordToTile(centerTileCoord);

    const visited = new Set<string>();
    const toVisit = [centerTile];

    const tiles = []
    while (toVisit.length != 0) {
        const current = toVisit.shift()!;

        const xy = getTileXY(current);
        if (visited.has(xy)) {
            continue;
        }

        visited.add(xy);

        if (!isTileInPolygon(current, polygon, tileGrid, tileProj)) {
            continue;
        }

        tiles.push(current);
        
        const neighbors = getNeighboringTiles(current, tileGrid);
        toVisit.push(...neighbors);
    }
    return tiles;
}
    
export const getAllTileInPolygon = (polygon: Polygon, startZ: number, endZ: number, tileGrid: TileGrid, tileProj: string)  => {
    const center = centroid(polygon).geometry.coordinates;
    
    const tiles = []
    for (let z = startZ; z <= endZ; z++) {
        const tilesAtLevel = getAllTileInPolygonAtLevel(
            polygon,
            center,
            z,
            tileGrid,
            tileProj,
        )
        tiles.push(...tilesAtLevel);
    }
    return tiles;
}

export const getAllTileInMultiPolygon = (multiPolygon: MultiPolygon, startZ: number, endZ: number, tileGrid: TileGrid, tileProj: string) => {

    const removeDuplicateTiles = (tiles: Tile[]): Tile[] => {
        const getTileXYZ = ({ x, y, z }: Tile) => {
            return `${x},${y},${z}`;
        };
        
        const xyzs = new Set<string>(tiles.map(getTileXYZ));

        return [...xyzs.values()].map(xyz => {
            const values = xyz.split(',');
            return {
                x: parseInt(values[0]),
                y: parseInt(values[1]),
                z: parseInt(values[2]),
            }
        });
    }

    const polygons: Polygon[] = multiPolygon.coordinates
        .map(coordinates => { 
            return { 
                type: 'Polygon',
                coordinates,
            };
        });
    
    const tiles: Tile[] = polygons.flatMap((polygon) => {
        return getAllTileInPolygon(
            polygon,
            startZ,
            endZ,
            tileGrid,
            tileProj,
        );
    });

    return removeDuplicateTiles(tiles);
}
