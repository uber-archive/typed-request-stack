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

var test = require('tape');

var stack = require('../index.js');
var SafeHandle = require('../safe-handle');

test('stack is a function', function t(assert) {
    assert.equal(typeof stack, 'function');
    assert.end();
});

test('stack throws with bad array argument', function t(assert) {
    assert.throws(function noargs() {
        stack();
    }, /Invalid typed request handler stack/);
    assert.end();
});

test('stack throws with a single empty array', function t(assert) {
    assert.throws(function emptyarray() {
        stack([]);
    }, /Invalid typed request handler stack/);
    assert.end();
});

test('empty stack with endpoint returns', function t(assert) {
    var handler = stack([], endpoint);

    var expectedTypedRequest = {};
    var expectedOpts = {};
    var expectedValue = {};

    handler(expectedTypedRequest, expectedOpts, function cb(err, value) {
        assert.ifError(err);
        assert.strictEqual(value, expectedValue);
        assert.end();
    });

    function endpoint(typedRequest, opts, callback) {
        assert.strictEqual(typedRequest, expectedTypedRequest);
        assert.strictEqual(opts, expectedOpts);

        callback(null, expectedValue);
    }
});

test('stack without endpoint returns', function t(assert) {
    var expectedTypedRequest = {};
    var expectedOpts = {};
    var expectedValue = {};

    function TestHandler() {}
    TestHandler.prototype.handleRequest = handleRequest;

    function handleRequest(typedRequest, opts, handle) {
        assert.strictEqual(typedRequest, expectedTypedRequest);
        assert.strictEqual(opts, expectedOpts);
        assert.ok(handle instanceof SafeHandle);

        handle.response(null, expectedValue);
    }

    var handler = stack([new TestHandler()]);

    handler(expectedTypedRequest, expectedOpts, function cb(err, value) {
        assert.ifError(err);
        assert.strictEqual(value, expectedValue);
        assert.end();
    });
});

test('full stack with endpoint returns value', function t(assert) {
    var expectedTypedRequest = {};
    var expectedOpts = {};
    var expectedValue = {};
    var index = 0;
    var savedHandle;

    function TestMiddlewareA() {}
    TestMiddlewareA.prototype.handleRequest = handleRequestA;
    TestMiddlewareA.prototype.handleResponse = handleResponseA;

    function TestMiddlewareB() {}
    TestMiddlewareB.prototype.handleRequest = handleRequestB;

    function TestMiddlewareC() {}
    TestMiddlewareC.prototype.handleResponse = handleResponseC;

    function handleRequestA(typedRequest, opts, handle) {
        assert.strictEqual(typedRequest, expectedTypedRequest);
        assert.strictEqual(opts, expectedOpts);
        assert.ok(handle instanceof SafeHandle);

        assert.strictEqual(index, 0);
        assert.strictEqual(handle._handle._handlerIndex, 0);
        assert.notOk(handle._handle._handlingResponse);
        index += 1;

        savedHandle = handle._handle;

        handle.request(opts);
    }

    function handleRequestB(typedRequest, opts, handle) {
        assert.strictEqual(typedRequest, expectedTypedRequest);
        assert.strictEqual(opts, expectedOpts);
        assert.ok(handle instanceof SafeHandle);

        assert.strictEqual(index, 1);
        assert.strictEqual(handle._handle._handlerIndex, 1);
        assert.notOk(handle._handle._handlingResponse);
        index += 1;

        handle.request(opts);
    }

    function endpoint(typedRequest, opts, callback) {
        assert.strictEqual(typedRequest, expectedTypedRequest);
        assert.strictEqual(opts, expectedOpts);

        assert.strictEqual(index, 2);
        index += 1;

        callback(null, expectedValue);
    }

    function handleResponseC(err, value, handle) {
        assert.ifError(err);
        assert.strictEqual(value, expectedValue);
        assert.ok(handle instanceof SafeHandle);

        assert.strictEqual(index, 3);
        assert.strictEqual(handle._handle._handlerIndex, 2);
        assert.ok(handle._handle._handlingResponse);
        index += 1;

        handle.response(null, expectedValue);
    }

    function handleResponseA(err, value, handle) {
        assert.ifError(err);
        assert.strictEqual(value, expectedValue);
        assert.ok(handle instanceof SafeHandle);

        assert.strictEqual(index, 4);
        assert.strictEqual(handle._handle._handlerIndex, 0);
        assert.ok(handle._handle._handlingResponse);
        index += 1;

        handle.response(null, expectedValue);
    }

    var handler = stack([
        new TestMiddlewareA(),
        new TestMiddlewareB(),
        new TestMiddlewareC()
    ], endpoint);

    handler(expectedTypedRequest, expectedOpts, function cb(err, value) {
        assert.ifError(err);
        assert.strictEqual(value, expectedValue);
        assert.strictEqual(index, 5);
        assert.strictEqual(savedHandle._handlerIndex, -1);
        assert.ok(savedHandle._finished);
        assert.ok(savedHandle._handlingResponse);
        assert.end();
    });
});

