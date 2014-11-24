var remaining = 20;

var NORTH = 9,
	SOUTH = 6,
	WEST = 12,
	EAST = 3,
	NORTH_EAST = NORTH & EAST,
	NORTH_WEST = NORTH & WEST,
	SOUTH_EAST = SOUTH & EAST,
	SOUTH_WEST = SOUTH & WEST,
	ALL_QUADRANTS = NORTH | SOUTH | EAST | WEST;

var Arc = function () {
	this.points = [];
	this.holes = [];
	this.entry = this.exit = null;
};

Arc.prototype = {
	addHole: function ( hole ) {
		this.holes.push( hole );
	},

	addPoint: function ( point ) {
		this.points.push( point );
		return this;
	},

	containsHole: function ( hole ) {
		console.error( 'TODO' );
		return false;
	},

	entersAt: function ( intersection ) {
		if ( this.entry ) throw new Error( 'huh?' );
		this.entry = intersection;
		this.points.push( intersection.point );
	},

	exitsAt: function ( intersection ) {
		this.exit = intersection;
		this.points.push( intersection.point );
	},

	firstPoint: function () {
		return this.points[0];
	},

	isClosed: function () {
		return pointsCoincide( this.points[0], this.points[ this.points.length - 1 ] );
	},

	hasPoints: function () {
		return !!this.points.length;
	},

	join: function ( precedingArc ) {
		this.entry = precedingArc.entry;
		this.points = precedingArc.points.concat( this.points );
	},

	lastPoint: function () {
		return this.points[ this.points.length - 1 ];
	},

	toPolygon: function () {
		var polygon = [ this.points ];

		this.holes.forEach( function ( hole ) {
			polygon.push( hole.points );
		});

		return polygon;
	}
};

export default function constrainPolygon ( tile, polygon ) {
	var outerRings;

	outerRings = constrainRing( tile, polygon[0], false );

	if ( !outerRings ) {
		return;
	}

	polygon.slice( 1 ).forEach( function ( hole ) {
		var constrainedHoles, i;

		constrainedHoles = constrainRing( tile, hole, true );

		if ( constrainedHoles ) {
			// TODO where polygon and hole share an edge, subtract
			// hole from ring rather than adding as a hole
			constrainedHoles.forEach( findOuterRing );
		}

		function findOuterRing ( hole ) {
			var i = outerRings.length;
			while ( i-- ) {
				if ( outerRings[i].containsHole( hole ) ) {
					outerRings[i].addHole( hole );
					break;
				}
			}
		}
	});

	return outerRings.map( function ( ring ) {
		return ring.toPolygon();
	});
}

