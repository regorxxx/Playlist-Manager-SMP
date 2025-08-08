'use strict';
//07/08/25

/* exported _sb, fillWithPattern */

/* global getClosestDivisor:readable, SF_CENTRE:readable, IDC_HAND:readable */
include('helpers_xxx_UI.js');
/* global _gdiFont:readable, _scale:readable */

function _sb(t, x, y, w, h, v, fn) {
	this.paint = (gr, colour, colorBg = null) => {
		const bVisible = this.v();
		if (bVisible || colorBg) {
			gr.SetTextRenderingHint(4);
			gr.DrawString(this.t, this.font, bVisible ? colour : colorBg, this.x, this.y, this.w, this.h, SF_CENTRE);
			gr.SetTextRenderingHint(0);
		}
	};
	this.trace = (x, y) => {
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h && this.v();
	};
	this.move = (x, y) => {
		if (this.trace(x, y)) {
			window.SetCursor(IDC_HAND);
			this.hover = true;
			return true;
		} else {
			// Set IDC_ARROW at parent;
			this.hover = false;
			return false;
		}
	};
	this.lbtn_up = (x, y, mask, parent) => {
		if (this.trace(x, y)) {
			if (this.fn) {
				if (parent) {
					this.fn.call(parent, x, y, mask, parent);
				} else {
					this.fn(x, y, mask);
				}
			}
			return true;
		} else {
			return false;
		}
	};
	this.hover = false;
	this.t = t;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.v = v;
	this.fn = fn;
	this.font = _gdiFont('FontAwesome', this.h);
}

function drawDottedLine(gr, x1, y1, x2, y2, line_width, colour, dot_sep) {
	if (y1 === y2) { // Horizontal
		const numberDots = Math.floor((x2 - x1) / dot_sep / 2);
		let newX1 = x1;
		let newX2 = x1 + dot_sep;
		for (let i = 0; i <= numberDots; i++) {
			gr.DrawLine(newX1, y1, newX2, y1, line_width, colour);
			newX1 += dot_sep * 2;
			newX2 += dot_sep * 2;
		}
	} else if (x1 === x2) { // Vertical
		const numberDots = Math.floor((y2 - y1) / dot_sep / 2);
		let newY1 = y1;
		let newY2 = y1 + dot_sep;
		for (let i = 0; i <= numberDots; i++) {
			gr.DrawLine(x1, newY1, x1, newY2, line_width, colour);
			newY1 += dot_sep * 2;
			newY2 += dot_sep * 2;
		}
	} else { // Any angle: Would work alone, but checking coordinates first is faster for vertical and horizontal...
		const numberDots = Math.floor(((x2 - x1) ** 2 + (y2 - y1) ** 2) ** (1 / 2) / dot_sep / 2);
		const angle = (y2 !== y1) ? Math.atan((x2 - x1) / (y2 - y1)) : 0;
		const xStep = dot_sep * Math.cos(angle);
		const yStep = dot_sep * Math.sin(angle);
		let newX1 = x1;
		let newX2 = x1 + xStep;
		let newY1 = y1;
		let newY2 = y1 + yStep;
		for (let i = 0; i <= numberDots; i++) {
			gr.DrawLine(newX1, newY1, newX2, newY2, line_width, colour);
			newX1 += xStep * 2;
			newX2 += xStep * 2;
			newY1 += yStep * 2;
			newY2 += yStep * 2;
		}
	}
}

function fillWithPattern(gr, x1, y1, x2, y2, colour, lineWidth, size, pattern) {
	const dotSize = _scale(3);
	if (x1 > x2) { [x1, x2] = [x2, x1]; }
	if (y1 > y2) { [y1, y2] = [y2, y1]; }
	const diffX = x2 - x1;
	const diffY = y2 - y1;
	let iX = x1, iY = y1;
	switch (pattern) {
		case 'verticalDotted': {
			size = getClosestDivisor(diffX, size);
			const rep = diffX / size;
			for (let i = 0; i <= rep; i++) {
				drawDottedLine(gr, iX, y1, iX, y2 - dotSize, lineWidth, colour, dotSize);
				iX += size;
			}
			break;
		}
		case 'horizontalDotted': {
			size = getClosestDivisor(diffY, size);
			const rep = diffY / size;
			for (let i = 0; i <= rep; i++) {
				drawDottedLine(gr, x1, iY, x2 - dotSize, iY, lineWidth, colour, dotSize);
				iY += size;
			}
			break;
		}
		case 'squares': {
			fillWithPattern(gr, x1, y1, x2, y2, colour, lineWidth, size, 'verticalDotted');
			fillWithPattern(gr, x1, y1, x2, y2, colour, lineWidth, size, 'horizontalDotted');
			break;
		}
		case 'mosaic': {
			fillWithPattern(gr, x1, y1, x2, y2, colour, lineWidth, size * 2 / 3, 'verticalDotted');
			fillWithPattern(gr, x1, y1, x2, y2, colour, lineWidth, size * 1 / 3, 'horizontalDotted');
			break;
		}
	}
}