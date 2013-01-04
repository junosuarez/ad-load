var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",Function(['require','module','exports','__dirname','__filename','process','global'],"function filter (xs, fn) {\n    var res = [];\n    for (var i = 0; i < xs.length; i++) {\n        if (fn(xs[i], i, xs)) res.push(xs[i]);\n    }\n    return res;\n}\n\n// resolves . and .. elements in a path array with directory names there\n// must be no slashes, empty elements, or device names (c:\\) in the array\n// (so also no leading and trailing slashes - it does not distinguish\n// relative and absolute paths)\nfunction normalizeArray(parts, allowAboveRoot) {\n  // if the path tries to go above the root, `up` ends up > 0\n  var up = 0;\n  for (var i = parts.length; i >= 0; i--) {\n    var last = parts[i];\n    if (last == '.') {\n      parts.splice(i, 1);\n    } else if (last === '..') {\n      parts.splice(i, 1);\n      up++;\n    } else if (up) {\n      parts.splice(i, 1);\n      up--;\n    }\n  }\n\n  // if the path is allowed to go above the root, restore leading ..s\n  if (allowAboveRoot) {\n    for (; up--; up) {\n      parts.unshift('..');\n    }\n  }\n\n  return parts;\n}\n\n// Regex to split a filename into [*, dir, basename, ext]\n// posix version\nvar splitPathRe = /^(.+\\/(?!$)|\\/)?((?:.+?)?(\\.[^.]*)?)$/;\n\n// path.resolve([from ...], to)\n// posix version\nexports.resolve = function() {\nvar resolvedPath = '',\n    resolvedAbsolute = false;\n\nfor (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {\n  var path = (i >= 0)\n      ? arguments[i]\n      : process.cwd();\n\n  // Skip empty and invalid entries\n  if (typeof path !== 'string' || !path) {\n    continue;\n  }\n\n  resolvedPath = path + '/' + resolvedPath;\n  resolvedAbsolute = path.charAt(0) === '/';\n}\n\n// At this point the path should be resolved to a full absolute path, but\n// handle relative paths to be safe (might happen when process.cwd() fails)\n\n// Normalize the path\nresolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {\n    return !!p;\n  }), !resolvedAbsolute).join('/');\n\n  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';\n};\n\n// path.normalize(path)\n// posix version\nexports.normalize = function(path) {\nvar isAbsolute = path.charAt(0) === '/',\n    trailingSlash = path.slice(-1) === '/';\n\n// Normalize the path\npath = normalizeArray(filter(path.split('/'), function(p) {\n    return !!p;\n  }), !isAbsolute).join('/');\n\n  if (!path && !isAbsolute) {\n    path = '.';\n  }\n  if (path && trailingSlash) {\n    path += '/';\n  }\n  \n  return (isAbsolute ? '/' : '') + path;\n};\n\n\n// posix version\nexports.join = function() {\n  var paths = Array.prototype.slice.call(arguments, 0);\n  return exports.normalize(filter(paths, function(p, index) {\n    return p && typeof p === 'string';\n  }).join('/'));\n};\n\n\nexports.dirname = function(path) {\n  var dir = splitPathRe.exec(path)[1] || '';\n  var isWindows = false;\n  if (!dir) {\n    // No dirname\n    return '.';\n  } else if (dir.length === 1 ||\n      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {\n    // It is just a slash or a drive letter with a slash\n    return dir;\n  } else {\n    // It is a full dirname, strip trailing slash\n    return dir.substring(0, dir.length - 1);\n  }\n};\n\n\nexports.basename = function(path, ext) {\n  var f = splitPathRe.exec(path)[2] || '';\n  // TODO: make this comparison case-insensitive on windows?\n  if (ext && f.substr(-1 * ext.length) === ext) {\n    f = f.substr(0, f.length - ext.length);\n  }\n  return f;\n};\n\n\nexports.extname = function(path) {\n  return splitPathRe.exec(path)[3] || '';\n};\n\n//@ sourceURL=path"
));

