// Binds a "true/false-ish" value on the ViewModel and shows/hides this element using an injected class/style
Curvy.register.binding('data-hide', ['viewmodel'], function(viewmodel) {
   Curvy.Services.utilities.style('.data-hide', "display: none !important;");
   var binding = this;
   var path = binding.element.getAttribute('data-show');
   var update = function() {
      if (viewmodel.path(path)) { binding.element.classList.remove('data-hide'); }
      else { binding.element.classList.add('data-hide'); }
   };
   viewmodel.watch(path, update);
   update();
});
