export type TileSourceType = | 'xyz';

export interface TileSourceOptions {
    type: TileSourceType;
    maxZoom: number;
    url: string;
    projection: string;
}
