import findBoundingBox from './findBoundingBox';
import Tile from './Tile';

var Source = function ( data ) {
	findBoundingBox( data );
	this.data = data;
};

Source.prototype = {
	constrain: function ( bounds ) {
		var tile, source;

		if ( !bounds || !( 'north' in bounds ) || !( 'south' in bounds ) || !( 'west' in bounds ) || !( 'east' in bounds ) ) {
			throw new Error( 'You must supply an object with `north`, `south`, `east` and `west` bounds' );
		}

		tile = new Tile( bounds );
		tile.addFeature( this.data );

		source = new Source( tile.toJSON() );
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

				tile = new Tile( bounds );
				tile.addFeature( this.data );

				source = new Source( tile.toJSON() );
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

export default Source;
