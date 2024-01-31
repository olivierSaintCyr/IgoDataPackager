import TileSource from 'ol/source/Tile';
import { Tile } from './Tile';
import { TileFetcher } from './tile-fetcher';
import { BaseTileFetcherArgs, MultiPolygonGenerationArgs } from './tile-fetcher-args.interface';
import { getAllTilesInMultiPolygon, getAllTilesInPolygon, getNumberOfPointsInMultiPolygon, getNumberOfPointsInPolygon } from './fetcher-utils';
import { PolygonPreprocessor } from '../polygon-preprocessor/polygon-preprocessor';
import { MultiPolygon, Polygon, Position } from 'geojson';
import { POLYGON_COMPLEXITY_THREASHOLD } from '../constants';

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

    private getAllTilesInGeometry(
        geometry: Polygon | MultiPolygon,
        source: TileSource,
        projection: string,
    ): Tile[] {
        const tileGrid = source.tileGrid!;
        const { startZ, endZ } = this.generationArgs;
        if (geometry.type == 'Polygon') {
            return getAllTilesInPolygon(
                geometry,
                startZ,
                endZ,
                tileGrid,
                projection,
            );
        }

        return getAllTilesInMultiPolygon(
            geometry,
            startZ,
            endZ,
            tileGrid,
            projection,
        );
    }

    private getTilesInComplexGeometry(
        geometry: Polygon | MultiPolygon,
        source: TileSource,
        projection: string,
    ): Tile[] {
        return [];
    }

    protected getTiles(source: TileSource): Tile[] {
        const projection = source.getProjection()?.getCode();
        if (!projection) {
            throw Error('No source projection');
        }
        const { multipolygon } = this.generationArgs;

        const processed = this.preprocessMultiPolygon(multipolygon);

        const pointsInGeometry = processed.type == 'Polygon' ? 
            getNumberOfPointsInPolygon(processed) :
            getNumberOfPointsInMultiPolygon(processed);
        
        const isGeometryComplex = pointsInGeometry >= POLYGON_COMPLEXITY_THREASHOLD;

        return !isGeometryComplex ? 
            this.getAllTilesInGeometry(
                processed,
                source,
                projection,
            ) :
            this.getTilesInComplexGeometry(
                processed,
                source,
                projection,
            );
    }
}