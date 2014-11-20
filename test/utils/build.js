var promise;

module.exports = function () {
	var libdir;

	if ( !promise ) {
		libdir = require( 'path' ).resolve( __dirname, '../lib' );

		promise = require( 'sander' ).rimraf( libdir ).then( function () {
			var node;

			process.env.GOBBLE_ENV = 'test';

			node = require( '../../gobble/lib' );

			return node.build({
				dest: libdir
			}).then( function () {
				return require( '../lib/geotile' );
			});
		});
	}

	return promise;
};
