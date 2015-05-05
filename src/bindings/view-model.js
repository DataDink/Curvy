// Extends the application to support ViewModels
(function() {
	var bindingName = 'view-model';
	var memberName = ' ViewModel ';
	
	// Pre-registration
	var preRegistration = {};
	Object.defineProperty(Application.extend, 'viewmodel', { value: 
		function(name, constructor) { preRegistration[name] = { ctr: constructor }; },
		configurable: false, enumerable: true
	});
	
	// Post-registration 
	Application.extend(['viewmodel manager', 'application', function(mgr, app) {
		app.viewmodel = function(name, constructor) { mgr.register(name, constructor); }
		Object.freeze(app.viewmodel);
	}]);
	
	Application.extend.register.perApp('viewmodel manager', ['utilities', 'application', function(utils, app) {
		var manager = this;
		var registrations = utils.copy(preRegistration);
		function registered(name) { return (name in registrations); }
		function exists(name) { return registered(name) && !!registrations[name].ctr; }
		
		manager.register = function(name, constructor) {
			if (exists(name)) { throw 'View Model "' + name + '" already exists'; }
			if (!registered(name)) { registrations[name] = {}; }
			registrations[name].ctr = constructor;
			while (registrations[name].postponed && registrations[name].postponed.length) {
				registrations[name].postponed.shift()();
			}
		};
		
		manager.prescan = function(name, view) {
			if (!exists(name)) {
				if (!registered(name)) { registrations[name] = { postponed: [] }; }
				registrations[name].postponed.push(view.scan);
				return false;
			}
			return true;
		};
		
		manager.init = function(name, view) {
			if (!exists(name)) { throw 'View Model "' + name + '" not found'; }
			var model = app.resolve(registrations[name].ctr, view.scope);
			return model;
		};
		
		manager.convert = function(view, model) {
			write(view, model);
			app.Observable.convert(model);
			return model;
		};
		
		manager.surrogate = function(view, model) {
			var surrogate = {};
			write(view, surrogate);
			app.Observable.surrogate(model, surrogate);
			return surrogate;
		}
		
		function write(view, vm) {
			var element = view.element;
			element[memberName] = vm;
			
			utils.readonly(vm, 'view', function() { return view; });
			
			utils.readonly(vm, 'parent', function() { return (function(elem) {
				while (elem.parentNode && elem.parentNode !== app.root && !(memberName in elem)) {
					elem = elem.parentNode;
				} return !elem.parentNode ? false : (elem.parentNode[memberName] || false);
			})(element); });
			
			utils.readonly(vm, 'children', function() { 
				var nodes = utils.toarray(element.querySelectorAll('*'))
					.filter(function(n) { 
						return (memberName in n) && n[memberName].parent === vm; 
					});
				var models = [];
				while (nodes.length) { models.push(nodes.pop()[memberName]); }
				return models;
			});	
			
			var watches = [];
			utils.constant(vm, 'watch', function(path, callback) {
				var disposal = utils.watch(vm, path, callback);
				var watch = function() {
					watches = watches.filter(function(w) { return w !== watch; });
					disposal();
				};
				watches.push(watch);
				return watch;
			});
			
			view.dispose = function() {
				while (watches.length) { watches.pop()(); }
				watches = utils.nothing;
				element = utils.nothing;
				view = utils.nothing;
				vm = utils.nothing;
			};
		};
	}]);	
	
	Application.extend.binding(bindingName, ['viewmodel manager', 'view', function(mgr, view) {
		var name = view.element.getAttribute(bindingName);
		var model = mgr.init(name, view);
		mgr.convert(view, model);
		this.scope = { viewmodel: model };
	}], function(view) {
		var name = view.element.getAttribute(bindingName);
		var mgr = view.application.resolve('viewmodel manager');
		return mgr.prescan(name, view);
	});
	
})();