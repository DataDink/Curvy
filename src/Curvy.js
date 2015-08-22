/*************************************************************
*  Curvy
*  An experimental MVVM framework inspired by Angular
*  https://github.com/DataDink/Curvy
**************************************************************/

// Creates the root Curvy namespaces and application constructor
// Curvy.create is defined in services/Injector.js
var Curvy = function(config) {
   var application = this;
   Object.defineProperty(application, 'configuration', { enumerable: true, configurable: false, value: config });
};

Curvy.Bindings = {};
Curvy.Services = {};
Curvy.Modules = {};
