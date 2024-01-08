import { TileFetcher } from './fetcher/tile-fetcher';
import { DepthFetchArgs } from './fetcher/tile-fetcher-args.interface';

const fullDepthArgs: DepthFetchArgs = {
    x: 0,
    y: 0,
    startZ: 1,
    endZ: 3,
    url: 'https://geoegl.msp.gouv.qc.ca/apis/carto/tms/1.0.0/carte_gouv_qc_ro@EPSG_3857/{z}/{x}/{-y}.png'
};

const fetcher = new TileFetcher(fullDepthArgs);
fetcher.fetch();
