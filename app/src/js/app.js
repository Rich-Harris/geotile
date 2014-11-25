import Main from 'ractive_components/main';
import get from 'utils/get';

var app = {
	view: new Main({
		el: 'main',
		data: {
			features: []
		}
	})
};

get( 'sample/110m.json' ).then( JSON.parse ).then( function ( data ) {
	app.view.push( 'features', data );
	console.log( 'data', data );
});

export default app;
