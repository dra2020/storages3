import * as Context from '@terrencecrowley/context';
import * as Storage from '@terrencecrowley/storage';
import * as LogAbstract from '@terrencecrowley/logabstract';
import * as FSM from '@terrencecrowley/fsm';
export interface StorageS3Environment {
    context: Context.IContext;
    log: LogAbstract.ILog;
    fsmManager: FSM.FsmManager;
}
export declare class StorageManager extends Storage.StorageManager {
    s3: any;
    count: number;
    constructor(env: StorageS3Environment, bucketMap?: Storage.BucketMap);
    readonly env: StorageS3Environment;
    blobBucket(blob: Storage.StorageBlob): string;
    load(blob: Storage.StorageBlob): void;
    save(blob: Storage.StorageBlob): void;
    del(blob: Storage.StorageBlob): void;
    ls(blob: Storage.StorageBlob, continuationToken?: string): void;
}
