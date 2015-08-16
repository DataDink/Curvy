// Binds the HREF attribute of this element to the ViewModel
Curvy.register.binding('data-href', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-href');
   var update = function() {
      var value = viewmodel.path(path) || '';
      view.element.setAttribute('href', value);
   }
   viewmodel.watch(path, update);
   update();
});
