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
            names = strings(names).filter(function(n) { return n !== 'modules'; }).concat(['modules']));
            root.register.singleton(names, dependencies, constructor);
         }
      };

      Curvy.create = function() {
         var scope = root.branch();
         return new Curvy(scope, Curvy.Configuration);
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
         itterate(function(name, info) {
            if (info.singleton && ('instance' in info)) { child.register.instance(name, info.instance); }
            else if (info.singleton) { child.register.singleton(name, info.dependencies, info.constructor); }
            else if (info.transient) { child.register.transient(name, info.dependencies, info.constructor); }
            else { child.register.contextual(name, info.dependencies, info.constructor); }
         });
      };
      Object.freeze(injector);

      function resolve(item, overrides) {
         var scope = {};
         itterate(function(name, info) {
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
         });
         if (typeof(item) === 'string') { return resolveName(item, scope, overrides); }
         if (typeof(item) === 'function') { return resolveConstructor([item], scope, overrides); }
         if (item instanceof Array) { return resolveConstructor(item, scope, overrides); }
         error('Unable to resolve ' + typeof(item));
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
               var resolution = resolveConstructor(info.dependencies.concat([info.constructor]));
               if (!info.transient) { info.instance = resolution; }
               resolutions.push(resolution);
            }
         }
         return resolutions.length < 2 ? resolutions[0] : resolutions;
      }

      function resolveConstructor(constructor, scope, overrides) {
         var dependencies = constructor.filter(function(n) { return typeof(n) === 'string'; });
         constructor = constructor.filter(function(n) { return typeof(n) === 'function'; })[0];
         if (!constructor) { error('Invalid constructor'); }

         for (var i = 0; i < dependencies.length; i++) {
            dependencies[i] = resolve(dependencies[i], scope, overrides);
         }

         function Dependency() { constructor.apply(this, dependencies); }
         Dependency.prototype = constructor.prototype;
         return new Dependency();
      }

      function itterate(callback) {
         for (var name in registry) {
            var registration = registry[name];
            for (var i = 0; i < registration.length; i++) {
               var info = registration[name];
               callback(name, info);
            }
         }
      }

      function register(names, info) {
         if (typeof(info.constructor) !== 'function') { error('Registered constructor was not a function'); }
         for (var name in strings(names)) {
            registry[name] = registry[name] || [];
            registry[name].push(info);
         }
      }
   };

   function strings(items) {
      return (items instanceof Array)
         ? strings.filter(function(s) { return typeof(s) === 'string'; })
         : (typeof(strings) === 'string' ? [strings] : []);
   }
   register();
})();
