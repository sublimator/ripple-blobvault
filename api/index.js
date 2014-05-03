module.exports = function(config, store, email, logger) {
  var exports = {}

  exports.user = require('./user')(config, store, email, logger);
  exports.blob = require('./blob')(config, store, email, logger);
  
  // Set the domain on this
  var error = require('../error');
  error.setDomain(exports.blob);
  error.setDomain(exports.user);
  
  return exports;
};