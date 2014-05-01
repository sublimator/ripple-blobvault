var config = require('./testing-config');
var Hash = require('hashish');
var request = require('request');
var http = require('http');
var util = require('util');

var assert = require('chai').assert;
var queuelib = require('queuelib');
var testutils = require('./utils');
var log = testutils.log;
var libutils = require('../lib/utils');

var q = new queuelib;


suite('Email verification', function() {
    var app;
    var store;

    var setup_options = {done: function(_app) {app=_app; store=_app.store }};
    testutils.setup_app(setup, teardown, setup_options);

    test('Series #1', function(done) {
        var GLOBALS = {};
        q.series([
            // create the user
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: testutils.person
                },
                function(err, resp, body) {
                    assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
                    lib.done();
                }
            );
            },
            function(lib) {
                store.readall({username:testutils.person.username}, function(resp) {
                    if (resp.length)
                        GLOBALS.token = resp[0].email_token;
                    lib.done();
                });
            },    
            function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/'+testutils.person.username+'/verify/05bb0cff-3b93-40f3-bf50-35c2e9d3da3b',
                json:true
                },
                function(err, resp, body) {
                    assert.equal(body.message, 'Invalid token','token should be invalid');
                    lib.done();
                }
            );
            },
            function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/x0x0x0x0x'+testutils.person.username+'/verify/05bb0cff-3b93-40f3-bf50-35c2e9d3da3b',
                json:true
                },
                function(err, resp, body) {
                    assert.equal(body.message, 'No such user','user should not exist');
                    lib.done();
                }
            );
            },
            function(lib) {
            request.get({
                url:'http://localhost:5050/v1/user/'+testutils.person.username+'/verify/'+GLOBALS.token,
                json:true
                },
                function(err, resp, body) {
                    assert.equal(body.result, 'success','Correct token supplied');
                    lib.done();
                }
            );
            },
            // delete user after 
            function(lib) {
                var sig = testutils.createSignature({method:'DELETE',url:'/v1/user',secret:testutils.person.auth_secret,date:testutils.person.date});
                var url = 'http://localhost:5050/v1/user?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
                request.del({
                    url:url,
                    json:true
                },function(err, resp, body) {
                    assert.equal(resp.statusCode,200,'after delete request, status code should be 200');
                    lib.done();
                    done();
                });
            }
        ]);
})
})
