var test = require('tape')

test('browsars', function (t) {
	t.plan(1)
	t.ok('localStorage' in window)
	t.end()
})


test('loads a module in another package', function (t) {

	t.plan(3)

	var timeout = setTimeout(function () {
		t.fail('timeout')
	}, 8000)

	adLoad = require('../index.js')(require)

	t.equal(window.require, require)

	t.equal('function', typeof adLoad, 'fns errywere')

	adLoad('y.js', './y-src').then(function (y) {
		t.equal('function', typeof y, 'yar')
		t.equal(6, y(2,3), 'it werks')
		t.equal(false, true, 'this will fail')
		clearTimeout(timeout)
		t.end()
	}, function (e) {
		t.fail('error back should not occur: ' + e.message)
	})
})
