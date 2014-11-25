var assert = require( 'assert' ),
	sander = require( 'sander' ),
	compareGeometry = require( '../utils/compareGeometry' ),
	geotile;

module.exports = function () {
	describe( 'geotile( data ).constrain()', function () {
		var polygonA = require( '../samples/polygonA.json' ),
			polygonB = require( '../samples/polygonB.json' ),
			polygonC = require( '../samples/polygonC.json' ),
			polygonD = require( '../samples/polygonD.json' ),
			polygonE = require( '../samples/polygonE.json' ),
			pointA = require( '../samples/pointA.json' ),
			pointB = require( '../samples/pointB.json' ),
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

		it( 'constrains a Polygon with lines that cross the tile', function () {
			var source, region, expected;

			source = geotile( polygonC );

			region = source.constrain({
				north: 20,
				east: 20,
				south: 10,
				west: 10
			}).toJSON();

			expected = {
				type: 'Polygon',
				coordinates: [
					[ [ 10, 12 ], [ 12, 12 ], [ 12, 14 ], [ 10, 14 ], [ 10, 16 ], [ 20, 16 ], [ 20, 10 ], [ 10, 10 ], [ 10, 12 ] ]
				]
			}

			compareGeometry( region.features[0].geometry, expected );
		});

		it( 'constrains a Polygon with a weird shape', function () {
			var source, region, expected;

			source = geotile( polygonD );

			region = source.constrain({
				north: 40,
				east: 30,
				south: 30,
				west: 20
			}).toJSON();

			expected = {
				type: 'MultiPolygon',
				coordinates: [
					[
						[ [ 20, 32 ], [ 22, 32 ], [ 22, 34 ], [ 20, 34 ], [ 20, 36 ], [ 30, 36 ], [ 30, 30 ], [ 20, 30 ], [ 20, 32 ] ]
					],
					[
						[ [ 20, 40 ], [ 22, 40 ], [ 22, 38 ], [ 20, 38 ], [ 20, 40 ] ]
					],
					[
						[ [ 24, 40 ], [ 26, 40 ], [ 26, 38 ], [ 24, 38 ], [ 24, 40 ] ]
					],
					[
						[ [ 28, 40 ], [ 30, 40 ], [ 30, 38 ], [ 28, 38 ], [ 28, 40 ] ]
					]
				]
			}

			compareGeometry( region.features[0].geometry, expected );
		});

		it( 'constrains a Polygon that crosses the [ante-]meridian', function () {
			var anteMeridianCrosser, meridianCrosser, source, region, expected;

			anteMeridianCrosser = geotile({
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [[
						[ 178, 14 ],
						[ 178, 16 ],
						[ -178, 16 ],
						[ -178, 14 ],
						[ 178, 14 ]
					]]
				}
			});

			meridianCrosser = geotile({
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [[
						[ -2, 14 ],
						[ -2, 16 ],
						[ 2, 16 ],
						[ 2, 14 ],
						[ -2, 14 ]
					]]
				}
			});

			function compare ( source, bounds, expectedCoords ) {
				var region = source.constrain({
					north: 20,
					south: 10,
					west: bounds.west,
					east: bounds.east
				}).toJSON();

				compareGeometry( region.features[0].geometry, {
					type: 'Polygon',
					coordinates: expectedCoords
				});
			}

			compare( anteMeridianCrosser, {
				east: -170,
				west: -180
			}, [
				[ [ -180, 14 ], [ -180, 16 ], [ -178, 16 ], [ -178, 14 ], [ -180, 14 ] ]
			]);

			compare( anteMeridianCrosser, {
				east: 180,
				west: 170
			}, [
				[ [ 178, 14 ], [ 178, 16 ], [ 180, 16 ], [ 180, 14 ], [ 178, 14 ] ]
			]);

			compare( meridianCrosser, {
				west: 0,
				east: 10
			}, [
				[ [ 0, 14 ], [ 0, 16 ], [ 2, 16 ], [ 2, 14 ], [ 0, 14 ] ]
			]);

			compare( meridianCrosser, {
				west: -10,
				east: 0
			}, [
				[ [ -2, 14 ], [ -2, 16 ], [ 0, 16 ], [ 0, 14 ], [ -2, 14 ] ]
			]);
		});

		it( 'constrains a MultiPolygon that has a ring fully inside the tile', function () {
			var source, region, expected;

			source = geotile({
				type: 'Feature',
				geometry: {
					type: 'MultiPolygon',
					coordinates: [
						[
							[
								[ 2, 2 ], [ 2, 8 ], [ 8, 8 ], [ 8, 2 ], [ 2, 2 ]
							]
						],
						[
							[
								[ 12, 2 ], [ 12, 8 ], [ 18, 8 ], [ 18, 2 ], [ 12, 2 ]
							]
						]
					]
				}
			});

			region = source.constrain({
				north: 10,
				east: 10,
				south: 0,
				west: 0
			}).toJSON();

			expected = {
				type: 'Polygon',
				coordinates: [
					[ [ 2, 2 ], [ 2, 8 ], [ 8, 8 ], [ 8, 2 ], [ 2, 2 ] ]
				]
			}

			compareGeometry( region.features[0].geometry, expected );
		});

		it( 'constrains a polygon that fully encloses a tile', function () {
			var source, region, expected;

			source = geotile({
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [
						[
							[ -5, -5 ], [ -5, 15 ], [ 15, 15 ], [ 15, -5 ], [ -5, -5 ]
						]
					]
				}
			});

			region = source.constrain({
				north: 10,
				east: 10,
				south: 0,
				west: 0
			}).toJSON();

			expected = {
				type: 'Polygon',
				coordinates: [
					[ [ 0, 0 ], [ 0, 10 ], [ 10, 10 ], [ 10, 0 ], [ 0, 0 ] ]
				]
			};

			compareGeometry( region.features[0].geometry, expected );
		});

		it( 'constrains geometry at the South Pole', function () {
			//assert.ok( false );
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
