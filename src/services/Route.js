// Route Service manages and syncs application hash navigations and state.
(function() {
   var nothing = (function() { })();
   var utils = Curvy.Services.utilities;

   Curvy.Services.Route = function(bcast) {
      var service = this;
      this.channel = 'Route.Updated';
      Object.defineProperty(service, 'channel', { configurable: false, enumerable: true, value: 'Route.Updated'});

      var previous = false;
      Object.defineProperty(service, 'current', {configurable: false, enumerable: true, get: function() {
         return utils.parseUri(window.location.hash);
      }});

      var views = {};
      Object.defineProperty(service, 'routes', {configurable: false, enumerable: true, get: function() {
         var clone = {};
         for (var name in views) { clone[name] = views[name]; }
         return clone;
      }});
      Object.defineProperty(service, 'register', {configurable: false, enumerable: true, value: function(uri, view) {
         views[utils.parseUri(uri).uri] = view;
      }});

      var general = [];
      var subscriptions = {};
      Object.defineProperty(service, 'subscribe', {configurable: false, enumerable: true, value: function(subscription, uri) {
         var handler = typeof(subscription) === 'function' ? subscription
            : (typeof(uri) === 'function' ? uri
            : false);
         if (!handler) { throw 'Invalid Subscription'; }

         var uri = typeof(uri) === 'string' ? uri
            : (typeof(subscription) === 'string' ? subscription
            : false);
         if (!uri) { general.push(handler); return; }
         subscriptions[uri] = subscription[uri] || [];
         subscriptions[uri].push(handler);
      }});

      Object.defineProperty(service, 'unsubscribe', {configurable: false, enumerable: true, value: function(subscription) {
         for (var name in subscriptions) {
            subscriptions[name] = subscriptions[name]
            .filter(function(s) { return s !== subscription; });
         }
         general = general.filter(function(s) { return s !== subscription; });
      }});

      Object.defineProperty(service, 'navigate', {configurable: false, enumerable: true, value: function(uri, params) {
         if (window.history && window.history.pushState) {
            window.history.pushState(null, null, '#' + utils.formatUri(uri, params));
            onstate();
         } else {
            window.location.hash = utils.formatUri(uri, params);
         }
      }});

      function onstate() {
         var prev = previous;
         previous = service.current;
         var curr = service.current;
         var handlers = subscriptions[curr.uri] || [];
         for (var i = 0; i < 2; i++) {
            for (var h = 0; h < handlers.length; h++) {
               handlers[h](curr, prev);
            }
            handlers = general;
         }
         bcast.send(service.channel, curr);
      }

      if (window.onpopstate) { window.onpopstate = onstate; }
      else { window.addEventListener('hashchange', onstate); }

      Object.freeze(service);
   };

   Curvy.register.service('route', ['broadcast'], Curvy.Services.Route);
})();
