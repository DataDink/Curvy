// Ultimately I would like to not need a utilities as more things become native to JS
(function() {
   var styleblock = false;
   var cssrules = [];
   var parser = document.createElement('div');

   Curvy.Services.utilities = {
      style: function(selector, rule) {
         if (!styleblock) {
            styleblock = document.createElement('style');
            var container = document.querySelectorAll('head')[0] || document.body;
            container.insertBefore(styleblock, container.firstChild);
         }
         selector = (selector || '').trim().toLowerCase();
         if (!selector) { return; }
         rule = selector + ' { ' + (rule || '') + ' }';
         if (cssrules.some(function(r) { r === rule; })) { return; }
         cssrules.push(rule);
         styleblock.sheet.insertRule(rule, styleblock.sheet.rules.length);
      },

      encode: function(content) {
         if (content.indexOf('"') < 0 && content.indexOf("'") < 0 && content.indexOf('<') < 0 && content.indexOf('>') < 0) { return content; }
         return (content || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      },

      parse: function(html) {
         parser.innerHTML = html;
         var content = [];
         while (parser.firstChild) {
            content.push(parser.firstChild);
            parser.removeChild(parser.firstChild);
         }
         return (content.length > 1) ? content : content[0];
      },

      parseUri: function(uri) {
         uri = (uri || '').replace(/^#+/g, '');
         var parts = uri.split('?');
         var uri = (parts[0] || '').toLowerCase();
         var params = parts[1] || '';
         var data = Curvy.Services.utilities.parseQuery(parts[1] || '');
         var info = {uri: uri, params: params, data: data};
         Object.freeze(info);
         return info;
      },

      parseQuery: function(params) {
         var result = {};
         var items = (params || '').replace(/^\?+|^\&+|\&+$/g, '').split('&');
         for (var i = 0; i < items.length; i++) {
            var parts = items[i].split('=');
            if (parts.length !== 2) { continue; }
            var key = decodeURIComponent(parts[0] || '');
            var value = decodeURIComponent(parts[1] || '');
            if (typeof(result[key]) === 'string') { result[key] = [result[key], value]; }
            else if (key in result) { result[key].push(value); }
            else { result[key] = value; }
         }
         return result;
      },

      formatUri: function(uri, params) {
         if (!params) { return uri; }
         if (typeof(params) !== 'string') { params = Curvy.Services.utilities.formatParameters(params); }
         params = params.replace(/^[&?]+/g, '');
         var final = uri.indexOf('?') >= 0
            ? uri + '&' + params
            : uri + '?' + params;
         return final.trim().replace(/\?$|&$/gi, '');
      },

      formatParameters: function(obj) {
         if (typeof(obj) === 'string') { return obj; }
         var params = [];
         for (var name in obj) {
            var values = (obj[name] instanceof Array) ? obj[name] : [obj[name]];
            for (var i = 0; i < values.length; i++) {
               var value = (typeof(values[i]) === 'undefined' ? '' : values[i]);
               params.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
            }
         }
         return params.join('&');
      }
   };
})();
