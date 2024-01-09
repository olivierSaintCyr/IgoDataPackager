import TileSource from 'ol/source/Tile';

export type GenerationType = 'depth'
export type GenerationArgs = DepthGenerationArgs;

export interface BaseTileFetcherArgs {
    url: string;
    source: TileSource;
}

export interface DepthGenerationArgs {
    x: number,
    y: number,
    startZ: number,
    endZ: number,
}

export type DepthFetchArgs = BaseTileFetcherArgs & DepthGenerationArgs;

export interface DepthFetchArgs2 {
    q: number,
    v: number,
}