require.define("__browserify_process",Function(['require','module','exports','__dirname','__filename','process','global'],"var process = module.exports = {};\n\nprocess.nextTick = (function () {\n    var canSetImmediate = typeof window !== 'undefined'\n        && window.setImmediate;\n    var canPost = typeof window !== 'undefined'\n        && window.postMessage && window.addEventListener\n    ;\n\n    if (canSetImmediate) {\n        return function (f) { return window.setImmediate(f) };\n    }\n\n    if (canPost) {\n        var queue = [];\n        window.addEventListener('message', function (ev) {\n            if (ev.source === window && ev.data === 'browserify-tick') {\n                ev.stopPropagation();\n                if (queue.length > 0) {\n                    var fn = queue.shift();\n                    fn();\n                }\n            }\n        }, true);\n\n        return function nextTick(fn) {\n            queue.push(fn);\n            window.postMessage('browserify-tick', '*');\n        };\n    }\n\n    return function nextTick(fn) {\n        setTimeout(fn, 0);\n    };\n})();\n\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\n\nprocess.binding = function (name) {\n    if (name === 'evals') return (require)('vm')\n    else throw new Error('No such module. (Possibly not yet loaded)')\n};\n\n(function () {\n    var cwd = '/';\n    var path;\n    process.cwd = function () { return cwd };\n    process.chdir = function (dir) {\n        if (!path) path = require('path');\n        cwd = path.resolve(dir, cwd);\n    };\n})();\n\n//@ sourceURL=__browserify_process"
));

require.define("/node_modules/when/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"when\"}\n//@ sourceURL=/node_modules/when/package.json"
));

