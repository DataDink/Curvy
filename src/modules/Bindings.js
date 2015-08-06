(function() {
   function register() {
      var registry = {};
      Curvy.register.binding = function(name, dependencies, constructor) {
         name = validateName(name);
         registry[name] = (dependencies || []).concat(constructor);
      };
      Curvy.register.module('bindings', ['injector', 'dom-watcher', 'application', 'utilities'], Curvy.Modules.Bindings)
   }

   function validateName(name) {
      if (!name) { throw 'Invalid Binding Name'; }
      if (!name.match(/^[a-zA-Z]/gi)) { throw 'Binding name must start with a letter'; }
      if (name.match(/[^a-zA-Z0-9\-\_]/gi)) { throw 'Binding names can only contain alpha-numeric characters, "-", and "_".'; }
      return name.toLowerCase();
   }

   Curvy.Modules.Bindings = function(injector, dom, app, utils, config) {
      var binder = this;
      var bindings = {};
      for (var name in registry) { bindings[name] = registry[name]; }

      Object.defineProperty(app, 'binding', { enumerable: true, configurable: false, value: function(name, dependencies, constructor) {
         name = validateName(name);
         bindings[name] = (dependencies || []).concat(constructor);
         scan([document.body], [name]);
      }});

      function scan(nodes, names) {
         nodes = reduce(nodes);
         names = names || getNames(bindings);
         for (var n = 0; n < names.length; n++) { names[n] = getAttribute(names[n]); }
         var query = names.join(', ');
         var results = domSearch(node, query);

         for (var n = 0; n < results.length; n++) { bind(results[n]); }
      }

      function bind(node) {
         initNode(node);
         for (var name in bindings) {
            if (isSuspended(node)) { break; }
            if (!node.matches || !node.matches(getAttribute(name))) { continue; }

            var overrides = getOverrides(node);
            var context = createContext(node);
            var dependencies = bindings[name];
            var constructor = dependencies.pop();
            var Binding = function() { constructor.apply(context, arguments); }
            Binding.prototype = constructor.prototype;
            injector.resolve(dependencies.concat([Binding]), overrides);
         }
      }

      function reduce(nodes) {
         var reduction = [];
         for (var n = 0; n < nodes.length; n++) {
            var node = nodes[n];
            if (isSuspended(node)) { continue; }
            if (hasAncestor(node, nodes)) { continue; }
            reduction.push(node);
         }
         return reduction;
      }

      function isSuspended(node) {
         var ancestor = node;
         while(ancestor) {
            var data = getData(ancestor);
            if (data && data.suspended) { return true; }
            ancestor = ancestor.parentNode;
         }
         return false;
      }

      function hasAncestor(node, nodes) {
         var ancestor = node.parentNode;
         while (ancestor) {
            if (nodes.filter(function(n) { return n === node; }) { return true; }
         }
      }

      function formatAttribute(name) { return '[' + name + ']'; }

      function domSearch(node, query) {
         var results = node.matches(query) ? [{node: node, depth: domDepth(node)}] : [];
         var search = node.querySelectorAll(query);
         for (var r = 0; r < search.length; r++) { results.push({node: search[r], depth: domDepth(search[r])}); };
         results.sort(function(a, b) { return a.depth < b.depth ? -1 : (a.depth > b.depth ? 1 : 0); });
         for (var r = 0; r < results.length; r++) { results[r] = results[r].node; }
         return results;
      }

      function domDepth(node, start) { return (!node.parentNode) ? (start || 0) : domDepth(node.parentNode, (start || 0) + 1); }

      function getNames(obj) {
         var names = [];
         for (var name in obj) { names.push(name); }
      }

      function initNode(node) {
         node[config.nodedata] = node[config.nodedata] || {
            bindings: {},
            registrations: {},
            suspended: false
         };
         return getData(node);
      }

      function getData(node) {
         return node[config.nodedata];
      }






      dom.listen(function(info) {
         unwire(info.removed);
         wire(info.added);
      });

      function wire(nodes) {
         nodes = root(nodes);
         for (var n = 0; n < nodes.length; n++) {
            var targets = scan(nodes[n]);
            for (var t = 0; t < targets.length; t++) {
               bind(targets[t]);
            }
         }
      }

      function unwire(node) {

      }

      function bind(info) {
         initNode(info.node);
         for (var b = 0; b < info.bindings.length; b++) {
            var name = info.bindings[b];
            var binding = createBinding(info, name);
         }
         for (var c = 0; c < info.children.length; c++) {
            var child = info.children[c];
            bind(child);
         }
      }

      function createBinding(info, name) {
         var dependencies = bindings[name];
         var constructor = dependencies.pop();
         var overrides = getOverrides(info);
         var context = createContext(info, name);
         var Binding = function() { constructor.apply(context, arguments); }
         Binding.prototype = constructor.prototype;
         return injector.resolve(dependencies.concat([Binding]), overrides);
      }

      function getOverrides(info) {
         var overrides = {};
         var ancestor = info.node;
         while (ancestor) {
            var data = ancestor[config.nodedata];
            if (data) {
               for (var name in data.registrations) {
                  if (name in overrides) { continue; }
                  overrides[name] = data.registrations[name];
               }
            }
            ancestor = ancestor.parentNode;
         }
         return overrides;
      }

      function createContext(info, name) {
         var data = info.node[config.nodedata];
         var context = {};


      }


})();
