# geotile

Experimental work-in-progress...


## Installation

```bash
npm install geotile
```


## Usage

API subject to change!

```js
var geotile = require( 'geotile' );

// load some source data
var land    = require( './geojson/land.json' );
var borders = require( './geojson/borders.json' );
var lakes   = require( './geojson/lakes.json' );
var places  = require( './geojson/places.json' );

// get a specific region of a single source
var region = geotile( land ).constrain({
  north: 60,
  east: 2,
  south: 49.5,
  west: -11
});

// get a specific region of multiple combined sources
// (which are converted to a FeatureCollection internally)
var region = geotile([
  land,
  borders,
  lakes,
  places
]).constrain({
  north: 60,
  east: 2,
  south: 49.5,
  west: -11
});

// save region as GeoJSON. The object's `bbox` property
// is equivalent to [ west, south, east, north ]
region.toJSON();
region.toString(); // equivalent to JSON.stringify( region.toJSON() );

// create a grid of tiles. This returns a one-dimensional
// array of regions. All settings are optional (you can just
// call `.grid()`), and default to the values below
var grid = geotile( land ).grid({
  // default to the entire world...
  north: 90,
  east: 180,
  south: -90,
  west: -180,

  // ...split into tiles of 10x10 degrees
  horizontalDivisions: 36,
  verticalDivisions: 18
});

// save GeoJSON files
grid.forEach( function ( region ) {
  var filename = 'tiles/' + region.west + '_' + region.north + '.json';
  fs.writeFile( filename, region.toString() );
});
```