require.define("/node_modules/when/when.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/** @license MIT License (c) copyright B Cavalier & J Hann */\n\n/**\n * A lightweight CommonJS Promises/A and when() implementation\n * when is part of the cujo.js family of libraries (http://cujojs.com/)\n *\n * Licensed under the MIT License at:\n * http://www.opensource.org/licenses/mit-license.php\n *\n * @version 1.7.1\n */\n\n(function(define) { 'use strict';\ndefine(function () {\n\tvar reduceArray, slice, undef;\n\n\t//\n\t// Public API\n\t//\n\n\twhen.defer     = defer;     // Create a deferred\n\twhen.resolve   = resolve;   // Create a resolved promise\n\twhen.reject    = reject;    // Create a rejected promise\n\n\twhen.join      = join;      // Join 2 or more promises\n\n\twhen.all       = all;       // Resolve a list of promises\n\twhen.map       = map;       // Array.map() for promises\n\twhen.reduce    = reduce;    // Array.reduce() for promises\n\n\twhen.any       = any;       // One-winner race\n\twhen.some      = some;      // Multi-winner race\n\n\twhen.chain     = chain;     // Make a promise trigger another resolver\n\n\twhen.isPromise = isPromise; // Determine if a thing is a promise\n\n\t/**\n\t * Register an observer for a promise or immediate value.\n\t *\n\t * @param {*} promiseOrValue\n\t * @param {function?} [onFulfilled] callback to be called when promiseOrValue is\n\t *   successfully fulfilled.  If promiseOrValue is an immediate value, callback\n\t *   will be invoked immediately.\n\t * @param {function?} [onRejected] callback to be called when promiseOrValue is\n\t *   rejected.\n\t * @param {function?} [onProgress] callback to be called when progress updates\n\t *   are issued for promiseOrValue.\n\t * @returns {Promise} a new {@link Promise} that will complete with the return\n\t *   value of callback or errback or the completion value of promiseOrValue if\n\t *   callback and/or errback is not supplied.\n\t */\n\tfunction when(promiseOrValue, onFulfilled, onRejected, onProgress) {\n\t\t// Get a trusted promise for the input promiseOrValue, and then\n\t\t// register promise handlers\n\t\treturn resolve(promiseOrValue).then(onFulfilled, onRejected, onProgress);\n\t}\n\n\t/**\n\t * Returns promiseOrValue if promiseOrValue is a {@link Promise}, a new Promise if\n\t * promiseOrValue is a foreign promise, or a new, already-fulfilled {@link Promise}\n\t * whose value is promiseOrValue if promiseOrValue is an immediate value.\n\t *\n\t * @param {*} promiseOrValue\n\t * @returns Guaranteed to return a trusted Promise.  If promiseOrValue is a when.js {@link Promise}\n\t *   returns promiseOrValue, otherwise, returns a new, already-resolved, when.js {@link Promise}\n\t *   whose resolution value is:\n\t *   * the resolution value of promiseOrValue if it's a foreign promise, or\n\t *   * promiseOrValue if it's a value\n\t */\n\tfunction resolve(promiseOrValue) {\n\t\tvar promise, deferred;\n\n\t\tif(promiseOrValue instanceof Promise) {\n\t\t\t// It's a when.js promise, so we trust it\n\t\t\tpromise = promiseOrValue;\n\n\t\t} else {\n\t\t\t// It's not a when.js promise. See if it's a foreign promise or a value.\n\t\t\tif(isPromise(promiseOrValue)) {\n\t\t\t\t// It's a thenable, but we don't know where it came from, so don't trust\n\t\t\t\t// its implementation entirely.  Introduce a trusted middleman when.js promise\n\t\t\t\tdeferred = defer();\n\n\t\t\t\t// IMPORTANT: This is the only place when.js should ever call .then() on an\n\t\t\t\t// untrusted promise. Don't expose the return value to the untrusted promise\n\t\t\t\tpromiseOrValue.then(\n\t\t\t\t\tfunction(value)  { deferred.resolve(value); },\n\t\t\t\t\tfunction(reason) { deferred.reject(reason); },\n\t\t\t\t\tfunction(update) { deferred.progress(update); }\n\t\t\t\t);\n\n\t\t\t\tpromise = deferred.promise;\n\n\t\t\t} else {\n\t\t\t\t// It's a value, not a promise.  Create a resolved promise for it.\n\t\t\t\tpromise = fulfilled(promiseOrValue);\n\t\t\t}\n\t\t}\n\n\t\treturn promise;\n\t}\n\n\t/**\n\t * Returns a rejected promise for the supplied promiseOrValue.  The returned\n\t * promise will be rejected with:\n\t * - promiseOrValue, if it is a value, or\n\t * - if promiseOrValue is a promise\n\t *   - promiseOrValue's value after it is fulfilled\n\t *   - promiseOrValue's reason after it is rejected\n\t * @param {*} promiseOrValue the rejected value of the returned {@link Promise}\n\t * @return {Promise} rejected {@link Promise}\n\t */\n\tfunction reject(promiseOrValue) {\n\t\treturn when(promiseOrValue, rejected);\n\t}\n\n\t/**\n\t * Trusted Promise constructor.  A Promise created from this constructor is\n\t * a trusted when.js promise.  Any other duck-typed promise is considered\n\t * untrusted.\n\t * @constructor\n\t * @name Promise\n\t */\n\tfunction Promise(then) {\n\t\tthis.then = then;\n\t}\n\n\tPromise.prototype = {\n\t\t/**\n\t\t * Register a callback that will be called when a promise is\n\t\t * fulfilled or rejected.  Optionally also register a progress handler.\n\t\t * Shortcut for .then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress)\n\t\t * @param {function?} [onFulfilledOrRejected]\n\t\t * @param {function?} [onProgress]\n\t\t * @return {Promise}\n\t\t */\n\t\talways: function(onFulfilledOrRejected, onProgress) {\n\t\t\treturn this.then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress);\n\t\t},\n\n\t\t/**\n\t\t * Register a rejection handler.  Shortcut for .then(undefined, onRejected)\n\t\t * @param {function?} onRejected\n\t\t * @return {Promise}\n\t\t */\n\t\totherwise: function(onRejected) {\n\t\t\treturn this.then(undef, onRejected);\n\t\t},\n\n\t\t/**\n\t\t * Shortcut for .then(function() { return value; })\n\t\t * @param  {*} value\n\t\t * @return {Promise} a promise that:\n\t\t *  - is fulfilled if value is not a promise, or\n\t\t *  - if value is a promise, will fulfill with its value, or reject\n\t\t *    with its reason.\n\t\t */\n\t\tyield: function(value) {\n\t\t\treturn this.then(function() {\n\t\t\t\treturn value;\n\t\t\t});\n\t\t},\n\n\t\t/**\n\t\t * Assumes that this promise will fulfill with an array, and arranges\n\t\t * for the onFulfilled to be called with the array as its argument list\n\t\t * i.e. onFulfilled.spread(undefined, array).\n\t\t * @param {function} onFulfilled function to receive spread arguments\n\t\t * @return {Promise}\n\t\t */\n\t\tspread: function(onFulfilled) {\n\t\t\treturn this.then(function(array) {\n\t\t\t\t// array may contain promises, so resolve its contents.\n\t\t\t\treturn all(array, function(array) {\n\t\t\t\t\treturn onFulfilled.apply(undef, array);\n\t\t\t\t});\n\t\t\t});\n\t\t}\n\t};\n\n\t/**\n\t * Create an already-resolved promise for the supplied value\n\t * @private\n\t *\n\t * @param {*} value\n\t * @return {Promise} fulfilled promise\n\t */\n\tfunction fulfilled(value) {\n\t\tvar p = new Promise(function(onFulfilled) {\n\t\t\t// TODO: Promises/A+ check typeof onFulfilled\n\t\t\ttry {\n\t\t\t\treturn resolve(onFulfilled ? onFulfilled(value) : value);\n\t\t\t} catch(e) {\n\t\t\t\treturn rejected(e);\n\t\t\t}\n\t\t});\n\n\t\treturn p;\n\t}\n\n\t/**\n\t * Create an already-rejected {@link Promise} with the supplied\n\t * rejection reason.\n\t * @private\n\t *\n\t * @param {*} reason\n\t * @return {Promise} rejected promise\n\t */\n\tfunction rejected(reason) {\n\t\tvar p = new Promise(function(_, onRejected) {\n\t\t\t// TODO: Promises/A+ check typeof onRejected\n\t\t\ttry {\n\t\t\t\treturn onRejected ? resolve(onRejected(reason)) : rejected(reason);\n\t\t\t} catch(e) {\n\t\t\t\treturn rejected(e);\n\t\t\t}\n\t\t});\n\n\t\treturn p;\n\t}\n\n\t/**\n\t * Creates a new, Deferred with fully isolated resolver and promise parts,\n\t * either or both of which may be given out safely to consumers.\n\t * The Deferred itself has the full API: resolve, reject, progress, and\n\t * then. The resolver has resolve, reject, and progress.  The promise\n\t * only has then.\n\t *\n\t * @return {Deferred}\n\t */\n\tfunction defer() {\n\t\tvar deferred, promise, handlers, progressHandlers,\n\t\t\t_then, _progress, _resolve;\n\n\t\t/**\n\t\t * The promise for the new deferred\n\t\t * @type {Promise}\n\t\t */\n\t\tpromise = new Promise(then);\n\n\t\t/**\n\t\t * The full Deferred object, with {@link Promise} and {@link Resolver} parts\n\t\t * @class Deferred\n\t\t * @name Deferred\n\t\t */\n\t\tdeferred = {\n\t\t\tthen:     then, // DEPRECATED: use deferred.promise.then\n\t\t\tresolve:  promiseResolve,\n\t\t\treject:   promiseReject,\n\t\t\t// TODO: Consider renaming progress() to notify()\n\t\t\tprogress: promiseProgress,\n\n\t\t\tpromise:  promise,\n\n\t\t\tresolver: {\n\t\t\t\tresolve:  promiseResolve,\n\t\t\t\treject:   promiseReject,\n\t\t\t\tprogress: promiseProgress\n\t\t\t}\n\t\t};\n\n\t\thandlers = [];\n\t\tprogressHandlers = [];\n\n\t\t/**\n\t\t * Pre-resolution then() that adds the supplied callback, errback, and progback\n\t\t * functions to the registered listeners\n\t\t * @private\n\t\t *\n\t\t * @param {function?} [onFulfilled] resolution handler\n\t\t * @param {function?} [onRejected] rejection handler\n\t\t * @param {function?} [onProgress] progress handler\n\t\t */\n\t\t_then = function(onFulfilled, onRejected, onProgress) {\n\t\t\t// TODO: Promises/A+ check typeof onFulfilled, onRejected, onProgress\n\t\t\tvar deferred, progressHandler;\n\n\t\t\tdeferred = defer();\n\n\t\t\tprogressHandler = typeof onProgress === 'function'\n\t\t\t\t? function(update) {\n\t\t\t\t\ttry {\n\t\t\t\t\t\t// Allow progress handler to transform progress event\n\t\t\t\t\t\tdeferred.progress(onProgress(update));\n\t\t\t\t\t} catch(e) {\n\t\t\t\t\t\t// Use caught value as progress\n\t\t\t\t\t\tdeferred.progress(e);\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\t: function(update) { deferred.progress(update); };\n\n\t\t\thandlers.push(function(promise) {\n\t\t\t\tpromise.then(onFulfilled, onRejected)\n\t\t\t\t\t.then(deferred.resolve, deferred.reject, progressHandler);\n\t\t\t});\n\n\t\t\tprogressHandlers.push(progressHandler);\n\n\t\t\treturn deferred.promise;\n\t\t};\n\n\t\t/**\n\t\t * Issue a progress event, notifying all progress listeners\n\t\t * @private\n\t\t * @param {*} update progress event payload to pass to all listeners\n\t\t */\n\t\t_progress = function(update) {\n\t\t\tprocessQueue(progressHandlers, update);\n\t\t\treturn update;\n\t\t};\n\n\t\t/**\n\t\t * Transition from pre-resolution state to post-resolution state, notifying\n\t\t * all listeners of the resolution or rejection\n\t\t * @private\n\t\t * @param {*} value the value of this deferred\n\t\t */\n\t\t_resolve = function(value) {\n\t\t\tvalue = resolve(value);\n\n\t\t\t// Replace _then with one that directly notifies with the result.\n\t\t\t_then = value.then;\n\t\t\t// Replace _resolve so that this Deferred can only be resolved once\n\t\t\t_resolve = resolve;\n\t\t\t// Make _progress a noop, to disallow progress for the resolved promise.\n\t\t\t_progress = noop;\n\n\t\t\t// Notify handlers\n\t\t\tprocessQueue(handlers, value);\n\n\t\t\t// Free progressHandlers array since we'll never issue progress events\n\t\t\tprogressHandlers = handlers = undef;\n\n\t\t\treturn value;\n\t\t};\n\n\t\treturn deferred;\n\n\t\t/**\n\t\t * Wrapper to allow _then to be replaced safely\n\t\t * @param {function?} [onFulfilled] resolution handler\n\t\t * @param {function?} [onRejected] rejection handler\n\t\t * @param {function?} [onProgress] progress handler\n\t\t * @return {Promise} new promise\n\t\t */\n\t\tfunction then(onFulfilled, onRejected, onProgress) {\n\t\t\t// TODO: Promises/A+ check typeof onFulfilled, onRejected, onProgress\n\t\t\treturn _then(onFulfilled, onRejected, onProgress);\n\t\t}\n\n\t\t/**\n\t\t * Wrapper to allow _resolve to be replaced\n\t\t */\n\t\tfunction promiseResolve(val) {\n\t\t\treturn _resolve(val);\n\t\t}\n\n\t\t/**\n\t\t * Wrapper to allow _reject to be replaced\n\t\t */\n\t\tfunction promiseReject(err) {\n\t\t\treturn _resolve(rejected(err));\n\t\t}\n\n\t\t/**\n\t\t * Wrapper to allow _progress to be replaced\n\t\t */\n\t\tfunction promiseProgress(update) {\n\t\t\treturn _progress(update);\n\t\t}\n\t}\n\n\t/**\n\t * Determines if promiseOrValue is a promise or not.  Uses the feature\n\t * test from http://wiki.commonjs.org/wiki/Promises/A to determine if\n\t * promiseOrValue is a promise.\n\t *\n\t * @param {*} promiseOrValue anything\n\t * @returns {boolean} true if promiseOrValue is a {@link Promise}\n\t */\n\tfunction isPromise(promiseOrValue) {\n\t\treturn promiseOrValue && typeof promiseOrValue.then === 'function';\n\t}\n\n\t/**\n\t * Initiates a competitive race, returning a promise that will resolve when\n\t * howMany of the supplied promisesOrValues have resolved, or will reject when\n\t * it becomes impossible for howMany to resolve, for example, when\n\t * (promisesOrValues.length - howMany) + 1 input promises reject.\n\t *\n\t * @param {Array} promisesOrValues array of anything, may contain a mix\n\t *      of promises and values\n\t * @param howMany {number} number of promisesOrValues to resolve\n\t * @param {function?} [onFulfilled] resolution handler\n\t * @param {function?} [onRejected] rejection handler\n\t * @param {function?} [onProgress] progress handler\n\t * @returns {Promise} promise that will resolve to an array of howMany values that\n\t * resolved first, or will reject with an array of (promisesOrValues.length - howMany) + 1\n\t * rejection reasons.\n\t */\n\tfunction some(promisesOrValues, howMany, onFulfilled, onRejected, onProgress) {\n\n\t\tcheckCallbacks(2, arguments);\n\n\t\treturn when(promisesOrValues, function(promisesOrValues) {\n\n\t\t\tvar toResolve, toReject, values, reasons, deferred, fulfillOne, rejectOne, progress, len, i;\n\n\t\t\tlen = promisesOrValues.length >>> 0;\n\n\t\t\ttoResolve = Math.max(0, Math.min(howMany, len));\n\t\t\tvalues = [];\n\n\t\t\ttoReject = (len - toResolve) + 1;\n\t\t\treasons = [];\n\n\t\t\tdeferred = defer();\n\n\t\t\t// No items in the input, resolve immediately\n\t\t\tif (!toResolve) {\n\t\t\t\tdeferred.resolve(values);\n\n\t\t\t} else {\n\t\t\t\tprogress = deferred.progress;\n\n\t\t\t\trejectOne = function(reason) {\n\t\t\t\t\treasons.push(reason);\n\t\t\t\t\tif(!--toReject) {\n\t\t\t\t\t\tfulfillOne = rejectOne = noop;\n\t\t\t\t\t\tdeferred.reject(reasons);\n\t\t\t\t\t}\n\t\t\t\t};\n\n\t\t\t\tfulfillOne = function(val) {\n\t\t\t\t\t// This orders the values based on promise resolution order\n\t\t\t\t\t// Another strategy would be to use the original position of\n\t\t\t\t\t// the corresponding promise.\n\t\t\t\t\tvalues.push(val);\n\n\t\t\t\t\tif (!--toResolve) {\n\t\t\t\t\t\tfulfillOne = rejectOne = noop;\n\t\t\t\t\t\tdeferred.resolve(values);\n\t\t\t\t\t}\n\t\t\t\t};\n\n\t\t\t\tfor(i = 0; i < len; ++i) {\n\t\t\t\t\tif(i in promisesOrValues) {\n\t\t\t\t\t\twhen(promisesOrValues[i], fulfiller, rejecter, progress);\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\n\t\t\treturn deferred.then(onFulfilled, onRejected, onProgress);\n\n\t\t\tfunction rejecter(reason) {\n\t\t\t\trejectOne(reason);\n\t\t\t}\n\n\t\t\tfunction fulfiller(val) {\n\t\t\t\tfulfillOne(val);\n\t\t\t}\n\n\t\t});\n\t}\n\n\t/**\n\t * Initiates a competitive race, returning a promise that will resolve when\n\t * any one of the supplied promisesOrValues has resolved or will reject when\n\t * *all* promisesOrValues have rejected.\n\t *\n\t * @param {Array|Promise} promisesOrValues array of anything, may contain a mix\n\t *      of {@link Promise}s and values\n\t * @param {function?} [onFulfilled] resolution handler\n\t * @param {function?} [onRejected] rejection handler\n\t * @param {function?} [onProgress] progress handler\n\t * @returns {Promise} promise that will resolve to the value that resolved first, or\n\t * will reject with an array of all rejected inputs.\n\t */\n\tfunction any(promisesOrValues, onFulfilled, onRejected, onProgress) {\n\n\t\tfunction unwrapSingleResult(val) {\n\t\t\treturn onFulfilled ? onFulfilled(val[0]) : val[0];\n\t\t}\n\n\t\treturn some(promisesOrValues, 1, unwrapSingleResult, onRejected, onProgress);\n\t}\n\n\t/**\n\t * Return a promise that will resolve only once all the supplied promisesOrValues\n\t * have resolved. The resolution value of the returned promise will be an array\n\t * containing the resolution values of each of the promisesOrValues.\n\t * @memberOf when\n\t *\n\t * @param {Array|Promise} promisesOrValues array of anything, may contain a mix\n\t *      of {@link Promise}s and values\n\t * @param {function?} [onFulfilled] resolution handler\n\t * @param {function?} [onRejected] rejection handler\n\t * @param {function?} [onProgress] progress handler\n\t * @returns {Promise}\n\t */\n\tfunction all(promisesOrValues, onFulfilled, onRejected, onProgress) {\n\t\tcheckCallbacks(1, arguments);\n\t\treturn map(promisesOrValues, identity).then(onFulfilled, onRejected, onProgress);\n\t}\n\n\t/**\n\t * Joins multiple promises into a single returned promise.\n\t * @return {Promise} a promise that will fulfill when *all* the input promises\n\t * have fulfilled, or will reject when *any one* of the input promises rejects.\n\t */\n\tfunction join(/* ...promises */) {\n\t\treturn map(arguments, identity);\n\t}\n\n\t/**\n\t * Traditional map function, similar to `Array.prototype.map()`, but allows\n\t * input to contain {@link Promise}s and/or values, and mapFunc may return\n\t * either a value or a {@link Promise}\n\t *\n\t * @param {Array|Promise} promise array of anything, may contain a mix\n\t *      of {@link Promise}s and values\n\t * @param {function} mapFunc mapping function mapFunc(value) which may return\n\t *      either a {@link Promise} or value\n\t * @returns {Promise} a {@link Promise} that will resolve to an array containing\n\t *      the mapped output values.\n\t */\n\tfunction map(promise, mapFunc) {\n\t\treturn when(promise, function(array) {\n\t\t\tvar results, len, toResolve, resolve, i, d;\n\n\t\t\t// Since we know the resulting length, we can preallocate the results\n\t\t\t// array to avoid array expansions.\n\t\t\ttoResolve = len = array.length >>> 0;\n\t\t\tresults = [];\n\t\t\td = defer();\n\n\t\t\tif(!toResolve) {\n\t\t\t\td.resolve(results);\n\t\t\t} else {\n\n\t\t\t\tresolve = function resolveOne(item, i) {\n\t\t\t\t\twhen(item, mapFunc).then(function(mapped) {\n\t\t\t\t\t\tresults[i] = mapped;\n\n\t\t\t\t\t\tif(!--toResolve) {\n\t\t\t\t\t\t\td.resolve(results);\n\t\t\t\t\t\t}\n\t\t\t\t\t}, d.reject);\n\t\t\t\t};\n\n\t\t\t\t// Since mapFunc may be async, get all invocations of it into flight\n\t\t\t\tfor(i = 0; i < len; i++) {\n\t\t\t\t\tif(i in array) {\n\t\t\t\t\t\tresolve(array[i], i);\n\t\t\t\t\t} else {\n\t\t\t\t\t\t--toResolve;\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t}\n\n\t\t\treturn d.promise;\n\n\t\t});\n\t}\n\n\t/**\n\t * Traditional reduce function, similar to `Array.prototype.reduce()`, but\n\t * input may contain promises and/or values, and reduceFunc\n\t * may return either a value or a promise, *and* initialValue may\n\t * be a promise for the starting value.\n\t *\n\t * @param {Array|Promise} promise array or promise for an array of anything,\n\t *      may contain a mix of promises and values.\n\t * @param {function} reduceFunc reduce function reduce(currentValue, nextValue, index, total),\n\t *      where total is the total number of items being reduced, and will be the same\n\t *      in each call to reduceFunc.\n\t * @returns {Promise} that will resolve to the final reduced value\n\t */\n\tfunction reduce(promise, reduceFunc /*, initialValue */) {\n\t\tvar args = slice.call(arguments, 1);\n\n\t\treturn when(promise, function(array) {\n\t\t\tvar total;\n\n\t\t\ttotal = array.length;\n\n\t\t\t// Wrap the supplied reduceFunc with one that handles promises and then\n\t\t\t// delegates to the supplied.\n\t\t\targs[0] = function (current, val, i) {\n\t\t\t\treturn when(current, function (c) {\n\t\t\t\t\treturn when(val, function (value) {\n\t\t\t\t\t\treturn reduceFunc(c, value, i, total);\n\t\t\t\t\t});\n\t\t\t\t});\n\t\t\t};\n\n\t\t\treturn reduceArray.apply(array, args);\n\t\t});\n\t}\n\n\t/**\n\t * Ensure that resolution of promiseOrValue will trigger resolver with the\n\t * value or reason of promiseOrValue, or instead with resolveValue if it is provided.\n\t *\n\t * @param promiseOrValue\n\t * @param {Object} resolver\n\t * @param {function} resolver.resolve\n\t * @param {function} resolver.reject\n\t * @param {*} [resolveValue]\n\t * @returns {Promise}\n\t */\n\tfunction chain(promiseOrValue, resolver, resolveValue) {\n\t\tvar useResolveValue = arguments.length > 2;\n\n\t\treturn when(promiseOrValue,\n\t\t\tfunction(val) {\n\t\t\t\tval = useResolveValue ? resolveValue : val;\n\t\t\t\tresolver.resolve(val);\n\t\t\t\treturn val;\n\t\t\t},\n\t\t\tfunction(reason) {\n\t\t\t\tresolver.reject(reason);\n\t\t\t\treturn rejected(reason);\n\t\t\t},\n\t\t\tresolver.progress\n\t\t);\n\t}\n\n\t//\n\t// Utility functions\n\t//\n\n\t/**\n\t * Apply all functions in queue to value\n\t * @param {Array} queue array of functions to execute\n\t * @param {*} value argument passed to each function\n\t */\n\tfunction processQueue(queue, value) {\n\t\tvar handler, i = 0;\n\n\t\twhile (handler = queue[i++]) {\n\t\t\thandler(value);\n\t\t}\n\t}\n\n\t/**\n\t * Helper that checks arrayOfCallbacks to ensure that each element is either\n\t * a function, or null or undefined.\n\t * @private\n\t * @param {number} start index at which to start checking items in arrayOfCallbacks\n\t * @param {Array} arrayOfCallbacks array to check\n\t * @throws {Error} if any element of arrayOfCallbacks is something other than\n\t * a functions, null, or undefined.\n\t */\n\tfunction checkCallbacks(start, arrayOfCallbacks) {\n\t\t// TODO: Promises/A+ update type checking and docs\n\t\tvar arg, i = arrayOfCallbacks.length;\n\n\t\twhile(i > start) {\n\t\t\targ = arrayOfCallbacks[--i];\n\n\t\t\tif (arg != null && typeof arg != 'function') {\n\t\t\t\tthrow new Error('arg '+i+' must be a function');\n\t\t\t}\n\t\t}\n\t}\n\n\t/**\n\t * No-Op function used in method replacement\n\t * @private\n\t */\n\tfunction noop() {}\n\n\tslice = [].slice;\n\n\t// ES5 reduce implementation if native not available\n\t// See: http://es5.github.com/#x15.4.4.21 as there are many\n\t// specifics and edge cases.\n\treduceArray = [].reduce ||\n\t\tfunction(reduceFunc /*, initialValue */) {\n\t\t\t/*jshint maxcomplexity: 7*/\n\n\t\t\t// ES5 dictates that reduce.length === 1\n\n\t\t\t// This implementation deviates from ES5 spec in the following ways:\n\t\t\t// 1. It does not check if reduceFunc is a Callable\n\n\t\t\tvar arr, args, reduced, len, i;\n\n\t\t\ti = 0;\n\t\t\t// This generates a jshint warning, despite being valid\n\t\t\t// \"Missing 'new' prefix when invoking a constructor.\"\n\t\t\t// See https://github.com/jshint/jshint/issues/392\n\t\t\tarr = Object(this);\n\t\t\tlen = arr.length >>> 0;\n\t\t\targs = arguments;\n\n\t\t\t// If no initialValue, use first item of array (we know length !== 0 here)\n\t\t\t// and adjust i to start at second item\n\t\t\tif(args.length <= 1) {\n\t\t\t\t// Skip to the first real element in the array\n\t\t\t\tfor(;;) {\n\t\t\t\t\tif(i in arr) {\n\t\t\t\t\t\treduced = arr[i++];\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\n\t\t\t\t\t// If we reached the end of the array without finding any real\n\t\t\t\t\t// elements, it's a TypeError\n\t\t\t\t\tif(++i >= len) {\n\t\t\t\t\t\tthrow new TypeError();\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t} else {\n\t\t\t\t// If initialValue provided, use it\n\t\t\t\treduced = args[1];\n\t\t\t}\n\n\t\t\t// Do the actual reduce\n\t\t\tfor(;i < len; ++i) {\n\t\t\t\t// Skip holes\n\t\t\t\tif(i in arr) {\n\t\t\t\t\treduced = reduceFunc(reduced, arr[i], i, arr);\n\t\t\t\t}\n\t\t\t}\n\n\t\t\treturn reduced;\n\t\t};\n\n\tfunction identity(x) {\n\t\treturn x;\n\t}\n\n\treturn when;\n});\n})(typeof define == 'function' && define.amd\n\t? define\n\t: function (factory) { typeof exports === 'object'\n\t\t? (module.exports = factory())\n\t\t: (this.when      = factory());\n\t}\n\t// Boilerplate for AMD, Node, and browser global\n);\n\n//@ sourceURL=/node_modules/when/when.js"
));

