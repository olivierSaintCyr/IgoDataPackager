import { DATA_DIR, DOWNLOAD_DIR, PACKAGE_DIR } from './constants';
import { TileFetcher } from './fetcher/tile-fetcher';
import { FetchArgs, GenerationArgs } from './fetcher/tile-fetcher-args.interface';
import fs from 'fs';
import { ZipPackager } from './packager';
import { DownloadedFile } from './fetcher/downloaded-file.interface';
import { PackageBaseInfo, PackageMetadata } from './package-metadata.interface';
import { MapTilePackageGenerationOptions } from './map-tile-package-generation-options.interface';
import { DataSourceFactory } from './datasource/datasource-factory';
import { TileSourceOptions } from './datasource/datasource-options.interface';
import TileSource from 'ol/source/Tile';
import { Feature, FeatureCollection, GeoJsonObject, MultiPolygon, Position } from 'geojson';
import { TileFetcherFactory } from './fetcher/tile-fetcher-factory';
import { createPackageDetails, createPackageMetadata, savePackageDescription } from './package-utils';

const createDirectory = (path: string) => {
    if (fs.existsSync(path)) {
        return;
    }
    fs.mkdirSync(path);
}

const createDirectories = () => {
    createDirectory(DATA_DIR);
    createDirectory(DOWNLOAD_DIR);
    createDirectory(PACKAGE_DIR);
}

const deleteData = (downloadedFiles: DownloadedFile[]) => {
    downloadedFiles.forEach(({ fileName }) => {
        fs.unlinkSync(`${DOWNLOAD_DIR}/${fileName}`);
    });
}

const packageData = async (
    packageCreationParams: PackageBaseInfo,
    fetcher: TileFetcher,
    packager: ZipPackager
) => {
    const downloadedFiles = await fetcher.fetch();
    
    console.log('Downloaded Files', downloadedFiles, downloadedFiles.length);
    
    const description = createPackageDetails(packageCreationParams, downloadedFiles)
    const metadata = createPackageMetadata(description, downloadedFiles);

    const { title } = packageCreationParams;
    const packagePath = `${PACKAGE_DIR}/${title}.zip`;
    await packager.package(metadata, packagePath);

    console.log(`Package done! path: ${packagePath}`);

    savePackageDescription(description);

    deleteData(downloadedFiles);
}

const createTileSourceOptions = (packageGenerationOptions: MapTilePackageGenerationOptions): TileSourceOptions => {
    const { type, url, maxZoom, projection } = packageGenerationOptions;
    return {
        type,
        url,
        maxZoom,
        projection,
    };
};

const createFullDepthGenerationArgs = (url: string, source: TileSource, generationArgs: GenerationArgs): FetchArgs => {
    return {
        url,
        source,
        args: generationArgs,
    }
}

const loadGeoJson = (path: string): FeatureCollection => {
    console.log(`Loading ${path}`);
    const data = fs.readFileSync(path);
    return JSON.parse(data.toString());
};

const saveGeoJson = (collection: GeoJsonObject, path: string) => {
    console.log(`Saving ${path}`);
    fs.writeFileSync(path, JSON.stringify(collection));
}

const getFeatureCollectionMultiPolygon = (collection: FeatureCollection): MultiPolygon => {
    const { features } = collection;
    const coordinates: Position[][][] = [];

    for (const { geometry } of features) {
        if (geometry.type == 'Polygon') {
            coordinates.push(geometry.coordinates);
            continue;
        }

        if (geometry.type == 'MultiPolygon') {
            for (const coords of geometry.coordinates) {
                coordinates.push(coords);
            }
            continue;
        }
    }
    return {
        type: 'MultiPolygon',
        coordinates,
    }
}

const mergeMultiPolygonToFeatureCollectionInPlace = (collection: FeatureCollection, multiPolygon: MultiPolygon): FeatureCollection => {
    const { features } = collection;
    const { coordinates: multiCoordinates } = multiPolygon;

    if (features.length != multiCoordinates.length) {
        throw Error('Feature collection has not the same ammount of polygons as multipolygon');
    }
    
    for (let i = 0; i < collection.features.length; i++) {
        const feature = features[i];
        const coordinates = multiCoordinates[i];

        if (feature.geometry.type != 'Polygon') {
            throw Error('Feature collection not a Polygon collection');
        }

        feature.geometry.coordinates = coordinates;
    }
    return collection;
}

const main = async (options: MapTilePackageGenerationOptions) => {
    const tileSourceOptions: TileSourceOptions = createTileSourceOptions(options);

    const source = await DataSourceFactory.create(tileSourceOptions);

    const { url,  args } = options;
    const fetchArgs = createFullDepthGenerationArgs(
        url,
        source,
        args,
    );

    console.log(fetchArgs);

    const fetcher = TileFetcherFactory.create(fetchArgs);
    const packager = new ZipPackager();
    
    const { title, expiration } = options;
    const baseInfo: PackageBaseInfo = { title, expiration }
    await packageData(baseInfo, fetcher, packager);
}

createDirectories();

// const packageGenerationOptions: MapTilePackageGenerationOptions = {
//     title: 'test-package-2',
//     type: 'xyz',
//     url: 'https://geoegl.msp.gouv.qc.ca/apis/carto/tms/1.0.0/carte_gouv_qc_ro@EPSG_3857/{z}/{x}/{-y}.png',
//     maxZoom: 17,
//     args: {
//         type: 'point',
//         x: -8202328.325,
//         y: 5702490.224,
//         startZ: 10,
//         endZ: 11,
//     }
// };

const roads = loadGeoJson(`${DATA_DIR}/polygons/CentreDeServicesLatitude_Longitude_MTL_reseau_routier.geojson`);
const multipolygon = roads.features[0].geometry as MultiPolygon;

const packageGenerationOptions: MapTilePackageGenerationOptions = {
    title: 'mtl-roads-v1',
    expiration: new Date('2024-09-06'),
    type: 'xyz',
    url: 'https://geoegl.msp.gouv.qc.ca/apis/carto/tms/1.0.0/carte_gouv_qc_ro@EPSG_3857/{z}/{x}/{-y}.png',
    projection: 'EPSG:3857',
    maxZoom: 17,
    args: {
        type: 'multipolygon',
        multipolygon,
        startZ: 1,
        endZ: 17,
        preprocessArgs: {
            simplify: {
                tolerance: 0.002,
                highQuality: false,
            },
            buffer: {
                radius: 500,
                units: 'meters',
            }
        },
    },
};

saveGeoJson(multipolygon, 'multipolygon.geojson');

main(packageGenerationOptions);
