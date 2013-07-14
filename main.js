var assert = require("assert");
var path = require("path");
var fs = require("graceful-fs");
var Q = require("q");
var esprima = require("esprima");
var types = require("ast-types");
var hasOwn = Object.prototype.hasOwnProperty;

exports.build = function() {
  var workingDir = process.cwd();
  var rootDir;
  var entries;
  var rootIDs = {};

  var options = require("commander")
    .usage("[-r] <root directory> [-o <output file>] [<global name>:]<module ID>")
    .option("-r, --root-directory <dir>",
        "Directory in which to find CommonJS files")
    .option("-o, --output-file <file>",
        "Name of generated .js bundle file")
    .parse(process.argv);

  var rest;
  if (options.rootDirectory) {
    rest = options.args.slice(0);
    rootDir = options.rootDirectory;
  } else {
    rest = options.args.slice(1);
    rootDir = options.args[0];
  }

  var idToGlobal = {};
  rest.forEach(function(entry) {
    var splat = entry.split(":"), id;
    if (splat.length === 2) {
      id = splat[1];
      idToGlobal[id] = splat[0] || null;
    } else if (splat.length === 1) {
      id = splat[0];
      idToGlobal[id] = id;
    }
    rootIDs[id] = true;
  });

  Q.all([
    readFileP(path.join(__dirname, "loader.js")),
    collectDepsP(rootDir, Object.keys(rootIDs))
  ]).spread(function(loader, sources) {
    return loader.trim() + "(" +
      JSON.stringify(idToGlobal) + ",{\n" +
      Object.keys(sources).map(function(id) {
        return JSON.stringify(id) + ":" +
          JSON.stringify(sources[id]);
      }).join(",\n") + "\n});\n";
  }).done(function(output) {
    if (options.outputFile) {
      return writeFileP(options.outputFile, output);
    } else {
      process.stdout.write(output);
    }
  });
}

function collectDepsP(rootDir, rootIDs) {
  var promises = {};
  var sources = {};

  function traverseP(id) {
    if (hasOwn.call(promises, id)) {
      return promises[id];
    }

    return promises[id] = readFileP(
      path.join(rootDir, id) + ".js"
    ).then(function(source) {
      sources[id] = source;
      var deps = getRequiredIDs(id, source);
      return Q.all(deps.filter(function(rid) {
        // Only depend on modules not already encountered.
        return !promises.hasOwnProperty(rid);
      }).map(traverseP));
    }, function(err) {
      // Ignore missing dependencies.
      console.error(err);
    });
  }

  return Q.all(rootIDs.map(traverseP)).then(function() {
    return sources;
  });
}

function writeFileP(file, content) {
  var deferred = Q.defer();

  fs.writeFile(file, content, {
    encoding: "utf8"
  }, function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(content);
    }
  });

  return deferred.promise;
}

function readFileP(file) {
  var deferred = Q.defer();
  var promise = deferred.promise;

  fs.readFile(file, "utf8", function(err, source) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(source);
    }
  });

  return promise;
}

function getRequiredIDs(id, source) {
  var n = types.namedTypes;
  var isString = types.builtInTypes.string;
  var ast = esprima.parse(source);
  var absoluteIDs = {};

  types.traverse(ast, function(node) {
    if (n.CallExpression.check(node) &&
      n.Identifier.check(node.callee) &&
      node.callee.name === "require")
    {
      var args = node.arguments;
      if (args.length === 1 && n.Literal.check(args[0])) {
        var requiredID = args[0].value;
        if (isString.check(requiredID)) {
          absoluteIDs[absolutize(id, requiredID)] = true;
        }
      }
    }
  });

  return Object.keys(absoluteIDs);
}

function absolutize(moduleID, requiredID) {
  if (requiredID.charAt(0) === ".")
    requiredID = path.join(moduleID, "..", requiredID);
  return path.normalize(requiredID);
}