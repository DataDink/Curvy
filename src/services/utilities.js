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
      }
   };
})();
