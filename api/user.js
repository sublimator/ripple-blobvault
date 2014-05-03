var response = require('response');

var userApiFactory = function(config, store, email, logger) {
    var exports = {};
    var log = logger.log;

    var getUserInfo = function(username, res) {
        if ("string" !== typeof username) {
            throw { res : res, error: new Error("Username is required") }
        }
        if ((username.length <= 15) || ((username.indexOf('~') === 0) && (username.length <= 16))) {
            if (username.indexOf('~') === 0) {
                username = username.slice(1);
            }
            store.read({username:username,res:res},function(resp) {
                var obj = {}
                obj.version = config.AUTHINFO_VERSION,
                obj.blobvault = config.url,
                obj.pakdf = config.defaultPakdfSetting
                if (resp.exists === false) {
                    if (config.reserved[username.toLowerCase()]) {
                        obj.exists = false;
                        obj.reserved = true;
                        res.send(obj);
                    } else {
                        obj.exists = false;
                        obj.reserved = false;
                        res.send(obj);
                    }
                } else {
                    obj.username = username,
                    obj.address = resp.address,
                    obj.reserved = config.reserved[username.toLowerCase()] || false;
                    obj.exists = true;
                    obj.emailVerified = resp.emailVerified,
                    res.send(obj);
                }
            });
        } else {
            store.read_where({key:"address",value:username,res:res},
                function(resp) {
                    if (resp.error) {
                        res.send(400, {result:'error',message:resp.error.message});
                        return;
                    }
                    var obj = {}
                    obj.version = config.AUTHINFO_VERSION,
                    obj.blobvault = config.url,
                    obj.pakdf = config.defaultPakdfSetting
                    if (resp.length) {
                        var row = resp[0];
                        obj.exists = true;
                        obj.username = row.username,
                        obj.address = row.address,
                        obj.emailVerified = row.email_verified,
                        res.send(obj);
                    } else {
                        obj.exists = false;
                        obj.reserved = config.reserved[username.toLowerCase()] || false;
                        res.send(obj);
                    }
                }
            )
        }
    }
    var authinfo = function (req, res) {
        getUserInfo(req.query.username, res);
    };
    var get = function (req, res) {
        getUserInfo(req.params.username, res);
    };
    var verify = function(req,res) {
        var username = req.params.username;
        var token = req.params.token;
        if ("string" !== typeof username) {
            throw { res : res, error: new Error("Username is required") };
        }
        if ("string" !== typeof token) {
            throw { res : res, error: new Error("Token is required") };
        }
        store.read({username:username,res:res},function(resp) {
            if (resp.exists === false) {
                res.send(404, {result:'error',message:'No such user'});
            } else {
                var obj = {}
                log("Token provided by user: ->"+ token + "<-");
                log("Token in database       ->"+ resp.emailToken + "<-");
                if (token === resp.emailToken) {
                    // update emailVerified
                    // TODO all fields have to be normalized the same
                    // including blobId -> blob_id (not id)
                    // emailVerify -> email_verified etc
                    store.update({username:username,res:res,hash:{email_verified:true}},function(resp) {
                        // only after we mark that the email is verified, we inform
                        obj.result = 'success';
                        res.send(obj);
                    });
                } else {
                    res.send(400, {result:'error',message:'Invalid token'});
                }
            }
        });
    }
    exports.get = get;
    exports.verify = verify;
    exports.authinfo = authinfo;
    return exports;
}

module.exports = userApiFactory