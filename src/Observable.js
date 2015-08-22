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
