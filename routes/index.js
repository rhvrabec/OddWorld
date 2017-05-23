var express = require('express');
var router = express.Router();

/* GET home page.*/
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Ditto' });
});

/*GET Ditto Page.*/
router.get('/Ditto', function(req, res) {
	res.render('Ditto', { title: 'Ditto!'});
});


/* GET userlist page.*/
router.get('/userlist', function(req, res) {
	var db = req.db;
	var collection = db.get('usercollection');
	collection.find({},{},function(e,docs){
		res.render('userlist', {
			"userlist" : docs
		});
	});
});
module.exports = router;