// Traps the "submit" event on a form and calls a command on the ViewModel
Curvy.register.binding('data-submit', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-submit');
   binding.element.addEventListener('submit', function(e) {
      e.preventDefault();
      var method = viewmodel.path(path);
      if (typeof(method) !== 'function') { return; }
      method.apply(viewmodel, arguments);
      return false;
   });
});
