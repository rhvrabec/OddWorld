#python to perform aggregates
#setup connection

import pymongo
from pymongo import MongoClient
import pprint
import datetime
from bson.son import SON 
import pprint

client = MongoClient('mongodb://localhost:27017/')
db = client.ble_bean_stream
collection = db.scratch_data
scratch_data = db.scratch_data

#reads the most recent entry
pprint.pprint(scratch_data.find_one())

#count number of docs in db
scratch_data.count()

#reads all documents
for data in scratch_data.find():
	pprint.pprint(data)

#reads all documents in a range
d = datetime.datetime(2017, 5, 25)
for data in scratch_data.find({"timestamp":{"$lt": d}}).sort("timestamp"):
	pprint.pprint(data)

#python writes back to the db the aggregates for each temperature
pipeline = [
	{"$unwind":"$temp"},
	{"$group": {"_id":"$temp", "count": {"$sum": 1}}},
	{"$sort": SON([("count", -1), ("_id", -1)])}
	]

pprint.pprint(list(db.scratch_data.aggregate(pipeline)))