test('full stack with endpoint returns error', function t(assert) {
    var expectedTypedRequest = {};
    var expectedOpts = {};
    var expectedError = {};
    var index = 0;
    var savedHandle;

    function TestMiddlewareA() {}
    TestMiddlewareA.prototype.handleRequest = handleRequestA;
    TestMiddlewareA.prototype.handleResponse = handleResponseA;

    function TestMiddlewareB() {}
    TestMiddlewareB.prototype.handleRequest = handleRequestB;

    function TestMiddlewareC() {}
    TestMiddlewareC.prototype.handleResponse = handleResponseC;

    function handleRequestA(typedRequest, opts, handle) {
        assert.strictEqual(typedRequest, expectedTypedRequest);
        assert.strictEqual(opts, expectedOpts);
        assert.ok(handle instanceof SafeHandle);

        assert.strictEqual(index, 0);
        assert.strictEqual(handle._handle._handlerIndex, 0);
        assert.notOk(handle._handle._handlingResponse);
        index += 1;

        savedHandle = handle._handle;

        handle.request(opts);
    }

    function handleRequestB(typedRequest, opts, handle) {
        assert.strictEqual(typedRequest, expectedTypedRequest);
        assert.strictEqual(opts, expectedOpts);
        assert.ok(handle instanceof SafeHandle);

        assert.strictEqual(index, 1);
        assert.strictEqual(handle._handle._handlerIndex, 1);
        assert.notOk(handle._handle._handlingResponse);
        index += 1;

        handle.request(opts);
    }

    function endpoint(typedRequest, opts, callback) {
        assert.strictEqual(typedRequest, expectedTypedRequest);
        assert.strictEqual(opts, expectedOpts);

        assert.strictEqual(index, 2);
        index += 1;

        callback(expectedError);
    }

    function handleResponseC(err, value, handle) {
        assert.strictEqual(err, expectedError);
        assert.strictEqual(value, undefined);
        assert.ok(handle instanceof SafeHandle);

        assert.strictEqual(index, 3);
        assert.strictEqual(handle._handle._handlerIndex, 2);
        assert.ok(handle._handle._handlingResponse);
        index += 1;

        handle.response(err);
    }

    function handleResponseA(err, value, handle) {
        assert.strictEqual(err, expectedError);
        assert.strictEqual(value, undefined);
        assert.ok(handle instanceof SafeHandle);

        assert.strictEqual(index, 4);
        assert.strictEqual(handle._handle._handlerIndex, 0);
        assert.ok(handle._handle._handlingResponse);
        index += 1;

        handle.response(err);
    }

    var handler = stack([
        new TestMiddlewareA(),
        new TestMiddlewareB(),
        new TestMiddlewareC()
    ], endpoint);

    handler(expectedTypedRequest, expectedOpts, function cb(err, value) {
        assert.strictEqual(err, expectedError);
        assert.strictEqual(value, undefined);
        assert.strictEqual(index, 5);
        assert.strictEqual(savedHandle._handlerIndex, -1);
        assert.ok(savedHandle._finished);
        assert.ok(savedHandle._handlingResponse);
        assert.end();
    });
});

