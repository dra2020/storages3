/// <reference types="node" />
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
    _dataToProps(data: any): Storage.BlobProperties;
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
    readStream: Storage.MultiBufferPassThrough;
    passThrough: Storage.MultiBufferPassThrough;
    constructor(env: StorageS3Environment, sm: StorageManager, blob: Storage.StorageBlob);
    get env(): StorageS3Environment;
    tick(): void;
}
export declare class FsmTransferUrl extends Storage.FsmTransferUrl {
    storageManager: StorageManager;
    constructor(env: StorageS3Environment, bucket: string, op: Storage.TransferUrlOp);
}
export declare class StorageManager extends Storage.StorageManager {
    s3: any;
    count: number;
    constructor(env: StorageS3Environment, bucketMap?: Storage.BucketMap);
    get env(): StorageS3Environment;
    lookupBucket(s: string): string;
    blobBucket(blob: Storage.StorageBlob): string;
    load(blob: Storage.StorageBlob): void;
    _finishLoad(blob: Storage.StorageBlob, id: string, rq: S3Request, err: any, data: any): void;
    head(blob: Storage.StorageBlob): void;
    save(blob: Storage.StorageBlob): void;
    del(blob: Storage.StorageBlob): void;
    ls(blob: Storage.StorageBlob, continuationToken?: string): void;
    createTransferUrl(op: Storage.TransferUrlOp): Storage.FsmTransferUrl;
}
export {};
