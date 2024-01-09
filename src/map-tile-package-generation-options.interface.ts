import { TileSourceType } from './datasource/datasource-options.interface';
import { GenerationArgs, GenerationType } from './fetcher/tile-fetcher-args.interface';

export interface MapTilePackageGenerationOptions {
    title: string;
    type: TileSourceType;
    url: string;
    maxZoom: number;
    generation: {
        type: GenerationType;
        args: GenerationArgs;
    }
}
