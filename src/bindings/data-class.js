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
         classes[path] = validate(viewmodel.path(path));
         if (!classes[path]) { return; }
         binding.element.classList.add(classes[path]);
      };

      for (var i = 0; i < paths.length; i++) {
         classes[paths[i]] = false;
         viewmodel.watch(paths[i], (function(p) { return function() { update(p); }; })(paths[i]));
         update(paths[i]);
      }
   } else if (config) {
      var settings = config.split(',');
      for (var i = 0; i < settings.length; i++) {
         var parts = settings[i].split(':');
         settings[i] = {
            class: validate(parts[0].trim()),
            path: parts[1].trim()
         };
         if (!settings[i].class) { throw 'Invalid Class Name'; }

         settings[i].update = (function(setting) { return function() {
            var value = viewmodel.path(setting.path);
            binding.element.classList.remove(setting.class);
            if (value) { binding.element.classList.add(setting.class); }
         };})(settings[i]);
         viewmodel.watch(settings[i].path, settings[i].update);
         settings[i].update();
      }
   }

   function validate(name) {
      if (typeof(name) !== 'string' || name.length < 1) { return false; }
      if (/[^a-zA-Z0-9\-_]/.test(name)) { return false; }
      return name.toLowerCase();
   }
});
