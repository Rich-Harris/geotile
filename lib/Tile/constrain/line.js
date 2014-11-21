export default function constrainLine ( tile, line ) {
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
