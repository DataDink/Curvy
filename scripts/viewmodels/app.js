Application.extend.viewmodel('app', ['nav-service', function(nav) {
	var viewmodel = this;
	
	viewmodel.navs = {main: [], left: []};
	
	for (var group in nav.navs) {
		if (!group) { viewmodel.navs.main = nav.navs[group]; }
		else {
			viewmodel.navs.left.push({
				title: group,
				items: nav.navs[group]
			});
		}
	}
}]);
var myApp = new Application();

var myObservable = new window.myApp.Observable(['dependency', function(dependency) {
	this.observableProperty = 'initial value';
}]);
myObservable.observe(function(member) { console.log(myObservable[member]); });
myObservable.observableProperty = 'changed value';