(function() {
   function register() {
      var registry = {};
      Curvy.register.binding = function(name, dependencies, constructor) {
         registry[name] = (dependencies || []).concat(constructor);
      };
      Curvy.register.module('bindings', ['injector', 'dom-watcher', 'application', 'utilities'], Curvy.Modules.Bindings)
   }

   Curvy.Modules.Bindings = function(injector, dom, app, utils) {
      var binder = this;
      var bindings = {};
      for (var name in registry) { bindings[name] = registry[name]; }

      Object.defineProperty(app, 'binding', { enumerable: true, configurable: false, value: function(name, dependencies, constructor) {
         bindings[name] = (dependencies || []).concat(constructor);
      }});

      function wire(node) {
      }

      function discover(node) {
         var items = [];
         for (var name in bindings) {
            var matches = query(node, '[' + name + ']');
            for (var m = 0; m < matches.length; m++) {
               var match = matches[m];
               var item = items.filter(function(i) { return i[0] === match; })[0];
               if (!item) { item = {node: match, bindings: []}; items.push(item); }
               item.bindings.push(name);
            }
         }
         for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var search = items[i].node.parentNode;
            while (search) {
               var parent = items.filter(function(p) { return p.node === search; })[0];
               if (parent) { item.parent = parent; break; }
               search = search.parentNode;
            }
         }
         for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.children = items.filter(function(c) { return c.parent === item; });
         }
         return items.filter(function(i) { !i.parent; });
      }

      function query(node, selector) {
         var matches = node.matches && node.matches(selector) ? [node] : [];
         var search = node.querySelectorAll(selector);
         for (var i = 0; search && i < search.length; i++) { matches.push(search[i]); }
         return matches;
      }
   };
})();
