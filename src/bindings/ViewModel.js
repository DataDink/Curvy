(function() {
   Curvy.Bindings.ViewModel = function(manager, parent) {
      var binding = this;
      var name = binding.element.getAttribute('view-model');
      if (!name) { throw 'Invalid ViewModel'; }

      var viewmodel = manager.resolve(name, parent, binding);
      if (!viewmodel) {
         var resume = binding.suspend();
         manager.postpone(name, function() {
            register(binding, manager.resolve(name, parent, binding));
            resume();
         });
      } else {
         register(binding, viewmodel);
      }
   };

   function register(binding, viewmodel) {
      binding.register('viewmodel', viewmodel);
      binding.dispose(function() { viewmodel.destroy(); });
   }

   Curvy.register.binding('view-model', ['viewmodel-manager', 'viewmodel'], Curvy.Bindings.ViewModel);
})();
