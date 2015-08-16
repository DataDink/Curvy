// Binds the innerTEXT of this element to the multi-value formatted text specified
// use double-curly-brackets: "My value is {{member.something.value}}"
Curvy.register.binding('data-format', ['viewmodel'], function(viewmodel) {
   var binding = this;
   var format = binding.element.getAttribute('data-format') || '';
   var members = format.match(/\{\{[^\}]+\}\}/g);
   if (!members) { return; }

   function trim(member) { return member.replace(/^\{\{|\}\}$/g, ''); }
   function callback() {
      var phrase = format;
      for (var i = 0; i < members.length; i++) {
         var member = members[i];
         var value = viewmodel.path(trim(member));
         value = typeof(value) === 'undefined' ? '' : value;
         while (phrase.indexOf(member) >= 0) { phrase = phrase.replace(member, value); }
      }
      if (value in binding.element) { binding.element.value = phrase; }
      else { binding.element.innerHTML = Curvy.Services.Utilities.encode(phrase); }
   }

   for (var m = 0; m < members.length; m++) {
      viewmodel.watch(trim(members[m]), callback);
   }
   callback();
});
