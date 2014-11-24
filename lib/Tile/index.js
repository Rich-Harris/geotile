import Line from '../Line';
import deepClone from '../utils/deepClone';
import constrainLine from './constrain/line';
import constrainPolygon from './constrain/polygon';

var Tile = function ( options ) {
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

Tile.prototype = {
	addFeature: function ( feature ) {
		// don't bother if tile is outside bounding box
		if ( feature.bbox[0] > this.east || feature.bbox[2] < this.west ) {
			return;
		}

		if ( feature.type === 'FeatureCollection' ) {
			feature.features.forEach( f => {
				this.addFeature( f );
			});

			return;
		}

		// if feature is fully enclosed, we can take a shortcut
		if ( feature.bbox[0] > this.west && feature.bbox[2] < this.east &&
			 feature.bbox[1] > this.south && feature.bbox[3] < this.north ) {
			this.features.push( deepClone( feature ) );
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
			var lines = constrainLine( self, line );

			if ( lines ) {
				allLines.push.apply( allLines, lines );
			}
		});

		if ( !allLines.length ) {
			return;
		}

		clonedFeature = deepClone( feature, [ 'coordinates' ]);

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

		lines = constrainLine( this, feature.geometry.coordinates );

		if ( !lines ) {
			return;
		}

		clonedFeature = deepClone( feature, [ 'coordinates' ]);

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
			var polygons = constrainPolygon( self, polygon );

			if ( polygons ) {
				multiPolygon.push.apply( multiPolygon, polygons );
			}
		});

		if ( !multiPolygon.length ) {
			return;
		}

		clonedFeature = deepClone( feature, [ 'coordinates' ]);

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

		polygons = constrainPolygon( this, feature.geometry.coordinates );

		if ( !polygons ) {
			return;
		}

		clonedFeature = deepClone( feature, [ 'coordinates' ]);

		if ( polygons.length === 1 ) {
			clonedFeature.geometry.coordinates = polygons[0];
		} else {
			clonedFeature.geometry.type = 'MultiPolygon';
			clonedFeature.geometry.coordinates = polygons;
		}

		this.features.push( clonedFeature );
	},

	_findAllIntersections: function ( a, b ) {
		var line, intersections;

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

		line = new Line( a, b );
		intersections = [];

		[ 'north', 'south' ].forEach( northing => {
			var easting = line.getX( this[ northing ] );

			if ( easting !== null && easting >= this.west && easting <= this.east ) {
				intersections.push({
					edge: northing,
					point: [ easting, this[ northing ] ]
				});
			}
		});

		[ 'east', 'west' ].forEach( easting => {
			var northing = line.getY( this[ easting ] );

			if ( northing !== null && northing >= this.south && northing <= this.north ) {
				intersections.push({
					edge: easting,
					point: [ this[ easting ], northing ]
				});
			}
		});

		return intersections.sort( function ( iA, iB ) {
			return ( iA.point[0] - iB.point[0] ) * b[0] - a[0] ||
			       ( iA.point[1] - iB.point[1] ) * b[1] - a[1];
		});
	},

	_findIntersection: function ( a, b ) {
		return this._findAllIntersections( a, b )[0];
	}
};

module.exports = Tile;



export default Tile;

