import { DownloadedFile } from './fetcher/downloaded-file.interface';

export type FileMetaData = DownloadedFile

export interface PackageMetadata {
    title: string;
    files: FileMetaData[];
}
