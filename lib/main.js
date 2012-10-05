var mongo = require("mongodb"),
    app = module.parent.exports.app,
    config = module.parent.exports.config,
    util = require("./util");

app.locals({
  config:config,
});

app.get('/', function(req, res){
  if(config.debug == true) {
    res.render('index', {
    });
  } else {
    res.send();
  }
});
