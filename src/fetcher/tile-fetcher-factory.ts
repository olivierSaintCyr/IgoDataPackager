import { MultiPolygonTileFetcher } from './multipolygon-tile-fetcher';
import { PointTileFetcher } from './point-tile-fetcher';
import { PolygonTileFetcher } from './polygon-tile-fetcher';
import { TileFetcher } from './tile-fetcher';
import { FetchArgs } from './tile-fetcher-args.interface';

export abstract class TileFetcherFactory {
    static create(fetchArgs: FetchArgs): TileFetcher {
        const { args } = fetchArgs;

        switch (args.type) {
            case 'point':
                return new PointTileFetcher(args, fetchArgs);
            case 'polygon':
                return new PolygonTileFetcher(args, fetchArgs);
            case 'multipolygon':
                return new MultiPolygonTileFetcher(args, fetchArgs);
            default:
                throw Error(`Invalid fetch args type provided ${fetchArgs.args.type}`);
        }
    }
}