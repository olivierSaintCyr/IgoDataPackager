import { DATA_DIR, DOWNLOAD_DIR, PACKAGE_DIR } from './constants';
import { TileFetcher } from './fetcher/tile-fetcher';
import { DepthFetchArgs } from './fetcher/tile-fetcher-args.interface';
import fs from 'fs';

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

const fetchData = async (fetcher: TileFetcher) => {
    const downloadedFiles = await fetcher.fetch();
    console.log(downloadedFiles)
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
fetchData(fetcher);
