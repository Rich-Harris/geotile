var Line = function ( pointA, pointB ) {
	this.pointA = pointA;
	this.pointB = pointB;

	this.gradient = ( pointB[1] - pointA[1] ) / ( pointB[0] - pointA[0] );

	this.xMin = Math.min( pointA[0], pointB[0] );
	this.xMax = Math.max( pointA[0], pointB[0] );
	this.yMin = Math.min( pointA[1], pointB[1] );
	this.yMax = Math.max( pointA[1], pointB[1] );
};

Line.prototype = {
	getX: function ( y ) {
		if ( y < this.yMin || y > this.yMax ) {
			return null;
		}

		return this.pointA[0] + ( ( y - this.pointA[1] ) / this.gradient );
	},

	getY: function ( x ) {
		if ( x < this.xMin || x > this.xMax ) {
			return null;
		}

		return this.pointA[1] + ( ( x - this.pointA[0] ) * this.gradient );
	}
};

export default Line;
