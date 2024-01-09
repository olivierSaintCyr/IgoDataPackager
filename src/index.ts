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
    
    console.log('Downloaded Files', downloadedFiles);

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
            endZ: 4,
        }
    }
};

const sourceFactory = new DataSourceFactory();
const tileSourceOptions: TileSourceOptions = createTileSourceOptions(packageGenerationOptions);
const source = sourceFactory.create(tileSourceOptions);

const { url, generation: { args } } = packageGenerationOptions;
const fullDepthArgs = createFullDepthGenerationArgs(
    url,
    source,
    args,
);

const fetcher = new TileFetcher(fullDepthArgs);
const packager = new ZipPackager();

const { title } = packageGenerationOptions;
packageData(title, fetcher, packager);
