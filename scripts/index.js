(function() {
	// Globally defining the Application constructor
	Object.defineProperty(window, 'Application', { value: Application, configurable: false, enumerable: false });
	
	// Creating the "extend" registry (for registering framework extensions prior to construction)
	var extensions = [];
	window.Application.extend = function(constructor) { extensions.push(constructor); };
	
	// Defining the global injection container
	Object.defineProperty(window.Application.extend, 'register', { 
		value: new InjectionContainer(),
		configurable: false, enumerable: true
	});
	Object.freeze(window.Application);
	
	// Stuff
	var nothing = (function(v) { return v; })();
	function copy(f) { var x = {}; for (var n in f) { x[n] = f[n]; }; return x; }
	function is(v, m) {
		if (v && v.__proto__ && v.__proto__.constructor === m) { return true; }
		if (v && v.prototype && v.prototype.constructor === m) { return true; }
		if (v && v.constructor && v.constructor === m) { return true; }
		return ((typeof(v) || '').toString().toLowerCase() === (m || '').toString().trim().toLowerCase());
	}
	
	/*** Application ***/
	function Application(root) {
		var application = this;
		var container = window.Application.extend.register.clone(); 
		Object.defineProperty(this, 'root', { value: root || document, configurable: false, enumerable: true });
		
		// Application offers dependency resolution and extension integration
		Object.defineProperty(this, 'register', {value: {
			instance: function(name, value) { container.instance(name, value); },
			perApp: function(name, constructor) { container.perApp(name, constructor); },
			perScope: function(name, constructor) { container.perScope(name, constructor); },
			perResolve: function(name, constructor) { container.perResolve(name, constructor); },
			dependencies: function(constructor) { return container.dependencies(constructor); }
		}, configurable: false, enumerable: true });
		Object.freeze(application.register);
		
		Object.defineProperty(this, 'resolve', { value: function(item, overrides) { 
			var scope = copy(overrides || {});
			scope.application = application;
			return container.resolve(item, scope); 
		}, configurable: false, enumerable: true });
		
		for (var i = 0; i < extensions.length; i++) {
			container.resolve(extensions[i], {application: application});
		}
		Object.freeze(application);
	}
	
	/*** Dependency Injection ***/
	function InjectionContainer(instances, singletons, scoped, transients) {
		var container = this;
		
		var instances = copy(instances || {}); // Pre-constructed
		container.instance = function(name, value) { instances[name] = value; };
		
		var singletons = copy(singletons || {}); // Per instance of application
		container.perApp = function(name, constructor) { singletons[name] = constructor; };
		
		var scoped = copy(scoped || {}); // Per resolution chain/scope
		container.perScope = function(name, constructor) { scoped[name] = constructor; };
		
		var transients = copy(transients || {}); // New instance every time
		container.perResolve = function(name, constructor) { transients[name] = constructor; };
		
		container.registered = function(name) { return (name in instances || name in singletons || name in scoped || name in transients); };
		function get(name) { return singletons[name] || scoped[name] || transients[name]; }
		
		container.dependencies = function(constructor) { return params(constructor); }
		
		// Creates a proxy constructor effectively allowing "apply" on a constructor
		function construct(ctr, values) {
			ctr = is(ctr, Array) ? ctr[ctr.length - 1] : ctr;
			function dependency(values) { ctr.apply(this, values); }
			dependency.prototype = ctr.prototype;
			return new dependency(values);
		}
		
		// Constructors can be functions or arrays.
		// If array then pull dependencies from the strings in the array
		// (dependencies are determined by "name")
		function params(ctr) {
			if (is(ctr, Array)) {
				var items = [];
				for (var v = 0; v < ctr.length && is(ctr[v], String); v++) {
					items.push(ctr[v].trim());
				} return items;
			} return parse(ctr);
		}
		// Parses a function constructor and extracts parameter names to be
		// used for dependency resolution
		function parse(ctr) {
			var values = (/^function[^\(]*\(([^\)]+)\)/gi).exec(ctr.toString());
			if (!values) { return []; }
			var items = values[1].split(',');
			for (var i = 0; i < items.length; i++) { items[i] = items[i].trim(); }
			return items;
		}
		
		// Resolves a registered dependency by name
		function resolveName(name, scope) {
			if (!container.registered(name)) { return nothing; }
			if (name in instances) { return instances[name]; }
			if (name in singletons) { 
				instances[name] = resolve(singletons[name], scope);
				return instances[name];
			}
			return resolve(scoped[name] || transients[name], scope);
		}
		
		// Resolves a constructor
		function resolve(ctr, scope) {
			var reqs = params(ctr);
			var values = [];
			for (var i = 0; i < reqs.length; i++) {
				var name = reqs[i];
				if (name in scope) { values.push(scope[name]); }
				else if (name in transients) { 
					values.push(resolveName(name, scope)); 
				} else {
					scope[name] = resolveName(name, scope);
					values.push(scope[name]);
				}
			}
			return construct(ctr, values);
		}
		
		container.resolve = function(item, overrides) {
			var scope = copy(overrides || {});
			if (is(item, String)) { return resolveName(item, scope); }
			else { return resolve(item, scope); }
		};
		
		container.clone = function() {
			return new InjectionContainer(instances, singletons, scoped, transients);
		}
		
		container.dispose = function() {
			if (container === window.Application.extend.register) { throw "Can't dispose global container"; }
			instances = nothing; singletons = nothing; scoped = nothing; transients = nothing;
		}
		Object.freeze(container);
	}
})()
;

