(function() {
   Curvy.Bindings.ViewModel = function(manager, parent) {
      var context = this;
      var name = this.element.getAttribute('view-model');
      var view = this.element;
      var viewmodel = manager.resolve(name, parent, view);
      if (!viewmodel) {
         var resume = this.suspend();
         manager.register(name, function() {
            create()
         });
      } else {

      }
   };

   function create(context, parent, view) {

   }

   Curvy.register.binding('view-model', ['viewmodel-manager', 'viewmodel'], Curvy.Bindings.ViewModel);
})();
