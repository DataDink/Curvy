// Manages the identification and syncronization of bindings in the document
// http://datadink.github.io/Curvy/#bindings
(function() {
   var registry = {}; // pre-application registration
   function register() {
      Curvy.register.binding = function(name, dependencies, constructor) {
         createRegistration(registry, name, dependencies, constructor);
      };
      Curvy.register.module('binding-manager', ['dependencies', 'dom-watcher', 'application', 'configuration'], Curvy.Modules.BindingManager)
   }

   function createRegistration(reg, name, deps, ctr) {
      if (!name) { throw 'Invalid Binding Name'; }
      if (!name.match(/^[a-zA-Z]/gi)) { throw 'Binding name must start with a letter'; }
      if (name.match(/[^a-zA-Z0-9\-\_]/gi)) { throw 'Binding names can only contain alpha-numeric characters, "-", and "_".'; }
      name = name.toLowerCase();

      ctr = typeof(ctr) === 'function' ? ctr
         : (typeof(deps) === 'function' ? deps
         : (deps instanceof Array ? deps.pop()
         : false));
      if (typeof(ctr) !== 'function') { throw 'Invalid Constructor'; }

      deps = deps || [];
      deps = (deps instanceof Array) ? deps : [];

      reg[name] = deps.concat([ctr]);
      return name;
   }

   Curvy.Modules.BindingManager = function(injector, dom, app, config) {
      var binder = this;
      var bindings = {};
      config = config || app.configuration || Curvy.Configuration;

      // Init phase copies bindings from the pre-application registry and
      // adds the .binding(name, ctr) method to the application
      Object.defineProperty(binder, 'init', { enumerable: false, configurable: false, value: function() {
         for (var name in registry) { bindings[name] = registry[name]; }
         Object.defineProperty(app, 'binding', { enumerable: true, configurable: false, value: function(name, dependencies, constructor) {
            name = createRegistration(bindings, name, dependencies, constructor);
            scan([document.body], [name]);
         }});
      }});

      // Initializes existing behaviors on the dom and begins listening
      // for added / removed content in the DOM
      Object.defineProperty(binder, 'load', { enumerable: false, configurable: false, value: function() {
         var suspendCircuit = false; // avoids situations caused by error handlers that add content to the DOM
         dom.listen(function(info) {
            try {
               if (suspendCircuit) { return; }
               unload(info.removed);
               scan(info.added);
            } catch (error) {
               suspendCircuit = true;
               setTimeout(function() { suspendCircuit = false; }, 250)
               if (console && console.log) { console.log('Circuit breaker tripped.'); }
               throw error;
            }
         });
         if (document.body) { scan([document.body]); }
      }});

      Object.defineProperty(binder, 'override', { enumerable: true, configurable: false, value: function(element, name, value) {
         var data = initNode(element);
         data.registrations[name] = value;
      }});

      Object.defineProperty(binder, 'dispose', { enumerable: true, configurable: false, value: function(element, disposal) {
         var data = initNode(element);
         data.disposals.push(disposal);
      }});

      function scan(nodes, names) {
         nodes = nodes.filter(function(n) { return !isSuspended(n); });
         names = names || getNames(bindings);
         for (var n = 0; n < nodes.length; n++) {
            var results = domSearch(nodes[n], names);
            for (var r = 0; r < results.length; r++) { bind(results[r]); }
         }
      }

      function unload(nodes) {
         for (var n = 0; n < nodes.length; n++) {
            var node = nodes[n];
            if (!('getElementsByTagName' in node)) { continue; } // faster than queryselectorall
            [node].concat(node.getElementsByTagName('*'))
               .forEach(function(n) {
                  if (config.nodedata in n) { dispose(n); }
               });
         }
      }

      function bind(node) {
         var data = initNode(node);
         for (var name in bindings) {
            if (isSuspended(node)) { break; }
            if (name in data.bindings) { continue; }
            if (!node.matches || !node.matches(getAttribute(name))) { continue; }

            var overrides = getOverrides(node);
            var dependencies = bindings[name].slice(0);
            var constructor = dependencies.pop();
            var Binding = function() {
               configureContext(this, node);
               constructor.apply(this, arguments);
            }
            Binding.prototype = constructor.prototype;
            var instance = injector.resolve(dependencies.concat([Binding]), overrides);
            data.bindings[name] = instance;
         }
      }

      function dispose(node) {
         var data = getData(node);
         if (!data) { return; }
         for (var d = 0; d < data.disposals.length; d++) {
            data.disposals[d]();
         }
         for (var name in data.bindings) { delete data.bindings[name]; }
         for (var name in data.registrations) { delete data.registrations[name]; }
         while (data.disposals.length) { data.disposals.pop(); }
         delete data.bindings;
         delete data.registrations;
         delete data.suspended;
         delete data.disposals;
         delete node[config.nodedata];
      }

      function initNode(node) {
         node[config.nodedata] = node[config.nodedata] || {
            bindings: {},
            registrations: {},
            suspended: false,
            disposals: []
         };
         return getData(node);
      }

      function configureContext(context, node) {
         Object.defineProperty(context, 'element', {enumerable: true, configurable: false, value: node});
         Object.defineProperty(context, 'suspend', {enumerable: true, configurable: false, value: function() {
            var data = getData(node);
            data.suspended = true;
            return function() {
               data.suspended = false;
               scan([node]);
            };
         }});
         Object.defineProperty(context, 'register', {enumerable: true, configurable: false, value: function(name, value) {
            var data = getData(node);
            data.registrations[name] = value;
         }});
         Object.defineProperty(context, 'dispose', {enumerable: true, configurable: false, value: function(disposal) {
            var data = getData(node);
            data.disposals.push(disposal);
         }});
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

      function formatAttribute(name) { return '[' + name + ']'; }

      function domSearch(node, names) {
         if (!node || !node.matches) { return []; }
         names = names.slice(0);
         for (var n = 0; n < names.length; n++) { names[n] = getAttribute(names[n]); }
         var query = names.join(', ');
         if (!query || !query.length) { return []; }
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
         return names;
      }

      function getData(node) {
         return node[config.nodedata];
      }

      function getOverrides(node) {
         var overrides = {};
         var ancestor = node;
         while (ancestor) {
            var data = getData(ancestor);
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

      function getAttribute(name) {
         return '[' + name + ']'
      }
   };
   register();
})();
