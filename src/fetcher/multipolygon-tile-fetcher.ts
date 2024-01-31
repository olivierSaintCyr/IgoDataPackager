import TileSource from 'ol/source/Tile';
import { Tile } from './Tile';
import { TileFetcher } from './tile-fetcher';
import { BaseTileFetcherArgs, MultiPolygonGenerationArgs } from './tile-fetcher-args.interface';
import { getAllTilesInComplexMultiPolygon, getAllTilesInComplexPolygon, getAllTilesInMultiPolygon, getAllTilesInPolygon, getNumberOfPointsInMultiPolygon, getNumberOfPointsInPolygon, splitPolygon } from './fetcher-utils';
import { PolygonPreprocessor } from '../polygon-preprocessor/polygon-preprocessor';
import { GeoJsonProperties, Geometry, MultiPolygon, Polygon } from 'geojson';
import { POLYGON_COMPLEXITY_THRESHOLD, AVG_POINTS_IN_SUBPOLYGON } from '../constants';
import { GeometryBbox } from './geometry-bbox.interface';
import { FeatureCollection, bbox } from '@turf/turf';
import RBush from 'rbush';

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

    private splitGeometry(
        geometry: Polygon | MultiPolygon,
    ): FeatureCollection<Geometry, GeoJsonProperties> {
        const { type } = geometry;
        if (type == 'Polygon') {
            return splitPolygon(geometry, AVG_POINTS_IN_SUBPOLYGON);
        }

        const featureCollections = geometry.coordinates.map(coordinates => {
            const polygon: Polygon = {
                type: 'Polygon',
                coordinates,
            }
            return splitPolygon(polygon, AVG_POINTS_IN_SUBPOLYGON);
        })

        const features = []
        for (const featureCollection of featureCollections) {
            for (const feature of featureCollection.features) {
                features.push(feature);
            }
        }

        return {
            type: 'FeatureCollection',
            features,
        }
    }

    private getTilesInComplexGeometry(
        geometry: Polygon | MultiPolygon,
        source: TileSource,
        projection: string,
    ): Tile[] {
        console.log('Complex geometry detected');

        const { type } = geometry;
        const tileGrid = source.tileGrid!;
        const { startZ, endZ } = this.generationArgs;

        const subPolygonFeatures = this.splitGeometry(geometry);
        
        const rtree = new RBush<GeometryBbox>();
        const items: GeometryBbox[] = subPolygonFeatures.features.map(
            ({ geometry, properties }) => {
                if (geometry.type == 'GeometryCollection') {
                    throw Error('Invalid subpolygon geometry');
                }
                const [ minX, minY, maxX, maxY ] = 
                    !properties || !properties.bbox ? 
                        bbox(geometry) : 
                        properties.bbox as [number, number, number, number];

                return { minX, minY, maxX, maxY, geometry }
            }
        );

        rtree.load(items);

        return type == 'Polygon' ?
            getAllTilesInComplexPolygon(
                geometry,
                startZ,
                endZ,
                tileGrid,
                projection,
                rtree,
            ) :
            getAllTilesInComplexMultiPolygon(
                geometry,
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
        const { multipolygon } = this.generationArgs;

        const processed = this.preprocessMultiPolygon(multipolygon);

        const pointsInGeometry = processed.type == 'Polygon' ? 
            getNumberOfPointsInPolygon(processed) :
            getNumberOfPointsInMultiPolygon(processed);

        console.log('Points in geometry', pointsInGeometry);
        
        const isGeometryComplex = pointsInGeometry >= POLYGON_COMPLEXITY_THRESHOLD;

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