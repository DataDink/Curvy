// Binds this element's "TITLE" attribute to a value on the ViewModel
Curvy.register.binding('data-title', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-title');
   function update() {
      var value = viewmodel.path(path) || '';
      binding.element.setAttribute('title', value);
   }
   viewmodel.watch(path, update);
   update();
});
