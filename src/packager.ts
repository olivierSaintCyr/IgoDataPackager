import { PackageMetadata } from './package-metadata.interface';
import archiver from 'archiver';
import { createWriteStream } from 'fs'
import { DOWNLOAD_DIR } from './constants';

export class ZipPackager {
    public async package(metadata: PackageMetadata, out: string) {
        /**
         * Package the files in the following structure:
         *      package/
         *      ├── data/
         *      │   ├── tile1.png
         *      │   └── tile2.png
         *      └── metadata.json
         */

        const output = createWriteStream(out);
        const archive = archiver('zip');
        const { files } = metadata;

        archive.pipe(output);
        
        for (const { fileName } of files) {
            const filePath = `${DOWNLOAD_DIR}/${fileName}`;
            const archivePath = `data/${fileName}`;
            archive.file(filePath, { name: archivePath });
        }

        archive.append(JSON.stringify(metadata), { name: 'metadata.json' });

        await archive.finalize();
    }
}
