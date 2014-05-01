console.log(__filename);

var config = require('./test-config');
var Hash = require('hashish');
var request = require('request');
var http = require('http');
var util = require('util');

var assert = require('chai').assert;
var queuelib = require('queuelib');
var testutils = require('./utils');

var q = new queuelib;

var log = function(obj) {
    console.log(util.inspect(obj, { showHidden: true, depth: null }));
}

suite('Some apt test suite name #4 ;)', function() {
    testutils.setup_app(setup, teardown);
    
    test('test case insensitive lookup',function(done) {
      q.series([
          // first we create user bob5050
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
          // next we perform case-insensitive lookup
          function(lib) {
          var capitalize = function (string) {
              return string.charAt(0).toUpperCase() + string.slice(1);
          }
          var casedUsername = capitalize(testutils.person.username);
          request.get({
              url:'http://localhost:5050/v1/user/'+casedUsername,
              json: true
              },
              function(err, resp, body) {
                  assert.equal(resp.statusCode,200,'after case insensitive lookup, status code should be 200');
                  lib.done();
              }
          );
          },
          // next we create user Bob5050, which should fail
          function(lib) {
              var capitalize = function (string) {
                  return string.charAt(0).toUpperCase() + string.slice(1);
              }
              var casedUsername = capitalize(testutils.person.username);
              testutils.person.username = casedUsername;
              request.post({
                  url:'http://localhost:5050/v1/user',
                  json: testutils.person
                  },
                  function(err, resp, body) {
                      assert.equal(resp.statusCode,400,' we should guarantee case-insensitive uniqueness however on user creation');
                      assert.equal(body.result, 'error',' there should be an error on creating a user with a username that has a case insensitive equality to another user');
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
                  done()
              });
          }
      ]);
    });
});