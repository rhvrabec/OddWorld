var MongoClient = require('mongodb').MongoClient;
var Writable = require('stream').Writable;
var util = require('util');

util.inherits(MongoWritableStream, Writable);

module.exports = MongoWritableStream;

function MongoWritableStream (options) {
	if(!(this instanceof MongoWritableStream)) {
		return new MongoWritableStream(options);
	}

	if (options.upsert == null) {
		options.upsert = false;
	}
	if (options.upsertFields == null) {
		options.upsertFields = ['_id'];
	}

	if (options.url == null) {
		throw new Error("Missing database url");
	}
	if (options.collection == null) {
		throw new Error("Missing destination collection");
	}

	Writable.call(this, {
		objectMode: true,
		highWaterMark: (options.highWaterMark == null ? 16 : options.highWaterMark)
	});

	this.options = options;
};

MongoWritableStream.prototype._write = function (obj, encoding, callback) {
	var self = this;
	if (self.collection != null) {
		self._writeToMongo(obj, callback);
	} else {
		MongoClient.connect(self.options.url, function (err, db) {
			if (err) {
				return callback(err);
			}
			self.collection = db.collection(self.options.collection);
			self.on('finish', function () {
				db.close();
			});
			self._writeToMongo(obj, callback);
		});
	}
};

MongoWritableStream.prototype._writeToMongo = function (obj, callback) {
	if (this.options.upsert) {
		var selector = this._getUpdateSelector(this.options.upsertFields, obj);
		this.collection.update(selector, obj, { upsert: true }, callback);
	} else {
		this.collection.insert(obj, callback);
	}
};

MongoWritableStream.prototype._valueOfProperty = function (property, obj) {
	var properties = property.split('.');
	var value, p;
	for (var i = 0, ii = properties.length; i < ii; ++i) {
		p = properties[i];
		value = obj[p];
		obj = value;
	}
	return value;
};

MongoWritableStream.prototype._getUpdateSelector = function (upsertFields, obj) {
	var selector = {};
	for (var i = 0, ii = upsertFields.length; i < ii; ++i) {
		var upsertField = upsertFields[i];
		var value = this._valueOfProperty(upsertField, obj);
		if (value == null) {
			selector[upsertField] = { '$exists': false };
		} else {
			selector[upsertField] = value;
		}
	}
	return selector;
};
