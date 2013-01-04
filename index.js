var q = require('when')
//var deferred = requireI('deferred')

module.exports = adLoad
module.exports.timeout = 7000

var pendingPackages = []
var loadedPackages = []

function adLoad(require) {

	return function (package, module, opts) {
		opts || (opts = {})

		if (loadedPackages[package]) {
			return q.reject()
		}

		pendingPackages[package] = true

		var promise = loadScript(package, opts.timeout).then(function () {
			delete pendingPackages[package]
			loadedPackages[package] = true

			return require(module)
		})

		return promise
	}
}

var head = document.getElementsByTagName('head')[0]

function loadScript(src, timeoutLength) {
	var deferred = q.defer()

	var timeout = setTimeout(function() {
		deferred.reject(new Error('ETIMEOUT - ' + src))
	}, timeoutLength || module.exports.timeout)

	var script = document.createElement('script')
	script.setAttribute('src', src)
	script.async = true

	head.appendChild(script)

	script.onload = function () {
		clearTimeout(timeout)
		deferred.resolve()
	}
	script.onerror = function (e) {
		clearTimeout(timeout)
		deferred.reject(e)
	}

	// for IE:
	script.onreadystatechange = function () {
		if (script.readyState === 'loaded' || script.readyState === 'complete') {
			clearTimeout(timeout)
			deferred.resolve()
		}
	}

	return deferred.promise
}