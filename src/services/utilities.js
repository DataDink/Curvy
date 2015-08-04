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

   utilities.query = function(node, query) {
      var matches = (node.matches && node.matches(query)) ? [{node: node}] : [];
      var search = node.querySelectorAll(query);
      for (var s = 0; s < search.length; s++) { matches.push({node: search[s]}); }

      for (var m = 0; m < matches.length; m++) {
         var item = matches[m];
         var ancestor = item.node.parentNode;
         while (ancestor) {
            var parent = matches.filter(function(p) { return p.node === ancestor; })[0];
            if (parent) { item.parent = parent; break; }
            ancestor = ancestor.parentNode;
         }
      }

      for (var m = 0; m < matches.length; m++) {
         var item = matches[m];
         item.children = matches.filter(function(c) { return p.parent === item; });
      }

      return matches.filter(function(m) { return !m.parent; });
   }

   Curvy.register.instance('utilities', utilities);
})();
