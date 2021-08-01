'use strict';
//01/06/21

include(fb.ComponentPath + 'docs\\Flags.js');
include('helpers_xxx_UI_chars.js');

/* 
	Global Variables 
*/

// Callbacks: append to any previously existing callback
function onScriptUnload() {
	window.Tooltip.Deactivate();
}
if (on_script_unload) {
	const oldFunc = on_script_unload;
	on_script_unload = function() {
		oldFunc();
		onScriptUnload();
	};
} else {var on_script_unload = onScriptUnload;}

const WshShellUI = new ActiveXObject('WScript.Shell');
const _bmp = gdi.CreateImage(1, 1);
const _gr = _bmp.GetGraphics();

// Cache
const scaleDPI = {}; // Caches _scale() values;
const fonts = {}; // Caches _gdifont() values;

// Flags
const LEFT = DT_VCENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
const RIGHT = DT_VCENTER | DT_RIGHT | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
const CENTRE = DT_VCENTER | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
const SF_CENTRE = 285212672;

const LM = _scale(5);
const TM = _scale(15);

const popup = {
	ok : 0,
	yes_no : 4,
	yes : 6,
	no : 7,
	stop : 16,
	question : 32,
	info : 64
};

// Combinations of invisible chars may be used on UI elements to assign IDs...
const hiddenChars = ['\u200b','\u200c','\u200d','\u200e'];


