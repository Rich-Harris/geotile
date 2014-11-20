import Source from './Source';
import deepClone from './deepClone';

export default function geotile ( data ) {
	if ( Array.isArray( data ) ) {
		data = {
			type: 'FeatureCollection',
			features: data
		};
	}

	return new Source( deepClone( data ) );
}
