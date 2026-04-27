'use strict';
//23/04/26

/* exported colorBlind, colorbrewer, LEFT, RIGHT, CENTRE, DT_CENTER, SF_CENTRE, LM, TM, nextId, _tt, blendColors, lightenColor, darkenColor, tintColor, opaqueColor, invert, _gdiFont, removeIdFromStr, _textWidth, _textHeight, _textLines, _textLinesWrap, popup, applyAsMask, applyMask, getRed, getBlue, getGreen, getAlpha, applyEffectAsMask, applyEffect, applyEffectAsMaskEffect */

include(fb.ComponentPath + 'docs\\Flags.js');
/* global DT_VCENTER:readable, DT_NOPREFIX:readable, DT_CALCRECT:readable, DT_END_ELLIPSIS:readable, DT_RIGHT:readable, DT_CENTER:readable, TTDT_INITIAL:readable */
include('helpers_xxx.js');
/* global globFonts:readable, globSettings:readable, doOnce:readable, globSettings:readable */
/* global _isFile:readable */
if (window.Parent === 'foo_uie_jsplitter' && _isFile(fb.ComponentPath + '\\docs\\Effects.js')) { include(fb.ComponentPath + '\\docs\\Effects.js'); }
/* global Effects:readable */
include('helpers_xxx_UI_chars.js');
include('callbacks_xxx.js');
include('helpers_xxx_prototypes.js');
/* window.FullPanelName:readable */

/*
	Global Variables
*/

// Callbacks
addEventListener('on_script_unload', () => {
	_bmp.ReleaseGraphics(_gr);
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
const fonts = { notFound: [] }; // Caches _gdiFont() values;

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
		if (typeof window.DPI === 'number') {
			scaleDPI.factor = window.DPI / scaleDPI.reference;
		} else {
			try {
				scaleDPI.factor = Number(WshShellUI.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI')) / scaleDPI.reference;
			} catch (e) { // eslint-disable-line no-unused-vars
				try {
					scaleDPI.factor = Number(WshShellUI.RegRead('HKCU\\Control Panel\\Desktop\\LogPixels')) / scaleDPI.reference;
				} catch (e) { // eslint-disable-line no-unused-vars
					try {
						scaleDPI.factor = Number(WshShellUI.RegRead('HKCU\\Software\\System\\CurrentControlSet\\Hardware Profiles\\Current\\Software\\Fonts\\LogPixels')) / scaleDPI.reference;
					} catch (e) { // eslint-disable-line no-unused-vars
						try {
							scaleDPI.factor = Number(WshShellUI.RegRead('HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion\\FontDPI\\LogPixels')) / scaleDPI.reference;
						} catch (e) { // eslint-disable-line no-unused-vars
							try {
								scaleDPI.factor = Number(WshShellUI.RegRead('HKLM\\System\\CurrentControlSet\\Hardware Profiles\\Current\\Software\\Fonts\\LogPixels')) / scaleDPI.reference;
							} catch (e) { // eslint-disable-line no-unused-vars
								scaleDPI.factor = 1;
							}
						}
					}
				}
			}
		}
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
			value = value.replace(/&/g, '&&');
			if (this.tooltip.Text !== value) {
				this.text = this.tooltip.Text = value;
				this.Activate();
			}
			if (bForceActivate) { this.Activate(); } // Only on force to avoid flicker
		}
		return true;
	};

	this.SetValueThrottled = (value, bForceActivate, timeout = this.throttle) => {
		if (timerId) { return timerId; }
		timerId = setTimeout(() => {
			this.SetValue(value, bForceActivate);
			timerId = null;
		}, timeout);
		return timerId;
	};

	this.SetValueDebounced = (value, bForceActivate, timeout = this.throttle) => {
		clearTimeout(timerId);
		timerId = setTimeout(() => this.SetValue(value, bForceActivate), timeout);
		return timerId;
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
		this.oldDelay = this.tooltip.GetDelayTime(TTDT_INITIAL);
		this.tooltip.Text = this.text;
		if (timerId) { clearTimeout(timerId); }
		timerId = null;
		return true;
	};

	let timerId = null;
	this.tooltip = null;
	this.width = width;
	this.text = value;
	this.font = { name: font, size: fontSize, style: 0 };
	this.bActive = false;
	this.oldDelay = 100;
	this.throttle = 250;
	this.init();
}

/*
	Colors
*/

function clampRGB(c) {
	return Math.max(Math.min(c, 255), 0);
}

