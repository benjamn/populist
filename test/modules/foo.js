exports.ok = require("assert");

exports.global = global;
exports.self = this;

exports.baz = function() {
  return require("./baz").qux();
};

exports.req = function(id) {
  return require(id);
};
