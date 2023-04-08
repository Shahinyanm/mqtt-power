
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function _mergeNamespaces(n, m) {
        m.forEach(function (e) {
            e && typeof e !== 'string' && !Array.isArray(e) && Object.keys(e).forEach(function (k) {
                if (k !== 'default' && !(k in n)) {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        });
        return Object.freeze(n);
    }

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.58.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var pahoMqttExports = {};
    var pahoMqtt$1 = {
      get exports(){ return pahoMqttExports; },
      set exports(v){ pahoMqttExports = v; },
    };

    /*******************************************************************************
     * Copyright (c) 2013 IBM Corp.
     *
     * All rights reserved. This program and the accompanying materials
     * are made available under the terms of the Eclipse Public License v1.0
     * and Eclipse Distribution License v1.0 which accompany this distribution.
     *
     * The Eclipse Public License is available at
     *    http://www.eclipse.org/legal/epl-v10.html
     * and the Eclipse Distribution License is available at
     *   http://www.eclipse.org/org/documents/edl-v10.php.
     *
     * Contributors:
     *    Andrew Banks - initial API and implementation and initial documentation
     *******************************************************************************/

    (function (module, exports) {
    	// Only expose a single object name in the global namespace.
    	// Everything must go through this module. Global Paho module
    	// only has a single public function, client, which returns
    	// a Paho client object given connection details.

    	/**
    	 * Send and receive messages using web browsers.
    	 * <p>
    	 * This programming interface lets a JavaScript client application use the MQTT V3.1 or
    	 * V3.1.1 protocol to connect to an MQTT-supporting messaging server.
    	 *
    	 * The function supported includes:
    	 * <ol>
    	 * <li>Connecting to and disconnecting from a server. The server is identified by its host name and port number.
    	 * <li>Specifying options that relate to the communications link with the server,
    	 * for example the frequency of keep-alive heartbeats, and whether SSL/TLS is required.
    	 * <li>Subscribing to and receiving messages from MQTT Topics.
    	 * <li>Publishing messages to MQTT Topics.
    	 * </ol>
    	 * <p>
    	 * The API consists of two main objects:
    	 * <dl>
    	 * <dt><b>{@link Paho.Client}</b></dt>
    	 * <dd>This contains methods that provide the functionality of the API,
    	 * including provision of callbacks that notify the application when a message
    	 * arrives from or is delivered to the messaging server,
    	 * or when the status of its connection to the messaging server changes.</dd>
    	 * <dt><b>{@link Paho.Message}</b></dt>
    	 * <dd>This encapsulates the payload of the message along with various attributes
    	 * associated with its delivery, in particular the destination to which it has
    	 * been (or is about to be) sent.</dd>
    	 * </dl>
    	 * <p>
    	 * The programming interface validates parameters passed to it, and will throw
    	 * an Error containing an error message intended for developer use, if it detects
    	 * an error with any parameter.
    	 * <p>
    	 * Example:
    	 *
    	 * <code><pre>
    	var client = new Paho.MQTT.Client(location.hostname, Number(location.port), "clientId");
    	client.onConnectionLost = onConnectionLost;
    	client.onMessageArrived = onMessageArrived;
    	client.connect({onSuccess:onConnect});

    	function onConnect() {
    	  // Once a connection has been made, make a subscription and send a message.
    	  console.log("onConnect");
    	  client.subscribe("/World");
    	  var message = new Paho.MQTT.Message("Hello");
    	  message.destinationName = "/World";
    	  client.send(message);
    	};
    	function onConnectionLost(responseObject) {
    	  if (responseObject.errorCode !== 0)
    		console.log("onConnectionLost:"+responseObject.errorMessage);
    	};
    	function onMessageArrived(message) {
    	  console.log("onMessageArrived:"+message.payloadString);
    	  client.disconnect();
    	};
    	 * </pre></code>
    	 * @namespace Paho
    	 */

    	/* jshint shadow:true */
    	(function ExportLibrary(root, factory) {
    		{
    			module.exports = factory();
    		}
    	})(commonjsGlobal, function LibraryFactory(){


    		var PahoMQTT = (function (global) {

    		// Private variables below, these are only visible inside the function closure
    		// which is used to define the module.
    		var version = "@VERSION@-@BUILDLEVEL@";

    		/**
    		 * @private
    		 */
    		var localStorage = global.localStorage || (function () {
    			var data = {};

    			return {
    				setItem: function (key, item) { data[key] = item; },
    				getItem: function (key) { return data[key]; },
    				removeItem: function (key) { delete data[key]; },
    			};
    		})();

    			/**
    		 * Unique message type identifiers, with associated
    		 * associated integer values.
    		 * @private
    		 */
    			var MESSAGE_TYPE = {
    				CONNECT: 1,
    				CONNACK: 2,
    				PUBLISH: 3,
    				PUBACK: 4,
    				PUBREC: 5,
    				PUBREL: 6,
    				PUBCOMP: 7,
    				SUBSCRIBE: 8,
    				SUBACK: 9,
    				UNSUBSCRIBE: 10,
    				UNSUBACK: 11,
    				PINGREQ: 12,
    				PINGRESP: 13,
    				DISCONNECT: 14
    			};

    			// Collection of utility methods used to simplify module code
    			// and promote the DRY pattern.

    			/**
    		 * Validate an object's parameter names to ensure they
    		 * match a list of expected variables name for this option
    		 * type. Used to ensure option object passed into the API don't
    		 * contain erroneous parameters.
    		 * @param {Object} obj - User options object
    		 * @param {Object} keys - valid keys and types that may exist in obj.
    		 * @throws {Error} Invalid option parameter found.
    		 * @private
    		 */
    			var validate = function(obj, keys) {
    				for (var key in obj) {
    					if (obj.hasOwnProperty(key)) {
    						if (keys.hasOwnProperty(key)) {
    							if (typeof obj[key] !== keys[key])
    								throw new Error(format(ERROR.INVALID_TYPE, [typeof obj[key], key]));
    						} else {
    							var errorStr = "Unknown property, " + key + ". Valid properties are:";
    							for (var validKey in keys)
    								if (keys.hasOwnProperty(validKey))
    									errorStr = errorStr+" "+validKey;
    							throw new Error(errorStr);
    						}
    					}
    				}
    			};

    			/**
    		 * Return a new function which runs the user function bound
    		 * to a fixed scope.
    		 * @param {function} User function
    		 * @param {object} Function scope
    		 * @return {function} User function bound to another scope
    		 * @private
    		 */
    			var scope = function (f, scope) {
    				return function () {
    					return f.apply(scope, arguments);
    				};
    			};

    			/**
    		 * Unique message type identifiers, with associated
    		 * associated integer values.
    		 * @private
    		 */
    			var ERROR = {
    				OK: {code:0, text:"AMQJSC0000I OK."},
    				CONNECT_TIMEOUT: {code:1, text:"AMQJSC0001E Connect timed out."},
    				SUBSCRIBE_TIMEOUT: {code:2, text:"AMQJS0002E Subscribe timed out."},
    				UNSUBSCRIBE_TIMEOUT: {code:3, text:"AMQJS0003E Unsubscribe timed out."},
    				PING_TIMEOUT: {code:4, text:"AMQJS0004E Ping timed out."},
    				INTERNAL_ERROR: {code:5, text:"AMQJS0005E Internal error. Error Message: {0}, Stack trace: {1}"},
    				CONNACK_RETURNCODE: {code:6, text:"AMQJS0006E Bad Connack return code:{0} {1}."},
    				SOCKET_ERROR: {code:7, text:"AMQJS0007E Socket error:{0}."},
    				SOCKET_CLOSE: {code:8, text:"AMQJS0008I Socket closed."},
    				MALFORMED_UTF: {code:9, text:"AMQJS0009E Malformed UTF data:{0} {1} {2}."},
    				UNSUPPORTED: {code:10, text:"AMQJS0010E {0} is not supported by this browser."},
    				INVALID_STATE: {code:11, text:"AMQJS0011E Invalid state {0}."},
    				INVALID_TYPE: {code:12, text:"AMQJS0012E Invalid type {0} for {1}."},
    				INVALID_ARGUMENT: {code:13, text:"AMQJS0013E Invalid argument {0} for {1}."},
    				UNSUPPORTED_OPERATION: {code:14, text:"AMQJS0014E Unsupported operation."},
    				INVALID_STORED_DATA: {code:15, text:"AMQJS0015E Invalid data in local storage key={0} value={1}."},
    				INVALID_MQTT_MESSAGE_TYPE: {code:16, text:"AMQJS0016E Invalid MQTT message type {0}."},
    				MALFORMED_UNICODE: {code:17, text:"AMQJS0017E Malformed Unicode string:{0} {1}."},
    				BUFFER_FULL: {code:18, text:"AMQJS0018E Message buffer is full, maximum buffer size: {0}."},
    			};

    			/** CONNACK RC Meaning. */
    			var CONNACK_RC = {
    				0:"Connection Accepted",
    				1:"Connection Refused: unacceptable protocol version",
    				2:"Connection Refused: identifier rejected",
    				3:"Connection Refused: server unavailable",
    				4:"Connection Refused: bad user name or password",
    				5:"Connection Refused: not authorized"
    			};

    		/**
    		 * Format an error message text.
    		 * @private
    		 * @param {error} ERROR value above.
    		 * @param {substitutions} [array] substituted into the text.
    		 * @return the text with the substitutions made.
    		 */
    			var format = function(error, substitutions) {
    				var text = error.text;
    				if (substitutions) {
    					var field,start;
    					for (var i=0; i<substitutions.length; i++) {
    						field = "{"+i+"}";
    						start = text.indexOf(field);
    						if(start > 0) {
    							var part1 = text.substring(0,start);
    							var part2 = text.substring(start+field.length);
    							text = part1+substitutions[i]+part2;
    						}
    					}
    				}
    				return text;
    			};

    			//MQTT protocol and version          6    M    Q    I    s    d    p    3
    			var MqttProtoIdentifierv3 = [0x00,0x06,0x4d,0x51,0x49,0x73,0x64,0x70,0x03];
    			//MQTT proto/version for 311         4    M    Q    T    T    4
    			var MqttProtoIdentifierv4 = [0x00,0x04,0x4d,0x51,0x54,0x54,0x04];

    			/**
    		 * Construct an MQTT wire protocol message.
    		 * @param type MQTT packet type.
    		 * @param options optional wire message attributes.
    		 *
    		 * Optional properties
    		 *
    		 * messageIdentifier: message ID in the range [0..65535]
    		 * payloadMessage:	Application Message - PUBLISH only
    		 * connectStrings:	array of 0 or more Strings to be put into the CONNECT payload
    		 * topics:			array of strings (SUBSCRIBE, UNSUBSCRIBE)
    		 * requestQoS:		array of QoS values [0..2]
    		 *
    		 * "Flag" properties
    		 * cleanSession:	true if present / false if absent (CONNECT)
    		 * willMessage:  	true if present / false if absent (CONNECT)
    		 * isRetained:		true if present / false if absent (CONNECT)
    		 * userName:		true if present / false if absent (CONNECT)
    		 * password:		true if present / false if absent (CONNECT)
    		 * keepAliveInterval:	integer [0..65535]  (CONNECT)
    		 *
    		 * @private
    		 * @ignore
    		 */
    			var WireMessage = function (type, options) {
    				this.type = type;
    				for (var name in options) {
    					if (options.hasOwnProperty(name)) {
    						this[name] = options[name];
    					}
    				}
    			};

    			WireMessage.prototype.encode = function() {
    			// Compute the first byte of the fixed header
    				var first = ((this.type & 0x0f) << 4);

    				/*
    			 * Now calculate the length of the variable header + payload by adding up the lengths
    			 * of all the component parts
    			 */

    				var remLength = 0;
    				var topicStrLength = [];
    				var destinationNameLength = 0;
    				var willMessagePayloadBytes;

    				// if the message contains a messageIdentifier then we need two bytes for that
    				if (this.messageIdentifier !== undefined)
    					remLength += 2;

    				switch(this.type) {
    				// If this a Connect then we need to include 12 bytes for its header
    				case MESSAGE_TYPE.CONNECT:
    					switch(this.mqttVersion) {
    					case 3:
    						remLength += MqttProtoIdentifierv3.length + 3;
    						break;
    					case 4:
    						remLength += MqttProtoIdentifierv4.length + 3;
    						break;
    					}

    					remLength += UTF8Length(this.clientId) + 2;
    					if (this.willMessage !== undefined) {
    						remLength += UTF8Length(this.willMessage.destinationName) + 2;
    						// Will message is always a string, sent as UTF-8 characters with a preceding length.
    						willMessagePayloadBytes = this.willMessage.payloadBytes;
    						if (!(willMessagePayloadBytes instanceof Uint8Array))
    							willMessagePayloadBytes = new Uint8Array(payloadBytes);
    						remLength += willMessagePayloadBytes.byteLength +2;
    					}
    					if (this.userName !== undefined)
    						remLength += UTF8Length(this.userName) + 2;
    					if (this.password !== undefined)
    						remLength += UTF8Length(this.password) + 2;
    					break;

    				// Subscribe, Unsubscribe can both contain topic strings
    				case MESSAGE_TYPE.SUBSCRIBE:
    					first |= 0x02; // Qos = 1;
    					for ( var i = 0; i < this.topics.length; i++) {
    						topicStrLength[i] = UTF8Length(this.topics[i]);
    						remLength += topicStrLength[i] + 2;
    					}
    					remLength += this.requestedQos.length; // 1 byte for each topic's Qos
    					// QoS on Subscribe only
    					break;

    				case MESSAGE_TYPE.UNSUBSCRIBE:
    					first |= 0x02; // Qos = 1;
    					for ( var i = 0; i < this.topics.length; i++) {
    						topicStrLength[i] = UTF8Length(this.topics[i]);
    						remLength += topicStrLength[i] + 2;
    					}
    					break;

    				case MESSAGE_TYPE.PUBREL:
    					first |= 0x02; // Qos = 1;
    					break;

    				case MESSAGE_TYPE.PUBLISH:
    					if (this.payloadMessage.duplicate) first |= 0x08;
    					first  = first |= (this.payloadMessage.qos << 1);
    					if (this.payloadMessage.retained) first |= 0x01;
    					destinationNameLength = UTF8Length(this.payloadMessage.destinationName);
    					remLength += destinationNameLength + 2;
    					var payloadBytes = this.payloadMessage.payloadBytes;
    					remLength += payloadBytes.byteLength;
    					if (payloadBytes instanceof ArrayBuffer)
    						payloadBytes = new Uint8Array(payloadBytes);
    					else if (!(payloadBytes instanceof Uint8Array))
    						payloadBytes = new Uint8Array(payloadBytes.buffer);
    					break;
    				}

    				// Now we can allocate a buffer for the message

    				var mbi = encodeMBI(remLength);  // Convert the length to MQTT MBI format
    				var pos = mbi.length + 1;        // Offset of start of variable header
    				var buffer = new ArrayBuffer(remLength + pos);
    				var byteStream = new Uint8Array(buffer);    // view it as a sequence of bytes

    				//Write the fixed header into the buffer
    				byteStream[0] = first;
    				byteStream.set(mbi,1);

    				// If this is a PUBLISH then the variable header starts with a topic
    				if (this.type == MESSAGE_TYPE.PUBLISH)
    					pos = writeString(this.payloadMessage.destinationName, destinationNameLength, byteStream, pos);
    				// If this is a CONNECT then the variable header contains the protocol name/version, flags and keepalive time

    				else if (this.type == MESSAGE_TYPE.CONNECT) {
    					switch (this.mqttVersion) {
    					case 3:
    						byteStream.set(MqttProtoIdentifierv3, pos);
    						pos += MqttProtoIdentifierv3.length;
    						break;
    					case 4:
    						byteStream.set(MqttProtoIdentifierv4, pos);
    						pos += MqttProtoIdentifierv4.length;
    						break;
    					}
    					var connectFlags = 0;
    					if (this.cleanSession)
    						connectFlags = 0x02;
    					if (this.willMessage !== undefined ) {
    						connectFlags |= 0x04;
    						connectFlags |= (this.willMessage.qos<<3);
    						if (this.willMessage.retained) {
    							connectFlags |= 0x20;
    						}
    					}
    					if (this.userName !== undefined)
    						connectFlags |= 0x80;
    					if (this.password !== undefined)
    						connectFlags |= 0x40;
    					byteStream[pos++] = connectFlags;
    					pos = writeUint16 (this.keepAliveInterval, byteStream, pos);
    				}

    				// Output the messageIdentifier - if there is one
    				if (this.messageIdentifier !== undefined)
    					pos = writeUint16 (this.messageIdentifier, byteStream, pos);

    				switch(this.type) {
    				case MESSAGE_TYPE.CONNECT:
    					pos = writeString(this.clientId, UTF8Length(this.clientId), byteStream, pos);
    					if (this.willMessage !== undefined) {
    						pos = writeString(this.willMessage.destinationName, UTF8Length(this.willMessage.destinationName), byteStream, pos);
    						pos = writeUint16(willMessagePayloadBytes.byteLength, byteStream, pos);
    						byteStream.set(willMessagePayloadBytes, pos);
    						pos += willMessagePayloadBytes.byteLength;

    					}
    					if (this.userName !== undefined)
    						pos = writeString(this.userName, UTF8Length(this.userName), byteStream, pos);
    					if (this.password !== undefined)
    						pos = writeString(this.password, UTF8Length(this.password), byteStream, pos);
    					break;

    				case MESSAGE_TYPE.PUBLISH:
    					// PUBLISH has a text or binary payload, if text do not add a 2 byte length field, just the UTF characters.
    					byteStream.set(payloadBytes, pos);

    					break;

    					//    	    case MESSAGE_TYPE.PUBREC:
    					//    	    case MESSAGE_TYPE.PUBREL:
    					//    	    case MESSAGE_TYPE.PUBCOMP:
    					//    	    	break;

    				case MESSAGE_TYPE.SUBSCRIBE:
    					// SUBSCRIBE has a list of topic strings and request QoS
    					for (var i=0; i<this.topics.length; i++) {
    						pos = writeString(this.topics[i], topicStrLength[i], byteStream, pos);
    						byteStream[pos++] = this.requestedQos[i];
    					}
    					break;

    				case MESSAGE_TYPE.UNSUBSCRIBE:
    					// UNSUBSCRIBE has a list of topic strings
    					for (var i=0; i<this.topics.length; i++)
    						pos = writeString(this.topics[i], topicStrLength[i], byteStream, pos);
    					break;
    					// Do nothing.
    				}

    				return buffer;
    			};

    			function decodeMessage(input,pos) {
    				var startingPos = pos;
    				var first = input[pos];
    				var type = first >> 4;
    				var messageInfo = first &= 0x0f;
    				pos += 1;


    				// Decode the remaining length (MBI format)

    				var digit;
    				var remLength = 0;
    				var multiplier = 1;
    				do {
    					if (pos == input.length) {
    						return [null,startingPos];
    					}
    					digit = input[pos++];
    					remLength += ((digit & 0x7F) * multiplier);
    					multiplier *= 128;
    				} while ((digit & 0x80) !== 0);

    				var endPos = pos+remLength;
    				if (endPos > input.length) {
    					return [null,startingPos];
    				}

    				var wireMessage = new WireMessage(type);
    				switch(type) {
    				case MESSAGE_TYPE.CONNACK:
    					var connectAcknowledgeFlags = input[pos++];
    					if (connectAcknowledgeFlags & 0x01)
    						wireMessage.sessionPresent = true;
    					wireMessage.returnCode = input[pos++];
    					break;

    				case MESSAGE_TYPE.PUBLISH:
    					var qos = (messageInfo >> 1) & 0x03;

    					var len = readUint16(input, pos);
    					pos += 2;
    					var topicName = parseUTF8(input, pos, len);
    					pos += len;
    					// If QoS 1 or 2 there will be a messageIdentifier
    					if (qos > 0) {
    						wireMessage.messageIdentifier = readUint16(input, pos);
    						pos += 2;
    					}

    					var message = new Message(input.subarray(pos, endPos));
    					if ((messageInfo & 0x01) == 0x01)
    						message.retained = true;
    					if ((messageInfo & 0x08) == 0x08)
    						message.duplicate =  true;
    					message.qos = qos;
    					message.destinationName = topicName;
    					wireMessage.payloadMessage = message;
    					break;

    				case  MESSAGE_TYPE.PUBACK:
    				case  MESSAGE_TYPE.PUBREC:
    				case  MESSAGE_TYPE.PUBREL:
    				case  MESSAGE_TYPE.PUBCOMP:
    				case  MESSAGE_TYPE.UNSUBACK:
    					wireMessage.messageIdentifier = readUint16(input, pos);
    					break;

    				case  MESSAGE_TYPE.SUBACK:
    					wireMessage.messageIdentifier = readUint16(input, pos);
    					pos += 2;
    					wireMessage.returnCode = input.subarray(pos, endPos);
    					break;
    				}

    				return [wireMessage,endPos];
    			}

    			function writeUint16(input, buffer, offset) {
    				buffer[offset++] = input >> 8;      //MSB
    				buffer[offset++] = input % 256;     //LSB
    				return offset;
    			}

    			function writeString(input, utf8Length, buffer, offset) {
    				offset = writeUint16(utf8Length, buffer, offset);
    				stringToUTF8(input, buffer, offset);
    				return offset + utf8Length;
    			}

    			function readUint16(buffer, offset) {
    				return 256*buffer[offset] + buffer[offset+1];
    			}

    			/**
    		 * Encodes an MQTT Multi-Byte Integer
    		 * @private
    		 */
    			function encodeMBI(number) {
    				var output = new Array(1);
    				var numBytes = 0;

    				do {
    					var digit = number % 128;
    					number = number >> 7;
    					if (number > 0) {
    						digit |= 0x80;
    					}
    					output[numBytes++] = digit;
    				} while ( (number > 0) && (numBytes<4) );

    				return output;
    			}

    			/**
    		 * Takes a String and calculates its length in bytes when encoded in UTF8.
    		 * @private
    		 */
    			function UTF8Length(input) {
    				var output = 0;
    				for (var i = 0; i<input.length; i++)
    				{
    					var charCode = input.charCodeAt(i);
    					if (charCode > 0x7FF)
    					{
    						// Surrogate pair means its a 4 byte character
    						if (0xD800 <= charCode && charCode <= 0xDBFF)
    						{
    							i++;
    							output++;
    						}
    						output +=3;
    					}
    					else if (charCode > 0x7F)
    						output +=2;
    					else
    						output++;
    				}
    				return output;
    			}

    			/**
    		 * Takes a String and writes it into an array as UTF8 encoded bytes.
    		 * @private
    		 */
    			function stringToUTF8(input, output, start) {
    				var pos = start;
    				for (var i = 0; i<input.length; i++) {
    					var charCode = input.charCodeAt(i);

    					// Check for a surrogate pair.
    					if (0xD800 <= charCode && charCode <= 0xDBFF) {
    						var lowCharCode = input.charCodeAt(++i);
    						if (isNaN(lowCharCode)) {
    							throw new Error(format(ERROR.MALFORMED_UNICODE, [charCode, lowCharCode]));
    						}
    						charCode = ((charCode - 0xD800)<<10) + (lowCharCode - 0xDC00) + 0x10000;

    					}

    					if (charCode <= 0x7F) {
    						output[pos++] = charCode;
    					} else if (charCode <= 0x7FF) {
    						output[pos++] = charCode>>6  & 0x1F | 0xC0;
    						output[pos++] = charCode     & 0x3F | 0x80;
    					} else if (charCode <= 0xFFFF) {
    						output[pos++] = charCode>>12 & 0x0F | 0xE0;
    						output[pos++] = charCode>>6  & 0x3F | 0x80;
    						output[pos++] = charCode     & 0x3F | 0x80;
    					} else {
    						output[pos++] = charCode>>18 & 0x07 | 0xF0;
    						output[pos++] = charCode>>12 & 0x3F | 0x80;
    						output[pos++] = charCode>>6  & 0x3F | 0x80;
    						output[pos++] = charCode     & 0x3F | 0x80;
    					}
    				}
    				return output;
    			}

    			function parseUTF8(input, offset, length) {
    				var output = "";
    				var utf16;
    				var pos = offset;

    				while (pos < offset+length)
    				{
    					var byte1 = input[pos++];
    					if (byte1 < 128)
    						utf16 = byte1;
    					else
    					{
    						var byte2 = input[pos++]-128;
    						if (byte2 < 0)
    							throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16),""]));
    						if (byte1 < 0xE0)             // 2 byte character
    							utf16 = 64*(byte1-0xC0) + byte2;
    						else
    						{
    							var byte3 = input[pos++]-128;
    							if (byte3 < 0)
    								throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), byte3.toString(16)]));
    							if (byte1 < 0xF0)        // 3 byte character
    								utf16 = 4096*(byte1-0xE0) + 64*byte2 + byte3;
    							else
    							{
    								var byte4 = input[pos++]-128;
    								if (byte4 < 0)
    									throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), byte3.toString(16), byte4.toString(16)]));
    								if (byte1 < 0xF8)        // 4 byte character
    									utf16 = 262144*(byte1-0xF0) + 4096*byte2 + 64*byte3 + byte4;
    								else                     // longer encodings are not supported
    									throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), byte3.toString(16), byte4.toString(16)]));
    							}
    						}
    					}

    					if (utf16 > 0xFFFF)   // 4 byte character - express as a surrogate pair
    					{
    						utf16 -= 0x10000;
    						output += String.fromCharCode(0xD800 + (utf16 >> 10)); // lead character
    						utf16 = 0xDC00 + (utf16 & 0x3FF);  // trail character
    					}
    					output += String.fromCharCode(utf16);
    				}
    				return output;
    			}

    			/**
    		 * Repeat keepalive requests, monitor responses.
    		 * @ignore
    		 */
    			var Pinger = function(client, keepAliveInterval) {
    				this._client = client;
    				this._keepAliveInterval = keepAliveInterval*1000;
    				this.isReset = false;

    				var pingReq = new WireMessage(MESSAGE_TYPE.PINGREQ).encode();

    				var doTimeout = function (pinger) {
    					return function () {
    						return doPing.apply(pinger);
    					};
    				};

    				/** @ignore */
    				var doPing = function() {
    					if (!this.isReset) {
    						this._client._trace("Pinger.doPing", "Timed out");
    						this._client._disconnected( ERROR.PING_TIMEOUT.code , format(ERROR.PING_TIMEOUT));
    					} else {
    						this.isReset = false;
    						this._client._trace("Pinger.doPing", "send PINGREQ");
    						this._client.socket.send(pingReq);
    						this.timeout = setTimeout(doTimeout(this), this._keepAliveInterval);
    					}
    				};

    				this.reset = function() {
    					this.isReset = true;
    					clearTimeout(this.timeout);
    					if (this._keepAliveInterval > 0)
    						this.timeout = setTimeout(doTimeout(this), this._keepAliveInterval);
    				};

    				this.cancel = function() {
    					clearTimeout(this.timeout);
    				};
    			};

    			/**
    		 * Monitor request completion.
    		 * @ignore
    		 */
    			var Timeout = function(client, timeoutSeconds, action, args) {
    				if (!timeoutSeconds)
    					timeoutSeconds = 30;

    				var doTimeout = function (action, client, args) {
    					return function () {
    						return action.apply(client, args);
    					};
    				};
    				this.timeout = setTimeout(doTimeout(action, client, args), timeoutSeconds * 1000);

    				this.cancel = function() {
    					clearTimeout(this.timeout);
    				};
    			};

    		/**
    		 * Internal implementation of the Websockets MQTT V3.1 client.
    		 *
    		 * @name Paho.ClientImpl @constructor
    		 * @param {String} host the DNS nameof the webSocket host.
    		 * @param {Number} port the port number for that host.
    		 * @param {String} clientId the MQ client identifier.
    		 */
    			var ClientImpl = function (uri, host, port, path, clientId) {
    			// Check dependencies are satisfied in this browser.
    				if (!("WebSocket" in global && global.WebSocket !== null)) {
    					throw new Error(format(ERROR.UNSUPPORTED, ["WebSocket"]));
    				}
    				if (!("ArrayBuffer" in global && global.ArrayBuffer !== null)) {
    					throw new Error(format(ERROR.UNSUPPORTED, ["ArrayBuffer"]));
    				}
    				this._trace("Paho.Client", uri, host, port, path, clientId);

    				this.host = host;
    				this.port = port;
    				this.path = path;
    				this.uri = uri;
    				this.clientId = clientId;
    				this._wsuri = null;

    				// Local storagekeys are qualified with the following string.
    				// The conditional inclusion of path in the key is for backward
    				// compatibility to when the path was not configurable and assumed to
    				// be /mqtt
    				this._localKey=host+":"+port+(path!="/mqtt"?":"+path:"")+":"+clientId+":";

    				// Create private instance-only message queue
    				// Internal queue of messages to be sent, in sending order.
    				this._msg_queue = [];
    				this._buffered_msg_queue = [];

    				// Messages we have sent and are expecting a response for, indexed by their respective message ids.
    				this._sentMessages = {};

    				// Messages we have received and acknowleged and are expecting a confirm message for
    				// indexed by their respective message ids.
    				this._receivedMessages = {};

    				// Internal list of callbacks to be executed when messages
    				// have been successfully sent over web socket, e.g. disconnect
    				// when it doesn't have to wait for ACK, just message is dispatched.
    				this._notify_msg_sent = {};

    				// Unique identifier for SEND messages, incrementing
    				// counter as messages are sent.
    				this._message_identifier = 1;

    				// Used to determine the transmission sequence of stored sent messages.
    				this._sequence = 0;


    				// Load the local state, if any, from the saved version, only restore state relevant to this client.
    				for (var key in localStorage)
    					if (   key.indexOf("Sent:"+this._localKey) === 0 || key.indexOf("Received:"+this._localKey) === 0)
    						this.restore(key);
    			};

    			// Messaging Client public instance members.
    			ClientImpl.prototype.host = null;
    			ClientImpl.prototype.port = null;
    			ClientImpl.prototype.path = null;
    			ClientImpl.prototype.uri = null;
    			ClientImpl.prototype.clientId = null;

    			// Messaging Client private instance members.
    			ClientImpl.prototype.socket = null;
    			/* true once we have received an acknowledgement to a CONNECT packet. */
    			ClientImpl.prototype.connected = false;
    			/* The largest message identifier allowed, may not be larger than 2**16 but
    			 * if set smaller reduces the maximum number of outbound messages allowed.
    			 */
    			ClientImpl.prototype.maxMessageIdentifier = 65536;
    			ClientImpl.prototype.connectOptions = null;
    			ClientImpl.prototype.hostIndex = null;
    			ClientImpl.prototype.onConnected = null;
    			ClientImpl.prototype.onConnectionLost = null;
    			ClientImpl.prototype.onMessageDelivered = null;
    			ClientImpl.prototype.onMessageArrived = null;
    			ClientImpl.prototype.traceFunction = null;
    			ClientImpl.prototype._msg_queue = null;
    			ClientImpl.prototype._buffered_msg_queue = null;
    			ClientImpl.prototype._connectTimeout = null;
    			/* The sendPinger monitors how long we allow before we send data to prove to the server that we are alive. */
    			ClientImpl.prototype.sendPinger = null;
    			/* The receivePinger monitors how long we allow before we require evidence that the server is alive. */
    			ClientImpl.prototype.receivePinger = null;
    			ClientImpl.prototype._reconnectInterval = 1; // Reconnect Delay, starts at 1 second
    			ClientImpl.prototype._reconnecting = false;
    			ClientImpl.prototype._reconnectTimeout = null;
    			ClientImpl.prototype.disconnectedPublishing = false;
    			ClientImpl.prototype.disconnectedBufferSize = 5000;

    			ClientImpl.prototype.receiveBuffer = null;

    			ClientImpl.prototype._traceBuffer = null;
    			ClientImpl.prototype._MAX_TRACE_ENTRIES = 100;

    			ClientImpl.prototype.connect = function (connectOptions) {
    				var connectOptionsMasked = this._traceMask(connectOptions, "password");
    				this._trace("Client.connect", connectOptionsMasked, this.socket, this.connected);

    				if (this.connected)
    					throw new Error(format(ERROR.INVALID_STATE, ["already connected"]));
    				if (this.socket)
    					throw new Error(format(ERROR.INVALID_STATE, ["already connected"]));

    				if (this._reconnecting) {
    				// connect() function is called while reconnect is in progress.
    				// Terminate the auto reconnect process to use new connect options.
    					this._reconnectTimeout.cancel();
    					this._reconnectTimeout = null;
    					this._reconnecting = false;
    				}

    				this.connectOptions = connectOptions;
    				this._reconnectInterval = 1;
    				this._reconnecting = false;
    				if (connectOptions.uris) {
    					this.hostIndex = 0;
    					this._doConnect(connectOptions.uris[0]);
    				} else {
    					this._doConnect(this.uri);
    				}

    			};

    			ClientImpl.prototype.subscribe = function (filter, subscribeOptions) {
    				this._trace("Client.subscribe", filter, subscribeOptions);

    				if (!this.connected)
    					throw new Error(format(ERROR.INVALID_STATE, ["not connected"]));

    	            var wireMessage = new WireMessage(MESSAGE_TYPE.SUBSCRIBE);
    	            wireMessage.topics = filter.constructor === Array ? filter : [filter];
    	            if (subscribeOptions.qos === undefined)
    	                subscribeOptions.qos = 0;
    	            wireMessage.requestedQos = [];
    	            for (var i = 0; i < wireMessage.topics.length; i++)
    	                wireMessage.requestedQos[i] = subscribeOptions.qos;

    				if (subscribeOptions.onSuccess) {
    					wireMessage.onSuccess = function(grantedQos) {subscribeOptions.onSuccess({invocationContext:subscribeOptions.invocationContext,grantedQos:grantedQos});};
    				}

    				if (subscribeOptions.onFailure) {
    					wireMessage.onFailure = function(errorCode) {subscribeOptions.onFailure({invocationContext:subscribeOptions.invocationContext,errorCode:errorCode, errorMessage:format(errorCode)});};
    				}

    				if (subscribeOptions.timeout) {
    					wireMessage.timeOut = new Timeout(this, subscribeOptions.timeout, subscribeOptions.onFailure,
    						[{invocationContext:subscribeOptions.invocationContext,
    							errorCode:ERROR.SUBSCRIBE_TIMEOUT.code,
    							errorMessage:format(ERROR.SUBSCRIBE_TIMEOUT)}]);
    				}

    				// All subscriptions return a SUBACK.
    				this._requires_ack(wireMessage);
    				this._schedule_message(wireMessage);
    			};

    			/** @ignore */
    			ClientImpl.prototype.unsubscribe = function(filter, unsubscribeOptions) {
    				this._trace("Client.unsubscribe", filter, unsubscribeOptions);

    				if (!this.connected)
    					throw new Error(format(ERROR.INVALID_STATE, ["not connected"]));

    	            var wireMessage = new WireMessage(MESSAGE_TYPE.UNSUBSCRIBE);
    	            wireMessage.topics = filter.constructor === Array ? filter : [filter];

    				if (unsubscribeOptions.onSuccess) {
    					wireMessage.callback = function() {unsubscribeOptions.onSuccess({invocationContext:unsubscribeOptions.invocationContext});};
    				}
    				if (unsubscribeOptions.timeout) {
    					wireMessage.timeOut = new Timeout(this, unsubscribeOptions.timeout, unsubscribeOptions.onFailure,
    						[{invocationContext:unsubscribeOptions.invocationContext,
    							errorCode:ERROR.UNSUBSCRIBE_TIMEOUT.code,
    							errorMessage:format(ERROR.UNSUBSCRIBE_TIMEOUT)}]);
    				}

    				// All unsubscribes return a SUBACK.
    				this._requires_ack(wireMessage);
    				this._schedule_message(wireMessage);
    			};

    			ClientImpl.prototype.send = function (message) {
    				this._trace("Client.send", message);

    				var wireMessage = new WireMessage(MESSAGE_TYPE.PUBLISH);
    				wireMessage.payloadMessage = message;

    				if (this.connected) {
    				// Mark qos 1 & 2 message as "ACK required"
    				// For qos 0 message, invoke onMessageDelivered callback if there is one.
    				// Then schedule the message.
    					if (message.qos > 0) {
    						this._requires_ack(wireMessage);
    					} else if (this.onMessageDelivered) {
    						this._notify_msg_sent[wireMessage] = this.onMessageDelivered(wireMessage.payloadMessage);
    					}
    					this._schedule_message(wireMessage);
    				} else {
    				// Currently disconnected, will not schedule this message
    				// Check if reconnecting is in progress and disconnected publish is enabled.
    					if (this._reconnecting && this.disconnectedPublishing) {
    					// Check the limit which include the "required ACK" messages
    						var messageCount = Object.keys(this._sentMessages).length + this._buffered_msg_queue.length;
    						if (messageCount > this.disconnectedBufferSize) {
    							throw new Error(format(ERROR.BUFFER_FULL, [this.disconnectedBufferSize]));
    						} else {
    							if (message.qos > 0) {
    							// Mark this message as "ACK required"
    								this._requires_ack(wireMessage);
    							} else {
    								wireMessage.sequence = ++this._sequence;
    								// Add messages in fifo order to array, by adding to start
    								this._buffered_msg_queue.unshift(wireMessage);
    							}
    						}
    					} else {
    						throw new Error(format(ERROR.INVALID_STATE, ["not connected"]));
    					}
    				}
    			};

    			ClientImpl.prototype.disconnect = function () {
    				this._trace("Client.disconnect");

    				if (this._reconnecting) {
    				// disconnect() function is called while reconnect is in progress.
    				// Terminate the auto reconnect process.
    					this._reconnectTimeout.cancel();
    					this._reconnectTimeout = null;
    					this._reconnecting = false;
    				}

    				if (!this.socket)
    					throw new Error(format(ERROR.INVALID_STATE, ["not connecting or connected"]));

    				var wireMessage = new WireMessage(MESSAGE_TYPE.DISCONNECT);

    				// Run the disconnected call back as soon as the message has been sent,
    				// in case of a failure later on in the disconnect processing.
    				// as a consequence, the _disconected call back may be run several times.
    				this._notify_msg_sent[wireMessage] = scope(this._disconnected, this);

    				this._schedule_message(wireMessage);
    			};

    			ClientImpl.prototype.getTraceLog = function () {
    				if ( this._traceBuffer !== null ) {
    					this._trace("Client.getTraceLog", new Date());
    					this._trace("Client.getTraceLog in flight messages", this._sentMessages.length);
    					for (var key in this._sentMessages)
    						this._trace("_sentMessages ",key, this._sentMessages[key]);
    					for (var key in this._receivedMessages)
    						this._trace("_receivedMessages ",key, this._receivedMessages[key]);

    					return this._traceBuffer;
    				}
    			};

    			ClientImpl.prototype.startTrace = function () {
    				if ( this._traceBuffer === null ) {
    					this._traceBuffer = [];
    				}
    				this._trace("Client.startTrace", new Date(), version);
    			};

    			ClientImpl.prototype.stopTrace = function () {
    				delete this._traceBuffer;
    			};

    			ClientImpl.prototype._doConnect = function (wsurl) {
    			// When the socket is open, this client will send the CONNECT WireMessage using the saved parameters.
    				if (this.connectOptions.useSSL) {
    					var uriParts = wsurl.split(":");
    					uriParts[0] = "wss";
    					wsurl = uriParts.join(":");
    				}
    				this._wsuri = wsurl;
    				this.connected = false;



    				if (this.connectOptions.mqttVersion < 4) {
    					this.socket = new WebSocket(wsurl, ["mqttv3.1"]);
    				} else {
    					this.socket = new WebSocket(wsurl, ["mqtt"]);
    				}
    				this.socket.binaryType = "arraybuffer";
    				this.socket.onopen = scope(this._on_socket_open, this);
    				this.socket.onmessage = scope(this._on_socket_message, this);
    				this.socket.onerror = scope(this._on_socket_error, this);
    				this.socket.onclose = scope(this._on_socket_close, this);

    				this.sendPinger = new Pinger(this, this.connectOptions.keepAliveInterval);
    				this.receivePinger = new Pinger(this, this.connectOptions.keepAliveInterval);
    				if (this._connectTimeout) {
    					this._connectTimeout.cancel();
    					this._connectTimeout = null;
    				}
    				this._connectTimeout = new Timeout(this, this.connectOptions.timeout, this._disconnected,  [ERROR.CONNECT_TIMEOUT.code, format(ERROR.CONNECT_TIMEOUT)]);
    			};


    			// Schedule a new message to be sent over the WebSockets
    			// connection. CONNECT messages cause WebSocket connection
    			// to be started. All other messages are queued internally
    			// until this has happened. When WS connection starts, process
    			// all outstanding messages.
    			ClientImpl.prototype._schedule_message = function (message) {
    				// Add messages in fifo order to array, by adding to start
    				this._msg_queue.unshift(message);
    				// Process outstanding messages in the queue if we have an  open socket, and have received CONNACK.
    				if (this.connected) {
    					this._process_queue();
    				}
    			};

    			ClientImpl.prototype.store = function(prefix, wireMessage) {
    				var storedMessage = {type:wireMessage.type, messageIdentifier:wireMessage.messageIdentifier, version:1};

    				switch(wireMessage.type) {
    				case MESSAGE_TYPE.PUBLISH:
    					if(wireMessage.pubRecReceived)
    						storedMessage.pubRecReceived = true;

    					// Convert the payload to a hex string.
    					storedMessage.payloadMessage = {};
    					var hex = "";
    					var messageBytes = wireMessage.payloadMessage.payloadBytes;
    					for (var i=0; i<messageBytes.length; i++) {
    						if (messageBytes[i] <= 0xF)
    							hex = hex+"0"+messageBytes[i].toString(16);
    						else
    							hex = hex+messageBytes[i].toString(16);
    					}
    					storedMessage.payloadMessage.payloadHex = hex;

    					storedMessage.payloadMessage.qos = wireMessage.payloadMessage.qos;
    					storedMessage.payloadMessage.destinationName = wireMessage.payloadMessage.destinationName;
    					if (wireMessage.payloadMessage.duplicate)
    						storedMessage.payloadMessage.duplicate = true;
    					if (wireMessage.payloadMessage.retained)
    						storedMessage.payloadMessage.retained = true;

    					// Add a sequence number to sent messages.
    					if ( prefix.indexOf("Sent:") === 0 ) {
    						if ( wireMessage.sequence === undefined )
    							wireMessage.sequence = ++this._sequence;
    						storedMessage.sequence = wireMessage.sequence;
    					}
    					break;

    				default:
    					throw Error(format(ERROR.INVALID_STORED_DATA, [prefix+this._localKey+wireMessage.messageIdentifier, storedMessage]));
    				}
    				localStorage.setItem(prefix+this._localKey+wireMessage.messageIdentifier, JSON.stringify(storedMessage));
    			};

    			ClientImpl.prototype.restore = function(key) {
    				var value = localStorage.getItem(key);
    				var storedMessage = JSON.parse(value);

    				var wireMessage = new WireMessage(storedMessage.type, storedMessage);

    				switch(storedMessage.type) {
    				case MESSAGE_TYPE.PUBLISH:
    					// Replace the payload message with a Message object.
    					var hex = storedMessage.payloadMessage.payloadHex;
    					var buffer = new ArrayBuffer((hex.length)/2);
    					var byteStream = new Uint8Array(buffer);
    					var i = 0;
    					while (hex.length >= 2) {
    						var x = parseInt(hex.substring(0, 2), 16);
    						hex = hex.substring(2, hex.length);
    						byteStream[i++] = x;
    					}
    					var payloadMessage = new Message(byteStream);

    					payloadMessage.qos = storedMessage.payloadMessage.qos;
    					payloadMessage.destinationName = storedMessage.payloadMessage.destinationName;
    					if (storedMessage.payloadMessage.duplicate)
    						payloadMessage.duplicate = true;
    					if (storedMessage.payloadMessage.retained)
    						payloadMessage.retained = true;
    					wireMessage.payloadMessage = payloadMessage;

    					break;

    				default:
    					throw Error(format(ERROR.INVALID_STORED_DATA, [key, value]));
    				}

    				if (key.indexOf("Sent:"+this._localKey) === 0) {
    					wireMessage.payloadMessage.duplicate = true;
    					this._sentMessages[wireMessage.messageIdentifier] = wireMessage;
    				} else if (key.indexOf("Received:"+this._localKey) === 0) {
    					this._receivedMessages[wireMessage.messageIdentifier] = wireMessage;
    				}
    			};

    			ClientImpl.prototype._process_queue = function () {
    				var message = null;

    				// Send all queued messages down socket connection
    				while ((message = this._msg_queue.pop())) {
    					this._socket_send(message);
    					// Notify listeners that message was successfully sent
    					if (this._notify_msg_sent[message]) {
    						this._notify_msg_sent[message]();
    						delete this._notify_msg_sent[message];
    					}
    				}
    			};

    			/**
    		 * Expect an ACK response for this message. Add message to the set of in progress
    		 * messages and set an unused identifier in this message.
    		 * @ignore
    		 */
    			ClientImpl.prototype._requires_ack = function (wireMessage) {
    				var messageCount = Object.keys(this._sentMessages).length;
    				if (messageCount > this.maxMessageIdentifier)
    					throw Error ("Too many messages:"+messageCount);

    				while(this._sentMessages[this._message_identifier] !== undefined) {
    					this._message_identifier++;
    				}
    				wireMessage.messageIdentifier = this._message_identifier;
    				this._sentMessages[wireMessage.messageIdentifier] = wireMessage;
    				if (wireMessage.type === MESSAGE_TYPE.PUBLISH) {
    					this.store("Sent:", wireMessage);
    				}
    				if (this._message_identifier === this.maxMessageIdentifier) {
    					this._message_identifier = 1;
    				}
    			};

    			/**
    		 * Called when the underlying websocket has been opened.
    		 * @ignore
    		 */
    			ClientImpl.prototype._on_socket_open = function () {
    			// Create the CONNECT message object.
    				var wireMessage = new WireMessage(MESSAGE_TYPE.CONNECT, this.connectOptions);
    				wireMessage.clientId = this.clientId;
    				this._socket_send(wireMessage);
    			};

    			/**
    		 * Called when the underlying websocket has received a complete packet.
    		 * @ignore
    		 */
    			ClientImpl.prototype._on_socket_message = function (event) {
    				this._trace("Client._on_socket_message", event.data);
    				var messages = this._deframeMessages(event.data);
    				for (var i = 0; i < messages.length; i+=1) {
    					this._handleMessage(messages[i]);
    				}
    			};

    			ClientImpl.prototype._deframeMessages = function(data) {
    				var byteArray = new Uint8Array(data);
    				var messages = [];
    				if (this.receiveBuffer) {
    					var newData = new Uint8Array(this.receiveBuffer.length+byteArray.length);
    					newData.set(this.receiveBuffer);
    					newData.set(byteArray,this.receiveBuffer.length);
    					byteArray = newData;
    					delete this.receiveBuffer;
    				}
    				try {
    					var offset = 0;
    					while(offset < byteArray.length) {
    						var result = decodeMessage(byteArray,offset);
    						var wireMessage = result[0];
    						offset = result[1];
    						if (wireMessage !== null) {
    							messages.push(wireMessage);
    						} else {
    							break;
    						}
    					}
    					if (offset < byteArray.length) {
    						this.receiveBuffer = byteArray.subarray(offset);
    					}
    				} catch (error) {
    					var errorStack = ((error.hasOwnProperty("stack") == "undefined") ? error.stack.toString() : "No Error Stack Available");
    					this._disconnected(ERROR.INTERNAL_ERROR.code , format(ERROR.INTERNAL_ERROR, [error.message,errorStack]));
    					return;
    				}
    				return messages;
    			};

    			ClientImpl.prototype._handleMessage = function(wireMessage) {

    				this._trace("Client._handleMessage", wireMessage);

    				try {
    					switch(wireMessage.type) {
    					case MESSAGE_TYPE.CONNACK:
    						this._connectTimeout.cancel();
    						if (this._reconnectTimeout)
    							this._reconnectTimeout.cancel();

    						// If we have started using clean session then clear up the local state.
    						if (this.connectOptions.cleanSession) {
    							for (var key in this._sentMessages) {
    								var sentMessage = this._sentMessages[key];
    								localStorage.removeItem("Sent:"+this._localKey+sentMessage.messageIdentifier);
    							}
    							this._sentMessages = {};

    							for (var key in this._receivedMessages) {
    								var receivedMessage = this._receivedMessages[key];
    								localStorage.removeItem("Received:"+this._localKey+receivedMessage.messageIdentifier);
    							}
    							this._receivedMessages = {};
    						}
    						// Client connected and ready for business.
    						if (wireMessage.returnCode === 0) {

    							this.connected = true;
    							// Jump to the end of the list of uris and stop looking for a good host.

    							if (this.connectOptions.uris)
    								this.hostIndex = this.connectOptions.uris.length;

    						} else {
    							this._disconnected(ERROR.CONNACK_RETURNCODE.code , format(ERROR.CONNACK_RETURNCODE, [wireMessage.returnCode, CONNACK_RC[wireMessage.returnCode]]));
    							break;
    						}

    						// Resend messages.
    						var sequencedMessages = [];
    						for (var msgId in this._sentMessages) {
    							if (this._sentMessages.hasOwnProperty(msgId))
    								sequencedMessages.push(this._sentMessages[msgId]);
    						}

    						// Also schedule qos 0 buffered messages if any
    						if (this._buffered_msg_queue.length > 0) {
    							var msg = null;
    							while ((msg = this._buffered_msg_queue.pop())) {
    								sequencedMessages.push(msg);
    								if (this.onMessageDelivered)
    									this._notify_msg_sent[msg] = this.onMessageDelivered(msg.payloadMessage);
    							}
    						}

    						// Sort sentMessages into the original sent order.
    						var sequencedMessages = sequencedMessages.sort(function(a,b) {return a.sequence - b.sequence;} );
    						for (var i=0, len=sequencedMessages.length; i<len; i++) {
    							var sentMessage = sequencedMessages[i];
    							if (sentMessage.type == MESSAGE_TYPE.PUBLISH && sentMessage.pubRecReceived) {
    								var pubRelMessage = new WireMessage(MESSAGE_TYPE.PUBREL, {messageIdentifier:sentMessage.messageIdentifier});
    								this._schedule_message(pubRelMessage);
    							} else {
    								this._schedule_message(sentMessage);
    							}
    						}

    						// Execute the connectOptions.onSuccess callback if there is one.
    						// Will also now return if this connection was the result of an automatic
    						// reconnect and which URI was successfully connected to.
    						if (this.connectOptions.onSuccess) {
    							this.connectOptions.onSuccess({invocationContext:this.connectOptions.invocationContext});
    						}

    						var reconnected = false;
    						if (this._reconnecting) {
    							reconnected = true;
    							this._reconnectInterval = 1;
    							this._reconnecting = false;
    						}

    						// Execute the onConnected callback if there is one.
    						this._connected(reconnected, this._wsuri);

    						// Process all queued messages now that the connection is established.
    						this._process_queue();
    						break;

    					case MESSAGE_TYPE.PUBLISH:
    						this._receivePublish(wireMessage);
    						break;

    					case MESSAGE_TYPE.PUBACK:
    						var sentMessage = this._sentMessages[wireMessage.messageIdentifier];
    						// If this is a re flow of a PUBACK after we have restarted receivedMessage will not exist.
    						if (sentMessage) {
    							delete this._sentMessages[wireMessage.messageIdentifier];
    							localStorage.removeItem("Sent:"+this._localKey+wireMessage.messageIdentifier);
    							if (this.onMessageDelivered)
    								this.onMessageDelivered(sentMessage.payloadMessage);
    						}
    						break;

    					case MESSAGE_TYPE.PUBREC:
    						var sentMessage = this._sentMessages[wireMessage.messageIdentifier];
    						// If this is a re flow of a PUBREC after we have restarted receivedMessage will not exist.
    						if (sentMessage) {
    							sentMessage.pubRecReceived = true;
    							var pubRelMessage = new WireMessage(MESSAGE_TYPE.PUBREL, {messageIdentifier:wireMessage.messageIdentifier});
    							this.store("Sent:", sentMessage);
    							this._schedule_message(pubRelMessage);
    						}
    						break;

    					case MESSAGE_TYPE.PUBREL:
    						var receivedMessage = this._receivedMessages[wireMessage.messageIdentifier];
    						localStorage.removeItem("Received:"+this._localKey+wireMessage.messageIdentifier);
    						// If this is a re flow of a PUBREL after we have restarted receivedMessage will not exist.
    						if (receivedMessage) {
    							this._receiveMessage(receivedMessage);
    							delete this._receivedMessages[wireMessage.messageIdentifier];
    						}
    						// Always flow PubComp, we may have previously flowed PubComp but the server lost it and restarted.
    						var pubCompMessage = new WireMessage(MESSAGE_TYPE.PUBCOMP, {messageIdentifier:wireMessage.messageIdentifier});
    						this._schedule_message(pubCompMessage);


    						break;

    					case MESSAGE_TYPE.PUBCOMP:
    						var sentMessage = this._sentMessages[wireMessage.messageIdentifier];
    						delete this._sentMessages[wireMessage.messageIdentifier];
    						localStorage.removeItem("Sent:"+this._localKey+wireMessage.messageIdentifier);
    						if (this.onMessageDelivered)
    							this.onMessageDelivered(sentMessage.payloadMessage);
    						break;

    					case MESSAGE_TYPE.SUBACK:
    						var sentMessage = this._sentMessages[wireMessage.messageIdentifier];
    						if (sentMessage) {
    							if(sentMessage.timeOut)
    								sentMessage.timeOut.cancel();
    							// This will need to be fixed when we add multiple topic support
    							if (wireMessage.returnCode[0] === 0x80) {
    								if (sentMessage.onFailure) {
    									sentMessage.onFailure(wireMessage.returnCode);
    								}
    							} else if (sentMessage.onSuccess) {
    								sentMessage.onSuccess(wireMessage.returnCode);
    							}
    							delete this._sentMessages[wireMessage.messageIdentifier];
    						}
    						break;

    					case MESSAGE_TYPE.UNSUBACK:
    						var sentMessage = this._sentMessages[wireMessage.messageIdentifier];
    						if (sentMessage) {
    							if (sentMessage.timeOut)
    								sentMessage.timeOut.cancel();
    							if (sentMessage.callback) {
    								sentMessage.callback();
    							}
    							delete this._sentMessages[wireMessage.messageIdentifier];
    						}

    						break;

    					case MESSAGE_TYPE.PINGRESP:
    					/* The sendPinger or receivePinger may have sent a ping, the receivePinger has already been reset. */
    						this.sendPinger.reset();
    						break;

    					case MESSAGE_TYPE.DISCONNECT:
    					// Clients do not expect to receive disconnect packets.
    						this._disconnected(ERROR.INVALID_MQTT_MESSAGE_TYPE.code , format(ERROR.INVALID_MQTT_MESSAGE_TYPE, [wireMessage.type]));
    						break;

    					default:
    						this._disconnected(ERROR.INVALID_MQTT_MESSAGE_TYPE.code , format(ERROR.INVALID_MQTT_MESSAGE_TYPE, [wireMessage.type]));
    					}
    				} catch (error) {
    					var errorStack = ((error.hasOwnProperty("stack") == "undefined") ? error.stack.toString() : "No Error Stack Available");
    					this._disconnected(ERROR.INTERNAL_ERROR.code , format(ERROR.INTERNAL_ERROR, [error.message,errorStack]));
    					return;
    				}
    			};

    			/** @ignore */
    			ClientImpl.prototype._on_socket_error = function (error) {
    				if (!this._reconnecting) {
    					this._disconnected(ERROR.SOCKET_ERROR.code , format(ERROR.SOCKET_ERROR, [error.data]));
    				}
    			};

    			/** @ignore */
    			ClientImpl.prototype._on_socket_close = function () {
    				if (!this._reconnecting) {
    					this._disconnected(ERROR.SOCKET_CLOSE.code , format(ERROR.SOCKET_CLOSE));
    				}
    			};

    			/** @ignore */
    			ClientImpl.prototype._socket_send = function (wireMessage) {

    				if (wireMessage.type == 1) {
    					var wireMessageMasked = this._traceMask(wireMessage, "password");
    					this._trace("Client._socket_send", wireMessageMasked);
    				}
    				else this._trace("Client._socket_send", wireMessage);

    				this.socket.send(wireMessage.encode());
    				/* We have proved to the server we are alive. */
    				this.sendPinger.reset();
    			};

    			/** @ignore */
    			ClientImpl.prototype._receivePublish = function (wireMessage) {
    				switch(wireMessage.payloadMessage.qos) {
    				case "undefined":
    				case 0:
    					this._receiveMessage(wireMessage);
    					break;

    				case 1:
    					var pubAckMessage = new WireMessage(MESSAGE_TYPE.PUBACK, {messageIdentifier:wireMessage.messageIdentifier});
    					this._schedule_message(pubAckMessage);
    					this._receiveMessage(wireMessage);
    					break;

    				case 2:
    					this._receivedMessages[wireMessage.messageIdentifier] = wireMessage;
    					this.store("Received:", wireMessage);
    					var pubRecMessage = new WireMessage(MESSAGE_TYPE.PUBREC, {messageIdentifier:wireMessage.messageIdentifier});
    					this._schedule_message(pubRecMessage);

    					break;

    				default:
    					throw Error("Invaild qos=" + wireMessage.payloadMessage.qos);
    				}
    			};

    			/** @ignore */
    			ClientImpl.prototype._receiveMessage = function (wireMessage) {
    				if (this.onMessageArrived) {
    					this.onMessageArrived(wireMessage.payloadMessage);
    				}
    			};

    			/**
    		 * Client has connected.
    		 * @param {reconnect} [boolean] indicate if this was a result of reconnect operation.
    		 * @param {uri} [string] fully qualified WebSocket URI of the server.
    		 */
    			ClientImpl.prototype._connected = function (reconnect, uri) {
    			// Execute the onConnected callback if there is one.
    				if (this.onConnected)
    					this.onConnected(reconnect, uri);
    			};

    			/**
    		 * Attempts to reconnect the client to the server.
    	   * For each reconnect attempt, will double the reconnect interval
    	   * up to 128 seconds.
    		 */
    			ClientImpl.prototype._reconnect = function () {
    				this._trace("Client._reconnect");
    				if (!this.connected) {
    					this._reconnecting = true;
    					this.sendPinger.cancel();
    					this.receivePinger.cancel();
    					if (this._reconnectInterval < 128)
    						this._reconnectInterval = this._reconnectInterval * 2;
    					if (this.connectOptions.uris) {
    						this.hostIndex = 0;
    						this._doConnect(this.connectOptions.uris[0]);
    					} else {
    						this._doConnect(this.uri);
    					}
    				}
    			};

    			/**
    		 * Client has disconnected either at its own request or because the server
    		 * or network disconnected it. Remove all non-durable state.
    		 * @param {errorCode} [number] the error number.
    		 * @param {errorText} [string] the error text.
    		 * @ignore
    		 */
    			ClientImpl.prototype._disconnected = function (errorCode, errorText) {
    				this._trace("Client._disconnected", errorCode, errorText);

    				if (errorCode !== undefined && this._reconnecting) {
    					//Continue automatic reconnect process
    					this._reconnectTimeout = new Timeout(this, this._reconnectInterval, this._reconnect);
    					return;
    				}

    				this.sendPinger.cancel();
    				this.receivePinger.cancel();
    				if (this._connectTimeout) {
    					this._connectTimeout.cancel();
    					this._connectTimeout = null;
    				}

    				// Clear message buffers.
    				this._msg_queue = [];
    				this._buffered_msg_queue = [];
    				this._notify_msg_sent = {};

    				if (this.socket) {
    				// Cancel all socket callbacks so that they cannot be driven again by this socket.
    					this.socket.onopen = null;
    					this.socket.onmessage = null;
    					this.socket.onerror = null;
    					this.socket.onclose = null;
    					if (this.socket.readyState === 1)
    						this.socket.close();
    					delete this.socket;
    				}

    				if (this.connectOptions.uris && this.hostIndex < this.connectOptions.uris.length-1) {
    				// Try the next host.
    					this.hostIndex++;
    					this._doConnect(this.connectOptions.uris[this.hostIndex]);
    				} else {

    					if (errorCode === undefined) {
    						errorCode = ERROR.OK.code;
    						errorText = format(ERROR.OK);
    					}

    					// Run any application callbacks last as they may attempt to reconnect and hence create a new socket.
    					if (this.connected) {
    						this.connected = false;
    						// Execute the connectionLostCallback if there is one, and we were connected.
    						if (this.onConnectionLost) {
    							this.onConnectionLost({errorCode:errorCode, errorMessage:errorText, reconnect:this.connectOptions.reconnect, uri:this._wsuri});
    						}
    						if (errorCode !== ERROR.OK.code && this.connectOptions.reconnect) {
    						// Start automatic reconnect process for the very first time since last successful connect.
    							this._reconnectInterval = 1;
    							this._reconnect();
    							return;
    						}
    					} else {
    					// Otherwise we never had a connection, so indicate that the connect has failed.
    						if (this.connectOptions.mqttVersion === 4 && this.connectOptions.mqttVersionExplicit === false) {
    							this._trace("Failed to connect V4, dropping back to V3");
    							this.connectOptions.mqttVersion = 3;
    							if (this.connectOptions.uris) {
    								this.hostIndex = 0;
    								this._doConnect(this.connectOptions.uris[0]);
    							} else {
    								this._doConnect(this.uri);
    							}
    						} else if(this.connectOptions.onFailure) {
    							this.connectOptions.onFailure({invocationContext:this.connectOptions.invocationContext, errorCode:errorCode, errorMessage:errorText});
    						}
    					}
    				}
    			};

    			/** @ignore */
    			ClientImpl.prototype._trace = function () {
    			// Pass trace message back to client's callback function
    				if (this.traceFunction) {
    					var args = Array.prototype.slice.call(arguments);
    					for (var i in args)
    					{
    						if (typeof args[i] !== "undefined")
    							args.splice(i, 1, JSON.stringify(args[i]));
    					}
    					var record = args.join("");
    					this.traceFunction ({severity: "Debug", message: record	});
    				}

    				//buffer style trace
    				if ( this._traceBuffer !== null ) {
    					for (var i = 0, max = arguments.length; i < max; i++) {
    						if ( this._traceBuffer.length == this._MAX_TRACE_ENTRIES ) {
    							this._traceBuffer.shift();
    						}
    						if (i === 0) this._traceBuffer.push(arguments[i]);
    						else if (typeof arguments[i] === "undefined" ) this._traceBuffer.push(arguments[i]);
    						else this._traceBuffer.push("  "+JSON.stringify(arguments[i]));
    					}
    				}
    			};

    			/** @ignore */
    			ClientImpl.prototype._traceMask = function (traceObject, masked) {
    				var traceObjectMasked = {};
    				for (var attr in traceObject) {
    					if (traceObject.hasOwnProperty(attr)) {
    						if (attr == masked)
    							traceObjectMasked[attr] = "******";
    						else
    							traceObjectMasked[attr] = traceObject[attr];
    					}
    				}
    				return traceObjectMasked;
    			};

    			// ------------------------------------------------------------------------
    			// Public Programming interface.
    			// ------------------------------------------------------------------------

    			/**
    		 * The JavaScript application communicates to the server using a {@link Paho.Client} object.
    		 * <p>
    		 * Most applications will create just one Client object and then call its connect() method,
    		 * however applications can create more than one Client object if they wish.
    		 * In this case the combination of host, port and clientId attributes must be different for each Client object.
    		 * <p>
    		 * The send, subscribe and unsubscribe methods are implemented as asynchronous JavaScript methods
    		 * (even though the underlying protocol exchange might be synchronous in nature).
    		 * This means they signal their completion by calling back to the application,
    		 * via Success or Failure callback functions provided by the application on the method in question.
    		 * Such callbacks are called at most once per method invocation and do not persist beyond the lifetime
    		 * of the script that made the invocation.
    		 * <p>
    		 * In contrast there are some callback functions, most notably <i>onMessageArrived</i>,
    		 * that are defined on the {@link Paho.Client} object.
    		 * These may get called multiple times, and aren't directly related to specific method invocations made by the client.
    		 *
    		 * @name Paho.Client
    		 *
    		 * @constructor
    		 *
    		 * @param {string} host - the address of the messaging server, as a fully qualified WebSocket URI, as a DNS name or dotted decimal IP address.
    		 * @param {number} port - the port number to connect to - only required if host is not a URI
    		 * @param {string} path - the path on the host to connect to - only used if host is not a URI. Default: '/mqtt'.
    		 * @param {string} clientId - the Messaging client identifier, between 1 and 23 characters in length.
    		 *
    		 * @property {string} host - <i>read only</i> the server's DNS hostname or dotted decimal IP address.
    		 * @property {number} port - <i>read only</i> the server's port.
    		 * @property {string} path - <i>read only</i> the server's path.
    		 * @property {string} clientId - <i>read only</i> used when connecting to the server.
    		 * @property {function} onConnectionLost - called when a connection has been lost.
    		 *                            after a connect() method has succeeded.
    		 *                            Establish the call back used when a connection has been lost. The connection may be
    		 *                            lost because the client initiates a disconnect or because the server or network
    		 *                            cause the client to be disconnected. The disconnect call back may be called without
    		 *                            the connectionComplete call back being invoked if, for example the client fails to
    		 *                            connect.
    		 *                            A single response object parameter is passed to the onConnectionLost callback containing the following fields:
    		 *                            <ol>
    		 *                            <li>errorCode
    		 *                            <li>errorMessage
    		 *                            </ol>
    		 * @property {function} onMessageDelivered - called when a message has been delivered.
    		 *                            All processing that this Client will ever do has been completed. So, for example,
    		 *                            in the case of a Qos=2 message sent by this client, the PubComp flow has been received from the server
    		 *                            and the message has been removed from persistent storage before this callback is invoked.
    		 *                            Parameters passed to the onMessageDelivered callback are:
    		 *                            <ol>
    		 *                            <li>{@link Paho.Message} that was delivered.
    		 *                            </ol>
    		 * @property {function} onMessageArrived - called when a message has arrived in this Paho.client.
    		 *                            Parameters passed to the onMessageArrived callback are:
    		 *                            <ol>
    		 *                            <li>{@link Paho.Message} that has arrived.
    		 *                            </ol>
    		 * @property {function} onConnected - called when a connection is successfully made to the server.
    		 *                                  after a connect() method.
    		 *                                  Parameters passed to the onConnected callback are:
    		 *                                  <ol>
    		 *                                  <li>reconnect (boolean) - If true, the connection was the result of a reconnect.</li>
    		 *                                  <li>URI (string) - The URI used to connect to the server.</li>
    		 *                                  </ol>
    		 * @property {boolean} disconnectedPublishing - if set, will enable disconnected publishing in
    		 *                                            in the event that the connection to the server is lost.
    		 * @property {number} disconnectedBufferSize - Used to set the maximum number of messages that the disconnected
    		 *                                             buffer will hold before rejecting new messages. Default size: 5000 messages
    		 * @property {function} trace - called whenever trace is called. TODO
    		 */
    			var Client = function (host, port, path, clientId) {

    				var uri;

    				if (typeof host !== "string")
    					throw new Error(format(ERROR.INVALID_TYPE, [typeof host, "host"]));

    				if (arguments.length == 2) {
    				// host: must be full ws:// uri
    				// port: clientId
    					clientId = port;
    					uri = host;
    					var match = uri.match(/^(wss?):\/\/((\[(.+)\])|([^\/]+?))(:(\d+))?(\/.*)$/);
    					if (match) {
    						host = match[4]||match[2];
    						port = parseInt(match[7]);
    						path = match[8];
    					} else {
    						throw new Error(format(ERROR.INVALID_ARGUMENT,[host,"host"]));
    					}
    				} else {
    					if (arguments.length == 3) {
    						clientId = path;
    						path = "/mqtt";
    					}
    					if (typeof port !== "number" || port < 0)
    						throw new Error(format(ERROR.INVALID_TYPE, [typeof port, "port"]));
    					if (typeof path !== "string")
    						throw new Error(format(ERROR.INVALID_TYPE, [typeof path, "path"]));

    					var ipv6AddSBracket = (host.indexOf(":") !== -1 && host.slice(0,1) !== "[" && host.slice(-1) !== "]");
    					uri = "ws://"+(ipv6AddSBracket?"["+host+"]":host)+":"+port+path;
    				}

    				var clientIdLength = 0;
    				for (var i = 0; i<clientId.length; i++) {
    					var charCode = clientId.charCodeAt(i);
    					if (0xD800 <= charCode && charCode <= 0xDBFF)  {
    						i++; // Surrogate pair.
    					}
    					clientIdLength++;
    				}
    				if (typeof clientId !== "string" || clientIdLength > 65535)
    					throw new Error(format(ERROR.INVALID_ARGUMENT, [clientId, "clientId"]));

    				var client = new ClientImpl(uri, host, port, path, clientId);

    				//Public Properties
    				Object.defineProperties(this,{
    					"host":{
    						get: function() { return host; },
    						set: function() { throw new Error(format(ERROR.UNSUPPORTED_OPERATION)); }
    					},
    					"port":{
    						get: function() { return port; },
    						set: function() { throw new Error(format(ERROR.UNSUPPORTED_OPERATION)); }
    					},
    					"path":{
    						get: function() { return path; },
    						set: function() { throw new Error(format(ERROR.UNSUPPORTED_OPERATION)); }
    					},
    					"uri":{
    						get: function() { return uri; },
    						set: function() { throw new Error(format(ERROR.UNSUPPORTED_OPERATION)); }
    					},
    					"clientId":{
    						get: function() { return client.clientId; },
    						set: function() { throw new Error(format(ERROR.UNSUPPORTED_OPERATION)); }
    					},
    					"onConnected":{
    						get: function() { return client.onConnected; },
    						set: function(newOnConnected) {
    							if (typeof newOnConnected === "function")
    								client.onConnected = newOnConnected;
    							else
    								throw new Error(format(ERROR.INVALID_TYPE, [typeof newOnConnected, "onConnected"]));
    						}
    					},
    					"disconnectedPublishing":{
    						get: function() { return client.disconnectedPublishing; },
    						set: function(newDisconnectedPublishing) {
    							client.disconnectedPublishing = newDisconnectedPublishing;
    						}
    					},
    					"disconnectedBufferSize":{
    						get: function() { return client.disconnectedBufferSize; },
    						set: function(newDisconnectedBufferSize) {
    							client.disconnectedBufferSize = newDisconnectedBufferSize;
    						}
    					},
    					"onConnectionLost":{
    						get: function() { return client.onConnectionLost; },
    						set: function(newOnConnectionLost) {
    							if (typeof newOnConnectionLost === "function")
    								client.onConnectionLost = newOnConnectionLost;
    							else
    								throw new Error(format(ERROR.INVALID_TYPE, [typeof newOnConnectionLost, "onConnectionLost"]));
    						}
    					},
    					"onMessageDelivered":{
    						get: function() { return client.onMessageDelivered; },
    						set: function(newOnMessageDelivered) {
    							if (typeof newOnMessageDelivered === "function")
    								client.onMessageDelivered = newOnMessageDelivered;
    							else
    								throw new Error(format(ERROR.INVALID_TYPE, [typeof newOnMessageDelivered, "onMessageDelivered"]));
    						}
    					},
    					"onMessageArrived":{
    						get: function() { return client.onMessageArrived; },
    						set: function(newOnMessageArrived) {
    							if (typeof newOnMessageArrived === "function")
    								client.onMessageArrived = newOnMessageArrived;
    							else
    								throw new Error(format(ERROR.INVALID_TYPE, [typeof newOnMessageArrived, "onMessageArrived"]));
    						}
    					},
    					"trace":{
    						get: function() { return client.traceFunction; },
    						set: function(trace) {
    							if(typeof trace === "function"){
    								client.traceFunction = trace;
    							}else {
    								throw new Error(format(ERROR.INVALID_TYPE, [typeof trace, "onTrace"]));
    							}
    						}
    					},
    				});

    				/**
    			 * Connect this Messaging client to its server.
    			 *
    			 * @name Paho.Client#connect
    			 * @function
    			 * @param {object} connectOptions - Attributes used with the connection.
    			 * @param {number} connectOptions.timeout - If the connect has not succeeded within this
    			 *                    number of seconds, it is deemed to have failed.
    			 *                    The default is 30 seconds.
    			 * @param {string} connectOptions.userName - Authentication username for this connection.
    			 * @param {string} connectOptions.password - Authentication password for this connection.
    			 * @param {Paho.Message} connectOptions.willMessage - sent by the server when the client
    			 *                    disconnects abnormally.
    			 * @param {number} connectOptions.keepAliveInterval - the server disconnects this client if
    			 *                    there is no activity for this number of seconds.
    			 *                    The default value of 60 seconds is assumed if not set.
    			 * @param {boolean} connectOptions.cleanSession - if true(default) the client and server
    			 *                    persistent state is deleted on successful connect.
    			 * @param {boolean} connectOptions.useSSL - if present and true, use an SSL Websocket connection.
    			 * @param {object} connectOptions.invocationContext - passed to the onSuccess callback or onFailure callback.
    			 * @param {function} connectOptions.onSuccess - called when the connect acknowledgement
    			 *                    has been received from the server.
    			 * A single response object parameter is passed to the onSuccess callback containing the following fields:
    			 * <ol>
    			 * <li>invocationContext as passed in to the onSuccess method in the connectOptions.
    			 * </ol>
    		 * @param {function} connectOptions.onFailure - called when the connect request has failed or timed out.
    			 * A single response object parameter is passed to the onFailure callback containing the following fields:
    			 * <ol>
    			 * <li>invocationContext as passed in to the onFailure method in the connectOptions.
    			 * <li>errorCode a number indicating the nature of the error.
    			 * <li>errorMessage text describing the error.
    			 * </ol>
    		 * @param {array} connectOptions.hosts - If present this contains either a set of hostnames or fully qualified
    			 * WebSocket URIs (ws://iot.eclipse.org:80/ws), that are tried in order in place
    			 * of the host and port paramater on the construtor. The hosts are tried one at at time in order until
    			 * one of then succeeds.
    		 * @param {array} connectOptions.ports - If present the set of ports matching the hosts. If hosts contains URIs, this property
    			 * is not used.
    		 * @param {boolean} connectOptions.reconnect - Sets whether the client will automatically attempt to reconnect
    		 * to the server if the connection is lost.
    		 *<ul>
    		 *<li>If set to false, the client will not attempt to automatically reconnect to the server in the event that the
    		 * connection is lost.</li>
    		 *<li>If set to true, in the event that the connection is lost, the client will attempt to reconnect to the server.
    		 * It will initially wait 1 second before it attempts to reconnect, for every failed reconnect attempt, the delay
    		 * will double until it is at 2 minutes at which point the delay will stay at 2 minutes.</li>
    		 *</ul>
    		 * @param {number} connectOptions.mqttVersion - The version of MQTT to use to connect to the MQTT Broker.
    		 *<ul>
    		 *<li>3 - MQTT V3.1</li>
    		 *<li>4 - MQTT V3.1.1</li>
    		 *</ul>
    		 * @param {boolean} connectOptions.mqttVersionExplicit - If set to true, will force the connection to use the
    		 * selected MQTT Version or will fail to connect.
    		 * @param {array} connectOptions.uris - If present, should contain a list of fully qualified WebSocket uris
    		 * (e.g. ws://iot.eclipse.org:80/ws), that are tried in order in place of the host and port parameter of the construtor.
    		 * The uris are tried one at a time in order until one of them succeeds. Do not use this in conjunction with hosts as
    		 * the hosts array will be converted to uris and will overwrite this property.
    			 * @throws {InvalidState} If the client is not in disconnected state. The client must have received connectionLost
    			 * or disconnected before calling connect for a second or subsequent time.
    			 */
    				this.connect = function (connectOptions) {
    					connectOptions = connectOptions || {} ;
    					validate(connectOptions,  {timeout:"number",
    						userName:"string",
    						password:"string",
    						willMessage:"object",
    						keepAliveInterval:"number",
    						cleanSession:"boolean",
    						useSSL:"boolean",
    						invocationContext:"object",
    						onSuccess:"function",
    						onFailure:"function",
    						hosts:"object",
    						ports:"object",
    						reconnect:"boolean",
    						mqttVersion:"number",
    						mqttVersionExplicit:"boolean",
    						uris: "object"});

    					// If no keep alive interval is set, assume 60 seconds.
    					if (connectOptions.keepAliveInterval === undefined)
    						connectOptions.keepAliveInterval = 60;

    					if (connectOptions.mqttVersion > 4 || connectOptions.mqttVersion < 3) {
    						throw new Error(format(ERROR.INVALID_ARGUMENT, [connectOptions.mqttVersion, "connectOptions.mqttVersion"]));
    					}

    					if (connectOptions.mqttVersion === undefined) {
    						connectOptions.mqttVersionExplicit = false;
    						connectOptions.mqttVersion = 4;
    					} else {
    						connectOptions.mqttVersionExplicit = true;
    					}

    					//Check that if password is set, so is username
    					if (connectOptions.password !== undefined && connectOptions.userName === undefined)
    						throw new Error(format(ERROR.INVALID_ARGUMENT, [connectOptions.password, "connectOptions.password"]));

    					if (connectOptions.willMessage) {
    						if (!(connectOptions.willMessage instanceof Message))
    							throw new Error(format(ERROR.INVALID_TYPE, [connectOptions.willMessage, "connectOptions.willMessage"]));
    						// The will message must have a payload that can be represented as a string.
    						// Cause the willMessage to throw an exception if this is not the case.
    						connectOptions.willMessage.stringPayload = null;

    						if (typeof connectOptions.willMessage.destinationName === "undefined")
    							throw new Error(format(ERROR.INVALID_TYPE, [typeof connectOptions.willMessage.destinationName, "connectOptions.willMessage.destinationName"]));
    					}
    					if (typeof connectOptions.cleanSession === "undefined")
    						connectOptions.cleanSession = true;
    					if (connectOptions.hosts) {

    						if (!(connectOptions.hosts instanceof Array) )
    							throw new Error(format(ERROR.INVALID_ARGUMENT, [connectOptions.hosts, "connectOptions.hosts"]));
    						if (connectOptions.hosts.length <1 )
    							throw new Error(format(ERROR.INVALID_ARGUMENT, [connectOptions.hosts, "connectOptions.hosts"]));

    						var usingURIs = false;
    						for (var i = 0; i<connectOptions.hosts.length; i++) {
    							if (typeof connectOptions.hosts[i] !== "string")
    								throw new Error(format(ERROR.INVALID_TYPE, [typeof connectOptions.hosts[i], "connectOptions.hosts["+i+"]"]));
    							if (/^(wss?):\/\/((\[(.+)\])|([^\/]+?))(:(\d+))?(\/.*)$/.test(connectOptions.hosts[i])) {
    								if (i === 0) {
    									usingURIs = true;
    								} else if (!usingURIs) {
    									throw new Error(format(ERROR.INVALID_ARGUMENT, [connectOptions.hosts[i], "connectOptions.hosts["+i+"]"]));
    								}
    							} else if (usingURIs) {
    								throw new Error(format(ERROR.INVALID_ARGUMENT, [connectOptions.hosts[i], "connectOptions.hosts["+i+"]"]));
    							}
    						}

    						if (!usingURIs) {
    							if (!connectOptions.ports)
    								throw new Error(format(ERROR.INVALID_ARGUMENT, [connectOptions.ports, "connectOptions.ports"]));
    							if (!(connectOptions.ports instanceof Array) )
    								throw new Error(format(ERROR.INVALID_ARGUMENT, [connectOptions.ports, "connectOptions.ports"]));
    							if (connectOptions.hosts.length !== connectOptions.ports.length)
    								throw new Error(format(ERROR.INVALID_ARGUMENT, [connectOptions.ports, "connectOptions.ports"]));

    							connectOptions.uris = [];

    							for (var i = 0; i<connectOptions.hosts.length; i++) {
    								if (typeof connectOptions.ports[i] !== "number" || connectOptions.ports[i] < 0)
    									throw new Error(format(ERROR.INVALID_TYPE, [typeof connectOptions.ports[i], "connectOptions.ports["+i+"]"]));
    								var host = connectOptions.hosts[i];
    								var port = connectOptions.ports[i];

    								var ipv6 = (host.indexOf(":") !== -1);
    								uri = "ws://"+(ipv6?"["+host+"]":host)+":"+port+path;
    								connectOptions.uris.push(uri);
    							}
    						} else {
    							connectOptions.uris = connectOptions.hosts;
    						}
    					}

    					client.connect(connectOptions);
    				};

    				/**
    			 * Subscribe for messages, request receipt of a copy of messages sent to the destinations described by the filter.
    			 *
    			 * @name Paho.Client#subscribe
    			 * @function
    			 * @param {string} filter describing the destinations to receive messages from.
    			 * <br>
    			 * @param {object} subscribeOptions - used to control the subscription
    			 *
    			 * @param {number} subscribeOptions.qos - the maximum qos of any publications sent
    			 *                                  as a result of making this subscription.
    			 * @param {object} subscribeOptions.invocationContext - passed to the onSuccess callback
    			 *                                  or onFailure callback.
    			 * @param {function} subscribeOptions.onSuccess - called when the subscribe acknowledgement
    			 *                                  has been received from the server.
    			 *                                  A single response object parameter is passed to the onSuccess callback containing the following fields:
    			 *                                  <ol>
    			 *                                  <li>invocationContext if set in the subscribeOptions.
    			 *                                  </ol>
    			 * @param {function} subscribeOptions.onFailure - called when the subscribe request has failed or timed out.
    			 *                                  A single response object parameter is passed to the onFailure callback containing the following fields:
    			 *                                  <ol>
    			 *                                  <li>invocationContext - if set in the subscribeOptions.
    			 *                                  <li>errorCode - a number indicating the nature of the error.
    			 *                                  <li>errorMessage - text describing the error.
    			 *                                  </ol>
    			 * @param {number} subscribeOptions.timeout - which, if present, determines the number of
    			 *                                  seconds after which the onFailure calback is called.
    			 *                                  The presence of a timeout does not prevent the onSuccess
    			 *                                  callback from being called when the subscribe completes.
    			 * @throws {InvalidState} if the client is not in connected state.
    			 */
    				this.subscribe = function (filter, subscribeOptions) {
    					if (typeof filter !== "string" && filter.constructor !== Array)
    						throw new Error("Invalid argument:"+filter);
    					subscribeOptions = subscribeOptions || {} ;
    					validate(subscribeOptions,  {qos:"number",
    						invocationContext:"object",
    						onSuccess:"function",
    						onFailure:"function",
    						timeout:"number"
    					});
    					if (subscribeOptions.timeout && !subscribeOptions.onFailure)
    						throw new Error("subscribeOptions.timeout specified with no onFailure callback.");
    					if (typeof subscribeOptions.qos !== "undefined" && !(subscribeOptions.qos === 0 || subscribeOptions.qos === 1 || subscribeOptions.qos === 2 ))
    						throw new Error(format(ERROR.INVALID_ARGUMENT, [subscribeOptions.qos, "subscribeOptions.qos"]));
    					client.subscribe(filter, subscribeOptions);
    				};

    			/**
    			 * Unsubscribe for messages, stop receiving messages sent to destinations described by the filter.
    			 *
    			 * @name Paho.Client#unsubscribe
    			 * @function
    			 * @param {string} filter - describing the destinations to receive messages from.
    			 * @param {object} unsubscribeOptions - used to control the subscription
    			 * @param {object} unsubscribeOptions.invocationContext - passed to the onSuccess callback
    												  or onFailure callback.
    			 * @param {function} unsubscribeOptions.onSuccess - called when the unsubscribe acknowledgement has been received from the server.
    			 *                                    A single response object parameter is passed to the
    			 *                                    onSuccess callback containing the following fields:
    			 *                                    <ol>
    			 *                                    <li>invocationContext - if set in the unsubscribeOptions.
    			 *                                    </ol>
    			 * @param {function} unsubscribeOptions.onFailure called when the unsubscribe request has failed or timed out.
    			 *                                    A single response object parameter is passed to the onFailure callback containing the following fields:
    			 *                                    <ol>
    			 *                                    <li>invocationContext - if set in the unsubscribeOptions.
    			 *                                    <li>errorCode - a number indicating the nature of the error.
    			 *                                    <li>errorMessage - text describing the error.
    			 *                                    </ol>
    			 * @param {number} unsubscribeOptions.timeout - which, if present, determines the number of seconds
    			 *                                    after which the onFailure callback is called. The presence of
    			 *                                    a timeout does not prevent the onSuccess callback from being
    			 *                                    called when the unsubscribe completes
    			 * @throws {InvalidState} if the client is not in connected state.
    			 */
    				this.unsubscribe = function (filter, unsubscribeOptions) {
    					if (typeof filter !== "string" && filter.constructor !== Array)
    						throw new Error("Invalid argument:"+filter);
    					unsubscribeOptions = unsubscribeOptions || {} ;
    					validate(unsubscribeOptions,  {invocationContext:"object",
    						onSuccess:"function",
    						onFailure:"function",
    						timeout:"number"
    					});
    					if (unsubscribeOptions.timeout && !unsubscribeOptions.onFailure)
    						throw new Error("unsubscribeOptions.timeout specified with no onFailure callback.");
    					client.unsubscribe(filter, unsubscribeOptions);
    				};

    				/**
    			 * Send a message to the consumers of the destination in the Message.
    			 *
    			 * @name Paho.Client#send
    			 * @function
    			 * @param {string|Paho.Message} topic - <b>mandatory</b> The name of the destination to which the message is to be sent.
    			 * 					   - If it is the only parameter, used as Paho.Message object.
    			 * @param {String|ArrayBuffer} payload - The message data to be sent.
    			 * @param {number} qos The Quality of Service used to deliver the message.
    			 * 		<dl>
    			 * 			<dt>0 Best effort (default).
    			 *     			<dt>1 At least once.
    			 *     			<dt>2 Exactly once.
    			 * 		</dl>
    			 * @param {Boolean} retained If true, the message is to be retained by the server and delivered
    			 *                     to both current and future subscriptions.
    			 *                     If false the server only delivers the message to current subscribers, this is the default for new Messages.
    			 *                     A received message has the retained boolean set to true if the message was published
    			 *                     with the retained boolean set to true
    			 *                     and the subscrption was made after the message has been published.
    			 * @throws {InvalidState} if the client is not connected.
    			 */
    				this.send = function (topic,payload,qos,retained) {
    					var message ;

    					if(arguments.length === 0){
    						throw new Error("Invalid argument."+"length");

    					}else if(arguments.length == 1) {

    						if (!(topic instanceof Message) && (typeof topic !== "string"))
    							throw new Error("Invalid argument:"+ typeof topic);

    						message = topic;
    						if (typeof message.destinationName === "undefined")
    							throw new Error(format(ERROR.INVALID_ARGUMENT,[message.destinationName,"Message.destinationName"]));
    						client.send(message);

    					}else {
    					//parameter checking in Message object
    						message = new Message(payload);
    						message.destinationName = topic;
    						if(arguments.length >= 3)
    							message.qos = qos;
    						if(arguments.length >= 4)
    							message.retained = retained;
    						client.send(message);
    					}
    				};

    				/**
    			 * Publish a message to the consumers of the destination in the Message.
    			 * Synonym for Paho.Mqtt.Client#send
    			 *
    			 * @name Paho.Client#publish
    			 * @function
    			 * @param {string|Paho.Message} topic - <b>mandatory</b> The name of the topic to which the message is to be published.
    			 * 					   - If it is the only parameter, used as Paho.Message object.
    			 * @param {String|ArrayBuffer} payload - The message data to be published.
    			 * @param {number} qos The Quality of Service used to deliver the message.
    			 * 		<dl>
    			 * 			<dt>0 Best effort (default).
    			 *     			<dt>1 At least once.
    			 *     			<dt>2 Exactly once.
    			 * 		</dl>
    			 * @param {Boolean} retained If true, the message is to be retained by the server and delivered
    			 *                     to both current and future subscriptions.
    			 *                     If false the server only delivers the message to current subscribers, this is the default for new Messages.
    			 *                     A received message has the retained boolean set to true if the message was published
    			 *                     with the retained boolean set to true
    			 *                     and the subscrption was made after the message has been published.
    			 * @throws {InvalidState} if the client is not connected.
    			 */
    				this.publish = function(topic,payload,qos,retained) {
    					var message ;

    					if(arguments.length === 0){
    						throw new Error("Invalid argument."+"length");

    					}else if(arguments.length == 1) {

    						if (!(topic instanceof Message) && (typeof topic !== "string"))
    							throw new Error("Invalid argument:"+ typeof topic);

    						message = topic;
    						if (typeof message.destinationName === "undefined")
    							throw new Error(format(ERROR.INVALID_ARGUMENT,[message.destinationName,"Message.destinationName"]));
    						client.send(message);

    					}else {
    						//parameter checking in Message object
    						message = new Message(payload);
    						message.destinationName = topic;
    						if(arguments.length >= 3)
    							message.qos = qos;
    						if(arguments.length >= 4)
    							message.retained = retained;
    						client.send(message);
    					}
    				};

    				/**
    			 * Normal disconnect of this Messaging client from its server.
    			 *
    			 * @name Paho.Client#disconnect
    			 * @function
    			 * @throws {InvalidState} if the client is already disconnected.
    			 */
    				this.disconnect = function () {
    					client.disconnect();
    				};

    				/**
    			 * Get the contents of the trace log.
    			 *
    			 * @name Paho.Client#getTraceLog
    			 * @function
    			 * @return {Object[]} tracebuffer containing the time ordered trace records.
    			 */
    				this.getTraceLog = function () {
    					return client.getTraceLog();
    				};

    				/**
    			 * Start tracing.
    			 *
    			 * @name Paho.Client#startTrace
    			 * @function
    			 */
    				this.startTrace = function () {
    					client.startTrace();
    				};

    				/**
    			 * Stop tracing.
    			 *
    			 * @name Paho.Client#stopTrace
    			 * @function
    			 */
    				this.stopTrace = function () {
    					client.stopTrace();
    				};

    				this.isConnected = function() {
    					return client.connected;
    				};
    			};

    			/**
    		 * An application message, sent or received.
    		 * <p>
    		 * All attributes may be null, which implies the default values.
    		 *
    		 * @name Paho.Message
    		 * @constructor
    		 * @param {String|ArrayBuffer} payload The message data to be sent.
    		 * <p>
    		 * @property {string} payloadString <i>read only</i> The payload as a string if the payload consists of valid UTF-8 characters.
    		 * @property {ArrayBuffer} payloadBytes <i>read only</i> The payload as an ArrayBuffer.
    		 * <p>
    		 * @property {string} destinationName <b>mandatory</b> The name of the destination to which the message is to be sent
    		 *                    (for messages about to be sent) or the name of the destination from which the message has been received.
    		 *                    (for messages received by the onMessage function).
    		 * <p>
    		 * @property {number} qos The Quality of Service used to deliver the message.
    		 * <dl>
    		 *     <dt>0 Best effort (default).
    		 *     <dt>1 At least once.
    		 *     <dt>2 Exactly once.
    		 * </dl>
    		 * <p>
    		 * @property {Boolean} retained If true, the message is to be retained by the server and delivered
    		 *                     to both current and future subscriptions.
    		 *                     If false the server only delivers the message to current subscribers, this is the default for new Messages.
    		 *                     A received message has the retained boolean set to true if the message was published
    		 *                     with the retained boolean set to true
    		 *                     and the subscrption was made after the message has been published.
    		 * <p>
    		 * @property {Boolean} duplicate <i>read only</i> If true, this message might be a duplicate of one which has already been received.
    		 *                     This is only set on messages received from the server.
    		 *
    		 */
    			var Message = function (newPayload) {
    				var payload;
    				if (   typeof newPayload === "string" ||
    			newPayload instanceof ArrayBuffer ||
    			(ArrayBuffer.isView(newPayload) && !(newPayload instanceof DataView))
    				) {
    					payload = newPayload;
    				} else {
    					throw (format(ERROR.INVALID_ARGUMENT, [newPayload, "newPayload"]));
    				}

    				var destinationName;
    				var qos = 0;
    				var retained = false;
    				var duplicate = false;

    				Object.defineProperties(this,{
    					"payloadString":{
    						enumerable : true,
    						get : function () {
    							if (typeof payload === "string")
    								return payload;
    							else
    								return parseUTF8(payload, 0, payload.length);
    						}
    					},
    					"payloadBytes":{
    						enumerable: true,
    						get: function() {
    							if (typeof payload === "string") {
    								var buffer = new ArrayBuffer(UTF8Length(payload));
    								var byteStream = new Uint8Array(buffer);
    								stringToUTF8(payload, byteStream, 0);

    								return byteStream;
    							} else {
    								return payload;
    							}
    						}
    					},
    					"destinationName":{
    						enumerable: true,
    						get: function() { return destinationName; },
    						set: function(newDestinationName) {
    							if (typeof newDestinationName === "string")
    								destinationName = newDestinationName;
    							else
    								throw new Error(format(ERROR.INVALID_ARGUMENT, [newDestinationName, "newDestinationName"]));
    						}
    					},
    					"qos":{
    						enumerable: true,
    						get: function() { return qos; },
    						set: function(newQos) {
    							if (newQos === 0 || newQos === 1 || newQos === 2 )
    								qos = newQos;
    							else
    								throw new Error("Invalid argument:"+newQos);
    						}
    					},
    					"retained":{
    						enumerable: true,
    						get: function() { return retained; },
    						set: function(newRetained) {
    							if (typeof newRetained === "boolean")
    								retained = newRetained;
    							else
    								throw new Error(format(ERROR.INVALID_ARGUMENT, [newRetained, "newRetained"]));
    						}
    					},
    					"topic":{
    						enumerable: true,
    						get: function() { return destinationName; },
    						set: function(newTopic) {destinationName=newTopic;}
    					},
    					"duplicate":{
    						enumerable: true,
    						get: function() { return duplicate; },
    						set: function(newDuplicate) {duplicate=newDuplicate;}
    					}
    				});
    			};

    			// Module contents.
    			return {
    				Client: Client,
    				Message: Message
    			};
    		// eslint-disable-next-line no-nested-ternary
    		})(typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    		return PahoMQTT;
    	});
    } (pahoMqtt$1));

    var pahoMqtt = pahoMqttExports;

    var Paho = /*#__PURE__*/_mergeNamespaces({
        __proto__: null,
        default: pahoMqtt
    }, [pahoMqttExports]);

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* src\components\PowerSlider.svelte generated by Svelte v3.58.0 */

    const { console: console_1 } = globals;
    const file = "src\\components\\PowerSlider.svelte";

    function create_fragment$1(ctx) {
    	let template;
    	let div;
    	let input;
    	let t0;
    	let p;
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			template = element("template");
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			p = element("p");
    			t1 = text("Power: ");
    			t2 = text(/*$power*/ ctx[0]);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", "100");
    			attr_dev(input, "step", "1");
    			add_location(input, file, 43, 4, 1278);
    			add_location(p, file, 44, 4, 1381);
    			add_location(div, file, 42, 2, 1267);
    			add_location(template, file, 41, 0, 1253);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, template, anchor);
    			append_dev(template.content, div);
    			append_dev(div, input);
    			set_input_value(input, /*$power*/ ctx[0]);
    			append_dev(div, t0);
    			append_dev(div, p);
    			append_dev(p, t1);
    			append_dev(p, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_input_handler*/ ctx[3]),
    					listen_dev(input, "input", /*input_change_input_handler*/ ctx[3]),
    					listen_dev(input, "input", /*handleSliderChange*/ ctx[2], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$power*/ 1) {
    				set_input_value(input, /*$power*/ ctx[0]);
    			}

    			if (dirty & /*$power*/ 1) set_data_dev(t2, /*$power*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(template);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const topic = 'power';

    function onConnectionLost(responseObject) {
    	if (responseObject.errorCode !== 0) {
    		console.log('Connection lost:', responseObject.errorMessage);
    	}
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $power;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PowerSlider', slots, []);
    	const power = writable(0);
    	validate_store(power, 'power');
    	component_subscribe($$self, power, value => $$invalidate(0, $power = value));

    	// Generate a unique client ID for this client
    	const clientId = `clientId-${Math.random().toString(16).substr(2, 8)}`;

    	// Create a new MQTT client and connect to the Mosquitto Test server
    	const client = new pahoMqttExports.Client('test.mosquitto.org', 8080, clientId);

    	client.onConnectionLost = onConnectionLost;
    	client.onMessageArrived = onMessageArrived;
    	client.connect({ onSuccess: onConnect });

    	function onConnect() {
    		console.log('Connected to MQTT server');
    		client.subscribe(topic);
    	}

    	function onMessageArrived(message) {
    		if (message.destinationName === topic) {
    			power.set(parseInt(message.payloadString));
    		}
    	}

    	// Send updates to the MQTT server when the slider is moved
    	function handleSliderChange(event) {
    		const message = new pahoMqttExports.Message(event.target.value);
    		message.destinationName = topic;
    		client.send(message);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<PowerSlider> was created with unknown prop '${key}'`);
    	});

    	function input_change_input_handler() {
    		$power = to_number(this.value);
    		power.set($power);
    	}

    	$$self.$capture_state = () => ({
    		Paho,
    		writable,
    		topic,
    		power,
    		clientId,
    		client,
    		onConnect,
    		onConnectionLost,
    		onMessageArrived,
    		handleSliderChange,
    		$power
    	});

    	return [$power, power, handleSliderChange, input_change_input_handler];
    }

    class PowerSlider extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PowerSlider",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.58.0 */

    function create_fragment(ctx) {
    	let powerslider;
    	let current;
    	powerslider = new PowerSlider({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(powerslider.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(powerslider, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(powerslider.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(powerslider.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(powerslider, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ PowerSlider });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
