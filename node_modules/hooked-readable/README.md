# Hooked Readable

A Readable stream with a beforePush hook to optionally pre-process data before it's added to the stream queue. Hooked Readable also emits an 'overflow' event when back-pressure is detected; i.e. whenever push() returns false.


## Installation

```bashp
npm install hooked-readable
```

## Usage


### Configure with beforePush option to pre-process data

```js
const HookedReadable = require('hooked-readable');

// Configure to affix a timestamp to objects when pushed.
const myStream = new HookedReadable({
  beforePush: (data) => {
    data.timestamp = new Date();
    return data;
  }
});

// Now pushing an object to the stream queue...
myStream.push({hello: 'world'});

// ...results in this getting queued:
//   {"hello":"world","timestamp":"2016-04-27T07:10:56.893Z"}
```

### Handle 'overflow' event to detect back-pressure

```js
const HookedReadable = require('hooked-readable');

// Configure with an unreasonable highWaterMark.
const myStream = new HookedReadable({highWaterMark: 1});

myStream.on('overflow', () => {
  console.log('Slow down!!!');
});

myStream.push({hello: 'world'});

// Console output:
//   Slow down!!!
```


## API


### Class: HookedReadable

Derived from Node's stream.Readable. Implementors may extend HookedReadable to add their own underlying _read() implementation.


### new HookedReadable([options])

Constructor. Create a new HookedReadable with options.

__options (Object)__

* `beforePush` (Function) — A callback to invoke every time the stream's push() method is called.

  Example:

  ```js
  // Add a 'status' property
  beforePush: function(data) { data.status = 1; return data; }
  ```

* `highWaterMark` (Number) — The maximum number of bytes (or objects) to store in the internal buffer before ceasing to read from the underlying resource. Default = 16384 (16kb), or 16 for objectMode streams

* `objectMode` (Boolean) — Whether this stream should behave as a stream of objects. Default is true.


### Event: 'overflow'

Emitted when back-pressure is detected.

```js
hookedReadable.on('overflow', function() { })
```


## License

[MIT](LICENSE)
