/*

The MIT License (MIT)

Copyright (c) 2015 Uber

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
'use strict';

module.exports = SafeHandle;

function SafeHandle(handle, previousSafeHandle) {
    this._handle = handle;
    this._requestHandled = false;
    this._responseHandled = false;
    applyPreviousHandle(this, previousSafeHandle);
}

SafeHandle.prototype.request = safeHandleRequest;
SafeHandle.prototype.response = safeHandleResponse;

function safeHandleRequest(opts) {
    var self = this;
    var handle = self._handle;

    if (self._requestHandled) {
        handle._handleError(new Error(
            'handle.request called when handle.request already called'
        ));
    } else if (self._responseHandled) {
        handle._handleError(new Error(
            'handle.request called when handle.response already called'
        ));
    } else {
        self._requestHandled = true;
        handle.request(opts);
    }
}

function safeHandleResponse(err, value) {
    var self = this;
    var handle = self._handle;

    if (self._requestHandled) {
        handle._handleError(new Error(
            'handle.response called when handle.request already called'
        ));
    } else if (self._responseHandled) {
        handle._handleError(new Error(
            'handle.response called when handle.response already called'
        ));
    } else {
        self._responseHandled = true;
        handle.response(err, value);
    }
}

function applyPreviousHandle(safeHandle, previousSafeHandle) {
    if (previousSafeHandle instanceof SafeHandle &&
        previousSafeHandle.hasOwnProperty('sharedState')) {
        safeHandle.sharedState = previousSafeHandle.sharedState;
    }
}
