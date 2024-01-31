import { Tile } from './Tile';
import { getAllTilesInComplexPolygon, getAllTilesInPolygon, getNumberOfPointsInPolygon, splitPolygon } from './fetcher-utils';
import { TileFetcher } from './tile-fetcher';
import TileSource from 'ol/source/Tile';
import { BaseTileFetcherArgs, PolygonGenerationArgs } from './tile-fetcher-args.interface';
import { Polygon } from 'geojson';
import { PolygonPreprocessor } from '../polygon-preprocessor/polygon-preprocessor';
import { AVG_POINTS_IN_SUBPOLYGON, POLYGON_COMPLEXITY_THRESHOLD } from '../constants';
import RBush from 'rbush';
import { GeometryBbox } from './geometry-bbox.interface';
import { bbox } from '@turf/turf';

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

    private getTilesInComplexPolygon(
        polygon: Polygon,
        source: TileSource,
        projection: string,
    ) {
        console.log('Complex geometry detected');
        const tileGrid = source.tileGrid!;
        const { startZ, endZ } = this.generationArgs;

        const subPolygonFeatures = splitPolygon(polygon, AVG_POINTS_IN_SUBPOLYGON);

        const rtree = new RBush<GeometryBbox>();
        const items: GeometryBbox[] = subPolygonFeatures.features.map(({ geometry, properties }) => {
            if (geometry.type == 'GeometryCollection') {
                throw Error('Invalid subpolygon geometry');
            }
            const [ minX, minY, maxX, maxY ] = !properties || !properties.bbox ? bbox(geometry) : properties.bbox as [number, number, number, number];
            return { minX, minY, maxX, maxY, geometry }
        });

        rtree.load(items);

        return getAllTilesInComplexPolygon(
            polygon,
            startZ,
            endZ,
            tileGrid,
            projection,
            rtree,
        );
    }

    protected getTiles(source: TileSource): Tile[] {
        const projection = source.getProjection()?.getCode();
        if (!projection) {
            throw Error('No source projection');
        }
        const tileGrid = source.tileGrid!;
        const { polygon, startZ, endZ } = this.generationArgs;

        const processed = this.preprocessPolygon(polygon) as Polygon;

        const isPolygonComplex = getNumberOfPointsInPolygon(processed) >= POLYGON_COMPLEXITY_THRESHOLD;
        return !isPolygonComplex ?
            getAllTilesInPolygon(
                processed,
                startZ,
                endZ,
                tileGrid,
                projection,
            ) :
            this.getTilesInComplexPolygon(
                processed,
                source,
                projection,
            );
    }
}
