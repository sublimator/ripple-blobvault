console.log(__filename);

var config = require('./testing-config');
var Hash = require('hashish');
var request = require('request');
var http = require('http');
var util = require('util');

var assert = require('chai').assert;
var queuelib = require('queuelib');
var testutils = require('./utils');
var log = testutils.log;

var q = new queuelib;

suite('Some apt test suite name #5 ;)', function() {
    testutils.setup_app(setup, teardown);
    
    test.only('create then delete',function(done) {
        q.series([
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: {foo:'bar'}},
                function(err, resp, body) {
                    assert.equal(body.message, "No blob ID given.")
                    // log(body);
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { blob_id :'bar'}},
                function(err, resp, body) {
                    assert.equal(body.message, "Blob ID must be 32 bytes hex.");
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
                function(err, resp, body) {
                    assert.equal(body.message, "No username given.");
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { 
                username : 'b',
                blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
                function(err, resp, body) {
                    assert.equal(body.message, "Username must be between 2 and 15 alphanumeric characters or hyphen (-). Can not start or end with a hyphen.");
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { 
                username : 'bb--',
                blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
                function(err, resp, body) {
                    assert.equal(body.message, "Username must be between 2 and 15 alphanumeric characters or hyphen (-). Can not start or end with a hyphen.");
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { 
                username : 'bb--bb',
                blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
                function(err, resp, body) {
                    assert.equal(body.message, "Username cannot contain two consecutive hyphens.");
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { 
                username : 'bob',
                blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
                function(err, resp, body) {
                    assert.equal(body.message, "No auth secret given.");
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { 
                username : 'bob',
                auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
                blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A'}},
                function(err, resp, body) {
                    assert.equal(body.message, "No data provided.");
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { 
                username : 'bob',
                auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
                blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
                data : 'foo' 
                }},
                function(err, resp, body) {
                    assert.equal(body.message, "No ripple address provided.");
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { 
                username : 'bob',
                auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
                blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
                data : 'foo' ,
                address : 'r24242'
                }},
                function(err, resp, body) {
                    assert.equal(body.message, "No email address provided.");
                    lib.done();
                }
            );
            },
            function(lib) {
            request.post({
                url:'http://localhost:5050/v1/user',
                json: { 
                username : 'bob',
                auth_secret :'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
                blob_id : 'FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
                data : 'foo' ,
                address : 'r24242',
                email: 'bob@foo.com'
                }},
                function(err, resp, body) {
                    assert.equal(body.message, "No hostlink provided.");
                    lib.done();
                }
            );
            },
            function(lib) {
            var mod_person = Hash(testutils.person).clone.end;
            delete mod_person.encrypted_secret;
            request.post({
                url:'http://localhost:5050/v1/user',
                json: mod_person
                },
                function(err, resp, body) {
                    assert.equal(resp.statusCode,400,'encrypted secret is required');
                    assert.equal(body.result,'error');
                    assert.equal(body.message,'No encrypted secret provided.');
                    lib.done();
                }
            );
            },
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
            request.post({
                url:'http://localhost:5050/v1/user',
                json: testutils.person
                },
                function(err, resp, body) {
                    assert.equal(resp.statusCode,400,'we should not be able to duplicate a user that already exists');
                    // log(body);
                    lib.done();
                }
            );
            },
            // here we are going to modify the username but violate the constraint on the unique ripple address 
            // we want to .catch from the store since it should be throwing at the db level
            
            // step 1 modify the testutils.person.username 
            function(lib) {
                var mod_person = Hash(testutils.person).clone.end;
                mod_person.username = 'zed';
            request.post({
                url:'http://localhost:5050/v1/user',
                json: mod_person
                },
                function(err, resp, body) {
                    assert.equal(resp.statusCode,400,'we should not be create a new person with the same ripple address');
                    // log(body);
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
    });
})