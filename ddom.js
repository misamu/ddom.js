/*!
 * DDom.js - Documented document object model
 * https://github.com/misamu/ddom.js
 *
 * Licence: MIT
 */

/**
 * Support:
 *		Chrome 55
 *		Edge 18
 *		Firefox (Gecko) 50
 *		Opera 42
 *		Safari 11
 */

/*global HTMLCollection,Node,CustomEvent,NodeList */
//noinspection JSUnusedGlobalSymbols

'use strict'; // jshint ignore:line

/**
 * @typedef {{
 *		fileName: string
 *		lineNumber: number,
 *		message: string,
 *		name: string,
 *		stack: string
 * }} DOMException
 */

/**
 * @typedef {{
 *		target: DDom,
 *		delegateTarget: DDom
 * }} DDomEventElements
 */

/**
 * @typedef {{
 * }|Event} DDomEvent
 */

/**
 * DDom HTML helper
 */
(function(/*Window*/window) {
	/**
	 * @type {WeakMap<HTMLElement, Set<{
	 *			event: string,
	 *			callback: function,
	 *			binder: function,
	 *			once: boolean,
	 *			capture: boolean
	 *		}>
	 *	>}
	 */
	const handlerCache = new window.WeakMap();

	/**
	 * DDom constructor
	 * @constructor
	 * @param {(string|Element|HTMLElement|Node|NodeList|HTMLCollection|DDom|DocumentFragment|Window)} [element]
	 * @param {Object} [options]
	 * @returns {DDom}
	 */
	function DDom(element, options) {
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
				let length = this.length = element.length;
				for (let x = 0; x < length; x += 1) {
					this[x] = element[x];
				}
			} else if (element === window) {
				this.length++;
				this[0] = element;
			}
		}

		return this;
	}

	/**
	 * @param {HTMLElement} element
	 * @param {string} type
	 * @param {function} callback
	 * @param {Event} event
	 */
	function createEventBind(element, type, callback, event) {
		try {
			if (callback.call(element, event, new DDom(event.target)) === false) {
				event.preventDefault();
				event.stopPropagation();
			}
		} catch(/*DOMException*/e) {
			// $DDom.ce customEvent error is bit different
			if (event instanceof CustomEvent) {
				DDom.prototype.consoleError(`eventBind [DDom.ce:${type}] [${e.name}:${e.message}] [${e.fileName}:${e.lineNumber}]`);
			} else {
				DDom.prototype.consoleError(`eventBind [${type}] - ${e.name}:${e.message}`);
			}

			event.preventDefault();
			event.stopPropagation();
		}

		const handlers = handlerCache.get(element);
		for (let handler of handlers) {
			if (handler.callback === callback && handler.once) {
				element.removeEventListener(handler.event, handler.binder, handler.capture);

				// Clear handler from handler and remove whole WeakMap reference if there are no more events
				handlers.delete(handler);
				if (handlers.size === 0) {
					handlerCache.delete(element);
				}
			}
		}
	}

	/**
	 * Handle event binding and setting to cache for removal of events
	 * @private
	 * @param {HTMLElement} element
	 * @param {{
	 *		event: string,
	 *		callback: Function,
	 *		binder: function,
	 *		once: boolean,
	 *		capture: boolean
	 * }} handle
	 */
	function handleEventBinding(element, handle) {
		element.addEventListener(handle.event, handle.binder, {capture: handle.capture, once: handle.once});

		if (handlerCache.has(element)) {
			handlerCache.get(element).add(handle);
		} else {
			handlerCache.set(element, new Set([handle]));
		}
	}

	/**
	 * Handle on bind events
	 * @param {DDom} element
	 * @param {DDom|HTMLElement} delegateTarget
	 * @param {boolean} hasElements
	 * @param {string} data
	 * @param {function(Event, DDomEventElements)} callback
	 * @param {Event} event
	 */
	function createOnBinding(element, delegateTarget, hasElements, data, callback, event) {
		/**
		 * @type {HTMLElement}
		 */
		const clicked = /**@type {HTMLElement}*/(event.target);

		const elements = {
			target: new DDom(event.target),
			delegateTarget: new DDom(delegateTarget)
		};

		if (hasElements) {
			// Check that matches function is found from element and do matching - document does not have
			if (clicked.matches && clicked.matches(data)) {
				try {
					if (callback.call(clicked, event, elements) === false) {
						event.preventDefault();
						event.stopPropagation();
					}
				} catch(/*DOMException*/e1) {
					//noinspection JSUnresolvedFunction
					element.consoleError(`on[1] [${e1.name}: ${e1.message}] [Element: ${data}]`);
					element.consoleError(`on[1] [Stack: ${e1.stack}]`);

					event.preventDefault();
					event.stopPropagation();
				}
			} else {
				elements.target = elements.target.closest(data, delegateTarget);

				if (elements.target.length > 0) {
					try {
						if (callback.call(elements.target[0], event, elements) === false) {
							event.preventDefault();
							event.stopPropagation();
						}
					} catch(/*DOMException*/e2) {
						//noinspection JSUnresolvedFunction
						element.consoleError(`on[2] [${e2.name}: ${e2.message}] [Element: ${data}]`);
						element.consoleError(`on[2] [Stack: ${e2.stack}]`);
						event.preventDefault();
						event.stopPropagation();
					}
				}
			}

		} else {
			try {
				if (callback.call(event.target, event, elements) === false) {
					event.preventDefault();
					event.stopPropagation();
				}
			} catch(/*DOMException*/e3) {
				//noinspection JSUnresolvedFunction
				element.consoleError(`on[3] [${e3.name}: ${e3.message}] [Element: ${data}]`);
				element.consoleError(`on[3] [Stack: ${e3.stack}]`);

				event.preventDefault();
				event.stopPropagation();
			}
		}
	}

	/**
	 * DDom prototype
	 */
	DDom.prototype = /**@lends {DDom.prototype}*/{
		version: 0.3,
		isDDom: true,
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
		 * @param {HTMLElement|NodeList|HTMLCollection|Node|DDom|Array<Node>} elements
		 */
		push: function(elements) {
			if (elements.isDDom) {
				elements = elements.getAll();
			}

			if (Array.isArray(elements) || elements instanceof HTMLCollection) {
				for(let x = 0; x < elements.length; x++) {
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
		 * @param {boolean} [clone=false]
		 * @returns {DocumentFragment}
		 */
		getFragment: function(clone) {
			const frag = document.createDocumentFragment();

			if (clone === true) {
				for (const element of this) {
					frag.appendChild(element.cloneNode(true));
				}

			} else {
				for (const element of this) {
					frag.appendChild(element);
				}
			}

			return frag;
		},

		/**
		 * Get all nodes of this object
		 * Return value is really just and array but is masked to NodeList for better doc handling and has all
		 * the methods that exists in arrays too
		 * @returns {Array<Node>}
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
		 * @param {boolean} [useCapture=false]
		 * @param {boolean} [once=false]
		 * @return {DDom}
		 */
		eventBind: function(type, callback, useCapture, once) {
			for (let element of this) {
				const handle = {
					event: type,
					once: once === true,
					capture: useCapture === true,
					callback: callback,
					binder: createEventBind.bind(null, element, type, callback)
				};

				handleEventBinding(element, handle);
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
			return this.eventBind('click', callback, useCapture);
		},

		/**
		 * Trigger given event with callback once and then destroy listener
		 * @param {string} type
		 * @param {Function} callback
		 * @param {boolean} [useCapture]
		 * @return {DDom}
		 */
		eventOnce: function(type, callback, useCapture) {
			return this.eventBind(type, callback, useCapture, true);
		},

		/**
		 * Bind event listener
		 * @param {(string|Array)} events
		 * @param {(string|Array|Function)} data
		 * @param {function(Event, DDomEventElements)} [callback]
		 * @param {boolean} [useCapture]
		 * @return {DDom}
		 */
		on: function(events, data, callback, useCapture) {
			let hasElements = false;

			if (this.length === 0) {
				this.consoleError(`Event::on - No elements bind [Events: ${JSON.stringify(events)}] [Data: ${JSON.stringify(data)}]`);
				return null;
			}

			if (this.length > 1) {
				this.consoleError(`Event::on - Multiple elements bind [Events: ${JSON.stringify(events)}] [Data: ${JSON.stringify(data)}]`);
				return null;
			}

			if (typeof data === "function") {
				callback = data;

			} else {
				hasElements = true;
			}

			if (typeof callback !== "function") {
				this.consoleError(`Event::on - No valid callback [Events: ${JSON.stringify(events)}] [Data: ${JSON.stringify(data)}]`);
				return null;
			}

			events = events.split(" ");
			for (let x = 0; x < events.length; x++) {
				const handle = {
					event: events[x],
					once: false,
					// If focus or blur event then useCapture set true - firefox does not work otherwise
					capture: (events[x] === 'blur' || events[x] === 'focus' || useCapture),
					binder: createOnBinding.bind(null, this, this[0], hasElements, data, callback),
					callback: callback
				};

				handleEventBinding(this[0], handle);
			}

			return this;
		},

		/**
		 * Remove event listeners from elements that has been bind with on
		 * @param {string|undefined} [eventType]
		 * @param {Function} [func]
		 * @return {DDom}
		 */
		off: function(eventType, func) {
			for (const element of this) {
				if (handlerCache.has(element)) {
					const handlers = handlerCache.get(element);

					for (const handler of handlers) {
						if ((eventType === undefined || eventType === handler.event) &&
								(func === undefined || func === handler.callback)) {

							element.removeEventListener(handler.event, handler.binder, handler.capture);
							handlers.delete(handler);
						}
					}

					// If only given eventType was removed, then check if there is still events bind and keep those
					if (handlers.size === 0) {
						handlerCache.delete(element);
					}
				}
			}

			return this;
		},

		/**
		 * Trigger given event on all elements
		 * @param {string} event
		 * @param {Array} args
		 */
		trigger: function(event, args) {
			let eventObject;

			if (typeof CustomEvent === "function") {
				eventObject = new CustomEvent(event, /** @type CustomEventInit*/({bubbles: true, cancellable: true, detail: args}));

			} else {
				eventObject = document.createEvent("CustomEvent");
				eventObject.initCustomEvent(event, true, true, args);
			}

			// noinspection JSUndefinedPropertyAssignment
			eventObject.eventName = event;

			for (const element of this) {
				element.dispatchEvent(eventObject);
			}
		},

		/**
		 * Destroys current node and creates new clone that is free from events and content
		 * @return {DDom}
		 */
		clear: function() {
			for (const [index, element] of this.slice(0).entries()) {
				const parent = element.parentNode;

				// If node has been removed from the tree then there is no parentNode
				if (parent !== null) {
					const clone = element.cloneNode(false);
					parent.replaceChild(clone, element);

					this[index] = clone;
				}
			}

			return this;
		},

		/**
		 * Clones current elements and returns
		 * @param {boolean} [deep=false]
		 * @return {DDom}
		 */
		clone: function(deep) {
			const clone = new DDom();

			for (const element of this) {
				clone.push(element.cloneNode(deep === true));
			}

			return clone;
		},

		/**
		 * Clears current element content
		 * @return {DDom}
		 */
		empty: function() {
			for (const element of this) {
				element.innerHTML = "";
			}

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
		 * Parse DDom Node or string to return Node element
		 * @param {DDom|Node|string} node
		 * @return Node
		 */
		parseToNode: function(node) {
			if (node instanceof DDom) {
				switch (node.length) {
					case 1:
						return node[0];

					case 0:
						return document.createTextNode('');

					default:
						return node.getFragment();
				}
			}

			if (node instanceof Node) {
				return node;
			}

			if (typeof node === 'string') {
				return document.createTextNode(node);
			}
		},

		/**
		 * Add Node after first element in DDom. This will keep events
		 * @param {(DDom|HTMLElement|Node)} node
		 * @return {DDom}
		 */
		after: function(node) {
			if (this.length > 0) {
				// Parse parameter Node element
				node = this.parseToNode(node);

				this[0].parentNode.insertBefore(node, this[0].nextSibling);
			}

			return this;
		},

		/**
		 * Add Node before first element in DDom. This will keep events
		 * @param {DDom|HTMLElement|Node} node
		 * @return {DDom}
		 */
		before: function(node) {
			if (this.length > 0) {
				// Parse parameter Node element
				node = this.parseToNode(node);

				this[0].parentNode.insertBefore(node, this[0]);
			}

			return this;
		},

		/**
		 * Append child Node to first element in DDom. This will keep events
		 * @param {Node|DDom|string|number} node
		 * @return {DDom}
		 */
		append: function(node) {
			if (this.length > 0) {
				// Parse parameter Node element
				node = this.parseToNode(node);

				this[0].appendChild(node);
			}

			return this;
		},

		/**
		 * Prepend given data before first element in DDom. This will keep events
		 * @param {DDom|Node|string} node
		 * @returns {DDom}
		 */
		prepend: function(node) {
			if (this.length > 0) {
				// Parse parameter Node element
				node = this.parseToNode(node);

				this[0].insertBefore(node, this[0].firstChild);
			}

			return this;
		},

		/**
		 * Replace first element in DDom with given element. This will keep events
		 * @param {DDom|Node|string} node
		 * @return {DDom}
		 */
		replace: function(node) {
			if (this.length > 0) {
				const parent = this[0].parentNode;

				if (parent !== null) {
					// Parse parameter Node element
					node = this.parseToNode(node);

					parent.replaceChild(node, this[0]);
					this[0] = node;
				}
			}

			return this;
		},

		/**
		 * Replace all elements with given data using cloneNode that will loose events
		 * @param {DDom|Node|string} node
		 * @return {DDom}
		 */
		replaceAll: function(node) {
			node = this.parseToNode(node);

			for (const [index, replace] of this.slice(0).entries()) {
				const parent = replace.parentNode;

				if (parent !== null) {
					// clone node so all elements can use it and each index has it's own elements
					const cloneNode = node.cloneNode(true);

					parent.replaceChild(cloneNode, replace);
					this[index] = cloneNode;
				}
			}

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
			const ret = document.createElement(element);

			parameters = parameters || Object.create(null);

			for (const key of Object.keys(parameters)) {
				if (key === "event") {
					if (Array.isArray(parameters[key])) {
						for (const data of parameters[key]) {
							ret.addEventListener(data.type, /**string*/data.action);
						}
					} else {
						ret.addEventListener(parameters[key].type, parameters[key].action);
					}
				} else {
					ret.setAttribute(key, parameters[key]);
				}
			}

			return ret;
		},

		/**
		 * Search closest Node that matches given selector
		 * @param {string} tag
		 * @param {Element} [until]
		 * @returns {DDom}
		 */
		closest: function(tag, until) {
			if (this[0]) {
				let element = this[0];

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
			if (this[0]) {
				let element = this[0];

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
		 * @param {HTMLElement|Document} [secondElement]
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
		 * @param {HTMLElement|Document} [secondElement]
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
			const node = (this[0] === document) ? document.body : this[0];

			search = (search.isDDom) ? search.get() : search;

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

				// Set cursor to the end
				const length = this[0].value.length;
				this[0].setSelectionRange(length, length);
			}

			return this;
		},

		/**
		 * Set focus to first focusable element
		 * @return {DDom}
		 */
		focusFirstFocusable: function() {
			const focusable = this.qsAll('a:not([disabled]), button:not([disabled]), input:not([disabled]),' +
					' [tabindex]:not([disabled]):not([tabindex="-1"])');

			if (focusable.length > 0) {
				focusable[0].focus();
			}

			return this;
		},

		/**
		 * Iterate through all elements
		 * @param {Function} callback
		 * @return {DDom}
		 */
		forEach: function(callback) {
			for (const [index, element] of this.slice(0).entries()) {
				callback.call(element, element, index);
			}

			return this;
		},

		/**
		 * Map through elements in array like ES5 Array function map
		 * @param {Function} callback
		 * @return {Array}
		 */
		map: function(callback) {
			const ret = [];

			for (const element of this) {
				ret.push(callback.call(element, element));
			}

			return ret;
		},

		/**
		 * set css
		 * @param {Object} attributes
		 * @return {DDom}
		 */
		css: function(attributes) {
			for (const element of this) {
				if (element.nodeType === 1) {
					for (const key of Object.keys(attributes)) {
						element.style[key] = attributes[key];
					}
				}
			}

			return this;
		},

		/**
		 * Get this nodes parent node
		 * @returns {DDom}
		 */
		parent: function(steps) {
			let element;

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
			const matching = new DDom();

			for (const element of this) {
				if (element.nodeType === 1 && element.matches(attribute)) {
					matching.push(element);
				}
			}

			return matching;
		},

		/**
		 * Next element sibling
		 * @returns {DDom}
		 */
		next: function() {
			if (this[0] && this[0].nodeType === 1) {
				let element = this[0].nextElementSibling;
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
			if (this[0] && this[0].nodeType === 1) {
				let element = this[0].lastElementChild;
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
			if (this[0] && this[0].nodeType === 1) {
				let element = this[0].previousElementSibling;
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
			const element = this[0] || {};

			if (element.nodeType === 1) {
				const length = this.getVal().length;

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
					// noinspection JSUnusedGlobalSymbols
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
			for (const element of this) {
				element.appendChild(document.createTextNode(text));
			}

			return this;
		},

		/**
		 * Add class to element
		 * @param {string} addClass
		 * @return {DDom}
		 */
		addClass: function(addClass) {
			if (addClass !== "") {
				for (const element of this) {
					// Check that handled element is Element
					if (element.nodeType === 1) {
						// Modern browsers have Element.classList
						if (element.classList) {
							element.classList.add(addClass);

						} else {
							const elClass = element.getAttribute("class");

							if (elClass === null || elClass.split(' ').indexOf(addClass) === -1) {
								element.setAttribute("class", elClass + " " + addClass);
							}
						}
					}
				}
			}

			return this;
		},

		/**
		 * Toggle class name
		 * @param className
		 * @return {DDom}
		 */
		toggleClass: function(className) {
			for (const element of this) {
				// Check that handled element is Element
				if (element.nodeType === 1) {
					// Modern browsers have Element.classList
					if (element.classList && element.classList.toggle) {
						element.classList.toggle(className);

					} else {
						let elementClass = element.getAttribute("class");

						elementClass = (elementClass.indexOf(className) === -1) ? elementClass + " " + className :
							elementClass.replace(className, '').replace(/ +/g, " ");

						element.setAttribute('class', elementClass);
					}
				}
			}

			return this;
		},

		/**
		 * Toggle button disabled state
		 * @param {boolean} state
		 * @return {DDom}
		 */
		buttonDisabled: function(state) {
			for (const element of this) {
				if (element.nodeName.toLowerCase() === "button") {
					element.disabled = state;
				}
			}
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
		 * Set innerHTML data
		 * @param {string|DDom|DocumentFragment} data
		 * @return {DDom}
		 */
		html: function(data) {
			if (typeof data === "string" || typeof data === "number") {
				for (const element of this) {
					element.innerHTML = data;
				}

			} else {
				data = (data instanceof DDom) ? data.getFragment() : data;

				for (const element of this) {
					element.innerHTML = "";
					element.appendChild(data);
				}
			}

			return this;
		},

		/**
		 * Remove node
		 * @returns {DDom}
		 */
		remove: function() {
			for (const element of this) {
				if (element.parentNode !== null) {
					element.parentNode.removeChild(element);
				}
			}

			this.length = 0;

			return this;
		},

		/**
		 * Remove attribute from Element nodeType 1
		 * @param {String} attrName
		 * @returns {DDom}
		 */
		removeAttr: function(attrName) {
			for (const element of this) {
				if (element.nodeType === 1) {
					element.removeAttribute(attrName);
				}
			}

			return this;
		},

		/**
		 * Remove Class from element
		 * @param {string} removeClass
		 * @returns {DDom}
		 */
		removeClass: function(removeClass) {
			for (const element of this) {
				// Check that handled element is Element
				if (element.nodeType === 1) {
					// Modern browsers have Element.classList
					if (element.classList) {
						element.classList.remove(removeClass);

					} else {
						const regEx = new RegExp(removeClass, 'ig');
						element.setAttribute("class", (element.getAttribute("class") || "")
								.replace(regEx, '').replace(/ {2}/g, ' '));
					}
				}
			}

			return this;
		},

		/**
		 * Set element attribute for element
		 * @param {string} name
		 * @param {string|boolean|number} value
		 */
		setAttr: function(name, value) {
			for (const element of this) {
				if (element.nodeType === 1) {
					element.setAttribute(name, value);
				}
			}

			return this;
		},

		/**
		 * set css
		 * @param {string} key
		 * @param {string} value
		 * @return {DDom}
		 */
		setCSS: function(key, value) {
			for (const element of this) {
				if (element.nodeType === 1) {
					element.style[key] = value;
				}
			}

			return this;
		},

		/**
		 * Replace nodes content with given data in textNode
		 * @param {string|number} text
		 * @returns {DDom}
		 */
		setText: function(text) {
			for (const element of this) {
				element.innerHTML = "";
				element.appendChild(document.createTextNode(text));
			}

			return this;
		},

		/**
		 * Set element value attribute
		 * @param {string} value
		 * @returns {DDom}
		 */
		setVal: function(value) {
			for (const element of this) {
				if (element instanceof HTMLInputElement) {
					element.value = value;
				}
			}

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
		 * @return {String|Null}
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
		 * Get all children of first element as documentFragment
		 * @returns {DocumentFragment}
		 */
		getChildrenFragment: function() {
			const fragment = document.createDocumentFragment();

			if (this[0] && this[0].nodeType === 1) {
				const children = this[0].children;
				const length = children.length;

				for (let x = 0; x < length; x += 1) {
					fragment.appendChild(children[0]);
				}
			}

			return fragment;
		},

		/**
		 * Get all children of first element
		 * @param {string} name
		 * @returns {String|Null}
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
		 * Get innerHTML data from first element and if not defined then empty string
		 * @return {string}
		 */
		getInnerHTML: function() {
			return (this.length !== 0) ? this[0].innerHTML : "";
		},

		/**
		 * Get elements by class name
		 * @param {string} cName
		 * @param {HTMLElement|Document} [secondElement]
		 * @returns {DDom}
		 */
		getClass: function(cName, secondElement) {
			const element = this[0] || secondElement;

			if (element !== undefined) {
				return new DDom(element.getElementsByClassName(cName));
			}

			return new DDom();
		},

		/**
		 * Get elements by tag name
		 * @param {string} tagName
		 * @param {HTMLElement|Document} [secondElement]
		 * @returns {DDom}
		 */
		getTag: function(tagName, secondElement) {
			const element = this[0] || secondElement;

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
		 * @param {boolean} [viewPort=false]
		 * @returns {{top: number, left: number}}
		 */
		getPosition: function(viewPort) {
			let element = this[0];

			if (viewPort) {
				let top = 0, left = 0;

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
			const element = this[0];

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
		 * @param {boolean} [margin=false]
		 * @returns {number}
		 */
		getWidth: function(margin) {
			if (this.length === 0) {
				return 0;
			}

			let calc = this[0].offsetWidth || this[0].outerWidth || 0;

			if (margin === true) {
				const style = window.getComputedStyle(this[0], null);
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
			for (const element of this) {
				if (element.nodeType === 1) {
					element.dataset[name] = data;
				}
			}

			return this;
		},

		/**
		 * Set element css width
		 * @param {string} width
		 * @return {DDom}
		 */
		setWidth: function(width) {
			for (const element of this) {
				element.style.width = width;
			}

			return this;
		},

		/**
		 * Get element offsetHeight
		 * @param {boolean} [margin=false]
		 * @returns {number}
		 */
		getHeight: function(margin) {
			if (this.length === 0) {
				return 0;
			}

			let calc = this[0].offsetHeight || this[0].outerHeight || 0;

			if (margin !== true) {
				return calc;
			}

			const style = window.getComputedStyle(this[0], null);
			return calc + parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10);
		},

		/**
		 * Get element offsetHeight
		 * @param {string} height
		 * @return {DDom}
		 */
		setHeight: function(height) {
			for (const element of this) {
				element.style.height = height;
			}

			return this;
		}
	};

	DDom.prototype[Symbol.iterator] = function () {
		let index = -1;

		return {
			next: () => ({ value: this[++index], done: !(index in this) })
		};
	};

	/**
	 * @global $DDomFragment
	 * @type {DDom}
	 */
	window.$DDomFragment = function() {
		return new DDom(document.createDocumentFragment());
	};

	/**
	 * Get new DDom instance
	 * @global
	 * @param {string|HTMLElement|Node|NodeList|HTMLCollection|DDom|DocumentFragment} [selector]
	 * @param {Object} [options]
	 * @returns {DDom}
	 */
	let $DDom = function(selector, options) {
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

	/**
	 * @function
	 * @returns {boolean}
	 */
	$DDom.instanceOf = function(item) {
		return item instanceof DDom;
	};

	/**
	 * Set $DDom function to window
	 * @global
	 */
	window.$DDom = $DDom;

}(window));

