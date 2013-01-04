var when = require('when')
//var deferred = requireI('deferred')

module.exports = adLoad

var pendingPackages = []
var loadedPackages = []

function adLoad(require) {


	return function (package, module) {
		var deferred = when.defer()

		if (loadedPackages[package]) {
			deferred.reject()
			return deferred.promise
		}

		pendingPackages[package] = true

		loadScript(package).then(function () {
			delete pendingPackages[package]
			loadedPackages[package] = true

			deferred.resolve(require(module))
		})

		return deferred.promise
	}

}


var head = document.getElementsByTagName('head')[0]

function loadScript(src) {
	var deferred = when.defer()

	var timeout = setTimeout(function() {
		deferred.reject(new Error('ETIMEOUT', src))
	}, 7000)

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

	return deferred.promise
}