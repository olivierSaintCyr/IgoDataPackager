import { PackageMetadata } from './package-metadata.interface';
import archiver from 'archiver';
import { createWriteStream } from 'fs'
import { DOWNLOAD_DIR } from './constants';

export class ZipPackager {
    public async package(metadata: PackageMetadata, out: string, downloadDir=DOWNLOAD_DIR) {
        const output = createWriteStream(out);
        const archive = archiver('zip');
        const { files } = metadata;

        archive.pipe(output);
        
        for (const { fileName } of files) {
            const filePath = `${downloadDir}/${fileName}`;
            const archivePath = `data/${fileName}`;
            archive.file(filePath, { name: archivePath });
        }

        archive.append(JSON.stringify(metadata), { name: 'metadata.json' });

        await archive.finalize();
    }
}
