// Route Service manages and syncs application hash navigations and state.
(function() {
   var nothing = (function() { })();

   Curvy.Services.Route = function(bcast) {
      var service = this;
      this.channel = 'Route.Updated';
      Object.defineProperty(service, 'channel', { configurable: false, enumerable: true, value: 'Route.Updated'});

      Object.defineProperty(service, 'current', {configurable: false, enumerable: true, get: function() {
         return service.parse(window.location.hash);
      }});

      var views = {};
      Object.defineProperty(service, 'routes', {configurable: false, enumerable: true, get: function() {
         var clone = {};
         for (var name in views) { clone[name] = views[name]; }
         return clone;
      }});
      Object.defineProperty(service, 'register', {configurable: false, enumerable: true, value: function(uri, view) {
         views[service.parse(uri).uri] = view;
      }});

      var general = [];
      var subscriptions = {};
      Object.defineProperty(service, 'subscribe', {configurable: false, enumerable: true, value: function(subscription, uri) {
         if (uri === nothing) { general.push(subscription); return; }
         subscriptions[uri] = subscription[uri] || [];
         subscriptions[uri].push(subscription);
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
            window.history.pushState(null, null, '#' + service.formatUri(uri, params));
            onstate();
         } else {
            window.location.hash = service.formatUri(uri, params);
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

   Object.defineProperty(Curvy.Services.Route.prototype, 'parse', { configurable: false, enumerable: true, value: function(uri) {
      uri = (uri || '').replace(/^#+/g, '');
      var parts = uri.split('?');
      var uri = (parts[0] || '').toLowerCase();
      var params = parts[1] || '';
      var data = Curvy.Services.Route.prototype.parseQuery(parts[1] || '');
      var info = {uri: uri, params: params, data: data};
      Object.freeze(info);
      return info;
   }});

   Object.defineProperty(Curvy.Services.Route.prototype, 'parseQuery', {configurable: false, enumerable: true, value: function parseQuery(params) {
      var result = {};
      var items = (params || '').replace(/^\?+|^\&+|\&+$/g, '').split('&');
      for (var i = 0; i < items.length; i++) {
         var parts = items[i].split('=');
         if (parts.length !== 2) { continue; }
         var key = decodeURIComponent(parts[0] || '');
         var value = decodeURIComponent(parts[1] || '');
         if (typeof(result[key]) === 'string') { result[key] = [result[key], value]; }
         else if (key in result) { result[key].push(value); }
         else { result[key] = value; }
      }
      return result;
   }});

   Object.defineProperty(Curvy.Services.Route.prototype, 'formatUri', {configurable: false, enumerable: true, value: function(uri, params) {
      if (!params) { return uri; }
      if (typeof(params) !== 'string') { params = Curvy.Services.Route.formatParameters(params); }
      params = params.replace(/^[&?]+/g, '');
      return uri.indexOf('?') >= 0
         ? uri + '&' + params
         : uri + '?' + params;
   }});

   Object.defineProperty(Curvy.Services.Route.prototype, 'formatParameters', {configurable: false, enumerable: true, value: function(obj) {
      if (typeof(obj) === 'string') { return obj; }
      var params = [];
      for (var name in obj) {
         var values = (obj[name] instanceof Array) ? obj[name] : [obj[name]];
         for (var i = 0; i < values.length; i++) {
            var value = (values[i] === nothing ? '' : values[i]);
            params.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
         }
      }
      return params.join('&');
   }});

   Curvy.register.service('route', ['broadcast'], Curvy.Services.Route);
})();
