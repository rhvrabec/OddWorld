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
    pollTemp: true,
    beforePush: function(data) { data.timestamp = new Date(); return data; }
  });
 
  beanReadable.pipe(json).pipe(process.stdout);
});
 
// Produces: 
//   {"device":"fec9e916...","temp":{"celsius":24}} 
//   {"device":"fec9e916...","temp":{"celsius":23}} 
//   ... 