test('callback is optional', function t(assert) {
    var savedHandle;

    function HandleSaver() {}
    HandleSaver.prototype.handleRequest = saveHandle;

    function saveHandle(typedRequest, opts, handle) {
        savedHandle = handle._handle;
        handle.request(opts);
    }

    var handler = stack([new HandleSaver()], handleRequest);

    var expectedTypedRequest = {};
    var expectedOpts = {};

    handler(expectedTypedRequest, expectedOpts);

    function handleRequest(typedRequest, opts, callback) {
        assert.strictEqual(typedRequest, expectedTypedRequest);
        assert.strictEqual(opts, expectedOpts);

        callback(null);

        process.nextTick(function assertFinished() {
            assert.ok(savedHandle._finished);
            assert.end();
        });
    }
});

test('handle.request while responding callback error', function t(assert) {
    function EvilMiddleware() {}
    EvilMiddleware.prototype.handleResponse = handleEvilResponse;

    function handleEvilResponse(err, value, handle) {
        handle.request();
    }

    function testEndpoint(typedRequest, opts, callback) {
        callback(null);
    }

    var handler = stack([new EvilMiddleware()], testEndpoint);

    handler(null, null, function expectErroCallback(err, value) {
        assert.ok(err instanceof Error);
        assert.strictEqual(value, undefined);
        assert.strictEqual(
            err.message,
            'Request handler called while processing response'
        );
        assert.end();
    });
});

test('expected downstream request handler callback error', function t(assert) {
    function ResponseMiddleware() {}
    ResponseMiddleware.prototype.handleResponse = handleResponse;
    function handleResponse() {
        assert.fail();
    }

    var handler = stack([new ResponseMiddleware()]);

    handler(null, null, function expectErrorCallback(err, value) {
        assert.ok(err instanceof Error);
        assert.strictEqual(value, undefined);
        assert.strictEqual(
            err.message,
            'Expected downstream request handler'
        );
        assert.end();
    });
});

test('handle.request while responding throw error', function t(assert) {
    function EvilMiddleware() {}
    EvilMiddleware.prototype.handleResponse = handleEvilResponse;

    function handleEvilResponse(err, value, handle) {
        handle.request();
    }

    function testEndpoint(typedRequest, opts, callback) {
        callback(null);
    }

    var handler = stack([new EvilMiddleware()], testEndpoint);

    assert.throws(function expectError() {
        handler(null, null);
    }, /Request handler called while processing response/);

    assert.end();
});

test('expected downstream request handler throw error', function t(assert) {
    function ResponseMiddleware() {}
    ResponseMiddleware.prototype.handleResponse = handleResponse;
    function handleResponse() {
        assert.fail();
    }

    var handler = stack([new ResponseMiddleware()]);

    assert.throws(function expectError() {
        handler(null, null);
    }, /Expected downstream request handler/);

    assert.end();
});

test('handle.request when finished throws error', function t(assert) {
    function BrokenHandleRequest() {}
    BrokenHandleRequest.prototype.handleRequest = handleBrokenReq;

    function handleBrokenReq(typedRequest, opts, handle) {
        handle._handle._finished = true;
        handle.request(null);
    }

    var handler = stack([new BrokenHandleRequest()]);

    assert.throws(function expectError() {
        handler(null, null);
    }, /Handling request when response is finished/);

    assert.end();
});

test('handle.response when finished throws error', function t(assert) {
    function BrokenHandleResponse() {}
    BrokenHandleResponse.prototype.handleRequest = handleBrokenRes;

    function handleBrokenRes(typedRequest, opts, handle) {
        handle._handle._finished = true;
        handle.response(null);
    }

    var handler = stack([new BrokenHandleResponse()]);

    assert.throws(function expectError() {
        handler(null, null);
    }, /Handling response when response is finished/);

    assert.end();
});

test('calling callback twice throws error', function t(assert) {
    var savedHandle;

    function HandleSaver() {}
    HandleSaver.prototype.handleRequest = saveHandle;

    function saveHandle(typedRequest, opts, handle) {
        savedHandle = handle._handle;
        handle.response(null);
    }

    var handler = stack([new HandleSaver()]);

    handler(null, null, function cb(err) {
        assert.ifError(err);

        assert.throws(function expectError() {
            savedHandle._handleCallback(null);
        }, /Callback called twice after response finished/);

        assert.end();
    });
});

