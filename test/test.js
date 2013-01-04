var test = require('tape')

test('loads a module in another package', function (t) {

	t.plan(2)

	adLoad = require('../index.js')(require)

	adLoad('y.js', './y-src').then(function (y) {
		t.equal('function', typeof y)
		t.equal(6, y(2,3))
		t.equal(false, true)
		t.end()
	})
})

test('browsars', function (t) {
	t.plan(1)
	t.ok(localStorage in window)
	t.end()
})