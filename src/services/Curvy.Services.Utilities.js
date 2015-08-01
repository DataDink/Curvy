(function() {
   var nothing = (function() {})();

   var utilities = { nothing: nothing };

   utilities.path = function(source, path) {
      return Curvy.Observable.prototype.path.call(source, path);
   };

   utilities.distinct = function(items) {
      for (var i = 0; i < items.length; i++) {
         for (var i = 0; i < items.length; i++) {
            for (var j = i + 1; j < items.length; j++) {
               if (items[i] === items[j]) {
                  items.splice(j--, 1);
               }
            }
         }
      }
   };

   Curvy.register.instance('utilities', utilities);
})();
