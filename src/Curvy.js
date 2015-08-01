var Curvy = function(injector, config) {
   var application = this;
   application.dependencies = injector;
   application.dependencies.register.instance('application', application);

   var modules = [];
   Object.defineProperty('modules', application, {configurable: false, enumerable: true, get: function() { return modules.slice(0); }});

   application.load = function() {
      modules = application.injector.resolve.all('modules');
      cycle((config.lifecycle || {}).startup);
   }

   application.unload = function() {
      cycle((config.lifecycle || {}).shutdown);
   }
   Object.freeze(application);

   function cycle(stages) {
      stages = (stages instanceof Array) ? stages : [];
      for (var s = 0; s < stages; s++) {
         var stage = stages[s];
         for (var m = 0; m < modules.length; m++) {
            var module = modules[m];
            if (typeof(module[stage]) === 'function') { module[stage](); }
         }
      }
   }
}
