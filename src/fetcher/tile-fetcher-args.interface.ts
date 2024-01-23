import { Geometry, MultiPolygon, Polygon } from 'geojson';
import TileSource from 'ol/source/Tile';

export type GenerationArgs = PointGenerationArgs | PolygonGenerationArgs | MultiPolygonGenerationArgs;

export interface BaseTileFetcherArgs {
    url: string;
    source: TileSource;
}

export interface BaseDepthGenerationArgs {
    startZ: number;
    endZ: number;
}

export interface PointGenerationArgs extends BaseDepthGenerationArgs {
    type: 'point';
    x: number;
    y: number;
}

export interface PolygonGenerationArgs extends BaseDepthGenerationArgs {
    type: 'polygon';
    polygon: Polygon;
}

export interface MultiPolygonGenerationArgs extends BaseDepthGenerationArgs {
    type: 'multipolygon';
    multipolygon: MultiPolygon;
}

export interface FetchArgs extends BaseTileFetcherArgs {
    args: GenerationArgs;
}
