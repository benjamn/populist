//# sourceURL=populist/loader.js
(function(entries, sources) {
  var modules = {};
  var hasOwn = modules.hasOwnProperty;
  var global = Function("return this")();
  var doc = global.document;
  var head = doc.documentElement.firstChild;

  function internalRequire(id) {
    var module = getModule(id);
    if (module && !hasOwn.call(module, "exports")) {
      module(function(rid) {
        return internalRequire(absolutize(id, rid));
      }, module.exports = {}, module, global);

      // If the module id has a non-null value in the entries object,
      // define a global reference to its exports object.
      var globalName = entries[id];
      if (globalName && hasOwn.call(entries, id))
        global[globalName] = module.exports;
    }

    return module.exports;
  }

  function getModule(id) {
    if (!hasOwn.call(modules, id)) {
      if (hasOwn.call(sources, id)) {
        var name = "module$" + Math.random().toString(36).slice(2);
        var script = doc.createElement("script");
        var code = "function " + name + "(require,exports,module,global){" +
          sources[id] + "\n}\n//# sourceURL=" + id + ".js\n";
        script.setAttribute("type", "text/javascript");
        script.setAttribute("encoding", "utf8");
        script.text = code;
        var error;
        var oldOnError = global.onerror;
        global.onerror = function(message, url, lineNumber) {
          error = new SyntaxError(message);
          error.url = id + '.js';
          error.line = lineNumber;
        };
        head.appendChild(script);
        global.onerror = oldOnError;
        if (!global[name]) {
          console.error(error.message);
          console.error(error.url + ':' + error.line);
          console.error(sources[id].split(/\r\n|\r|\n/)[error.line - 1]);
          throw error;
        }
        modules[id] = global[name];
      } else {
        throw new Error("Missing module: " + id);
      }
    }

    return modules[id];
  }

  var pathNormExp = /\/(\.?|[^\/]+\/\.\.)\//;
  function absolutize(id, rid) {
    if (rid.charAt(0) === ".") {
      rid = "/" + id + "/../" + rid;
      while (rid != (id = rid.replace(pathNormExp, "/")))
        rid = id;
      rid = rid.replace(/^\//, "");
    }
    return rid;
  }

  // Eagerly require all identifiers that are keys of the entries object.
  for (var id in entries)
    if (hasOwn.call(entries, id))
      internalRequire(id);
})
