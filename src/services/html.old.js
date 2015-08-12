// Common HTML related utilities available for injection
(function() {
   var parser = document.createElement('div');
   var styleblock = document.createElement('style');
   document.head.appendChild(styleblock);
   var styles = {};

   Application.extend.register.perApp('html', ['utilities', 'application', function(utils, app) {
      var service = this;

      // ENCODE: encodes HTML so that it can be displayed
      service.encode = function(str) {
         if (str.indexOf('"') < 0 && str.indexOf("'") < 0 && str.indexOf('<') < 0 && str.indexOf('>') < 0) { return str; }
         return (str || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      };

      // PARSE: parses html into DOM nodes
      service.parse = function(str) {
         var nodes = [];
         try { parser.innerHTML = str; } catch(error) { return false; }
         while (parser.firstChild) { nodes.push(parser.firstChild); parser.removeChild(parser.firstChild); }
         return nodes;
      };

      // SETSTYLE: Adds a styling rule to the page
      service.setStyle = function(selector, style) {
         if (selector in styles) { return; }
         styles[selector] = style;

         var concat = '';
         for (var key in styles) {
            concat = concat + key + ' ' + styles[key] + '\r\n';
         }
         styleblock.innerHTML = concat;
      };

      // REMOVECLASS: removes a class from the element
      service.removeClass = function(element, cls) {
         cls = cls.replace(/[^a-z0-9\-_]+/gi, '');
         var value = element.getAttribute('class') || '';
         value = value.replace(new RegExp('(\\s|^)' + cls + '(\\s|$)', 'gi'), '');
         element.setAttribute('class', value.trim());
      };

      // ADDCLASS: adds a class to the element
      service.addClass = function(element, cls) {
         cls = cls.replace(/[^a-z0-9\-_]+/gi, '');
         var value = element.getAttribute('class') || '';
         value = value.replace(new RegExp('(\\s|^)' + cls + '(\\s|$)', 'gi'), '');
         value = value + ' ' + cls;
         element.setAttribute('class', value.trim());
      };

      // HASCLASS: determines if a class exists
      service.hasClass = function(element, cls) {
         cls = cls.replace(/[^a-z0-9\-_]+/gi, '');
         var value = element.getAttribute('class') || '';
         return !!value.match(new RegExp('(\\s|^)' + cls + '(\\s|$)', 'gi'));
      };

      // TOGGLECLASS: toggles a class on the element
      service.toggleClass = function(element, cls) {
         if (service.hasClass(element, cls)) { service.removeClass(element, cls); }
         else { service.addClass(element, cls); }
      };

      // INDOM: See utilities
      service.indom = function(element) {
         return utils.indom(element);
      }

      // FORMATPARAMETERS: converts an object to a uri query string
      service.formatParameters = function(obj) {
         if (typeof(obj) === 'string') { return obj; }
         var params = [];
         for (var name in obj) {
            var values = utils.is(obj[name], Array) ? obj[name] : [obj[name]];
            for (var i = 0; i < values.length; i++) {
               var value = (values[i] === utils.nothing ? '' : values[i]);
               params.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
            }
         }
         return params.join('&');
      }

      // FORMATURI: concats a uri with a query object or string
      service.formatUri = function(uri, params) {
         if (!params) { return uri; }
         if (!utils.is(params, 'string')) { params = service.formatParameters(params); }
         params = params.replace(/^[&?]+/g, '');
         return uri.indexOf('?') >= 0
            ? uri + '&' + params
            : uri + '?' + params;
      }

      Object.freeze(service);
   }]);
})();
