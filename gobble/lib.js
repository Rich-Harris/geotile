var gobble = require( 'gobble' );

gobble.cwd( __dirname, '..' )

module.exports = gobble( 'lib' )
	.transform( 'esperanto-bundle', {
		entry: 'index',
		dest: 'geotile.js',
		type: 'umd',
		name: 'geotile'
	})
	.transform( 'es6-transpiler', {
		globals: { define: true }
	});