// Common application utilities. "Observable" stuff is done here
(function() {
	var nothing = (function(v) { return v; })(); // Always undefined
	
	window.Application.extend.register.perApp('utilities', ['application', function(app) {
		var utilities = this;
		// NOTHING is always undefined
		utilities.nothing = nothing;
		// IS will match a value by constructor or type
		utilities.is = function(value, type) {
			if (value && value.__proto__ && value.__proto__.constructor === type) { return true; }
			if (value && value.prototype && value.prototype.constructor === type) { return true; }
			if (value && value.constructor && value.constructor === type) { return true; }
			return ((typeof(value) || '').toString().toLowerCase() === (type || '').toString().trim().toLowerCase());
		};
		// READONLY creates a reaonly property with a getter function
		utilities.readonly = function(target, member, func) { Object.defineProperty(target, member, {
			get: func, configurable: false, enumerable: true
		});};
		// CONSTANT creates a locked-down readonly property value
		utilities.constant = function(target, member, value) { Object.defineProperty(target, member, {
			value: value, configurable: false, enumerable: true
		});};
		// PATH navigates a dot(.) path from a source object. (undefined on fail)
		utilities.path = function(source, path) { 
			var parts = (path.split('.') || []);
			while (source != nothing && parts.length) { source = source[parts.shift()]; }
			return source;
		};
		// WATCH will listen to a path of observable members
		utilities.watch = function(target, path, callback) {
			var parts = (path || '').split('.'); if (!parts.length) { return function() {}; }
			var member = parts.shift(); if (!member) { return function() {}; }
			var childpath = parts.join('.');
			function watchchild(child) { return (utilities.is(child, app.Observable)) 
				? child.watch(childpath, callback) 
				: function() {}; 
			} 
			var disposechild = watchchild(target[member]);
			var observer = function(name) { if (name === member) {
				disposechild();
				disposechild = watchchild(target[member]);
				callback.call(target, member);
			} };
			target.observe(observer);
			return function() { 
				target.unobserve(observer); disposechild(); 
			}
		};
		// COPY creates a shallow copy of an object
		utilities.copy = function(obj) {
			var shallow = {};
			for (var m in obj) { shallow[m] = obj[m]; }
			return shallow;
		};
		// MERGE will create a shallow merge of two objects
		utilities.merge = function(from, to) {
			var result = {};
			for (var m in from) { result[m] = from[m]; }
			for (var m in to) { result[m] = to[m]; }
			return result;
		};
		// TOARRAY attempts to create an array from an array-like object
		utilities.toarray = function(items) {
			var array = [];
			if ('length' in items) { 
				for (var i = 0; i < items.length; i++) { array.push(items[i]); }
			} else {
				for (var i = 0; i in items; i++) { array.push(items[i]); }
			}
			return array;
		};
		// DISTINCT filters out duplicate references
		utilities.distinct = function(items) {
			for (var i = 0; i < items.length; i++) {
				for (var j = i + 1; j < items.length; j++) {
					if (items[i] === items[j]) {
						items.splice(j--, 1);
					}
				}
			}
		};
		// DOMDEPTH counts how deeply nested a node is from the document root
		utilities.domdepth = function(node, offset) {
			offset = offset || 0;
			if (!node) { return offset; };
			return utilities.domdepth(node.parentNode, offset + 1);
		};
		// DOMSORT sorts a collection of nodes by their nested depth in the document
		utilities.domsort = function(nodes) {
			nodes = utilities.toarray(nodes);
			for (var i = 0; i < nodes.length; i++) { 
				nodes[i] = {n: nodes[i], d: utilities.domdepth(nodes[i]) }; 
			}
			nodes.sort(function(a, b) { return a.d - b.d; });
			for (var i = 0; i < nodes.length; i++) {
				nodes[i] = nodes[i].n;
			}
			return nodes;
		};
		// DOMQUERY applies a query selector to the node and its decendants
		utilities.domquery = function(node, selector) {
			var nodes = [];
			if (node.matches && node.matches(selector)) { nodes.push(node); }
			var matches = node.querySelectorAll ? node.querySelectorAll(selector) : [];
			for (var i = 0; i < matches.length; i++) { nodes.push(matches[i]); }
			return utilities.domsort(nodes);
		};
		// INDOM determines if the element belongs to the application root node
		utilities.indom = function(element) {
			var searcher = (!!app.root.body && !!app.root.body.contains) ? app.root.body : app.root;
			return !searcher.contains || searcher.contains(element);
		};
		Object.freeze(utilities);
	}]);
	
	/*** Compat Fixes ***/
	Element.prototype.matches = Element.prototype.matches 
								|| Element.prototype.matchesSelector
								|| function(selector) {
									if (!this || !this.parentNode || !this.parentNode.querySelectorAll) { return; };
									var matches = this.parentNode.querySelectorAll(selector);
									for (var i = 0; matches && i < matches.length; i++) { 
										if (matches[i] === this) { return true; } 
									}
									return false;
								};
})();
;

