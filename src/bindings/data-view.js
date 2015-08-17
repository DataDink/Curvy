// Blocks other bindings on this element and replaces this element with the view at the specified URI
Curvy.register.binding('data-view', function() {
   this.suspend();
   var element = this.element;
   var url = element.getAttribute('data-view');
   var marker = document.createComment('view: ' + url);
   element.parentNode.insertBefore(marker, element);
   element.parentNode.removeChild(element);

   var request = new XMLHttpRequest();
   request.onreadystatechange = function() {
      if (this.readyState !== 4) { return; }
      if (typeof(this.responseText) !== 'string') { return; }
      var ancestor = marker.parentNode;
      while (ancestor && ancestor !== document) { ancestor = ancestor.parentNode; }
      if (!ancestor) { return; }
      var content = Curvy.Services.utilities.parse(this.responseText);
      content = (content instanceof Array) ? content : [content];
      for (var i = 0; i < content.length; i++) {
         marker.parentNode.insertBefore(content[i], marker);
      }
   };
   request.open('get', url);
   request.send();
});
