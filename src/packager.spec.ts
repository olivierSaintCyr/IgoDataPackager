import { PackageMetadata } from './package-metadata.interface';
import { ZipPackager } from './packager';
import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { createReadStream, createWriteStream, rmSync, mkdirSync } from 'fs';
import { createUnzip } from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { expect } from 'chai';
import { Extract } from 'unzipper';

describe('ZipPackager', () => {
    interface GeneratedFile {
        name: string;
        content: string;
        url: string;
    }

    let zipPackager: ZipPackager;
    let generatedFiles: GeneratedFile[];
    let metadata: PackageMetadata;

    const TEST_DATA_DIR = 'data/test';
    const DOWNLOAD_DIR = `${TEST_DATA_DIR}/download`;
    const PACKAGE_DIR = `${TEST_DATA_DIR}/packages`;
    const UNZIP_DIR = `${TEST_DATA_DIR}/unziped/`;

    const packagePath = `${PACKAGE_DIR}/test_package.zip`;
    
    const genFiles = (n: number) => {
        const genContent = (byteLength=2048) => {
            return randomBytes(byteLength).toString('ascii');
        }

        const generated = [];
        for (let i = 0; i < n; i++) {
            const file = {
                name: `test_${i}.txt`,
                content: genContent(),
                url: `http://test.com/test_${i}.txt`
            }
            generated.push(file);
        }

        generated.forEach(({name, content}) => {
            writeFileSync(`${DOWNLOAD_DIR}/${name}`, content);
        });
        return generated;
    }
    
    const unzipFile = async (sourcePath: string, destinationPath: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            createReadStream(sourcePath)
                .pipe(Extract({ path: destinationPath }))
                .on('close', resolve)
                .on('error', reject);
        });
    };

    const areFilesValid = (genFiles: GeneratedFile[]) => {
        return genFiles
            .map(({ name, content }) => {
                const afterPackaged = `${UNZIP_DIR}/data/${name}`;
                const data = readFileSync(afterPackaged).toString();
                return data == content;
            })
            .reduce((a, b) => a && b);
    }
    
    beforeEach(() => {
        mkdirSync(DOWNLOAD_DIR, { recursive: true });
        mkdirSync(PACKAGE_DIR, { recursive: true });
        mkdirSync(UNZIP_DIR, { recursive: true });

        generatedFiles = genFiles(5);
        metadata = {
            id: '123',
            title: 'test_package',
            expiration: new Date('2024-02-06'),
            files: generatedFiles.map(({ name: fileName, url }) => {
                return { fileName, url };
            }),
            size: 1000, // Not important
        };
        zipPackager = new ZipPackager();
    });

    afterEach(() => {
        rmSync(DOWNLOAD_DIR, { recursive: true });
        rmSync(PACKAGE_DIR, { recursive: true });
        rmSync(UNZIP_DIR, { recursive: true });
    });

    after(() => {
        rmSync(TEST_DATA_DIR, { recursive: true });
    })

    it('should create a zip file', async () => {
        await zipPackager.package(metadata, packagePath);
        expect(existsSync(packagePath)).to.be.true;
    });

    it('should package metadata into a zip file', async () => {
        await zipPackager.package(metadata, packagePath, DOWNLOAD_DIR);

        await unzipFile(packagePath, UNZIP_DIR);

        const metadataPath = `${UNZIP_DIR}/metadata.json`;
        expect(existsSync(metadataPath)).to.be.true;

        const metadataPack = JSON.parse(readFileSync(metadataPath).toString())
        metadataPack.expiration = new Date(metadataPack.expiration);
        expect(metadataPack).to.be.deep.equal(metadata);
    });

    it('should package all data into a zip file', async () => {
        await zipPackager.package(metadata, packagePath, DOWNLOAD_DIR);

        await unzipFile(packagePath, UNZIP_DIR);

        for (const { name } of generatedFiles) {
            const path = `${UNZIP_DIR}/data/${name}`;
            expect(existsSync(path)).to.be.true;
        }
    });

    it('should package into a zip file without loss', async () => {
        await zipPackager.package(metadata, packagePath, DOWNLOAD_DIR);

        await unzipFile(packagePath, UNZIP_DIR);

        expect(areFilesValid(generatedFiles)).to.be.true;
    });
});
