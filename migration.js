var config = require('./config');

if ((config.dbtype !== 'postgres') && (config.dbtype !== 'mysql')) {
    console.log("config.dbtype: " + config.dbtype + ' is neither postgres nor mysql. No migration')
    process.exit()
}

var store = require('./lib/store')(config);
var migrate = require('./lib/migrate');

migrate(store.knex,function() {
    console.log("Migration completed");
    process.exit();
});
