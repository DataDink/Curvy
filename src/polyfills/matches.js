(function() {
   var polyfill = Element.prototype.matches
            || Element.prototype.matchesSelector
            || Element.prototype.webkitMatchesSelector
            || Element.prototype.mozMatchesSelector
            || Element.prototype.msMatchesSelector
            || function(selector) {
               var matches = this.parentElement.querySelectorAll(selector);
               for (var i = 0; i < matches.length; i++) { if (matches[i] === this) { return true; } }
               return false;
            };
   Element.prototype.matches = Element.prototype.matches || polyfill;
   document.matches = document.matches || polyfill;
})();
