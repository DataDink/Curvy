Curvy.Services.DomWatcher = function(utils) {
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
      utils.distinct(info.removed);
      utils.distinct(info.added);
      for (var i = 0; i < listeners.length; i++) {
         listeners[i](info);
      }s
   }

   var observer;
   if(!window.MutationObserver && document.addEventListener) {
      observer = function() {
         root.addEventListener('DOMNodeInserted', function(e) {
            observer.addedNodes.push(e.target);
            if (observer.timeout) { clearTimeout(observer.timeout); }
            observer.timeout = setTimeout(observer.broadcast);
         });
         root.addEventListener('DOMNodeRemoved', function(e) {
            observer.removedNodes.push(e.target);
            if (observer.timeout) { clearTimeout(observer.timeout); }
            observer.timeout = setTimeout(observer.broadcast);
         });
      };
      observer.added = []; observer.removed = [];
      observer.broadcast = function() {
         var info = { addedNodes: observer.added, removedNodes: observer.added };
         observer.addedNodes = []; observer.removedNodes = [];
         broadcast([info]);
      };
      if (document.readyState === 'complete') { observer(); }
      else {
         document.onreadystatechange = function() {
            if (this.readyState === 'complete') { observer(); }
         }
      }
   } else {
      observer = new MutationObserver(handler);
      observer.observe(document, {childList: true, subtree: true});
   }

   // pushall itterates from a non-array collection into an array
   function pushall(arr, from) { for (var i = 0; !!from && i < from.length; i++) { arr.push(from[i]); } }
};
Curvy.register.module('dom-watcher', ['utilities'], Curvy.Services.DomWatcher);
