export default function deepClone ( obj, blacklist ) {
	var key, i, clone;

	if ( obj == null ) {
		return obj;
	}

	if ( typeof obj !== 'object' ) {
		return obj;
	}

	if ( Array.isArray( obj ) ) {
		clone = [];
		i = obj.length;
		while ( i-- ) {
			clone[i] = deepClone( obj[i], blacklist );
		}
	}

	else {
		clone = {};
		for ( key in obj ) {
			if ( ( !blacklist || !~blacklist.indexOf( key ) ) && obj.hasOwnProperty( key ) ) {
				clone[ key ] = deepClone( obj[ key ], blacklist );
			}
		}
	}

	return clone;
}
