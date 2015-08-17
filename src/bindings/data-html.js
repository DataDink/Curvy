// Binds the innerHTML of this element to the ViewModel
Curvy.register.binding('data-html', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-html') || '';
   function update() {
      var value = viewmodel.path(path) || '';
      binding.element.innerHTML = value;
   }
   viewmodel.watch(path, update);
   update();
});