function constrainRing ( tile, ring, isHole ) {
	var arcs = [],
		rings = [],
		arc = new Arc(),
		lastPoint,
		lastPointWasContained,
		arcByStart,
		arcByEnd,
		arcA,
		arcB,
		firstArc,
		lastArc,
		i,
		candidates,
		candidate,
		corner,
		closestEntry,
		index,
		direction,
		trackQuadrants = true,
		lastQuadrant = 0,
		visitedQuadrants = 0;

	// Find all arcs inside the tile
	ring.forEach( function ( point ) {
		var pointIsContained, intersection, intersections, quadrant, bearing, travellingClockwise;

		pointIsContained = tile.contains( point );

		if ( pointIsContained ) {
			trackQuadrants = false;

			if ( !!lastPoint && !lastPointWasContained ) {
				intersection = tile._findIntersection( lastPoint, point );
				arc.entersAt( intersection );
			}

			arc.addPoint( point );
		}

		else {
			if ( !!lastPoint ) {
				if ( lastPointWasContained ) {
					intersection = tile._findIntersection( lastPoint, point );
					arc.exitsAt( intersection );

					if ( arc.hasPoints() ) {
						arcs.push( arc );
						arc = new Arc();
					}
				}

				else {
					// neither point was contained - but theoretically, the line
					// could still have crossed the tile, intersecting twice
					intersections = tile._findAllIntersections( lastPoint, point );

					if ( intersections.length ) {
						if ( intersections.length !== 2 ) {
							throw new Error( 'Unexpected number of intersections (' + intersections.length + ')' );
						}

						arc.entersAt( intersections[0] );
						arc.exitsAt( intersections[1] );
						arcs.push( arc );

						arc = new Arc();
					}
				}
			}

			if ( trackQuadrants ) {
				bearing = getBearing([ tile.lon, tile.lat ], point );

				// this algorithm discounts the possibility that a line could cross
				// two quadrants in a single bound
				//quadrant = ( point[0] < tile.lon ? WEST : EAST ) & ( point[1] < tile.lat ? SOUTH : NORTH );
				quadrant = ( bearing < 0 ? WEST : EAST ) & ( Math.abs( bearing ) > Math.PI / 2 ? SOUTH : NORTH );

				if ( quadrant !== lastQuadrant ) {
					travellingClockwise = ( quadrant > lastQuadrant ) || ( lastQuadrant === NORTH_WEST && quadrant === NORTH_EAST );

					if ( ( !isHole && travellingClockwise ) || ( isHole && !travellingClockwise ) ) {
						visitedQuadrants = visitedQuadrants | quadrant;
					} else {
						visitedQuadrants = visitedQuadrants & ~quadrant;
					}
				}

				lastQuadrant = quadrant;
			}
		}

		lastPoint = point;
		lastPointWasContained = pointIsContained;
	});

	if ( arc.hasPoints() ) {
		arcs.push( arc );
	}

	if ( !arcs.length ) {
		// it's possible that the tile is fully enclosed...
		if ( visitedQuadrants === ALL_QUADRANTS ) {
			arc
			.addPoint([ tile.west, tile.south ])
			.addPoint([ tile.west, tile.north ])
			.addPoint([ tile.east, tile.north ])
			.addPoint([ tile.east, tile.south ])
			.addPoint([ tile.west, tile.south ]);

			return [ arc ];
		}

		return;
	}

	firstArc = arcs[0];
	lastArc = arcs[ arcs.length - 1 ];

	// join first and last arc, if applicable
	if ( firstArc !== lastArc && pointsCoincide( firstArc.firstPoint(), lastArc.lastPoint() ) ) {
		lastArc.points.pop();
		firstArc.join( lastArc );
		arcs.pop();
	}

	// take each arc in turn, and find the entry point closest to
	// the exit point, following the winding order of the polygon
	// as a whole
	i = arcs.length;
	while ( i-- ) {
		arc = arcs[i];

		if ( arc.isClosed() ) {
			rings.push( arc );
		} else {
			connectArc( arcs[i] );
		}

		arcs.pop();
	}

	function connectArc ( arc ) {
		var index,
			arcPosition,
			candidatePosition,
			d,
			min = Infinity,
			candidate,
			direction,
			closestEntry,
			i,
			edge;

		while ( true ) {
			edge = arc.exit.edge;

			index = ( edge === 'north' || edge === 'south' ) ? 0 : 1;
			direction = ( edge === 'west' || edge === 'north' ) ? 1 : -1;

			if ( isHole ) {
				direction *= -1;
			}

			arcPosition = arc.exit.point[ index ];

			i = arcs.length;
			while ( i-- ) {
				candidate = arcs[i];

				if ( candidate.entry.edge === edge ) {
					candidatePosition = candidate.entry.point[ index ];
					d = direction * ( candidatePosition - arcPosition );

					if ( d > 0 && d < min ) {
						closestEntry = candidate;
						min = d;
					}
				}
			}

			if ( closestEntry ) {
				if ( closestEntry === arc ) {
					arc.addPoint( closestEntry.entry.point );
					rings.push( arc );
				} else {
					closestEntry.join( arc );
				}

				break;
			}

			// no candidate - need to add a corner
			corner = getCorner( tile, edge, isHole );
			arc.exitsAt( corner );
		}
	}


	function getCandidates ( arc ) {
		var edge = arc.exit.edge,
			index = edge === 'west' || edge === 'east' ? 0 : 1,
			direction = edge === 'north' || edge === 'west' ? 1 : -1;

		if ( isHole ) {
			direction *= -1;
		}

		return arcs.filter( candidate => {
			return (
				candidate.entry.edge === edge &&
				direction * ( candidate.entry.point[ index ] - arc.exit.point[ index ] ) < 0
			);
		}).sort( function ( a, b ) {
			return direction * ( a[ index ] - b[ index ] );
		});
	}

	return rings.length ? rings : null;
}

function getPoints ( arc ) {
	return arc.points;
}

function hash ( point ) {
	return point[0] + '_' + point[1];
}

function pointsCoincide ( a, b ) {
	return a && b && a[0] === b[0] && a[1] === b[1];
}

function getCorner ( tile, edge, isHole ) {
	var corner, newEdge;

	switch ( edge ) {
		case 'north':
			newEdge = isHole ? 'west' : 'east';
			corner = {
				edge: newEdge,
				point: [ tile[ newEdge ], tile.north ]
			};
			break;

		case 'south':
			newEdge = isHole ? 'east' : 'west';
			corner = {
				edge: newEdge,
				point: [ tile[ newEdge ], tile.south ]
			};
			break;

		case 'east':
			newEdge = isHole ? 'north' : 'south';
			corner = {
				edge: newEdge,
				point: [  tile.east, tile[ newEdge ] ]
			};
			break;

		case 'west':
			newEdge = isHole ? 'south' : 'north';
			corner = {
				edge: newEdge,
				point: [  tile.west, tile[ newEdge ] ]
			};
			break;

		default:
			throw new Error( 'lolwut?' );
	}

	return corner;
}

// φ/λ for latitude/longitude in radians

var d2r = Math.PI / 180;

function getBearing ( from, to ) {
	var fromLon = from[0] * d2r,
		toLon = to[0] * d2r,
		fromLat = from[1] * d2r,
		toLat = to[1] * d2r,

		x,
		y,
		bearing;

	y = Math.sin( toLon - fromLon ) * Math.cos( toLat );
	x = Math.cos( fromLat ) * Math.sin( toLat ) -
        Math.sin( fromLat ) * Math.cos( toLat )*Math.cos( toLon - fromLon );

	return Math.atan2( y, x );
}
