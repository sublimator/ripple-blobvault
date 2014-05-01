var hyperglue = require('hyperglue');
var fs = require('fs');
var email     = require('emailjs');

module.exports = function(config, logger) {
    var log = logger.log;

    if (config.email.user == null) {
        return {
            send: function(){}
        };
    };

    var exports = {};
    var contents = fs.readFileSync(__dirname+ '/email.html');
    var server     = email.server.connect({
     user:    config.email.user,
     password:config.email.password,
     host:    config.email.host,
     ssl: true
    });

    var generateMessage = function(email,token,name,hostlink) {
      var message    = {
         text:    "Welcome to RippleTrade! Verify your email",
         from:    "you <foo@bar.com>",
         to:        "someone <foo@bar.com>",
         subject:    "Ripple Trade",
         'Reply-to' : 'support@ripple.com',
         attachment:
         [
          {
              data:undefined,
              alternative:true
          }
         ]
      };
      message.attachment[0].data = hyperglue(contents, {
      '#email': {
          href: hostlink + '/' + name + '/'+token,
          _html:hostlink + '/' + name + '/'+token
      }}).innerHTML;
      message.to = "<" + email + ">";
      message.from = config.email.from;
      return message;
    }
    exports.send = function(params) {
      log("Email send params", params);
      var email = params.email;
      var name = params.name;
      var token = params.token;
      var hostlink = params.hostlink
      var message = generateMessage(email,token,name,hostlink);
      server.send(message, function(err, message) {
       // log(err || message);
      });
    }
    return exports;
}


