var config = require('./testing-config');
var crypto = require('crypto');
var util = require('util');
var http = require('http');
var cp     = require('child_process')
var libutils = require('../lib/utils');
var _ = require('lodash');
var async = require('async')

/*
@setup {Function}
  eg.  mocha's `setup`

  We first delete and create the database before creating any connection pool. If
  we'd established a connection prior, the dropdb call would hang until the
  process exits. After, we run the migrations, then start the server.

  This assumes the use of postgresql, which was assumed to be the deployment
  database. See `./test-config.js` which sets the database user as
  `process.env.USER`. This is done so sudo doesn't need to be used.

@teardown {Function}
  eg.  mocha's `teardown`
  
  Upon teardown, we simultaneously close the server AND release all database
  connections, so we can setup another test app cleanly.

@options {Object}
  :done: optional function to be called with the `express()` when it's wired up
}
*/
exports.setupApp = function(setup, teardown, options) {
    if (options == null) {options = {}};

    var db = config.database.postgres.database;
    var app;
    var server;

    var setup_db = [
    // dropdb
      function(next) {
          cp.exec('dropdb ' + db, function(error, out, err) {
              // console.log("dropdb error", error);
              next()
          })
      },
      // createdb
      function(next) {
          cp.exec('createdb ' + db, function(error, out, err) {
              // console.log("createdb error", error);
              next()
          })
      },
      // Wire together the app from test-config get the knex instance from the
      // store and then run migrations
      function(next) {
          // TODO
          var noop = new Function;
          var logger = {log: noop};
          if (config.noisytests) {
            logger = console;
          };
          
          app = require('../app')(config, logger);
          var migrate = require('../lib/migrate')(logger);
          // migrate has no means of reporting errors programmatically
          migrate(app.store.knex, next);
      }
    ]

    var setup_server = [
      // Start the server
      function(next) {
          server = http.createServer(app);
          server.listen(5050, function(error) {
              if (typeof options.done === 'function') {
                  options.done(app);
              }
              next()
          });
      }
    ]

    var series = setup_db.concat(setup_server);

    // Set the teardown function
    // We need to close the database connections and stop the server
    teardown(function(done) {
      async.parallel([
        function(next) {
          var pool = app.store.knex.client.pool.poolInstance;
          pool.drain(function(){(pool.destroyAllNow(function(){next()}))});
        },
        function(next) {
          server.close(function() {
              next();
          });
        },
      ], function(){done()});
    });

    // Run the series
    setup(function(done) {
        async.series(series, function(error) {
            done(error);
        });
    });
}
exports.log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

exports.person = {
    username : 'bob5050',
    auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
    blob_id : 'ffff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0affff0a0a',
    data : libutils.btoa('foo'),
    address : 'rDgGMxXd6yBigGtP2iitfZwqfAYreWHt3n',
    email: 'bob5050@bob.com',
    hostlink: 'http://localhost:8080/activate',
    date: 'april',
    encrypted_secret : 'r5nUDJLNQfWERYFm1sUSxxhate8r1q'
}

exports.createSignature = function (params) {
    var method = params.method;
    var url = params.url;
    var secret = params.secret;
    var date = params.date;
    var body = params.body;

    var copyObjectWithSortedKeys = function(object) {
        if (_.isObject(object)) {
            var newObj = {};
            var keysSorted = Object.keys(object).sort();
            var key;
            for (var i in keysSorted) {
                key = keysSorted[i];
                if (Object.prototype.hasOwnProperty.call(object, key)) {
                    newObj[key] = copyObjectWithSortedKeys(object[key]);
                }
            }
            return newObj;
        } else if (_.isArray(object)) {
            return object.map(copyObjectWithSortedKeys);
        } else {
            return object;
        }
    }

    // Canonical request using Amazon's v4 signature format
    // See: http://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html

    // Sort the properties of the JSON object into canonical form

    var canonicalData = (body) ? JSON.stringify(copyObjectWithSortedKeys(body)) : '{}'
    //console.log('canonicalData:' + canonicalData);

    var canonicalRequest = [
    method || 'GET',
    (config.urlPrefix || '') + (url || ''),
    '',
    // XXX Headers signing not supported
    '',
    '',
    crypto.createHash('sha512').update(canonicalData).digest('hex').toLowerCase()
    ].join('\n');

    // String to sign inspired by Amazon's v4 signature format
    // See: http://docs.aws.amazon.com/general/latest/gr/sigv4-create-string-to-sign.html
    //
    // We don't have a credential scope, so we skip it.
    //
    // But that modifies the format, so the format ID is RIPPLE1, instead of AWS4.
    var stringToSign = [
    'RIPPLE1-HMAC-SHA512',
    date,
    crypto.createHash('sha512').update(canonicalRequest).digest('hex').toLowerCase()
    ].join('\n');

    var specificHmac = crypto.createHmac('sha512', new Buffer(secret, 'hex'));
    var signature = specificHmac.update(stringToSign).digest('hex').toLowerCase();
    return signature;
};
