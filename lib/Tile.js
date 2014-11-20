var Tile = function ( options ) {
	this.north = options.north;
	this.east = options.east;
	this.south = options.south;
	this.west = options.west;

	this.width = this.east - this.west;
	this.lon = ( this.east + this.west ) / 2;

	this.features = [];

	this.outline = options.outline;
};

Tile.prototype = {
	addFeature: function ( feature ) {
		// don't bother if tile is outside bounding box
		if ( feature.bbox[0] > this.east || feature.bbox[2] < this.west ) {
			return;
		}

		switch ( feature.geometry.type ) {
			case 'MultiPolygon':
				this._addMultiPolygon( feature );
				break;

			case 'Polygon':
				this._addPolygon( feature );
				break;

			case 'MultiLineString':
				this._addMultiLineString( feature );
				break;

			default:
				throw new Error( 'Unsupported feature type (' + feature.geometry.type + ')' );
		}
	},

	contains: function ( point ) {
		return point[0] >= this.west &&
			   point[0] <= this.east &&
			   point[1] >= this.south &&
			   point[1] <= this.north;
	},

	toJSON: function () {
		var features;

		if ( this.outline ) {
			features = this.features.concat({
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [
						[ [ this.west, this.south ], [ this.west, this.north ], [ this.east, this.north ], [ this.east, this.south ], [ this.west, this.south ] ]
					]
				},
				className: 'outline'
			});
		} else {
			features = this.features
		}

		return {
			type: 'FeatureCollection',
			bbox: [ this.west, this.south, this.east, this.north ],
			features: features
		};
	},

	toString: function () {
		return JSON.stringify( this.toJSON() )/*.replace( /\d\.\d+/g, function ( match ) {
			return Number( match ).toFixed( 3 );
		});*/
	},

	_addMultiLineString: function ( feature ) {
		var self = this, lines, clonedFeature;

		lines = feature.geometry.coordinates.map( function ( line ) {
			return constrainLine( self, line );
		}).filter( Boolean );

		if ( !lines.length ) {
			return;
		}

		clonedFeature = deepClone( feature, [ 'coordinates' ]);
		clonedFeature.geometry.coordinates = lines;

		this.features.push( clonedFeature );
	},

	_addMultiPolygon: function ( feature ) {
		var self = this, multiPolygon, clonedFeature;

		multiPolygon = feature.geometry.coordinates.map( function ( polygon ) {
			return constrainPolygon( self, polygon );
		}).filter( Boolean );

		if ( !multiPolygon.length ) {
			return;
		}

		clonedFeature = deepClone( feature, [ 'coordinates' ]);
		clonedFeature.geometry.coordinates = multiPolygon;

		this.features.push( clonedFeature );
	},

	_addPolygon: function ( feature ) {
		var polygon, clonedFeature;

		polygon = constrainPolygon( this, feature.geometry.coordinates );

		if ( !polygon ) {
			return;
		}

		clonedFeature = deepClone( feature, [ 'coordinates' ]);
		clonedFeature.geometry.coordinates = polygon;

		this.features.push( clonedFeature );
	},

	_findIntersection: function ( a, b ) {
		var gradient;

		gradient = ( b[1] - a[1] ) / ( b[0] - a[0] );

		// does it cross the northern boundary between the east and west boundaries?
		if ( a[1] <= this.north && b[1] >= this.north || a[1] >= this.north && b[1] <= this.north ) {
			var northernCrossingEasting = a[0] + ( ( this.north - a[1] ) / gradient );

			if ( northernCrossingEasting >= this.west && northernCrossingEasting <= this.east ) {
				//console.log( 'crosses northern boundary (%s) at', this.north, northernCrossingEasting, a, b );
				return {
					edge: {
						type: 'northing',
						value: this.north
					},
					point: [ northernCrossingEasting, this.north ]
				};
			}
		}

		if ( a[1] <= this.south && b[1] >= this.south || a[1] >= this.south && b[1] <= this.south ) {
			var southernCrossingEasting = a[0] + ( ( this.south - a[1] ) / gradient );

			if ( southernCrossingEasting >= this.west && southernCrossingEasting <= this.east ) {
				//console.log( 'crosses southern boundary (%s) at', this.north, southernCrossingEasting, a, b );
				return {
					edge: {
						type: 'northing',
						value: this.south
					},
					point: [ southernCrossingEasting, this.south ]
				};
			}
		}

		if ( a[0] <= this.west && b[0] >= this.west || a[0] >= this.west && b[0] <= this.west ) {
			var westernCrossingNorthing = a[1] + ( ( this.west - a[0] ) * gradient );

			if ( westernCrossingNorthing >= this.south && westernCrossingNorthing <= this.north ) {
				//console.log( 'crosses western boundary (%s) at', this.west, westernCrossingNorthing, a, b );
				return {
					edge: {
						type: 'easting',
						value: this.west
					},
					point: [ this.west, westernCrossingNorthing ]
				};
			}
		}

		if ( a[0] <= this.east && b[0] >= this.east || a[0] >= this.east && b[0] <= this.east ) {
			var easternCrossingNorthing = a[1] + ( ( this.east - a[0] ) * gradient );

			if ( easternCrossingNorthing >= this.south && easternCrossingNorthing <= this.north ) {
				//console.log( 'crosses eastern boundary (%s) at', this.east, easternCrossingNorthing, a, b );
				return {
					edge: {
						type: 'easting',
						value: this.east
					},
					point: [ this.east, easternCrossingNorthing ]
				};
			}
		}
	},

	_add: function ( target, coords, isHole ) {
		var self = this,
			result = [],
			last,
			west = ( ( this.west + 360 ) % 360 ),
			east = ( this.east + 360 ) % 360;

		coords.forEach( function ( point ) {
			var clamped, backOne, backTwo;

			clamped = clamp( point, self, west, east );

			backOne = result[ result.length - 1 ];
			backTwo = result[ result.length - 2 ];

			if ( backOne && ( clamped[0] === backOne[0] && clamped[1] === backOne[1] ) ) {
				return;
			}

			// are the last three points on the same edge? if so, discard the middle
			if ( ( !!backOne && !!backTwo ) && ( ( clamped[0] === backOne[0] && backOne[0] === backTwo[0] ) || ( clamped[1] === backOne[1] && backOne[1] === backTwo[1] ) ) ) {
				result.pop();
			}

			// is THIS the middle of a straight line?
			if ( backOne && backTwo && result[0] && ( ( clamped[0] === backOne[0] && clamped[0] === result[0][0] ) || ( clamped[1] === backOne[1] && clamped[1] === result[0][1] ) ) ) {
				return;
			}

			result.push( clamped );
		});

		if ( result.length > 2 ) {
			last = result[ result.length - 1 ];
			if ( ( result[0][0] === result[1][0] && result[1][0] === last[0] ) || ( result[0][1] === result[1][1] && result[1][1] === last[1] ) ) {
				result.shift();
			}

			// if the result is clockwise, and it's an outer ring, great. otherwise
			// we've taken geometry from the wrong side of the planet
			if ( isClockwise( result ) ) {
				if ( isHole ) return;
			} else if ( !isHole ) {
				return;
			}

			result.push( result[0] );
			target.push( result );
		}
	}
};