test('calling request twice callback error', function t(assert) {
    function RequestTwice() {}
    RequestTwice.prototype.handleRequest = callRequestTwice;

    function callRequestTwice(typedRequest, opts, handle) {
        handle.request(opts);
        handle.request(opts);
    }

    function endpoint() {
        // Do nothing
    }

    var handler = stack([new RequestTwice()], endpoint);

    handler(null, null, function (err, value) {
        assert.ok(err);
        assert.strictEqual(value, undefined);
        assert.strictEqual(
            err.message,
            'handle.request called when handle.request already called'
        );
        assert.end();
    });
});

test('calling response twice callback error', function t(assert) {
    function PauseResponse() {}
    PauseResponse.prototype.handleResponse = function () {};

    function endpoint(typedRequest, opts, callback) {
        callback(null);
        callback(null);
    }

    var handler = stack([new PauseResponse()], endpoint);

    handler(null, null, function (err, value) {
        assert.ok(err);
        assert.strictEqual(value, undefined);
        assert.strictEqual(
            err.message,
            'handle.response called when handle.response already called'
        );
        assert.end();
    });
});

test('calling response after request callback error', function t(assert) {
    function RequestResponse() {}
    RequestResponse.prototype.handleRequest = callRequestResponse;

    function callRequestResponse(typedRequest, opts, handle) {
        handle.request(opts);
        handle.response(null);
    }

    function endpoint() {
        // Do nothing
    }

    var handler = stack([new RequestResponse()], endpoint);

    handler(null, null, function (err, value) {
        assert.ok(err);
        assert.strictEqual(value, undefined);
        assert.strictEqual(
            err.message,
            'handle.response called when handle.request already called'
        );
        assert.end();
    });
});

test('calling request after response callback error', function t(assert) {
    function PauseResponse() {}
    PauseResponse.prototype.handleResponse = function () {};

    function ResponseRequest() {}
    ResponseRequest.prototype.handleRequest = callResponseRequest;

    function callResponseRequest(typedRequest, opts, handle) {
        handle.response(null);
        handle.request(opts);
    }

    function endpoint() {
        // Do nothing
    }

    var handler = stack([
        new PauseResponse(),
        new ResponseRequest()
    ], endpoint);

    handler(null, null, function (err, value) {
        assert.ok(err);
        assert.strictEqual(value, undefined);
        assert.strictEqual(
            err.message,
            'handle.request called when handle.response already called'
        );
        assert.end();
    });
});

test('aborting middleware calls parent handle response', function(assert) {
    var expectedValue = {};

    function ExpectedResponseHandler() {}
    ExpectedResponseHandler.prototype.handleResponse = handleExpectedResponse;

    function handleExpectedResponse(err, value, handle) {
        assert.ifError(err);
        assert.strictEqual(value, expectedValue);
        handle.response(err, value);
    }

    function AbortMiddleware() {}
    AbortMiddleware.prototype.handleRequest = handleRequestAbort;
    AbortMiddleware.prototype.handleResponse = failHandleResponse;

    function handleRequestAbort(typedRequest, opts, handle) {
        handle.response(null, expectedValue);
    }

    function failHandleResponse() {
        assert.fail();
    }

    var handler = stack([
        new ExpectedResponseHandler(),
        new AbortMiddleware()
    ]);

    handler(null, null, function callback(err, value) {
        assert.strictEqual(value, expectedValue);
        assert.end();
    });
});

test('handle provides shared state mechanism', function t(assert) {
    function RequestTimer() {}
    RequestTimer.prototype.handleRequest = handleTimedRequest;
    RequestTimer.prototype.handleResponse = handleTimedResponse;

    function handleTimedRequest(typedRequest, opts, handle) {
        handle.sharedState = {
            startTime: Date.now()
        };

        handle.request(opts);
    }

    function handleTimedResponse(err, value, handle) {
        var sharedState = handle.sharedState;
        var requestTime = Date.now() - sharedState.startTime;

        assert.ok(requestTime > 0);

        handle.response(err, value);
    }

    function endpoint(typedRequest, opts, callback) {
        setTimeout(function delayResponse() {
            callback(null);
        }, 500);
    }

    var handler = stack([new RequestTimer()], endpoint);

    handler(null, null, function callback() {
        assert.end();
    });

});
