exports.ok = require("assert");
exports.baz = function() {
  return require("./baz").qux();
};
