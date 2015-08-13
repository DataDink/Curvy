// https://github.com/remy/polyfills/blob/master/classList.js#L1
(function () {

   if (typeof window.Element === "undefined" || "classList" in document.documentElement) return;

   var push = Array.prototype.push;
   var splice = Array.prototype.splice;
   var join = Array.prototype.join;

   function DOMTokenList(element) {
      this.element = element;
      var classes = el.className.replace(/^\s+|\s+$/g,'').split(/\s+/);
      for (var i = 0; i < classes.length; i++) {
         push.call(this, classes[i]);
      }
   };

   DOMTokenList.prototype = {
     add: function(token) {
       if(this.contains(token)) return;
       push.call(this, token);
       this.element.className = this.toString();
     },
     contains: function(token) {
       return this.element.className.indexOf(token) != -1;
     },
     item: function(index) {
       return this[index] || null;
     },
     remove: function(token) {
       if (!this.contains(token)) return;
       for (var i = 0; i < this.length; i++) {
         if (this[i] == token) break;
       }
       splice.call(this, i, 1);
       this.element.className = this.toString();
     },
     toString: function() {
       return join.call(this, ' ');
     },
     toggle: function(token) {
       if (!this.contains(token)) {
         this.add(token);
       } else {
         this.remove(token);
       }

       return this.contains(token);
     }
   };

   window.DOMTokenList = DOMTokenList;

   Object.defineProperty(Element.prototype, 'classList', { configurable: false, enumerable: true,
      get: function() { return new DOMTokenList(this); }
   });
})();
