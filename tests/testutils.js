var testutils = {
   event: function(element, name) {
      if (document.createEvent) {
         var event = document.createEvent('HTMLEvents');
         event.initEvent(name, true, true);
         element.dispatchEvent(event);
      } else {
         var event = new CustomEvent(name);
         element.dispatchEvent(event);
      }
   }
}
