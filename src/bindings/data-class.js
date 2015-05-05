// Binds one or more classes on this element to the state of members on the ViewModel (See documentation)
Application.extend.binding('data-class', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
   var value = view.element.getAttribute('data-class') || '';
   var member = value.indexOf('{') >= 0 ? false : value;
   var config = value.indexOf('{') < 0 ? false : value.replace(/^\{+|\}+$/g, '');

   if (member) {
      var paths = member.split(/\s+/gi);
      var classes = {};

      var update = function(path) {
         if (classes[path] !== false) { html.removeClass(view.element); }
         var newclass = viewmodel.path(path);
         classes[path] = (!newclass || html.hasClass(view.element, newclass))
            ? false : newclass;
         if (classes[path] === false) { return; }
         html.addClass(newclass);
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
}]);
