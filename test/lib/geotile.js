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

	var Tile__Tile = function ( options ) {
		this.north = options.north;
		this.east = options.east;
		this.south = options.south;
		this.west = options.west;
	
		this.width = this.east - this.west;
		this.lon = ( this.east + this.west ) / 2;
	
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
				var lines = Tile__constrainLine( self, line );
	
				if ( lines ) {
					allLines.push.apply( allLines, lines );
				}
			}).filter( Boolean );
	
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
	
			lines = Tile__constrainLine( this, feature.geometry.coordinates );
	
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
			var self = this, multiPolygon, clonedFeature;
	
			multiPolygon = feature.geometry.coordinates.map( function ( polygon ) {
				return Tile__constrainPolygon( self, polygon );
			}).filter( Boolean );
	
			if ( !multiPolygon.length ) {
				return;
			}
	
			clonedFeature = deepClone__default( feature, [ 'coordinates' ]);
			clonedFeature.geometry.coordinates = multiPolygon;
	
			this.features.push( clonedFeature );
		},
	
		_addPolygon: function ( feature ) {
			var polygon, clonedFeature;
	
			polygon = Tile__constrainPolygon( this, feature.geometry.coordinates );
	
			if ( !polygon ) {
				return;
			}
	
			clonedFeature = deepClone__default( feature, [ 'coordinates' ]);
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
	
				clamped = Tile__clamp( point, self, west, east );
	
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
				if ( Tile__isClockwise( result ) ) {
					if ( isHole ) return;
				} else if ( !isHole ) {
					return;
				}
	
				result.push( result[0] );
				target.push( result );
			}
		}
	};
	
	module.exports = Tile__Tile;
	
	function Tile__clamp ( point, tile, west, east ) {
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
	
	
	function Tile__isClockwise ( ring ) {
		var total = 0;
	
		ring.forEach( function ( point, i ) {
			var nextPoint = ring[ i + 1 ] || ring[0];
	
			total += ( nextPoint[0] - point[0] ) * ( nextPoint[1] + point[1] );
		});
	
		return total > 0;
	}
	
	function Tile__constrainPolygon ( tile, coordinates ) {
		var result = [], outerRing;
	
		outerRing = Tile__constrainRing( tile, coordinates[0], false );
	
		if ( !outerRing ) {
			return;
		}
	
		result = [ outerRing ];
	
		coordinates.slice( 1 ).forEach( function ( hole ) {
			var constrainedHole = Tile__constrainRing( tile, hole, true );
	
			if ( constrainedHole ) {
				result.push( constrainedHole );
			}
		});
	
		return result;
	}
	
	function Tile__constrainRing ( tile, ring, isHole ) {
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
	
			clamped = Tile__clamp( point, tile, west, east );
			addPoint( clamped );
		});
	
		function addPoint ( clamped ) {
			var backOne, backTwo;
	
			backOne = result[ result.length - 1 ];
			backTwo = result[ result.length - 2 ];
	
			if ( Tile__pointsCoincide( clamped, backOne ) ) {
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
			if ( Tile__isClockwise( result ) ) {
				if ( isHole ) return;
			} else if ( !isHole ) {
				return;
			}
	
			// Close the path
			if ( !Tile__pointsCoincide( result[ result.length - 1 ], result[0] ) ) {
				result.push( result[0] );
			}
	
			return result;
		}
	}
	
	function Tile__constrainLine ( tile, line ) {
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
	
	function Tile__pointsCoincide ( a, b ) {
		return a && b && a[0] === b[0] && a[1] === b[1];
	}
	
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
	
			north = options.north || 90;
			south = options.south || -90;
			east  = options.east  || 180;
			west  = options.west  || -180;
	
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
	
					console.log( 'bounds', bounds );
	
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