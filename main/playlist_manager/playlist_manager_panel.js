﻿'use strict';
//30/12/22

include('..\\..\\helpers\\helpers_xxx.js');
include('..\\..\\helpers\\helpers_xxx_properties.js');
include('..\\..\\helpers\\helpers_xxx_UI.js');

function _panel(customBackground = false) {
	
	const panelProperties = {
		fontSize 			: ['Font size', _scale(10)],
		colorsMode			: ['Background colour mode', 0],
		customBackground	: ['Custom background colour', RGB(30, 30, 30)], // Black
		bCustomText			: ['Text custom colour mode', false],
		customText			: ['Custom text colour', RGB(157, 158, 163)], // Gray
		buttonsTextColor	: ['Buttons\' text colour', buttonsPanel.config.textColor],
		bAltRowsColor		: ['Alternate rows background colour', true],
		bToolbar			: ['Use toolbar mode?', true],
		bButtonsBackground	: ['Use buttons background?', false],
		buttonsToolbarColor	: ['Buttons\' toolbar colour', RGB(0,0,0)],
		buttonsToolbarTransparency	: ['Buttons\' toolbar transparency', 5]
	};
	setProperties(panelProperties, 'panel_');
	
	this.colorsChanged = () => {
		if (window.InstanceType) {
			this.colors.background = window.GetColourDUI(1);
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
		buttonsPanel.config.bToolbar = this.colors.bToolbar; // buttons_xxx.js
		buttonsPanel.config.partAndStateID = this.colors.bButtonsBackground ? 1 : 6; // buttons_xxx.js
		buttonsPanel.config.textColor = this.colors.buttonsTextColor; // buttons_xxx.js
		buttonsPanel.config.toolbarColor = this.colors.buttonsToolbarColor; // buttons_xxx.js
		buttonsPanel.config.toolbarTransparency = this.colors.buttonsToolbarTransparency; // buttons_xxx.js
	};
	
	this.fontChanged = () => {
		let name;
		let font = window.InstanceType ? window.GetFontDUI(0) : window.GetFontCUI(0);
		if (font) {
			name = font.Name;
		} else {
			name = 'Segoe UI';
			console.log(N, 'Unable to use default font. Using', name, 'instead.');
		}
		this.fonts.title = _gdiFont(name, (this.fonts.size + 2 <= 16) ? this.fonts.size + 2 : this.fonts.size, 1);
		this.fonts.normal = _gdiFont(name, this.fonts.size);
		this.fonts.small = _gdiFont(name, this.fonts.size - 4);
		this.fonts.fixed = _gdiFont('Lucida Console', this.fonts.size);
		this.row_height = this.fonts.normal.Height;
		this.listObjects.forEach((item) => {item.size();});
		this.listObjects.forEach((item) => {item.update();});
		this.textObjects.forEach((item) => {item.size();});
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
				// col = utils.GetSysColour(15);
				col = window.GetColourCUI(3, '{DA66E8F3-D210-4AD2-89D4-9B2CC58D0235}');
				break;
			case this.colors.mode === 2:
				col = this.colors.customBackground;
				break;
		}
		return col;
	};
	this.paint = (gr) => {
		const col = this.getColorBackground();
		if (typeof col !== 'undefined') {
			gr.FillSolidRect(0, 0, this.w, this.h, col);
		}
	};

	this.setDefault = ({all = false, buttonText = false, buttonBar = false, oldColor = null} = {}) => {
		let bDone = false;
		const defaultCol = invert(this.getColorBackground());
		if (buttonText || all || oldColor !== null && this.colors.buttonsTextColor === oldColor) {
			this.properties.buttonsTextColor[1] = this.colors.buttonsTextColor = panel.colors.bButtonsBackground
				? this.colors.default.buttonsTextColor // In case the buttons theme manager is used, the text is black by default
				: defaultCol;
			bDone = true;
		}
		if (buttonBar || all || oldColor !== null && this.colors.buttonsToolbarColor === oldColor) {this.properties.buttonsToolbarColor[1] = this.colors.buttonsToolbarColor = defaultCol; bDone = true;}
		if (bDone) {this.colorsChanged();}
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
	this.fonts.size = this.properties['fontSize'][1];
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
	this.colors.default.buttonsTextColor = buttonsPanel.config.textColor; // RGB(0,0,0)
	this.colors.bAltRowsColor = this.properties.bAltRowsColor[1];
	this.colors.bToolbar = this.properties.bToolbar[1];
	this.colors.bButtonsBackground = this.properties.bButtonsBackground[1];
	this.colors.buttonsToolbarColor = this.properties.buttonsToolbarColor[1];
	this.colors.buttonsToolbarTransparency = this.properties.buttonsToolbarTransparency[1];
	this.listObjects = [];
	this.textObjects = [];
	this.fontChanged();
	this.colorsChanged();
}