import { TileSourceType } from './datasource/datasource-options.interface';
import { GenerationArgs } from './fetcher/tile-fetcher-args.interface';

export interface MapTilePackageGenerationOptions {
    title: string;
    type: TileSourceType;
    url: string;
    projection: string;
    maxZoom: number;
    args: GenerationArgs;
}
