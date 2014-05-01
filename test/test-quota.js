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
var libutils = require('../lib/utils');

var q = new queuelib;

suite('Some apt test suite name #2 ;)', function() {
    var app;
    var store;

    var setup_options = {done: function(_app) {app=_app; store=_app.store }};
    testutils.setup_app(setup, teardown, setup_options);

    var add_test = process.env.SKIP_QUOTA_TEST != null ? test.skip : test;

    add_test('create , patch, patch, get specific patch #2, delete', function(done) {
      // turn off timeouts since we are doing load testing here as well
      this.timeout(0);
      q.series([
          // create user
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
          // do a 500 patches at 3 bytes each
          // also we are going to be checking that revisions follow
          function(lib) {
              var count = 0;
              var converted = libutils.btoa('foo');
              var doPatch = function() {
                  var body = { patch : converted, blob_id:testutils.person.blob_id };
                  var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
                  var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
                  request.post({url:url,json:body},function(err, resp, body) {
                      count++;
                      if ((body.revision) && (body.revision % 5 == 0))
                          console.log(body)
                      assert.deepEqual(body,{result:'success',revision:count});
                      if (count < 500)
                          doPatch();
                      else
                          lib.done();
                  });
              };
              doPatch();
          },
          // check that the quota is 500*3 bytes
          function(lib) {
              store.read_where({key:'id',value:testutils.person.blob_id},function(resp) {
                  var row = resp[0];
                  assert.equal(500*3,row.quota,'quota should be equal to 500*3');
                  lib.done();
              })
          },
          // so far we have used up 1500 bytes out of a total 1024*1000
          // we should be able to go another 999 patches, and the 1000'th
          // should be a quota error

          function(lib) {
              // note we start the count at 500
              var count = 500;
              var largestring = libutils.rs((config.patchsize*1024));
              var converted = libutils.btoa(largestring)
              var doPatch = function() {
                  var body = { patch : converted, blob_id:testutils.person.blob_id };
                  var sig = testutils.createSignature({method:'POST',url:'/v1/blob/patch',secret:testutils.person.auth_secret,date:testutils.person.date,body:body});
                  var url = 'http://localhost:5050/v1/blob/patch?signature=' + sig + '&signature_date='+testutils.person.date + '&signature_blob_id='+ testutils.person.blob_id;
                  request.post({url:url,json:body},function(err, resp, body) {
                      count++;
                      if ((body.revision) && (body.revision % 5 == 0))
                          console.log(body)
                      if (count <= 1523)
                          assert.deepEqual(body,{result:'success',revision:count});
                      else
                          assert.deepEqual(body,{result:'error',message:'quota exceeded'});
                      if (count <= 1530)
                          doPatch();
                      else
                          lib.done();
                  });
              };
              doPatch();
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
});
