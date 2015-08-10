(function() {
   var registry = {};
   function register() {
      Curvy.register.viewmodel = function(name, dependencies, constructor) {
         if (!name) { throw 'Invalid Name'; }
         registry[name] = builder(dependencies, constructor);
      };
      Curvy.register.module('viewmodel-manager', ['dependencies', 'application'], Curvy.Modules.ViewModels);
   }
   function builder(deps, ctr) {
      deps = (deps || []).slice(0);
      ctr = typeof(ctr) === 'function' ? ctr
         : (typeof(deps) === 'function' ? deps
         : (deps instanceof Array ? deps.pop()
         : false));
      if (typeof(ctr) !== 'function') { throw 'Invalid Constructor'; }
      deps = (deps instanceof Array) ? deps : [];
      deps.push(ctr);
      return deps;
   }

   Curvy.Modules.ViewModels = function(injector, app) {
      var manager = this;
      var viewmodels = {};
      for (var name in registry) { viewmodels[name] = registry[name]; }

      Object.defineProperty(app, 'viewmodel', { configurable: false, enumerable: true, value: function(name, dependencies, constructor) {
         if (!name) { throw 'Invalid Name'; }
         viewmodels[name] = builder(dependencies, constructor);
      }});

      Object.defineProperty(manager, 'resolve', { configurable: false, enumerable: true, value: function(name, parent, view) {
         if (!(name in viewmodels)) { return false; }
         var deps = viewmodels[name];
         var ctr = deps.pop();
         var ViewModel = function() {
            var viewmodel = new Curvy.Observable();
            Object.defineProperty(viewmodel, 'parent', {configurable: false, enumerable: true, value: parent});
            Object.defineProperty(viewmodel, 'view', {configurable: false, enumerable: true, value: view});
            ctr.apply(viewmodel, arguments);
         };
         return injector.resolve(deps.concat([ViewModel]));
      }});
   });
})();
