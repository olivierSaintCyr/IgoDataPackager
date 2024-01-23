import TileSource from 'ol/source/Tile';
import { Tile } from './Tile';
import { TileFetcher } from './tile-fetcher';
import { BaseTileFetcherArgs, MultiPolygonGenerationArgs } from './tile-fetcher-args.interface';
import { getAllTileInMultiPolygon } from './fetcher-utils';

export class MultiPolygonTileFetcher extends TileFetcher {
    constructor(
        private generationArgs: MultiPolygonGenerationArgs,
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
        const { multipolygon, startZ, endZ } = this.generationArgs;
        
        return getAllTileInMultiPolygon(
            multipolygon,
            startZ,
            endZ,
            tileGrid,
            projection,
        )
    }
}