// The injector service handles the resolution and construction
// of all modules, services, and other dependencies

(function() {
   // Sets up global (pre-application) registrations
   function register() {
      var root = new Curvy.Services.Injector();
      Curvy.register = {
         instance: root.register.instance,
         singleton: root.register.singleton,
         contextual: root.register.contextual,
         transient: root.register.transient,
         service: function(names, dependencies, constructor) {
            names = strings(names).filter(function(n) { return n !== 'services'; }).concat(['services']);
            root.register.singleton(names, dependencies, constructor);
         },
         module: function(names, dependencies, constructor) {
            names = strings(names).filter(function(n) { return n !== 'modules'; }).concat(['modules']);
            root.register.singleton(names, dependencies, constructor);
         }
      };
      root.register.instance('configuration', Curvy.Configuration);

      // Branches from the global dependency scope and constructs a new Curvy instance
      // Also handles module initialization
      Curvy.create = function() {
         var scope = root.branch();
         var app = scope.resolve(['configuration', Curvy]);
         scope.register.instance('application', app);
         Object.defineProperty(app, 'dependencies', { enumerable: true, configurable: false, value: scope });

         var modules = scope.resolve.all('modules').filter(function(m) { return !!m; });
         var stages = (app.configuration || {}).lifecycle || [];
         for (var s = 0; s < stages.length; s++) {
            var stage = stages[s];
            for (var m = 0; m < modules.length; m++) {
               var module = modules[m];
               if (typeof(module[stage]) === 'function') { module[stage](); }
            }
         }
         return app;
      }
   }

   // The injector service
   Curvy.Services.Injector = function() {
      var injector = this;

      var registry = {};

      injector.register = {
         instance: function(names, instance) { register(names, {
            instance: instance,
            singleton: true,
            transient: false,
         });},
         singleton: function(names, dependencies, constructor) { register(names, {
            builder: builder(dependencies, constructor),
            singleton: true,
            transient: false,
         });},
         contextual: function(names, dependencies, constructor) { register(names, {
            builder: builder(dependencies, constructor),
            singleton: false,
            transient: false,
         });},
         transient: function(names, dependencies, constructor) { register(names, {
            builder: builder(dependencies, constructor),
            singleton: false,
            transient: true,
         });}
      };
      Object.freeze(injector.register);

      injector.resolve = function(item, overrides) {
         return resolve(item, overrides);
      };
      injector.resolve.all = function(item, overrides) {
         var resolution = resolve(item, overrides);
         return (resolution instanceof Array) ? resolution : [resolution];
      };
      Object.freeze(injector.resolve);

      // Creates a child injection scope.
      injector.branch = function() {
         var child = new Curvy.Services.Injector();
         itterate(function(names, info) {
            if (info.singleton && ('instance' in info)) { child.register.instance(names, info.instance); }
            else if (info.singleton) { child.register.singleton(names, info.dependencies, info.constructor); }
            else if (info.transient) { child.register.transient(names, info.dependencies, info.constructor); }
            else { child.register.contextual(names, info.dependencies, info.constructor); }
         });
         return child;
      };
      Object.freeze(injector);

      function resolve(item, overrides) {
         overrides = clone(overrides || {});
         overrides.dependencies = injector;

         var scope = {};
         itterate(function(names, info) {
            for (var i = 0; i < names.length; i++) {
               var name = names[i];
               scope[name] = scope[name] || [];
               if (info.singleton) { scope[name].push(info); }
               else {
                  scope[name].push({
                     dependencies: info.dependencies,
                     constructor: info.constructor,
                     singleton: info.singleton,
                     transient: info.transient
                  });
               }
            }
         });
         if (typeof(item) === 'string') { return resolveName(item, scope, overrides); }
         if (typeof(item) === 'function') { return resolveConstructor([item], scope, overrides); }
         if (item instanceof Array) { return resolveConstructor(item, scope, overrides); }
         throw('Unable to resolve ' + typeof(item));
      }

      function resolveName(name, scope, overrides) {
         if (name in overrides) { return overrides[name]; }
         if (!(name in scope)) { return; }

         var resolutions = [];
         var registration = scope[name];
         for (var i = 0; i < registration.length; i++) {
            var info = registration[i];
            if ('instance' in info) { resolutions.push(info.instance); }
            else {
               var resolution = resolveConstructor(info.dependencies.concat([info.constructor]), scope, overrides);
               if (!info.transient) { info.instance = resolution; }
               resolutions.push(resolution);
            }
         }
         return resolutions.length < 2 ? resolutions[0] : resolutions;
      }

      function resolveConstructor(constructor, scope, overrides) {
         var dependencies = constructor.filter(function(n) { return typeof(n) === 'string'; });
         constructor = constructor.filter(function(n) { return typeof(n) === 'function'; })[0];
         if (!constructor) { throw('Invalid constructor'); }

         for (var i = 0; i < dependencies.length; i++) {
            dependencies[i] = resolveName(dependencies[i], scope, overrides);
         }

         function Dependency() { constructor.apply(this, dependencies); }
         Dependency.prototype = constructor.prototype;
         return new Dependency();
      }

      function itterate(callback) {
         var reginfos = [];
         for (var name in registry) {
            var registration = registry[name];
            for (var i = 0; i < registration.length; i++) {
               var info = registration[i];
               var reginfo = reginfos.filter(function(r) { return r.info === info; })[0];
               if (!reginfo) {
                  reginfo = { info: info, names: [] };
                  reginfos.push(reginfo);
               }
               reginfo.names.push(name);
            }
         }
         for (var i = 0; i < reginfos.length; i++) {
            var reginfo = reginfos[i];
            callback(reginfo.names, reginfo.info);
         }
      }

      function register(names, info) {
         names = strings(names);
         if (info.builder) {
            info.constructor = info.builder.pop();
            info.dependencies = info.builder;
            delete info.builder;
         }
         for (var i = 0; i < names.length; i++) {
            var name = names[i];
            registry[name] = registry[name] || [];
            registry[name].push(info);
         }
      }

      function builder(deps, ctr) {
         ctr = typeof(ctr) === 'function' ? ctr
            : (typeof(deps) === 'function' ? deps
            : (!!deps && (deps instanceof Array)) ? deps.pop()
            : false);
         if (typeof(ctr) !== 'function') { throw 'Invalid Constructor'; }

         deps = strings(deps);
         return deps.concat([ctr]);
      }
   };

   function strings(items) {
      return (items instanceof Array)
         ? items.filter(function(s) { return typeof(s) === 'string'; })
         : (typeof(items) === 'string' ? [items] : []);
   }

   function clone(obj) {
      var dupe = {};
      for (var name in obj) { dupe[name] = obj[name]; }
      return dupe;
   }

   register();
})();