function RGBA(r, g, b, a) {
	const c = 0xff000000 | (clampRGB(r) << 16) | (clampRGB(g) << 8) | (clampRGB(b));
	if (typeof a !== 'undefined') { return (c & 0x00ffffff) | (clampRGB(a) << 24); }
	return c;
}

function RGB(r, g, b) {
	const c = 0xff000000 | (clampRGB(r) << 16) | (clampRGB(g) << 8) | (clampRGB(b));
	return c < 0 ? 4294967296 + c : c;
}

function toRGB(color) { // returns an array like [192, 0, 0]
	const a = color | 0xFF000000;
	return [clampRGB((a >> 16) & 0xff), clampRGB((a >> 8) & 0xFF), clampRGB(a & 0xFF)];
}

function toRGBA(color) { // returns an array like [192, 0, 0, 25]
	const a = color | 0xFF000000;
	return [clampRGB((a >> 16) & 0xff), clampRGB((a >> 8) & 0xFF), clampRGB(a & 0xFF), clampRGB((a >> 24) & 0xff)];
}

function blendColors(color1, color2, f, bUseAlpha = false) {
	f = Math.max(Math.min(f, 1), 0);
	// When factor is 0, result is 100% color1, when factor is 1, result is 100% color2.
	const [c1, c2] = [toRGBA(color1), toRGBA(color2)];
	return (bUseAlpha ? RGBA : RGB)(...c1.map((_, i) => clampRGB(Math.round(c1[i] + f * (c2[i] - c1[i])))));
}

function getAlpha(color) {
	return clampRGB((color >> 24) & 0xff);
}

function getRed(color) {
	return clampRGB((color >> 16) & 0xff);
}

function getGreen(color) {
	return clampRGB((color >> 8) & 0xff);
}

function getBlue(color) {
	return clampRGB(color & 0xff);
}

function lightenColor(color, percent, bUseAlpha = false) {
	const [r, g, b, a] = toRGBA(color);
	return RGBA(lightenColorVal(r, percent), lightenColorVal(g, percent), lightenColorVal(b, percent), bUseAlpha ? a : 255);
}

function darkenColor(color, percent, bUseAlpha = false) {
	const [r, g, b, a] = toRGBA(color);
	return RGBA(darkenColorVal(r, percent), darkenColorVal(g, percent), darkenColorVal(b, percent), bUseAlpha ? a : 255);
}

function tintColor(color, percent, bUseAlpha = false) {
	const [r, g, b, a] = toRGBA(color);
	return isDark(r, g, b)
		? RGBA(lightenColorVal(r, percent), lightenColorVal(g, percent), lightenColorVal(b, percent), bUseAlpha ? a : 255)
		: RGBA(darkenColorVal(r, percent), darkenColorVal(g, percent), darkenColorVal(b, percent), bUseAlpha ? a : 255);
}

function darkenColorVal(color, percent) {
	const shift = Math.max(color * percent / 100, percent / 2);
	const val = Math.round(color - shift);
	return clampRGB(val);
}

function lightenColorVal(color, percent) {
	const val = Math.round(color + ((255 - color) * (percent / 100)));
	return clampRGB(val);
}

function opaqueColor(color, percent) {
	return RGBA(...toRGB(color), clampRGB(255 * (percent / 100)));
}

function getBrightness(r, g, b) { // https://www.w3.org/TR/AERT/#color-contrast
	return arguments.length === 1
		? getBrightness(...toRGB(r))
		: (r * 0.299 + g * 0.587 + b * 0.114);
}

function isDark(r, g, b) {
	return arguments.length === 1
		? getBrightness(...toRGB(r)) < 186
		: getBrightness(r, g, b) < 186;
}

function invert(color, bBW = false, bUseAlpha = false) {
	const [r, g, b, a] = toRGBA(color);
	return bBW
		? (isDark(r, g, b) ? RGBA(255, 255, 255, bUseAlpha ? a : 255) : RGBA(0, 0, 0, bUseAlpha ? a : 255))
		: RGBA(255 - r, 255 - g, 255 - b, bUseAlpha ? a : 255);
}

/*
	Fonts
*/

function _gdiFont(name, size, style) {
	const id = name.toLowerCase() + '_' + size + '_' + (style || 0);
	if (!fonts[id]) {
		fonts[id] = gdi.Font(name, size, style || 0);
	}
	if (fonts[id].Name !== name && !fonts.notFound.includes(name)) { // Display once per session, otherwise it floods the console with the same message...
		fonts.notFound.push(name);
		fb.ShowPopupMessage('Missing font: ' + name + '\n\nPlease install the required fonts found at:\nhttps://github.com/regorxxx/foobar2000-assets/tree/main/Fonts\n\nA restart is required after installation!', window.FullPanelName);
		console.log('Missing font: ' + name);
	}
	return fonts[id];
}

