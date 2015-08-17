var Curvy = function(config) {
   var application = this;
   Object.defineProperty(application, 'configuration', { enumerable: true, configurable: false, value: config });
};

Curvy.Bindings = {};
Curvy.Services = {};
Curvy.Modules = {};
