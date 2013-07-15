function ok(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

module.exports = ok.ok = ok;
