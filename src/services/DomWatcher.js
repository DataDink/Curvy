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
