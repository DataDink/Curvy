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

      Object.defineProperty(observable, 'seal', { enumerable: true, configurable: false, value: function() {
         observable.notifyIntercept('seal', arguments);
         if (target) { return proxy(target, observable); }
         target = {};
         for (member in observable) {
            if (member in Curvy.Observable.prototype) { continue; }
            else if (locked(observable, member)) { continue; }
            target[member] = observable[member];
         };
         return proxy(target, observable, observers);
      }});
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
      for (var member in target) {
         delete surrogate[member];
         proxyMember(member, target, surrogate);
      }
      Object.freeze(surrogate);
   }

   function proxyMember(member, target, surrogate) {
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
