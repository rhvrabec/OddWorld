# BLE-Bean Stream

Take a Bean instance from [ble-bean](https://www.npmjs.com/package/ble-bean) and make it a Node stream.

The [LightBlue Bean](https://punchthrough.com/bean) by [Punch Through Design](https://punchthrough.com) is a great little Bluetooth Arduino platform. And the [ble-bean](https://www.npmjs.com/package/ble-bean) module is awesome for connecting to the Bean from a Node application.

This module provides a stream-based interface to the LightBlue Bean given a Bean instance that you obtain from ble-bean. From there, you can pipe the Readable stream to the console, a transform stream, file or database. See the [Examples](examples) for more.


## Important

1.	This module is designed to work exclusively with the [LightBlue Bean](https://punchthrough.com/bean) by [Punch Through Design](https://punchthrough.com).

2.	This module depends on ble-bean. So you must first install and require that module. Then obtain a bean instance via one of the discovery methods.

3.	This module is unofficial, and is not affiliated with Punch Through Design in any way whatsoever.

4.	We at [Humans Forward](http://humansforward.com) recognize that software is commonly built upon the amazing efforts of others. Therefore, we'd like to give shout-outs to the creators of the [Bean](https://punchthrough.com), and to the following module authors:

	[ble-bean](https://www.npmjs.com/package/ble-bean)  
	[noble](https://www.npmjs.com/package/noble)  
	[noble-device](https://www.npmjs.com/package/noble-device)  


## Installation

```bashp
npm install ble-bean
npm install ble-bean-stream
```

## Usage


### Read the temperature every 5 seconds and pipe to JSON.stringify()

```js
'use strict';
const Bean = require('ble-bean');
const beanStream = require('ble-bean-stream');

// Transform stream that formats data as JSON strings
const json = new require('stream').Transform({objectMode: true});
json._transform = (chunk, encoding, callback) => {
  json.push(JSON.stringify(chunk) + '\r\n');
  callback();
}

// Ask ble-bean to discover a Bean
Bean.discover((bean) => {
  // Start Bean streaming
  // NOTE: The Readable stream will call bean.connectAndSetup()
  let beanReadable = beanStream.createReadStream(bean, {
    poll: 5000, // Interval in millis
    pollTemp: true
  });

  beanReadable.pipe(json).pipe(process.stdout);
});

// Produces:
//   {"device":"fec9e916...","temp":{"celsius":24}}
//   {"device":"fec9e916...","temp":{"celsius":23}}
//   ...
```


## Examples

*	[poll-to-console](poll-to-console.js) — Periodically reads the accelerometer, temperature, and scratch values one and two. Logs the readings to the console as JSON.

*	[poll-to-mysql](poll-to-mysql.js) — Periodically reads the accelerometer and temperature. Logs the readings to a MySQL table.

*	[notify-to-mongo](notify-to-mongo.js) — Subscribes to change notifications for scratch one, two and three. Logs the scratch values to a MongoDB collection.

*	[serial-to-file](serial-to-file.js) — Listens for data sent over the virtual serial port and writes it to a file.


## API


### Module interface

Assuming:

```js
const beanStream = require('ble-bean-stream');
```

*	`beanStream.createReadStream(bean, options)` — Factory method to create a new BeanReadable instance with a given bean and options.

*	`beanStream.BeanReadable` — Exposes the BeanReadable class that can be instantiated via `new BeanReadable(bean, options)`.

Examples:

```js
'use strict';
const beanStream = require('ble-bean-stream');

// Discover and call createReadStream()
Bean.discover((bean) => {
  let beanReadable = beanStream.createReadStream(bean, {listenSerial: true});
  beanReadable.pipe(...);
});

// Discover and instantiate
Bean.discover((bean) => {
  let beanReadable = new beanStream.BeanReadable(bean, {listenSerial: true});
  beanReadable.pipe(...);
});
```


### Class: BeanReadable

A BeanReadable object connects to a discovered Bean, sets up any configured polling  timers and/or event listeners, and emits data as objects. A typical pattern is to pipe a BeanReadble into a Transform stream for formatting or filtering.

### new BeanReadable(bean, options)

Constructor. Creates a new BeanReadable with a given bean and options. The options object is evaluated by BeanReadable, and is also forwarded to the underlying [HookedReadable](https://github.com/HumansForward/hooked-readable) stream.

**bean (Bean)**

A Bean instance that is provided by one of the ble-bean (noble-device) [discovery methods](https://www.npmjs.com/package/noble-device#discovery-api).

**options (Object)**

*	`beforePush` (Function) — A callback to invoke every time an object is pushed into the stream. Courtesy of HookedReadable.

	Example:
	    
	```js
	// Add a 'timestamp' property
	beforePush: function(data) { data.timestamp = new Date(); return data; }
	```
	
*	`highWaterMark` (Number) — The maximum number of objects to store in the internal stream buffer. Default is 16. If you are piping Bean data into a slow writer, such as a database, this number should be increased to mitigate back-pressure.

*	`poll` (Number) — Configures the BeanReadable timer to periodically gather readings from the Bean's sensors and/or scratch characteristics.

	*	A value of 0 (the default) will poll the sensors only once, then stop.
	*	A value >= 500 is the number of milliseconds between each polling cycle.
	*	A value < 500 is equivalent to 500 (i.e. you cannot poll faster than every 0.5 seconds).

	This option only configures the polling cycle; therefore, you should specify one or more of the secondary 'poll' options below.

*	`pollAccell: true` — Read acceleration values when the polling timer elapses. An `accell` object will be emitted from the stream.

	```json
	{
	  "accell": {
	    "x": 0.00782,
	    "y": 0.10166,
	    "z": 1.02051
	  },
	  "device": "fec9e916..."
	}
	```
	
*	`pollBatt: true` — Read the battery level (in percent) when the polling timer elapses. A `batt` object will be emitted from the stream.

	```json
	{
	  "batt": {
	    "level": 98
	  },
	  "device": "fec9e916..."
	}
	``` 

*	`pollTemp: true` — Read ambient temperature when the polling timer elapses. A `temp` object will be emitted from the stream.

	```json
	{
	  "temp": {
	    "celsius": 19
	  },
	  "device": "fec9e916..."
	}
	```
	
*	`pollScratch` (String) — Read one or more of the scratch characteristics (1–5) when the polling timer elapses.

	Examples:
	    
	```js
	pollScratch: '1,3,5'
	// OR
	pollScratch: '135'
	```
	
	When configured, a respective `scratch1...5` object will be emitted from the stream. For convenience, scratch data is represented as string, integer, and unsigned integer.
	
	```json
	{
	  "scratch1": {
	    "data": "ABCDEFG",
	    "int": 16961,
	    "uint": 16961
	  },
	  "device": "fec9e916..."
	}
	```

*	`notifyScratch` (String) — Subscribe to change notifications for one or more of the scratch characteristics (1–5).

	Examples:
	    
	```js
	notifyScratch: '2,4'
	// OR
	notifyScratch: '24'
	```
	
	When configured, a respective `scratch1...5` object will be emitted from the stream (see `pollScratch` above).

*	`listenSerial: true` — Subscribe to data sent over the [Virtual Serial](https://punchthrough.com/bean/guides/features/virtual-serial/) port. The [Serial Message Protocol](https://github.com/PunchThrough/bean-documentation/blob/master/serial_message_protocol.md) appears to deliver serial messages in 63 byte chunks; therefore, multiple `serial` objects may be emitted for each Serial print.

	```json
	{
	  "serial": {
	    "data": "Hello from Bean\r\n"
	  },
	  "device": "fec9e916..."
	}	
	```
> 	To reassemble serial data into proper messages, one could implement a Transform stream that concatenates and re-emits data based on a delimiter.

### Stream objects `info` and `error`

BeanReadable emits information and error objects to convey its state. A downstream Transform can be implemented to format or filter these objects as needed. See the [examples](examples) for more.

```json
{
  "info": {
    "message": "Connected"
  },
  "device": "fec9e916..."
}
```

```json
{
  "error": {
    "message": "Noble error"
  },
  "device": "fec9e916..."
}
```


## License

[MIT](LICENSE)
