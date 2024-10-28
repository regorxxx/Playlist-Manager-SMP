'use strict';
//27/10/24

/* exported colorBlind, colorbrewer, LEFT, RIGHT, CENTRE, DT_CENTER, SF_CENTRE, LM, TM, nextId, _tt, blendColors, lightenColor, darkenColor, tintColor, opaqueColor, invert, _gdiFont, removeIdFromStr, _textWidth, popup */

include(fb.ComponentPath + 'docs\\Flags.js');
/* global DT_VCENTER:readable, DT_NOPREFIX:readable, DT_CALCRECT:readable, DT_END_ELLIPSIS:readable, DT_RIGHT:readable, DT_CENTER:readable */
include('helpers_xxx.js');
/* global globFonts:readable, globSettings:readable, doOnce:readable, folders:readable, globSettings:readable */
include('helpers_xxx_UI_chars.js');
include('callbacks_xxx.js');

/*
	Global Variables
*/

// Callbacks
addEventListener('on_script_unload', () => {
	window.Tooltip.Deactivate();
});

const WshShellUI = typeof WshShell === 'undefined' ? new ActiveXObject('WScript.Shell') : WshShell; // eslint-disable-line no-undef
const _bmp = gdi.CreateImage(1, 1);
const _gr = _bmp.GetGraphics();

// Color blindness presets
const colorBlind = {
	yellow: [RGB(255, 255, 202), RGB(248, 255, 102), RGB(183, 183, 0)],
	blue: [RGB(230, 128, 230), RGB(84, 53, 255), RGB(0, 0, 255)],
	white: [RGB(255, 255, 255), RGB(240, 240, 240), RGB(220, 220, 220)],
	black: [RGB(150, 150, 150), RGB(75, 75, 75), RGB(0, 0, 0)]
};

// colorbrewer presets
const colorbrewer = {
	diverging: ['Spectral', 'RdYlGn', 'RdBu', 'PiYG', 'PRGn', 'RdYlBu', 'BrBG', 'RdGy', 'PuOr'],
	qualitative: ['Set2', 'Accent', 'Set1', 'Set3', 'Dark2', 'Paired', 'Pastel2', 'Pastel1'],
	sequential: ['OrRd', 'PuBu', 'BuPu', 'Oranges', 'BuGn', 'YlOrBr', 'YlGn', 'Reds', 'RdPu', 'Greens', 'YlGnBu', 'Purples', 'GnBu', 'Greys', 'YlOrRd', 'PuRd', 'Blues', 'PuBuGn'],
	colorBlind: {
		diverging: ['RdBu', 'PiYG', 'PRGn', 'RdYlBu', 'BrBG', 'PuOr'],
		qualitative: ['Set2', 'Dark2', 'Paired'],
		sequential: ['OrRd', 'PuBu', 'BuPu', 'Oranges', 'BuGn', 'YlOrBr', 'YlGn', 'Reds', 'RdPu', 'Greens', 'YlGnBu', 'Purples', 'GnBu', 'Greys', 'YlOrRd', 'PuRd', 'Blues', 'PuBuGn']
	}
};

// Cache
const scaleDPI = { factor: -1, reference: 72 }; // Caches _scale() values;
const fonts = { notFound: [] }; // Caches _gdifont() values;

// Flags
const LEFT = DT_VCENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
const RIGHT = DT_VCENTER | DT_RIGHT | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
const CENTRE = DT_VCENTER | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
const SF_CENTRE = 285212672;

const LM = _scale(5);
const TM = _scale(15);

// Combinations of invisible chars may be used on UI elements to assign IDs...
const hiddenChars = ['\u200b', '\u200c', '\u200d', '\u200e'];

