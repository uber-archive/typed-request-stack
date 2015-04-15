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

var SafeHandle = require('./safe-handle');

module.exports = TypedRequestHandle;

function TypedRequestHandle(handlerStack, typedRequest, cb) {
    this._handlerStack = handlerStack;
    this._typedRequest = typedRequest;
    this._handlerIndex = -1;
    this._handlingResponse = false;
    this._finished = false;
    this._callback = cb;
    this._safeRequestHandles = [];
    this._safeResponseHandles = [];
}

TypedRequestHandle.prototype.request = handleRequest;
TypedRequestHandle.prototype.response = handleResponse;
TypedRequestHandle.prototype._handleError = handleError;
TypedRequestHandle.prototype._handleCallback = handleCallback;

function handleRequest(opts) {
    var self = this;
    var descendingStack = true;
    var handlerStack = self._handlerStack;
    var requestHandler;

    if (self._finished) {
        return self._handleError(new Error(
            'Handling request when response is finished'
        ));
    }

    if (self._handlingResponse) {
        return self._handleError(new Error(
            'Request handler called while processing response'
        ));
    }

    while (descendingStack) {
        if (++self._handlerIndex >= handlerStack.length) {
            return self._handleError(new Error(
                'Expected downstream request handler'
            ));
        }

        requestHandler = handlerStack[self._handlerIndex];

        if (typeof requestHandler.handleRequest === 'function') {
            descendingStack = false;
        }
    }

    var handle = new SafeHandle(self);
    this._safeRequestHandles[self._handlerIndex] = handle;

    return requestHandler.handleRequest(self._typedRequest, opts, handle);
}

function handleResponse(err, value) {
    var self = this;
    var ascendingStack = true;
    var handlerStack = self._handlerStack;
    var responseHandler;

    if (self._finished) {
        return self._handleError(new Error(
            'Handling response when response is finished'
        ));
    }

    self._handlingResponse = true;
    self._handlerIndex--;

    while (ascendingStack) {
        if (self._handlerIndex < 0) {
            return self._handleCallback(err, value);
        }

        responseHandler = handlerStack[self._handlerIndex];

        if (typeof responseHandler.handleResponse === 'function') {
            ascendingStack = false;
        } else {
            self._handlerIndex--;
        }
    }

    var previousHandle = self._safeRequestHandles[self._handlerIndex];
    var handle = new SafeHandle(self, previousHandle);
    self._safeResponseHandles[self._handlerIndex] = handle;

    return responseHandler.handleResponse(err, value, handle);
}

function handleError(err) {
    var self = this;

    if (!self._finished) {
        self._finished = true;

        if (self._callback) {
            self._callback(err);
        } else {
            throw err;
        }
    } else {
        throw err;
    }
}

function handleCallback(err, value) {
    var self = this;

    if (self._finished) {
        return self._handleError(new Error(
            'Callback called twice after response finished'
        ));
    }

    self._finished = true;

    if (typeof self._callback === 'function') {
        if (err) {
            return self._callback(err);
        } else {
            return self._callback(null, value);
        }
    }

    return;
}
