'use strict';
//30/10/23

/* exported _popup */

if (typeof opaqueColor === 'undefined' || typeof invert === 'undefined' || typeof _scale === 'undefined' || typeof cyclicOffset === 'undefined') { include('helpers_xxx_UI.js'); }
/* global _tt:readable, opaqueColor:readable, invert:readable, _scale:readable, RGB:readable, lightenColor:readable, _gdiFont:readable, CENTRE:readable */
/* global cyclicOffset:readable */
/* global DT_CENTER:readable, DT_END_ELLIPSIS:readable, DT_CALCRECT:readable, DT_NOPREFIX:readable, globFonts:readable, FontStyle:readable */

function _popup({
	x = 0, y = 0,
	w = window.Width, h = window.Height,
	offsetX = 0,
	offsetY = 0,
	UI = 'MATERIAL',
	scale = 1,
	configuration = {/* bEnabled, border: {enabled}, icon: {enabled, step}, ttText, popText, color, fontSize*/ }
} = {}) {
	const tooltip = new _tt('');

	const UIMethod = {
		material: () => {
			this.color.panel = 0xF0F0F00; // Light grey
			this.color.text = 0xFF4354AF; // Blue
			this.color.popup = opaqueColor(RGB(241, 241, 240), 80); // Light grey
			this.color.border = opaqueColor(invert(this.color.popup), 100);
			this.color.icon = this.color.text;
		},
		default: () => {
			this.color.panel = opaqueColor(0XFFCBC5C5, 30); // Grey tinted (r)
			this.color.text = 0xFF000000; // Black
			this.color.popup = opaqueColor(lightenColor(this.color.panel || RGB(0, 0, 0), 20), 80);
			this.color.border = opaqueColor(invert(this.color.popup), 50);
			this.color.icon = this.color.text;
		},
	};

	this.configuration = configuration || {};
	this.fontSize = _scale(10);
	this.UI = UI.toLowerCase();
	this.color = {};
	UIMethod[this.UI]();
	this.w = w;
	this.h = h;
	this.x = x;
	this.y = y;
	this.bEnabled = false;
	this.icon = { enabled: false, step: 0 };
	this.border = { enabled: true };
	this.ttText = '';
	this.popText = '';
	this.reason = '';
	this.scale = scale;
	if (configuration) {
		const configKeys = new Set(['bEnabled', 'border', 'icon', 'ttText', 'popText', 'color', 'fontSize']);
		for (let key in configuration) {
			if (configKeys.has(key) && Object.hasOwn(this, key)) {
				if (key === 'border' || key === 'icon' || key === 'color') { this[key] = { ...this[key], ...configuration[key] }; }
				else { this[key] = configuration[key]; }
			}
		}
	}
	this.fontSize *= scale;
	this.gFont = _gdiFont(typeof globFonts !== 'undefined' ? globFonts.standard.name : 'Segoe UI', this.fontSize, FontStyle.Bold);

	// Paint
	this.paint = (gr) => { // on_paint
		if (!this.w || !this.h) { return; }
		if (!this.bEnabled) { return; }
		gr.FillSolidRect(this.x, this.y, this.w, this.h, this.color.panel);
		const scaleX = 0.75 * scale;
		const scaleY = 1 / 2 * scale;
		let sizeIcon = 0, size = 0, centerX = 0, centerY = 0, count = 0;
		if (this.icon.enabled) {
			sizeIcon = Math.round(Math.min(this.w / 15, this.h / 15)) * scale;
			size = Math.round(sizeIcon / 2);
			centerX = this.x + this.w / 2 - sizeIcon / 2 + offsetX;
			centerY = this.y + this.h / 2 + sizeIcon + offsetY;
			count = 8;
		}
		let sizeX = Math.round(scaleX * this.w / 2);
		let sizeY = Math.round(scaleY * this.h / 3) + sizeIcon * 3;
		let textOffset = scaleX * this.w * 1 / 20;
		let popX = this.x + this.w / 2 - sizeX / 2 + offsetX;
		let popY = this.y + this.h / 2 - sizeY / 2 + offsetY;
		let textX = popX;
		let textY = popY;
		if (popX < this.x) { popX = this.y + (this.w - sizeX + offsetX) / 2; }
		if (popY < this.y) { popY = this.y + (this.h - sizeY + offsetY) / 2; }
		// Draw the box
		if (this.border.enabled) {
			gr.FillRoundRect(popX, popY, sizeX + offsetX, sizeY - offsetY, sizeX / 6 + offsetX, sizeY / 2 + offsetY, this.color.popup);
			gr.DrawRoundRect(popX, popY, sizeX + offsetX, sizeY - offsetY, sizeX / 6 + offsetX, sizeY / 2 + offsetY, 1, this.color.border);
		}
		// Draw the text
		if (this.popText && this.popText.length) {
			if (this.icon.enabled) {
				gr.GdiDrawText(this.popText, this.gFont, this.color.text, textX + textOffset, textY + sizeIcon, sizeX - textOffset * 2, sizeY, DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX);
			} else {
				gr.GdiDrawText(this.popText, this.gFont, this.color.text, textX + textOffset, textY, sizeX - textOffset * 2, sizeY, CENTRE);
			}
		}
		if (this.icon.enabled) {
			for (let i = 0; i < count; i++) {
				const x = centerX + (Math.sin(Math.PI * 2 / count * i) * sizeIcon);
				const y = centerY + (Math.cos(Math.PI * 2 / count * i) * sizeIcon);
				const step = cyclicOffset(this.icon.step, i, [0, count]);
				gr.FillEllipse(x, y, size, size, opaqueColor(this.color.icon, Math.round(count / step * 10)));
			}
			this.icon.step = cyclicOffset(this.icon.step, 1, [0, count]);
			setTimeout(() => { return window.Repaint(); }, 400);
		}
	};

	this.enable = (bPaint = false, popText = '', ttText = '', reason = '') => {
		this.bEnabled = true;
		if (popText && popText.length) { this.popText = popText; }
		if (ttText && ttText.length) { this.ttText = ttText; }
		if (reason && reason.length) { this.reason = reason; }
		if (bPaint) { window.Repaint(); }
	};

	this.disable = (bPaint = false) => {
		this.bEnabled = false;
		this.reason = '';
		if (bPaint) { window.Repaint(); }
	};

	this.isEnabled = (reason = '') => {
		return reason
			? this.reason === reason && this.bEnabled
			: this.bEnabled;
	};

	this.setText = (popText = '') => {
		this.popText = popText;
		return popText || '';
	};

	this.setTooltipText = (ttText = '') => {
		this.ttText = ttText;
		return ttText || '';
	};
	this.setReason= (reason = '') => {
		this.reason = (reason || '').toString();
		return this.reason;
	};

	this.trace = (x, y) => { // On panel
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
	};

	this.move = (x, y) => {
		if (this.trace(x, y)) { tooltip.SetValue(this.ttText); }
		else { tooltip.Deactivate(); }
		return;
	};

	this.leave = () => {
		tooltip.Deactivate();
		return;
	};

	this.resize = (w = window.Width, h = window.Height) => {
		this.x = x * this.w / w;
		this.y = y * this.h / h;
		this.w = w;
		this.h = h;
	};
}