/// <reference types="node" />
import * as stream from 'stream';
import * as Context from '@dra2020/context';
import * as Storage from '@dra2020/storage';
import * as LogAbstract from '@dra2020/logabstract';
import * as FSM from '@dra2020/fsm';
export interface StorageS3Environment {
    context: Context.IContext;
    log: LogAbstract.ILog;
    fsmManager: FSM.FsmManager;
}
declare class S3Request implements Storage.BlobRequest {
    blob: Storage.StorageBlob;
    req: any;
    res: any;
    data: any;
    err: any;
    constructor(blob: Storage.StorageBlob);
    continuationToken(): string;
    result(): number;
    asString(): string;
    asBuffer(): Buffer;
    asArray(): string[];
    asProps(): Storage.BlobProperties[];
    asError(): string;
}
export declare class FsmStreamLoader extends FSM.Fsm {
    sm: StorageManager;
    blob: Storage.StorageBlob;
    param: any;
    err: any;
    contentLength: number;
    contentPos: number;
    readStream: stream.Transform;
    passThrough: stream.Transform;
    constructor(env: StorageS3Environment, sm: StorageManager, blob: Storage.StorageBlob);
    readonly env: StorageS3Environment;
    tick(): void;
}
export declare class StorageManager extends Storage.StorageManager {
    s3: any;
    count: number;
    constructor(env: StorageS3Environment, bucketMap?: Storage.BucketMap);
    readonly env: StorageS3Environment;
    blobBucket(blob: Storage.StorageBlob): string;
    load(blob: Storage.StorageBlob): void;
    _finishLoad(blob: Storage.StorageBlob, id: string, rq: S3Request, err: any, data: any): void;
    save(blob: Storage.StorageBlob): void;
    del(blob: Storage.StorageBlob): void;
    ls(blob: Storage.StorageBlob, continuationToken?: string): void;
}
export {};
