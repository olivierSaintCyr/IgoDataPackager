import { Tile } from './Tile';
import TileGrid from 'ol/tilegrid/TileGrid';
import { fromExtent } from 'ol/geom/Polygon.js';
import { MultiPolygon, Polygon } from 'geojson';
import { transformExtent } from 'ol/proj.js';
import { GEOJSON_PROJECTION } from '../constants';
import intersect from '@turf/intersect';
import centroid from '@turf/centroid';

export const zoom = (tile: Tile): Tile[] => {
    const x0 = 2 * (tile.x - 1) + 1;
    const y0 = 2 * (tile.y - 1) + 1;
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

export const getAllTileInPolygon = (polygon: Polygon, tileGrid: TileGrid, startZ: number, tileProj: string)  => {
    const center = centroid(polygon).geometry.coordinates;
    const centerTileCoord = tileGrid.getTileCoordForCoordAndZ([center[0], center[1]], startZ);
    console.log(centerTileCoord);
}

export const getAllTileInMultiPolygon = () => {

}
