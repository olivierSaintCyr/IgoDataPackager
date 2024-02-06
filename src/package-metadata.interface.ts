import { DownloadedFile } from './fetcher/downloaded-file.interface';

export type FileMetaData = DownloadedFile

export interface PackageBaseInfo {
    title: string;
    expiration: Date;
}

export interface PackageDetails extends PackageBaseInfo {
    id: string;
    title: string;
    size: number;
    expiration: Date;
}

export interface PackageMetadata extends PackageDetails {
    files: FileMetaData[];
}

export type AvailablePackages = Array<PackageDetails>;
