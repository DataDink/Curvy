Curvy.Services.Utilities = {
   encode: function(content) {
      if (content.indexOf('"') < 0 && content.indexOf("'") < 0 && content.indexOf('<') < 0 && content.indexOf('>') < 0) { return content; }
      return (content || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;')
         .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
   }
};
