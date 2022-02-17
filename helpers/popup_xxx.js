'use strict';
//10/12/21

include('helpers_xxx.js');
include('helpers_xxx_UI.js');
include('helpers_xxx_prototypes.js');
include('helpers_xxx_properties.js');

function _popup({w = window.Width , h = window.Height, UI = 'MATERIAL', properties = {}, x = 0, y = 0} = {}) {
	const tooltip = new _tt('');
	
	const UIMethod = {
		material: () => {
			this.panelColor = 0xF0F0F00; // Light grey
			this.textColor = 0xFF4354AF; // Blue
			this.popupColor = opaqueColor(RGB(241, 241, 240), 80); // Light grey
			this.borderColor = opaqueColor(invert(this.popupColor), 100);
		},
		default: () => {
			this.panelColor = opaqueColor(0XFFCBC5C5, 30); // Grey tinted (r)
			this.textColor = 0xFF000000; // Black
			this.popupColor = opaqueColor(tintColor(this.panelColor || RGB(0, 0, 0), 20), 80);
			this.borderColor = opaqueColor(invert(this.popupColor), 50);
		},
	}
	
	this.properties = properties;
	this.fontSize = typeof this.properties.fontSize !== 'undefined' ? this.properties.fontSize[1] : _scale(10);
	this.gFont = _gdiFont('Segoe UI', this.fontSize, FontStyle.Bold);
	this.UI = UI.toLowerCase();
	UIMethod[this.UI]();
	this.w = w;
	this.h = h;
	this.x = x;
	this.y = y;
	this.bEnabled = false;
	this.icon = {};
	this.icon.enabled = false;
	this.icon.step = 0;
	this.border = {};
	this.border.enabled = true;
	this.ttText = '';
	this.popText = '';
	
	// Paint
	this.paint = (gr) => { // on_paint
		if (!this.w || !this.h) {return;}
		if (!this.bEnabled) {return;}
		gr.FillSolidRect(this.x, this.y, this.w, this.h, this.panelColor);
		const scaleX = 0.75;
		const scaleY = 1 / 2;
		let sizeIcon = 0, size = 0, centerX = 0, centerY = 0, count = 0;
		if (this.icon.enabled) {
			sizeIcon = Math.round(Math.min(this.w / 15, this.h / 15));
			size = Math.round(sizeIcon / 2);
			centerX = this.x + this.w / 2 - sizeIcon / 2;
			centerY = this.y + this.h / 2 + sizeIcon;
			count = 8;
		}
		let sizeX = Math.round(scaleX * this.w / 2);
		let sizeY = Math.round(scaleY * this.h / 3) + sizeIcon * 3;
		let textOffset = scaleX * this.w * 1 / 20;
		let popX = this.x + this.w / 2 - sizeX / 2;
		let popY = this.y + this.h / 2 - sizeY / 2;
		// Draw the box
		if (this.border.enabled) {
			gr.FillRoundRect(popX, popY, sizeX, sizeY, sizeX / 6, sizeY / 2, this.popupColor);
			gr.DrawRoundRect(popX, popY, sizeX, sizeY, sizeX / 6, sizeY / 2, 1, this.borderColor);
		}
		// Draw the text
		if (this.popText && this.popText.length) {
			if (this.icon.enabled) {
				gr.GdiDrawText(this.popText, this.gFont, this.textColor, popX + textOffset, popY + sizeIcon, sizeX - textOffset * 2, sizeY, DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX);
			} else {
				gr.GdiDrawText(this.popText, this.gFont, this.textColor, popX + textOffset, popY, sizeX - textOffset * 2, sizeY, CENTRE);
			}
		}
		if (this.icon.enabled) {
			for (let i = 0; i < count; i++) {
				const x = centerX + (Math.sin(Math.PI * 2 / count * i) * sizeIcon);
				const y = centerY + (Math.cos(Math.PI * 2 / count * i) * sizeIcon);
				const step = cyclicOffset(this.icon.step, i, [0,count]);
				gr.FillEllipse(x, y, size, size, opaqueColor(0xFF4354AF, Math.round(count / step * 10)));
			}
			this.icon.step = cyclicOffset(this.icon.step, 1, [0,count]);
			setTimeout(() => {return window.Repaint();}, 400)
		}
	}
	
	this.enable = (bPaint = false, popText = '', ttText = '') => {
		this.bEnabled = true;
		if (popText && popText.length) {this.popText = popText;}
		if (ttText && ttText.length) {this.ttText = ttText;}
		if (bPaint) {window.Repaint();}
	}
	
	this.disable = (bPaint = false) => {
		this.bEnabled = false;
		if (bPaint) {window.Repaint();}
	}
	
	this.isEnabled = () => {
		return this.bEnabled;
	}
	
	this.setText = (popText = '') => {
		return (this.popText = popText ? popText : '');
	}
	
	this.setTooltipText = (ttText = '') => {
		return (this.ttText = ttText ? ttText : '');
	}
	
	this.trace = (x, y) => { // On panel
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
	}
	
	this.move = (x, y) => {
		if (this.trace(x, y)) {tooltip.SetValue(this.ttText);}
		else {tooltip.Deactivate();}
		return;
	}
	
	this.leave = () => {
		tooltip.Deactivate();
		return;
	}

	this.resize = (w = window.Width, h = window.Height) => {
		this.x = x * this.w / w;
		this.y = y * this.h / h;
		this.w = w;
		this.h = h;
	}
}