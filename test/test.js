var test = require('tape')

test('browsars', function (t) {
	t.plan(1)
	t.ok('localStorage' in window)
	t.end()
})


test('loads a module in another package', function (t) {

	t.plan(3)

	adLoad = require('../index.js')(require)

	t.equal('function', typeof adLoad)

	adLoad('y.js', './y-src').then(function (y) {
		t.equal('function', typeof y)
		t.equal(6, y(2,3))
		t.equal(false, true)
		t.end()
	})
})
