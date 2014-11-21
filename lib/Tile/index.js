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

	_findIntersection: function ( a, b ) {
		var gradient;

		gradient = ( b[1] - a[1] ) / ( b[0] - a[0] );

		// does it cross the northern boundary between the east and west boundaries?
		if ( a[1] <= this.north && b[1] >= this.north || a[1] >= this.north && b[1] <= this.north ) {
			var northernCrossingEasting = a[0] + ( ( this.north - a[1] ) / gradient );

			if ( northernCrossingEasting >= this.west && northernCrossingEasting <= this.east ) {
				//console.log( 'crosses northern boundary (%s) at', this.north, northernCrossingEasting, a, b );
				return {
					edge: 'north',
					point: [ northernCrossingEasting, this.north ]
				};
			}
		}

		if ( a[1] <= this.south && b[1] >= this.south || a[1] >= this.south && b[1] <= this.south ) {
			var southernCrossingEasting = a[0] + ( ( this.south - a[1] ) / gradient );

			if ( southernCrossingEasting >= this.west && southernCrossingEasting <= this.east ) {
				//console.log( 'crosses southern boundary (%s) at', this.north, southernCrossingEasting, a, b );
				return {
					edge: 'south',
					point: [ southernCrossingEasting, this.south ]
				};
			}
		}

		if ( a[0] <= this.west && b[0] >= this.west || a[0] >= this.west && b[0] <= this.west ) {
			var westernCrossingNorthing = a[1] + ( ( this.west - a[0] ) * gradient );

			if ( westernCrossingNorthing >= this.south && westernCrossingNorthing <= this.north ) {
				//console.log( 'crosses western boundary (%s) at', this.west, westernCrossingNorthing, a, b );
				return {
					edge: 'west',
					point: [ this.west, westernCrossingNorthing ]
				};
			}
		}

		if ( a[0] <= this.east && b[0] >= this.east || a[0] >= this.east && b[0] <= this.east ) {
			var easternCrossingNorthing = a[1] + ( ( this.east - a[0] ) * gradient );

			if ( easternCrossingNorthing >= this.south && easternCrossingNorthing <= this.north ) {
				//console.log( 'crosses eastern boundary (%s) at', this.east, easternCrossingNorthing, a, b );
				return {
					edge: 'east',
					point: [ this.east, easternCrossingNorthing ]
				};
			}
		}
	}
};

module.exports = Tile;



export default Tile;

