var config = require('../config-example');

config.dbtype = 'postgres'
var postgres = config.database.postgres;
// We'll use the current user
postgres.user     = process.env.USER
postgres.password = 'password'
postgres.database = 'blobvault-test'

config.testsuite = true;
config.noisytests = false;

module.exports = config;