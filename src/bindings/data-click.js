// Binds this element's click event to a command handler on the ViewModel
Curvy.register.binding('data-click', ['viewmodel'], function(viewmodel) {
   var path = this.element.getAttribute('data-click');
   this.element.addEventListener('click', function() {
      var method = viewmodel.path(path);
      if (typeof(method) !== 'function') { return; }
      method.apply(viewmodel, arguments);
   });
});
