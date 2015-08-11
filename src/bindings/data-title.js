// Binds this element's "TITLE" attribute to a value on the ViewModel
Curvy.register.binding('data-title', ['viewmodel'], function(viewmodel) {
   if (!viewmodel) { throw 'data-title: no viewmodel defined'; }
   var path = this.element.getAttribute('data-title');
   var update = function() {
      var value = viewmodel.path(path) || '';
      view.element.setAttribute('title', value);
   };
   viewmodel.watch(path, update);
   update();
});
