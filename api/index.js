module.exports = function(config, store, email) {
  var exports = {}

  exports.user = require('./user')(config, store, email);
  exports.blob = require('./blob')(config, store, email);
  
  // Set the domain on this
  var error = require('../error');
  error.setDomain(exports.blob);
  error.setDomain(exports.user);
  
  return exports;
};
