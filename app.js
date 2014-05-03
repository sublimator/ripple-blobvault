var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var cors = require('cors');

// Perhaps the options would better be sourced from config.js
function buildApp(config, logger) {
  var log = logger.log;
  var email = require('./lib/email')(config, logger);
  var store = require('./lib/store')(config, logger);
  var api = require('./api')(config, store, email, logger);
  var hmacMiddleware = require('./lib/hmac')
                               .middleware (
                                    config, store.hmac_getSecret, logger);
  var app = express();

  log("Installing request logging middleware");
  app.use(function(req,res,next) {
      log(req.method + " " + req.url);
      log(req.headers);
      next();
  });

  app.use(express.json());
  app.use(express.urlencoded());
  app.use(cors());

  app.get('/v1/user/:username', api.user.get);
  app.get('/v1/user/:username/verify/:token', api.user.verify);
  app.post('/v1/user', api.blob.create);
  app.delete('/v1/user', hmacMiddleware, api.blob.delete);

  app.get('/v1/blob/:blob_id', api.blob.get);
  app.get('/v1/blob/:blob_id/patch/:patch_id', api.blob.getPatch);
  app.post('/v1/blob/patch', hmacMiddleware, api.blob.patch);
  app.post('/v1/blob/consolidate', hmacMiddleware, api.blob.consolidate);

  app.get('/v1/authinfo', api.user.authinfo);
  app.get('/logs', api.blob.logs);

  // Should we put this here?
  app.store = store
  app.logger = logger

  return app;
}

module.exports = buildApp