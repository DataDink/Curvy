(function() {
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

      Curvy.create = function() {
         var scope = root.branch();
         var app = new Curvy(Curvy.Configuration);
         Object.defineProperty(app, 'dependencies', { enumerable: true, configurable: false, value: scope });
         scope.register.instance('application', app);

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

   Curvy.Services.Injector = function() {
      var injector = this;

      var registry = {};

      injector.register = {
         instance: function(names, instance) { register(names, {
            dependencies: [],
            constructor: function() {},
            instance: instance,
            singleton: true,
            transient: false,
         });},
         singleton: function(names, dependencies, constructor) { register(names, {
            dependencies: strings(dependencies),
            constructor: constructor,
            singleton: true,
            transient: false,
         });},
         contextual: function(names, dependencies, constructor) { register(names, {
            dependencies: strings(dependencies),
            constructor: constructor,
            singleton: false,
            transient: false,
         });},
         transient: function(names, dependencies, constructor) { register(names, {
            dependencies: strings(dependencies),
            constructor: constructor,
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
         if (typeof(info.constructor) !== 'function') { throw('Registered constructor was not a function'); }
         names = strings(names);
         for (var i = 0; i < names.length; i++) {
            var name = names[i];
            registry[name] = registry[name] || [];
            registry[name].push(info);
         }
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
