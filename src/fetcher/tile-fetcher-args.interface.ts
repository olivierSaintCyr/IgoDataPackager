export interface BaseTileFetcherArgs {
    url: string;
}

export interface DepthFetchArgs extends BaseTileFetcherArgs {
    x: number,
    y: number,
    startZ: number,
    endZ: number,
}
