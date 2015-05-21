/**
 * DDom.js - Documented document object model
 * The DOM library that whines
 */

/*global HTMLCollection,Node,CustomEvent,NodeList */

/**
 * @typedef {{
 *		target: DDom,
 *		delegateTarget: DDom,
 *		currentTarget: DDom
 * }}
 */
var DDomEventElements;

/**
 * @typedef {{
 *		eventRemove: Function,
 * }|Event}
 */
var DDomEvent;

/**
 * DDom HTML helper
 */
(function(window) {
	var eventCache = null;

 	// WeakMap hack - this should be used only for keys that are dom elements
	// if dom element is removed from page that reference is removed from here
	// With real weak maps we get nice performance and no leaks so good to start using already - at this point
	// FF and IE11 has WeakMaps and next version of Chrome 36 will have those also
	/*global WeakMap*/
	if (typeof WeakMap !== "function") {
		/**
		 * WeakMap hack
		 * @constructor
		 */
		var DDomWeakMap = function() {
			var cache = {},
				id = 0;

			/**
			 * Get data bind to key
			 * @param {HTMLElement} element
			 * @returns {*}
			 */
			this.get = function(element) {
				var data = false;

				Object.keys(cache).some(function(key) {
					if (cache[key] && cache[key].element === element) {
						data = cache[key].data;
						return true;
					}

					return false;
				});

				return data;
			};

			/**
			 * Set data
			 * @param {HTMLElement} element
			 * @param {Object} data
			 */
			this.set = function(element, data) {
				var	key = false;

				Object.keys(cache).some(function(k) {
					if (cache[k] && cache[k].element === element) {
						key = k;
						return true;
					}

					return false;
				});

				cache[key || id++] = {
					data: data,
					element: element
				};
			};

			/**
			 * Is key in map
			 * @param {HTMLElement} element
			 * @return boolean
			 */
			this.has = function(element) {
				return Object.keys(cache).some(function(key) {
					return (cache[key] && cache[key].element === element);
				});
			};

			/**
			 * Delete key
			 * @param {HTMLElement} element
			 */
			this.delete = function(element) {
				return Object.keys(cache).some(function(key) {
					if (cache[key] && cache[key].element === element) {
						delete cache[key];
						return true;
					}

					return false;
				});
			};

			/**
			 * Clear all keys
			 */
			this.clear = function() {
				cache = {};
			};

			/**
			 * Get all elements in wakMap hack
			 * @returns {{}}
			 */
			this.getCache = function() {
				return cache;
			};

			window.setInterval(this.gc.bind(cache), 30000);
		};

		DDomWeakMap.prototype = /** @lends DDomWeakMap */ {
			/**
			 * Because this is just cheap way to pretend to have weakMaps we have to do manual clear for objects
			 * This system works only when keys are dom nodes and those has been removed from page
			 * @private
			 */
			gc: function() {
				Object.keys(this).forEach(function(key) {
					var obj = this[key];

					if (!document.body.contains(obj.element)) {
						delete this[key];
					}
				}.bind(this));
			}
		};

		eventCache = new DDomWeakMap();
	} else {
		eventCache = new WeakMap();
	}

	// Fix Element.prototype.matches to older browsers
	(function(ElementPrototype) {
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
	 * @param {(string|Element|HTMLElement|Node|NodeList|HTMLCollection|DDom|DocumentFragment)} [element]
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

	/**
	 * DDom prototype
	 * @memberOf DDom
	 */
	DDom.prototype = {
		version: 0.1,
		slDom: true,
		length: 0,
		slice: Array.prototype.slice,
		splice: Array.prototype.splice,

		/**
		 * Push new elements to this object
		 * @param {HTMLElement|NodeList|HTMLCollection|Node|DDom} elements
		 */
		push: function(elements) {
			var x;

			if (elements.slDom) {
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
			var self = this;

			this.slice(0).forEach(function(element) {
				var handle = {
					event: type,
					capture: !!useCapture,
					f: function(type, event) {
						event.eventRemove = function(type) {
							this.removeEventListener(type, handle.f);
						}.bind(this, type);

						try {
							if (callback.call(this, event, new DDom(event.target)) === false) {
								event.preventDefault();
								event.stopPropagation();
							}
						} catch(e) {
							self.logError('DDom:eventBind - callback threw uncaught exception:', e.message, e.fileName, e.lineNumber);
							event.preventDefault();
							event.stopPropagation();
						}

					}.bind(element, type)
				};

				this.eventBindCache(element, handle);
			}.bind(this));

			return this;
		},

		/**
		 * Click event binding to element
		 * @param {Function} callback
		 * @return {DDom}
		 */
		eventClick: function(callback) {
			var self = this;

			this.slice(0).forEach(function(element) {
				var handle = {
					event: 'click',
					capture: false,
					f: function(event) {
						event.eventRemove = function() {
							this.removeEventListener('click', handle.f);
						}.bind(this);

						try {
							if (callback.call(this, event, new DDom(event.target)) === false) {
								event.preventDefault();
								event.stopPropagation();
							}
						} catch(e) {
							self.logError('DDom:eventClick - callback threw uncaught exception:', e.message, e.fileName, e.lineNumber);
							event.preventDefault();
							event.stopPropagation();
						}

					}.bind(element)
				};

				this.eventBindCache(element, handle);
			}.bind(this));

			return this;
		},

		/**
		 * Trigger given event with callback once and then destroy listener
		 * @param {string} type
		 * @param {Function} callback
		 * @return {DDom}
		 */
		eventOnce: function(type, callback) {
			this.slice(0).forEach(function(element) {
				var handle = {
					event: type,
					capture: false,
					f: function(event) {
						try {
							if (callback.call(this, event, new DDom(event.target)) === false) {
								event.preventDefault();
								event.stopPropagation();
							}
						} catch(e) {
							event.preventDefault();
							event.stopPropagation();
							throw new Error('DDom:eventOnce - callback threw uncaught exception: ' + e.message, e);
						}

						this.removeEventListener(type, handle.f);
					}.bind(element)
				};

				this.eventBindCache(element, handle);
			}.bind(this));

			return this;
		},

		/**
		 * Bind event listener
		 * @param {(string|Array)} events
		 * @param {(string|Array|Function)} data
		 * @param {Function} [callback]
		 * @param {boolean} useCapture
		 * @return {DDom}
		 */
		on: function(events, data, callback, useCapture) {
			var elements = [],
				hasElements = false,
				self = this;

			if (this.length === 0) {
				throw new Error('DDom::on - No elements to bind data');
			}

			if (this.length > 1) {
				throw new Error('DDom::on - Multiple elements to bind data');
			}

			if (typeof data === "function") {
				callback = data;

			} else {
				hasElements = true;
			}

			if (typeof callback !== "function") {
				throw new Error("DDom.on did not get valid callback function");
			}

			events.split(" ").forEach(function(event) {
				var handle = {
					event: event,
					// If focus or blur event then useCapture set true - firefox does not work otherwise
					capture: (event === 'blur' || event === 'focus' || !!useCapture),
					callback: callback,
					f: function(delegateTarget, hasElements, event) {
						/**
						 * @type {HTMLElement}
						 */
						var clicked = event.target;

						var elements = {};

						if (hasElements) {
							// Check that matches function is found from element and do matching - document does not
							// have matches function
							if (clicked.matches && clicked.matches(data)) {
								elements.target = new DDom(event.target);
								elements.delegateTarget = new DDom(delegateTarget);
								elements.currentTarget = elements.target;

								try {
									if (callback.call(clicked, event, elements) === false) {
										event.preventDefault();
										event.stopPropagation();
									}
								} catch(e1) {
									self.logError('DDom:on - callback threw uncaught exception:', e1.message, e1.fileName, e1.lineNumber);
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
									} catch(e2) {
										self.logError('DDom:on - callback threw uncaught exception:', e2.message, e2.fileName, e2.lineNumber);
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
							} catch(e3) {
								self.logError('DDom:on - callback threw uncaught exception:', e3.message, e3.fileName, e3.lineNumber);
								event.preventDefault();
								event.stopPropagation();
							}
						}
					}.bind(this, this[0], hasElements)
				};

				this.eventBindCache(this[0], handle);
			}.bind(this));

			return this;
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
				eventObject = new CustomEvent(event, {bubbles: true, cancellable: true, detail: args});

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
				clone = element.cloneNode(false);
				element.parentNode.replaceChild(clone, element);

				this[offset] = clone;
			}.bind(this));

			return this;
		},

		/**
		 * Clones current elements and returns
		 * @return {DDom}
		 */
		clone: function() {
			var clone = new DDom();

			this.slice(0).forEach(function(element) {
				clone.push(element.cloneNode(false));
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
		 */
		blur: function() {
			if (this[0] && this[0].nodeType === 1) {
				this[0].blur();
			}
		},

		/**
		 * Add HTML node after given element
		 * @param {(DDom|HTMLElement|Node)} node
		 * @return {DDom}
		 */
		after: function(node) {
			if (node.slDom) {
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
			if (node.slDom) {
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
		 * @param {Node|DDom|string} node
		 * @return {DDom}
		 */
		append: function(node) {
			if (typeof node === "string" || typeof node === "number") {
				return this.addText(node);
			}

			if (node.slDom) {
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
			var data = (prepend.slDom) ? prepend.get() : document.createTextNode(prepend);

			this.slice(0).forEach(function(element) {
				element.insertBefore(data, element.firstChild);
			});

			return this;
		},

		/**
		 * Replace current element with given data
		 * @param {Node|DDom} replace
		 * @return {DDom}
		 */
		replace: function(replace) {
			replace = (replace instanceof Node) ? replace : replace[0];

			this.slice(0).forEach(function(element) {
				var parent = element.parentNode;
				if (parent !== null) {
					parent.replaceChild(replace, element);
				}
			});

			return this;
		},

		/**
		 * document.createElement
		 * @param {string} element
		 * @param {Object} [parameters]
		 * @param {Object|Array} [parameters.event]
		 * @param {Object} [parameters.event.type]
		 * @param {Function} [parameters.event.action]
		 * @returns {HTMLElement}
		 */
		ce: function(element, parameters) {
			var ret = document.createElement(element);

			parameters = parameters || {};

			Object.keys(parameters).forEach(function(key) {
				if (key === "event") {
					if (Array.isArray(parameters[key])) {
						parameters[key].forEach(function(/*{type:string, action:Function}*/data) {
							ret.addEventListener(data.type, data.action);
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
		 * @param {DDom|HTMLElement} search
		 * @returns {boolean}
		 */
		contains: function(search) {
			// IE fix where document does not have contains function so go to document.body
			var node = (this[0] === document) ? document.body : this[0];

			search = (search.slDom) ? search.get() : search;

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
		 */
		focus: function() {
			if (this[0] && this[0].nodeType === 1) {
				this[0].focus();
			}
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
			/**
			 * @type {DDom}
			 */
			var slDom;

			if (data === undefined) {
				return (this.length !== 0) ? this[0].innerHTML : "";
			}

			if (typeof data === "string" || typeof data === "number") {
				this.slice(0).forEach(function(element) {
					element.innerHTML = data;
				});

			} else {
				slDom = data;
				data = (slDom instanceof DDom) ? slDom.getFragment() : data;

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
		 * @param {string|boolean} value
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
					   top = top + element.offsetTop;
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
		 * Set element css width
		 * @param {string} width
		 */
		setWidth: function(width) {
			this[0].style.width = width;
		},

		/**
		 * Get element offsetHeight
		 * @param {boolean} [margin]
		 * @returns {number}
		 */
		getHeight: function(margin) {
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
		 * Log error to server via FW.logError
		 * @private
		 * @param DDomMessage
		 * @param message
		 * @param fileName
		 * @param lineNumber
		 */
		logError: function(DDomMessage, message, fileName, lineNumber) {
			FW.logError(DDomMessage + " " + message, fileName, lineNumber, null);
		},

		/**
		 * Get element offsetHeight
		 * @param {string} height
		 */
		setHeight: function(height) {
			this[0].style.height = height;
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
	 * @global
	 * @function
	 * @returns {DDom}
	 */
	window.DDom = DDom;

	/**
	 * Get new DDom instance
	 * @function
	 * @param {string|HTMLElement|Node|NodeList|HTMLCollection|DDom|DocumentFragment} [selector]
	 * @param {Object} [options]
	 * @returns {DDom}
	 */
	window.$DDom = function(selector, options) {
		return new DDom(selector, options);
	};

	/**
	 * @function
	 * @returns {DDom}
	 */
	$DDom.qs = function(search) {
		return DDom.prototype.qs(search, document);
	};

	/**
	 * @function
	 * @returns {DDom}
	 */
	$DDom.qsAll = function(search) {
		return DDom.prototype.qsAll(search, document);
	};

	/**
	 * @function
	 * @returns {DDom}
	 */
	$DDom.getId = function(search) {
		return DDom.prototype.getId(search);
	};

	/**
	 * @function
	 * @returns {DDom}
	 */
	$DDom.getTag = function(search) {
		return DDom.prototype.getTag(search, document);
	};

	/**
	 * @function
	 * @returns {DDom}
	 */
	$DDom.getClass = function(search) {
		return DDom.prototype.getClass(search, document);
	};
}(window));

