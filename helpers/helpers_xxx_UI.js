﻿'use strict';
//13/05/22

include(fb.ComponentPath + 'docs\\Flags.js');
include('helpers_xxx.js');
include('helpers_xxx_UI_chars.js');

/* 
	Global Variables 
*/

// Callbacks: append to any previously existing callback
function onScriptUnloadUI() {
	window.Tooltip.Deactivate();
}
if (on_script_unload) {
	const oldFunc = on_script_unload;
	on_script_unload = function() {
		oldFunc();
		onScriptUnloadUI();
	};
} else {var on_script_unload = onScriptUnloadUI;}

const WshShellUI = new ActiveXObject('WScript.Shell');
const _bmp = gdi.CreateImage(1, 1);
const _gr = _bmp.GetGraphics();

// Color blindness presets
const colorBlind = {
	yellow:	[RGB(255,255,202), RGB(248,255,102), RGB(183,183,  0)],
	blue:	[RGB(230,128,230), RGB(84, 53, 255), RGB(0,  0,  255)],
	white:	[RGB(255,255,255), RGB(240,240,240), RGB(220,220,220)],
	black:	[RGB(150,150,150), RGB(75 , 75, 75), RGB(0,   0,   0)]
};

// Cache
const scaleDPI = {}; // Caches _scale() values;
const fonts = {notFound: []}; // Caches _gdifont() values;

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

function _scale(size, bRound = true) {
	if (!scaleDPI[size]) {
		let DPI;
		try {DPI = WshShellUI.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI');}
		catch (e) {DPI = 96;} // Fix for linux
		scaleDPI[size] = size * DPI / 72;
	}
	return (bRound ? Math.round(scaleDPI[size]) : scaleDPI[size]);
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

function getIdRegEx(method) {
	switch (true) {
		case method === 'invisible':
			return / \(\*[\u200b\u200c\u200d\u200e]{5}\)$/g;
		case method === 'letters':
			return / \([abcdf]{5}\)$/g;
		case method === 'indicator':
			return / \(\*\)$/g;
		default:
			return null;
	}
}

const nextIdInvisible = (function() {
		let nextIndex = [0,0,0,0,0];
		const chars = hiddenChars;
		const charsForced = [' (*',')'];
		const num = chars.length;
		let prevId = nextIndex.length + charsForced.join('').length;

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
		let nextIndex = [0,0,0,0,0];
		const chars = ['a','b','c','d','f'];
		const charsForced = [' (',')'];
		const num = chars.length;
		let prevId = nextIndex.length + charsForced.join('').length;

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

function removeIdFromStr(nameId) {
	let name = nameId;
	['invisible','letters','indicator'].forEach((method) => {
		name = name.replace(getIdRegEx(method), '');
	});
	return name;
}

/* 
	Tooltip
*/

function _tt(value, font = 'Segoe UI', fontSize = _scale(10), width = 600) {
	this.tooltip = window.Tooltip;
	this.font = {name: font, size: fontSize};
	this.tooltip.SetFont(font, fontSize);
	this.width = width;
	this.tooltip.SetMaxWidth(width);
	this.text = this.tooltip.Text = value;
	this.oldDelay = this.tooltip.GetDelayTime(3); //TTDT_INITIAL
	this.bActive = false;
	
	this.SetValue = function (value,  bForceActivate = false) {
		if (value === null) {
			this.Deactivate();
			return;
		} else {
			if (this.tooltip.Text !== value) {
				this.text = this.tooltip.Text = value;
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
		this.bActive = true;
	};
	
	this.Deactivate = function () {
		this.tooltip.Deactivate();
		this.bActive = false;
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
	let res = 0xff000000 | (r << 16) | (g << 8) | (b);
	if (typeof a !== 'undefined') {res = (res & 0x00ffffff) | (a << 24);}
	return res;
}

function RGB(r, g, b) {
	return (0xff000000 | (r << 16) | (g << 8) | (b));
}

function toRGB(color) { // returns an array like [192, 0, 0]
	const a = color - 0xFF000000;
	return [a >> 16, a >> 8 & 0xFF, a & 0xFF];
}

function blendColours(color1, color2, f) {
	// When factor is 0, result is 100% color1, when factor is 1, result is 100% color2.
	const [c1, c2] = [toRGB(color1), toRGB(color2)];
	return RGB(...c1.map((_, i) => {return Math.round(c1[i] + f * (c2[i] - c1[i]));}));
}

function getAlpha(color) {
	return ((color >> 24) & 0xff);
}

function getRed(color) {
	return ((color >> 16) & 0xff);
}

function getGreen(color) {
	return ((color >> 8) & 0xff);
}

function getBlue(color) {
	return (color & 0xff);
}

function tintColor(color, percent) {
	const [r, g, b] = [getRed(color), getGreen(color), getBlue(color)];
	return RGBA(lightenColorVal(r, percent), lightenColorVal(g, percent), lightenColorVal(b, percent), getAlpha(color));
}

function darkenColorVal(color, percent) {
	const shift = Math.max(color * percent / 100, percent / 2);
	const val = Math.round(color - shift);
	return Math.max(val, 0);
}

function lightenColorVal(color, percent) {
	const val = Math.round(color + ((255 - color) * (percent / 100)));
	return Math.min(val, 255);
}

function opaqueColor(color, percent) {
	return RGBA(...toRGB(color), Math.min(255, 255 * (percent / 100)));
}

function getBrightness(r, g, b) { // https://www.w3.org/TR/AERT/#color-contrast
	return (r * 0.299 + g * 0.587 + b * 0.114);
}

function isDark(r, g, b) {
	return (getBrightness(r,g,b) < 186);
}

function invert(color, bBW = false) {
	const [r, g, b] = [getRed(color), getGreen(color), getBlue(color)];
	if (bBW) {
		return (isDark(r, g, b) ? RGB(255, 255, 255) : RGB(0, 0, 0));
	} else {
		return RGB(255 - r, 255 - g, 255 - b);
	}
}

/* 
	Fonts
*/

function _gdiFont(name, size, style) {
	let id = name.toLowerCase() + '_' + size + '_' + (style || 0);
	if (!fonts[id]) {
		fonts[id] = gdi.Font(name, size, style || 0);
	}
	if (fonts[id].Name !== name && fonts.notFound.indexOf(name) === -1) { // Display once per session, otherwise it floods the console with the same message...
		fonts.notFound.push(name);
		fb.ShowPopupMessage('Missing font: ' + name + '\n\nPlease install dependency found at:\n' + folders.xxx + '_resources', window.Name);
		console.log('Missing font: ' + name);
	}
	return fonts[id];
}

function _textWidth(value, font) {
	return _gr.CalcTextWidth(value, font);
}