function _textWidth(value, font) {
	try { return _gr ? _gr.CalcTextWidth(value, font) : 0; }
	catch (e) { return 0; } // eslint-disable-line no-unused-vars
}

function _textHeight(value, font) {
	try { return _gr ? _gr.CalcTextHeight(value, font) : 0; }
	catch (e) { return 0; } // eslint-disable-line no-unused-vars
}

function _textLines(value, font, maxWidth) {
	try { return _gr ? (_gr.EstimateLineWrap(value, font, maxWidth).length / 2 - 1) || 1 : 1; }
	catch (e) { return 1; } // eslint-disable-line no-unused-vars
}

function _textLinesWrap(value, font, maxWidth) {
	try { return _gr ? _gr.EstimateLineWrap(value, font, maxWidth) : []; }
	catch (e) { return []; } // eslint-disable-line no-unused-vars
}

/*
	Imgs
*/

/**
 * Applies manipulations to image (applyCallback) on a region defined by 'maskCallback' (use white color to skip processing)
 *
 * @function
 * @name applyAsMask
 * @param {GdiBitmap|D2DBitmap} img - Img to manipulate
 * @param {(img:GdiBitmap|D2DBitmap, gr:GdiGraphics|D2DGraphics, w:number, h:number) => void} applyCallback - Img manipulation logic. Width and height are from original img. To maintain D2D compatibility, don't use img rotation without releasing img gr first (when doing so, return true)
 * @param {(mask:GdiBitmap|D2DBitmap, gr:GdiGraphics|D2DGraphics, w:number, h:number) => void} maskCallback - Mask drawing. Width and height are from original img. The mask is prefilled with black by default (i.e. applies over all img). To maintain D2D compatibility, don't use mask rotation without releasing mask gr first (when doing so, return true)
 * @param {boolean} bInvertMask - If true, prefills mask with white.
 * @returns {GdiBitmap|D2DBitmap}
 */
function applyAsMask(img, applyCallback, maskCallback, bInvertMask) {
	const clone = img.Clone(0, 0, img.Width, img.Height);
	applyManipulation(clone, applyCallback);
	applyMask(clone, maskCallback, bInvertMask);
	const imgGr = img.GetGraphics();
	imgGr.DrawImage(clone, 0, 0, img.Width, img.Height, 0, 0, img.Width, img.Height);
	img.ReleaseGraphics(imgGr);
	return img;
};

/**
 * Applies image on a region defined by 'maskCallback' (use white color to skip processing)
 *
 * @function
 * @name applyMask
 * @param {GdiBitmap|D2DBitmap} img - Img to manipulate
 * @param {(mask:GdiBitmap|D2DBitmap, gr:GdiGraphics|D2DGraphics, w:number, h:number) => Boolean} maskCallback - Mask drawing. Width and height are from original img. The mask is prefilled with black by default (i.e. applies over all img). To maintain D2D compatibility, don't use mask rotation without releasing mask gr first (when doing so, return true)
 * @param {boolean} bInvertMask -  If true, prefills mask with white.
 * @returns {GdiBitmap|D2DBitmap}
 */
function applyMask(img, maskCallback, bInvertMask) {
	const mask = gdi.CreateImage(img.Width, img.Height);
	const maskGr = mask.GetGraphics();
	maskGr.FillSolidRect(0, 0, img.Width, img.Height, bInvertMask ? 0xFFFFFFFF : 0xFF000000);
	if (!maskCallback(mask, maskGr, img.Width, img.Height)) { mask.ReleaseGraphics(maskGr); }
	img.ApplyMask(mask);
	return img;
};

/**
 * Applies manipulations to image (applyCallback)
 *
 * @function
 * @name applyManipulation
 * @param {GdiBitmap|D2DBitmap} img - Img to manipulate
 * @param {(img:GdiBitmap|D2DBitmap, gr:GdiGraphics|D2DGraphics, w:number, h:number) => Boolean} applyCallback - Img manipulation logic. Width and height are from original img. To maintain D2D compatibility, don't use img rotation without releasing img gr first (when doing so, return true)
 * @returns {GdiBitmap|D2DBitmap}
 */
function applyManipulation(img, applyCallback) {
	const imgGr = img.GetGraphics();
	if (!applyCallback(img, imgGr, img.Width, img.Height)) { img.ReleaseGraphics(imgGr); }
	return img;
};

