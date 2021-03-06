(function (global, factory) {

	'use strict';

	if (typeof define === 'function' && define.amd) {
		// export as AMD
		define([], factory);
	} else if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
		// node/browserify
		module.exports = factory();
	} else {
		// browser global
		global.geotile = factory();
	}

}(typeof window !== 'undefined' ? window : this, function () {

	'use strict';

	var findBoundingBox__default = findBoundingBox__findBoundingBox;
	
	var findBoundingBox__boundingBoxFinders = {
		FeatureCollection: function ( feature ) {
			var bbox = findBoundingBox__initialBbox();
	
			feature.features.forEach( function ( feature ) {
				var childBbox = findBoundingBox__findBoundingBox( feature );
	
				bbox[0] = Math.min( bbox[0], childBbox[0] );
				bbox[1] = Math.min( bbox[1], childBbox[1] );
				bbox[2] = Math.max( bbox[2], childBbox[2] );
				bbox[3] = Math.max( bbox[3], childBbox[3] );
			});
	
			return feature.bbox = bbox;
		},
	
		Polygon: function ( feature ) {
			var bbox = findBoundingBox__initialBbox();
	
			feature.geometry.coordinates.forEach( function ( ring ) {
				ring.forEach( testPoint );
			});
	
			function testPoint ( point ) {
				bbox[0] = Math.min( bbox[0], point[0] );
				bbox[1] = Math.min( bbox[1], point[1] );
				bbox[2] = Math.max( bbox[2], point[0] );
				bbox[3] = Math.max( bbox[3], point[1] );
			}
	
			return feature.bbox = bbox;
		},
	
		MultiPolygon: function ( feature ) {
			var bbox = findBoundingBox__initialBbox();
	
			feature.geometry.coordinates.forEach( function ( polygon ) {
				polygon.forEach( testRing );
			});
	
			function testRing ( ring ) {
				ring.forEach( testPoint );
			}
	
			function testPoint ( point ) {
				bbox[0] = Math.min( bbox[0], point[0] );
				bbox[1] = Math.min( bbox[1], point[1] );
				bbox[2] = Math.max( bbox[2], point[0] );
				bbox[3] = Math.max( bbox[3], point[1] );
			}
	
			return feature.bbox = bbox;
		},
	
		MultiLineString: function ( feature ) {
			var bbox = findBoundingBox__initialBbox();
	
			feature.geometry.coordinates.forEach( function ( line ) {
				line.forEach( testPoint );
			});
	
			function testPoint ( point ) {
				bbox[0] = Math.min( bbox[0], point[0] );
				bbox[1] = Math.min( bbox[1], point[1] );
				bbox[2] = Math.max( bbox[2], point[0] );
				bbox[3] = Math.max( bbox[3], point[1] );
			}
	
			return feature.bbox = bbox;
		},
	
		LineString: function ( feature ) {
			var bbox = findBoundingBox__initialBbox();
	
			feature.geometry.coordinates.forEach( testPoint );
	
			function testPoint ( point ) {
				bbox[0] = Math.min( bbox[0], point[0] );
				bbox[1] = Math.min( bbox[1], point[1] );
				bbox[2] = Math.max( bbox[2], point[0] );
				bbox[3] = Math.max( bbox[3], point[1] );
			}
	
			return feature.bbox = bbox;
		},
	
		Point: function ( feature ) {
			var point = feature.geometry.coordinates,
				bbox = [].concat( point ).concat( point );
	
			feature.bbox = bbox;
			return bbox;
		}
	}
	
	function findBoundingBox__findBoundingBox ( feature ) {
		var bbox = findBoundingBox__boundingBoxFinders[ feature.geometry ? feature.geometry.type : feature.type ]( feature );
		return bbox;
	}
	
	function findBoundingBox__initialBbox () {
		return [ Infinity, Infinity, -Infinity, -Infinity ];
	}

	var Line__Line = function ( pointA, pointB ) {
		var dx, dy;
	
		this.pointA = pointA;
		this.pointB = pointB;
	
		this.dx = dx = pointB[0] - pointA[0];
		this.dy = dy = pointB[1] - pointA[1];
	
		this.vertical = !dx;
		this.horizontal = !dy;
	
		this.gradient = dy / dx;
	
		this.xMin = Math.min( pointA[0], pointB[0] );
		this.xMax = Math.max( pointA[0], pointB[0] );
		this.yMin = Math.min( pointA[1], pointB[1] );
		this.yMax = Math.max( pointA[1], pointB[1] );
	};
	
	Line__Line.prototype = {
		getX: function ( y ) {
			var x;
	
			if ( y < this.yMin || y > this.yMax || this.horizontal ) {
				return null;
			}
	
			x = this.pointA[0] + ( ( y - this.pointA[1] ) / this.gradient );
			return x;
		},
	
		getY: function ( x ) {
			var y;
	
			if ( x < this.xMin || x > this.xMax || this.vertical ) {
				return null;
			}
	
			y = this.pointA[1] + ( ( x - this.pointA[0] ) * this.gradient );
			return y;
		}
	};
	
	var Line__default = Line__Line;

	function deepClone__deepClone ( obj, blacklist ) {
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
				clone[i] = deepClone__deepClone( obj[i], blacklist );
			}
		}
	
		else {
			clone = {};
			for ( key in obj ) {
				if ( ( !blacklist || !~blacklist.indexOf( key ) ) && obj.hasOwnProperty( key ) ) {
					clone[ key ] = deepClone__deepClone( obj[ key ], blacklist );
				}
			}
		}
	
		return clone;
	}
	var deepClone__default = deepClone__deepClone;

	function constrainLine__constrainLine ( tile, line ) {
		var allLines = [],
			currentLine = [],
			lastPoint,
			lastPointWasContained;
	
		line.forEach( function ( point ) {
			var pointIsContained;
	
			pointIsContained = tile.contains( point );
	
			if ( pointIsContained ) {
				if ( !!lastPoint && !lastPointWasContained ) {
					currentLine.push( tile._findIntersection( point, lastPoint ).point );
				}
	
				currentLine.push( point );
			}
	
			else {
				if ( !!lastPoint && lastPointWasContained ) {
					currentLine.push( tile._findIntersection( point, lastPoint ).point );
				}
	
				if ( currentLine.length ) {
					allLines.push( currentLine );
					currentLine = [];
				}
			}
	
			lastPoint = point;
			lastPointWasContained = pointIsContained;
		});
	
		if ( currentLine.length ) {
			allLines.push( currentLine );
		}
	
		if ( allLines.length ) {
			return allLines;
		}
	}
	var constrainLine__default = constrainLine__constrainLine;

	var constrainPolygon__remaining = 20;
	
	var constrainPolygon__NORTH = 9,
		constrainPolygon__SOUTH = 6,
		constrainPolygon__WEST = 12,
		constrainPolygon__EAST = 3,
		constrainPolygon__NORTH_EAST = constrainPolygon__NORTH & constrainPolygon__EAST,
		constrainPolygon__NORTH_WEST = constrainPolygon__NORTH & constrainPolygon__WEST,
		constrainPolygon__SOUTH_EAST = constrainPolygon__SOUTH & constrainPolygon__EAST,
		constrainPolygon__SOUTH_WEST = constrainPolygon__SOUTH & constrainPolygon__WEST,
		constrainPolygon__ALL_QUADRANTS = constrainPolygon__NORTH | constrainPolygon__SOUTH | constrainPolygon__EAST | constrainPolygon__WEST;
	
	var constrainPolygon__Arc = function () {
		this.points = [];
		this.holes = [];
		this.entry = this.exit = null;
	};
	
	constrainPolygon__Arc.prototype = {
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
			return constrainPolygon__pointsCoincide( this.points[0], this.points[ this.points.length - 1 ] );
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
	
	function constrainPolygon__constrainPolygon ( tile, polygon ) {
		var outerRings;
	
		outerRings = constrainPolygon__constrainRing( tile, polygon[0], false );
	
		if ( !outerRings ) {
			return;
		}
	
		polygon.slice( 1 ).forEach( function ( hole ) {
			var constrainedHoles, i;
	
			constrainedHoles = constrainPolygon__constrainRing( tile, hole, true );
	
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
	var constrainPolygon__default = constrainPolygon__constrainPolygon;
	
	function constrainPolygon__constrainRing ( tile, ring, isHole ) {
		var arcs = [],
			rings = [],
			arc = new constrainPolygon__Arc(),
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
							arc = new constrainPolygon__Arc();
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
	
							arc = new constrainPolygon__Arc();
						}
					}
				}
	
				if ( trackQuadrants ) {
					bearing = constrainPolygon__getBearing([ tile.lon, tile.lat ], point );
	
					// this algorithm discounts the possibility that a line could cross
					// two quadrants in a single bound
					quadrant = ( bearing < 0 ? constrainPolygon__WEST : constrainPolygon__EAST ) & ( Math.abs( bearing ) > Math.PI / 2 ? constrainPolygon__SOUTH : constrainPolygon__NORTH );
	
					if ( lastQuadrant && quadrant !== lastQuadrant ) {
						travellingClockwise = ( quadrant > lastQuadrant && ( lastQuadrant !== constrainPolygon__NORTH_EAST || quadrant !== constrainPolygon__NORTH_WEST ) ) || ( lastQuadrant === constrainPolygon__NORTH_WEST && quadrant === constrainPolygon__NORTH_EAST );
	
						if ( ( !isHole && travellingClockwise ) || ( isHole && !travellingClockwise ) ) {
							visitedQuadrants += quadrant;
						} else {
							visitedQuadrants -= lastQuadrant;
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
			if ( visitedQuadrants === constrainPolygon__ALL_QUADRANTS ) {
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
		if ( firstArc !== lastArc && constrainPolygon__pointsCoincide( firstArc.firstPoint(), lastArc.lastPoint() ) ) {
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
				corner = constrainPolygon__getCorner( tile, edge, isHole );
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
	
			return arcs.filter( function(candidate ) {
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
	
	function constrainPolygon__getPoints ( arc ) {
		return arc.points;
	}
	
	function constrainPolygon__hash ( point ) {
		return point[0] + '_' + point[1];
	}
	
	function constrainPolygon__pointsCoincide ( a, b ) {
		return a && b && a[0] === b[0] && a[1] === b[1];
	}
	
	function constrainPolygon__getCorner ( tile, edge, isHole ) {
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
	
	var constrainPolygon__d2r = Math.PI / 180;
	
	function constrainPolygon__getBearing ( from, to ) {
		var fromLon = from[0] * constrainPolygon__d2r,
			toLon = to[0] * constrainPolygon__d2r,
			fromLat = from[1] * constrainPolygon__d2r,
			toLat = to[1] * constrainPolygon__d2r,
	
			x,
			y,
			bearing;
	
		y = Math.sin( toLon - fromLon ) * Math.cos( toLat );
		x = Math.cos( fromLat ) * Math.sin( toLat ) -
	        Math.sin( fromLat ) * Math.cos( toLat )*Math.cos( toLon - fromLon );
	
		return Math.atan2( y, x );
	}

	var Tile__Tile = function ( options ) {
		this.north = options.north;
		this.east = options.east;
		this.south = options.south;
		this.west = options.west;
	
		this.width = this.east - this.west;
		this.lon = ( this.east + this.west ) / 2;
		this.lat = ( this.north + this.south ) / 2;
	
		this.features = [];
	
		this.outline = options.outline;
	};
	
	Tile__Tile.prototype = {
		addFeature: function ( feature ) {var this$0 = this;
			// don't bother if tile is outside bounding box
			if ( feature.bbox[0] > this.east || feature.bbox[2] < this.west ) {
				return;
			}
	
			if ( feature.type === 'FeatureCollection' ) {
				feature.features.forEach( function(f ) {
					this$0.addFeature( f );
				});
	
				return;
			}
	
			// if feature is fully enclosed, we can take a shortcut
			if ( feature.bbox[0] > this.west && feature.bbox[2] < this.east &&
				 feature.bbox[1] > this.south && feature.bbox[3] < this.north ) {
				this.features.push( deepClone__default( feature ) );
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
	
				case 'LineString':
					this._addLineString( feature );
					break;
	
				case 'Point':
					this._addPoint( feature );
					break;
	
				default:
					throw new Error( 'Unsupported feature type (' + feature.geometry.type + ')' );
			}
		},
	
		contains: function ( point ) {
			return point[0] > this.west &&
				   point[0] <= this.east &&
				   point[1] > this.south &&
				   point[1] <= this.north;
		},
	
		toJSON: function () {
			return {
				type: 'FeatureCollection',
				properties: {},
				features: this.features,
				bounds: {
					north: this.north,
					south: this.south,
					east: this.east,
					west: this.west
				}
			};
		},
	
		toString: function () {
			return JSON.stringify( this.toJSON() )/*.replace( /\d\.\d+/g, function ( match ) {
				return Number( match ).toFixed( 3 );
			});*/
		},
	
		_addMultiLineString: function ( feature ) {
			var self = this, allLines = [], clonedFeature;
	
			feature.geometry.coordinates.forEach( function ( line ) {
				var lines = constrainLine__default( self, line );
	
				if ( lines ) {
					allLines.push.apply( allLines, lines );
				}
			});
	
			if ( !allLines.length ) {
				return;
			}
	
			clonedFeature = deepClone__default( feature, [ 'coordinates' ]);
	
			if ( allLines.length === 1 ) {
				clonedFeature.geometry.type = 'LineString';
				clonedFeature.geometry.coordinates = allLines[0];
			} else {
				clonedFeature.geometry.coordinates = allLines;
			}
	
	
			this.features.push( clonedFeature );
		},
	
		_addLineString: function ( feature ) {
			var self = this, lines, clonedFeature;
	
			lines = constrainLine__default( this, feature.geometry.coordinates );
	
			if ( !lines ) {
				return;
			}
	
			clonedFeature = deepClone__default( feature, [ 'coordinates' ]);
	
			if ( lines.length === 1 ) {
				clonedFeature.geometry.coordinates = lines[0];
			} else {
				clonedFeature.geometry.type = 'MultiLineString';
				clonedFeature.geometry.coordinates = lines;
			}
	
	
			this.features.push( clonedFeature );
		},
	
		_addMultiPolygon: function ( feature ) {
			var self = this, multiPolygon = [], clonedFeature;
	
			feature.geometry.coordinates.map( function ( polygon ) {
				var polygons = constrainPolygon__default( self, polygon );
	
				if ( polygons ) {
					multiPolygon.push.apply( multiPolygon, polygons );
				}
			});
	
			if ( !multiPolygon.length ) {
				return;
			}
	
			clonedFeature = deepClone__default( feature, [ 'coordinates' ]);
	
			if ( multiPolygon.length === 1 ) {
				clonedFeature.geometry.type = 'Polygon';
				clonedFeature.geometry.coordinates = multiPolygon[0];
			} else {
				clonedFeature.geometry.coordinates = multiPolygon;
			}
	
			this.features.push( clonedFeature );
		},
	
		_addPolygon: function ( feature ) {
			var polygons, clonedFeature;
	
			polygons = constrainPolygon__default( this, feature.geometry.coordinates );
	
			if ( !polygons ) {
				return;
			}
	
			clonedFeature = deepClone__default( feature, [ 'coordinates' ]);
	
			if ( polygons.length === 1 ) {
				clonedFeature.geometry.coordinates = polygons[0];
			} else {
				clonedFeature.geometry.type = 'MultiPolygon';
				clonedFeature.geometry.coordinates = polygons;
			}
	
			this.features.push( clonedFeature );
		},
	
		_addPoint: function ( feature ) {
			if ( this.contains( feature.geometry.coordinates ) ) {
				this.features.push( deepClone__default( feature ) );
			}
		},
	
		_findAllIntersections: function ( a, b ) {var this$0 = this;
			var self = this, line, intersections;
	
			// if the line crosses the ante-meridian, we want to put the coords in
			// the same frame of reference as the tile
			if ( ( a[0] > 90 && b[0] < -90 ) || ( a[0] < -90 && b[0] > 90 ) ) {
				if ( this.west < 0 ) {
					while ( a[0] > 0 ) a = [ a[0] - 360, a[1] ];
					while ( b[0] > 0 ) b = [ b[0] - 360, b[1] ];
				} else {
					while ( a[0] < 0 ) a = [ a[0] + 360, a[1] ];
					while ( b[0] < 0 ) b = [ b[0] + 360, b[1] ];
				}
			}
	
			line = new Line__default( a, b );
			intersections = [];
	
			[ 'north', 'south' ].forEach( function(northing ) {
				var easting = line.getX( this$0[ northing ] );
	
				if ( easting !== null && easting >= this$0.west && easting <= this$0.east ) {
					intersections.push({
						edge: northing,
						point: [ easting, this$0[ northing ] ]
					});
				}
			});
	
			[ 'east', 'west' ].forEach( function(easting ) {
				var northing = line.getY( this$0[ easting ] );
	
				if ( northing !== null && northing >= this$0.south && northing <= this$0.north ) {
					intersections.push({
						edge: easting,
						point: [ this$0[ easting ], northing ]
					});
				}
			});
	
			return intersections.sort( function ( p, q ) {
				var dx = q.point[0] - p.point[0],
					dy = q.point[1] - p.point[1];
	
				// if line.dx is positive (b is east of a), then p
				// should come first if q is east of p. mutatis
				// mutandis for y
				return ( -dx * line.dx ) || ( -dy * line.dy );
			});
		},
	
		_findIntersection: function ( a, b ) {
			return this._findAllIntersections( a, b )[0];
		}
	};
	
	module.exports = Tile__Tile;
	
	
	
	var Tile__default = Tile__Tile;

	var Source__Source = function ( data ) {
		findBoundingBox__default( data );
		this.data = data;
	};
	
	Source__Source.prototype = {
		constrain: function ( bounds ) {
			var tile, source;
	
			if ( !bounds || !( 'north' in bounds ) || !( 'south' in bounds ) || !( 'west' in bounds ) || !( 'east' in bounds ) ) {
				throw new Error( 'You must supply an object with `north`, `south`, `east` and `west` bounds' );
			}
	
			tile = new Tile__default( bounds );
			tile.addFeature( this.data );
	
			source = new Source__Source( tile.toJSON() );
			return source;
		},
	
		grid: function ( options ) {
			var north,
				south,
				east,
				west,
				horizontalDivisions,
				verticalDivisions,
				tileWidth,
				tileHeight,
	
				lat,
				lon,
				bounds,
				tile,
				source,
				result = [];
	
			options = options || {};
	
			north = 'north' in options ? options.north : 90;
			south = 'south' in options ? options.south : -90;
			east  = 'east'  in options ? options.east  : 180;
			west  = 'west'  in options ? options.west  : -180;
	
			horizontalDivisions = options.horizontalDivisions || 36;
			verticalDivisions = options.verticalDivisions || 18;
	
			tileWidth = ( east - west ) / horizontalDivisions;
			tileHeight = ( north - south ) / verticalDivisions;
	
			for ( lon = west; lon < east; lon += tileWidth ) {
				for ( lat = south; lat < north; lat += tileHeight ) {
					bounds = {
						west: lon,
						east: lon + tileWidth,
						south: lat,
						north: lat + tileHeight
					};
	
					tile = new Tile__default( bounds );
					tile.addFeature( this.data );
	
					source = new Source__Source( tile.toJSON() );
					result.push( source );
				}
			}
	
			return result;
		},
	
		toJSON: function () {
			return this.data;
		},
	
		toString: function () {
			return JSON.stringify( this.data );
		}
	};
	
	var Source__default = Source__Source;

	function index__geotile ( data ) {
		if ( Array.isArray( data ) ) {
			data = {
				type: 'FeatureCollection',
				features: data
			};
		}
	
		return new Source__default( deepClone__default( data ) );
	}
	var index__default = index__geotile;

	return index__default;

}));
//# sourceMappingURL=./geotile.js.map