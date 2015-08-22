// Binds a segment of the dom as a template to a path on the ViewModel.
// Array values will render the template for each value while non-Array
// values will only render once.

// Each template rendering will override the owning ViewModel with a
// surrogate ViewModel that proxies the data being represented by the
// render.
(function() {
   Curvy.register.binding('data-template', ['viewmodel', 'binding-manager'], function(viewmodel, manager) {
      this.suspend();
      var element = this.element;
      var marker = document.createComment('Template Content');
      var path = element.getAttribute('data-template');

      element.removeAttribute('data-template');
      var template = element.outerHTML;
      element.parentNode.insertBefore(marker, element);
      element.parentNode.removeChild(element);

      var items = [];
      function update() {
         var models = viewmodel.path(path);
         models = ((models instanceof Array) ? models.slice(0) : [models])
            .filter(function(m) { return typeof(m) === 'object'; });

         var buffer = [];
         while (models.length) {
            var model = models.shift();
            while (items[0] && items[0].model !== model) {
               var item = items.shift();
               item.element.parentNode.removeChild(item.element);
            }
            if (items[0] && items[0].model === model) { buffer.push(items.shift()); }
            else {
               var element = Curvy.Services.utilities.parse(template);
               var datamodel = createDataModel(element, manager, viewmodel, model);
               manager.override(element, 'viewmodel', datamodel);
               var target = !items[0] ? marker : items[0].element;
               target.parentNode.insertBefore(element, target);
               buffer.push({model: model, element: element});
            }
         }
         items = buffer;
      }
      viewmodel.watch(path, update);
      update();
   });

   function createDataModel(element, manager, viewmodel, model) {
      var observable = new Curvy.Observable(model);
      Object.defineProperty(observable, 'view', {configurable: false, enumerable: true, value: viewmodel.view});
      Object.defineProperty(observable, 'parent', {configurable: false, enumerable: true, value: viewmodel});
      Object.defineProperty(observable, 'dispose', {configurable: false, enumerable: true, value: function(disposal) {
         manager.dispose(element, disposal);
      }});
      manager.dispose(function() {observable.destroy();});
      observable.seal();
      return observable;
   }
})();
