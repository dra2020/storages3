// Node libraries
import * as fs from 'fs';
import * as stream from 'stream';

// Public libraries
import * as AWS from 'aws-sdk';

// Shared libraries
import * as Context from '@dra2020/context';
import * as Storage from '@dra2020/storage';
import * as LogAbstract from '@dra2020/logabstract';
import * as FSM from '@dra2020/fsm';

export interface StorageS3Environment
{
  context: Context.IContext;
  log: LogAbstract.ILog;
  fsmManager: FSM.FsmManager;
}

class S3Request implements Storage.BlobRequest
{
  blob: Storage.StorageBlob;
  req: any;
  res: any;
  data: any;
  err: any;

  constructor(blob: Storage.StorageBlob)
  {
    this.blob = blob;
    this.req = null;
    this.res = null;
    this.data = null;
    this.err = null;
  }

  continuationToken(): string
  {
    if (this.data && this.data.NextContinuationToken)
      return this.data.NextContinuationToken;

    return undefined;
  }

  result(): number
  {
    if (this.data == null && this.err == null)
      return Storage.EPending;
    else if (this.err != null)
    {
      if (this.err.statusCode && this.err.statusCode == 404)
        return Storage.ENotFound;
      else
        return Storage.EFail;
    }
    else
      return Storage.ESuccess;
  }

  asString(): string
  {
    if (this.err || this.res == null || this.data == null || this.data.Body == null)
      return undefined;
    return this.data.Body.toString('utf-8');
  }

  asBuffer(): Buffer
  {
    if (this.err || this.res == null || this.data == null || this.data.Body == null)
      return undefined;
    return this.data.Body;
  }

  asArray(): string[]
  {
    let a: string[] = [];

    if (this.data && Array.isArray(this.data.Contents))
      for (let i: number = 0; i < this.data.Contents.length; i++)
        a.push(this.data.Contents[i].Key ? this.data.Contents[i].Key : '');

    return a;
  }

  asProps(): Storage.BlobProperties[]
  {
    let a: Storage.BlobProperties[] = [];

    if (this.data && Array.isArray(this.data.Contents))
      for (let i: number = 0; i < this.data.Contents.length; i++)
        a.push({ ContentLength: this.data.Contents[i].Size !== undefined ? this.data.Contents[i].Size : 0 });

    return a;
  }

  asError(): string
  {
      if (this.err)
        return this.err.message ? this.err.message : JSON.stringify(this.err);
      return undefined;
    }
  }

export class StorageManager extends Storage.StorageManager
{
  s3: any;
  count: number;

  constructor(env: StorageS3Environment, bucketMap?: Storage.BucketMap)
  {
    super(env, bucketMap);

    if (this.env.context.xstring('aws_access_key_id') === undefined
        || this.env.context.xstring('aws_secret_access_key') === undefined)
    {
      this.env.log.error('S3: not configured: exiting');
      this.env.log.dump();
      process.exit(1);
    }

    AWS.config.update({region: 'us-west-2'});
    this.s3 = new AWS.S3({apiVersion: '2006-03-01'});
    this.count = 0;
  }

  get env(): StorageS3Environment { return this._env as StorageS3Environment; }

  blobBucket(blob: Storage.StorageBlob): string
  {
    let s: string = blob.bucketName;
    while (this.bucketMap[s] !== undefined)
      s = this.bucketMap[s];
    return s;
  }

  load(blob: Storage.StorageBlob): void
  {
    if (blob.id == '')
    {
      this.env.log.error('S3: blob load called with empty key');
      return;
    }
    let id: string = `load+${blob.id}+${this.count++}`;

    this.env.log.event('S3: load start', 1);
    let trace = new LogAbstract.AsyncTimer(this.env.log, 'S3: load', 1);
    let params = { Bucket: this.blobBucket(blob), Key: blob.id };
    let rq = new S3Request(blob);
    this.loadBlobIndex[id] = rq;
    blob.setLoading();
    rq.req = this.s3.getObject(params, (err: any, data: any) => {
        if (err)
          rq.err = err;
        else
          rq.data = data;
        rq.res = this;

        blob.setLoaded(rq.result());
        blob.endLoad(rq);
        this.emit('load', blob);

        delete this.loadBlobIndex[id];

        this.env.log.event('S3: load end', 1);
        trace.log();
      });
  }

