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
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./lib/all.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./lib/all.ts":
/*!********************!*\
  !*** ./lib/all.ts ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(/*! ./s3 */ "./lib/s3.ts"));


/***/ }),

/***/ "./lib/s3.ts":
/*!*******************!*\
  !*** ./lib/s3.ts ***!
  \*******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
// Public libraries
const AWS = __webpack_require__(/*! aws-sdk */ "aws-sdk");
// Shared libraries
const Context = __webpack_require__(/*! @terrencecrowley/context */ "@terrencecrowley/context");
const Storage = __webpack_require__(/*! @terrencecrowley/storage */ "@terrencecrowley/storage");
const Log = __webpack_require__(/*! @terrencecrowley/log */ "@terrencecrowley/log");
class S3Request {
    constructor(blob) {
        this.blob = blob;
        this.req = null;
        this.res = null;
        this.data = null;
        this.err = null;
    }
    result() {
        if (this.data == null && this.err == null)
            return Storage.EPending;
        else if (this.err != null) {
            if (this.res && this.res.httpResponse && this.res.httpResponse.statusCode == 404)
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
        return this.data.Body.toString('utf-8');
    }
    asError() {
        if (this.err)
            return this.err.message ? this.err.message : JSON.stringify(this.err);
        return undefined;
    }
}
class S3StorageManager extends Storage.StorageManager {
    constructor(bucketMap) {
        super(bucketMap);
        if (Context.xstring('aws_access_key_id') === undefined || Context.xstring('aws_secret_access_key') === undefined) {
            Log.error('S3: not configured: exiting');
            Log.dump();
            process.exit(1);
        }
        AWS.config.update({ region: 'us-west-2' });
        this.s3 = new AWS.S3({ apiVersion: '2006-03-01' });
        this.count = 0;
    }
    blobBucket(blob) {
        let s = this.bucketMap[blob.bucketName];
        if (s === undefined) {
            Log.error('S3: unknown bucket, exiting.');
            Log.dump();
            process.exit(1);
        }
        return s;
    }
    load(blob) {
        if (blob.id == '') {
            Log.error('S3: blob load called with empty key');
            return;
        }
        let id = `load+${blob.id}+${this.count++}`;
        Log.event('S3: load start');
        let trace = new Log.AsyncTimer('S3: load');
        let params = { Bucket: this.blobBucket(blob), Key: blob.id };
        let rq = new S3Request(blob);
        this.loadBlobIndex[id] = rq;
        blob.setLoading();
        rq.req = this.s3.getObject(params, (err, data) => {
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
    save(blob) {
        if (blob.id == '') {
            Log.error('S3: blob save called with empty key');
            return;
        }
        let id = `save+${blob.id}+${this.count++}`;
        Log.event('S3: save start');
        let trace = new Log.AsyncTimer('S3: save');
        let params = { Bucket: this.blobBucket(blob), Key: blob.id };
        if (blob.asFile())
            params.FilePath = blob.asFile();
        else
            params.Body = blob.asString();
        let rq = new S3Request(blob);
        this.saveBlobIndex[id] = rq;
        blob.setSaving();
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
            Log.event('S3: save done');
            trace.log();
        });
    }
    del(blob) {
        if (blob.id == '') {
            Log.error('S3: blob delete called with empty key');
            return;
        }
        let id = `delete+${blob.id}+${this.count++}`;
        Log.event(`S3: del start`);
        let trace = new Log.AsyncTimer('S3: del');
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
            Log.event(`S3: del done`);
        });
    }
}
exports.S3StorageManager = S3StorageManager;


/***/ }),

/***/ "@terrencecrowley/context":
/*!*******************************************!*\
  !*** external "@terrencecrowley/context" ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@terrencecrowley/context");

/***/ }),

/***/ "@terrencecrowley/log":
/*!***************************************!*\
  !*** external "@terrencecrowley/log" ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@terrencecrowley/log");

/***/ }),

/***/ "@terrencecrowley/storage":
/*!*******************************************!*\
  !*** external "@terrencecrowley/storage" ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@terrencecrowley/storage");

/***/ }),

/***/ "aws-sdk":
/*!**************************!*\
  !*** external "aws-sdk" ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("aws-sdk");

/***/ })

/******/ });
});
//# sourceMappingURL=storages3.js.map