import { DATA_DIR, DOWNLOAD_DIR, PACKAGE_DIR } from './constants';
import { TileFetcher } from './fetcher/tile-fetcher';
import { DepthFetchArgs } from './fetcher/tile-fetcher-args.interface';
import fs from 'fs';
import { ZipPackager } from './packager';
import { DownloadedFile } from './fetcher/downloaded-file.interface';
import { PackageMetadata } from './package-metadata.interface';

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

createDirectories();

const fullDepthArgs: DepthFetchArgs = {
    x: 0,
    y: 0,
    startZ: 1,
    endZ: 3,
    url: 'https://geoegl.msp.gouv.qc.ca/apis/carto/tms/1.0.0/carte_gouv_qc_ro@EPSG_3857/{z}/{x}/{y}.png'
};

const fetcher = new TileFetcher(fullDepthArgs);
const packager = new ZipPackager();

const packageName = 'test-package'

packageData(packageName, fetcher, packager);