  save(blob: Storage.StorageBlob): void
  {
    if (blob.id == '')
    {
      this.env.log.error('S3: blob save called with empty key');
      return;
    }
    let id: string = `save+${blob.id}+${this.count++}`;

    this.env.log.event('S3: save start', 1);

    let trace = new LogAbstract.AsyncTimer(this.env.log, 'S3: save', 1);
    let params: any = { Bucket: this.blobBucket(blob), Key: blob.id };
    if (blob.bCompress)
      params['ContentEncoding'] = 'gzip';
    let rq = new S3Request(blob);
    this.saveBlobIndex[id] = rq;
    blob.setSaving();

    // Get contents
    let path: string = blob.asFile();
    let blobStream: stream.Readable = null;
    if (path)
    {
      try
      {
        blobStream = fs.createReadStream(path);
        params.Body = blobStream;
      }
      catch (err)
      {
        rq.err = err;
        process.nextTick(() => {
            blob.setSaved(rq.result());
            blob.endSave(rq);
            this.emit('save', blob);
            delete this.saveBlobIndex[id];
            this.env.log.error('S3: failed to open blob path file');
            trace.log();
          });
        return;
      }
    }
    else
    {
      let b = blob.asBuffer();
      params.Body = b ? b : blob.asString();
    }

    rq.req = this.s3.putObject(params, (err: any, data: any) => {
        if (err)
          rq.err = err;
        else
          rq.data = data;
        rq.res = this;

        blob.setSaved(rq.result());
        blob.endSave(rq);
        this.emit('save', blob);

        delete this.saveBlobIndex[id];

        this.env.log.event('S3: save done', 1);
        trace.log();

        if (blobStream)
          blobStream.destroy();
      });
  }

  del(blob: Storage.StorageBlob): void
  {
    if (blob.id == '')
    {
      this.env.log.error('S3: blob delete called with empty key');
      return;
    }
    let id: string = `delete+${blob.id}+${this.count++}`;

    this.env.log.event(`S3: del start`, 1);

    let trace = new LogAbstract.AsyncTimer(this.env.log, 'S3: del', 1);
    let params = { Bucket: this.blobBucket(blob), Key: blob.id };
    let rq = new S3Request(blob);
    this.delBlobIndex[id] = rq;
    blob.setDeleting();
    rq.req = this.s3.deleteObject(params, (err: any, data: any) => {
        if (err)
          rq.err = err;
        else
          rq.data = data;
        rq.res = this;

        blob.endDelete(rq);
        this.emit('del', blob);

        delete this.delBlobIndex[id];

        trace.log();
        this.env.log.event(`S3: del done`, 1);
      });
  }

  ls(blob: Storage.StorageBlob, continuationToken?: string): void
  {
    let b = this.blobBucket(blob);
    if (b == '')
    {
      this.env.log.error('S3: blob ls called with empty bucket');
      return;
    }
    let id: string = `ls+${b}+${this.count++}`;

    this.env.log.event(`S3: ls start`, 1);

    let trace = new LogAbstract.AsyncTimer(this.env.log, 'S3: ls', 1);
    let params: any = { Bucket: b };
    if (continuationToken)
      params.ContinuationToken = continuationToken;
    let rq = new S3Request(blob);
    this.lsBlobIndex[id] = rq;
    blob.setListing();
    rq.req = this.s3.listObjectsV2(params, (err: any, data: any) => {
        if (err)
          rq.err = err;
        else
          rq.data = data;
        rq.res = this;

        blob.setListed();
        blob.endList(rq);
        this.emit('ls', blob);

        delete this.lsBlobIndex[id];

        trace.log();
        this.env.log.event(`S3: ls done`, 1);
      });
  }
}
