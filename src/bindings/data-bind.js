// Binds an input's value to the ViewModel
(function() {
   Curvy.register.binding('data-bind', ['viewmodel'], function(viewmodel) {
      var binding = this;
      var uri = binding.element.getAttribute('data-bind') || false;
      if (!uri) { throw 'data-bind must be set to a property / path to watch' }

      var parts = uri.split('.');
      var memberName = parts.pop();
      var modelPath = parts.join('.');
      if (!memberName) { return; }

      var toModel = false;
      var toView = false;

      var events = ['click', 'keyup', 'change'];
      for (var i = 0; i < events.length; i++) { try {
         view.element.addEventListener(events[i], function() {
            if (toView) { return; }
            toModel = true; toView = false;

            var model = !modelPath ? viewmodel : viewmodel.path(modelPath);
            model[memberName] = getInput(binding.element);
            toModel = false;
         });
      } catch (error) { } }

      function writeView() {
         if (toModel) { return; }
         toView = true; toModel = false;

         var value = viewmodel.path(uri);
         setInput(binding.element, typeof(value) === 'undefined' ? '' : value);
         toView = false;
      }

      viewmodel.watch(uri, writeView);
      writeView();
   });

   function getInput(element) {
      if (element.matches('input[type=radio]') || element.matches('input[type=checkbox]')) {
         return element.checked;
      }
      if (element.matches('select')) {
         var values = [];
         for (var i = 0; i < element.options.length; i++) {
            if (element.options[i].selected) { values.push(element.options[i].value); }
         }
         return values.length > 1 ? values : values[0];
      }
      if ('value' in element) { return element.value; }
      return element.innerHTML || '';
   }

   function setInput(element, value) {
      if (element.matches('input[type=radio]') || element.matches('input[type=checkbox]')) {
         element.checked = !!value;
         return;
      }
      if (element.matches('select')) {
         if (!(value instanceof Array)) { value = [value]; }
         for (var o = 0; o < element.options.length; o++) {
            element.options[o].selected = false;
            for (var v = 0; v < value.length; v++) {
               if (element.options[o].value !== value[v]) { continue; }
               element.options[o].selected = true;
            }
         }
         return;
      }
      if ('value' in element) { element.value = value; return; }
      element.innerHTML = service.encode((value || '').toString());
   }
})();
