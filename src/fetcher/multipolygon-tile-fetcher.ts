import TileSource from 'ol/source/Tile';
import { Tile } from './Tile';
import { TileFetcher } from './tile-fetcher';
import { BaseTileFetcherArgs, MultiPolygonGenerationArgs } from './tile-fetcher-args.interface';
import { getAllTileInMultiPolygon, getAllTileInPolygon } from './fetcher-utils';
import { PolygonPreprocessor } from '../polygon-preprocessor/polygon-preprocessor';
import { MultiPolygon, Polygon, Position } from 'geojson';

export class MultiPolygonTileFetcher extends TileFetcher {
    constructor(
        private generationArgs: MultiPolygonGenerationArgs,
        baseArgs: BaseTileFetcherArgs,
    ) {
        super(baseArgs);
    }

    private preprocessMultiPolygon(multiPolygon: MultiPolygon): MultiPolygon | Polygon {
        const { preprocessArgs } = this.generationArgs;
        if (!preprocessArgs) {
            return multiPolygon;
        }
        const processor = new PolygonPreprocessor(preprocessArgs);
        return processor.process(multiPolygon);
    }

    protected getTiles(source: TileSource): Tile[] {
        const projection = source.getProjection()?.getCode();
        if (!projection) {
            throw Error('No source projection');
        }
        const tileGrid = source.tileGrid!;
        const { multipolygon, startZ, endZ } = this.generationArgs;

        const processed = this.preprocessMultiPolygon(multipolygon);

        if (processed.type == 'Polygon') {
            return getAllTileInPolygon(
                processed,
                startZ,
                endZ,
                tileGrid,
                projection,
            );
        }

        return getAllTileInMultiPolygon(
            processed,
            startZ,
            endZ,
            tileGrid,
            projection,
        );
    }
}