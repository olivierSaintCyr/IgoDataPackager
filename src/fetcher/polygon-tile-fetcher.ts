import { Tile } from './Tile';
import { getAllTileInPolygon } from './fetcher-utils';
import { TileFetcher } from './tile-fetcher';
import TileSource from 'ol/source/Tile';
import { BaseTileFetcherArgs, PolygonGenerationArgs } from './tile-fetcher-args.interface';

export class PolygonTileFetcher extends TileFetcher {
    constructor(
        private generationArgs: PolygonGenerationArgs,
        baseArgs: BaseTileFetcherArgs,
    ) {
        super(baseArgs);
    }
    protected getTiles(source: TileSource): Tile[] {
        const projection = source.getProjection()?.getCode();
        if (!projection) {
            throw Error('No source projection');
        }
        const tileGrid = source.tileGrid!;
        const { polygon, startZ, endZ } = this.generationArgs;
        
        return getAllTileInPolygon(
            polygon,
            startZ,
            endZ,
            tileGrid,
            projection,
        )
    }
}
