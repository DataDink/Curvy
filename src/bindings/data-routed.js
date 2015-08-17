// Responds to routing changes and loads content into the element.
Curvy.register.binding('data-routed', ['route'], function(route) {
   var binding = this;
   function update(current, previous) {
      if (previous && current.uri === previous.uri) { return; }
      var uri = route.routes[current.uri];
      if (!uri) { binding.element.innerHTML = ''; return; }
      var request = new XMLHttpRequest();
      request.open('get', uri, true);
      request.onreadystatechange = function() {
         if (this.readyState !== 4) { return; }
         if (this.status < 200 || this.status >= 400) {
            binding.element.innerHTML = '';
         } else {
            binding.element.innerHTML = this.responseText;
         }
      }
      request.send();
   }
   route.subscribe(update);
   binding.dispose(function() { route.unsubscribe(update); });
   update(route.current);
});
