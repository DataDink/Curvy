Application.extend.register.perApp('nav-service', ['route', function(route) {
	var service = this;
	service.navs = {
		'': [
			{name: 'Docs', uri: '#', view: 'views/getting-started.html'},
			{name: 'Downloads', uri: '#downloads', view: 'views/downloads.html'},
			{name: 'Source', uri: 'https://github.com/datadink/curvy'}
		],
		'First Things First': [
			{name: 'Getting started', uri: '#getting-started', view: 'views/getting-started.html'},
			{name: 'Why I made this', uri: '#why-curvy', view: 'views/why-curvy.html'},
			{name: 'Why I chose MVVM', uri: '#why-mvvm', view: 'views/why-mvvm.html'}
		],
		'The Framework': [
			{name: 'Application', uri: '#application', view: 'views/application.html'},
			{name: 'Bindings', uri: '#bindings', view: 'views/bindings.html'},
			{name: 'View Models', uri: '#viewmodels', view: 'views/view-models.html'}
		],
		'Services': [
			{name: 'broadcast', uri: '#broadcast', view: 'views/broadcast.html'},
			{name: 'http', uri: '#http', view: 'views/http.html'},
			{name: 'route', uri: '#route', view: 'views/route.html'}
		],
		'Utilities': [
			{name: 'utilities', uri: '#utilities', view: 'views/utilities.html'},
			{name: 'html', uri: '#html', view: 'views/html.html'},
			{name: 'broadcast', uri: '#broadcast', view: 'views/broadcast.html'}
		],
		'Bindings': [
			{name: 'data-bind', uri: '#data-bind', view: 'views/data-bind.html'},
			{name: 'data-class', uri: '#data-class', view: 'views/data-class.html'},
			{name: 'data-click', uri: '#data-click', view: 'views/data-click.html'},
			{name: 'data-format', uri: '#data-format', view: 'views/data-format.html'},
			{name: 'data-hide', uri: '#data-hide', view: 'views/data-hide.html'},
			{name: 'data-href', uri: '#data-href', view: 'views/data-href.html'},
			{name: 'data-html', uri: '#data-html', view: 'views/data-html.html'},
			{name: 'data-routed', uri: '#data-routed', view: 'views/data-routed.html'},
			{name: 'data-show', uri: '#data-show', view: 'views/data-show.html'},
			{name: 'data-src', uri: '#data-src', view: 'views/data-src.html'},
			{name: 'data-submit', uri: '#data-submit', view: 'views/data-submit.html'},
			{name: 'data-template', uri: '#data-template', view: 'views/data-template.html'},
			{name: 'data-title', uri: '#data-title', view: 'views/data-title.html'},
			{name: 'data-view', uri: '#data-view', view: 'views/data-view.html'}
		]
	};

	for (var section in service.navs) {
		for (var i = 0; i < service.navs[section].length; i++) {
			var item = service.navs[section][i]; 
			if (item.view) { route.register(item.uri.replace(/^#/g, ''), item.view); }
		}
	}
	
	service.navigate = route.navigate;
	
}]);
