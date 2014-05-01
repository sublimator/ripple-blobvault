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

suite('Some apt suite name #2 ;)', function() {
    testutils.setup_app(setup, teardown);

    test('create, get, the cleanup and delete', function(done) {

    q.series([
      function(lib) {
          request.post({
              url:'http://localhost:5050/v1/user',
              json: testutils.person
              }, function(err, resp, body) {
                  assert.equal(resp.statusCode,201,'after proper create request, status code should be 201');
                  lib.done();
          });
      },
      // should work
      function(lib) {
          request.get({
              url:'http://localhost:5050/v1/user/'+testutils.person.username
          },function(err, resp, body) {
                  assert.equal(resp.statusCode,200,'newly created user GET should have statuscode 200');
                  lib.done();
          });
      },
      // should work
      function(lib) {
          request.get({
              url:'http://localhost:5050/v1/user/'+testutils.person.address
          },function(err, resp, body) {
                  assert.equal(resp.statusCode,200,'newly created user GET by ripple address should have statuscode 200');
                  lib.done();
          });
      },
      // should fail, but we return 200 anyways since we check for exist : false
      function(lib) {
          request.get({
              url:'http://localhost:5050/v1/user/bob5051',
              json: true
          },function(err, resp, body) {
              assert.equal(body.exists,false,'this user should not exist');
              lib.done();
          });
      },
      // should fail
      function(lib) {
          request.get({
              url:'http://localhost:5050/v1/user/r24242asdfe0fe0fe0fea0sfesfjke',
              json:true
          },function(err, resp, body) {
                  assert.equal(body.exists, false,'this user should not exist');
                  lib.done();
          });
      },
      // should fail
      function(lib) {
          request.get({
              url:'http://localhost:5050/v1/user/FFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0AFFFF0A0A',
              json : true
          },function(err, resp, body) {
                  assert.equal(body.exists, false,'this user should not exist');
                  lib.done();
          });
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
