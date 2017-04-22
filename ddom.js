/**
 * DDom.js - Documented document object model
 * The DOM library that whines
 *
 * Support:
 *		Chrome 36
 *		Edge 12
 *		Firefox (Gecko) 6
 *		Internet Explorer 11
 *		Opera 23
 *		Safari 7.1
 */

/*global HTMLCollection,Node,CustomEvent,NodeList */
//noinspection JSUnusedGlobalSymbols

/**
 * @typedef {{
 *		target: DDom,
 *		delegateTarget: DDom,
 *		currentTarget: DDom
 * }} DDomEventElements
 */

/**
 * @typedef {{
 * }|Event} DDomEvent
 */

/**
 * DDom HTML helper
 */
(function(window) {
	var eventCache = new window.WeakMap();

	// Fix Element.prototype.matches to older browsers
	(function(ElementPrototype) {
		//noinspection JSUnresolvedVariable
		/**
		 * Matches selector
		 * @function
		 */
		ElementPrototype.matches =
			ElementPrototype.matches ||
			ElementPrototype.matchesSelector ||
			ElementPrototype.mozMatchesSelector ||
			ElementPrototype.msMatchesSelector ||
			ElementPrototype.oMatchesSelector ||
			ElementPrototype.webkitMatchesSelector;
	}(window.Element.prototype));

	/**
	 * DDom constructor
	 * @constructor
	 * @param {(string|Element|HTMLElement|Node|NodeList|HTMLCollection|DDom|DocumentFragment|Window)} [element]
	 * @param {Object} [options]
	 * @returns {DDom}
	 */
 	var DDom = function(element, options) {
		var x, l;

		if (element !== undefined && element !== null && element !== "") {
			if (typeof element === "string") {
				this.length++;
				this[0] = this.ce(element, options);

			} else if (element.nodeType) {
				this.length++;
				this[0] = element;

			} else if (element instanceof DDom) {
				return element;
			}

			if (element instanceof HTMLCollection || element instanceof NodeList) {
				this.length = l = element.length;
				for (x = 0; x < l; x += 1) {
					this[x] = element[x];
				}
			} else if (element === window) {
				this.length++;
				this[0] = element;
			}
		}

		return this;
	};

	//noinspection JSUnusedGlobalSymbols
	/**
	 * DDom prototype
	 */
	DDom.prototype = /**@lends {DDom.prototype}*/{
		version: 0.2,
		DDom: true,
		length: 0,
		slice: Array.prototype.slice,
		splice: Array.prototype.splice,

		/**
		 * Write error
		 * @param {string} message
		 */
		consoleError: function(message) {
			console.error(`DDom: ${message}`);
		},

		/**
		 * Push new elements to this object
		 * @param {HTMLElement|NodeList|HTMLCollection|Node|DDom} elements
		 */
		push: function(elements) {
			var x;

			if (elements.DDom) {
				elements = elements.getAll();
			}

			if (Array.isArray(elements) || elements instanceof HTMLCollection) {
				for(x = 0; x < elements.length; x++) {
					this[this.length++] = elements[x];
				}

			} else {
				this[this.length++] = elements;
			}
		},

		/**
		 * Get Node of this object
		 * @param {number} [index]
		 * @returns {HTMLElement|HTMLInputElement|DocumentFragment|HTMLFormElement|undefined}
		 */
		get: function(index) {
			return this[index || 0];
		},

		/**
		 * Get new DDom object of given index element
		 * -1 takes last element of set
		 * @param {number} [index]
		 * @returns {DDom}
		 */
		eq: function(index) {
			return (index === -1) ? new DDom(this[this.length - 1]) : new DDom(this[index || 0]);
		},

		/**
		 * Get all current elements as document fragment
		 * @returns {DocumentFragment}
		 */
		getFragment: function() {
			var frag = document.createDocumentFragment();

			this.slice(0).forEach(function(element) {
				frag.appendChild(element);
			});

			return frag;
		},

		/**
		 * Get all nodes of this object
		 * Return value is really just and array but is masked to NodeList for better doc handling and has all
		 * the methods that exists in arrays too
		 * @returns {NodeList}
		 */
		getAll: function() {
			return this.slice(0);
		},

		/**
		 * Get CSS style value
		 * @param {string} key
		 * @return {string|boolean}
		 */
		getCSS: function(key) {
			return (this.length !== 0) ? this[0].style[key] : false;
		},

		/**
		 * Click event binding to element
		 * @param {string} type
		 * @param {Function} callback
		 * @param {boolean} [useCapture]
		 * @return {DDom}
		 */
		eventBind: function(type, callback, useCapture) {
			var items = this.slice(0),
				x, element, handle;

			var eventHandler = function (type, callback, event) {
				try {
					if (callback.call(this, event, new DDom(event.target)) === false) {
						event.preventDefault();
						event.stopPropagation();
					}
				} catch(/*Error*/e) {
					type = (event instanceof CustomEvent) ? type + ' / ' + event.detail[0] : type;

					DDom.prototype.consoleError(`eventBind [${type}] - ${e.name}:${e.message} [Function: ${callback.toString()}]`);

					event.preventDefault();
					event.stopPropagation();
				}
			};

			for (x = 0; x < items.length; x++) {
				element = items[x];

				handle = {
					event: type,
					capture: !!useCapture,
					callback: callback,
					f: eventHandler.bind(element, type, callback)
				};

				this.eventBindCache(element, handle);
			}

			return this;
		},

		/**
		 * Click event binding to element
		 * @param {Function} callback
		 * @param {boolean} [useCapture]
		 * @return {DDom}
		 */
		eventClick: function(callback, useCapture) {
			var items = this.slice(0),
				x, element, handle;

			var eventHandler = function(callback, event) {
				try {
					if (callback.call(this, event, new DDom(event.target)) === false) {
						event.preventDefault();
						event.stopPropagation();
					}
				} catch(/*Error*/e) {
					DDom.prototype.consoleError(`eventClick - [${e.name}: ${e.message}] [Function: ${callback.toString()}]`);
					event.preventDefault();
					event.stopPropagation();
				}
			};

			for (x = 0; x < items.length; x++) {
				element = items[x];

				handle = {
					event: 'click',
					capture: !!useCapture,
					callback: callback,
					f: eventHandler.bind(element, callback)
				};

				this.eventBindCache(element, handle);
			}

			return this;
		},

		/**
		 * Trigger given event with callback once and then destroy listener
		 * @param {string} type
		 * @param {Function} callback
		 * @param {boolean} [useCapture]
		 * @return {DDom}
		 */
		eventOnce: function(type, callback, useCapture) {
			var items = this.slice(0),
				x, element, handle;

			var eventHandler = function (callback, event) {
				try {
					if (callback.call(this, event, new DDom(event.target)) === false) {
						event.preventDefault();
						event.stopPropagation();
					}
				} catch(/*Error*/e) {
					DDom.prototype.consoleError(`eventOnce - [${e.name}: ${e.message}] [Function: ${callback.toString()}]`);
					event.preventDefault();
					event.stopPropagation();
				}

				this.removeEventListener(type, handle.f);
			};

			for (x = 0; x < items.length; x++) {
				element = items[x];

				handle = {
					event: type,
					capture: !!useCapture,
					callback: callback,
					f: eventHandler.bind(element, callback)
				};

				this.eventBindCache(element, handle);
			}

			return this;
		},

		/**
		 * Bind event listener
		 * @param {(string|Array)} events
		 * @param {(string|Array|Function)} data
		 * @param {Function} [callback]
		 * @param {boolean} [useCapture]
		 * @return {DDom}
		 */
		on: function(events, data, callback, useCapture) {
			var elements = [],
				hasElements = false,
				x;

			if (this.length === 0) {
				this.consoleError(`Event::on - No elements to bind data ${this.on.caller.toString()}`);
				return null;
			}

			if (this.length > 1) {
				this.consoleError(`Event::on - Multiple elements to bind data ${this.on.caller.toString()}`);
				return null;
			}

			if (typeof data === "function") {
				callback = data;

			} else {
				hasElements = true;
			}

			if (typeof callback !== "function") {
				this.consoleError(`Event::on - did not get valid callback function ${this.on.caller.toString()}`);
				return null;
			}

			events = events.split(" ");
			for (x = 0; x < events.length; x++) {
				var handle = {
					event: events[x],
					// If focus or blur event then useCapture set true - firefox does not work otherwise
					capture: (events[x] === 'blur' || events[x] === 'focus' || !!useCapture),
					callback: callback,
					f: this.onEventHandler.bind(this, this[0], hasElements, data, callback)
				};

				this.eventBindCache(this[0], handle);
			}

			return this;
		},

		/**
		 * Handle on bind events
		 * @private
		 * @param {DDom|HTMLElement} delegateTarget
		 * @param {boolean} hasElements
		 * @param {string} data
		 * @param {Function} callback
		 * @param {Event} event
		 */
		onEventHandler: function(delegateTarget, hasElements, data, callback, event) {
			/**
			 * @type {HTMLElement}
			 */
			var clicked = /**@type {HTMLElement}*/(event.target);

			var elements = {};

			if (hasElements) {
				// Check that matches function is found from element and do matching - document does not have
				if (clicked.matches && clicked.matches(data)) {
					elements.target = new DDom(event.target);
					elements.delegateTarget = new DDom(delegateTarget);
					elements.currentTarget = elements.target;

					try {
						if (callback.call(clicked, event, elements) === false) {
							event.preventDefault();
							event.stopPropagation();
						}
					} catch(/*Error*/e1) {
						//noinspection JSUnresolvedFunction
						this.consoleError(`on[1] - [${e1.name}: ${e1.message}] [Element: ${data}] [Function: ${callback.toString()}]`);
						event.preventDefault();
						event.stopPropagation();
					}
				} else {
					elements.target = new DDom(clicked);
					elements.currentTarget = elements.target.closest(data, delegateTarget);

					if (elements.currentTarget.hasElements()) {
						elements.delegateTarget = new DDom(delegateTarget);
						try {
							if (callback.call(event.target, event, elements) === false) {
								event.preventDefault();
								event.stopPropagation();
							}
						} catch(/*Error*/e2) {
							//noinspection JSUnresolvedFunction
							this.consoleError(`on[2] - [${e2.name}: ${e2.message}] [Element: ${data}] [Function: ${callback.toString()}]`);
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}

			} else {
				elements.target = new DDom(event.target);
				elements.delegateTarget = new DDom(delegateTarget);
				elements.currentTarget = elements.target;

				try {
					if (callback.call(event.target, event, elements) === false) {
						event.preventDefault();
						event.stopPropagation();
					}
				} catch(/*Error*/e3) {
					//noinspection JSUnresolvedFunction
					this.consoleError(`on[3] - [${e3.name}: ${e3.message}] [Element: ${data}] [Function: ${callback.toString()}]`);
					event.preventDefault();
					event.stopPropagation();
				}
			}
		},

		/**
		 * Handle event binding and setting to cache for removal of events
		 * @private
		 * @param {HTMLElement} element
		 * @param {{
		 *		event: string,
		 *		f: Function,
		 *		capture: boolean
		 * }} handle
		 */
		eventBindCache: function(element, handle) {
			element.addEventListener(handle.event, handle.f, handle.capture);

			if (eventCache.has(element)) {
				eventCache.get(element).push(handle);
			} else {
				eventCache.set(element, [handle]);
			}
		},

		/**
		 * Remove event listeners from elements that has been bind with on
		 * @param {string|undefined} [eventType]
		 * @param {Function} [func]
		 * @return {DDom}
		 */
		off: function(eventType, func) {
			this.slice(0).forEach(function(element) {
				var handles, x, keep = [];

				if (eventCache.has(element)) {
					handles = eventCache.get(element);

					for (x = 0; x < handles.length; x++) {
						if ((eventType === undefined || eventType === handles[x].event) &&
								(func === undefined || func === handles[x].callback)) {
							element.removeEventListener(handles[x].event, handles[x].f, handles[x].capture);
						} else {
							keep.push(handles[x]);
						}
					}

					// If only given eventType was removed, then check if there is still events bind and keep those
					if (keep.length > 0) {
						eventCache.set(element, keep);
					} else {
						eventCache.delete(element);
					}
				}
			});

			return this;
		},

		/**
		 * Trigger given event on all elements
		 * @param {string} event
		 * @param {Array} args
		 */
		trigger: function(event, args) {
			var eventObject;

			if (typeof CustomEvent === "function") {
				eventObject = new CustomEvent(event, /** @type CustomEventInit*/({bubbles: true, cancellable: true, detail: args}));

			} else {
				eventObject = document.createEvent("CustomEvent");
				eventObject.initCustomEvent(event, true, true, args);
			}

			eventObject.eventName = event;

			this.slice(0).forEach(function(element) {
				element.dispatchEvent(eventObject);
			});
		},

		/**
		 * Destroys current node and creates new clone that is free from events and content
		 * @return {DDom}
		 */
		clear: function() {
			var clone;

			this.slice(0).forEach(function(element, offset) {
				var parent = element.parentNode;

				// If node has been removed from the tree then there is no parentNode
				if (parent !== null) {
					clone = element.cloneNode(false);
					parent.replaceChild(clone, element);

					this[offset] = clone;
				}
			}.bind(this));

			return this;
		},

		/**
		 * Clones current elements and returns
		 * @param {boolean} [deep=false]
		 * @return {DDom}
		 */
		clone: function(deep) {
			var clone = new DDom();

			this.slice(0).forEach(function(element) {
				clone.push(element.cloneNode(!!deep));
			}.bind(this));

			return clone;
		},

		/**
		 * Clears current element content
		 * @return {DDom}
		 */
		empty: function() {
			this.slice(0).forEach(function(element) {
				element.innerHTML = "";
			}.bind(this));

			return this;
		},

		/**
		 * Remove focus from element
		 * @return {DDom}
		 */
		blur: function() {
			if (this[0] && this[0].nodeType === 1) {
				this[0].blur();
			}

			return this;
		},

		/**
		 * Add HTML node after given element
		 * @param {(DDom|HTMLElement|Node)} node
		 * @return {DDom}
		 */
		after: function(node) {
			if (node.DDom) {
				// If there is nothing to append - bail out
				if (node.length === 0) {
					return this;
				}

				node = (node.length > 1) ? node.getFragment() : node[0];
			}

			this.slice(0).forEach(function(element) {
				element.parentNode.insertBefore(node, element.nextSibling);
			});

			return this;
		},

		/**
		 * Add HTML node before given element
		 * @param {DDom|HTMLElement|Node} node
		 * @return {DDom}
		 */
		before: function(node) {
			if (node.DDom) {
				// If there is nothing to append - bail out
				if (node.length === 0) {
					return this;
				}

				node = (node.length > 1) ? node.getFragment() : node[0];
			}

			this.slice(0).forEach(function(element) {
				element.parentNode.insertBefore(node, element);
			});

			return this;
		},

		/**
		 * Append child to node
		 * @param {Node|DDom|string|number} node
		 * @return {DDom}
		 */
		append: function(node) {
			if (typeof node === "string" || typeof node === "number") {
				return this.addText(node);
			}

			if (node.DDom) {
				// If there is nothing to node - bail out
				if (node.length === 0) {
					return this;
				}

				node = (node.length > 1) ? node.getFragment() : node[0];
			}

			this.slice(0).forEach(function(element) {
				element.appendChild(node);
			});

			return this;
		},

		/**
		 * Prepend data before element
		 * @param {DDom|string} prepend
		 * @returns {DDom}
		 */
		prepend: function(prepend) {
			var data = (prepend.DDom) ? prepend.get() : document.createTextNode(prepend);

			this.slice(0).forEach(function(element) {
				element.insertBefore(data, element.firstChild);
			});

			return this;
		},

		/**
		 * Replace current element with given data
		 * @param {Node|DDom} newNode
		 * @return {DDom}
		 */
		replace: function(newNode) {
			var replace;

			newNode = (newNode instanceof Node) ? newNode : newNode[0];

			if (this.length > 0) {
				replace = this[0].parentNode;

				if (replace !== null) {
					replace.replaceChild(newNode, this[0]);
				}
			}

			return this;
		},

		/**
		 * Replace all elements with given element - this does not copy any event listeners already bind
		 * @param {Node|DDom} newNode
		 * @return {DDom}
		 */
		replaceAll: function(newNode) {
			newNode = (newNode instanceof Node) ? newNode : newNode[0];

			this.slice(0).forEach(function(replace) {
				var parent = replace.parentNode;
				if (parent !== null) {
					parent.replaceChild(newNode.cloneNode(true), replace);
				}
			});

			return this;
		},

		/**
		 * document.createElement
		 * @param {string} element
		 * @param {{
		 *		event: {
		 *			action: Function,
		 *			type: string
		 *		}
		 * }} [parameters]
		 * @returns {HTMLElement}
		 */
		ce: function(element, parameters) {
			var ret = document.createElement(element);

			parameters = parameters || {};

			Object.keys(parameters).forEach(function(key) {
				if (key === "event") {
					if (Array.isArray(parameters[key])) {
						parameters[key].forEach(function(/*{type:string, action:Function}*/data) {
							ret.addEventListener(data.type, /**string*/data.action);
						});
					} else {
						ret.addEventListener(parameters[key].type, parameters[key].action);
					}
				} else {
					ret.setAttribute(key, parameters[key]);
				}
			});

			return ret;
		},

		/**
		 * Search closest Node that matches given selector
		 * @param {string} tag
		 * @param {Element} [until]
		 * @returns {DDom}
		 */
		closest: function(tag, until) {
			/**
			 * @type {Element|Node}
			 */
			var element;

			if (this[0]) {
				element = this[0];

				do {
					if (element.nodeType === 1 && element.matches(tag)) {
						return new DDom(element);
					}

					// If until is element check that we don't go further than that
					if (until !== undefined && until === element) {
						break;
					}

					element = element.parentNode;

				} while (element !== null);
			}

			return new DDom();
		},

		/**
		 * Search closest tag from current element
		 * @param {string} className
		 * @returns {DDom}
		 */
		closestClass: function(className) {
			/**
			 * @type {Node|Element}
			 */
			var element;

			if (this[0]) {
				element = this[0];

				do {
					if (element.classList) {
						if (element.classList.contains(className)) {
							return new DDom(element);
						}

					} else {
						if ((" " + element.className + " ").replace(/[\n\t\r]/g, " ").indexOf(" " + className + " ") > -1) {
							return new DDom(element);
						}
					}

					element = element.parentNode;

				} while (element !== null);
			}

			return new DDom();
		},

		/**
		 * QuerySelector search
		 * @param {string} search
		 * @param {(HTMLElement|HTMLDocument)} [secondElement]
		 * @returns {DDom}
		 */
		qs: function(search, secondElement) {
			if ((this[0] !== undefined || secondElement !== undefined) && search !== "") {
				return new DDom((this[0] || secondElement).querySelector(search));
			}

			return new DDom();
		},

		/**
		 * QuerySelector search
		 * @param {string} search
		 * @param {(HTMLElement|HTMLDocument)} [secondElement]
		 * @return {DDom}
		 */
		qsAll: function(search, secondElement) {
			if ((this[0] !== undefined || secondElement !== undefined) && search !== "") {
				return new DDom((this[0] || secondElement).querySelectorAll(search));
			}

			return new DDom();
		},

		/**
		 * Search if given node exists in current object node
		 * @param {DDom|HTMLElement|HTMLDocument} search
		 * @returns {boolean}
		 */
		contains: function(search) {
			// IE fix where document does not have contains function so go to document.body
			var node = (this[0] === document) ? document.body : this[0];

			search = (search.DDom) ? search.get() : search;

			if (node && node.nodeType === 1) {
				// Because IE does not have contains in document we have to always handle document.body because
				// document.contains(document) would give true so after change from document to document.body
				// in source node, we have to do same thing for the searched element also
				return node.contains((search === document) ? document.body : search);
			}

			return false;
		},

		/**
		 * Set focus to element
		 * @return {DDom}
		 */
		focus: function() {
			if (this[0] && this[0].nodeType === 1) {
				this[0].focus();
			}

			return this;
		},

		/**
		 * Iterate through all elements
		 * @param {Function} callback
		 * @return {DDom}
		 */
		forEach: function(callback) {
			this.slice(0).forEach(function(element, index) {
				callback.call(element, element, index);
			});

			return this;
		},

		/**
		 * Map through elements in array like ES5 Array function map
		 * @param {Function} callback
		 * @return {Array}
		 */
		map: function(callback) {
			var ret = [];

			this.slice(0).forEach(function(element) {
				ret.push(callback.call(element, element));
			});

			return ret;
		},

		/**
		 * set css
		 * @param {Object} attributes
		 * @return {DDom}
		 */
		css: function(attributes) {
			this.slice(0).forEach(function(element) {
				if (element.nodeType === 1) {
					Object.keys(attributes).forEach(function(key) {
						element.style[key] = attributes[key];
					});
				}
			});

			return this;
		},

		/**
		 * Get this nodes parent node
		 * @returns {DDom}
		 */
		parent: function(steps) {
			var element;

			steps = steps || 1;

			if (this.length !== 0) {
				steps--;
				element = this[0].parentNode;

				while (steps > 0) {
					element = element.parentNode;
					steps--;
				}
			}

			return new DDom(element);
		},

		/**
		 * Matches selector
		 * @param {string} attribute
		 * @returns {boolean}
		 */
		matches: function(attribute) {
			return !!(this[0] && this[0].nodeType === 1 && this[0].matches(attribute));
		},

		/**
		 * Matches selector
		 * @param {string} attribute
		 * @returns {DDom}
		 */
		matchesAll: function(attribute) {
			var matching = new DDom();

			this.slice(0).forEach(function(element) {
				if (element.nodeType === 1 && element.matches(attribute)) {
					matching.push(element);
				}
			});

			return matching;
		},

		/**
		 * Next element sibling
		 * @returns {DDom}
		 */
		next: function() {
			var element;

			if (this[0] && this[0].nodeType === 1) {
				element = this[0].nextElementSibling;
				if (element !== null) {
					return new DDom(element);
				}
			}

			return new DDom();
		},

		/**
		 * Get last element child
		 * @returns {DDom}
		 */
		last: function() {
			var element;

			if (this[0] && this[0].nodeType === 1) {
				element = this[0].lastElementChild;
				if (element !== null) {
					return new DDom(element);
				}
			}

			return new DDom();
		},

		/**
		 * Previous element sibling
		 * @returns {DDom}
		 */
		prev: function() {
			var element;

			if (this[0] && this[0].nodeType === 1) {
				element = this[0].previousElementSibling;
				if (element !== null) {
					return new DDom(element);
				}
			}

			return new DDom();
		},

		/**
		 * Return text node with given text
		 * @param {string} text
		 * @returns {Text}
		 */
		text: function(text) {
			return document.createTextNode(text);
		},

		/**
		 * Put cursor at end of all input and textarea fields
		 * @returns {DDom}
		 */
		putCursorAtEnd: function() {
			var element = this[0] || {};

			if (element.nodeType === 1) {
				var value = this.getVal(),
					length = value.length;

				// Check if required element has already focus - if yes then don't refocus because it might break stuff like suggestSearch
				if (document.activeElement !== this) {
					this.focus();
				}

				if (length !== 0) {
					// If this function exists...
					if (element.setSelectionRange) {
						// Double the length because Opera is inconsistent about whether a carriage return is one character or two. Sigh.
						element.setSelectionRange(length, length);
					} else {
						this.eq(0).setVal(this.getVal());
					}

					// Scroll to the bottom, in case we're in a tall textarea
					// (Necessary for Firefox and Google Chrome)
					this.scrollTop = 999999;
				}
			}

			return this;
		},

		/**
		 * Return text node with given text
		 * @param {string|number} text
		 * @returns {DDom}
		 */
		addText: function(text) {
			this.slice(0).forEach(function(element) {
				element.appendChild(document.createTextNode(text));
			});

			return this;
		},

		/**
		 * Add class to element
		 * @param {string} addClass
		 * @return {DDom}
		 */
		addClass: function(addClass) {
			if (addClass !== "") {
				this.slice(0).forEach(function(element) {
					var elClass;

					// Check that handled element is Element
					if (element.nodeType === 1) {
						// Modern browsers have Element.classList
						if (element.classList) {
							element.classList.add(addClass);

						} else {
							elClass = element.getAttribute("class");

							if (elClass === null || elClass.split(' ').indexOf(addClass) === -1) {
								element.setAttribute("class", elClass + " " + addClass);
							}
						}
					}
				});
			}

			return this;
		},

		/**
		 * Add custom event trigger type
		 * @param {string} type
		 * @param {string} name
		 * @return {DDom}
		 */
		addCustomEvent: function(type, name) {
			this.slice(0).forEach(function(element) {
				element.setAttribute('class', element.getAttribute('class') + ' data-custom');
				element.setAttribute('data-custom', JSON.stringify({type: type, name: name}));
			});

			return this;
		},

		/**
		 * Toggle class name
		 * @param className
		 * @return {DDom}
		 */
		toggleClass: function(className) {
			var elementClass;

			this.slice(0).forEach(function(element) {

				// Check that handled element is Element
				if (element.nodeType === 1) {
					// Modern browsers have Element.classList
					if (element.classList && element.classList.toggle) {
						element.classList.toggle(className);

					} else {
						elementClass = element.getAttribute("class");

						elementClass = (elementClass.indexOf(className) === -1) ? elementClass + " " + className :
							elementClass.replace(className, '').replace(/ +/g, " ");

						element.setAttribute('class', elementClass);
					}
				}
			});

			return this;
		},

		/**
		 * Convenience function to toggle display-none class
		 * @returns {DDom}
		 */
		toggle: function() {
			this.toggleClass('display-none');

			return this;
		},

		/**
		 * Convenience function to remove display-none class
		 * @returns {DDom}
		 */
		hide: function() {
			this.addClass('display-none');

			return this;
		},

		/**
		 * Set innerHTML data or get if data is not set
		 * @param {undefined|string|DDom|DocumentFragment} [data]
		 * @return {DDom|string}
		 */
		html: function(data) {
			if (data === undefined) {
				return (this.length !== 0) ? this[0].innerHTML : "";
			}

			if (typeof data === "string" || typeof data === "number") {
				this.slice(0).forEach(function(element) {
					element.innerHTML = data;
				});

			} else {
				data = (data instanceof DDom) ? data.getFragment() : data;

				this.slice(0).forEach(function(element) {
					element.innerHTML = "";
					element.appendChild(data);
				});
			}

			return this;
		},

		/**
		 * Remove node
		 * @returns {DDom}
		 */
		remove: function() {
			this.slice(0).forEach(function(element) {
				if (element.parentNode !== null) {
					element.parentNode.removeChild(element);
				}
			});

			this.length = 0;

			return this;
		},

		/**
		 * Remove attribute from Element nodeType 1
		 * @param {String} attrName
		 * @returns {DDom}
		 */
		removeAttr: function(attrName) {
			this.slice(0).forEach(function(element) {
				if (element.nodeType === 1) {
					element.removeAttribute(attrName);
				}
			});

			return this;
		},

		/**
		 * Remove Class from element
		 * @param {string} removeClass
		 * @returns {DDom}
		 */
		removeClass: function(removeClass) {
			var regEx;

			this.slice(0).forEach(function(element) {
				// Check that handled element is Element
				if (element.nodeType === 1) {
					// Modern browsers have Element.classList
					if (element.classList) {
						element.classList.remove(removeClass);

					} else {
						regEx = new RegExp(removeClass, 'ig');
						element.setAttribute("class", (element.getAttribute("class") || "").replace(regEx, '').replace(/ {2}/g, ' '));
					}
				}
			});

			return this;
		},

		/**
		 * Set element attribute for element
		 * @param {string} name
		 * @param {string|boolean|number} value
		 */
		setAttr: function(name, value) {
			this.slice(0).forEach(function(element) {
				if (element.nodeType === 1) {
					element.setAttribute(name, value);
				}
			});

			return this;
		},

		/**
		 * set css
		 * @param {string} key
		 * @param {string} value
		 * @return {DDom}
		 */
		setCSS: function(key, value) {
			this.slice(0).forEach(function(element) {
				if (element.nodeType === 1) {
					element.style[key] = value;
				}
			});

			return this;
		},

		/**
		 * Replace nodes content with given data in textNode
		 * @param {string|number} text
		 * @returns {DDom}
		 */
		setText: function(text) {
			this.slice(0).forEach(function(element) {
				element.innerHTML = "";
				element.appendChild(document.createTextNode(text));
			});

			return this;
		},

		/**
		 * Set element value attribute
		 * @param {string} value
		 * @returns {DDom}
		 */
		setVal: function(value) {
			this.slice(0).forEach(function(element) {
				element.value = value;
			});

			return this;
		},

		/**
		 * Convenience function to remove display-none class
		 * @returns {DDom}
		 */
		show: function() {
			this.removeClass('display-none');

			return this;
		},

		/**
		 * Get element attribute
		 * @param {string} attr
		 * @returns {string|null}
		 */
		getAttr: function(attr) {
			return (this.length !== 0) ? this[0].getAttribute(attr) : null;
		},

		/**
		 * Get all children of first element
		 * @returns {DDom}
		 */
		getChildren: function() {
			return (this[0] && this[0].nodeType === 1) ? new DDom(this[0].children) : new DDom();
		},

		/**
		 * Get all children of first element
		 * @param {string} name
		 * @returns {string|null}
		 */
		getDataset: function(name) {
			return (this[0]) ? this[0].dataset[name] : null;
		},

		/**
		 * Get element by id
		 * @param {string} id
		 * @returns {DDom}
		 */
		getId: function (id) {
			return new DDom(document.getElementById(id));
		},

		/**
		 * Get elements by class name
		 * @param {string} cName
		 * @param {(HTMLElement|HTMLDocument)} [secondElement]
		 * @returns {DDom}
		 */
		getClass: function(cName, secondElement) {
			var element = this[0] || secondElement;

			if (element !== undefined) {
				return new DDom(element.getElementsByClassName(cName));
			}

			return new DDom();
		},

		/**
		 * Get elements by tag name
		 * @param {string} tagName
		 * @param {(HTMLElement|HTMLDocument)} [secondElement]
		 * @returns {DDom}
		 */
		getTag: function(tagName, secondElement) {
			var element = this[0] || secondElement;

			if (element !== undefined) {
				return new DDom(element.getElementsByTagName(tagName));
			}

			return new DDom();
		},

		/**
		 * Get elements value attribute
		 * @returns {string}
		 */
		getVal: function() {
			return (this[0] !== undefined) ? this[0].value : "";
		},

		/**
		 * Get outer HTML
		 * @returns {string}
		 */
		getOuterHtml: function() {
			return (this[0] !== undefined) ? this[0].outerHTML : "";
		},

		/**
		 * Get element position to relative parent or with parameter to viewPort
		 * @param {boolean} [viewPort]
		 * @returns {{top: number, left: number}}
		 */
		getPosition: function(viewPort) {
		    var top = 0, left = 0,
				element = this[0];

			if (!!viewPort) {
				while (element) {
				   if (element.tagName) {
					   top = top + element.offsetTop - element.scrollTop;
					   left = left + element.offsetLeft;
					   element = element.offsetParent;
				   } else {
					   element = element.parentNode;
				   }
				}

				return {"top": top, "left": left};
			}

			return {"top": element.offsetTop, "left": element.offsetLeft};
		},

		/**
		 * Has attribute
		 * @param attribute
		 * @returns {boolean}
		 */
		hasAttr: function(attribute) {
			return !!(this[0] && this[0].nodeType === 1 && this[0].hasAttribute(attribute));
		},

		/**
		 * Check if element has children
		 * @returns {boolean}
		 */
		hasChildren: function() {
			return !!(this[0] && this[0].nodeType === 1 && this[0].childElementCount > 0);
		},

		/**
		 * Check if any of the elements has given class name
		 * @param className
		 * @returns {boolean}
		 */
		hasClass: function(className) {
			var element = this[0];

			if (element && element.nodeType === 1) {
				if (element.classList) {
					return element.classList.contains(className);
				}

				return ((" " + this[0].className + " ").replace(/[\n\t\r]/g, " ").indexOf(" " + className + " ") > -1);
			}

			return false;
		},

		/**
		 * Does this object has any elements
		 * @returns {boolean}
		 */
		hasElements: function() {
			return (this.length > 0);
		},

		/**
		 * How many elements this object has
		 * @returns {number}
		 */
		countElements: function() {
			return this.length;
		},

		/**
		 * Get element offsetWidth
		 * @param {boolean} [margin]
		 * @returns {number}
		 */
		getWidth: function(margin) {
			if (this.length === 0) {
				return 0;
			}

			var style,
				calc = this[0].offsetWidth || this[0].outerWidth || 0;

			if (!!margin) {
				style = window.getComputedStyle(this[0], null);
				calc += parseInt(style.marginLeft, 10) +
						parseInt(style.marginRight, 10);
			}

			return calc;
		},

		/**
		 * Set DataSet for element
		 * @param {string} name
		 * @param {string} data
		 * @returns {DDom}
		 */
		setDataset: function(name, data) {
			this.slice(0).forEach(function(element) {
				if (element.nodeType === 1) {
					element.dataset[name] = data;
				}
			});

			return this;
		},

		/**
		 * Set element css width
		 * @param {string} width
		 * @return {DDom}
		 */
		setWidth: function(width) {
			this.slice(0).forEach(function(element) {
				element.style.width = width;
			});

			return this;
		},

		/**
		 * Get element offsetHeight
		 * @param {boolean} [margin]
		 * @returns {number}
		 */
		getHeight: function(margin) {
			if (this.length === 0) {
				return 0;
			}

			var style,
				calc = this[0].offsetHeight || this[0].outerHeight || 0;

			if (!!margin) {
				style = window.getComputedStyle(this[0], null);
				calc += parseInt(style.marginTop, 10) +
						parseInt(style.marginBottom, 10);
			}

			return calc;
		},

		/**
		 * Get element offsetHeight
		 * @param {string} height
		 * @return {DDom}
		 */
		setHeight: function(height) {
			this.slice(0).forEach(function(element) {
				element.style.height = height;
			});

			return this;
		}
	};

	/**
	 * Convenience function to create DDom object that has documentFragment pre set
	 * @returns {DDom}
	 */
	window.$DDomFragment = function() {
		return new DDom(document.createDocumentFragment());
	};

	/**
	 * @name DDom
	 * @global
	 * @function
	 * @returns {DDom}
	 */
	window.DDom = DDom;

	/**
	 * Get new DDom instance
	 * @name $DDom
	 * @param {string|HTMLElement|Node|NodeList|HTMLCollection|DDom|DocumentFragment} [selector]
	 * @param {Object} [options]
	 * @returns {DDom}
	 */
	window.$DDom = function(selector, options) {
		return new DDom(selector, options);
	};

	/**
	 * @function
	 * @memberOf $DDom.qs
	 * @returns {DDom}
	 */
	$DDom.qs = function(search) {
		return DDom.prototype.qs(search, document);
	};

	/**
	 * @function
	 * @memberOf $DDom.qsAll
	 * @returns {DDom}
	 */
	$DDom.qsAll = function(search) {
		return DDom.prototype.qsAll(search, document);
	};

	/**
	 * @function
	 * @memberOf $DDom.getId
	 * @returns {DDom}
	 */
	$DDom.getId = function(search) {
		return DDom.prototype.getId(search);
	};

	/**
	 * @function
	 * @memberOf $DDom.getTag
	 * @returns {DDom}
	 */
	$DDom.getTag = function(search) {
		return DDom.prototype.getTag(search, document);
	};

	/**
	 * @function
	 * @memberOf $DDom.getClass
	 * @returns {DDom}
	 */
	$DDom.getClass = function(search) {
		return DDom.prototype.getClass(search, document);
	};
}(window));

