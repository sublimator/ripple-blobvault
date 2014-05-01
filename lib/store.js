var Knex = require('knex');
var dbcommon = require('./dbcommon')

var store = function(config, logger) {
    var log = logger.log;
    var storetype = config.dbtype;
    var options = ['mysql', 'postgres'];
    if (options.indexOf(storetype) == -1) {
        throw new Error("Storetype must be postgres or mysql");
    };

    log("Using storetype: " + storetype);
    var connection = config.database[config.dbtype];
    // log("Using connection params: " + JSON.stringify(connection));
    var knexInit = {client: storetype, connection : connection };
    var knex = Knex.initialize(knexInit);
    store = dbcommon(config, knex, logger);
    return store;
}
module.exports = store;
