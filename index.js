var q = require('when')
//var deferred = requireI('deferred')

module.exports = adLoad

var pendingPackages = []
var loadedPackages = []

function adLoad(require) {


	return function (package, module) {

		if (loadedPackages[package]) {
			return q.reject()
		}

		pendingPackages[package] = true

		return loadScript(package).then(function () {
			delete pendingPackages[package]
			loadedPackages[package] = true

			return require(module)
		})

	}

}


var head = document.getElementsByTagName('head')[0]

function loadScript(src) {
	var deferred = q.defer()

	var timeout = setTimeout(function() {
		deferred.reject(new Error('ETIMEOUT - ' + src))
	}, 1000)

	var script = document.createElement('script')
	script.setAttribute('src', src)
	script.async = true

	head.appendChild(script)

	script.onload = function () {
		//clearTimeout(timeout)
		//deferred.resolve()
	}
	script.onerror = function (e) {
		clearTimeout(timeout)
		deferred.reject(e)
	}

	return deferred.promise
}