Application.extend(['application', 'utilities', function(app, utils) {

	app.Observable = function(constructor) {
		var dependencies = app.register.dependencies(constructor);
		for (var i = 0; i < dependencies.length; i++) {
			dependencies[i] = app.resolve(dependencies[i]);
		}
		constructor = utils.is(constructor, Array) ? constructor.pop() : constructor;
		constructor.apply(this, dependencies);
		writeObserver(this);
		writeProperties(this);
		Object.freeze(this);
	}
	
	app.Observable.convert = function(model) {
		model.__proto__ = {constructor: app.Observable};
		writeObserver(model);
		writeProperties(model);
		Object.freeze(model);
		return model;
	}
	app.Observable.surrogate = function(model, surrogate) {
		surrogate = surrogate || {};
		surrogate.__proto__ = {constructor: app.Observable};
		writeObserver(surrogate);
		proxyProperties(model, surrogate);
		Object.freeze(surrogate);
		return surrogate;
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
	
}]);;

// Singleton service that manages global broadcasts
Application.extend.register.perApp('broadcast', function() {
	var service = this;
	var subscriptions = {};
	service.subscribe = function(key, callback) { 
		subscriptions[key] = subscriptions[key] || [];
		subscriptions[key].push(callback);
	};
	
	service.unsubscribe = function(callback) {
		for (var key in subscriptions) {
			subscriptions[key] = subscriptions[key].filter(function(c) { 
				return c !== callback; 
			});
		}
	};
	
	service.send = function(key) {
		var args = [];
		for (var i = 1; i < arguments.length; i++) { args.push(arguments[i]); }
		var callbacks = subscriptions[key] || [];
		for (var i = 0; i < callbacks.length; i++) { callbacks[i].apply(this, args); }
	};
	
	Object.freeze(service);
});
;

(function() {
	var memberName = ' View ';

	var globals = {};
	Object.defineProperty(Application.extend, 'binding', { value: 
		function(name, constructor, prescan) { globals[name] = { ctr: constructor, prescan: prescan}; },
		configurable: false, enumerable: true
	});
		
	// Application extension that tracks DOM changes and manages DOM bindings
	// TLDR: This manages/tracks data-attributes and keeps them wired to code
	Application.extend(['application', 'utilities', 'broadcast', function(app, utils, bcast) {
	
		View = function(element) { // View constructor
			if (memberName in element) { return; }
			var parent = getParent(element);
			if (parent && !parent.bound) { return; }
			
			var view = this;
			element[memberName] = view;
			
			var application = app;
			utils.readonly(view, 'application', function() { return application; });
			utils.readonly(view, 'element', function() { return element; });
			utils.readonly(view, 'root', function() { return (function(v) { while(getParent(v.element)) { v = getParent(v.element); } return v; })(view); });
			utils.readonly(view, 'parent', function() { return getParent(element); });
			utils.readonly(view, 'children', function() { return getChildren(view); });
			
			var bound = false; // Will not be bound until all bindings and parent bindings are "ready"
			utils.readonly(view, 'bound', function() { return bound; });
			
			// Subscribes to a broadcast and will auto-unsubscribe when the view is disposed
			view.listen = function(channel, callback) { 
				bcast.subscribe(channel, callback);
				view.dispose = function() { bcast.unsubscribe(callback); };
			}
			
			// Marks this view as "bound" which will block further bindings to this element.
			function setbound() { 
				bound = true; 
				attach([element]);
			}
			
			function dispose() {
				delete element[memberName];
				application = utils.nothing;
				element = utils.nothing;
				view = utils.nothing;
			};
			// "Setting" dispose on the view will add to the disposal chain intead of replacing it
			Object.defineProperty(view, 'dispose', {
				get: function() { return dispose; },
				set: function(d) { 
					if (!utils.is(d, 'function')) { throw 'dispose must be a function'; }
					dispose = (function(orig) { return function() { d(); orig(); }; })(dispose); 
				},
				configurable: false, enumerable: true
			});
			
			// Injection scope for views is based on their ancestors
			var scope = { view: view };
			utils.readonly(view, 'scope', function() {
				return !view.parent ? utils.copy(scope) : utils.merge(view.parent.scope, scope);
			});
			
			// Scans this element and all of its child elements for bindings that need to be made
			view.scan = function() {
				if (bound) { return; } // Taken care of in a previous scan
				if (view.parent && !view.parent.bound) { return; }
				var names = {}; 
				for (b in bindings) { 
					if (element.matches && element.matches('[' + b + ']')) { 
						names[b] = bindings[b]; 
					} 
				}
				for (var b in names) { 
					if ( bindings[b].prescan && bindings[b].prescan(view) === false ) { 
						bound = false; return; 
					}
				}
				for (var b in names) {
					bind(app.resolve(bindings[b].ctr, view.scope));
				}
				setbound();
			};
			
			function bind(binding) {
				if ('scope' in binding) {
					for (name in binding.scope) {
						if (!(name in scope)) { scope[name] = binding.scope[name]; }
					}
				}
				if ('dispose' in binding) { view.dispose = binding.dispose; }
			}
			
			Object.freeze(view);
			view.scan();
		}
		function getParent(e) {
			e = ('element' in e) ? e.element : e;
			while (e.parentNode && !(memberName in e.parentNode)) { e = e.parentNode; }
			return !e.parentNode ? utils.nothing : e.parentNode[memberName];
		};
		function getChildren(v) {
			var element = ('element' in v) ? v.element : v;
			var candidates = utils.toarray(element.querySelectorAll('*'));
			return candidates.filter(function(c) { return c[memberName].parent === element[memberName]; });
		};
		function disposeView(e) {
			var view = (memberName in e) ? e[memberName] : e;
			if (!view || !view.dispose) { return; }
			view.dispose();
		};
		
		var bindings = utils.copy(globals);
		var observer = new DomWatcher(app.root, attach, detach, utils);
		
		function detach(nodes) { // Views will be disposed when their nodes are removed.
			for (var n = 0; n < nodes.length; n++) {
				var elem = nodes[n];
				if (!elem.querySelectorAll) { continue; }
				var desc = utils.toarray(elem.querySelectorAll('*'))
					.filter(function(c) { return !!c[memberName]; });
				disposeView(elem);
				for (var d = 0; d < desc.length; d++) {
					disposeView(desc[d]);
				}
			}
		}
		
		function attach(nodes) { // Handle configuring elements newly added to the DOM
			var elements = searchBindings(nodes);
			for (var e = 0; e < elements.length; e++) {
				new View(elements[e]);
			}
		}
		
		function searchBindings(elements) { // Find elements with bindings
			var all = [];
			for (var e = 0; e < elements.length; e++) {
				if (!elements[e].querySelectorAll) { continue; }
				for (var binding in bindings) {
					all = all.concat(utils.domquery(elements[e], '[' + binding + ']'));
				}
			}
			utils.distinct(all);
			return utils.domsort(all);
		}
		
		attach([app.root]);
	}]);
	
	/*** DomWatcher (IE9+) ***/ 
	function DomWatcher(root, add, remove, utils) { // Responds to dom mutations
		function handler(reports) {
			var added = [];
			var removed = [];
			for (var r = 0; r < reports.length; r++) {
				pushall(added, reports[r].addedNodes);
				pushall(removed, reports[r].removedNodes);
			}
			utils.distinct(removed); remove(removed);
			utils.distinct(added); add(added);
		}
		if (!window.MutationObserver && document.addEventListener) {
			function wireup() {
				root.addEventListener('DOMNodeInserted', function(e) {
					handler([{addedNodes: [e.target]}]);
				});
				root.addEventListener('DOMNodeRemoved', function(e) {
					handler([{removedNodes: [e.target]}]);
				});
				handler([{addedNodes: [root]}]);
			}
			if (document.readyState === 'complete') { wireup(); }
			else {
				document.onreadystatechange = function() {
					if (this.readyState === 'complete') { wireup(); }
				}
			}
		} else {
			(new MutationObserver(handler)).observe(root, { childList: true, subtree: true });
		}
		function pushall(arr, from) { for (var i = 0; !!from && i < from.length; i++) { arr.push(from[i]); } }
	}
})();;

// General AJAX wrapper that provides global and session request configurations
Application.extend(['application', function(app) { // Wrapping like this will make global configuration become per-application
	var globalHeaders = {};
	var globalConfig = {};
	var globalParams = {};
	var globalQuery = {};
	
	// Not singleton. Allows a service to configure its own common headers/parameters without affecting other services
	app.register.perResolve('http', ['html', function(html) {
		var persistHeaders = {};
		var persistConfig = {};
		var persistParams = {}; // body or query
		var persistQuery = {}; // query only
		
		this.setGlobalHeader = function(key, value) { globalHeaders[key] = value; }
		this.setGlobalConfig = function(key, value) { globalConfig[key] = value; }
		this.setGlobalParam = function(key, value) { globalParams[key] = value; }
		this.setGlobalQuery = function(key, value) { globalQuery[key] = value; }
		
		this.setHeader = function(key, value) { persistHeaders[key] = value; }
		this.setConfig = function(key, value) { persistConfig[key] = value; }
		this.setParam = function(key, value) { persistParams[key] = value; }
		this.setQuery = function(key, value) { persistQuery[key] = value; }
		
		function combine(source, persist, global) {
			var result = {};
			for (var key in source) { result[key] = source[key]; }
			for (var key in persist) { if (!(key in result)) { result[key] = persist[key]; } }
			for (var key in global) { if (!(key in result)) { result[key] = global[key]; } }
			return result;
		}
		
		function applyHeaders(headers) {
			return combine(headers, persistHeaders, globalHeaders);
		}
		
		function applyConfig(config) {
			return combine(config, persistConfig, globalConfig);
		}
		
		function applyParams(params) {
			if (typeof(params) === 'string') { return params; } // single value call only
			return combine(params, persistParams, globalParams);
		}
		
		function applyQuery(params) {
			return combine(params, persistQuery, globalQuery);
		}
	
		// REST methods
		this.get = function(uri, params, success, error, headers, config) {
			return send('get', html.formatUri(uri, applyQuery(applyParams(params))), success, error, false, applyHeaders(headers), applyConfig(config));
		};
		
		this.delete = function(uri, params, success, error, headers, config) {
			return send('delete', html.formatUri(uri, applyQuery(applyParams(params))), success, error, false, applyHeaders(headers), applyConfig(config));
		};
		
		this.post = function(uri, body, success, error, headers, config) {
			return send('post', html.formatUri(uri, applyQuery({})), success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
		};
		
		this.patch = function(uri, body, success, error, headers, config) {
			return send('patch', html.formatUri(uri, applyQuery({})), success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
		};
		
		this.put = function(uri, body, success, error, headers, config) {
			return send('put', html.formatUri(uri, applyQuery({})), success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
		};
		
		Object.freeze(this);
	}]);
	
	function send(method, uri, success, error, body, headers, config) {
		body = body ? JSON.stringify(body) : false;
		error = error || function() {};
		success = success || function() {};
		config = config || {};
		headers = headers || {};
		headers['Accept'] = 'application/json';
		if (body !== false) {
			headers['Content-Type'] = 'application/json';
		}
		
		var request = new XMLHttpRequest();
		request.open(method, uri, config.async !== false, config.user, config.pass);
		
		for (var header in headers) {
			request.setRequestHeader(header, headers[header]);
		}
		if (config.mimeType) { request.overrideMimeType(config.mimeType); }
		if (config.withCredentials === true) { request.withCredentials = true; }
		if (config.timeout) { request.timeout = timeout; }
		
		request.onreadystatechange = function() {
			if (this.readyState !== 4) { return; }
			var response = pack(this);
			var data = tryparse(this.responseText);
			if (this.status < 200 || this.status >= 400) { error.call(response, data); }
			else { success.call(response, data); }
		}
		
		request.ontimeout = function() {
			error({}, pack(request, true));
		}
		
		if (body === false) { request.send(); }
		else { request.send(body); }
		
		return request.abort;
	}

	function pack(request, timeout) {
		return {
			timeout: !!timeout,
			state: request.readyState,
			response: request.response,
			responseText: request.responseText,
			responseType: request.responseType,
			status: request.status,
			statusText: request.statusText,
			getHeaders: request.getAllResponseHeaders,
		}
	}

	function tryparse(content) {
		try { return JSON.parse(content); } catch(error) { console.log(content); return { parseError: error } }
	}
}]);
;

// Common HTML related utilities available for injection
(function() {
	var parser = document.createElement('div');
	var styleblock = document.createElement('style');
	document.head.appendChild(styleblock);
	var styles = {};

	Application.extend.register.perApp('html', ['utilities', 'application', function(utils, app) {
		var service = this;
		
		// ENCODE: encodes HTML so that it can be displayed
		service.encode = function(str) {
			if (str.indexOf('"') < 0 && str.indexOf("'") < 0 && str.indexOf('<') < 0 && str.indexOf('>') < 0) { return str; }
			return (str || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		};
		
		// PARSE: parses html into DOM nodes
		service.parse = function(str) {
			var nodes = [];
			try { parser.innerHTML = str; } catch(error) { return false; }
			while (parser.firstChild) { nodes.push(parser.firstChild); parser.removeChild(parser.firstChild); }
			return nodes;
		};

		// GETINPUTVALUE: tries to determine an input type and get an appropriate value
		service.getInputValue = function(element) {
			if (element.matches('input[type=radio]') || element.matches('input[type=checkbox]')) {
				return element.checked;
			}
			if (element.matches('select')) {
				var values = [];
				for (var i = 0; i < element.options.length; i++) {
					if (element.options[i].selected) { values.push(element.options[i].value); }
				}
				return values.length > 1 ? values : values[0];
			}
			if ('value' in element) { return element.value; }
			return element.innerHTML || '';
		};
		
		// SETINPUTVALUE: tries to determine an input type and set an appropriate value
		service.setInputValue = function(element, value) {
			if (element.matches('input[type=radio]') || element.matches('input[type=checkbox]')) {
				element.checked = !!value;
				return;
			}
			if (element.matches('select')) {
				if (!utils.is(value, Array)) { value = [value]; }
				for (var v = 0; v < value.length; v++) {
					for (var o = 0; o < element.options.length; o++) {
						element.options[o].checked = element.options[o].value === value[v];
					}
				}
				return;
			}
			if ('value' in element) { element.value = value; return; }
			element.innerHTML = service.encode((value || '').toString());
		};
		
		// SETSTYLE: Adds a styling rule to the page
		service.setStyle = function(selector, style) {
			if (selector in styles) { return; }
			styles[selector] = style;
			
			var concat = '';
			for (var key in styles) {
				concat = concat + key + ' ' + styles[key] + '\r\n';
			}
			styleblock.innerHTML = concat;
		};
		
		// REMOVECLASS: removes a class from the element
		service.removeClass = function(element, cls) {
			cls = cls.replace(/[^a-z0-9\-_]+/gi, '');
			var value = element.getAttribute('class') || '';
			value = value.replace(new RegExp('(\\s|^)' + cls + '(\\s|$)', 'gi'), '');
			element.setAttribute('class', value.trim());
		};
		
		// ADDCLASS: adds a class to the element
		service.addClass = function(element, cls) {
			cls = cls.replace(/[^a-z0-9\-_]+/gi, '');
			var value = element.getAttribute('class') || '';
			value = value.replace(new RegExp('(\\s|^)' + cls + '(\\s|$)', 'gi'), '');
			value = value + ' ' + cls;
			element.setAttribute('class', value.trim());
		};
		
		// HASCLASS: determines if a class exists
		service.hasClass = function(element, cls) {
			cls = cls.replace(/[^a-z0-9\-_]+/gi, '');
			var value = element.getAttribute('class') || '';
			return !!value.match(new RegExp('(\\s|^)' + cls + '(\\s|$)', 'gi'));
		};
		
		// TOGGLECLASS: toggles a class on the element
		service.toggleClass = function(element, cls) {
			if (service.hasClass(element, cls)) { service.removeClass(element, cls); }
			else { service.addClass(element, cls); }
		};
		
		// INDOM: See utilities
		service.indom = function(element) {
			return utils.indom(element);
		}
		
		// FORMATPARAMETERS: converts an object to a uri query string
		service.formatParameters = function(obj) {
			if (typeof(obj) === 'string') { return obj; }
			var params = [];
			for (var name in obj) {
				var value = (obj[name] === utils.nothing ? '' : obj[name]).toString();
				params.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
			}
			return params.join('&');
		}
		
		// FORMATURI: concats a uri with a query object or string
		service.formatUri = function(uri, params) {
			if (!params) { return uri; }
			if (!utils.is(params, 'string')) { params = service.formatParameters(params); }
			params = params.replace(/^[&?]+/g, '');
			return uri.indexOf('?') >= 0
				? uri + '&' + params
				: uri + '?' + params;
		}
		
		// PARSEQUERY: converts a query string into an object
		service.parseQuery = function(params) {
			var result = {};
			var items = (params || '').replace(/^\?+|^\&+|\&+$/g, '').split('&');
			for (var i = 0; i < items.length; i++) {
				var parts = items[i].split('=');
				if (parts.length !== 2) { continue; }
				var key = decodeURIComponent(parts[0] || '');
				var value = decodeURIComponent(parts[1] || '');
				if (!key || !value) { continue; }
				if (typeof(result[key]) === 'string') { result[key] = [result[key], value]; }				
				else if (key in result) { result[key].push(value); }
				else { result[key] = value; }
			}
			return result;
		}
		
		Object.freeze(service);
	}]);
})();
;

// Route Service manages and syncs application hash navigations and state.
Application.extend.register.perApp('route', ['utilities', 'html', 'broadcast', function(utils, html, bcast) {
	var service = this;
	service.channel = 'Route.Updated'; // This broadcast channel will be alerted to hash location updates
	
	service.parse = function(uri) {
		uri = (uri || '').replace(/^#+/g, '');
		var parts = uri.split('?');
		var uri = (parts[0] || '').toLowerCase();
		var params = parts[1] || '';
		var data = html.parseQuery(parts[1] || '');
		var info = {uri: uri, params: params, data: data};
		Object.freeze(info);
		return info;
	}
	
	// CURRENT: will contain the current location data
	utils.readonly(service, 'current', function() { return service.parse(window.location.hash); });
	var previous = service.current;
	
	// ROUTES: the currently configured views
	var views = {};
	utils.readonly(service, 'routes', function() { return utils.copy(views); });
	service.register = function(uri, view) {
		views[service.parse(uri).uri] = view;
	};
	
	// SUBSCRIBE/UNSUBSCRIBE: listens for route changes
	var general = [];
	var subscriptions = {};
	service.subscribe = function(subscription, uri) { 
		if (uri === utils.nothing) { general.push(subscription); return; }
		subscriptions[uri] = subscription[uri] || [];
		subscriptions[uri].push(subscription);
	};
	service.unsubscribe = function(subscription) {
		for (var name in subscriptions) {
			subscriptions[name] = subscriptions[name]
			.filter(function(s) { return s !== subscription; });
		}
		general = general.filter(function(s) { return s !== subscription; });
	};
	
	// NAVIGATE: pushes a hash path
	service.navigate = function(uri, params) {
		if (window.history && window.history.pushState) {
			window.history.pushState(null, null, '#' + html.formatUri(uri, params));
			onstate();
		} else {
			window.location.hash = html.formatUri(uri, params);
		}
	}
	
	function onstate() {
		var prev = previous;
		previous = service.current;
		var curr = service.current;
		var handlers = subscriptions[curr.uri] || [];
		for (var i = 0; i < 2; i++) {
			for (var h = 0; h < handlers.length; h++) {
				handlers[h](curr, prev);
			}
			handlers = general;
		}
		bcast.send(service.channel, curr);
	}
	
	if (window.onpopstate) { window.onpopstate = onstate; }
	else { window.addEventListener('hashchange', onstate); }
	
	Object.freeze(service);
}]);;

// Responds to routing changes and loads content into the element.
Application.extend.binding('data-routed', ['view', 'route', function(view, route) {
	var update = function(current, previous) {
		if (previous && current.uri === previous.uri) { return; } // only trigger on path changes
		var uri = route.routes[current.uri];
		if (!uri) { view.element.innerHTML = ''; return; }
		var request = new XMLHttpRequest();
		request.open('get', uri, true);
		request.onreadystatechange = function() {
			if (this.readyState !== 4) { return; }
			if (this.status < 200 || this.status >= 400) { 
				view.element.innerHTML = ''; 
			}
			else { 
				view.element.innerHTML = this.responseText; 
			}
		}
		request.send();
	};
	route.subscribe(update);
	update(route.current);
}]);;

(function() {
	var memberName = ' Template Model '

	Application.extend.binding('data-template', ['view', 'viewmodel manager', function(view, vmgr) {
		var model = view.element[memberName];
		var viewmodel = vmgr.surrogate(view, model);
		this.scope = { viewmodel: viewmodel };
		delete view.element[memberName];
		view.element.removeAttribute('data-template');
	}], function(view) { 
		if (memberName in view.element) { return true; }
		
		var html = view.application.resolve('html');
		var utils = view.application.resolve('utilities');
		var viewmodel = view.scope.viewmodel;
		
		var element = view.element; 
		var path = element.getAttribute('data-template');
		element.setAttribute('data-template', '');
		element.removeAttribute('view-model');
		
		var template = element.outerHTML;
		var marker = document.createComment('Template Content');
		element.parentNode.insertBefore(marker, element);
		element.parentNode.removeChild(element);
		
		function create(model, insert) { // Applies the model to the template and inserts a new copy at "insert"
			var e = html.parse(template)[0];
			e[memberName] = model;
			marker.parentNode.insertBefore(e, insert || marker);
			return { model: model, element: e };
		}

		var templateItems = [];
		var update = function() { // Keeps the view synced with the item(s) watched on the viewmodel
			var value = viewmodel.path(path);
			if (!utils.is(value, Array)) { value = [value]; }
			
			var i = 0; do {
				while (i < templateItems.length && templateItems[i].model !== value[i]) {
					var elem = templateItems.splice(i, 1)[0].element;
					elem.parentNode.removeChild(elem);
				}
				if (i >= templateItems.length && i < value.length) { 
					templateItems.push(create(value[i])); 
				}
			} while (++i < value.length);
		}
		// Sets a watch on the "path" on the view model
		viewmodel.watch(path, update);
		update();
		
		return false;
	});
})();
;

// Blocks other bindings on this element and replaces this element with the view at the specified URI
Application.extend.binding('data-view', ['html', function(html) {
	throw 'view cannot be instantiated';
}], function(view) {
	var html = view.application.resolve('html');
	var element = view.element;
	var url = element.getAttribute('data-view');
	var utils = view.application.resolve('utilities');
		
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if (this.readyState !== 4) { return; }

		if (!html.indom(element)) { return; }
		var marker = document.createComment('view: ' + url);
		element.parentNode.insertBefore(marker, element);
		element.parentNode.removeChild(element);
		var elements = html.parse(this.responseText);
		if (!elements) { return; }
		for (var i = 0; i < elements.length; i++) { marker.parentNode.insertBefore(elements[i], marker); }
	}
	request.open('get', url);
	request.send();
	return false;
});
;

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
	
})();;

// Binds the innerTEXT of this element to the multi-value formatted text specified
// use double-curly-brackets: "My value is {{member.something.value}}"
Application.extend.binding('data-format', ['view', 'viewmodel', 'utilities', 'html', function(view, viewmodel, utilities, html) {
	var format = view.element.getAttribute('data-format') || '';
	var members = format.match(/\{\{[^\}]+\}\}/g);
	if (!members) { return; }
	
	function trim(member) { return member.replace(/^\{\{|\}\}$/g, ''); }
	function callback() {
		var phrase = format;
		for (var i = 0; i < members.length; i++) {
			var member = members[i];
			var value = viewmodel.path(trim(member));
			value = value === utilities.nothing ? '' : value;
			while (phrase.indexOf(member) >= 0) { phrase = phrase.replace(member, value); }
		}
		if (value in view.element) { view.element.value = phrase; }
		else { view.element.innerHTML = html.encode(phrase); }
	}

	for (var m = 0; m < members.length; m++) {
		viewmodel.watch(trim(members[m]), callback);
	}
	callback();
}]);
;

// Binds an input's value to the ViewModel
Application.extend.binding('data-bind', ['view', 'viewmodel', 'utilities', 'html', function(view, viewmodel, utilities, html) {
	var uri = view.element.getAttribute('data-bind') || false;
	if (!uri) { throw 'data-bind must be set to a property / path to watch' }
	
	var parts = uri.split('.');
	var memberName = parts.pop();
	var modelPath = parts.join('.');
	if (!memberName) { return; }
	
	var toModel = false;
	var toView = false;
	
	var events = ['click', 'keyup', 'change'];
	for (var i = 0; i < events.length; i++) { try {
		view.element.addEventListener(events[i], function() {
			if (toView) { return; }
			toModel = true; toView = false;
			
			var model = !modelPath ? viewmodel : viewmodel.path(modelPath);
			model[memberName] = html.getInputValue(view.element);
			toModel = false;
		});
	} catch (error) { } }
	
	function writeView() {
		if (toModel) { return; }
		toView = true; toModel = false;
		
		var value = viewmodel.path(uri);
		html.setInputValue(view.element, value === utilities.nothing ? '' : value);
		toView = false;
	}
	
	viewmodel.watch(uri, writeView);
	writeView();
}]);;

// Binds the innerHTML of this element to the ViewModel
Application.extend.binding('data-html', ['view', 'viewmodel', 'html', 'utilities', function(view, viewmodel, html, utilities) {
	var path = view.element.getAttribute('data-html') || '';

	function update() {
		var value = viewmodel.path(path);
		value = value === utilities.nothing ? '' : value;
		view.element.innerHTML = value;
	}
	viewmodel.watch(path, update);
	update();
}]);
;

// Binds the "SRC" attribute to the ViewModel
Application.extend.binding('data-src', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var path = view.element.getAttribute('data-src');
	var update = function() {
		var value = viewmodel.path(path) || '';
		view.element.setAttribute('src', value);
	};
	viewmodel.watch(path, update);
	update();
}]);;

