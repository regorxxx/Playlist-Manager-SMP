'use strict';
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx.js');

var panel_properties = {
	fontSize : ['PANEL.FONTS.SIZE', 12],
	coloursMode : ['PANEL.COLOURS.MODE', 0],
	customBackground : ['PANEL.COLOURS.CUSTOM.BACKGROUND', RGB(0, 0, 0)]
};

setProperties(panel_properties, "panel_");

function _panel(custom_background = false) {
	
	this.colours_changed = () => {
		if (window.InstanceType) {
			this.colours.background = window.GetColourDUI(1);
			this.colours.text = window.GetColourDUI(0);
			this.colours.highlight = window.GetColourDUI(2);
		} else {
			this.colours.background = window.GetColourCUI(3);
			this.colours.text = window.GetColourCUI(0);
			this.colours.highlight = blendColours(this.colours.text, this.colours.background, 0.4);
		}
		this.colours.header = this.colours.highlight & 0x45FFFFFF;
	}
	
	this.font_changed = () => {
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
		this.list_objects.forEach((item) => {item.size()})
		this.list_objects.forEach((item) => {item.update()})
		this.text_objects.forEach((item) => {item.size()})
	}
	
	this.size = () => {
		this.w = window.Width;
		this.h = window.Height;
	}
	
	this.paint = (gr) => {
		let col;
		switch (true) {
		case window.IsTransparent:
			return;
		case !this.custom_background:
		case this.colours.mode === 0:
			col = this.colours.background;
			break;
		case this.colours.mode === 1:
			// col = utils.GetSysColour(15);
			col = window.GetColourCUI(3, "{DA66E8F3-D210-4AD2-89D4-9B2CC58D0235}");
			break;
		case this.colours.mode === 2:
			col = this.colours.custom_background;
			break;
		}

		gr.FillSolidRect(1, 1, this.w - 1, this.h - 1, col);
	}
	
	window.DlgCode = DLGC_WANTALLKEYS;
	this.properties = getPropertiesPairs(panel_properties, "panel_"); // Load once! [0] = descriptions, [1] = values set by user (not defaults!)
	this.fonts = {};
	this.colours = {};
	this.w = 0;
	this.h = 0;
	this.fonts.sizes = [10, 11, 12, 13, 14, 16];
	this.fonts.size = this.properties['fontSize'][1];
	if (custom_background) {
		this.custom_background = true;
		this.colours.mode = this.properties['coloursMode'][1];
		this.colours.custom_background = this.properties['customBackground'][1];
	} else {
		this.custom_background = false;
	}
	this.list_objects = [];
	this.text_objects = [];
	this.font_changed();
	this.colours_changed();
}