/**
 * Applies D2D effects to image (applyCallback) on a region defined by 'maskCallback' (use white color to skip processing)
 *
 * @function
 * @name applyAsMask
 * @param {D2DBitmap} img - Img to manipulate
 * @param {(img:D2DBitmap, w:number, h:number) => void} applyCallback - Img manipulation logic. Width and height are from original img. Don't use img rotation or stack blur without releasing img gr first (when doing so, return true)
 * @param {(mask:D2DBitmap, gr:D2DGraphics, w:number, h:number) => void} maskCallback - Mask drawing. Width and height are from original img. The mask is prefilled with black by default (i.e. applies over all img). Don't use mask rotation or stack blur without releasing mask gr first (when doing so, return true)
 * @param {boolean} bInvertMask - If true, prefills mask with white.
 * @returns {GdiBitmap|D2DBitmap}
 */
function applyEffectAsMask(img, effectCallback, maskCallback, bInvertMask) {
	const clone = d2d.CreateImage(img.Width, img.Height);
	applyEffect(img, effectCallback, clone);
	applyMask(clone, maskCallback, bInvertMask);
	const imgGr = img.GetGraphics();
	imgGr.DrawImage(clone, 0, 0, img.Width, img.Height, 0, 0, img.Width, img.Height);
	img.ReleaseGraphics(imgGr);
	return img;
};

/**
 * Applies D2D effects to image/effect (effectCallback) on a region defined by 'maskCallback' (use black color to skip processing)
 *
 * @function
 * @name applyEffectAsMaskEffect
 * @param {D2DBitmap|{Width: number, Height: number}} img - Img to manipulate and/or retrieve size to create a mask
 * @param {D2DEffect} source - Effect source for chaining. If not provided, the img is used for composition
 * @param {(img:D2DBitmap, source:D2DEffect) => D2DEffect} effectCallback - Effect manipulation logic. Width and height are from original img. Don't use img rotation or stack blur without releasing img gr first (when doing so, return true)
 * @param {(mask:D2DBitmap, gr:D2DGraphics, w:number, h:number) => Boolean} maskCallback - Mask drawing. Width and height are from original img. The mask is prefilled with black by default (i.e. applies over all img). Don't use mask rotation or stack blur without releasing mask gr first (when doing so, return true)
 * @param {boolean} bInvertMask - If true, prefills mask with white.
 * @returns {D2DEffect}
 */
function applyEffectAsMaskEffect(img, source, effectCallback, maskCallback, bInvertMask) {
	const effect = effectCallback(img, source);
	const mask = gdi.CreateImage(img.Width, img.Height);
	const maskGr = mask.GetGraphics();
	maskGr.FillSolidRect(0, 0, img.Width, img.Height, bInvertMask ? 0xFFFFFFFF : 0xFF000000);
	if (!maskCallback(mask, maskGr, img.Width, img.Height)) { mask.ReleaseGraphics(maskGr); }
	const effectMask = d2d.Effect(Effects.LuminanceToAlpha.ID);
	effectMask.SetInput(0, mask);
	const maskedEffect = d2d.Effect(Effects.AlphaMask.ID);
	maskedEffect.SetInputEffect(0, effect);
	maskedEffect.SetInputEffect(1, effectMask);
	const out = d2d.Effect(Effects.Composite.ID);
	if (source) { out.SetInputEffect(0, source); }
	else { out.SetInputEffect(0, img); }
	out.SetInputEffect(1, maskedEffect);
	return out;
};

/**
 * Applies D2D effects to image (effectCallback)
 *
 * @function
 * @name applyEffect
 * @param {D2DBitmap} img - Img source to apply effects
 * @param {(img:D2DBitmap, gr:D2DGraphics, w:number, h:number) => void} effectCallback - Img manipulation logic. Width and height are from original img. To maintain D2D compatibility, don't use img rotation without releasing img gr first (when doing so, return true)
 * @param {D2DBitmap?} imgDest - Img destination to draw over. If not specified, an empty image based on input size is used. Set to null to draw over input.
 * @param {number?} composite - [=0] Composition mode flags for {@link D2DGraphics#DrawEffect DrawEffect}
 * @returns {D2DBitmap}
 */
function applyEffect(img, effectCallback, imgDest = d2d.CreateImage(img.Width, img.Height), composite = 0) {
	const effect = effectCallback(img, img.Width, img.Height);
	if (effect) {
		const imgGr = (imgDest || img).GetGraphics();
		imgGr.DrawEffect(effect, 0, 0, 0, 0, img.Width, img.Height, composite);
		(imgDest || img).ReleaseGraphics(imgGr);
		return (imgDest || img);
	}
	return img;
};