﻿'use strict';
//04/06/25

/* exported _panel */

/* global bottomToolbar:readable */
include('..\\..\\helpers\\helpers_xxx.js');
/* global globFonts:readable, FontStyle:readable, InterpolationMode:readable, DLGC_WANTALLKEYS:readable, clone: readable */
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
/* global isInt:readable, isBoolean:readable, isJSON:readable, isInt:readable, debounce:readable, deepAssign:readable*/
include('..\\..\\helpers\\helpers_xxx_properties.js');
/* global overwriteProperties:readable, setProperties:readable, getPropertiesPairs:readable */
include('..\\..\\helpers\\helpers_xxx_UI.js');
/* global RGB:readable, _scale:readable, invert:readable, blendColors:readable, _gdiFont:readable */

function _panel(customBackground = false, bSetup = false) {

	const panelProperties = {
		fontSize: ['Font size', _scale(10), { func: isInt }],
		colorsMode: ['Background color mode', 0, { func: isInt, range: [[0, 2]] }],
		customBackground: ['Custom background color', RGB(30, 30, 30), { func: isInt }], // Black
		bCustomText: ['Text custom color mode', false, { func: isBoolean }],
		customText: ['Custom text color', RGB(157, 158, 163), { func: isInt }], // Gray
		buttonsTextColor: ['Buttons\' text color', bottomToolbar.config.textColor, { func: isInt }],
		bAltRowsColor: ['Alternate rows background color', true, { func: isBoolean }],
		bToolbar: ['Use toolbar mode?', true, { func: isBoolean }],
		bButtonsBackground: ['Use buttons background?', false, { func: isBoolean }],
		buttonsToolbarColor: ['Buttons\' toolbar color', RGB(0, 0, 0), { func: isInt }],
		buttonsToolbarTransparency: ['Buttons\' toolbar transparency', 5, { func: isInt, range: [[0, 100]] }],
		imageBackground: ['Image background config', JSON.stringify({
			enabled: true,
			mode: 1,
			art: { path: '', image: null, id: '' },
			transparency: 60,
			bProportions: true,
			bFill: true,
			blur: 10,
			bTint: true,
			bCacheAlbum: true
		}), { func: isJSON }],
		bFontOutline: ['Add shadows to font?', false, { func: isBoolean }],
		bBold: ['Use bold font?', false, { func: isBoolean }],
		headerButtonsColor: ['Header buttons\' toolbar color', -1, { func: isInt }],
	};
	for (let key in panelProperties) { panelProperties[key][3] = panelProperties[key][1]; }
	setProperties(panelProperties, 'panel_');

	this.colorsChanged = () => {
		if (window.InstanceType) {
			this.colors.background = window.GetColourDUI(1);
			// Workaround for foo_flowin using DUI and not matching global CUI theme (at least on foobar v1.6)
			if (window.IsDark && this.colors.background === 4293059298) {
				this.colors.background = RGB(25, 25, 25);
			}
			this.colors.text = this.colors.bCustomText ? this.colors.customText : window.GetColourDUI(0);
			this.colors.highlight = window.GetColourDUI(2);
		} else {
			this.colors.background = window.GetColourCUI(3);
			this.colors.text = this.colors.bCustomText ? this.colors.customText : window.GetColourCUI(0);
			this.colors.highlight = blendColors(this.colors.text, this.colors.background, 0.4);
		}
		// Change default text color to the inverse of the background
		if (!this.colors.bCustomText && invert(this.getColorBackground(), true) === invert(this.colors.text, true)) {
			this.colors.text = invert(this.getColorBackground(), true);
			this.colors.highlight = blendColors(this.colors.text, this.colors.background, 0.4);
		}
		this.colors.header = this.colors.highlight & 0x45FFFFFF;
		if (this.colors.headerButtons === -1) { this.colors.headerButtons = this.colors.highlight; }
		bottomToolbar.config.bToolbar = this.colors.bToolbar; // buttons_xxx.js
		bottomToolbar.config.partAndStateID = this.colors.bButtonsBackground ? 1 : 6; // buttons_xxx.js
		bottomToolbar.config.textColor = this.colors.buttonsTextColor; // buttons_xxx.js
		bottomToolbar.config.toolbarColor = this.colors.buttonsToolbarColor; // buttons_xxx.js
		bottomToolbar.config.toolbarTransparency = this.colors.buttonsToolbarTransparency; // buttons_xxx.js
	};

	this.fontChanged = () => {
		let name;
		let font = window.InstanceType ? window.GetFontDUI(0) : window.GetFontCUI(0);
		if (font) {
			name = font.Name;
		} else {
			name = globFonts.standard.name;
			console.log('Unable to use default font. Using', name, 'instead.');
		}
		if (this.fonts.size <= 0) { this.fonts.size = 6; }
		this.fonts.inputSize = _scale(Math.max(this.fonts.size - 9, 6));
		this.fonts.headerSize = _scale(Math.max(this.fonts.size - 7, 8));
		this.fonts.title = _gdiFont(name, (this.fonts.size + 2) <= 16 ? this.fonts.size + 2 : this.fonts.size, FontStyle.Bold);
		this.fonts.normal = _gdiFont(name, this.fonts.size);
		this.fonts.normalBold = _gdiFont(name, this.fonts.size - 1, FontStyle.Bold);
		this.fonts.buttons = _gdiFont(name, _scale(Math.max(this.fonts.size - 8, 7)));
		this.fonts.small = _gdiFont(name, this.fonts.size - 4);
		this.fonts.fixed = _gdiFont('Lucida Console', this.fonts.size);
		this.rowHeight = this.fonts.normal.Height;
		this.listObjects.forEach((item) => item.size());
		bottomToolbar.on_size_buttn();
	};

	this.size = () => {
		this.w = window.Width;
		this.h = window.Height;
	};

	this.getColorBackground = () => {
		let col;
		switch (true) {
			case window.IsTransparent:
				return;
			case !this.customBackground:
			case this.colors.mode === 0:
				col = this.colors.background;
				break;
			case this.colors.mode === 1:
				col = window.InstanceType
					? window.GetColourDUI(1)
					: window.GetColourCUI(3, '{DA66E8F3-D210-4AD2-89D4-9B2CC58D0235}');
				break;
			case this.colors.mode === 2:
				col = this.colors.customBackground;
				break;
		}
		return col;
	};

	this.updateImageBg = debounce((bForce = false) => {
		if (!this.imageBackground.enabled) { this.imageBackground.art.path = ''; this.imageBackground.art.image = null; this.imageBackground.handle = null; this.imageBackground.art.colors = null; this.imageBackground.art.id = null; }
		let handle;
		if (this.imageBackground.mode === 0) { // Selection
			handle = fb.GetFocusItem(true);
		} else if (this.imageBackground.mode === 1) { // Now Playing
			handle = fb.GetNowPlaying() || fb.GetFocusItem(true);
		}
		if (!bForce && (handle && this.imageBackground.handle === handle.RawPath || this.imageBackground.handle === this.imageBackground.art.path)) { return; }
		let id = null;
		if (this.imageBackground.bCacheAlbum && handle) {
			const tf = fb.TitleFormat('%ALBUM%|$directory(%PATH%,1)');
			id = tf.EvalWithMetadb(handle);
			if (!bForce && id === this.imageBackground.art.id) { return; }
		}
		const promise = this.imageBackground.mode === 2 && this.imageBackground.art.path.length
			? gdi.LoadImageAsyncV2('', this.imageBackground.art.path)
			: handle
				? utils.GetAlbumArtAsyncV2(void (0), handle, 0, true, false, false)
				: Promise.reject(new Error('No handle/art'));
		promise.then((result) => {
			if (this.imageBackground.mode === 2) {
				this.imageBackground.art.image = result;
				this.imageBackground.handle = this.imageBackground.art.path;
			} else {
				if (!result.image) { throw new Error('Image not available'); }
				this.imageBackground.art.image = result.image;
				this.imageBackground.art.path = result.path;
				this.imageBackground.handle = handle.RawPath;
				this.imageBackground.art.id = id;
			}
			if (this.imageBackground.art.image && Number.isInteger(this.imageBackground.blur) && this.imageBackground.blur > 0) {
				this.imageBackground.art.image.StackBlur(this.imageBackground.blur);
			}
			if (this.imageBackground.art.image) {
				this.imageBackground.art.colors = JSON.parse(this.imageBackground.art.image.GetColourSchemeJSON(4));
			}
			return this.listObjects.map((item) => item.repaint());
		}).catch(() => {
			this.imageBackground.art.path = ''; this.imageBackground.art.image = null; this.imageBackground.handle = null; this.imageBackground.art.colors = null; this.imageBackground.art.id = null;
			return this.listObjects.map((item) => item.repaint());
		});
	}, 250);

	this.paintImage = (gr, limits = { x: 0, y: 0, w: this.w, h: this.h, offsetH: 0 }, fill = null /* {transparency: 20} */) => { // NOSONAR
		if (this.imageBackground.enabled && this.imageBackground.art.image) {
			gr.SetInterpolationMode(InterpolationMode.InterpolationModeBilinear);
			const img = this.imageBackground.art.image;
			if (fill) {
				gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, 0, img.Height / 2, Math.min(img.Width, limits.w), Math.min(img.Height, limits.h), 0, fill.transparency);
			} else {
				if (this.imageBackground.bFill) { // NOSONAR
					if (this.imageBackground.bProportions) {
						const prop = limits.w / (limits.h - limits.offsetH);
						if (prop > 1) {
							const offsetY = img.Height / prop;
							gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, 0, (img.Height - offsetY) / 2, img.Width, offsetY, 0, this.imageBackground.transparency);
						} else {
							const offsetX = img.Width * prop;
							gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, (img.Width - offsetX) / 2, 0, offsetX, img.Height, 0, this.imageBackground.transparency);
						}
					} else {
						gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, 0, 0, img.Width, img.Height, 0, this.imageBackground.transparency);
					}
				} else {
					let w, h;
					if (this.imageBackground.bProportions) { w = h = Math.min(limits.w, limits.h - limits.offsetH); }
					else { [w, h] = [limits.w, limits.h]; }
					gr.DrawImage(img, (limits.w - w) / 2, Math.max((limits.h - limits.y - h) / 2 + limits.y, limits.y), w, h, 0, 0, img.Width, img.Height, 0, this.imageBackground.transparency);
				}
			}
			gr.SetInterpolationMode(InterpolationMode.Default);
		}
	};

	this.paint = (gr, bImage = false, coords) => {
		const col = this.getColorBackground();
		if (typeof col !== 'undefined') {
			if (coords) {
				gr.FillSolidRect(coords.x, coords.y, coords.w, coords.h, col);
			} else {
				gr.FillSolidRect(0, 0, this.w, this.h, col);
			}
		}
		if (bImage) { this.paintImage(gr, { y: 0, w: this.w, h: this.h, offsetH: _scale(1) }); }
	};

	this.setDefault = ({ all = false, buttonText = false, buttonBar = false, oldColor = null } = {}) => {
		let bDone = false;
		const defaultCol = invert(this.getColorBackground());
		if (buttonText || all || oldColor !== null && this.colors.buttonsTextColor === oldColor) {
			this.properties.buttonsTextColor[1] = this.colors.buttonsTextColor = this.colors.bButtonsBackground
				? this.colors.default.buttonsTextColor // In case the buttons theme manager is used, the text is black by default
				: defaultCol;
			bDone = true;
		}
		if (buttonBar || all || oldColor !== null && this.colors.buttonsToolbarColor === oldColor) { this.properties.buttonsToolbarColor[1] = this.colors.buttonsToolbarColor = defaultCol; bDone = true; }
		if (bDone) { this.colorsChanged(); }
		return bDone;
	};

	this.getConfig = () => {
		const config = clone(this.imageBackground);
		if (this.imageBackground.mode !== 2) { config.art.path = ''; }
		config.art.image = null;
		config.art.id = '';
		delete config.handle;
		delete config.art.colors;
		return config;
	};

	window.DlgCode = DLGC_WANTALLKEYS;
	this.properties = getPropertiesPairs(panelProperties, 'panel_'); // Load once! [0] = descriptions, [1] = values set by user (not defaults!)
	this.fonts = {};
	this.colors = {};
	this.colors.default = {};
	this.w = 0;
	this.h = 0;
	this.fonts.sizes = [_scale(8), _scale(9), _scale(10), _scale(11), _scale(12), _scale(14)];
	this.fonts.size = Math.max(this.properties['fontSize'][1], 6);
	if (customBackground) {
		this.customBackground = true;
		this.colors.mode = this.properties.colorsMode[1];
		this.colors.customBackground = this.properties.customBackground[1];
	} else {
		this.customBackground = false;
	}
	this.colors.bCustomText = this.properties.bCustomText[1];
	this.colors.customText = this.properties.customText[1];
	this.colors.buttonsTextColor = this.properties.buttonsTextColor[1];
	this.colors.headerButtons = this.properties.headerButtonsColor[1];
	this.colors.default.buttonsTextColor = bottomToolbar.config.textColor; // RGB(0,0,0)
	this.colors.bAltRowsColor = this.properties.bAltRowsColor[1];
	this.colors.bToolbar = this.properties.bToolbar[1];
	this.colors.bButtonsBackground = this.properties.bButtonsBackground[1];
	this.colors.buttonsToolbarColor = this.properties.buttonsToolbarColor[1];
	this.colors.buttonsToolbarTransparency = this.properties.buttonsToolbarTransparency[1];
	this.colors.bFontOutline = this.properties.bFontOutline[1];
	this.colors.bBold = this.properties.bBold[1];
	this.imageBackground = deepAssign()(
		JSON.parse(this.properties.imageBackground[3]),
		JSON.parse(
			this.properties.imageBackground[1],
			(key, value) => ['image', 'handle', 'colors', 'id'].includes(key) ? null : value
		)
	);
	this.listObjects = [];
	this.textObjects = [];
	this.fontChanged();
	this.colorsChanged();
	this.updateImageBg();
	if (bSetup) {
		const defaultCol = invert(this.getColorBackground());
		this.properties.buttonsTextColor[1] = this.colors.buttonsTextColor = this.colors.bButtonsBackground
			? this.colors.default.buttonsTextColor
			: defaultCol;
		this.properties.buttonsToolbarColor[1] = this.colors.buttonsToolbarColor = defaultCol;
		overwriteProperties(this.properties);
		this.colorsChanged();
	}
}
