var gobble = require( 'gobble' );

module.exports = gobble([

	// files
	gobble( 'src/root' ),

	// styles
	gobble( 'src/styles' ).transform( 'sass', {
		src: 'main.scss',
		dest: 'min.css'
	}),

	// app
	gobble([
		gobble( 'src/js' ),

		gobble( 'src/ractive_components' ).transform( 'ractive', {
			type: 'es6'
		}).moveTo( 'ractive_components' )
	]).transform( 'esperanto-bundle', {
		entry: 'app',
		type: 'umd',
		name: 'app'
	}).transform( 'es6-transpiler', {
		globals: { define: true }
	})

]);
