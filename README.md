# typed-request-stack

<!--
    [![build status][build-png]][build]
    [![Coverage Status][cover-png]][cover]
    [![Davis Dependency status][dep-png]][dep]
-->

<!-- [![NPM][npm-png]][npm] -->

Middleware stack runner for typed HTTP requests

## Example

```js
var stack = require("typed-request-stack");

var middleware = require('./my-service-middleware');
var requestValidation = require('./request-validation');
var responseValidtion = require('./response-validation');

// -> Exports function (typedRequest, opts, handle)
module.exports = stack([
    // User-implemented role-based security middleware,
    middleware.secure(['Admin']),

    // Validation for this endpoint
    middleware.validate(requestValidation, responseValidation)
], dummyEndpoint)

// The main body of the endpoint implemetation
function dummyEndpoint(typedRequest, opts, callback) {
    callback(null, {
        statusCode: 200,
        body: "Hello world"
    });
}
```

## Docs

### `var endpoint = stack([/*middleware*/], endpointHandler)`

```ocaml
typed-request-stack := (
  stack: Array<TypedHandler>,
  endpoint?: TypedRequestHandler
) => (
  typedRequest: TypedRequest,
  opts: Object,
  callback?: (err?: error, value: Any) => void 
) => void

```

`TypedRequestStack` allows you to to compose a collection of "middleware"
functions and apply them in order. The stack is descended from the first
handler for the request, and then in reverse order for the response.

```
                 Start                               End
                   |                                  ^
                   V                                  |
        +----------------------+            +----------------------+
    A - |    Handle request    |     +--->  |    Handle response   |
        +----------------------+     |      +----------------------+
                   |                 |                 ^
                   V                 |                 |
  middleware A calls handle.request  |  middleware B calls handle.reponse
                   |                 |                 |
                   v                 |                 |
        +----------------------+     |      +----------------------+
    B - |    Handle request    |  ?--+      |    Handle response   |
        +----------------------+            +----------------------+
                   | middleware B could abort         ^
                   | early (if there was an           |
                   | error for example) by            |   
                   | calling handle.response          |
                   | inside handle request            |
                   |                                  |
                   +------+                    +------+ Endpoint calls
                          |                    |        callback
                          V                    | 
                         +----------------------+
                         |       Endpoint       |
                         +----------------------+
```

The callback passed into the function returned by `typed-request-stack` will
receive the last result `(err, value)` in the response phase.

When a handleResponse function aborts the request by calling handle.response,
the parent response handler is first to receive the value. This behaves as if
the parent response function is a callback passed into the request handler.

### Defining middleware `TypedHandler`

```
type TypedHandler : {
    handleRequest: TypedRequestHandler,
    handleResponse: TypedResponseHandler
}
```

Middleware in the stack should implement `handleRequest` or `handleResponse`.
There is no obligation to implement both, but one of these functions must be
implemented. If the next middleware does not implement a handler for the
request or response phase, it will simply be skipped, and the next handler
used.

### Example: Implementing middleware

```js
'use strict';

module.exports = Logger;

function Logger(logger) {
    if (!(this instanceof Logger)) {
        return new Logger(logger);
    }

    // We can configure our middleware in the constructor
    this.logger = logger || console.log.bind(console);
}

Logger.prototype.handleRequest = handleRequest;

Logger.prototpye.handleResponse = handleResponse;

function handleRequest(typedRequest, opts, handle) {
    this.logger.log(typedRequest);

    // Handle the next request in the middleware stack
    handle.request(opts);
}

function handleResponse(err, value, handle) {
    if (err) {
        this.logger.error(err);
    } else {
        this.logger.log(value);
    }

    // Continue back up the response chain
    handle.response(err, value);
}
```

### `function typedRequestHandler(typedRequest, opts, handle)`

```ocaml
type TypedRequestHandler : (
  typedRequest: TypedRequest,
  opts: Object,
  handle: Handle
) => void

type Handle : {
  request: (opts: Object) => void,
  response: (err?: Error, value: Any) => void,
  sharedState?: Any
}
```

When calling `handle.request(opts)` - the opts passed in here is passed on to
the next request handler (below the current) in the stack.

If a typed request handler wishes to abort and start returning a value through
the response phase, it can do so by calling `handle.reponse(opts)`

A typed request handler must call either `handle.request` or `handle.reponse` at
some point. Precisely one of these functions must be called exactly one time.

### `function typedResponseHandler(err, value, handle)`

