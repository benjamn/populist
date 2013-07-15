exports.key = Math.random().toString(36).slice(2);
exports.reset = function() {
  delete module.exports;
  require("./reset");
};
