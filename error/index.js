var domain = require('domain');
var d = domain.create();

var bind_to_d = function(d, h) {
  return d.bind(function() {
    try {
      h.apply(this, arguments)
    }
    catch (exc) {
      d.emit('error', exc)
    }
  })
}

var bindObject = function(obj1,binder) {
  // Object.keys is only obj.hasOwnProperty keys
    Object.keys(obj1).forEach(function(key) {
      obj1[key] = bind_to_d(d, obj1[key]);
    });
}

d.on('error',function (obj) {
    if (obj.res) {
        if (obj.error !== undefined) {
            obj.res.send(obj.statusCode || 400, 
                         {result:'error',message:obj.error.message});
        }
    }
});

exports.setDomain = function(obj) {
    bindObject(obj);
}
