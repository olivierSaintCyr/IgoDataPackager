import { DATA_DIR, DOWNLOAD_DIR, PACKAGE_DIR } from './constants';
import { TileFetcher } from './fetcher/tile-fetcher';
import { DepthFetchArgs, GenerationArgs } from './fetcher/tile-fetcher-args.interface';
import fs from 'fs';
import { ZipPackager } from './packager';
import { DownloadedFile } from './fetcher/downloaded-file.interface';
import { PackageMetadata } from './package-metadata.interface';
import { MapTilePackageGenerationOptions } from './map-tile-package-generation-options.interface';
import { DataSourceFactory } from './datasource/datasource-factory';
import { TileSourceOptions } from './datasource/datasource-options.interface';
import TileSource from 'ol/source/Tile';
import { FeatureCollection } from 'geojson';

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

const createTileSourceOptions = (packageGenerationOptions: MapTilePackageGenerationOptions) => {
    const { type, url, maxZoom } = packageGenerationOptions;
    return {
        type,
        url,
        maxZoom,
    }
};

const createFullDepthGenerationArgs = (url: string, source: TileSource, generationArgs: GenerationArgs): DepthFetchArgs => {
    return {
        url,
        source,
        ...generationArgs,
    }
}

const loadGeoJson = (path: string): FeatureCollection => {
    console.log(`Loading ${path}`);
    const data = fs.readFileSync(path);
    return JSON.parse(data.toString());
};

const main = async (options: MapTilePackageGenerationOptions) => {
    const sourceFactory = new DataSourceFactory();
    const tileSourceOptions: TileSourceOptions = createTileSourceOptions(options);
    const source = await sourceFactory.create(tileSourceOptions);
    
    const { url, generation: { args } } = options;
    const fullDepthArgs = createFullDepthGenerationArgs(
        url,
        source,
        args,
    );
        
    const fetcher = new TileFetcher(fullDepthArgs);
    const packager = new ZipPackager();
    
    const { title } = options;
    await packageData(title, fetcher, packager);    
}

createDirectories();

const packageGenerationOptions: MapTilePackageGenerationOptions = {
    title: 'test-package-2',
    type: 'xyz',
    url: 'https://geoegl.msp.gouv.qc.ca/apis/carto/tms/1.0.0/carte_gouv_qc_ro@EPSG_3857/{z}/{x}/{-y}.png',
    maxZoom: 17,
    generation: {
        type: 'depth',
        args: {
            x: 0,
            y: 0,
            startZ: 1,
            endZ: 8,
        }
    }
};

const serviceCenters = loadGeoJson(`${DATA_DIR}/polygons/CentreDeServicesLatitude_Longitude.geojson`);
const firstGeometry = serviceCenters.features[0].geometry;

main(packageGenerationOptions);
