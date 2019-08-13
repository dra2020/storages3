import * as Context from '@dra2020/context';
import * as Storage from '@dra2020/storage';
import * as LogAbstract from '@dra2020/logabstract';
import * as FSM from '@dra2020/fsm';
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
