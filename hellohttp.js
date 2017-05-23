var http = require("http");
var express = require('express');

http.createServer(function (request, response) {
	//send the http header
	//http status: 200:ok
	//content type: text/plain
	response.writeHead(200, {'Content-Type': 'text/plain'})

	//send the response body as "Hello World"
	response.end('Hello World\n');
}).listen(8081);

//console will print the message
console.log ('Server running at http://127.0.0.1:8081');

//ble-bean@2.1.1 extraneous
//├── ble-bean-stream@0.1.0 