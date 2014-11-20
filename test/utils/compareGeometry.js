var assert = require( 'assert' );

var comparators = {
	Polygon: function ( actual, expected ) {
		var i = expected.length;

		assert.equal( i, actual.length );

		while ( i-- ) {
			comparators.ring( expected[i], actual[i] );
		}
	},

	ring: function ( actual, expected ) {
		var i;

		assert.equal( expected.length, actual.length );

		assert.deepEqual( expected[0], expected.pop() );
		assert.deepEqual( actual[0], actual.pop() );

		// find index of `expected` that corresponds to `actual[0]`
		i = expected.length;
		while ( i-- ) {
			if ( comparePoints( expected[i], actual[0] ) ) {
				break;
			}
		}

		if ( i ) {
			expected = expected.slice( i ).concat( expected.slice( 0, i ) );
		}

		assert.deepEqual( expected, actual );
	}
};

module.exports = function compareGeometry ( actual, expected ) {
	assert.equal( expected.type, actual.type );
	comparators[ expected.type ]( expected.coordinates, actual.coordinates );
};

function comparePoints ( a, b ) {
	return a[0] === b[0] && a[1] === b[1];
}