// Binds the HREF attribute of this element to the ViewModel
Application.extend.binding('data-href', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var path = view.element.getAttribute('data-href');
	var update = function() {
		var value = viewmodel.path(path) || '';
		view.element.setAttribute('href', value);
	};
	viewmodel.watch(path, update);
	update();
}]);;

// Binds this element's "TITLE" attribute to a value on the ViewModel
Application.extend.binding('data-title', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var path = view.element.getAttribute('data-title');
	var update = function() {
		var value = viewmodel.path(path) || '';
		view.element.setAttribute('title', value);
	};
	viewmodel.watch(path, update);
	update();
}]);;

// Binds a "true/false-ish" value and shows/hides this element using an injected style/class
Application.extend.binding('data-show', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	html.setStyle('.data-hide', "{ display: none !important; }");
	
	var path = view.element.getAttribute('data-show');
	var update = function() {
		if (viewmodel.path(path)) { html.removeClass(view.element, 'data-hide'); }
		else { html.addClass(view.element, 'data-hide'); }
	};
	viewmodel.watch(path, update);
	update();
}]);;

// Binds a "true/false-ish" value on the ViewModel and shows/hides this element using an injected class/style
Application.extend.binding('data-hide', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	html.setStyle('.data-hide', "{ display: none !important; }");
	
	var path = view.element.getAttribute('data-hide');
	var update = function() {
		if (!viewmodel.path(path)) { html.removeClass(view.element, 'data-hide'); }
		else { html.addClass(view.element, 'data-hide'); }
	};
	viewmodel.watch(path, update);
	update();
}]);;

