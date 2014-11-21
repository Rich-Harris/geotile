var assert = require( 'assert' );

var comparators = {
	Polygon: function ( actual, expected ) {
		var i = expected.length;

		assert.equal( i, actual.length );

		while ( i-- ) {
			comparators.ring( expected[i], actual[i] );
		}
	},

	LineString: function ( actual, expected ) {
		var i = expected.length;

		assert.equal( actual.length, i );

		// find index of `expected` that corresponds to `actual[0]`
		while ( i-- ) {
			if ( comparePoints( expected[i], actual[0] ) ) {
				break;
			}
		}

		if ( i ) {
			expected = expected.slice( i ).concat( expected.slice( 0, i ) );
		}

		assert.deepEqual( expected, actual );
	},

	MultiPolygon: function ( actual, expected ) {
		var i = expected.length;

		assert.equal( actual.length, i );

		cycleMultiPolygon( actual );
		cycleMultiPolygon( expected );

		assert.deepEqual( actual, expected );
	},

	MultiLineString: function ( actual, expected ) {
		var i = expected.length;

		assert.equal( actual.length, i );

		while ( i-- ) {
			comparators.LineString( actual[i], expected[i] );
		}
	},

	ring: function ( actual, expected ) {
		var i;

		assert.equal( expected.length, actual.length );

		assert.deepEqual( expected[0], expected.pop() );
		assert.deepEqual( actual[0], actual.pop() );

		comparators.LineString( actual, expected );
	}
};

module.exports = function compareGeometry ( actual, expected ) {
	assert.equal( expected.type, actual.type );
	comparators[ expected.type ]( expected.coordinates, actual.coordinates );
};

function comparePoints ( a, b ) {
	return a[0] === b[0] && a[1] === b[1];
}

function cycleMultiPolygon ( multiPolygon ) {
	multiPolygon.forEach( cyclePolygon );

	multiPolygon.sort( function ( a, b ) {
		return ( a[0][0][1] - b[0][0][1] ) || ( a[0][0][0] - b[0][0][0] );
	});
}

function cyclePolygon ( polygon ) {
	polygon.forEach( cycleRing );
}

function cycleRing ( ring ) {
	var north = -Infinity, east = -Infinity, i, index;

	assert.deepEqual( ring[0], ring.pop() );

	// find north-easternmost point, make that the first item
	i = ring.length;
	while ( i-- ) {
		point = ring[i];

		if ( point[1] > north ) {
			north = point[1];
			east = point[0];
			index = i;
		}

		else if ( point[1] === north && point[0] > east ) {
			east = point[0];
			index = i;
		}
	}

	if ( index ) {
		ring.splice.apply( ring, [ 0, 0 ].concat( ring.splice( index ) ) );
	}
}
