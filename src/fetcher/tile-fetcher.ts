import { DepthFetchArgs } from './tile-fetcher-args.interface';
import { generateUrlFromTemplate } from './fetcher-utils';

export class TileFetcher {
    constructor(private args: DepthFetchArgs) {}

    fetch() {
        const url = generateUrlFromTemplate(
            this.args.url,
            this.args.x,
            this.args.y,
            this.args.startZ,
        );
        
        console.log('fetching form url', url);

    }
}
