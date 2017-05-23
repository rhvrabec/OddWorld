///this finds the bean in the area and returns the UUID Num
var noble = require('noble');

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function(peripheral) {
  console.log('peripheral discovered:');
  console.log('\thello my local name is:');
  console.log('\t\t' + peripheral.advertisement.localName);
  console.log('\tand I am advertising the following services:');
  console.log('\t\t' + JSON.stringify(peripheral.advertisement.serviceUuids));
  console.log();
});
