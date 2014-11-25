var Line = function ( pointA, pointB ) {
	var dx, dy;

	this.pointA = pointA;
	this.pointB = pointB;

	this.dx = dx = pointB[0] - pointA[0];
	this.dy = dy = pointB[1] - pointA[1];

	this.vertical = !dx;
	this.horizontal = !dy;

	this.gradient = dy / dx;

	this.xMin = Math.min( pointA[0], pointB[0] );
	this.xMax = Math.max( pointA[0], pointB[0] );
	this.yMin = Math.min( pointA[1], pointB[1] );
	this.yMax = Math.max( pointA[1], pointB[1] );
};

Line.prototype = {
	getX: function ( y ) {
		var x;

		if ( y < this.yMin || y > this.yMax || this.horizontal ) {
			return null;
		}

		x = this.pointA[0] + ( ( y - this.pointA[1] ) / this.gradient );
		return x;
	},

	getY: function ( x ) {
		var y;

		if ( x < this.xMin || x > this.xMax || this.vertical ) {
			return null;
		}

		y = this.pointA[1] + ( ( x - this.pointA[0] ) * this.gradient );
		return y;
	}
};

export default Line;