// Binds one or more classes on this element to the state of members on the ViewModel (See documentation)
Application.extend.binding('data-class', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var value = view.element.getAttribute('data-class') || '';
	var member = value.indexOf('{') >= 0 ? false : value;
	var config = value.indexOf('{') < 0 ? false : value.replace(/^\{+|\}+$/g, '');

	if (member) {
		var update = function() {
			var cls = viewmodel.path(member) || '';
			html.addClass(view.element, cls);
		};
		viewmodel.watch(member, update);
		update();
	} else if (config) {
		var settings = config.split(',');
		for (var i = 0; i < settings.length; i++) { 
			var parts = settings[i].split(':');
			settings[i] = {
				class: parts[0].trim(),
				path: parts[1].trim()
			};
			settings[i].update = (function(setting) { return function() {
				var value = viewmodel.path(setting.path);
				if (value) { html.addClass(view.element, setting.class); }
				else { html.removeClass(view.element, setting.class); }
			};})(settings[i]);
			viewmodel.watch(settings[i].path, settings[i].update);
			settings[i].update();
		}
	}
}]);;

// Traps the "submit" event on a form and calls a command on the ViewModel
Application.extend.binding('data-submit', ['view', 'viewmodel', 'utilities', function(view, viewmodel, utilities) {
	var path = view.element.getAttribute('data-submit');
	view.element.addEventListener('submit', function(e) {
		e.preventDefault();
		var method = viewmodel.path(path);
		if (!utilities.is(method, 'function')) { return; }
		method.apply(viewmodel, arguments);
		return false;
	});
}]);;

// Binds this element's click event to a command handler on the ViewModel
Application.extend.binding('data-click', ['view', 'viewmodel', 'utilities', function(view, viewmodel, utilities) {
	var path = view.element.getAttribute('data-click');
	view.element.addEventListener('click', function() {
		var method = viewmodel.path(path);
		if (!utilities.is(method, 'function')) { return; }
		method.apply(viewmodel, arguments);
	});
}]);;

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
			{name: 'View Models', uri: '#viewmodels', view: 'views/view-models.html'},
			{name: 'Observables', uri: '#observables', view: 'views/observables.html'}
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
;

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
