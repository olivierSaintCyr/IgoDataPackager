import { DepthFetchArgs } from './tile-fetcher-args.interface';
import { getAllChildTiles } from './fetcher-utils';
import { Tile } from './Tile';
import { finished } from 'stream/promises';
import axios from 'axios';
import { DOWNLOAD_DIR } from '../constants';
import { createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DownloadedFile } from './downloaded-file.interface';
import { createFromTemplate } from 'ol/tileurlfunction.js';
import { UrlFunction } from 'ol/Tile';

export class TileFetcher {
    private urlGenerator: UrlFunction;
    constructor(private args: DepthFetchArgs) {
        const { url, source } = args;
        if (!source.tileGrid) {
            throw Error('Invalid data source no tileGrid provided');
        }

        if (!source.getProjection()) {
            throw Error('Invalid data source no projection provided');
        }
        this.urlGenerator = createFromTemplate(url, source.tileGrid);
    }

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
            const url = this.urlGenerator(
                [tile.z, tile.x, tile.y],
                0,
                this.args.source.getProjection()!!,
            );

            if (!url) {
                throw Error("Can't generate URL.");
            }
            return url;
        });
    }

    private getFileName(url: string) {
        const fileExtension = url.split('.').pop();
        if (fileExtension?.length == url.length) {
            return uuidv4();
        }
        return `${uuidv4()}.${fileExtension}`;
    }

    private getFilePath(fileName: string) {
        return `${DOWNLOAD_DIR}/${fileName}`
    }

    private async downloadData(url: string): Promise<DownloadedFile> {
        const res = await axios.get(url, {
            responseType: 'stream'
        });

        const fileName = this.getFileName(url);
        const path = this.getFilePath(fileName);
        
        const writer = res.data.pipe(createWriteStream(path));
        await finished(writer);
        return {
            url,
            fileName,
        };
    }

    async fetch(): Promise<DownloadedFile[]> {
        const urls = this.getUrls();
        const downloadingFiles = urls.map((url) => this.downloadData(url))
        return await Promise.all(downloadingFiles)
    }
}
