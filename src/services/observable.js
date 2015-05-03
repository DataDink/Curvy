Application.extend(['application', 'utilities', function(app, utils) {

	app.Observable = function(constructor) {
		var dependencies = app.dependencies(constructor);
		for (var i = 0; i < dependencies.length; i++) {
			dependencies[i] = app.resolve(dependencies[i]);
		}
		constructor = constructor.apply(this, dependencies);
		writeObserver(constructor);
		writeProperties(constructor);
		Object.freeze(constructor);
	}
	
	app.Observable.convert = function(model) {
		model.__proto__ = {constructor: app.Observable};
		writeObserver(model);
		writeProperties(model);
		Object.freeze(model);
		return model;
	}
	app.Observable.surrogate = function(model, surrogate) {
		if (!surrogate) { surrogate = new app.Observable({}); }
		else { surrogate.__proto__ = {constructor: app.Observable} };
		writeObserver(surrogate);
		proxyProperties(model, surrogate);
		Object.freeze(surrogate);
	}
	Object.freeze(app.Observable);
	
	function writeObserver(obj) {
		var observers = [];
		// NOTIFY called when a property change occurs (will call an existing notify function if one exists)
		override(obj, 'notify', function(member) {
			for (var i = 0; i < observers.length; i++) { observers[i](member); }
		});
		// OBSERVE adds a callback handler to the observable (will call an existing "observe" function if one exists)
		override(obj, 'observe', function(callback) {
			observers.push(callback);
		});
		// UNOBSERVE removes a previously added callback (will call an existing "unobserve" function if one exists)
		override(obj, 'unobserve', function(callback) {
			observers = observers.filter(function(o) { return o !== callback; });
		});
		// PATH returns the remote value of the specified dot(.) path
		utils.constant(obj, 'path', function(path) {
			return utils.path(obj, path);
		});
		// WATCH sets a watch on the specified dot(.) path
		if (!locked(obj, 'watch')) {
			utils.constant(obj, 'watch', function(path, callback) { 
				return utils.watch(obj, path, callback); 
			});
		}
		// DISPOSE removes reference to all callbacks
		override(obj, 'dispose', function() { observers = nothing; });
	}
	
	function writeProperties(model) {
		for (var member in model) {
			if (locked(model, member)) { continue; }
			observe(model, member);
		}
	}
	
	function proxyProperties(model, surrogate) {
		for (var member in model) {
			if (locked(surrogate, member)) { continue; }
			proxy(surrogate, model, member);
		}
	}
	
	function observe(model, member) {
		var value = model[member]; delete model[member];
		Object.defineProperty(model, member, {
			get: function() { return value; },
			set: function(v) { value = v; model.notify(member); },
			configurable: false, enumerable: true 
		});
	}
	
	function proxy(model, source, member) {
		Object.defineProperty(model, member, {
			get: function() { return source[member]; },
			set: function(v) { source[member] = v; model.notify(member); },
			configurable: false, enumerable: true 
		});
	}
	
	function override(model, member, func) {
		var source = model[member];
		Object.defineProperty(model, member, {
			value: function() { func.apply(this, arguments); if (source) { source.apply(this, arguments); } },
			configurable: false, enumerable: true
		});
	}
	
	function locked(model, member) { return !(Object.getOwnPropertyDescriptor(model, member) || {configurable: true}).configurable; }
	
}]);