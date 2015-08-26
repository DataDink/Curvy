/*************************************************************
*  Curvy
*  An experimental MVVM framework inspired by Angular
*  https://github.com/DataDink/Curvy
**************************************************************/

// Creates the root Curvy namespaces and application constructor
// Curvy.create is defined in services/Injector.js
var Curvy = function(config) {
   var application = this;
   Object.defineProperty(application, 'configuration', { enumerable: true, configurable: false, value: config });
};

Curvy.Bindings = {};
Curvy.Services = {};
Curvy.Modules = {};
;

Curvy.Configuration = {
   lifecycle: ['init', 'load'],
   nodedata: ' _Curvy Node Data_ '
}
;

/*************************************************************
*  Observable
*  Can be used as a standalone object or surrogate of another
*  object.
*
*  var standalone = new Curvy.Observable();
*  var surrogate = new Curvy.Observable({some: 'object'});
*
*  .notify(member)
*     Will broadcast to registered observer callbacks that
*     a member value has been changed on the object
*
*  .observe(callback)
*     Registers a function for callback by the .notify method
*
*  .unobserve(callback)
*     Unregisters a previously registered observer callback
*
*  .notifyIntercept(member, args) -- Experimental
*     Will broadcast to registered interceptors that a call
*     to a function on the object has been made
*
*  .intercept(callback) -- Experimental
*     Registers a function for callback by the .notifyIntercept
*     method
*
*  .release(callback) -- Experimental
*     Inregisters a previously registered interceptor callback
*
*  .destroy()
*     Releases internal resource references used by the
*     observable.
*
*  .seal()
*     Standalone: Replaces all properties added to the
*                 observable after construction with observed
*                 properties.
*     Surrogate:  Copies all properties from the proxied
*                 object to the surrogate observable as
*                 observed properties.
*     Also locks the observable from having properties either
*     added or removed from it.
*
*  .path(uri)
*     Returns the value of a path starting from the observable
*     following each child member of the dot '.' delimited
*     uri of member names.
*
*  .watch(uri, callback)
*     Alerts the callback each time a change is detected in
*     the path value(s) specified by the uri.
*     Returns a disposal function that will disengage the
*     watch and any internal references made by it.
*
**************************************************************/
(function() {
   Curvy.Observable = function(target) {
      var observable = this;
      var observers = [];
      var interceptors = [];

      Object.defineProperty(observable, 'notify', { enumerable: true, configurable: false, value: function(member) {
         observable.notifyIntercept('notify', arguments);
         for (var i = 0; i < observers.length; i++) { observers[i](member); }
      }});

      Object.defineProperty(observable, 'observe', { enumerable: true, configurable: false, value: function(callback) {
         observable.notifyIntercept('observe', arguments);
         if (typeof(callback) === 'function') { observers.push(callback); }
      }});

      Object.defineProperty(observable, 'unobserve', { enumerable: true, configurable: false, value: function(callback) {
         observable.notifyIntercept('unobserve', arguments);
         observers = observers.filter(function(o) { return o !== callback; });
      }});

      Object.defineProperty(observable, 'intercept', { enumerable: true, configurable: false, value: function(callback) {
         observable.notifyIntercept('intercept', arguments);
         if (typeof(callback) === 'function') { interceptors.push(callback); }
      }});

      Object.defineProperty(observable, 'release', { enumerable: true, configurable: false, value: function(callback) {
         observable.notifyIntercept('release', arguments);
         interceptors = interceptors.filter(function(i) { return i !== callback; });
      }});

      Object.defineProperty(observable, 'notifyIntercept', { enumerable: true, configurable: false, value: function(member, args) {
         for (var i = 0; i < interceptors.length; i++) { interceptors[i](member, args); }
      }});

      Object.defineProperty(observable, 'destroy', { enumerable: true, configurable: false, value: function() {
         observable.notifyIntercept('destroy', arguments);
         var nothing = (function() {})();
         interceptors = nothing;
         observable = nothing;
         observers = nothing;
         target = nothing;
      }});

      function seal() {
         seal = (function() {})();
         observable.notifyIntercept('seal', arguments);
         return proxy(target || {}, observable);
      }

      Object.defineProperty(observable, 'seal', {enumerable: true, configurable: false, get: function() {
         return seal;
      }})
   };

   Object.defineProperty(Curvy.Observable.prototype, 'path', { enumerable: true, configurable: false, value: function(path) {
      var value = this;
      var parts = (path.split('.') || []);
      while (typeof(value) !== 'undefined' && parts.length) { value = value[parts.shift()]; }
      return value;
   }});

   function defaultDispose() {};

   function pathInfo(path) {
      var parts = (path || '').split('.');
      if (!parts.length) { return false; }
      var member = parts.shift();
      if (!member) { return false; }
      return {path: path, member: member, child: parts.join('.')};
   }

   function watchChild(child, path, callback) {
      return (child instanceof Curvy.Observable) ? child.watch(path, callback) : defaultDispose;
   }

   Object.defineProperty(Curvy.Observable.prototype, 'watch', { enumerable: true, configurable: false, value: function(path, callback) {
      if (!(this instanceof Curvy.Observable)) { return defaultDispose; }
      var observable = this;
      path = pathInfo(path);
      if (!path) { return defaultDispose; }

      var disposechild = watchChild(observable[path.member], path.child, callback);
      var observer = function(name) {
         if (name === path.member) {
            disposechild();
            disposechild = watchChild(observable[path.member], path.child, callback);
            callback.call(observable, path.member);
         }
      };
      observable.observe(observer);
      return function() {
         observable.unobserve(observer); disposechild();
      };
   }});

   function proxy(target, surrogate) {
      for (var member in target) { proxyMember(member, target, surrogate); }
      for (var member in surrogate) { if (!(member in target)) { proxyMember(member, target, surrogate); }}
      Object.freeze(surrogate);
   }

   function proxyMember(member, target, surrogate) {
      if (member in Curvy.Observable.prototype) { return; }
      if (locked(surrogate, member)) { return; }
      if (!(member in target)) { target[member] = surrogate[member]; }
      delete surrogate[member];

      Object.defineProperty(surrogate, member, { enumerable: true, configurable: false,
         get: function() {
            if (typeof(target[member]) === 'function') {
               return (function(func) { return function() {
                  surrogate.notifyIntercept(member, arguments);
                  func.apply(surrogate, arguments);
               };})(target[member]);
            }
            return target[member];
         },
         set: function(v) {
            target[member] = v;
            surrogate.notify(member);
         }
      });
   }

   function locked(model, member) { return !(Object.getOwnPropertyDescriptor(model, member) || {configurable: true}).configurable; }
   Object.freeze(Curvy.Observable.prototype);
})();
;

