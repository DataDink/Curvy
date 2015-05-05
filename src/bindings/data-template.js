(function() {
   var memberName = ' Template Model '

   Application.extend.binding('data-template', ['view', 'viewmodel manager', function(view, vmgr) {
      var model = view.element[memberName];
      var viewmodel = vmgr.surrogate(view, model);
      this.scope = { viewmodel: viewmodel };
      delete view.element[memberName];
      view.element.removeAttribute('data-template');
   }], function(view) {
      if (memberName in view.element) { return true; }

      var html = view.application.resolve('html');
      var utils = view.application.resolve('utilities');
      var viewmodel = view.scope.viewmodel;

      var element = view.element;
      var path = element.getAttribute('data-template');
      element.setAttribute('data-template', '');
      element.removeAttribute('view-model');

      var template = element.outerHTML;
      var marker = document.createComment('Template Content');
      element.parentNode.insertBefore(marker, element);
      element.parentNode.removeChild(element);

      function create(model, insert) { // Applies the model to the template and inserts a new copy at "insert"
         var e = html.parse(template)[0];
         e[memberName] = model;
         marker.parentNode.insertBefore(e, insert || marker);
         return { model: model, element: e };
      }

      var templateItems = [];
      var update = function() { // Keeps the view synced with the item(s) watched on the viewmodel
         var value = viewmodel.path(path);
         if (!utils.is(value, Array)) { value = [value]; }

         var i = 0; do {
            while (i < templateItems.length && templateItems[i].model !== value[i]) {
               var elem = templateItems.splice(i, 1)[0].element;
               elem.parentNode.removeChild(elem);
            }
            if (i >= templateItems.length && i < value.length) {
               templateItems.push(create(value[i]));
            }
         } while (++i < value.length);
      }
      // Sets a watch on the "path" on the view model
      viewmodel.watch(path, update);
      update();

      return false;
   });
})();
