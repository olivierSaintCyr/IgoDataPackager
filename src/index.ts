import { DATA_DIR, DOWNLOAD_DIR, PACKAGE_DIR } from './constants';
import { TileFetcher } from './fetcher/tile-fetcher';
import { FetchArgs, GenerationArgs } from './fetcher/tile-fetcher-args.interface';
import fs from 'fs';
import { ZipPackager } from './packager';
import { DownloadedFile } from './fetcher/downloaded-file.interface';
import { PackageMetadata } from './package-metadata.interface';
import { MapTilePackageGenerationOptions } from './map-tile-package-generation-options.interface';
import { DataSourceFactory } from './datasource/datasource-factory';
import { TileSourceOptions } from './datasource/datasource-options.interface';
import TileSource from 'ol/source/Tile';
import { FeatureCollection, MultiPolygon } from 'geojson';
import { TileFetcherFactory } from './fetcher/tile-fetcher-factory';

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

const createPackageMetadata = (downloadedFiles: DownloadedFile[], packageName: string): PackageMetadata => {
    return {
        title: packageName,
        files: downloadedFiles,
    };
}

const deleteData = (downloadedFiles: DownloadedFile[]) => {
    downloadedFiles.forEach(({ fileName }) => {
        fs.unlinkSync(`${DOWNLOAD_DIR}/${fileName}`);
    });
}

const packageData = async (packageName: string, fetcher: TileFetcher, packager: ZipPackager) => {
    const downloadedFiles = await fetcher.fetch();
    
    console.log('Downloaded Files', downloadedFiles, downloadedFiles.length);
    const metadata = createPackageMetadata(downloadedFiles, packageName);
    const packagePath = `${PACKAGE_DIR}/${packageName}.zip`;
    await packager.package(metadata, packagePath);

    console.log(`Package done! path: ${packagePath}`);

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

const saveGeoJson = (collection: FeatureCollection, path: string) => {
    console.log(`Saving ${path}`);
    fs.writeFileSync(path, JSON.stringify(collection));
}

const getFeatureCollectionMultiPolygon = (collection: FeatureCollection): MultiPolygon => {
    const { features } = collection;
    const coordinates = features.map(({ geometry }) => {
        if (geometry.type != 'Polygon') {
            throw Error('Feature collection not a Polygon collection');
        }
        return geometry.coordinates;
    });
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
    
    const { title } = options;
    await packageData(title, fetcher, packager);    
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

// const serviceCenters = loadGeoJson(`${DATA_DIR}/polygons/CentreDeServicesLatitude_Longitude_MTL.geojson`);
// const polygon = serviceCenters.features[0].geometry as Polygon;

// const packageGenerationOptions: MapTilePackageGenerationOptions = {
//     title: 'test-package-2',
//     type: 'xyz',
//     url: 'https://geoegl.msp.gouv.qc.ca/apis/carto/tms/1.0.0/carte_gouv_qc_ro@EPSG_3857/{z}/{x}/{-y}.png',
//     maxZoom: 17,
//     args: {
//         type: 'polygon',
//         polygon,
//         startZ: 1,
//         endZ: 15,
//         preprocessArgs: {
//             simplify: {
//                 tolerance: 0.03,
//                 highQuality: false,
//             },
//             buffer: {
//                 radius: 5,
//                 units: 'kilometers',
//             }
//         },
//     },
// };

const serviceCenterNames = ["Dir. du soutien à l'entretien courant", "CS de Joliette"]

const serviceCenters = loadGeoJson(`${DATA_DIR}/polygons/CentreDeServicesLatitude_Longitude.geojson`);
serviceCenters.features = serviceCenters.features.filter(({ properties }) => serviceCenterNames.includes(properties?.nom_unite_));

const multipolygon = getFeatureCollectionMultiPolygon(serviceCenters);

const packageGenerationOptions: MapTilePackageGenerationOptions = {
    title: 'test-package-2',
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
                tolerance: 0.03,
                highQuality: false,
            },
            buffer: {
                radius: 5,
                units: 'kilometers',
            }
        },
    },
};

main(packageGenerationOptions);
