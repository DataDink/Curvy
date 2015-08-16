// Binds the "SRC" attribute to the ViewModel
Curvy.register.binding('data-src', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-src');
   function update() {
      var value = viewmodel.path(path) || '';
      binding.element.setAttribute('src', value);
   }
   viewmodel.watch(path, update);
   update();
});
