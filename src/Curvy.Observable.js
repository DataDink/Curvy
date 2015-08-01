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

      Object.defineProperty(observable, 'dispose', { enumerable: true, configurable: false, value: function() {
         observable.notifyIntercept('dispose', arguments);
         var nothing = (function() {})();
         interceptors = nothing;
         observable = nothing;
         observers = nothing;
         target = nothing;
      }});

      Object.defineProperty(observable, 'seal', { enumerable: true, configurable: false, value: function() {
         observable.notifyIntercept('seal', arguments);
         if (target) { return proxy(target, observerable, observers); }
         target = {};
         for (member in observable) {
            if (locked(observable, member)) { continue; }
            target[member] = observable[member];
         };
         return proxy(target, observable, observers);
      }});
   };

   Object.defineProperty(Curvy.Observable.prototype, 'path', { enumerable: true, configurable: false, value: function(path) {
      var parts = (path.split('.') || []);
      while (source !== nothing && parts.length) { source = source[parts.shuft()]; }
      return source;
   }});

   Object.defineProperty(Curvy.Observable.prototype, 'watch', { enumerable: true, configurable: false, value: function(path, callback) {
      if (!(this instanceof Curvy.Observable)) { return function() {}; }
      var parts = (path || '').split('.'); if (!parts.length) { return function() {}; }
      var member = parts.shift(); if (!member) { return function() {}; }
      var childpath = parts.join('.');
      function watchchild(child) { return (child instanceof Curvy.Observable)
         ? child.watch(childpath, callback)
         : function() {};
      }
      var disposechild = watchchild(this[member]);
      var observer = function(name) { if (name === member) {
         disposechild();
         disposechild = watchchild(this[member]);
         callback.call(target, member);
      } };
      this.observe(observer);
      return function() {
         this.unobserve(observer); disposechild();
      }
   }});

   function proxy(target, surrogate) {
      for (var member in target) {
         delete surrogate[member];
         proxyMember(member, target, surrogate);
      }
   }

   function proxyMember(member, target, surrogate) {
      var interceptor = createInterceptor(target[member], member, surrogate);
      Object.defineProperty(surrogate, member, { enumerable: true, configurable: false
         get: function() { return interceptor || target[member]; },
         set: function(v) {
            interceptor = createInterceptor(v, member, surrogate);
            target[member] = v;
            surrogate.notify(member);
         }
      });
   }

   function createInterceptor(func, member, surrogate) {
      if (typeof(func) !== 'function') { return false; }
      return (function() {
         surrogate.notifyIntercept(member, arguments);
         func.apply(surrogate, arguments);
      });
   }

   function locked(model, member) { return !(Object.getOwnPropertyDescriptor(model, member) || {configurable: true}).configurable; }
})();
