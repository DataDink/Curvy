# Curvy JS
An experimental micro MVVM framework inspired by AngularJS

AS IF we need another framework. Curvy is small and simple and was a great learning experience made for the fun of making.
There is SOME small amount of documentation available at https://DataDink.github.io/Curvy

Curious about Curvy?

If you want to toy with it or use it in something please let me know how it works!
If you would like something changed send me a pull request.

# Getting Started:

First you'll need a view-model:
```javascript
Curvy.register.viewmodel('my-viewmodel', function() {
  this.value = 0;
  this.update = function() {
    this.value++;
  }
});
```

Next you'll need to wire it to your page:
```html
<div view-model="my-viewmodel">
  <span data-format="There have been {{value}} clicks given"></span>
  <button data-click="update">Give clicks</button>
</div>
```

Lastly you'll need start your application:
```javascript
Curvy.create();
```

Please visit the docs or take a dive into the code for more info: https://DataDink.github.io/Curvy

# Additional Infoz

Compat: IE9+, Chrome, FireFox, Opera, Safari

Version: 0.1.3

# Version Notes

* 0.1.3
   * Fixed identified problems with observable->proxy
* 0.1.2
   * Bug fixes and testing tweaked for browser compat
* 0.1.1
   * Bug fixes and documentation now matches the new, cleaner Curvy.
* 0.1.0
   * Major framework cleanup (Now closer to what I originally wanted this to be)
   * This is a breaking change - Documentation updates are incoming...
   * Browser compat is under construction
* 0.0.2
   * Added unit testing. Minimal coverage... for now.
   * Cleaned up bindings. Performance refactor.
   * Fixed issues discovered by unit test - yay!
* 0.0.1
   * It's all new

-- Cheers!
