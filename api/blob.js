var response = require('response');
var Queue = require('queuelib');
var libutils = require('../lib/utils')
var Counter = require('../lib/counter');

var blob_api_factory = function(config, store, email) {
    var exports = {};
    var count = new Counter(store.knex);

    exports.logs = function(req,res) {
      if (req.query.format == 'html') {
          count.toHTML_fromdb(function(html) {
              res.send(html);
          });
      } else {
          res.send(count.hash)
      }
    }
      
    var create = function (req, res) {
      if (!count.check()) {
        throw { res : res, statusCode: 400, error : new Error("maxcap")};
      }
      var blobId = req.body.blob_id;
      if ("string" !== typeof blobId) {
        throw { res : res, statusCode: 400, error : new Error("No blob ID given.")};
      } else {
          blobId = blobId.toLowerCase();
      }

      if (!/^[0-9a-f]{64}$/.exec(blobId)) {
        throw { res : res, statusCode: 400, error : new Error("Blob ID must be 32 bytes hex.")};
      }

      var username = req.body.username;
      if ("string" !== typeof username) {
        throw { res : res, statusCode: 400, error : new Error("No username given.")};
      } 
      if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,13}[a-zA-Z0-9]$/.exec(username)) {
        throw { res : res, statusCode: 400, error : new Error("Username must be between 2 and 15 alphanumeric" + " characters or hyphen (-)." + " Can not start or end with a hyphen.")};
      }
      if (/--/.exec(username)) {
        throw { res : res, statusCode: 400, error : new Error("Username cannot contain two consecutive hyphens.")};
      }

      if (config.reserved[username.toLowerCase()]) {
        throw { res : res, statusCode: 400, error : new Error("This username is reserved for "+config.reserved[username.toLowerCase()]+'.')};
      }

      var authSecret = req.body.auth_secret;
      if ("string" !== typeof authSecret) {
        throw { res : res, statusCode: 400, error : new Error("No auth secret given.")};
      }

      authSecret = authSecret.toLowerCase();
      if (!/^[0-9a-f]{64}$/.exec(authSecret)) {
        throw { res : res, statusCode: 400, error : new Error("Auth secret must be 32 bytes hex.")};
      }

      if (req.body.data === undefined) {
        throw { res : res, statusCode: 400, error : new Error("No data provided.")};
      }

      if (req.body.address == undefined) {
        throw { res : res, statusCode: 400, error : new Error("No ripple address provided.")};
      } 

      if (req.body.email == undefined) {
        throw { res : res, statusCode: 400, error : new Error("No email address provided.")};
      } 

      if (req.body.hostlink == undefined) {
        throw { res : res, statusCode: 400, error : new Error("No hostlink provided.")};
      } 

      if (req.body.encrypted_secret == undefined) {
        throw { res : res, statusCode: 400, error : new Error("No encrypted secret provided.")};
      } 

      var q = new Queue;
      q.series([
      function(lib,id) {
          store.read({username:username},function(resp) {
              if (resp.exists === false) {
                  lib.done();
              } else {
                  process.nextTick(function() {
                      res.send(400, ({result:'error',message:"User already exists"}));
                  });
                  lib.terminate(id);
                  return;
              }
         });
      },
      function(lib) { 
          // XXX Check signature
          // coordinate with evan 
          // TODO : inner key is required on updates
          var params = {
              res:res,
              data:req.body.data,
              authSecret:authSecret,
              blobId:blobId,
              address:req.body.address,
              username:username,
              emailVerified:false,
              email:req.body.email,
              emailToken:libutils.generateToken(),
              hostlink : req.body.hostlink,
              encrypted_secret:req.body.encrypted_secret
          };
          store.create(params,function(resp) {
              if (resp.error) {
                  res.send(400, ({result:'error',message:resp.error.message}));
                  lib.done();
                  return;
              } else {
                  email.send({email:params.email,hostlink:params.hostlink,token:params.emailToken,name:username});
                  res.send(201, ({result:'success'}));
                  //count.add();
                  count.adddb();
                  lib.done();
              }
          });
      }
      ]);
    };
    exports.create = create;
    exports.patch = function (req, res) {
      var keyresp = libutils.hasKeys(req.body,['blob_id','patch']);
      if (!keyresp.hasAllKeys) {
          res.send(400, ({result:'error', message:'Missing keys',missing:keyresp.missing}));
          return
      } 
      // check patch size <= 1kb
      var size = libutils.atob(req.body.patch).length;
      if (size > config.patchsize*1024) {
          res.send(400, ({result:'error', message:'patch size > 1kb',size:size}))
          return
      }
      // check quota, user cannot submit patch if they >= quota limit
      var q = new Queue;
      q.series([
      function(lib,id) {
          store.read_where({key:'id',value:req.body.blob_id},function(resp) {
              if (resp.length) {
                  var row = resp[0];
                  lib.set({quota:row.quota});
                  if (row.quota >= config.quota*1024) {
                      console.log("Excceeded quota. row.quota = ",row.quota, " vs config.quota*1024 = ", config.quota*1024);
                      res.send(400, ({result:'error', message:'quota exceeded'}))
                      lib.terminate(id);
                      return;
                  } else 
                      lib.done();
              } else if (resp.error) {
                  res.send(400, ({result:'error', message:resp.error.message}))
                  lib.terminate(id);
                  return;
              } 
          })
      },
      function(lib,id) {
          // check valid base64
          if (!libutils.isBase64(req.body.patch)) {
              res.send(400, ({result:'error', message:'patch is not valid base64'}));
              lib.terminate(id);
              return
          }
          lib.done();
      },
      // update quota amount
      function(lib,id) {
          var newquota = size + lib.get('quota'); 
          store.update_where({
              set:{key:'quota',value:newquota},
              where:{key:'id',value:req.body.blob_id}},
              function(resp) {
                  if (resp.error) {
                      res.send(400, ({result:'error', message:resp.error.message}));
                      lib.terminate(id);
                      return;
                  } else {
                      lib.done();
                  }
              }
          );
      },
    // inspect quota values
    /*
      function(lib,id) {
          store.read_where({key:'id',value:req.body.blob_id},function(resp) {
              if (resp.length) {
                  var row = resp[0];
                  console.log("quota:", row.quota);
              }
              lib.done();
          })
      },
    */
      function(lib) {
          store.blobPatch(size,req,res,function(resp) {
              res.send(resp);
              lib.done();
          });
      }
      ]); 
    };
    exports.consolidate = function (req, res) {
      var keyresp = libutils.hasKeys(req.body,['data','revision','blob_id']);
      if (!keyresp.hasAllKeys) {
          res.send(400, ({result:'error', message:'Missing keys',missing:keyresp.missing}));
          return;
      }
      // check valid base64
      if (!libutils.isBase64(req.body.data)) {
          res.send(400, ({result:'error', message:'data is not valid base64'}));
          return
      }
      // check revision is at greater than the previous revisions
      // XXX TODO - discuss this
    /*
      var q = new Queue;
      q.series([
          function(lib,id) {
              store.read_where({key:'id', value:req.body.blob_id},function(resp) {
                  if (resp.length) {
                      var row = resp[0];
                      console.log("OLD REVISION: ", row);
                      console.log("Attempted revision", req.body.revision);
                  }
                  lib.done();
              });
          }
      ]);
    */
      var size = libutils.atob(req.body.data).length;
      // checking quota
      if (size >= config.quota*1024) {
          res.send(400, ({result:'error', message:'data too large',size:size}));
          return
      }
      store.blobConsolidate(req,res,function(resp) {
          res.send(200, (resp));
          //response.json(resp).pipe(res);
      });    
    };
    exports.delete = function (req, res) {
      var keyresp = libutils.hasKeys(req.query,['signature_blob_id']);
      if (!keyresp.hasAllKeys) {
          res.send(400, ({result:'error', message:'Missing keys',missing:keyresp.missing}));
      } else 
          store.blobDelete(req,res,function(resp) {
              res.send(200, (resp));
              //response.json(resp).pipe(res);
          });
    };
    exports.get = function (req, res) {
      var keyresp = libutils.hasKeys(req.params,['blob_id']);
      if (!keyresp.hasAllKeys) {
          res.send(400, ({result:'error', message:'Missing keys',missing:keyresp.missing}));
      } else 
          store.blobGet(req,res,function(resp) {
              res.send(200, (resp));
              //response.json(resp).pipe(res);
          });
    };

    exports.getPatch = function (req, res) {
      var keyresp = libutils.hasKeys(req.params,['blob_id','patch_id']);
      if (!keyresp.hasAllKeys) {
          res.send(400,({result:'error', message:'Missing keys',missing:keyresp.missing}));
      } else 
      store.blobGetPatch(req,res,function(resp) {
          res.send(resp);
          //response.json(resp).pipe(res);
      });
    };
    return exports;
}

module.exports = blob_api_factory