function _scale(size, bRound = true) {
	if (scaleDPI.factor === -1) {
		try { scaleDPI.factor = Number(WshShellUI.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI')) / scaleDPI.reference; }
		catch (e) { scaleDPI.factor = 1; }
	}
	return (bRound ? Math.round(size * scaleDPI.factor) : size * scaleDPI.factor);
}

/*
	IDs
*/

function nextId(method, bNext = true, bCharsForced = true, bReset = false) {
	switch (true) {
		case method === 'invisible':
			return nextIdInvisible(bNext, bCharsForced, bReset);
		case method === 'letters':
			return nextIdLetters(bNext, bCharsForced, bReset);
		case method === 'indicator':
			return nextIdIndicator(bNext);
		default:
			return '';
	}
}

function getIdRegEx(method, bCharsForced = true) {
	switch (true) {
		case method === 'invisible':
			// eslint-disable-next-line no-misleading-character-class
			return (bCharsForced ? / \(\*[\u200b\u200c\u200d\u200e]{5}\)$/g : /[\u200b\u200c\u200d\u200e]{5}$/g); // NOSONAR
		case method === 'letters':
			return (bCharsForced ? / \([abcdf]{5}\)$/g : /[abcdf]{5}$/g);
		case method === 'indicator':
			return (/ \(\*\)$/g);
		default:
			return null;
	}
}

const nextIdInvisible = (function () {
	let nextIndex = [0, 0, 0, 0, 0];
	const chars = hiddenChars;
	const charsForced = [' (*', ')'];
	const num = chars.length;
	let prevId = '';
	return function (bNext = true, bCharsForced = true, bReset = false) {
		if (bReset) { nextIndex = [0, 0, 0, 0, 0]; prevId = ''; return prevId; }
		if (!bNext) { return prevId; }
		let a = nextIndex[0];
		let b = nextIndex[1];
		let c = nextIndex[2];
		let d = nextIndex[3];
		let e = nextIndex[4];
		const id = (bCharsForced ? charsForced[0] : '') + chars[a] + chars[b] + chars[c] + chars[d] + chars[e] + (bCharsForced ? charsForced[1] : '');
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

const nextIdLetters = (function () {
	let nextIndex = [0, 0, 0, 0, 0];
	const chars = ['a', 'b', 'c', 'd', 'f'];
	const charsForced = [' (', ')'];
	const num = chars.length;
	let prevId = '';
	return function (bNext = true, bCharsForced = true, bReset = false) {
		if (bReset) { nextIndex = [0, 0, 0, 0, 0]; prevId = ''; return prevId; }
		if (!bNext) { return prevId; }
		let a = nextIndex[0];
		let b = nextIndex[1];
		let c = nextIndex[2];
		let d = nextIndex[3];
		let e = nextIndex[4];
		const id = (bCharsForced ? charsForced[0] : '') + chars[a] + chars[b] + chars[c] + chars[d] + chars[e] + (bCharsForced ? charsForced[1] : '');
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

const nextIdIndicator = (function () { // Same structure to ease compatibility
	return function () {
		return ' (*)';
	};
}());

function removeIdFromStr(nameId) {
	let name = nameId;
	['invisible', 'letters', 'indicator'].forEach((method) => {
		name = name.replace(getIdRegEx(method), '');
	});
	return name;
}

/*
	Tooltip
*/

function _tt(value, font = globFonts.tooltip.name, fontSize = _scale(globFonts.tooltip.size), width = 600) {
	this.SetValue = (value, bForceActivate = false) => {
		if (!globSettings.bTooltip) { return true; }
		if (!this.tooltip && !this.init()) { return false; }
		if (value === null) {
			this.Deactivate();
		} else {
			value = value.replace(/&/g,'&&');
			if (this.tooltip.Text !== value) {
				this.text = this.tooltip.Text = value;
				this.Activate();
			}
			if (bForceActivate) { this.Activate(); } // Only on force to avoid flicker
		}
		return true;
	};

	this.SetFont = (name, size, style = 0) => {
		if (!globSettings.bTooltip) { return true; }
		if (!this.tooltip && !this.init()) { return false; }
		this.tooltip.SetFont(name, size, style);
		this.font = { name, size, style };
		return true;
	};

	this.SetMaxWidth = (width) => {
		if (!globSettings.bTooltip) { return true; }
		if (!this.tooltip && !this.init()) { return false; }
		this.tooltip.SetMaxWidth(width);
		this.width = width;
		return true;
	};

	this.Activate = () => {
		if (!globSettings.bTooltip) { return true; }
		if (!this.tooltip && !this.init()) { return false; }
		this.tooltip.Activate();
		this.bActive = true;
		return true;
	};

	this.Deactivate = () => {
		if (!globSettings.bTooltip) { return true; }
		if (!this.tooltip && !this.init()) { return false; }
		this.tooltip.Deactivate();
		this.bActive = false;
		return true;
	};

	this.SetDelayTime = (type, time) => {
		if (!this.tooltip && !this.init()) { return false; }
		this.tooltip.SetDelayTime(type, time);
		return true;
	};

	this.GetDelayTime = (type) => {
		if (!globSettings.bTooltip) { return; }
		if (!this.tooltip && !this.init()) { return; }
		return this.tooltip.GetDelayTime(type);
	};

	this.init = () => {
		this.tooltip = window.Tooltip;
		if (!this.tooltip) { doOnce('tooltip fail', console.log)('Tooltip failed to initialize'); return false; } // Workaround for tooltip bug
		if (!globSettings.bTooltip) { return true; }
		if (utils.CheckFont(this.font.name)) { this.SetFont(this.font.name, this.font.size); } // Workaround for missing fonts
		this.SetMaxWidth(this.width);
		this.oldDelay = this.tooltip.GetDelayTime(3); //TTDT_INITIAL
		this.tooltip.Text = this.text;
		return true;
	};

	this.tooltip = null;
	this.width = width;
	this.text = value;
	this.font = { name: font, size: fontSize, style: 0 };
	this.bActive = false;
	this.oldDelay = 100;
	this.init();
}

/*
	Colours
*/

function RGBA(r, g, b, a) {
	const res = 0xff000000 | (r << 16) | (g << 8) | (b);
	if (typeof a !== 'undefined') { return (res & 0x00ffffff) | (a << 24); }
	return res;
}

function RGB(r, g, b) {
	return (0xff000000 | (r << 16) | (g << 8) | (b));
}

function toRGB(color) { // returns an array like [192, 0, 0]
	const a = color - 0xFF000000;
	return [a >> 16 & 0xFF, a >> 8 & 0xFF, a & 0xFF];
}

function blendColors(color1, color2, f) {
	// When factor is 0, result is 100% color1, when factor is 1, result is 100% color2.
	const [c1, c2] = [toRGB(color1), toRGB(color2)];
	return RGB(...c1.map((_, i) => Math.round(c1[i] + f * (c2[i] - c1[i]))));
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

function lightenColor(color, percent) {
	const [r, g, b] = [getRed(color), getGreen(color), getBlue(color)];
	return RGBA(lightenColorVal(r, percent), lightenColorVal(g, percent), lightenColorVal(b, percent), getAlpha(color));
}

function darkenColor(color, percent) {
	const [r, g, b] = [getRed(color), getGreen(color), getBlue(color)];
	return RGBA(darkenColorVal(r, percent), darkenColorVal(g, percent), darkenColorVal(b, percent), getAlpha(color));
}

function tintColor(color, percent) {
	const [r, g, b] = [getRed(color), getGreen(color), getBlue(color)];
	return isDark(r, g, b)
		? RGBA(lightenColorVal(r, percent), lightenColorVal(g, percent), lightenColorVal(b, percent), getAlpha(color))
		: RGBA(darkenColorVal(r, percent), darkenColorVal(g, percent), darkenColorVal(b, percent), getAlpha(color));
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
	return (getBrightness(r, g, b) < 186);
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
	const id = name.toLowerCase() + '_' + size + '_' + (style || 0);
	if (!fonts[id]) {
		fonts[id] = gdi.Font(name, size, style || 0);
	}
	if (fonts[id].Name !== name && fonts.notFound.indexOf(name) === -1) { // Display once per session, otherwise it floods the console with the same message...
		fonts.notFound.push(name);
		fb.ShowPopupMessage('Missing font: ' + name + '\n\nPlease install dependency found at (a restart is required):\n' + folders.xxx + '_resources', window.Name);
		console.log('Missing font: ' + name);
	}
	return fonts[id];
}

function _textWidth(value, font) {
	return _gr.CalcTextWidth(value, font);
}