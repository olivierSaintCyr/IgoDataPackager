import { DepthFetchArgs } from './tile-fetcher-args.interface';
import { generateUrlFromTemplate, getAllChildTiles } from './fetcher-utils';
import { Tile } from './Tile';

export class TileFetcher {
    constructor(private args: DepthFetchArgs) {}

    private getUrls(): string[] {
        const root: Tile = {
            x: this.args.x,
            y: this.args.y,
            z: this.args.startZ
        };

        const tiles = getAllChildTiles(
            root,
            this.args.endZ,
        );

        return tiles.map((tile) => {
            return generateUrlFromTemplate(
                this.args.url,
                tile.x,
                tile.y,
                tile.z,
            );
        });
    }

    fetch() {
        const url = generateUrlFromTemplate(
            this.args.url,
            this.args.x,
            this.args.y,
            this.args.startZ,
        );
        
        console.log('fetching form url', url);

        const urls = this.getUrls();
        console.log(urls);
    }
}
