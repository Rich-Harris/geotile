var assert = require( 'assert' ),
	sander = require( 'sander' ),
	compareGeometry = require( '../utils/compareGeometry' ),
	geotile;

module.exports = function () {
	describe( 'geotile( data ).constrain()', function () {
		var polygon, pointA, pointB;

		polygon = require( '../samples/polygon.json' );
		pointA = require( '../samples/pointA.json' );
		pointB = require( '../samples/pointB.json' );

		before( function () {
			return require( '../utils/build' )().then( function ( lib ) {
				geotile = lib;
			});
		});

		it( 'constrains a single GeoJSON object', function () {
			var source, region;

			source = geotile( polygon );

			region = source.constrain({
				north: 10,
				east: 10,
				south: 0,
				west: 0
			}).toJSON();

			expected = {
				type: 'Polygon',
				coordinates: [
					[ [ 10, 10 ], [ 10, 5 ], [ 8, 5 ], [ 5, 10 ], [ 10, 10 ] ]
				]
			};

			compareGeometry( region.features[0].geometry, expected );

			region = source.constrain({
				north: 10,
				east: 20,
				south: 0,
				west: 10
			}).toJSON();

			expected = {
				type: 'Polygon',
				coordinates: [
					[ [ 10, 10 ], [ 15, 10 ], [ 18, 5 ], [ 10, 5 ], [ 10, 10 ] ]
				]
			};

			compareGeometry( region.features[0].geometry, expected );
		});

		it( 'retains additional data and properties', function () {
			var source, region;

			source = geotile( polygon );
			region = source.constrain({
				north: 10,
				east: 10,
				south: 0,
				west: 0
			}).toJSON();

			assert.equal( region.features[0].properties.name, 'Parallelogramistan' );
			assert.equal( region.features[0].extra, 'data' );
		});
	});
};
