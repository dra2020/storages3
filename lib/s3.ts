// Public libraries
import * as AWS from 'aws-sdk';

// Shared libraries
import * as Context from '@terrencecrowley/context';
import * as Storage from '@terrencecrowley/storage';
import * as Log from '@terrencecrowley/log';

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

  result(): number
  {
    if (this.data == null && this.err == null)
      return Storage.EPending;
    else if (this.err != null)
    {
      if (this.res && this.res.httpResponse && this.res.httpResponse.statusCode == 404)
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

  asError(): string
  {
      if (this.err)
        return this.err.message ? this.err.message : JSON.stringify(this.err);
      return undefined;
    }
  }

export class S3StorageManager extends Storage.StorageManager
{
  s3: any;
  count: number;

  constructor(bucketMap: Storage.BucketMap)
  {
    super(bucketMap);

    if (Context.xstring('aws_access_key_id') === undefined || Context.xstring('aws_secret_access_key') === undefined)
    {
      Log.error('S3: not configured: exiting');
      Log.dump();
      process.exit(1);
    }

    AWS.config.update({region: 'us-west-2'});
    this.s3 = new AWS.S3({apiVersion: '2006-03-01'});
    this.count = 0;
  }

  blobBucket(blob: Storage.StorageBlob): string
  {
    let s = this.bucketMap[blob.bucketName];
    if (s === undefined)
    {
      Log.error('S3: unknown bucket, exiting.');
      Log.dump();
      process.exit(1);
    }
    return s;
  }

  load(blob: Storage.StorageBlob): void
  {
    if (blob.id == '')
    {
      Log.error('S3: blob load called with empty key');
      return;
    }
    let id: string = `load+${blob.id}+${this.count++}`;

    Log.event('S3: load start');
    let trace = new Log.AsyncTimer('S3: load');
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

        Log.event('S3: load end');
        trace.log();
      });
  }

  save(blob: Storage.StorageBlob): void
  {
    if (blob.id == '')
    {
      Log.error('S3: blob save called with empty key');
      return;
    }
    let id: string = `save+${blob.id}+${this.count++}`;

    Log.event('S3: save start');

    let trace = new Log.AsyncTimer('S3: save');
    let params: any = { Bucket: this.blobBucket(blob), Key: blob.id };
    if (blob.asFile())
      params.FilePath = blob.asFile();
    else
      params.Body = blob.asString();
    let rq = new S3Request(blob);
    this.saveBlobIndex[id] = rq;
    blob.setSaving();
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

        Log.event('S3: save done');
        trace.log();
      });
  }

  del(blob: Storage.StorageBlob): void
  {
    if (blob.id == '')
    {
      Log.error('S3: blob delete called with empty key');
      return;
    }
    let id: string = `delete+${blob.id}+${this.count++}`;

    Log.event(`S3: del start`);

    let trace = new Log.AsyncTimer('S3: del');
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
        Log.event(`S3: del done`);
      });
  }
}
