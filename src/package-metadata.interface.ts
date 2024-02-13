import { DownloadedFile } from './fetcher/downloaded-file.interface';

export type FileMetaData = DownloadedFile

export interface PackageBaseInfo {
    title: string;
    expiration: Date;
    url: string;
}

export interface PackageDetails extends PackageBaseInfo {
    id: string;
    size: number;
}

export interface PackageMetadata extends PackageDetails {
    files: FileMetaData[];
}

export type AvailablePackages = Array<PackageDetails>;
