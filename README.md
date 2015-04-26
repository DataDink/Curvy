# Curvy JS
An experimental micro MVVM framework inspired by AngularJS

AS IF we need another framework. Curvy is small and simple and was made for the fun of making. 
There is SOME small amount of documentation available at https://DataDink.github.io/Curvy

Curious about Curvy?

If you want to toy with it or use it in something please let me know how it works!
If you would like something changed send me a pull request.

# Getting Started:

First you'll need an application:
```javascript
window.myApp = new Application(document);
```

Next you'll need a view-model:
```javascript
window.myApp.viewmodel('my-viewmodel', function() {
  this.value = 0;
  this.update = function() {
    this.value++;
  }
});
```

Lastly you'll need to wire it to your page:
```html
<div view-model="my-viewmodel">
  <span data-format="There have been {{value}} clicks given"></span>
  <button data-click="update">Give clicks</button>
</div>
```

Please visit the docs or take a dive into the code for more info: https://DataDink.github.io/Curvy

# Additional Infoz

Compat: IE9+, Chrome, FireFox, Opera

Unknown: IOS/Safari

Version: 0.0.1

-- Cheers!
