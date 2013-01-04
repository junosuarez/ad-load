
require.define("/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"index.js"}
});

require.define("/y-src.js",function(require,module,exports,__dirname,__filename,process,global){module.exports = function (a, b) {
	return a * b
}
});
