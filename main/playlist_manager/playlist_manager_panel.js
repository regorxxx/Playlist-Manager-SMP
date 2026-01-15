'use strict';
//15/01/26

/* exported _panel */

/* global bottomToolbar:readable */
include('..\\..\\helpers\\helpers_xxx.js');
/* global globFonts:readable, FontStyle:readable, DLGC_WANTALLKEYS:readable */
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
/* global isInt:readable, isBoolean:readable, isJSON:readable, isInt:readable, deepAssign:readable*/
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
		bToolbar: ['Use toolbar mode', true, { func: isBoolean }],
		bButtonsBackground: ['Use buttons background', false, { func: isBoolean }],
		buttonsToolbarColor: ['Buttons\' toolbar color', RGB(0, 0, 0), { func: isInt }],
		buttonsToolbarOpacity: ['Buttons\' toolbar opacity', 5, { func: isInt, range: [[0, 100]] }],
		placeholder: ['placerholder', 0, { func: isInt }],
		bFontOutline: ['Add shadows to font', false, { func: isBoolean }],
		bBold: ['Use bold font', false, { func: isBoolean }],
		headerButtonsColor: ['Header buttons\' toolbar color', -1, { func: isJSON }],
		fontScale: ['Font scaling', JSON.stringify({
			inputSize: 1,
			headerSize: 1,
			title: 1,
			buttons: 1,
			small: 1
		}), -1, { func: isInt }],
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
		bottomToolbar.config.toolbarOpacity = this.colors.buttonsToolbarOpacity; // buttons_xxx.js
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
		this.fonts.inputSize = _scale(Math.max(this.fonts.size - 7, 6) * this.fonts.scale.inputSize);
		this.fonts.headerSize = _scale(Math.max(this.fonts.size - 7, 8) * this.fonts.scale.headerSize);
		this.fonts.title = _gdiFont(name, Math.round((this.fonts.size + 2 <= 16 ? this.fonts.size + 2 : this.fonts.size) * this.fonts.scale.title), FontStyle.Bold);
		this.fonts.normal = _gdiFont(name, this.fonts.size);
		this.fonts.normalBold = _gdiFont(name, this.fonts.size - 1, FontStyle.Bold);
		this.fonts.buttons = _gdiFont(name, _scale(Math.max(this.fonts.size - 7, 7) * this.fonts.scale.buttons));
		this.fonts.small = _gdiFont(name, Math.round((this.fonts.size - 4) * this.fonts.scale.small));
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

	window.DlgCode = DLGC_WANTALLKEYS;
	this.properties = getPropertiesPairs(panelProperties, 'panel_'); // Load once! [0] = descriptions, [1] = values set by user (not defaults!)
	this.fonts = {};
	this.colors = {};
	this.colors.default = {};
	this.w = 0;
	this.h = 0;
	this.fonts.sizes = [_scale(8), _scale(9), _scale(10), _scale(11), _scale(12), _scale(14)];
	this.fonts.size = Math.max(this.properties['fontSize'][1], 6);
	this.fonts.scale = deepAssign()(
		JSON.parse(this.properties.fontScale[3]),
		JSON.parse(this.properties.fontScale[1])
	);
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
	this.colors.buttonsToolbarOpacity = this.properties.buttonsToolbarOpacity[1];
	this.colors.bFontOutline = this.properties.bFontOutline[1];
	this.colors.bBold = this.properties.bBold[1];
	this.listObjects = [];
	this.textObjects = [];
	this.fontChanged();
	this.colorsChanged();
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