function _scale(size) {
	if (!scaleDPI[size]) {
		let DPI;
		try {DPI = WshShellUI.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI');}
		catch (e) {DPI = 96;} // Fix for linux
		scaleDPI[size] = Math.round(size * DPI / 72);
	}
	return scaleDPI[size];
}

/* 
	IDs
*/

function nextId(method, bNext = true, bCharsForced = true) {
	switch (true) {
		case method === 'invisible':
			return nextIdInvisible(bNext, bCharsForced);
		case method === 'letters':
			return nextIdLetters(bNext, bCharsForced);
		case method === 'indicator':
			return nextIdIndicator(bNext);
		default:
			return null;
	}
}

const nextIdInvisible = (function() {
		var nextIndex = [0,0,0,0,0];
		const chars = hiddenChars;
		const charsForced = [' (*',')'];
		const num = chars.length;
		var prevId = nextIndex.length + charsForced.join('').length;

		return function(bNext = true, bCharsForced = true) {
			if (!bNext) {return prevId;}
			let a = nextIndex[0];
			let b = nextIndex[1];
			let c = nextIndex[2];
			let d = nextIndex[3];
			let e = nextIndex[4];
			let id = (bCharsForced ? charsForced[0] : '') + chars[a] + chars[b] + chars[c] + chars[d] + chars[e] + (bCharsForced ? charsForced[1] : '');
		
			a = ++a % num;
		
			if (!a) {
				b = ++b % num; 
				if (!b) {
					c = ++c % num;
					if (!c) {
						d = ++d % num;
						if (!d) {
							e = ++e % num;
						}
					}
				}
			}
			nextIndex = [a, b, c, d, e];
			prevId = id;
			return id;
		};
}());

const nextIdLetters = (function() {
		var nextIndex = [0,0,0,0,0];
		const chars = ['a','b','c','d','f'];
		const charsForced = [' (',')'];
		const num = chars.length;
		var prevId = nextIndex.length + charsForced.join('').length;

		return function(bNext = true, bCharsForced = true) {
			if (!bNext) {return prevId;}
			let a = nextIndex[0];
			let b = nextIndex[1];
			let c = nextIndex[2];
			let d = nextIndex[3];
			let e = nextIndex[4];
			let id = (bCharsForced ? charsForced[0] : '') + chars[a] + chars[b] + chars[c] + chars[d] + chars[e] + (bCharsForced ? charsForced[1] : '');
		
			a = ++a % num;
		
			if (!a) {
				b = ++b % num; 
				if (!b) {
					c = ++c % num;
					if (!c) {
						d = ++d % num;
						if (!d) {
							e = ++e % num;
						}
					}
				}
			}
			nextIndex = [a, b, c, d, e];
			prevId = id;
			return id;
		};
}());

const nextIdIndicator = (function() { // Same structure to ease compatibility
		return function() {
			return ' (*)';
		};
}());

/* 
	Tooltip
*/

function _tt(value, font = 'Segoe UI', fontsize = _scale(10), width = 1200) {
	this.tooltip = window.Tooltip;
	this.font = this.tooltip.SetFont(font, fontsize);
	this.width = this.tooltip.SetMaxWidth(width);
	this.text = this.tooltip.text = value;
	this.oldDelay = this.tooltip.GetDelayTime(3); //TTDT_INITIAL
	
	this.SetValue = function (value,  bForceActivate = false) {
		if (value === null) {
			this.Deactivate();
			return;
		} else {
			if (this.tooltip.Text !== value) {
				this.tooltip.Text = value;
				this.Activate();
			}
			if (bForceActivate) {this.Activate();} // Only on force to avoid flicker
		}
	};
	
	this.SetFont = function (font_name, font_size_pxopt, font_styleopt) {
		this.tooltip.SetFont(font_name, font_size_pxopt, font_styleopt);
	};
	
	this.SetMaxWidth = function (width) {
		this.tooltip.SetMaxWidth(width);
	};
	
	this.Activate = function () {
		this.tooltip.Activate();
	};
	
	this.Deactivate = function () {
		this.tooltip.Deactivate();
	};
	
	this.SetDelayTime = function (type, time) {
		this.tooltip.SetDelayTime(type, time) ;
    };
	
	this.GetDelayTime = function (type) {
		this.tooltip.GetDelayTime(type) ;
	};

}

/* 
	Colours
*/

function RGBA(r, g, b, a) {
	return ((a << 24) | (r << 16) | (g << 8) | (b));
}

function RGB(r, g, b) {
	return (0xff000000 | (r << 16) | (g << 8) | (b));
}

function toRGB(col) { // returns an array like [192, 0, 0]
	const a = col - 0xFF000000;
	return [a >> 16, a >> 8 & 0xFF, a & 0xFF];
}

function blendColours(c1, c2, f) {
	// When factor is 0, result is 100% color1, when factor is 1, result is 100% color2.
	c1 = toRGB(c1);
	c2 = toRGB(c2);
	const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
	const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
	const b = Math.round(c1[2] + f * (c2[2] - c1[2]));
	return RGB(r, g, b);
}

function getAlpha(col) {
	return ((col >> 24) & 0xff);
}

function getRed(col) {
	return ((col >> 16) & 0xff);
}

function getGreen(col) {
	return ((col >> 8) & 0xff);
}

function getBlue(col) {
	return (col & 0xff);
}

function tintColor(color, percent) {
	const red = getRed(color);
	const green = getGreen(color);
	const blue = getBlue(color);

	return RGBA(lightenColorVal(red, percent), lightenColorVal(green, percent), lightenColorVal(blue, percent), getAlpha(color));
}
function darkenColorVal(color, percent) {
	const shift = Math.max(color * percent / 100, percent / 2);
	const val = Math.round(color - shift);
	return Math.max(val, 0);
}
function lightenColorVal(color, percent) {
	const val = Math.round(color + ((255-color) * (percent / 100)));
	return Math.min(val, 255);
}

/* 
	Fonts
*/

function _gdiFont(name, size, style) {
	let id = name.toLowerCase() + '_' + size + '_' + (style || 0);
	if (!fonts[id]) {
		fonts[id] = gdi.Font(name, size, style || 0);
	}
	if (fonts[id].Name !== name) {console.log('Missing font: ' + name);}
	return fonts[id];
}

function _textWidth(value, font) {
	return _gr.CalcTextWidth(value, font);
}

/* 
	Draw
*/

function _sb(t, x, y, w, h, v, fn) {
	this.paint = (gr, colour) => {
		gr.SetTextRenderingHint(4);
		if (this.v()) {
			gr.DrawString(this.t, this.font, colour, this.x, this.y, this.w, this.h, SF_CENTRE);
		}
	}
	
	this.trace = (x, y) => {
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h && this.v();
	}
	
	this.move = (x, y) => {
		if (this.trace(x, y)) {
			window.SetCursor(IDC_HAND);
			return true;
		} else {
			//window.SetCursor(IDC_ARROW);
			return false;
		}
	}
	
	this.lbtn_up = (x, y) => {
		if (this.trace(x, y)) {
			if (this.fn) {
				this.fn(x, y);
			}
			return true;
		} else {
			return false;
		}
	}
	
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
		const numberDots = Math.floor(((x2 - x1)**2 + (y2 - y1)**2)**(1/2) / dot_sep / 2);
		const angle = (y2 !== y1) ? Math.atan((x2 - x1)/(y2 - y1)) : 0;
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
	if (x1 > x2) {[x1, x2] = [x2, x1];} 
	if (y1 > y2) {[y1, y2] = [y2, y1];} 
	const diffX = x2 - x1;
	const diffY = y2 - y1;
	let iX = x1, iY = y1;
	switch (pattern){
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
		case 'mossaic': {
			fillWithPattern(gr, x1, y1, x2, y2, colour, lineWidth, size * 2/3, 'verticalDotted');
			fillWithPattern(gr, x1, y1, x2, y2, colour, lineWidth, size * 1/3, 'horizontalDotted');
			break;
		}
	}
}