// Ultimately I would like to not need a utilities as more things become native to JS
(function() {
   var styleblock = false;
   var cssrules = [];
   var parser = document.createElement('div');

   Curvy.Services.utilities = {
      style: function(selector, rule) {
         if (!styleblock) {
            styleblock = document.createElement('style');
            var container = document.querySelectorAll('head')[0] || document.body;
            container.insertBefore(styleblock, container.firstChild);
         }
         selector = (selector || '').trim().toLowerCase();
         if (!selector) { return; }
         rule = selector + ' { ' + (rule || '') + ' }';
         if (cssrules.some(function(r) { r === rule; })) { return; }
         cssrules.push(rule);
         styleblock.sheet.insertRule(rule, styleblock.sheet.rules.length);
      },

      encode: function(content) {
         if (content.indexOf('"') < 0 && content.indexOf("'") < 0 && content.indexOf('<') < 0 && content.indexOf('>') < 0) { return content; }
         return (content || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      },

      parse: function(html) {
         parser.innerHTML = html;
         var content = [];
         while (parser.firstChild) {
            content.push(parser.firstChild);
            parser.removeChild(parser.firstChild);
         }
         return (content.length > 1) ? content : content[0];
      },

      parseUri: function(uri) {
         uri = (uri || '').replace(/^#+/g, '');
         var parts = uri.split('?');
         var uri = (parts[0] || '').toLowerCase();
         var params = parts[1] || '';
         var data = Curvy.Services.utilities.parseQuery(parts[1] || '');
         var info = {uri: uri, params: params, data: data};
         Object.freeze(info);
         return info;
      },

      parseQuery: function(params) {
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
      },

      formatUri: function(uri, params) {
         if (!params) { return uri; }
         if (typeof(params) !== 'string') { params = Curvy.Services.utilities.formatParameters(params); }
         params = params.replace(/^[&?]+/g, '');
         var final = uri.indexOf('?') >= 0
            ? uri + '&' + params
            : uri + '?' + params;
         return final.trim().replace(/\?$|&$/gi, '');
      },

      formatParameters: function(obj) {
         if (typeof(obj) === 'string') { return obj; }
         var params = [];
         for (var name in obj) {
            var values = (obj[name] instanceof Array) ? obj[name] : [obj[name]];
            for (var i = 0; i < values.length; i++) {
               var value = (typeof(values[i]) === 'undefined' ? '' : values[i]);
               params.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
            }
         }
         return params.join('&');
      }
   };
})();
;

// The injector service handles the resolution and construction
// of all modules, services, and other dependencies

(function() {
   // Sets up global (pre-application) registrations
   function register() {
      var root = new Curvy.Services.Injector();
      Curvy.register = {
         instance: root.register.instance,
         singleton: root.register.singleton,
         contextual: root.register.contextual,
         transient: root.register.transient,
         service: function(names, dependencies, constructor) {
            names = strings(names).filter(function(n) { return n !== 'services'; }).concat(['services']);
            root.register.singleton(names, dependencies, constructor);
         },
         module: function(names, dependencies, constructor) {
            names = strings(names).filter(function(n) { return n !== 'modules'; }).concat(['modules']);
            root.register.singleton(names, dependencies, constructor);
         }
      };
      root.register.instance('configuration', Curvy.Configuration);

      // Branches from the global dependency scope and constructs a new Curvy instance
      // Also handles module initialization
      Curvy.create = function() {
         var scope = root.branch();
         var app = scope.resolve(['configuration', Curvy]);
         scope.register.instance('application', app);
         Object.defineProperty(app, 'dependencies', { enumerable: true, configurable: false, value: scope });

         var modules = scope.resolve.all('modules').filter(function(m) { return !!m; });
         var stages = (app.configuration || {}).lifecycle || [];
         for (var s = 0; s < stages.length; s++) {
            var stage = stages[s];
            for (var m = 0; m < modules.length; m++) {
               var module = modules[m];
               if (typeof(module[stage]) === 'function') { module[stage](); }
            }
         }
         return app;
      }
   }

   // The injector service
   Curvy.Services.Injector = function() {
      var injector = this;

      var registry = {};

      injector.register = {
         instance: function(names, instance) { register(names, {
            instance: instance,
            singleton: true,
            transient: false,
         });},
         singleton: function(names, dependencies, constructor) { register(names, {
            builder: builder(dependencies, constructor),
            singleton: true,
            transient: false,
         });},
         contextual: function(names, dependencies, constructor) { register(names, {
            builder: builder(dependencies, constructor),
            singleton: false,
            transient: false,
         });},
         transient: function(names, dependencies, constructor) { register(names, {
            builder: builder(dependencies, constructor),
            singleton: false,
            transient: true,
         });}
      };
      Object.freeze(injector.register);

      injector.resolve = function(item, overrides) {
         return resolve(item, overrides);
      };
      injector.resolve.all = function(item, overrides) {
         var resolution = resolve(item, overrides);
         return (resolution instanceof Array) ? resolution : [resolution];
      };
      Object.freeze(injector.resolve);

      // Creates a child injection scope.
      injector.branch = function() {
         var child = new Curvy.Services.Injector();
         itterate(function(names, info) {
            if (info.singleton && ('instance' in info)) { child.register.instance(names, info.instance); }
            else if (info.singleton) { child.register.singleton(names, info.dependencies, info.constructor); }
            else if (info.transient) { child.register.transient(names, info.dependencies, info.constructor); }
            else { child.register.contextual(names, info.dependencies, info.constructor); }
         });
         return child;
      };
      Object.freeze(injector);

      function resolve(item, overrides) {
         overrides = clone(overrides || {});
         overrides.dependencies = injector;

         var scope = {};
         itterate(function(names, info) {
            for (var i = 0; i < names.length; i++) {
               var name = names[i];
               scope[name] = scope[name] || [];
               if (info.singleton) { scope[name].push(info); }
               else {
                  scope[name].push({
                     dependencies: info.dependencies,
                     constructor: info.constructor,
                     singleton: info.singleton,
                     transient: info.transient
                  });
               }
            }
         });
         if (typeof(item) === 'string') { return resolveName(item, scope, overrides); }
         if (typeof(item) === 'function') { return resolveConstructor([item], scope, overrides); }
         if (item instanceof Array) { return resolveConstructor(item, scope, overrides); }
         throw('Unable to resolve ' + typeof(item));
      }

      function resolveName(name, scope, overrides) {
         if (name in overrides) { return overrides[name]; }
         if (!(name in scope)) { return; }

         var resolutions = [];
         var registration = scope[name];
         for (var i = 0; i < registration.length; i++) {
            var info = registration[i];
            if ('instance' in info) { resolutions.push(info.instance); }
            else {
               var resolution = resolveConstructor(info.dependencies.concat([info.constructor]), scope, overrides);
               if (!info.transient) { info.instance = resolution; }
               resolutions.push(resolution);
            }
         }
         return resolutions.length < 2 ? resolutions[0] : resolutions;
      }

      function resolveConstructor(constructor, scope, overrides) {
         var dependencies = constructor.filter(function(n) { return typeof(n) === 'string'; });
         constructor = constructor.filter(function(n) { return typeof(n) === 'function'; })[0];
         if (!constructor) { throw('Invalid constructor'); }

         for (var i = 0; i < dependencies.length; i++) {
            dependencies[i] = resolveName(dependencies[i], scope, overrides);
         }

         function Dependency() { constructor.apply(this, dependencies); }
         Dependency.prototype = constructor.prototype;
         return new Dependency();
      }

      function itterate(callback) {
         var reginfos = [];
         for (var name in registry) {
            var registration = registry[name];
            for (var i = 0; i < registration.length; i++) {
               var info = registration[i];
               var reginfo = reginfos.filter(function(r) { return r.info === info; })[0];
               if (!reginfo) {
                  reginfo = { info: info, names: [] };
                  reginfos.push(reginfo);
               }
               reginfo.names.push(name);
            }
         }
         for (var i = 0; i < reginfos.length; i++) {
            var reginfo = reginfos[i];
            callback(reginfo.names, reginfo.info);
         }
      }

      function register(names, info) {
         names = strings(names);
         if (info.builder) {
            info.constructor = info.builder.pop();
            info.dependencies = info.builder;
            delete info.builder;
         }
         for (var i = 0; i < names.length; i++) {
            var name = names[i];
            registry[name] = registry[name] || [];
            registry[name].push(info);
         }
      }

      function builder(deps, ctr) {
         ctr = typeof(ctr) === 'function' ? ctr
            : (typeof(deps) === 'function' ? deps
            : (!!deps && (deps instanceof Array)) ? deps.pop()
            : false);
         if (typeof(ctr) !== 'function') { throw 'Invalid Constructor'; }

         deps = strings(deps);
         return deps.concat([ctr]);
      }
   };

   function strings(items) {
      return (items instanceof Array)
         ? items.filter(function(s) { return typeof(s) === 'string'; })
         : (typeof(items) === 'string' ? [items] : []);
   }

   function clone(obj) {
      var dupe = {};
      for (var name in obj) { dupe[name] = obj[name]; }
      return dupe;
   }

   register();
})();
;

// Singleton service that manages global broadcasts
// http://datadink.github.io/Curvy/#broadcast
Curvy.Services.Broadcast = function() {
   var service = this;
   var subscriptions = {};
   service.subscribe = function(key, callback) {
      subscriptions[key] = subscriptions[key] || [];
      subscriptions[key].push(callback);
   };

   service.unsubscribe = function(callback) {
      for (var key in subscriptions) {
         subscriptions[key] = subscriptions[key].filter(function(c) {
            return c !== callback;
         });
      }
   };

   service.send = function(key) {
      var args = [];
      for (var i = 1; i < arguments.length; i++) { args.push(arguments[i]); }
      var callbacks = subscriptions[key] || [];
      for (var i = 0; i < callbacks.length; i++) { callbacks[i].apply(this, args); }
   };

   Object.freeze(service);
};
Curvy.register.service('broadcast', Curvy.Services.Broadcast);
;

// Monitors the addition and removal of nodes from the DOM
Curvy.Services.DomWatcher = function() {
   var watcher = this;

   var listeners = [];
   watcher.listen = function(listener) {
      if (typeof(listener) === 'function') { listeners.push(listener); }
   };
   watcher.cancel = function(listener) {
      listeners = listeners.filter(function(l) { return l !== listener; });
   };
   Object.freeze(watcher);

   function broadcast(reports) {
      var info = {
         added: [],
         removed: []
      };
      for (var r = 0; r < reports.length; r++) {
         pushall(info.added, reports[r].addedNodes);
         pushall(info.removed, reports[r].removedNodes);
      }

      info.removed = reduce(info.removed);
      info.added = reduce(info.added);
      for (var i = 0; i < listeners.length; i++) {
         listeners[i](info);
      }
   }

   // reduce filters out nodes that are children of others in the array
   function reduce(nodes) {
      var results = [];
      for (var n = 0; n < nodes.length; n++) {
         var node = nodes[n];
         if (results.some(function(r) { return r === node; })) { continue; }
         var ancestor = node.parentNode;
         while (ancestor && !nodes.some(function(a) { return a === ancestor; })) {
            ancestor = ancestor.parentNode;
         }
         if (ancestor) { continue; }
         results.push(node);
      }
      return results;
   }

   var observer;
   if(!window.MutationObserver && document.addEventListener) {
      observer = function() {
         document.addEventListener('DOMNodeInserted', function(e) {
            observer.added.push(e.target);
            if (observer.timeout) { clearTimeout(observer.timeout); }
            observer.timeout = setTimeout(observer.broadcast);
         });
         document.addEventListener('DOMNodeRemoved', function(e) {
            observer.removed.push(e.target);
            if (observer.timeout) { clearTimeout(observer.timeout); }
            observer.timeout = setTimeout(observer.broadcast);
         });
         pushall(observer.added, document.querySelectorAll('*'));
         observer.broadcast();
      };
      observer.added = []; observer.removed = [];
      observer.broadcast = function() {
         var info = { addedNodes: observer.added, removedNodes: observer.removed };
         observer.added = []; observer.removed = [];
         broadcast([info]);
      };
      if (document.readyState === 'complete') { observer(); }
      else {
         document.onreadystatechange = function() {
            if (this.readyState === 'complete') { observer(); }
         }
      }
   } else {
      observer = new MutationObserver(broadcast);
      observer.observe(document, {childList: true, subtree: true});
   }

   // pushall itterates from a non-array collection into an array
   function pushall(arr, from) { for (var i = 0; !!from && i < from.length; i++) { arr.push(from[i]); } }
};
Curvy.register.service('dom-watcher', [], Curvy.Services.DomWatcher);
;

// A transient service that wraps AJAX functionality for simple/common usages
// http://datadink.github.io/Curvy/#http
(function() {
   var utils = Curvy.Services.utilities;

   var globalHeaders = {};
   var globalConfig = {};
   var globalParams = {};
   var globalQuery = {};

   Curvy.Services.Http = function() {
      var persistHeaders = {};
      var persistConfig = {};
      var persistParams = {}; // body or query
      var persistQuery = {}; // query only

      this.setGlobalHeader = function(key, value) { globalHeaders[key] = value; }
      this.setGlobalConfig = function(key, value) { globalConfig[key] = value; }
      this.setGlobalParam = function(key, value) { globalParams[key] = value; }
      this.setGlobalQuery = function(key, value) { globalQuery[key] = value; }

      this.setHeader = function(key, value) { persistHeaders[key] = value; }
      this.setConfig = function(key, value) { persistConfig[key] = value; }
      this.setParam = function(key, value) { persistParams[key] = value; }
      this.setQuery = function(key, value) { persistQuery[key] = value; }

      function combine(source, persist, global) {
         var result = {};
         for (var key in source) { result[key] = source[key]; }
         for (var key in persist) { if (!(key in result)) { result[key] = persist[key]; } }
         for (var key in global) { if (!(key in result)) { result[key] = global[key]; } }
         return result;
      }

      function applyHeaders(headers) {
         return combine(headers, persistHeaders, globalHeaders);
      }

      function applyConfig(config) {
         return combine(config, persistConfig, globalConfig);
      }

      function applyParams(params) {
         if (typeof(params) === 'string') { return params; } // single value call only
         return combine(params, persistParams, globalParams);
      }

      function applyQuery(params) {
         return combine(params, persistQuery, globalQuery);
      }

      // REST methods
      this.get = function(uri, params, success, error, headers, config) {
         return send('get', utils.formatUri(uri, applyQuery(applyParams(params))), success, error, false, applyHeaders(headers), applyConfig(config));
      };

      this.delete = function(uri, params, success, error, headers, config) {
         return send('delete', utils.formatUri(uri, applyQuery(applyParams(params))), success, error, false, applyHeaders(headers), applyConfig(config));
      };

      this.post = function(uri, body, success, error, headers, config) {
         return send('post', utils.formatUri(uri, applyQuery({})), success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
      };

      this.patch = function(uri, body, success, error, headers, config) {
         return send('patch', utils.formatUri(uri, applyQuery({})), success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
      };

      this.put = function(uri, body, success, error, headers, config) {
         return send('put', utils.formatUri(uri, applyQuery({})), success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
      };

      Object.freeze(this);
   };
   Curvy.register.transient(['http', 'services'], Curvy.Services.Http);

   function send(method, uri, success, error, body, headers, config) {
      body = body ? JSON.stringify(body) : false;
      error = error || function() {};
      success = success || function() {};
      config = config || {};
      headers = headers || {};
      headers['Accept'] = 'application/json';
      if (body !== false) {
         headers['Content-Type'] = 'application/json';
      }

      var request = new XMLHttpRequest();
      request.open(method, uri, config.async !== false, config.user, config.pass);

      for (var header in headers) {
         request.setRequestHeader(header, headers[header]);
      }
      if (config.mimeType) { request.overrideMimeType(config.mimeType); }
      if (config.withCredentials === true) { request.withCredentials = true; }
      if (config.timeout) { request.timeout = timeout; }

      request.onreadystatechange = function() {
         if (this.readyState !== 4) { return; }
         var response = pack(this);
         var data = tryparse(this.responseText);
         if (this.status < 200 || this.status >= 400) { error.call(response, data); }
         else { success.call(response, data); }
      }

      request.ontimeout = function() {
         error({}, pack(request, true));
      }

      if (body === false) { request.send(); }
      else { request.send(body); }

      return request.abort;
   }

   function pack(request, timeout) {
      return {
         timeout: !!timeout,
         state: request.readyState,
         response: request.response,
         responseText: request.responseText,
         responseType: request.responseType,
         status: request.status,
         statusText: request.statusText,
         getHeaders: request.getAllResponseHeaders,
      }
   }

   function tryparse(content) {
      try { return JSON.parse(content); } catch(error) { console.log(content); return { parseError: error } }
   }
})();
;

// Route Service manages and syncs application hash navigations and state.
// http://datadink.github.io/Curvy/#route
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
;

// Manages the identification and syncronization of bindings in the document
// http://datadink.github.io/Curvy/#bindings
(function() {
   var registry = {}; // pre-application registration
   function register() {
      Curvy.register.binding = function(name, dependencies, constructor) {
         createRegistration(registry, name, dependencies, constructor);
      };
      Curvy.register.module('binding-manager', ['dependencies', 'dom-watcher', 'application', 'configuration'], Curvy.Modules.BindingManager)
   }

   function createRegistration(reg, name, deps, ctr) {
      if (!name) { throw 'Invalid Binding Name'; }
      if (!name.match(/^[a-zA-Z]/gi)) { throw 'Binding name must start with a letter'; }
      if (name.match(/[^a-zA-Z0-9\-\_]/gi)) { throw 'Binding names can only contain alpha-numeric characters, "-", and "_".'; }
      name = name.toLowerCase();

      ctr = typeof(ctr) === 'function' ? ctr
         : (typeof(deps) === 'function' ? deps
         : (deps instanceof Array ? deps.pop()
         : false));
      if (typeof(ctr) !== 'function') { throw 'Invalid Constructor'; }

      deps = deps || [];
      deps = (deps instanceof Array) ? deps : [];

      reg[name] = deps.concat([ctr]);
      return name;
   }

   Curvy.Modules.BindingManager = function(injector, dom, app, config) {
      var binder = this;
      var bindings = {};
      config = config || app.configuration || Curvy.Configuration;

      // Init phase copies bindings from the pre-application registry and
      // adds the .binding(name, ctr) method to the application
      Object.defineProperty(binder, 'init', { enumerable: false, configurable: false, value: function() {
         for (var name in registry) { bindings[name] = registry[name]; }
         Object.defineProperty(app, 'binding', { enumerable: true, configurable: false, value: function(name, dependencies, constructor) {
            name = createRegistration(bindings, name, dependencies, constructor);
            scan([document.body], [name]);
         }});
      }});

      // Initializes existing behaviors on the dom and begins listening
      // for added / removed content in the DOM
      Object.defineProperty(binder, 'load', { enumerable: false, configurable: false, value: function() {
         var suspendCircuit = false; // avoids situations caused by error handlers that add content to the DOM
         dom.listen(function(info) {
            try {
               if (suspendCircuit) { return; }
               unload(info.removed);
               scan(info.added);
            } catch (error) {
               suspendCircuit = true;
               setTimeout(function() { suspendCircuit = false; }, 250)
               if (console && console.log) { console.log('Circuit breaker tripped.'); }
               throw error;
            }
         });
         if (document.body) { scan([document.body]); }
      }});

      Object.defineProperty(binder, 'override', { enumerable: true, configurable: false, value: function(element, name, value) {
         var data = initNode(element);
         data.registrations[name] = value;
      }});

      Object.defineProperty(binder, 'dispose', { enumerable: true, configurable: false, value: function(element, disposal) {
         var data = initNode(element);
         data.disposals.push(disposal);
      }});

      function scan(nodes, names) {
         nodes = nodes.filter(function(n) { return !isSuspended(n); });
         names = names || getNames(bindings);
         for (var n = 0; n < nodes.length; n++) {
            var results = domSearch(nodes[n], names);
            for (var r = 0; r < results.length; r++) { bind(results[r]); }
         }
      }

      function unload(nodes) {
         for (var n = 0; n < nodes.length; n++) {
            var node = nodes[n];
            if (!('getElementsByTagName' in node)) { continue; } // faster than queryselectorall
            [node].concat(node.getElementsByTagName('*'))
               .forEach(function(n) {
                  if (config.nodedata in n) { dispose(n); }
               });
         }
      }

      function bind(node) {
         var data = initNode(node);
         for (var name in bindings) {
            if (isSuspended(node)) { break; }
            if (name in data.bindings) { continue; }
            if (!node.matches || !node.matches(getAttribute(name))) { continue; }

            var overrides = getOverrides(node);
            var dependencies = bindings[name].slice(0);
            var constructor = dependencies.pop();
            var Binding = function() {
               configureContext(this, node);
               constructor.apply(this, arguments);
            }
            Binding.prototype = constructor.prototype;
            var instance = injector.resolve(dependencies.concat([Binding]), overrides);
            data.bindings[name] = instance;
         }
      }

      function dispose(node) {
         var data = getData(node);
         if (!data) { return; }
         for (var d = 0; d < data.disposals.length; d++) {
            data.disposals[d]();
         }
         for (var name in data.bindings) { delete data.bindings[name]; }
         for (var name in data.registrations) { delete data.registrations[name]; }
         while (data.disposals.length) { data.disposals.pop(); }
         delete data.bindings;
         delete data.registrations;
         delete data.suspended;
         delete data.disposals;
         delete node[config.nodedata];
      }

      function initNode(node) {
         node[config.nodedata] = node[config.nodedata] || {
            bindings: {},
            registrations: {},
            suspended: false,
            disposals: []
         };
         return getData(node);
      }

      function configureContext(context, node) {
         Object.defineProperty(context, 'element', {enumerable: true, configurable: false, value: node});
         Object.defineProperty(context, 'suspend', {enumerable: true, configurable: false, value: function() {
            var data = getData(node);
            data.suspended = true;
            return function() {
               data.suspended = false;
               scan([node]);
            };
         }});
         Object.defineProperty(context, 'register', {enumerable: true, configurable: false, value: function(name, value) {
            var data = getData(node);
            data.registrations[name] = value;
         }});
         Object.defineProperty(context, 'dispose', {enumerable: true, configurable: false, value: function(disposal) {
            var data = getData(node);
            data.disposals.push(disposal);
         }});
      }

      function isSuspended(node) {
         var ancestor = node;
         while(ancestor) {
            var data = getData(ancestor);
            if (data && data.suspended) { return true; }
            ancestor = ancestor.parentNode;
         }
         return false;
      }

      function formatAttribute(name) { return '[' + name + ']'; }

      function domSearch(node, names) {
         if (!node || !node.matches) { return []; }
         names = names.slice(0);
         for (var n = 0; n < names.length; n++) { names[n] = getAttribute(names[n]); }
         var query = names.join(', ');
         if (!query || !query.length) { return []; }
         var results = node.matches(query) ? [{node: node, depth: domDepth(node)}] : [];
         var search = node.querySelectorAll(query);
         for (var r = 0; r < search.length; r++) { results.push({node: search[r], depth: domDepth(search[r])}); };
         results.sort(function(a, b) { return a.depth < b.depth ? -1 : (a.depth > b.depth ? 1 : 0); });
         for (var r = 0; r < results.length; r++) { results[r] = results[r].node; }
         return results;
      }

      function domDepth(node, start) { return (!node.parentNode) ? (start || 0) : domDepth(node.parentNode, (start || 0) + 1); }

      function getNames(obj) {
         var names = [];
         for (var name in obj) { names.push(name); }
         return names;
      }

      function getData(node) {
         return node[config.nodedata];
      }

      function getOverrides(node) {
         var overrides = {};
         var ancestor = node;
         while (ancestor) {
            var data = getData(ancestor);
            if (data) {
               for (var name in data.registrations) {
                  if (name in overrides) { continue; }
                  overrides[name] = data.registrations[name];
               }
            }
            ancestor = ancestor.parentNode;
         }
         return overrides;
      }

      function getAttribute(name) {
         return '[' + name + ']'
      }
   };
   register();
})();
;

// Manages the creation of view models and the syncronization with other bindings
// ViewModels are Observables that have "view", "parent", and "dispose" members
// added to them. ViewModels are then made available to decendant bindings as
// a dependency by the name of "viewmodel"
(function() {
   var registry = {};
   function register() {
      Curvy.register.viewmodel = function(name, dependencies, constructor) {
         if (!name) { throw 'Invalid Name'; }
         registry[name] = builder(dependencies, constructor);
      };
      Curvy.register.module('viewmodel-manager', ['dependencies', 'application'], Curvy.Modules.ViewModels);
   }
   function builder(deps, ctr) {
      deps = (deps instanceof Array) ? deps.slice(0) : (deps || []);
      ctr = typeof(ctr) === 'function' ? ctr
         : (typeof(deps) === 'function' ? deps
         : (deps instanceof Array ? deps.pop()
         : false));
      if (typeof(ctr) !== 'function') { throw 'Invalid Constructor'; }
      deps = (deps instanceof Array) ? deps : [];
      deps.push(ctr);
      return deps;
   }

   Curvy.Modules.ViewModels = function(injector, app) {
      var manager = this;
      var viewmodels = {};
      var postponed = {};

      Object.defineProperty(manager, 'init', { configurable: false, enumerable: false, value: function() {
         for (var name in registry) { viewmodels[name] = registry[name]; }
         Object.defineProperty(app, 'viewmodel', { configurable: false, enumerable: true, value: function(name, dependencies, constructor) {
            manager.register(name, dependencies, constructor);
         }});
      }});

      Object.defineProperty(manager, 'register', { configurable: false, enumerable: true, value: function(name, dependencies, constructor) {
         if (!name) { throw 'Invalid Name'; }
         viewmodels[name] = builder(dependencies, constructor);
         if (name in postponed) {
            for (var i = 0; i < postponed[name].length; i++) { postponed[name][i](); }
            delete postponed[name];
         }
      }});

      Object.defineProperty(manager, 'postpone', { configurable: false, enumerable: true, value: function(name, action) {
         postponed[name] = postponed[name] || [];
         postponed[name].push(action);
      }});

      Object.defineProperty(manager, 'resolve', { configurable: false, enumerable: true, value: function(name, parent, binding) {
         if (!(name in viewmodels)) { return false; }
         return manager.create(viewmodels[name].slice(0), parent, binding);
      }});

      Object.defineProperty(manager, 'create', { configurable: false, enumerable: true, value: function(constructor, parent, binding) {
         if (!(constructor instanceof Array)) { throw 'Invalid Constructor'; }
         var deps = constructor.slice(0);
         var ctr = deps.pop();
         if (typeof(ctr) !== 'function') { throw 'Invalid Constructor'; }
         function ViewModel() {
            var vm = this;
            Curvy.Observable.call(vm);
            Object.defineProperty(vm, 'view', {configurable: false, enumerable: true, value: binding.element});
            Object.defineProperty(vm, 'parent', {configurable: false, enumerable: true, value: parent});
            Object.defineProperty(vm, 'dispose', {configurable: false, enumerable: true, value: function(disposal) {
               binding.dispose(disposal);
            }});
            ctr.apply(vm, arguments);
            vm.seal();
         }
         ViewModel.prototype = Curvy.Observable.prototype;
         return injector.resolve(deps.concat([ViewModel]));
      }});
   };

   register();
})();
;

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
         binding.element.addEventListener(events[i], function() {
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
;

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
;

// Binds this element's click event to a command handler on the ViewModel
Curvy.register.binding('data-click', ['viewmodel'], function(viewmodel) {
   var path = this.element.getAttribute('data-click');
   this.element.addEventListener('click', function() {
      var method = viewmodel.path(path);
      if (typeof(method) !== 'function') { return; }
      method.apply(viewmodel, arguments);
   });
});
;

// Binds the innerTEXT of this element to the multi-value formatted text specified
// use double-curly-brackets: "My value is {{member.something.value}}"
Curvy.register.binding('data-format', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var format = binding.element.getAttribute('data-format') || '';
   var members = format.match(/\{\{[^\}]+\}\}/g);
   if (!members) { return; }

   function trim(member) { return member.replace(/^\{\{|\}\}$/g, ''); }
   function callback() {
      var phrase = format;
      for (var i = 0; i < members.length; i++) {
         var member = members[i];
         var value = viewmodel.path(trim(member));
         value = typeof(value) === 'undefined' ? '' : value;
         while (phrase.indexOf(member) >= 0) { phrase = phrase.replace(member, value); }
      }
      if (value in binding.element) { binding.element.value = phrase; }
      else { binding.element.innerHTML = Curvy.Services.utilities.encode(phrase); }
   }

   for (var m = 0; m < members.length; m++) {
      viewmodel.watch(trim(members[m]), callback);
   }
   callback();
});
;

// Binds a "true/false-ish" value on the ViewModel and shows/hides this element using an injected class/style
Curvy.register.binding('data-hide', ['viewmodel'], function(viewmodel) {
   Curvy.Services.utilities.style('.data-hide', "display: none !important;");
   var binding = this;
   var path = binding.element.getAttribute('data-hide');
   var update = function() {
      if (!viewmodel.path(path)) { binding.element.classList.remove('data-hide'); }
      else { binding.element.classList.add('data-hide'); }
   };
   viewmodel.watch(path, update);
   update();
});
;

// Binds the HREF attribute of this element to the ViewModel
Curvy.register.binding('data-href', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-href');
   var update = function() {
      var value = viewmodel.path(path) || '';
      binding.element.setAttribute('href', value);
   }
   viewmodel.watch(path, update);
   update();
});
;

// Binds the innerHTML of this element to the ViewModel
Curvy.register.binding('data-html', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-html') || '';
   function update() {
      var value = viewmodel.path(path) || '';
      binding.element.innerHTML = value;
   }
   viewmodel.watch(path, update);
   update();
});
;

// Responds to routing changes and loads content into the element.
Curvy.register.binding('data-routed', ['route'], function(route) {
   var binding = this;
   function update(current, previous) {
      if (previous && current.uri === previous.uri) { return; }
      var uri = route.routes[current.uri];
      if (!uri) { binding.element.innerHTML = ''; return; }
      var request = new XMLHttpRequest();
      request.open('get', uri, true);
      request.onreadystatechange = function() {
         if (this.readyState !== 4) { return; }
         if (this.status < 200 || this.status >= 400) {
            binding.element.innerHTML = '';
         } else {
            binding.element.innerHTML = this.responseText;
         }
      }
      request.send();
   }
   route.subscribe(update);
   binding.dispose(function() { route.unsubscribe(update); });
   update(route.current);
});
;

// Binds a "true/false-ish" value on the ViewModel and shows/hides this element using an injected class/style
Curvy.register.binding('data-show', ['viewmodel'], function(viewmodel) {
   Curvy.Services.utilities.style('.data-hide', "display: none !important;");
   var binding = this;
   var path = binding.element.getAttribute('data-show');
   var update = function() {
      if (viewmodel.path(path)) { binding.element.classList.remove('data-hide'); }
      else { binding.element.classList.add('data-hide'); }
   };
   viewmodel.watch(path, update);
   update();
});
;

// Binds the "SRC" attribute to the ViewModel
Curvy.register.binding('data-src', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-src');
   function update() {
      var value = viewmodel.path(path) || '';
      binding.element.setAttribute('src', value);
   }
   viewmodel.watch(path, update);
   update();
});
;

// Traps the "submit" event on a form and calls a command on the ViewModel
Curvy.register.binding('data-submit', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-submit');
   binding.element.addEventListener('submit', function(e) {
      e.preventDefault();
      var method = viewmodel.path(path);
      if (typeof(method) !== 'function') { return; }
      method.apply(viewmodel, arguments);
      return false;
   });
});
;

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
;

// Binds this element's "TITLE" attribute to a value on the ViewModel
Curvy.register.binding('data-title', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var path = binding.element.getAttribute('data-title');
   function update() {
      var value = viewmodel.path(path) || '';
      binding.element.setAttribute('title', value);
   }
   viewmodel.watch(path, update);
   update();
});
;

