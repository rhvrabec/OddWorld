var async = require('async');
var readArray = require('event-stream').readArray;
var should = require('should');
var MongoClient = require('mongodb').MongoClient;
var MongoWritableStream = require('../');

describe('MongoWritableStream', function () {

	beforeEach(function (done) {
		var self = this;
		self.collectionName = 'Test';
		self.url = 'mongodb://localhost/mongowritablestream';

		MongoClient.connect(self.url, function (err, db) {
			if (err) {
				return done(err);
			}
			self.collection = db.collection(self.collectionName);
			self.collection.remove(done);
		});
	});

	it('should throw if no mongo url is provided', function () {
		var self = this;
		(function () {
			new MongoWritableStream({collection: self.collectionName});
		}).should.throw();
	});

	it('should throw if no mongo collection is provided', function () {
		var self = this;
		(function () {
			new MongoWritableStream({url: self.url});
		}).should.throw();
	});

	it('should insert the documents', function (done) {
		var self = this;
		async.waterfall([
			function (callback) {
				var insert = new MongoWritableStream({url: self.url, collection: self.collectionName});
				insert.on('finish', callback);
				readArray([{value:1}, {value:2}, {value:3}]).pipe(insert)
			},
			function (callback) {
				self.collection.find({}).toArray(callback);
			}
		], function (err, docs) {
			docs.should.have.length(3);
			done();
		});
	});

	it('should upsert the documents', function (done) {
		var self = this;
		async.waterfall([
			function (callback) {
				var insert = new MongoWritableStream({url: self.url, collection: self.collectionName});
				insert.on('finish', callback);
				readArray([{_id: 1, value: 100}, {_id: 3, value: 300}]).pipe(insert);
			},
			function (callback) {
				var upsert = new MongoWritableStream({url: self.url, collection: self.collectionName, upsert: true});
				upsert.on('finish', callback);
				readArray([{_id: 1, value: 1}, {_id: 2, value:2}, {_id: 3, value: 3}]).pipe(upsert);
			},
			function (callback) {
				self.collection.find({}).toArray(callback)
			}
		], function (err, docs) {
			docs.should.have.length(3);
			docs.reduce(function (total, doc) {
				return total += doc.value;
			}, 0).should.eql(6);
			done();
		});
	});

});
