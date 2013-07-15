var populist = require("../main");

exports.testBasic = function(t, assert) {
  populist.buildP({
    rootDirectory: __dirname,
    args: ["Foo:foo"]
  }).done(function(output) {
    assert.ok(output.indexOf("internalRequire") > 0);
    assert.ok(output.indexOf(JSON.stringify({ foo: "Foo" })) > 0);
    assert.ok(output.indexOf("throw new Error") > 0); // From assert.js.
    t.finish();
  });
};

exports.testInFakeBrowserEnv = function(t, assert) {
  populist.buildP({
    rootDirectory: __dirname,
    args: ["Foo:foo", ":anon", "baz"]
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
          vm.runInContext(child.childNodes[0].nodeValue, context);
        return child;
      }
    };
  }

  function createTextNode(text) {
    return {
      nodeType: 3,
      nodeValue: text
    };
  }

  var vm = require("vm");
  var context = vm.createContext({
    document: {
      createElement: createElement,
      createTextNode: createTextNode,
      documentElement: {
        firstChild: createElement("head")
      }
    }
  });

  return context;
}
