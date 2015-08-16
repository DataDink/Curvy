(function() {
   Curvy.register.binding('data-template', ['viewmodel', binding-manager], function(viewmodel, manager) {
      this.suspend();
      var element = this.element;
      var marker = document.createComment('Template Content');
      var path = element.getAttribute('data-template');

      element.removeAttribute('data-template');
      var template = element.outerHTML;
      element.parentNode.insertBefore(marker, element);
      element.parentNode.removeChild(binding.element);

      var items = [];
      function update() {
         var models = viewmodel.path(path);
         models = (models instanceof Array) ? models.slice(0) : [models];

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
