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
})();