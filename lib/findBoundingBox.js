export default findBoundingBox;

var boundingBoxFinders = {
	FeatureCollection: function ( feature ) {
		var bbox = initialBbox();

		feature.features.forEach( function ( feature ) {
			var childBbox = findBoundingBox( feature );

			bbox[0] = Math.min( bbox[0], childBbox[0] );
			bbox[1] = Math.min( bbox[1], childBbox[1] );
			bbox[2] = Math.max( bbox[2], childBbox[2] );
			bbox[3] = Math.max( bbox[3], childBbox[3] );
		});

		return feature.bbox = bbox;
	},

	Polygon: function ( feature ) {
		var bbox = initialBbox();

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
		var bbox = initialBbox();

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
		var bbox = initialBbox();

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
		var bbox = initialBbox();

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

function findBoundingBox ( feature ) {
	var bbox = boundingBoxFinders[ feature.geometry ? feature.geometry.type : feature.type ]( feature );
	return bbox;
}

function initialBbox () {
	return [ Infinity, Infinity, -Infinity, -Infinity ];
}
