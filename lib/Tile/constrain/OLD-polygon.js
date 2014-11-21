export default function constrainPolygon ( tile, coordinates ) {
	var result = [], outerRing;

	outerRing = constrainRing( tile, coordinates[0], false );

	if ( !outerRing ) {
		return;
	}

	result = [ outerRing ];

	coordinates.slice( 1 ).forEach( function ( hole ) {
		var constrainedHole = constrainRing( tile, hole, true );

		if ( constrainedHole ) {
			result.push( constrainedHole );
		}
	});

	return result;
}

function constrainRing ( tile, ring, isHole ) {
	var result = [],
		lastPoint,
		lastPointWasContained,
		west = ( ( tile.west + 360 ) % 360 ),
		east = ( tile.east + 360 ) % 360;

	ring.forEach( function ( point ) {
		var pointIsContained, intersection, clamped, backOne, backTwo;

		pointIsContained = tile.contains( point );

		if ( !!lastPoint && ( ( pointIsContained && !lastPointWasContained ) || ( !pointIsContained && lastPointWasContained ) ) ) {
			intersection = tile._findIntersection( point, lastPoint );
			addPoint( intersection.point );
		}

		lastPoint = point;
		lastPointWasContained = pointIsContained;

		clamped = clamp( point, tile, west, east );
		addPoint( clamped );
	});

	function addPoint ( clamped ) {
		var backOne, backTwo;

		backOne = result[ result.length - 1 ];
		backTwo = result[ result.length - 2 ];

		if ( pointsCoincide( clamped, backOne ) ) {
			return;
		}

		// are the last three points on the same edge? if so, discard the middle
		if ( ( !!backOne && !!backTwo ) && ( ( clamped[0] === backOne[0] && backOne[0] === backTwo[0] ) || ( clamped[1] === backOne[1] && backOne[1] === backTwo[1] ) ) ) {
			result.pop();
		}

		// is THIS the middle of a straight line?
		/*if ( backOne && backTwo && result[0] && ( ( clamped[0] === backOne[0] && clamped[0] === result[0][0] ) || ( clamped[1] === backOne[1] && clamped[1] === result[0][1] ) ) ) {
			return;
		}*/

		result.push( clamped );
	}

	if ( result.length > 2 ) {
		lastPoint = result[ result.length - 1 ];
		if ( ( result[0][0] === result[1][0] && result[1][0] === lastPoint[0] ) || ( result[0][1] === result[1][1] && result[1][1] === lastPoint[1] ) ) {
			result.shift();
		}

		// if the result is clockwise, and it's an outer ring, great. otherwise
		// we've taken geometry from the wrong side of the planet
		if ( isClockwise( result ) ) {
			if ( isHole ) return;
		} else if ( !isHole ) {
			return;
		}

		// Close the path
		if ( !pointsCoincide( result[ result.length - 1 ], result[0] ) ) {
			result.push( result[0] );
		}

		return result;
	}
}

function pointsCoincide ( a, b ) {
	return a && b && a[0] === b[0] && a[1] === b[1];
}

function clamp ( point, tile, west, east ) {
	var lat, lon, tileLon, dLon, width = tile.width;

	lat = Math.max( tile.south, Math.min( tile.north, point[1] ) );

	dLon = ( point[0] - tile.lon );

	while ( dLon < -180 ) {
		dLon += 360;
	}

	while ( dLon > 180 ) {
		dLon -= 360;
	}

	if ( point[0] >= tile.west && point[0] <= tile.east ) {
		lon = point[0];
	} else if ( dLon < -width / 2 ) {
		//console.log( '%s is west of (%s-%s)', point[0], tile.west, tile.east );
		lon = tile.west;
	} else if ( dLon > width / 2 ) {
		//console.log( '%s is east of (%s-%s)', point[0], tile.west, tile.east );
		lon = tile.east;
	}

	return [ lon, lat ];
}

function isClockwise ( ring ) {
	var total = 0;

	ring.forEach( function ( point, i ) {
		var nextPoint = ring[ i + 1 ] || ring[0];

		total += ( nextPoint[0] - point[0] ) * ( nextPoint[1] + point[1] );
	});

	return total > 0;
}
