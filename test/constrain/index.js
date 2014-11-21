var assert = require( 'assert' ),
	sander = require( 'sander' ),
	compareGeometry = require( '../utils/compareGeometry' ),
	geotile;

module.exports = function () {
	describe( 'geotile( data ).constrain()', function () {
		var polygonA, polygonB, pointA, pointB, line;

		polygonA = require( '../samples/polygonA.json' );
		polygonB = require( '../samples/polygonB.json' );
		pointA = require( '../samples/pointA.json' );
		pointB = require( '../samples/pointB.json' );
		line = require( '../samples/line.json' );

		before( function () {
			return require( '../utils/build' )().then( function ( lib ) {
				geotile = lib;
			});
		});

		it( 'constrains a Polygon', function () {
			var source, region, expected;

			source = geotile( polygonA );

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

		it( 'constrains a Polygon that intersects the tile multiple times', function () {
			var source, region, expected;

			source = geotile( polygonB );

			region = source.constrain({
				north: 10,
				east: 10,
				south: 0,
				west: 0
			}).toJSON();

			expected = {
				type: 'MultiPolygon',
				coordinates: [
					[
						[ [ 2, 6 ], [ 2, 10 ], [ 4, 10 ], [ 4, 6 ], [ 2, 6 ] ]
					],

					[
						[ [ 6, 10 ], [ 8, 10 ], [ 8, 8 ], [ 10, 8 ], [ 10, 6 ], [ 6, 6 ], [6, 10 ] ]
					],

					[
						[ [ 6, 4 ], [ 10, 4 ], [ 10, 2 ], [ 6, 2 ], [ 6, 4 ] ]
					]
				]
			}

			compareGeometry( region.features[0].geometry, expected );
		});

		it( 'constrains a LineString', function () {
			var source, region, expected;

			source = geotile( line );

			region = source.constrain({
				north: 10,
				east: 10,
				south: 0,
				west: 0
			}).toJSON();

			expected = {
				type: 'MultiLineString',
				coordinates: [
					[ [ 5, 5 ], [ 10, 5 ] ],
					[ [ 5, 10 ], [ 5, 8 ] ]
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
				type: 'LineString',
				coordinates: [
					[ 10, 5 ], [ 15, 5 ], [ 15, 10 ]
				]
			};

			compareGeometry( region.features[0].geometry, expected );
		});

		it( 'retains additional data and properties', function () {
			var source, region;

			source = geotile( polygonA );
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
