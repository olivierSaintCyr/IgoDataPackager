import { AVAILABLE_PACKAGES_FILE, DOWNLOAD_DIR } from './constants';
import { DownloadedFile } from './fetcher/downloaded-file.interface';
import { AvailablePackages, PackageBaseInfo, PackageDetails, PackageMetadata } from './package-metadata.interface';
import { readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const loadAvailablePackageDetails = (): AvailablePackages => {
    if (!existsSync(AVAILABLE_PACKAGES_FILE)) {
        return []
    }

    const data = readFileSync(AVAILABLE_PACKAGES_FILE).toString();
    return JSON.parse(data);
}

export const savePackageDescription = (description: PackageDetails) => {
    const existingPackages = loadAvailablePackageDetails();
    existingPackages.push(description);

    writeFileSync(AVAILABLE_PACKAGES_FILE, JSON.stringify(existingPackages, null, 4));
}

export const createPackageDetails = (
    baseInfo: PackageBaseInfo,
    downloadedFiles: DownloadedFile[],
): PackageDetails => {
    const id = uuidv4();
    const size = getPackageTotalSize(downloadedFiles);
    return {
        id,
        ...baseInfo,
        size,
    };
}

export const createPackageMetadata = (
    details: PackageDetails,
    downloadedFiles: DownloadedFile[],
): PackageMetadata => {
    return {
        files: downloadedFiles,
        ...details,
    };
}

export const getPackageTotalSize = (downloadedFiles: DownloadedFile[]) => {
    return downloadedFiles
        .map((downloadFile) => {
            const path = `${DOWNLOAD_DIR}/${downloadFile.fileName}`;
            const fileStat = statSync(path);
            return fileStat.size;
        })
        .reduce((a, b) => a + b);
}
