import * as Storage from '@terrencecrowley/storage';
export declare class S3StorageManager extends Storage.StorageManager {
    s3: any;
    count: number;
    constructor(bucketMap: Storage.BucketMap);
    blobBucket(blob: Storage.StorageBlob): string;
    load(blob: Storage.StorageBlob): void;
    save(blob: Storage.StorageBlob): void;
    del(blob: Storage.StorageBlob): void;
}