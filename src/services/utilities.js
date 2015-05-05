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
