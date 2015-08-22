// Manages the creation of view models and the syncronization with other bindings
// ViewModels are Observables that have "view", "parent", and "dispose" members
// added to them. ViewModels are then made available to decendant bindings as
// a dependency by the name of "viewmodel"
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
      deps = (deps instanceof Array) ? deps.slice(0) : (deps || []);
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
      var postponed = {};

      Object.defineProperty(manager, 'init', { configurable: false, enumerable: false, value: function() {
         for (var name in registry) { viewmodels[name] = registry[name]; }
         Object.defineProperty(app, 'viewmodel', { configurable: false, enumerable: true, value: function(name, dependencies, constructor) {
            manager.register(name, dependencies, constructor);
         }});
      }});

      Object.defineProperty(manager, 'register', { configurable: false, enumerable: true, value: function(name, dependencies, constructor) {
         if (!name) { throw 'Invalid Name'; }
         viewmodels[name] = builder(dependencies, constructor);
         if (name in postponed) {
            for (var i = 0; i < postponed[name].length; i++) { postponed[name][i](); }
            delete postponed[name];
         }
      }});

      Object.defineProperty(manager, 'postpone', { configurable: false, enumerable: true, value: function(name, action) {
         postponed[name] = postponed[name] || [];
         postponed[name].push(action);
      }});

      Object.defineProperty(manager, 'resolve', { configurable: false, enumerable: true, value: function(name, parent, binding) {
         if (!(name in viewmodels)) { return false; }
         return manager.create(viewmodels[name].slice(0), parent, binding);
      }});

      Object.defineProperty(manager, 'create', { configurable: false, enumerable: true, value: function(constructor, parent, binding) {
         if (!(constructor instanceof Array)) { throw 'Invalid Constructor'; }
         var deps = constructor.slice(0);
         var ctr = deps.pop();
         if (typeof(ctr) !== 'function') { throw 'Invalid Constructor'; }
         function ViewModel() {
            var vm = this;
            Curvy.Observable.call(vm);
            Object.defineProperty(vm, 'view', {configurable: false, enumerable: true, value: binding.element});
            Object.defineProperty(vm, 'parent', {configurable: false, enumerable: true, value: parent});
            Object.defineProperty(vm, 'dispose', {configurable: false, enumerable: true, value: function(disposal) {
               binding.dispose(disposal);
            }});
            ctr.apply(vm, arguments);
            vm.seal();
         }
         ViewModel.prototype = Curvy.Observable.prototype;
         return injector.resolve(deps.concat([ViewModel]));
      }});
   };

   register();
})();
