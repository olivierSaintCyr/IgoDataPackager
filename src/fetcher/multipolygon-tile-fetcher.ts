import TileSource from 'ol/source/Tile';
import { Tile } from './Tile';
import { TileFetcher } from './tile-fetcher';
import { BaseTileFetcherArgs, MultiPolygonGenerationArgs } from './tile-fetcher-args.interface';
import { getAllTileInMultiPolygon } from './fetcher-utils';
import { PolygonPreprocessor } from '../polygon-preprocessor/polygon-preprocessor';
import { MultiPolygon, Polygon, Position } from 'geojson';

export class MultiPolygonTileFetcher extends TileFetcher {
    constructor(
        private generationArgs: MultiPolygonGenerationArgs,
        baseArgs: BaseTileFetcherArgs,
    ) {
        super(baseArgs);
    }

    private preprocessMultiPolygon(multiPolygon: MultiPolygon): MultiPolygon {
        const { preprocessArgs } = this.generationArgs;
        if (!preprocessArgs) {
            return multiPolygon;
        }

        const preprocessor = new PolygonPreprocessor(preprocessArgs);
        
        const coordinates: Position[][][] = multiPolygon.coordinates
            .map(coordinates => { 
                const polygon: Polygon = { type: 'Polygon', coordinates };
                const preprocced = preprocessor.process(polygon);
                return preprocced.coordinates;
            });

        return {
            type: 'MultiPolygon',
            coordinates,
        };
    }

    protected getTiles(source: TileSource): Tile[] {
        const projection = source.getProjection()?.getCode();
        if (!projection) {
            throw Error('No source projection');
        }
        const tileGrid = source.tileGrid!;
        const { multipolygon, startZ, endZ } = this.generationArgs;

        const processedMultiPolygon = this.preprocessMultiPolygon(multipolygon);
        
        return getAllTileInMultiPolygon(
            processedMultiPolygon,
            startZ,
            endZ,
            tileGrid,
            projection,
        )
    }
}