module.exports = Tile;

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

function deepClone ( obj, blacklist ) {
	var key, clone;

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
			if ( !~blacklist.indexOf( key ) && obj.hasOwnProperty( key ) ) {
				clone[ key ] = deepClone( obj[ key ], blacklist );
			}
		}
	}

	return clone;
}

function constrainPolygon ( tile, coordinates ) {
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
			result.push( intersection.point );
		}

		lastPoint = point;
		lastPointWasContained = pointIsContained;

		clamped = clamp( point, tile, west, east );

		backOne = result[ result.length - 1 ];
		backTwo = result[ result.length - 2 ];

		if ( backOne && ( clamped[0] === backOne[0] && clamped[1] === backOne[1] ) ) {
			return;
		}

		// are the last three points on the same edge? if so, discard the middle
		if ( ( !!backOne && !!backTwo ) && ( ( clamped[0] === backOne[0] && backOne[0] === backTwo[0] ) || ( clamped[1] === backOne[1] && backOne[1] === backTwo[1] ) ) ) {
			result.pop();
		}

		// is THIS the middle of a straight line?
		if ( backOne && backTwo && result[0] && ( ( clamped[0] === backOne[0] && clamped[0] === result[0][0] ) || ( clamped[1] === backOne[1] && clamped[1] === result[0][1] ) ) ) {
			return;
		}

		result.push( clamped );
	});

	if ( result.length > 2 ) {
		last = result[ result.length - 1 ];
		if ( ( result[0][0] === result[1][0] && result[1][0] === last[0] ) || ( result[0][1] === result[1][1] && result[1][1] === last[1] ) ) {
			result.shift();
		}

		// if the result is clockwise, and it's an outer ring, great. otherwise
		// we've taken geometry from the wrong side of the planet
		if ( isClockwise( result ) ) {
			if ( isHole ) return;
		} else if ( !isHole ) {
			return;
		}

		result.push( result[0] );
		return result;
	}
}

function constrainLine ( tile, line ) {
	var result = [],
		lastPoint,
		lastPointWasContained;

	line.forEach( function ( point ) {
		var pointIsContained;

		pointIsContained = tile.contains( point );

		if ( pointIsContained ) {
			if ( !!lastPoint && !lastPointWasContained ) {
				result.push( tile._findIntersection( point, lastPoint ).point );
			}

			result.push( point );
		}

		else {
			if ( !!lastPoint && lastPointWasContained ) {
				result.push( tile._findIntersection( point, lastPoint ).point );
			}
		}

		lastPoint = point;
		lastPointWasContained = pointIsContained;
	});

	if ( result.length ) {
		return result;
	}
}
