var assert = require( 'assert' ),
	sander = require( 'sander' ),
	geotile;

module.exports = function () {
	describe( 'geotile()', function () {
		var polygon, pointA, pointB;

		polygon = require( '../samples/polygon.json' );
		pointA = require( '../samples/pointA.json' );
		pointB = require( '../samples/pointB.json' );

		before( function () {
			return require( '../utils/build' )().then( function ( lib ) {
				geotile = lib;
			});
		});

		describe( 'with a single GeoJSON object', function () {
			var source;

			beforeEach( function () {
				source = geotile( polygon );
			});

			describe( 'source.toJSON()', function () {
				it( 'returns a clone of the original data', function () {
					var result = source.toJSON();

					assert.notEqual( polygon, result );
					assert.deepEqual( polygon.type, result.type );
					assert.deepEqual( polygon.properties, result.properties );
					assert.deepEqual( polygon.geometry, result.geometry );
					assert.deepEqual( polygon.extra, result.extra );
				});

				it( 'includes bounding box data', function () {
					var bbox = source.toJSON().bbox,
						ring = polygon.geometry.coordinates[0];

					assert.deepEqual( bbox, [ 2, 5, 18, 15 ]);
				});
			});
		});

		describe( 'with an array of GeoJSON objects', function () {
			var source;

			beforeEach( function () {
				source = geotile([ polygon, pointA, pointB ]);
			});

			describe( 'source.toJSON()', function () {
				it( 'creates a FeatureCollection from the source objects', function () {
					var result = source.toJSON();

					assert.equal( result.type, 'FeatureCollection' );
				});

				it( 'includes bounding box data', function () {
					var bbox = source.toJSON().bbox,
						ring = polygon.geometry.coordinates[0];

					assert.deepEqual( bbox, [ 2, 5, 19, 19 ]);
				});
			});
		});
	});
};

function eastings ( point ) {
	return point[0];
}

function northings ( point ) {
	return point[1];
}
