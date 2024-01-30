import { Tile } from './Tile';
import { getAllTileInPolygon } from './fetcher-utils';
import { TileFetcher } from './tile-fetcher';
import TileSource from 'ol/source/Tile';
import { BaseTileFetcherArgs, PolygonGenerationArgs } from './tile-fetcher-args.interface';
import { Polygon } from 'geojson';
import { PolygonPreprocessor } from '../polygon-preprocessor/polygon-preprocessor';
import rbush from 'rbush';

export class PolygonTileFetcher extends TileFetcher {
    constructor(
        private generationArgs: PolygonGenerationArgs,
        baseArgs: BaseTileFetcherArgs,
    ) {
        super(baseArgs);
    }

    private preprocessPolygon(polygon: Polygon) {
        const { preprocessArgs } = this.generationArgs;
        if (!preprocessArgs) {
            return polygon;
        }

        console.log(`preprocessing 1 polygon`);

        const preprocessor = new PolygonPreprocessor(preprocessArgs);
        return preprocessor.process(polygon);
    }

    protected getTiles(source: TileSource): Tile[] {
        const projection = source.getProjection()?.getCode();
        if (!projection) {
            throw Error('No source projection');
        }
        const tileGrid = source.tileGrid!;
        const { polygon, startZ, endZ } = this.generationArgs;

        const processedPolygon = this.preprocessPolygon(polygon) as Polygon;
        return getAllTileInPolygon(
            processedPolygon,
            startZ,
            endZ,
            tileGrid,
            projection,
        )
    }
}
