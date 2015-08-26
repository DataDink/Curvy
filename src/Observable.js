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

      Object.defineProperty(observable, 'notify', { enumerable: true, configurable: false, value: function(member) {
         for (var i = 0; i < observers.length; i++) { observers[i](member); }
      }});

      Object.defineProperty(observable, 'observe', { enumerable: true, configurable: false, value: function(callback) {
         if (typeof(callback) === 'function') { observers.push(callback); }
      }});

      Object.defineProperty(observable, 'unobserve', { enumerable: true, configurable: false, value: function(callback) {
         observers = observers.filter(function(o) { return o !== callback; });
      }});

      Object.defineProperty(observable, 'destroy', { enumerable: true, configurable: false, value: function() {
         var nothing = (function() {})();
         observable = nothing;
         observers = nothing;
         target = nothing;
      }});

      function seal() {
         seal = (function() {})();
         ready(target, observable);
         return observable;
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

   function ready(target, surrogate) {
      back(target, surrogate);
      proxy(target, surrogate);
      Object.freeze(surrogate);
   }

   function back(target, surrogate) {
      for (var member in surrogate) {
         if (target && (member in target)) { target[member] = surrogate[member]; }
         else { backMember(member, surrogate); }
      }
   }

   function proxy(target, surrogate) {
      if (!target) { return; }
      for (var member in target) {
         proxyMember(member, target, surrogate);
      }
   }

   function backMember(member, surrogate) {
      var value = surrogate[member];
      writeMember(member, surrogate,
         function() { return value; },
         function(v) {
            value = v;
            surrogate.notify(member);
         });
   }

   function proxyMember(member, target, surrogate) {
      writeMember(member, surrogate,
         function() { return target[member]; },
         function(v) {
            target[member] = v;
            surrogate.notify(member);
         });
   }

   function writeMember(member, surrogate, get, set) {
      if (member in Curvy.Observable.prototype) { return; }
      if (locked(surrogate, member)) { return; }
      delete surrogate[member];
      Object.defineProperty(surrogate, member, {enumerable: true, configurable: false, get: get, set: set});
   }

   function locked(model, member) { return !(Object.getOwnPropertyDescriptor(model, member) || {configurable: true}).configurable; }
   Object.freeze(Curvy.Observable.prototype);
})();
