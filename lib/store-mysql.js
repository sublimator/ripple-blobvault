var db = require('../db').connection;
var create = function(params,cb) {
    var blobId = params.blobId;
    var username = params.username;
    var address = params.address;
    var authSecret = params.authSecret;
    // Convert blob from base64 to binary
    var data = new Buffer(params.data, 'base64');

    db.query(
      "INSERT INTO `blob` (`id`, `username`, `address`, `auth_secret`, `data`) " +
      "VALUES (?, ?, ?, ?, ?)", null,
      { raw: true }, [blobId, username, address, authSecret, data]
    )
      .complete(function (err, rows) {
        if (err) {
          handleException(res, err);
          return;
        }

        res.json({
          result: 'success'
        });
      }
    );
    } catch (e) {
        handleException(res, e);
    }
}
exports.create = create;
var read = function(params, cb) {
    db.query(
      "SELECT `username`, `address` FROM `blob` WHERE `username` = ?", null,
      { raw: true }, [username]
    )
    .complete(function (err, rows) {
        if (err) {
          handleException(res, err);
          return;
        }

        var response = {
          username: username,
          version: AUTHINFO_VERSION,
          blobvault: config.url,
          pakdf: config.defaultPakdfSetting
        };

        if (rows.length) {
          var row = rows[0];
          response.username = row.username;
          response.address = row.address;
          response.exists = true;
          res.json(response);
        } else if (config.reserved[username.toLowerCase()]) {
          response.exists = false;
          response.reserved = config.reserved[username.toLowerCase()];
          res.json(response);
        } else {
          response.exists = false;
          response.reserved = false;
          res.json(response);
        }
      });
    } catch (e) {
    handleException(res, e);
    }
};
exports.read = read;