require.define("/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var q = require('when')\n//var deferred = requireI('deferred')\n\nmodule.exports = adLoad\n\nvar pendingPackages = []\nvar loadedPackages = []\n\nfunction adLoad(require) {\n\n\n\treturn function (package, module) {\n\n\t\tif (loadedPackages[package]) {\n\t\t\treturn q.reject()\n\t\t}\n\n\t\tpendingPackages[package] = true\n\n\t\treturn loadScript(package).then(function () {\n\t\t\tdelete pendingPackages[package]\n\t\t\tloadedPackages[package] = true\n\n\t\t\treturn require(module)\n\t\t})\n\n\t}\n\n}\n\n\nvar head = document.getElementsByTagName('head')[0]\n\nfunction loadScript(src) {\n\tvar deferred = q.defer()\n\n\tvar timeout = setTimeout(function() {\n\t\tdeferred.reject(new Error('ETIMEOUT - ' + src))\n\t}, 1000)\n\n\tvar script = document.createElement('script')\n\tscript.setAttribute('src', src)\n\tscript.async = true\n\n\thead.appendChild(script)\n\n\tscript.onload = function () {\n\t\t//clearTimeout(timeout)\n\t\t//deferred.resolve()\n\t}\n\tscript.onerror = function (e) {\n\t\tclearTimeout(timeout)\n\t\tdeferred.reject(e)\n\t}\n\n\treturn deferred.promise\n}\n//@ sourceURL=/index.js"
));
require("/index.js");
