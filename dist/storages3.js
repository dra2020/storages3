(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["storages3"] = factory();
	else
		root["storages3"] = factory();
})(global, function() {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./lib/all.ts":
/*!********************!*\
  !*** ./lib/all.ts ***!
  \********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(/*! ./s3 */ "./lib/s3.ts"), exports);


/***/ }),

/***/ "./lib/s3.ts":
/*!*******************!*\
  !*** ./lib/s3.ts ***!
  \*******************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StorageManager = exports.FsmTransferUrl = exports.FsmStreamLoader = void 0;
// Node libraries
const fs = __webpack_require__(/*! fs */ "fs");
const zlib = __webpack_require__(/*! zlib */ "zlib");
// Public libraries
const AWS = __webpack_require__(/*! aws-sdk */ "aws-sdk");
const Storage = __webpack_require__(/*! @dra2020/storage */ "@dra2020/storage");
const LogAbstract = __webpack_require__(/*! @dra2020/logabstract */ "@dra2020/logabstract");
const FSM = __webpack_require__(/*! @dra2020/fsm */ "@dra2020/fsm");
class S3Request {
    constructor(blob) {
        this.blob = blob;
        this.req = null;
        this.res = null;
        this.data = null;
        this.err = null;
    }
    continuationToken() {
        if (this.data && this.data.NextContinuationToken)
            return this.data.NextContinuationToken;
        return undefined;
    }
    result() {
        if (this.data == null && this.blob.asLoadStream() == null && this.err == null)
            return Storage.EPending;
        else if (this.err != null) {
            if (this.err.statusCode && this.err.statusCode == 404)
                return Storage.ENotFound;
            else
                return Storage.EFail;
        }
        else
            return Storage.ESuccess;
    }
    asString() {
        if (this.err || this.res == null || this.data == null || this.data.Body == null)
            return undefined;
        let body;
        if (this.data.ContentEncoding && this.data.ContentEncoding === 'gzip')
            body = zlib.gunzipSync(this.data.Body);
        else
            body = this.data.Body;
        return body.toString('utf-8');
    }
    // Really probably should be reverse semantics - you need to explicitly ask for the unprocessed buffer
    asUncompressedBuffer() {
        if (this.err || this.res == null || this.data == null || this.data.Body == null)
            return undefined;
        let body;
        if (this.data.ContentEncoding && this.data.ContentEncoding === 'gzip')
            body = zlib.gunzipSync(this.data.Body);
        else
            body = this.data.Body;
        return body;
    }
    asBuffer() {
        if (this.err || this.res == null || this.data == null || this.data.Body == null)
            return undefined;
        return this.data.Body;
    }
    asArray() {
        let a = [];
        if (this.data && Array.isArray(this.data.Contents))
            for (let i = 0; i < this.data.Contents.length; i++)
                a.push(this.data.Contents[i].Key ? this.data.Contents[i].Key : '');
        return a;
    }
    _dataToProps(data) {
        let props = {};
        props.ContentLength = (data.Size !== undefined) ? data.Size : 0;
        props.Key = data.Key;
        props.ETag = data.ETag;
        props.LastModified = data.LastModified;
        props.ContentEncoding = data.ContentEncoding;
        return props;
    }
    asProps() {
        let a = [];
        if (this.data && Array.isArray(this.data.Contents)) {
            for (let i = 0; i < this.data.Contents.length; i++)
                a.push(this._dataToProps(this.data.Contents[i]));
        }
        else
            a.push(this._dataToProps(this.data));
        return a;
    }
    asError() {
        if (this.err)
            return this.err.message ? this.err.message : JSON.stringify(this.err);
        return undefined;
    }
}
const ChunkSize = 4000000;
class FsmStreamLoader extends FSM.Fsm {
    constructor(env, sm, blob) {
        super(env);
        this.sm = sm;
        this.blob = blob;
        this.contentPos = 0;
        this.param = { Bucket: sm.blobBucket(blob), Key: blob.id };
        // We use passthrough stream because we want to make the load stream available
        // immediately but we don't actually know whether we are going to have to pipe
        // through gunzip or not until we get the first ContentEncoding header back.
        this.readStream = new Storage.MultiBufferPassThrough();
        this.passThrough = new Storage.MultiBufferPassThrough();
        this.blob.setLoadStream(this.passThrough);
    }
    get env() { return this._env; }
    tick() {
        if (this.ready) {
            // Figure out next chunk
            if (this.contentLength === undefined)
                this.param.Range = `bytes=0-${ChunkSize - 1}`;
            else
                this.param.Range = `bytes=${this.contentPos}-${Math.min(this.contentPos + ChunkSize - 1, this.contentLength - 1)}`;
            switch (this.state) {
                case FSM.FSM_STARTING:
                    this.sm.s3.getObject(this.param, (err, data) => {
                        if (err == null) {
                            // On first chunk, figure out if we need to pipe through gunzip
                            if (this.contentLength === undefined) {
                                if (data.ContentEncoding && data.ContentEncoding === 'gzip') {
                                    let unzip = zlib.createGunzip({});
                                    unzip.on('end', () => { this.passThrough._done(); this.setState(FSM.FSM_DONE); });
                                    unzip.on('error', () => { this.passThrough._done(); this.setState(FSM.FSM_ERROR); });
                                    this.readStream.pipe(unzip).pipe(this.passThrough);
                                }
                                else {
                                    this.readStream.on('end', () => { this.passThrough._done(); this.setState(FSM.FSM_DONE); });
                                    this.readStream.on('error', () => { this.passThrough._done(); this.setState(FSM.FSM_ERROR); });
                                    this.readStream.pipe(this.passThrough);
                                }
                            }
                            // Handle this data
                            if (data.Body)
                                this.readStream.write(data.Body);
                            // Update content range and content length for next time through, or noticing finish
                            if (data.ContentRange) {
                                let re = /bytes (\d+)-(\d+)\/(\d+)/;
                                let s = data.ContentRange; // "bytes start-end/total"
                                let matched = re.exec(s);
                                if (matched && matched.length === 4) {
                                    this.contentPos = Number(matched[2]) + 1;
                                    this.contentLength = Number(matched[3]);
                                }
                            }
                        }
                        // Error or done reading
                        if (err || this.contentPos === this.contentLength) {
                            this.err = err;
                            this.readStream._done();
                            if (err) {
                                this.passThrough._done();
                                this.setState(FSM.FSM_ERROR);
                            }
                        }
                        else
                            this.setState(FSM.FSM_STARTING);
                    });
                    break;
            }
        }
    }
}
exports.FsmStreamLoader = FsmStreamLoader;
class FsmTransferUrl extends Storage.FsmTransferUrl {
    constructor(env, bucket, params) {
        super(env, bucket, params);
    }
}
exports.FsmTransferUrl = FsmTransferUrl;
class StorageManager extends Storage.StorageManager {
    constructor(env, bucketMap) {
        super(env, bucketMap);
        if (this.env.context.xstring('aws_access_key_id') === undefined
            || this.env.context.xstring('aws_secret_access_key') === undefined) {
            this.env.log.error('S3: not configured: exiting');
            this.env.log.dump();
            process.exit(1);
        }
        AWS.config.update({ region: 'us-west-2' });
        this.s3 = new AWS.S3({ apiVersion: '2006-03-01' });
        this.count = 0;
    }
    get env() { return this._env; }
    lookupBucket(s) {
        while (this.bucketMap[s] !== undefined)
            s = this.bucketMap[s];
        return s;
    }
    blobBucket(blob) {
        return this.lookupBucket(blob.bucketName);
    }
    load(blob) {
        if (blob.id == '') {
            this.env.log.error('S3: blob load called with empty key');
            return;
        }
        let id = `load+${blob.id}+${this.count++}`;
        this.env.log.event('S3: load start', 1);
        let trace = new LogAbstract.AsyncTimer(this.env.log, 'S3: load', 1);
        let params = { Bucket: this.blobBucket(blob), Key: blob.id };
        let rq = new S3Request(blob);
        this.loadBlobIndex[id] = rq;
        blob.setLoading();
        if (blob.param('ContentDisposition') === 'stream') {
            let fsm = new FsmStreamLoader(this.env, this, blob);
            rq.req = fsm;
            new FSM.FsmOnDone(this.env, fsm, (f) => {
                this._finishLoad(blob, id, rq, fsm.err, undefined);
                trace.log();
            });
        }
        else {
            rq.req = this.s3.getObject(params, (err, data) => {
                this._finishLoad(blob, id, rq, err, data);
                trace.log();
            });
        }
    }
    _finishLoad(blob, id, rq, err, data) {
        rq.res = this;
        if (err)
            rq.err = err;
        else
            rq.data = data;
        blob.setLoaded(rq.result());
        blob.endLoad(rq);
        this.emit('load', blob);
        delete this.loadBlobIndex[id];
        this.env.log.event('S3: load end', 1);
    }
    head(blob) {
        if (blob.id == '') {
            this.env.log.error('S3: blob head called with empty key');
            return;
        }
        let id = `head+${blob.id}+${this.count++}`;
        this.env.log.event('S3: head start', 1);
        let trace = new LogAbstract.AsyncTimer(this.env.log, 'S3: head', 1);
        let params = { Bucket: this.blobBucket(blob), Key: blob.id };
        let rq = new S3Request(blob);
        this.headBlobIndex[id] = rq;
        blob.setLoading();
        rq.req = this.s3.headObject(params, (err, data) => {
            rq.res = this;
            if (err)
                rq.err = err;
            else
                rq.data = data;
            blob.setLoaded(rq.result());
            blob.endHead(rq);
            this.emit('head', blob);
            delete this.headBlobIndex[id];
            this.env.log.event('S3: head end', 1);
            trace.log();
        });
    }
    save(blob) {
        if (blob.id == '') {
            this.env.log.error('S3: blob save called with empty key');
            return;
        }
        let id = `save+${blob.id}+${this.count++}`;
        this.env.log.event('S3: save start', 1);
        let trace = new LogAbstract.AsyncTimer(this.env.log, 'S3: save', 1);
        let params = { Bucket: this.blobBucket(blob), Key: blob.id };
        if (blob.param('ContentEncoding'))
            params['ContentEncoding'] = blob.param('ContentEncoding');
        if (blob.param('ContentType'))
            params['ContentType'] = blob.param('ContentType');
        if (blob.param('CacheControl'))
            params['CacheControl'] = blob.param('CacheControl');
        let rq = new S3Request(blob);
        this.saveBlobIndex[id] = rq;
        blob.setSaving();
        // Get contents, try in order: 1) stream, 2) local file, 3) buffer, 4) utf8 string
        let blobStream = blob.asStream();
        if (blobStream == null && blob.param('ContentEncoding') !== 'gzip') // For gzip, need a buffer to compute length for save
         {
            let path = blob.asFile();
            if (path) {
                try {
                    blobStream = fs.createReadStream(path);
                }
                catch (err) {
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
        }
        if (blobStream != null)
            params.Body = blobStream;
        else {
            let b = blob.asBuffer();
            params.Body = b ? b : blob.asString();
        }
        rq.req = this.s3.putObject(params, (err, data) => {
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
    del(blob) {
        if (blob.id == '') {
            this.env.log.error('S3: blob delete called with empty key');
            return;
        }
        let id = `delete+${blob.id}+${this.count++}`;
        this.env.log.event(`S3: del start`, 1);
        let trace = new LogAbstract.AsyncTimer(this.env.log, 'S3: del', 1);
        let params = { Bucket: this.blobBucket(blob), Key: blob.id };
        let rq = new S3Request(blob);
        this.delBlobIndex[id] = rq;
        blob.setDeleting();
        rq.req = this.s3.deleteObject(params, (err, data) => {
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
    ls(blob, continuationToken) {
        let b = this.blobBucket(blob);
        if (b == '') {
            this.env.log.error('S3: blob ls called with empty bucket');
            return;
        }
        let id = `ls+${b}+${this.count++}`;
        this.env.log.event(`S3: ls start`, 1);
        let trace = new LogAbstract.AsyncTimer(this.env.log, 'S3: ls', 1);
        let params = { Bucket: b };
        if (continuationToken)
            params.ContinuationToken = continuationToken;
        let rq = new S3Request(blob);
        this.lsBlobIndex[id] = rq;
        blob.setListing();
        rq.req = this.s3.listObjectsV2(params, (err, data) => {
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
    createTransferUrl(params) {
        let fsm = new FsmTransferUrl(this.env, this.lookupBucket('transfers'), params);
        if (fsm === null) {
            let params = { Bucket: fsm.bucket, Fields: { key: fsm.key } };
            this.s3.createPresignedPost(params, (err, url) => {
                if (err) {
                    this.env.log.error(`S3: createPresignedPost failed: ${err}`);
                    fsm.setState(FSM.FSM_ERROR);
                }
                else {
                    fsm.url = url;
                    fsm.setState(FSM.FSM_DONE);
                }
            });
        }
        else {
            let s3params = { Bucket: fsm.bucket, Key: fsm.key };
            if (params.op === 'putObject')
                s3params.ContentType = fsm.params.contentType;
            this.s3.getSignedUrl(params.op, s3params, (err, url) => {
                if (err) {
                    this.env.log.error(`S3: getSignedUrl failed: ${err}`);
                    fsm.setState(FSM.FSM_ERROR);
                }
                else {
                    fsm.url = url;
                    fsm.setState(FSM.FSM_DONE);
                }
            });
        }
        return fsm;
    }
}
exports.StorageManager = StorageManager;


/***/ }),

/***/ "@dra2020/fsm":
/*!*******************************!*\
  !*** external "@dra2020/fsm" ***!
  \*******************************/
/***/ ((module) => {

module.exports = require("@dra2020/fsm");;

/***/ }),

/***/ "@dra2020/logabstract":
/*!***************************************!*\
  !*** external "@dra2020/logabstract" ***!
  \***************************************/
/***/ ((module) => {

module.exports = require("@dra2020/logabstract");;

/***/ }),

/***/ "@dra2020/storage":
/*!***********************************!*\
  !*** external "@dra2020/storage" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("@dra2020/storage");;

/***/ }),

/***/ "aws-sdk":
/*!**************************!*\
  !*** external "aws-sdk" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("aws-sdk");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");;

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__("./lib/all.ts");
/******/ })()
;
});
//# sourceMappingURL=storages3.js.map