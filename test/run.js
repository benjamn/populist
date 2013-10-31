var populist = require("../main");
var path = require("path");
var rootDirectory = path.join(__dirname, "modules");

exports.testBasic = function(t, assert) {
  populist.buildP({
    rootDirectory: rootDirectory,
    args: ["foo:Foo"]
  }).done(function(output) {
    assert.ok(output.indexOf("internalRequire") > 0);
    assert.ok(output.indexOf(JSON.stringify({ foo: "Foo" })) > 0);
    assert.ok(output.indexOf("throw new Error") > 0); // From assert.js.
    t.finish();
  });
};

exports.testInFakeBrowserEnv = function(t, assert) {
  populist.buildP({
    rootDirectory: rootDirectory,
    args: ["foo:Foo", "anon:", "baz:baz"]
  }).done(function(output) {
    var context = getContext();
    require("vm").runInContext(output, context);

    var scripts = context.document.documentElement.firstChild.childNodes;
    assert.notEqual(scripts.length, 0);
    scripts.forEach(function(script) {
      assert.strictEqual(script.nodeName, "script");
      assert.strictEqual(script.getAttribute("type"), "text/javascript");
      assert.strictEqual(script.getAttribute("encoding"), "utf8");
    });

    assert.ok(context.Foo);
    assert.ok(context.Foo.baz);

    assert.strictEqual(
      context.Foo.baz(),
      context.Foo.ok
    );

    assert.strictEqual(context.anon, void 0);
    assert.strictEqual(context.anonStatus, "evaluated");

    assert.ok(context.baz);
    assert.strictEqual(
      context.baz.qux(),
      context.Foo.ok
    );

    t.finish();
  });
};

function getContext() {
  function createElement(nodeName) {
    var attributes = {};
    var childNodes = [];

    return {
      nodeType: 1,
      nodeName: nodeName,
      attributes: attributes,
      setAttribute: function(name, value) {
        attributes[name] = value + "";
      },
      getAttribute: function(name) {
        if (attributes.hasOwnProperty(name))
          return attributes[name];
        return null;
      },
      childNodes: childNodes,
      appendChild: function(child) {
        childNodes.push(child);
        if (child.nodeName === "script")
          vm.runInContext(child.text, context);
        return child;
      }
    };
  }

  var vm = require("vm");
  var context = vm.createContext({
    document: {
      createElement: createElement,
      documentElement: {
        firstChild: createElement("head")
      }
    }
  });

  return context;
}

exports.testExtra = function(t, assert) {
  populist.buildP({
    rootDirectory: rootDirectory,
    args: ["foo:Foo", "extra"]
  }).done(function(output) {
    var vm = require("vm");
    var context = getContext();
    vm.runInContext(output, context);

    assert.strictEqual(context.extraStatus, void 0);
    vm.runInContext('Foo.req("extra")', context);
    assert.strictEqual(context.extraStatus, "evaluated");
    assert.strictEqual(context.Foo.req("extra").name, "extra");

    t.finish();
  });
};

exports.testDeleteModuleExports = function(t, assert) {
  populist.buildP({
    rootDirectory: rootDirectory,
    args: ["reset:reset"]
  }).done(function(output) {
    var vm = require("vm");
    var context = getContext();
    vm.runInContext(output, context);

    var key1 = context.reset.key;
    assert.strictEqual(typeof key1, "string");
    vm.runInContext("reset.reset()", context);

    var key2 = context.reset.key;
    assert.strictEqual(typeof key1, "string");
    assert.notStrictEqual(key1, key2);

    t.finish();
  });
};

exports.testGlobal = function(t, assert) {
  populist.buildP({
    rootDirectory: rootDirectory,
    args: ["foo:foo"]
  }).done(function(output) {
    var vm = require("vm");
    var context = getContext();
    vm.runInContext(output, context);

    assert.strictEqual(
      context.foo.global,
      context.foo.self
    );

    t.finish();
  });
};
