/* 
    rest.js
    mongodb-rest

    Created by Tom de Grunt on 2010-10-03.
    Copyright (c) 2010 Tom de Grunt.
		This file is part of mongodb-rest.
*/ 
var mongo = require("mongodb"),
    app = module.parent.exports.app,
    config = module.parent.exports.config,
    util = require("./util"),
    BSON = mongo.BSONPure;

app.param('db', function(req, res, next) {
  var db = new mongo.Db(req.params.db, new mongo.Server(config.db.host, config.db.port, {'auto_reconnect':true}));
  db.open(function(err,db) {
    if(err) {
      res.send(500, err);
    } else {
      if(config.db.auth) {
        db.authenticate(config.db.username, config.db.password, function(err,result) {
          if(err) {
            res.send(500, err);
          } else {
            if(result) {
              req.db = db;
              next();
            } else {
              res.send(403, 'Unauthorized');
            }
          }
        });
      } else {
        req.db = db;
        next();
      }
    }
  });
});

/**
 * Query
 */
app.get('/databases/:db/collections/:collection/:id?', function(req, res) { 
  var query = req.query.query ? JSON.parse(req.query.query) : {};

  // Providing an id overwrites giving a query in the URL
  if (req.params.id) {
    query = {'_id': new BSON.ObjectID(req.params.id)};
  }
  var options = req.params.options || {};

  var test = ['limit','sort','fields','skip','hint','explain','snapshot','timeout'];
  test.push('returnKey');

  for( o in req.query ) {
    if( test.indexOf(o) >= 0 ) {
      options[o] = JSON.parse(req.query[o]);
    } 
  }
  console.log(options);
  var db = req.db;
  db.collection(req.params.collection, function(err, collection) {
    collection.find(query, options, function(err, cursor) {
      cursor.toArray(function(err, docs){
        if(err) {
          console.log(err);
        }
        var result = [];          
        if(req.params.id) {
          if(docs.length > 0) {
            result = util.flavorize(docs[0], "out");
            res.header('Content-Type', 'application/json');
            res.send(result);
          } else {
            res.send(404);
          }
        } else {
          docs.forEach(function(doc){
            result.push(util.flavorize(doc, "out"));
          });
          res.header('Content-Type', 'application/json');
          res.send(result);
        }
        db.close();
      });
    });
  });
});

/**
 * Insert
 */
app.post('/databases/:db/collections/:collection', function(req, res) {
  if(req.body) {
    var db = req.db;
    db.collection(req.params.collection, function(err, collection) {
      // We only support inserting one document at a time
      collection.insert(Array.isArray(req.body) ? req.body[0] : req.body, function(err, docs) {
        res.header('Location', '/'+req.params.db+'/'+req.params.collection+'/'+docs[0]._id.toHexString());
        res.header('Content-Type', 'application/json');
        res.send('{"ok":1}', 201);
        db.close();
      });
    });
  } else {
    res.json({"ok":0});
  }
});

/**
 * Update
 */
app.put('/databases/:db/collections/:collection/:id', function(req, res) {
  var spec = {'_id': new BSON.ObjectID(req.params.id)};
  var db = req.db;
  db.collection(req.params.collection, function(err, collection) {
    collection.update(spec, req.body, true, function(err, docs) {
      res.header('Content-Type', 'application/json');
      res.send('{"ok":1}');
      db.close();
    });
  });
});

/**
 * Delete
 */
app.del('/databases/:db/collections/:collection/:id', function(req, res) {
  var spec = {'_id': new BSON.ObjectID(req.params.id)};
  var db = req.db;
  db.collection(req.params.collection, function(err, collection) {
    collection.remove(spec, function(err, docs) {
      res.header('Content-Type', 'application/json');
      res.send('{"ok":1}');
      db.close();
    });
  });
});

app.get('/stats/:db/:collection', function(req,res) {
  var db = req.db;
  db.collection(req.params.collection, function(err, collection) {
    collection.stats(function(err, stats) {
      res.json(stats);
      db.close();
    });
  });
});;

app.get('/stats/:db', function(req, res) {
  req.db.stats(function(err, stats) {
    req.db.collectionNames(function(err, items) {
      for(var i in items) {
        items[i].name = util.parseCollectionName(items[i].name).name;
      }
      res.json({stats:stats,collections:items});
      req.db.close();
    });
  });
});