// Blocks other bindings on this element and replaces this element with the view at the specified URI
Curvy.register.binding('data-view', function() {
   this.suspend();
   var element = this.element;
   var url = element.getAttribute('data-view');
   var marker = document.createComment('view: ' + url);
   element.parentNode.insertBefore(marker, element);
   element.parentNode.removeChild(element);

   var request = new XMLHttpRequest();
   request.onreadystatechange = function() {
      if (this.readyState !== 4) { return; }
      if (typeof(this.responseText) !== 'string') { return; }
      var ancestor = marker.parentNode;
      while (ancestor && ancestor !== document) { ancestor = ancestor.parentNode; }
      if (!ancestor) { return; }
      var content = Curvy.Services.utilities.parse(this.responseText);
      content = (content instanceof Array) ? content : [content];
      for (var i = 0; i < content.length; i++) {
         marker.parentNode.insertBefore(content[i], marker);
      }
   };
   request.open('get', url);
   request.send();
});
;

// Works with the ViewModelManager to either resolve the specified
// ViewModel or postpone additional binding until an appropriate
// ViewModel has been registered.
(function() {
   Curvy.Bindings.ViewModel = function(manager, parent) {
      var binding = this;
      var name = binding.element.getAttribute('view-model');
      if (!name) { throw 'Invalid ViewModel'; }

      var viewmodel = manager.resolve(name, parent, binding);
      if (!viewmodel) {
         var resume = binding.suspend();
         manager.postpone(name, function() {
            register(binding, manager.resolve(name, parent, binding));
            resume();
         });
      } else {
         register(binding, viewmodel);
      }
   };

   function register(binding, viewmodel) {
      binding.register('viewmodel', viewmodel);
      binding.dispose(function() { viewmodel.destroy(); });
   }

   Curvy.register.binding('view-model', ['viewmodel-manager', 'viewmodel'], Curvy.Bindings.ViewModel);
})();
