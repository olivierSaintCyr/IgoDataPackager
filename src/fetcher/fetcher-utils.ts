import { Tile } from './Tile';
import TileGrid from 'ol/tilegrid/TileGrid';
import { fromExtent } from 'ol/geom/Polygon.js';
import { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import { transformExtent } from 'ol/proj.js';
import { GEOJSON_PROJECTION } from '../constants';
import centroid from '@turf/centroid';
import { TileCoord } from 'ol/tilecoord';
import proj4 from 'proj4';
import booleanIntersects from '@turf/boolean-intersects';
import { BBox, bbox, bboxPolygon } from '@turf/turf';
import { intersect } from '@turf/turf';
import RBush from 'rbush';
import { GeometryBbox } from './geometry-bbox.interface';

export const zoom = (tile: Tile): Tile[] => {
    const x0 = 2 * tile.x;
    const y0 = 2 * tile.y;
    const z = tile.z + 1;
    const tiles: Tile[] = [];
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            tiles.push({ x: x0 + i, y: y0 + j, z: z });
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
    const extent = tileGrid.getTileCoordExtent([tile.z, tile.x, tile.y]);
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
    const coordinates = polygon.getCoordinates();
    return {
        type: "Polygon",
        coordinates,
    };
}


export const isTileInPolygon = (tile: Tile, polygon: Polygon, tileGrid: TileGrid, tileProj: string): boolean => {
    const tilePolygon = getTilePolygon(tile, tileGrid, tileProj);
    return booleanIntersects(tilePolygon, polygon);
}

export const isTileInMultiPolygon = (tile: Tile, multipolygon: MultiPolygon, tileGrid: TileGrid, tileProj: string): boolean => {
    const tilePolygon = getTilePolygon(tile, tileGrid, tileProj);

    for (const coordinates of multipolygon.coordinates) {
        const polygon: Polygon = {
            type: "Polygon",
            coordinates,
        }

        if (booleanIntersects(tilePolygon, polygon)) {
            return true;
        }
    }
    return false;
}

export const isTileInComplexPolygon = (tile: Tile, tileGrid: TileGrid, tileProj: string, subPolygonIndex: RBush<GeometryBbox>) => {
    const tilePolygon = getTilePolygon(tile, tileGrid, tileProj);
    const [minX, minY, maxX, maxY] = bbox(tilePolygon);

    const possibles = subPolygonIndex.search({ minX, minY, maxX, maxY });
    for (const { geometry } of possibles) {
        if (booleanIntersects(tilePolygon, geometry)) {
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

    for (const i of deltas) {
        for (const j of deltas) {
            const neighboor = {
                x: startX + i,
                y: startY + j,
                z
            }
            if (isTileInsideTileGrid(neighboor, tileGrid)) {
                tiles.push(neighboor);
            }
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
    center: Position,
    z: number,
    tileGrid: TileGrid,
    tileProj: string,
    isTileInPolygonCallback: (tile: Tile, tileGrid: TileGrid, tileProj: string) => boolean,
) => {

    const getTileXY = ({ x, y }: Tile) => `${x},${y}`;

    const centerProj = proj4(GEOJSON_PROJECTION, tileProj, center)

    console.log(`Starting get all tile at level: ${z}`);

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

        if (!isTileInPolygonCallback(current, tileGrid, tileProj)) {
            continue;
        }

        tiles.push(current);

        const neighbors = getNeighboringTiles(current, tileGrid);
        toVisit.push(...neighbors);
    }
    return tiles;
}
    
const getAllTilesInPolygonInternal = (polygon: Polygon, startZ: number, endZ: number, tileGrid: TileGrid, tileProj: string, isTileInPolygonCallback: (tile: Tile, tileGrid: TileGrid, tileProj: string) => boolean)  => {
    const center = centroid(polygon).geometry.coordinates;
    
    const tiles = []
    for (let z = startZ; z <= endZ; z++) {
        const tilesAtLevel = getAllTileInPolygonAtLevel(
            center,
            z,
            tileGrid,
            tileProj,
            isTileInPolygonCallback,
        )

        // can't use tiles.push(...tilesAtLevel); => lead to maximum call stack error.
        for (const tile of tilesAtLevel) {
            tiles.push(tile);
        }
    }
    return tiles;
}

const getAllTilesInMultiPolygonInternal = (multiPolygon: MultiPolygon, startZ: number, endZ: number, tileGrid: TileGrid, tileProj: string, isTileInPolygonCallback: (tile: Tile, polygon: Polygon, tileGrid: TileGrid, tileProj: string) => boolean) => {

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
        console.log(`Getting tile in new polygon`);
        return getAllTilesInPolygonInternal(
            polygon,
            startZ,
            endZ,
            tileGrid,
            tileProj,
            (tile, tileGrid, tileProj) => isTileInPolygonCallback(tile, polygon, tileGrid, tileProj),
        );
    });

    return removeDuplicateTiles(tiles);
}

export const getAllTilesInPolygon = (polygon: Polygon, startZ: number, endZ: number, tileGrid: TileGrid, tileProj: string) => {
    return getAllTilesInPolygonInternal(
        polygon,
        startZ,
        endZ,
        tileGrid,
        tileProj,
        (tile, tileGrid, tileProj) => isTileInPolygon(tile, polygon, tileGrid, tileProj),
    )
}

export const getAllTilesInComplexPolygon = (polygon: Polygon, startZ: number, endZ: number, tileGrid: TileGrid, tileProj: string, subPolygonIndex: RBush<GeometryBbox>) => {
    return getAllTilesInPolygonInternal(
        polygon,
        startZ,
        endZ,
        tileGrid,
        tileProj,
        (tile, tileGrid, tileProj) => isTileInComplexPolygon(tile, tileGrid, tileProj, subPolygonIndex),
    )
}

export const getAllTilesInMultiPolygon = (multiPolygon: MultiPolygon, startZ: number, endZ: number, tileGrid: TileGrid, tileProj: string) => {
    return getAllTilesInMultiPolygonInternal(
        multiPolygon,
        startZ,
        endZ,
        tileGrid,
        tileProj,
        (tile, polygon, tileGrid, tileProj) => isTileInPolygon(tile, polygon, tileGrid, tileProj),
    );
}

export const getAllTilesInComplexMultiPolygon = (multiPolygon: MultiPolygon, startZ: number, endZ: number, tileGrid: TileGrid, tileProj: string, subPolygonIndex: RBush<GeometryBbox>) => {
    return getAllTilesInMultiPolygonInternal(
        multiPolygon,
        startZ,
        endZ,
        tileGrid,
        tileProj,
        (tile, polygon, tileGrid, tileProj) => isTileInComplexPolygon(tile, tileGrid, tileProj, subPolygonIndex),
    );
}

export const splitPolygon = (polygon: Polygon, avgPointsPerSplit: number): FeatureCollection => {
    const splitBbox = ([xmin, ymin, xmax, ymax]: BBox): BBox[] => {
        const bboxes: BBox[] = []

        const totalPoints = polygon.coordinates.map(coords => coords.length).reduce((a, b) => a + b);
        const bboxSplit = Math.ceil(Math.sqrt(totalPoints / avgPointsPerSplit));

        const delta = { x: (xmax - xmin) / bboxSplit, y: (ymax - ymin) / bboxSplit };

        for (let x = xmin; x <= xmax; x += delta.x) {
            for (let y = ymin; y <= ymax; y += delta.y) {
                const cXmin = x;
                const cYmin = y;
                const cXmax = x + delta.x;
                const cYMax = y + delta.y;
                bboxes.push([cXmin, cYmin, cXmax, cYMax]);
            }
        }
        return bboxes;
    }

    const polygonBbox = bbox(polygon);
    const bboxes = splitBbox(polygonBbox);


    const features: Feature[] = [];
    for (const polygonBbox of bboxes) {
        const inter = intersect(bboxPolygon(polygonBbox), polygon);
        if (!inter) {
            continue;
        }
        const { geometry } = inter;
        const feature: Feature = {
            type: 'Feature',
            geometry,
            properties: {
                bbox: polygonBbox,
            }
        }
        features.push(feature);
    }

    return {
        type: 'FeatureCollection',
        features
    }
}

export const getNumberOfPointsInPolygon = (polygon: Polygon) => {
    return polygon.coordinates.map(p => p.length).reduce((a, b) => a + b)
}

export const getNumberOfPointsInMultiPolygon = (multiPolygon: MultiPolygon) => {
    return multiPolygon.coordinates
        .map(polygon => polygon
            .map(points => points.length)
            .reduce((a, b) => a + b)
        )
        .reduce((a, b) => a + b)
}
