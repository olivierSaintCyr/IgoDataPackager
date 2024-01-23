import { Tile } from './Tile';
import { TileFetcher } from './tile-fetcher';
import { getAllChildTiles } from './fetcher-utils';
import { BaseTileFetcherArgs, PointGenerationArgs } from './tile-fetcher-args.interface';
import TileSource from 'ol/source/Tile';

export class PointTileFetcher extends TileFetcher {
    constructor(
        private generationArgs: PointGenerationArgs,
        baseArgs: BaseTileFetcherArgs
    ) {
        super(baseArgs);
    }
    protected getTiles(source: TileSource): Tile[] {
        const tileGrid = source.tileGrid!;
        const tileCoord = tileGrid.getTileCoordForCoordAndZ([this.generationArgs.x, this.generationArgs.y], this.generationArgs.startZ);
    
        const root: Tile = {
            x: tileCoord[1],
            y: tileCoord[2],
            z: tileCoord[0]
        };
        console.log({root})

        return getAllChildTiles(
            root,
            this.generationArgs.endZ,
            tileGrid,
        );
    }
}
