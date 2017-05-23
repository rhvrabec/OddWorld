/*jslint node: true */

/* 
 * Requests the accelerometer, temperature, and sets the color randomly evry second.
 * This requires no specific sketch on the Arduino. All of this is just talking to the bean's radio. 
 */

"use strict";

const Bean = require('ble-bean');
const beanStream = require('ble-bean-stream');
const Transform = require('stream').Transform;

var MongoClient = require('mongodb').MongoClient
  ,assert = require('assert');

const DATABASE = 'mongodb://localhost:27017/ble_bean_stream';
const COLLECTION = 'scratch_data';
var MongoWritableStream = require('mongo-writable-stream');

let connectedBean;
let triedToExit = false;

class DocFilter extends Transform {
  constructor() {
    super({objectMode: true});
  }

  _transform(chunk, encoding, callback) {
    //Exclude 'info' and 'error' events
    if (chunk.info || chunk.error) {
      //No-op
    } else {
      this.push(chunk);
    }

    callback();
  }
}

//Discover a bean, configure and pipe stream.
//notifyScratch stream object
// {device:id,scratch#: {data:string, int: int, uint:int, }}
console.log('Looking for Bean...');

Bean.discover((bean) => {
  connectedBean = bean;

  //start bean stream
  let beanReadable = beanStream.createReadStream(bean, {
    highWaterMark: 32,
    notifyScratch: '1,2,3',

    //set temp and accel polling
    poll:100,
    pollTemp: true,
    beforePush: function(data) { data.timestamp = new Date(); return data; }
    //pollAccel: true,

    //timestamp data
    //beforePush: (data) => {
     // data.capturedAt = new Date();
    //  return data;
   // }
  });

  //Setup Mongo Streaming
  var stream = new MongoWritableStream({
    url: DATABASE,
    collection: COLLECTION,
    upsert: "true"
  });

  console.log("Streaming scratch notifications to '%s', press ctrl-c to stop.", COLLECTION);
  beanReadable.pipe(new DocFilter).pipe(stream);

  //Exit when the stream ends
  beanReadable.once('end', () => process.exit());
});

//Hand sigint ex. ctrl-c

function exitHandler() {
  if (connectedBean && !triedToExit) {
    triedToExit = true;

    console.log('Disconnecting...');
    connectedBean.disconnect();
  
  } else {
    process.exit();
  }
};
process.on('SIGINT', exitHandler);