```ocaml
type TypedResponseHandler : (
  err?: Error,
  value: Any,
  handle: Handle
)
```

When calling `handle.reponse(err)` or `handle.response(null, value)`, the
next response handler (above the current) in the stack will receive these
values.

Eventually, after fully ascending the stack, the final error or value will be
passed into a callback function supplied by the stack caller.

A `TypedResponseHandler` must call `handle.response` exactly once, and must
never call `handle.request`.

### `handle.sharedState`

When request and response handlers are paired together for a single unit of
middleware, they often wish to share some state per request. It's important
to stress that the properties on the middleware instance itself are global to
all requests, and so you *must not use `this` to store per-request state*.

`handle.sharedState` provides a mechanism for sharing state for this middleware
between the request and response handler. `handle.sharedState` may be set to
anything inside `handleRequest`, and it will be available on the `handle`
instance inside `handleResponse`.

#### Example: computing and sharing state for each request

```js
function RequestTimer(logger) {
    this.logger = logger || console.log.bind(console);  
}

RequestTimer.prototype.handleRequest = handleTimedRequest;
RequestTimer.prototype.handleResponse = handleTimedResponse;

function handleTimedRequest(typedRequest, opts, handle) {
    // Write the shared state by setting handle.sharedState
    handle.sharedState = {
        startTime: Date.now()
    };

    handle.request(opts);
}

function handleTimedResponse(err, value, handle) {
    // Read the shared state from `handle`, set in handleTimedRequest
    var sharedState = handle.sharedState;
    var requestTime = Date.now() - sharedState.startTime;

    this.logger.log('Request took ' + requestTime + 'ms');

    handle.response(err, value);
}
```

## Motivation

The implementation of an HTTP endpoint should be

  - Debuggable
  - Efficient
  - Modular
  - Safe

### Debuggable

`typed-request-stack` aids with debugging by unwraping the closures that would
otherwise be relied on to implement middleware stacks. This allows us to
inspect, or even modify the stack of handlers that will run for a given
endpoint.

Inspecting `handle._stack` will allow you to see which middleware has been
applied to the stack, and this can be inspected at any stage.

Furthermore, in the case of a core/heap dump, the configuration of your server's
endpoints becomes easier to debug. You can look for the instances of your
endpoints on the heap and inspect them. You can look for instances of
`TypedRequestHandle` to see all of the in-flight requests at the time of a
crash, and know exactly which endpoint stack the request was executing through.

You can also rely on the `handle._handlerIndex` to derive which specific
handler was executing at that point in time, and `handle._typedRequest` to
inspect the incoming request.


### Efficient

When relying on closure based stacks, you will often be creating closures at
runtime for each request you serve.

This middleware stack approach completely removes the need to rely on closures,
which means no more on-the-fly function generation. Using constructors also
provides minor V8 efficiencies through the use of hidden classes.


### Modular

The middleware pattern allows us to create shared units of funtionality and
apply them easily. By implementing these shared units with the same consistent
interface, we can easily combine them together in a stack.

This further promotes indepedent testing of these units with full coverage,
reducing likely copy/paste errors and errors caused by not understanding a new
interface.


### Safe

One of the biggest problems with chaining modules together is understanding
when a module will call the callback. There is always the question of whether
the module calls the callback more than once, what the impact would be and how
we would debug it if it did happen.

`typed-request-stack` ensures that the callback is called only once and that
middleware act in-order. Out-of-order middleware could easily corrupt state or
behave in ways that are hard to reason about. The `handle` passed into each
function is wrapped with a `SafeHandle` type to ensure the correct calling
conventions are met.

## Installation

`npm install typed-request-stack`

## Tests

`npm test`

## Contributors

 - Matt Esch

## MIT Licensed

  [build-png]: https://secure.travis-ci.org/uber/typed-request-stack.png
  [build]: https://travis-ci.org/uber/typed-request-stack
  [cover-png]: https://coveralls.io/repos/uber/typed-request-stack/badge.png
  [cover]: https://coveralls.io/r/uber/typed-request-stack
  [dep-png]: https://david-dm.org/uber/typed-request-stack.png
  [dep]: https://david-dm.org/uber/typed-request-stack
  [test-png]: https://ci.testling.com/uber/typed-request-stack.png
  [tes]: https://ci.testling.com/uber/typed-request-stack
  [npm-png]: https://nodei.co/npm/typed-request-stack.png?stars&downloads
  [npm]: https://nodei.co/npm/typed-request-stack
