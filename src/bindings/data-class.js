// Binds one or more classes on this element to the state of members on the ViewModel (See documentation)
Curvy.register.binding('data-class', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var value = this.element.getAttribute('data-class') || '';
   var member = value.indexOf('{') >= 0 ? false : value;
   var config = value.indexOf('{') < 0 ? false : value.replace(/^\{+|\}+$/g, '');

   if (member) {
      var paths = member.split(/\s+/gi);
      var classes = {};

      var update = function(path) {
         if (classes[path] !== false) { binding.element.classList.remove(classes[path]); }
         classes[path] = validate(this.path(path));
         if (!classes[path]) { return; }
         binding.element.classList.add(classes[path]);
      };

      for (var i = 0; i < paths.length; i++) {
         classes[paths[i]] = false;
         viewmodel.watch(paths[i], (function(p) { return function() { update.call(this, p); }; })(paths[i]));
         update(paths[i]);
      }
   } else if (config) {
      var settings = config.split(',');
      for (var i = 0; i < settings.length; i++) {
         var parts = settings[i].split(':');
         settings[i] = {
            class: parts[0].trim(),
            path: parts[1].trim()
         };
         settings[i].update = (function(setting) { return function() {
            var value = viewmodel.path(setting.path);
            if (value) { html.addClass(view.element, setting.class); }
            else { html.removeClass(view.element, setting.class); }
         };})(settings[i]);
         viewmodel.watch(settings[i].path, settings[i].update);
         settings[i].update();
      }
   }

   function validate(class) {
      if (typeof(class) !== 'string' || class.length < 1) { return false; }
      if (/[^a-zA-Z0-9\-_]/.test(class)) { return false; }
      return class.toLowerString();
   }
});
