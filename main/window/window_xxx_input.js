'use strict';
//01/10/25

/* exported _toggleControl, _colorPicker, _dropdownList, _check, _buttonList, _inputBox, _button */

include('window_xxx_helpers.js');
/* global _gdiFont:readable, _scale:readable, RGBA:readable, RGB:readable, lightenColor:readable, toRGB:readable, isFunction:readable, SmoothingMode:readable, buttonStates:readable, _gr:readable, blendColors:readable, kMask:readable, getKeyboardMask:readable, TPM_TOPALIGN:readable, _menu:readable, FontStyle:readable */
include('..\\..\\helpers\\helpers_xxx_flags.js');
/* global DT_VCENTER:readable, DT_CENTER:readable, DT_NOPREFIX:readable, IDC_HAND:readable, DT_LEFT:readable, DT_CALCRECT:readable, DT_SINGLELINE:readable, DT_END_ELLIPSIS:readable, IDC_IBEAM:readable, IDC_ARROW:readable, DT_END_ELLIPSIS:readable, MF_STRING:readable, MF_GRAYED:readable, MF_DISABLED:readable, VK_DELETE:readable, VK_HOME:readable, VK_SHIFT:readable, VK_ESCAPE:readable, VK_BACK:readable, VK_RETURN:readable, VK_LEFT:readable, VK_END:readable , VK_RIGHT:readable */

function _check({ x, y, size = 4, value = false, shape = 'square', color = 0xFF4354AF }) {
	this.tt = '';
	this.shape = shape.toLowerCase();
	this.x = x;
	this.y = y;
	this.w = size;
	this.size = size;
	this.value = value;
	this.fillColor = color; // Blue
	this.gFont = this.shape === 'square' ? _gdiFont('Segoe UI', _scale(size * 5 / 6)) : null;
	this.bHovered = false;
	this.hoveredExtPad = this.size * 1 / 3;  // extra padding when hovered

	this.paint = (gr) => { // on_paint
		if (this.w <= 1) { return; }
		if (this.shape === 'square') {
			if (this.value) {
				gr.FillSolidRect(this.x, this.y, this.w < this.size ? this.w : this.size, this.size, this.fillColor);
				gr.GdiDrawText('\u2714', this.gFont, 0xFFFFFFFF, this.x, this.y - _scale(this.size * 2 / 7), this.w < this.size ? this.w + 2 : this.size + 2, _scale(this.size), DT_VCENTER | DT_CENTER | DT_NOPREFIX);
			} else {
				gr.FillSolidRect(this.x, this.y, this.w < this.size ? this.w : this.size, this.size, 0xFFFFFFFF);
			}
			gr.DrawRect(this.x, this.y, this.w < this.size ? this.w : this.size, this.size, 2, 0xFF000000);
			if (this.bHovered) {
				const hoverCol = this.value ? 0x20ffffff & this.fillColor : RGBA(0, 0, 0, 15);
				gr.FillEllipse(this.x - this.hoveredExtPad * 3 / 2, this.y - this.hoveredExtPad * 3 / 2, this.size + this.hoveredExtPad * 2 * 3 / 2, this.size + this.hoveredExtPad * 2 * 3 / 2, hoverCol);
			}
		} else if (this.shape === 'circle') {
			gr.SetSmoothingMode(SmoothingMode.HighQuality);
			if (this.value) {
				gr.FillEllipse(this.x, this.y, this.w < this.size ? this.w : this.size, this.size, 0xFFFFFFFF);
				gr.DrawEllipse(this.x, this.y, this.w < this.size ? this.w : this.size, this.size, 1, this.fillColor);
				const innerSizeMinus = 6;
				if (this.w >= innerSizeMinus) {
					gr.FillEllipse(this.x + innerSizeMinus / 2, this.y + innerSizeMinus / 2, this.w < this.size ? this.w - innerSizeMinus : this.size - innerSizeMinus, this.size - innerSizeMinus, this.fillColor);
				}
			} else {
				gr.FillEllipse(this.x, this.y, this.w < this.size ? this.w : this.size, this.size, 0xFFFFFFFF);
				gr.DrawEllipse(this.x, this.y, this.w < this.size ? this.w : this.size, this.size, 1, 0xFF000000);
			}
			if (this.bHovered) {
				const hoverCol = this.value ? 0x20ffffff & this.fillColor : RGBA(0, 0, 0, 15);
				gr.FillEllipse(this.x - this.hoveredExtPad, this.y - this.hoveredExtPad, this.size + this.hoveredExtPad * 2, this.size + this.hoveredExtPad * 2, hoverCol);
			}
			gr.SetSmoothingMode(SmoothingMode.Default);
		}
	};

	this.repaint = () => {
		const padding = this.hoveredExtPad;
		window.RepaintRect(this.x - padding, this.y - padding, this.size + padding * 2, this.size + padding * 2);
	};

	this.trackCheck = (x, y) => {
		return y >= this.y && y <= this.y + this.size && x >= this.x && x <= this.x + this.size;
	};

	this.move = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.bHovered = true;
			window.SetCursor(IDC_HAND);
			this.repaint();
			return true;
		} else if (this.bHovered) {
			this.bHovered = false;
			this.repaint();
		}
		return false;
	};

	this.btn_up = (x, y) => {
		if (this.trackCheck(x, y)) {
			if (this.shape === 'circle') {
				if (!this.value) {
					this.toggle();
					return true;
				}
			} else if (this.shape === 'square') {
				this.toggle();
				return true;
			}
		}
		return false;
	};

	this.toggle = (newValue = !this.value) => {
		this.value = newValue;
		this.repaint();
		return this.value;
	};
}

// Mostly based on ToggleControl by MordredKLB
function _toggleControl({ x, y, size = _scale(10) * 1.5, value = false, color = RGB(65, 81, 181) }) {
	this.tt = '';
	this.x = x;
	this.y = y;
	this.size = size;
	this.w = this.size;
	this.h = this.size;
	this.slideH = this.size / 2;
	this.toggleW = Math.round(this.slideH * 5);
	this.value = value;
	this.fillColor = color; // Blue
	this.knobShadowImg = null;
	this.knobShadowSize = this.h * 1;
	this.bHovered = false;
	this.hoveredExtPad = this.slideH * 2 / 3;  // extra padding when hovered

	this.paint = (gr) => { // on_paint
		if (this.w <= 1) { return; }
		gr.SetSmoothingMode(SmoothingMode.HighQuality);
		let fillColor = this.value ? lightenColor(this.fillColor, 35) : RGB(172, 172, 172);
		const fillY = this.y + this.slideH / 2;
		const fillWidth = this.toggleW - this.h;
		gr.FillEllipse(this.x + this.slideH * 0.5, fillY, this.slideH, this.slideH, fillColor);
		gr.FillEllipse(this.x + fillWidth + this.slideH * 0.5, fillY, this.slideH, this.slideH, fillColor);
		gr.FillSolidRect(this.x + this.h * 0.5, fillY, fillWidth, this.slideH, fillColor);

		let knobX = this.value ? this.x + this.toggleW - this.h : this.x;
		let knobCol = this.value ? this.fillColor : RGB(255, 255, 255);

		gr.DrawImage(this.knobShadowImg, knobX, this.y, this.knobShadowImg.Width, this.knobShadowImg.Height, 0, 0, this.knobShadowImg.Width, this.knobShadowImg.Height);
		if (this.bHovered) {
			const hoverCol = this.value ? 0x20ffffff & knobCol : RGBA(0, 0, 0, 15);
			gr.FillEllipse(knobX - this.hoveredExtPad, this.y - this.hoveredExtPad, this.h + this.hoveredExtPad * 2, this.h + this.hoveredExtPad * 2, hoverCol);
		}
		gr.FillEllipse(knobX, this.y, this.h, this.h, knobCol);
		gr.SetSmoothingMode(SmoothingMode.Default);
	};

	this.repaint = () => {
		const padding = this.hoveredExtPad;
		window.RepaintRect(this.x - padding, this.y - padding, this.toggleW + padding * 2, this.size + padding * 2);
	};

	this.trackCheck = (x, y) => {
		return y >= this.y && y <= this.y + this.h && x >= this.x && x <= this.x + this.toggleW;
	};
	this.btn_up = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.toggle();
			return true;
		}
		return false;
	};

	this.move = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.bHovered = true;
			window.SetCursor(IDC_HAND);
			this.repaint();
			return true;
		} else if (this.bHovered) {
			this.bHovered = false;
			this.repaint();
		}
		return false;
	};

	this.createKnobShadow = () => {
		this.knobShadowImg = gdi.CreateImage(this.knobShadowSize + this.h / 4, this.knobShadowSize + this.h / 4);
		const shadowImg = this.knobShadowImg.GetGraphics();
		shadowImg.FillEllipse(0, 0, this.knobShadowSize, this.knobShadowSize, RGBA(128, 128, 128, 128));
		this.knobShadowImg.ReleaseGraphics(shadowImg);
		this.knobShadowImg.StackBlur(2);
	};

	this.toggle = (newValue = !this.value) => {
		this.value = newValue;
		this.repaint();
	};

	this.createKnobShadow();
}

function _colorPicker({ x, y, size = 10, color = 0xFF4354AF, hoverColor = 0xFF4354AF }) {
	this.tt = '';
	this.x = x;
	this.y = y;
	this.w = size;
	this.size = size;
	this.color = color;
	this.gFont = _gdiFont('Segoe UI', _scale(size * 1 / 5)); // 1/4
	this.bHovered = false;
	this.hoveredExtPad = this.size * 1 / 3;  // extra padding when hovered
	this.hoverColor = hoverColor;
	const offset = 10;

	this.paint = (gr, x = this.x, y = this.y) => { // on_paint
		gr.FillSolidRect(x, y, this.w < this.size ? this.w : this.size, this.size, this.color);
		gr.DrawRect(x, y, this.w < this.size ? this.w : this.size, this.size, 1, 0xFF000000);
		if (this.bHovered) {
			const hoverCol = this.hoverColor !== null ? 0x20ffffff & this.hoverColor : RGBA(...toRGB(this.color), 128);
			gr.FillEllipse(this.x - this.hoveredExtPad, this.y - this.hoveredExtPad, this.size + this.hoveredExtPad * 2, this.size + this.hoveredExtPad * 2, hoverCol);
		}
		gr.GdiDrawText('(R,G,B)\n' + toRGB(this.color), this.gFont, 0xFF000000, x + this.size + offset, y, this.w - this.size - offset, this.size, DT_VCENTER | DT_NOPREFIX);
	};

	this.repaint = (bFull = false) => {
		const padding = this.hoveredExtPad;
		if (bFull) {
			window.RepaintRect(this.x - padding, this.y - padding, this.w, this.size + padding * 2);
		} else {
			window.RepaintRect(this.x - padding, this.y - padding, this.size + padding * 2, this.size + padding * 2);
		}
	};
	this.trackCheck = (x, y) => {
		return y >= this.y && y <= this.y + this.size && x >= this.x && x <= this.x + this.size;
	};

	this.move = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.bHovered = true;
			window.SetCursor(IDC_HAND);
			this.repaint();
			return true;
		} else if (this.bHovered) {
			this.bHovered = false;
			this.repaint();
		}
		return false;
	};

	this.btn_up = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.color = utils.ColourPicker(0, this.color);
			console.log('Window (' + window.Name + ' (' + window.ScriptInfo.Name + ')' + '): Selected color ->\n\t Android: ' + this.color + ' - RGB: ' + toRGB(this.color));
			this.repaint(true);
			return true;
		}
		return false;
	};
}

function _dropdownList(
	x, y, w, h,
	text,
	func,
	gFont = _gdiFont('Segoe UI', 12),
	description = '',
	gFontIcon = _gdiFont('FontAwesome', 12),
	icon = function () {
		return this.opened
			? '\u25BC\u2009'
			: '\u25B6';
	}
) {
	this.state = buttonStates.normal;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.originalWindowWidth = window.Width;
	this.gTheme = window.CreateThemeManager('BUTTON');
	this.gFont = gFont;
	this.gFontIcon = gFontIcon;
	this.description = description;
	this.tt = '';
	this.text = text;
	this.textWidth = isFunction(this.text) ? () => { return _gr.CalcTextWidth(this.text(), gFont); } : _gr.CalcTextWidth(this.text, gFont);
	this.icon = this.gFontIcon.Name !== 'Microsoft Sans Serif' ? icon : null; // if using the default font, then it has probably failed to load the right one, skip icon
	this.iconWidth = isFunction(this.icon) ? () => { return _gr.CalcTextWidth(this.icon(), gFontIcon); } : _gr.CalcTextWidth(this.icon, gFontIcon);
	this.opened = false;
	this.list = { values: [], current: null, hover: null, count: 0 };

	this.close = () => {
		if (this.opened) {
			this.menuFunc(isFunction(this.x) ? this.x() : this.x, isFunction(this.y) ? this.y() : this.y);
		}
	};
	this.menuFunc = (x, y, values, current) => {
		if (this.containHeader(x, y)) {
			this.opened = !this.opened;
			if (this.opened) {
				this.list.values.push(...values);
				this.list.current = current;
				this.list.count = this.list.values.length;
			} else {
				this.list.values.length = 0;
				this.list.current = this.list.hover = null;
			}
		} else {
			this.text = this.list.hover;
			this.close();
			this.repaint();
		}
		return true;
	};
	this.func = func;

	this.containXY = function (x, y) {
		const xCalc = isFunction(this.x) ? this.x() : this.x;
		const yCalc = isFunction(this.y) ? this.y() : this.y;
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		if (this.opened) {
			return (xCalc <= x) && (x <= xCalc + wCalc) && (yCalc <= y) && (y <= yCalc + hCalc * (this.list.count + 1));
		} else {
			return (xCalc <= x) && (x <= xCalc + wCalc) && (yCalc <= y) && (y <= yCalc + hCalc);
		}
	};

	this.containHeader = function (x, y) {
		const xCalc = isFunction(this.x) ? this.x() : this.x;
		const yCalc = isFunction(this.y) ? this.y() : this.y;
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		return (xCalc <= x) && (x <= xCalc + wCalc) && (yCalc <= y) && (y <= yCalc + hCalc);
	};

	this.move = function (x, y, tt) {
		if (this.containXY(x, y)) {
			if (this.containHeader(x, y)) {
				this.changeState(buttonStates.hover, tt);
				return true;
			} else {
				this.changeState(buttonStates.normal, tt);
				if (this.opened) {
					const xCalc = isFunction(this.x) ? this.x() : this.x;
					const yCalc = isFunction(this.y) ? this.y() : this.y;
					const wCalc = isFunction(this.w) ? this.w() : this.w;
					const hCalc = isFunction(this.h) ? this.h() : this.h;
					const old = this.list.hover;
					this.list.hover = this.list.values.find((val, i) => {
						return (xCalc <= x) && (x <= xCalc + wCalc) && (yCalc <= y) && (y <= yCalc + hCalc * (i + 2));
					});
					if (old !== this.list.hover) { this.repaint(); }
					return true;
				}
			}
		} else {
			if (this.opened) {
				this.close();
				this.repaint();
			}
			this.changeState(buttonStates.normal, tt);
		}
		return false;
	};

	this.changeState = function (state, ttArg) {
		let old = this.state;
		this.state = state;
		if (state === buttonStates.hover) {
			this.tt = isFunction(this.description) ? this.description(ttArg).toString() : this.description;
			window.SetCursor(IDC_HAND);
		} else { this.tt = ''; }
		if (state !== old) { this.repaint(); }
		return old;
	};

	this.paint = function (gr, x = this.x, y = this.y, bOnTop = true) {
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		if (wCalc <= 1 || hCalc <= 1) { return; }
		if (this.state === buttonStates.hide) {
			return;
		}

		switch (this.state) {
			case buttonStates.normal:
				this.gTheme.SetPartAndStateID(1, 1);
				break;

			case buttonStates.hover:
				this.gTheme.SetPartAndStateID(1, 2);
				break;

			case buttonStates.down:
				this.gTheme.SetPartAndStateID(1, 3);
				break;

			case buttonStates.hide:
				return;
		}

		const xCalc = isFunction(x) ? x() : x;
		const yCalc = isFunction(y) ? y() : y;

		this.gTheme.DrawThemeBackground(gr, xCalc, yCalc, wCalc, hCalc);
		const offset = 10;
		if (this.icon !== null) {
			let iconWidthCalculated = isFunction(this.icon) ? this.iconWidth() : this.iconWidth;
			let iconCalculated = isFunction(this.icon) ? this.icon() : this.icon;
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(iconCalculated, this.gFontIcon, RGB(0, 0, 0), xCalc + offset, yCalc, wCalc - iconWidthCalculated - offset, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Icon
			if (wCalc > iconWidthCalculated * 4 + offset * 4) {
				gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), xCalc + iconWidthCalculated, yCalc, wCalc - offset, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			} else {
				gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), xCalc + offset * 2 + iconWidthCalculated, yCalc, wCalc - offset * 3 - iconWidthCalculated, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			}
		} else {
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), xCalc, yCalc, wCalc, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
		}
		const paintList = (gr) => {
			this.list.values.forEach((val, i) => {
				const border = 1;
				let bgColor = RGB(240, 240, 240);
				const lineColor = RGB(4, 80, 200);
				if (val === this.list.hover) {
					bgColor = RGB(220, 220, 255);
				}
				gr.FillSolidRect(xCalc, yCalc + hCalc + i * hCalc, wCalc - 2 * border, hCalc, bgColor);
				gr.DrawRect(xCalc, yCalc + hCalc + i * hCalc, wCalc - 2 * border, hCalc, border, lineColor);
				gr.GdiDrawText(val, this.gFont, RGB(0, 0, 0), xCalc, yCalc + (i + 1) * hCalc, wCalc, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX);
			});
		};
		if (bOnTop) {
			if (!Object.hasOwn(gr, 'stack')) { gr.stack = []; }
			gr.stack.push(paintList);
		} else { paintList(gr); }
	};

	this.repaint = (bForce = false) => {
		const xCalc = isFunction(this.x) ? this.x() : this.x;
		const yCalc = isFunction(this.y) ? this.y() : this.y;
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		window.RepaintRect(xCalc, yCalc, wCalc, (this.list.count + 1) * hCalc + _scale(1), bForce);
	};

	this.onClick = function (x, y, values, current) {
		return this.menuFunc(x, y, values, current) && (this.func && this.func(values, current) || !this.func);
	};
}

function _buttonList(
	x, y, w, h,
	text,
	func,
	gFont = _gdiFont('Segoe UI', 12),
	description = '',
	gFontIcon = _gdiFont('FontAwesome', 12),
	icon = function () {
		return this.opened
			? '\u25BC '
			: '\u25B6';
	}
) {
	this.state = buttonStates.normal;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.originalWindowWidth = window.Width;
	this.gTheme = window.CreateThemeManager('Button');
	this.gFont = gFont;
	this.gFontIcon = gFontIcon;
	this.description = description;
	this.tt = '';
	this.text = text;
	this.textWidth = isFunction(this.text) ? () => { return _gr.CalcTextWidth(this.text(), gFont); } : _gr.CalcTextWidth(this.text, gFont);
	this.icon = this.gFontIcon.Name !== 'Microsoft Sans Serif' ? icon : null; // if using the default font, then it has probably failed to load the right one, skip icon
	this.iconWidth = isFunction(this.icon) ? () => { return _gr.CalcTextWidth(this.icon(), gFontIcon); } : _gr.CalcTextWidth(this.icon, gFontIcon);
	this.opened = false;
	this.menuFunc = (values, current) => {
		this.opened = true;
		const menu = new _menu({ onBtnUp: () => { this.opened = false; } });
		values.forEach((item) => {
			const padWidth = _gr.CalcTextWidth(' ', _gdiFont('Arial', _scale(11)));
			const count = this.w / padWidth;
			let padText = ' '.repeat(count / 2);
			let entryText = padText + item + padText;
			let diff = _gr.CalcTextWidth(entryText, _gdiFont('Arial', _scale(11))) - this.w;
			while (Math.abs(diff) > padWidth) {
				if (diff > 0) { padText = padText.substring(1); }
				else { padText += ' '; }
				entryText = padText + item + padText;
				diff = _gr.CalcTextWidth(entryText, _gdiFont('Arial', _scale(11))) - this.w;
			}
			menu.newEntry({ entryText, func: () => { this.text = item; } });
		});
		menu.newCheckMenuLast(() => values.indexOf(current), values.length);
		menu.btn_up(this.x, this.y + this.h, void (0), void (0), void (0), void (0), TPM_TOPALIGN);
		return true;
	};
	this.func = func;

	this.containXY = function (x, y) {
		const xCalc = isFunction(this.x) ? this.x() : this.x;
		const yCalc = isFunction(this.y) ? this.y() : this.y;
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		return (xCalc <= x) && (x <= xCalc + wCalc) && (yCalc <= y) && (y <= yCalc + hCalc);
	};

	this.move = function (x, y, tt) {
		if (this.containXY(x, y)) {
			this.changeState(buttonStates.hover, tt);
		} else {
			this.changeState(buttonStates.normal, tt);
		}
	};

	this.changeState = function (state, ttArg) {
		let old = this.state;
		this.state = state;
		if (state === buttonStates.hover) {
			this.tt = isFunction(this.description) ? this.description(ttArg).toString() : this.description;
			window.SetCursor(IDC_HAND);
		} else { this.tt = ''; }
		if (state !== old) { this.repaint(); }
		return old;
	};

	this.paint = function (gr, x = this.x, y = this.y) {
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		if (wCalc <= 1 || hCalc <= 1) { return; }
		if (this.state === buttonStates.hide) {
			return;
		}

		switch (this.state) {
			case buttonStates.normal:
				this.gTheme.SetPartAndStateID(1, 1);
				break;

			case buttonStates.hover:
				this.gTheme.SetPartAndStateID(1, 2);
				break;

			case buttonStates.down:
				this.gTheme.SetPartAndStateID(1, 3);
				break;

			case buttonStates.hide:
				return;
		}

		const xCalc = isFunction(x) ? x() : x;
		const yCalc = isFunction(y) ? y() : y;

		this.gTheme.DrawThemeBackground(gr, xCalc, yCalc, wCalc, hCalc);
		const offset = 10;
		if (this.icon !== null) {
			let iconWidthCalculated = isFunction(this.icon) ? this.iconWidth() : this.iconWidth;
			let iconCalculated = isFunction(this.icon) ? this.icon() : this.icon;
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(iconCalculated, this.gFontIcon, RGB(0, 0, 0), xCalc + offset, yCalc, wCalc - iconWidthCalculated - offset, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Icon
			if (wCalc > iconWidthCalculated * 4 + offset * 4) {
				gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), xCalc + iconWidthCalculated, yCalc, wCalc - offset, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			} else {
				gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), xCalc + offset * 2 + iconWidthCalculated, yCalc, wCalc - offset * 3 - iconWidthCalculated, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			}
		} else {
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), xCalc, yCalc, wCalc, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
		}
	};

	this.repaint = () => {
		window.RepaintRect(this.x, this.y, this.w, this.h);
	};

	this.onClick = function (x, y, values, current) {
		return this.menuFunc(values, current) && (this.func && this.func(values, current) || !this.func);
	};
}

function _button(x, y, w, h, text, func, gFont = _gdiFont('Segoe UI', 12), description = '', icon = null, gFontIcon = _gdiFont('FontAwesome', 12)) {
	this.state = buttonStates.normal;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.originalWindowWidth = window.Width;
	this.gTheme = window.CreateThemeManager('Button');
	this.gFont = gFont;
	this.gFontIcon = gFontIcon;
	this.description = description;
	this.tt = '';
	this.text = text;
	this.textWidth = isFunction(this.text) ? () => { return _gr.CalcTextWidth(this.text(), gFont); } : _gr.CalcTextWidth(this.text, gFont);
	this.icon = this.gFontIcon.Name !== 'Microsoft Sans Serif' ? icon : null; // if using the default font, then it has probably failed to load the right one, skip icon
	this.iconWidth = isFunction(this.icon) ? () => { return _gr.CalcTextWidth(this.icon(), gFontIcon); } : _gr.CalcTextWidth(this.icon, gFontIcon);
	this.func = func;

	this.containXY = function (x, y) {
		const xCalc = isFunction(this.x) ? this.x() : this.x;
		const yCalc = isFunction(this.y) ? this.y() : this.y;
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		return (xCalc <= x) && (x <= xCalc + wCalc) && (yCalc <= y) && (y <= yCalc + hCalc);
	};

	this.move = function (x, y, tt) {
		if (this.containXY(x, y)) {
			this.changeState(buttonStates.hover, tt);
		} else {
			this.changeState(buttonStates.normal, tt);
		}
	};

	this.changeState = function (state, ttArg) {
		let old = this.state;
		this.state = state;
		if (state === buttonStates.hover) {
			this.tt = isFunction(this.description) ? this.description(ttArg).toString() : this.description;
			window.SetCursor(IDC_HAND);
		} else { this.tt = ''; }
		if (state !== old) { this.repaint(); }
		return old;
	};

	this.paint = function (gr, x = this.x, y = this.y) {
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		if (wCalc <= 1 || hCalc <= 1) { return; }
		if (this.state === buttonStates.hide) {
			return;
		}

		switch (this.state) {
			case buttonStates.normal:
				this.gTheme.SetPartAndStateID(1, 1);
				break;

			case buttonStates.hover:
				this.gTheme.SetPartAndStateID(1, 2);
				break;

			case buttonStates.down:
				this.gTheme.SetPartAndStateID(1, 3);
				break;

			case buttonStates.hide:
				return;
		}

		const xCalc = isFunction(x) ? x() : x;
		const yCalc = isFunction(y) ? y() : y;

		this.gTheme.DrawThemeBackground(gr, xCalc, yCalc, wCalc, hCalc);
		const offset = 10;
		if (this.icon !== null) {
			let iconWidthCalculated = isFunction(this.icon) ? this.iconWidth() : this.iconWidth;
			let iconCalculated = isFunction(this.icon) ? this.icon() : this.icon;
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(iconCalculated, this.gFontIcon, RGB(0, 0, 0), xCalc + offset, yCalc, wCalc - iconWidthCalculated - offset, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Icon
			if (wCalc > iconWidthCalculated * 4 + offset * 4) {
				gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), xCalc + iconWidthCalculated, yCalc, wCalc - offset, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			} else {
				gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), xCalc + offset * 2 + iconWidthCalculated, yCalc, wCalc - offset * 3 - iconWidthCalculated, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			}
		} else {
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), xCalc, yCalc, wCalc, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
		}
	};

	this.repaint = () => {
		window.RepaintRect(this.x, this.y, this.w, this.h);
	};

	this.onClick = function () {
		return this.func && this.func();
	};
}

// Mostly based on INPUT BOX by Br3tt aka Falstaff (c)2013-2015
// Added extra functionality (like keyboard shortcuts), missing contextual menu actions and code cleanup
function _inputBox(w, h, defaultText, emptyText, textColor, backColor, borderColor, backSelectionColor, func, parent = null, helpFile = null, timeout = 500) {
	this.tt = '';
	this.font = _gdiFont('Segoe UI', _scale(10));
	this.fontItalic = _gdiFont('Segoe UI', _scale(10), FontStyle.Italic);
	this.w = w;
	this.h = h;
	this.textColor = textColor;
	this.backColor = backColor;
	this.borderColor = borderColor;
	this.backSelectionColor = backSelectionColor;
	this.defaultText = defaultText;
	this.text = defaultText;
	this.emptyText = emptyText;
	this.sText = '';
	this.prevText = '';
	this.func = func;
	let timer = false;
	this.autoValidation = false;
	this.edit = false;
	this.select = false;
	this.hover = false;
	this.Cpos = 0;
	this.Cx = 0;
	this.offset = 0;
	this.rightMargin = 2;
	this.drag = false;
	this.active = false;
	this.helpFile = helpFile;
	this.timeout = timeout;

	this.setSize = function (w, h, fontSize = 10) {
		this.w = w;
		this.h = h;
		this.font = _gdiFont('Segoe UI', _scale(fontSize));
		this.fontItalic = _gdiFont('Segoe UI', _scale(fontSize), FontStyle.Italic);
	};

	this.paint = function (gr, x, y) {
		this.x = x;
		this.y = y;
		let DT = this.edit
			? DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_CALCRECT
			: DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_CALCRECT | DT_END_ELLIPSIS;
		// draw bg
		gr.SetSmoothingMode(0);
		if (this.borderColor) {
			gr.FillSolidRect(x - 2, y + 0, (this.w + 4), this.h - 0, this.borderColor);
		}
		gr.FillSolidRect(x - 1, y + 1, (this.w + 2), this.h - 2, this.backColor);

		// adjust offset to always see the cursor
		if (!this.drag && !this.select) {
			this.Cx = _gr.CalcTextWidth(this.text.substring(this.offset, this.Cpos), this.font);
			if (this.Cx) {
				while (this.Cx >= this.w - this.rightMargin) {
					this.offset++;
					this.Cx = _gr.CalcTextWidth(this.text.substring(this.offset, this.Cpos), this.font);
				}
			}
		}
		// draw selection
		if (this.SelBegin != this.SelEnd) {
			this.select = true;
			this.calcText();
			let px1, px2;
			if (this.SelBegin < this.SelEnd) {
				px1 = this.getCx(this.SelBegin);
				px2 = this.getCx(this.SelEnd);
				this.textSelected = this.text.substring(this.SelBegin, this.SelEnd);
			} else {
				px2 = this.getCx(this.SelBegin);
				px1 = this.getCx(this.SelEnd);
				this.textSelected = this.text.substring(this.SelEnd, this.SelBegin);
			}
			if ((this.x + px1 + (px2 - px1)) > this.x + this.w) {
				gr.FillSolidRect(this.x + px1, this.y + 2, this.w - px1, this.h - 4, blendColors(this.backSelectionColor, this.backColor, 0.2));
			} else {
				gr.FillSolidRect(this.x + px1, this.y + 2, px2 - px1, this.h - 4, blendColors(this.backSelectionColor, this.backColor, 0.2));
			}
		} else {
			this.select = false;
			this.textSelected = '';
		}

		// draw text
		if (this.text.length > 0) {
			if (this.select && this.offset < this.SelBegin || this.offset < this.SelEnd) {
				if (this.offset < this.SelBegin) {
					const text = this.SelBegin < this.SelEnd ? [this.text.substring(this.offset, this.SelBegin), this.text.substring(this.SelBegin, this.SelEnd), this.text.substring(this.SelEnd)] : [this.text.substring(this.offset, this.SelEnd), this.text.substring(this.SelEnd, this.SelBegin), this.text.substring(this.SelBegin)];
					const textWidth = text.map((t) => { return gr.CalcTextWidth(t, this.font); });
					gr.GdiDrawText(text[0], this.font, this.edit ? this.textColor : blendColors(this.textColor, (this.backColor == 0 ? 0xff000000 : this.backColor), 0.35), this.x, this.y, textWidth[0], this.h, DT);
					gr.GdiDrawText(text[1], this.font, 0xFFFFFFFF, this.x + textWidth[0], this.y, this.w - textWidth[0], this.h, DT);
					gr.GdiDrawText(text[2], this.font, this.edit ? this.textColor : blendColors(this.textColor, (this.backColor == 0 ? 0xff000000 : this.backColor), 0.35), this.x + textWidth[0] + textWidth[1], this.y, this.w - textWidth[0] - textWidth[1], this.h, DT);
				} else if (this.offset < this.SelEnd) {
					const text = [this.text.substring(this.offset, this.SelEnd), this.text.substring(this.SelEnd)];
					const textWidth = text.map((t) => { return gr.CalcTextWidth(t, this.font); });
					gr.GdiDrawText(text[0], this.font, 0xFFFFFFFF, this.x, this.y, this.w > textWidth[0] ? textWidth[0] : this.w, this.h, DT);
					gr.GdiDrawText(text[1], this.font, this.textColor, this.x + textWidth[0], this.y, this.w - textWidth[0], this.h, DT);
				}
			} else {
				gr.GdiDrawText(this.text.substring(this.offset), this.font, this.edit ? this.textColor : blendColors(this.textColor, (this.backColor == 0 ? 0xff000000 : this.backColor), 0.35), this.x, this.y, this.w, this.h, DT);
			}
		} else {
			gr.GdiDrawText(this.emptyText, this.fontItalic, blendColors(this.textColor, (this.backColor === 0 ? 0xff000000 : this.backColor), 0.35), this.x, this.y, this.w, this.h, DT);
		}
		// draw cursor
		if (this.edit && !this.select) {
			this.drawCursor(gr);
		}
	};

	this.drawCursor = function (gr) {
		if (cInputBox.cursorState) {
			if (this.Cpos >= this.offset) {
				this.Cx = this.getCx(this.Cpos);
				const x1 = this.x + this.Cx;
				const x2 = x1;
				const y1 = this.y + 1;
				const y2 = this.y + this.h - 3;
				const lt = 1;
				gr.DrawLine(x1, y1, x2, y2, lt, this.textColor);
			}
		}
	};

	this.repaint = function (bForce) {
		if (!parent) {
			window.RepaintRect(this.x, this.y, this.w, this.h, bForce);
		} else {
			if (Object.hasOwn(parent, 'Repaint')) { parent.Repaint(bForce, 'input', { x: this.x, y: this.y, w: this.w, h: this.h }); } // NOSONAR
			else if (Object.hasOwn(parent, 'repaint')) { parent.repaint(bForce, 'input', { x: this.x, y: this.y, w: this.w, h: this.h }); }
			else { console.log('oInputBox: parentObject has no repaint method.', 'input', { x: this.x, y: this.y, w: this.w, h: this.h }); }
		}
	};

	this.calcText = function () {
		this.TWidth = _gr.CalcTextWidth(this.text.substring(this.offset), this.font);
	};

	this.getCx = function (pos) {
		return (pos >= this.offset ? _gr.CalcTextWidth(this.text.substring(this.offset, pos), this.font) : 0);
	};

	this.getCPos = function (x) {
		const tx = x - this.x;
		let pos = 0;
		let i;
		for (i = this.offset; i < this.text.length; i++) {
			pos += _gr.CalcTextWidth(this.text.substring(i, i + 1), this.font);
			if (pos >= tx + 3) {
				break;
			}
		}
		return i;
	};

	this.on_focus = function (bFocused) {
		if (!bFocused && this.edit) {
			if (this.text.length == 0) {
				this.text = this.defaultText;
			}
			this.edit = false;
			// clear timer
			if (cInputBox.timerCursor) {
				window.ClearInterval(cInputBox.timerCursor);
				cInputBox.timerCursor = false;
				cInputBox.cursorState = true;
			}
			this.repaint();
		} else if (bFocused && this.edit) {
			this.resetCursorTimer();
		}
	};

	this.resetCursorTimer = function () {
		if (cInputBox.timerCursor) {
			window.ClearInterval(cInputBox.timerCursor);
			cInputBox.timerCursor = false;
			cInputBox.cursorState = true;
		}
		cInputBox.timerCursor = window.SetInterval(() => {
			cInputBox.cursorState = !cInputBox.cursorState;
			this.repaint();
			if (!this.edit) {
				window.ClearInterval(cInputBox.timerCursor);
				cInputBox.timerCursor = false;
				cInputBox.cursorState = true;
			}
		}, 500);
	};

	this.trackCheck = (x, y) => { return (x >= this.x - 2 && x <= (this.x + this.w + 1) && y > this.y && y < (this.y + this.h)); };

	this.check = function (callback, x, y, bDragDrop = false) {
		const old = {
			hover: this.hover,
			edit: this.edit,
			drag: this.drag,
			select: this.select,
			SelBegin: this.SelBegin,
			SelEnd: this.SelEnd,
		};
		this.hover = this.trackCheck(x, y);
		switch (callback) {
			case 'down':
				if (this.hover) {
					this.dblclk = false;
					this.drag = true;
					this.edit = true;
					this.Cpos = this.getCPos(x);
					this.anchor = this.Cpos;
					this.SelBegin = this.Cpos;
					this.SelEnd = this.Cpos;
					this.resetCursorTimer();
				} else {
					this.edit = false;
					this.select = false;
					this.SelBegin = 0;
					this.SelEnd = 0;
					this.textSelected = '';
					if (old.hover !== this.hover) {
						if (cInputBox.timerCursor) {
							window.ClearInterval(cInputBox.timerCursor);
							cInputBox.timerCursor = false;
							cInputBox.cursorState = true;
						}
					}
				}
				if (['hover', 'edit', 'drag', 'select', 'SelBegin', 'SelEnd'].some((k) => old[k] !== this[k])) { this.repaint(true); }
				break;
			case 'up':
				this.active = this.hover;
				if (!this.dblclk && this.drag) {
					this.SelEnd = this.getCPos(x);
					if (this.select) {
						if (this.SelBegin > this.SelEnd) {
							this.sBeginSel = this.SelBegin;
							this.SelBegin = this.SelEnd;
							this.SelEnd = this.sBeginSel;
						}
					}
				} else {
					this.dblclk = false;
				}
				this.drag = false;
				break;
			case 'dblclk':
				if (this.hover) {
					this.dblclk = true;
					this.SelBegin = 0;
					this.SelEnd = this.text.length;
					this.textSelected = this.text;
					this.select = true;
				}
				if (['hover', 'SelBegin', 'SelEnd'].some((k) => old[k] !== this[k])) { this.repaint(); }
				break;
			case 'move':
				if (this.drag) {
					this.calcText();
					const tmp = this.getCPos(x);
					const tmpX = this.getCx(tmp);
					if (tmp < this.SelBegin) {
						if (tmp < this.SelEnd) {
							if (tmpX < this.x) {
								if (this.offset > 0) {
									this.offset--;
									this.repaint(true);
								}
							}
						} else if (tmp > this.SelEnd) {
							if ((tmpX + this.x) > (this.x + this.w)) {
								const len = (this.TWidth > this.w) ? this.TWidth - this.w : 0;
								if (len > 0) {
									this.offset++;
									this.repaint(true);
								}
							}
						}
						this.SelEnd = tmp;
					} else if (tmp > this.SelBegin) {
						if ((tmpX + this.x) > (this.x + this.w)) {
							const len = (this.TWidth > this.w) ? this.TWidth - this.w : 0;
							if (len > 0) {
								this.offset++;
								this.repaint(true);
							}
						}
						this.SelEnd = tmp;
					}
					this.Cpos = tmp;
				}
				if (['hover', 'drag', 'SelEnd', 'SelBegin'].some((k) => old[k] !== this[k])) { this.repaint(true); }
				// Set Mouse Cursor Style
				if ((this.hover || this.drag) && !bDragDrop) {
					window.SetCursor(IDC_IBEAM);
				} else if (this.ibeamSet) {
					window.SetCursor(IDC_ARROW);
				}
				this.ibeamSet = (this.hover || this.drag);
				break;
			case 'right':
				if (this.hover) {
					this.edit = true;
					this.resetCursorTimer();
					this.showContextMenu(x, y);
				} else {
					this.edit = false;
					this.select = false;
					this.SelBegin = 0;
					this.SelEnd = 0;
					this.textSelected = '';
					if (cInputBox.timerCursor) {
						window.ClearInterval(cInputBox.timerCursor);
						cInputBox.timerCursor = false;
						cInputBox.cursorState = true;
					}
				}
				if (['hover', 'edit'].some((k) => old[k] !== this[k])) { this.repaint(); }
				break;
		}
		return this.hover;
	};

	this.showContextMenu = function (x, y) {
		const _menu = window.CreatePopupMenu();
		cInputBox.clipboard = utils.GetClipboardText ? utils.GetClipboardText() : cInputBox.doc.parentWindow.clipboardData.getData('Text');
		_menu.AppendMenuItem(this.sText.length ? MF_STRING : MF_GRAYED | MF_DISABLED, 1, 'Undo');
		_menu.AppendMenuSeparator();
		_menu.AppendMenuItem(this.select ? MF_STRING : MF_GRAYED | MF_DISABLED, 2, 'Cut');
		_menu.AppendMenuItem(this.select ? MF_STRING : MF_GRAYED | MF_DISABLED, 3, 'Copy');
		_menu.AppendMenuItem(cInputBox.clipboard ? MF_STRING : MF_GRAYED | MF_DISABLED, 4, 'Paste');
		_menu.AppendMenuItem(this.select ? MF_STRING : MF_GRAYED | MF_DISABLED, 5, 'Delete');
		_menu.AppendMenuSeparator();
		_menu.AppendMenuItem(this.text.length ? MF_STRING : MF_GRAYED | MF_DISABLED, 6, 'Select All');
		if (this.helpFile && utils.FileExists(this.helpFile)) {
			_menu.AppendMenuSeparator();
			_menu.AppendMenuItem(MF_STRING, 7, 'Help...');
		}
		const idx = _menu.TrackPopupMenu(x, y);
		switch (idx) {
			case 1:
				if (this.edit && this.sText.length) {
					this.on_key(90, kMask.ctrl);
				}
				break;
			case 2:
				if (this.edit && this.select) {
					utils.SetClipboardText ? utils.SetClipboardText(this.textSelected.toString()) : cInputBox.doc.parentWindow.clipboardData.setData('Text', this.textSelected);
					const p1 = this.SelBegin;
					const p2 = this.SelEnd;
					this.offset = this.offset >= this.textSelected.length ? this.offset - this.textSelected.length : 0;
					this.select = false;
					this.textSelected = '';
					this.Cpos = this.SelBegin;
					this.SelEnd = this.SelBegin;
					this.text = this.text.slice(0, p1) + this.text.slice(p2);
					this.calcText();

					this.repaint();
				}
				break;
			case 3:
				if (this.edit && this.select) {
					utils.SetClipboardText ? utils.SetClipboardText(this.textSelected.toString()) : cInputBox.doc.parentWindow.clipboardData.setData('Text', this.textSelected);
				}
				break;
			case 4:
				if (this.edit && cInputBox.clipboard) {
					if (this.select) {
						const p1 = this.SelBegin;
						const p2 = this.SelEnd;
						this.select = false;
						this.textSelected = '';
						this.Cpos = this.SelBegin;
						this.SelEnd = this.SelBegin;

						if (this.Cpos < this.text.length) {
							this.text = this.text.slice(0, p1) + cInputBox.clipboard + this.text.slice(p2);
						} else {
							this.text = this.text + cInputBox.clipboard;
						}
						this.Cpos += cInputBox.clipboard.length;
						this.calcText();
						this.repaint();
					} else {
						if (this.Cpos > 0) { // cursor pos > 0
							this.text = this.text.substring(0, this.Cpos) + cInputBox.clipboard + this.text.substring(this.Cpos, this.text.length);
						} else {
							this.text = cInputBox.clipboard + this.text.substring(this.Cpos, this.text.length);
						}
						this.Cpos += cInputBox.clipboard.length;
						this.calcText();
						this.repaint();
					}
				}
				break;
			case 5:
				if (this.edit && this.select) {
					this.on_key(VK_DELETE, kMask.none);
				}
				break;
			case 6:
				if (this.edit && this.text.length) {
					this.check('dblclk', x, y);
				}
				break;
			case 7:
				if (this.helpFile && utils.FileExists(this.helpFile)) {
					const readme = utils.ReadTextFile(this.helpFile, 65001);
					readme && readme.length && fb.ShowPopupMessage(readme, 'Input box');
				}
				break;
		}
	};

	this.on_key_down = function (vKey) {
		this.resetCursorTimer();
		this.on_key(vKey, getKeyboardMask());
	};

	this.on_key = function (vKey, mask) {
		if (mask == kMask.none) {
			switch (vKey) {
				case VK_SHIFT:
					break;
				case VK_ESCAPE:
					if (this.text.length) {
						this.sText = this.text;
						this.text = '';
						this.Cpos = 0;
						this.SelBegin = 0;
						this.SelEnd = 0;
						this.select = false;
						this.offset = 0;
						this.textSelected = '';
						this.repaint();
					} else { this.check('down', -1, -1); }
					break;
				case VK_BACK:
					//save text before update
					this.sText = this.text;
					if (this.edit) {
						if (this.select) {
							if (this.textSelected.length == this.text.length) {
								this.text = '';
								this.Cpos = 0;
							} else {
								if (this.SelBegin > 0) { // NOSONAR
									this.text = this.text.substring(0, this.SelBegin) + this.text.substring(this.SelEnd, this.text.length);
									this.Cpos = this.SelBegin;
								} else {
									this.text = this.text.substring(this.SelEnd, this.text.length);
									this.Cpos = this.SelBegin;
								}
							}
						} else if (this.Cpos > 0) {
							this.text = this.text.substring(0, this.Cpos - 1) + this.text.substring(this.Cpos);
							if (this.offset > 0) {
								this.offset--;
							}
							this.Cpos--;
							this.repaint();
						}
					}
					this.calcText();
					this.offset = this.offset >= this.textSelected.length ? this.offset - this.textSelected.length : 0;
					this.textSelected = '';
					this.SelBegin = this.Cpos;
					this.SelEnd = this.SelBegin;
					this.select = false;
					this.repaint();
					break;
				case VK_DELETE:
					//save text before update
					this.sText = this.text;
					if (this.edit) {
						if (this.select) {
							if (this.textSelected.length == this.text.length) {
								this.text = '';
								this.Cpos = 0;
							} else {
								if (this.SelBegin > 0) { // NOSONAR
									this.text = this.text.substring(0, this.SelBegin) + this.text.substring(this.SelEnd, this.text.length);
									this.Cpos = this.SelBegin;
								} else {
									this.text = this.text.substring(this.SelEnd, this.text.length);
									this.Cpos = this.SelBegin;
								}
							}
						} else if (this.Cpos < this.text.length) {
							this.text = this.text.substring(0, this.Cpos) + this.text.substring(this.Cpos + 1);
							this.repaint();
						}
					}
					this.calcText();
					this.offset = this.offset >= this.textSelected.length ? this.offset - this.textSelected.length : 0;
					this.textSelected = '';
					this.SelBegin = this.Cpos;
					this.SelEnd = this.SelBegin;
					this.select = false;
					this.repaint();
					break;
				case VK_RETURN:
					if (this.edit) {
						if (this.func) { this.func(); }
					}
					break;
				case VK_END:
					if (this.edit) {
						this.Cpos = this.text.length;
						this.SelBegin = 0;
						this.SelEnd = 0;
						this.select = false;
						this.repaint();
					}
					break;
				case VK_HOME:
					if (this.edit) {
						this.Cpos = 0;
						this.SelBegin = 0;
						this.SelEnd = 0;
						this.select = false;
						this.offset = 0;
						this.repaint();
					}
					break;
				case VK_LEFT:
					if (this.edit) {
						if (this.offset > 0) {
							if (this.Cpos <= this.offset) {
								this.offset--;
								this.Cpos--;
							} else {
								this.Cpos--;
							}
						} else if (this.Cpos > 0) {
							this.Cpos--;
						}
						this.SelBegin = this.Cpos;
						this.SelEnd = this.Cpos;
						this.select = false;
						this.repaint();
					}
					break;
				case VK_RIGHT:
					if (this.edit) {
						if (this.Cpos < this.text.length)
							this.Cpos++;
						this.SelBegin = this.Cpos;
						this.SelEnd = this.Cpos;
						this.select = false;
						this.repaint();
					}
					break;
			}
			if (this.edit)
				this.repaint();
		} else {
			switch (mask) {
				case kMask.shift: {
					if (vKey == VK_HOME) { // SHIFT + HOME
						if (this.edit) {
							if (!this.select) {
								this.anchor = this.Cpos;
								this.select = true;
								if (this.Cpos > 0) {
									this.SelEnd = this.Cpos;
									this.SelBegin = 0;
									this.select = true;
									this.Cpos = 0;
								}
							} else if (this.Cpos > 0) {
								if (this.anchor < this.Cpos) {
									this.SelBegin = 0;
									this.SelEnd = this.anchor;
								} else if (this.anchor > this.Cpos) {
									this.SelBegin = 0;
								}
								this.Cpos = 0;
							}
							if (this.offset > 0) {
								this.offset = 0;
							}
							this.repaint();
						}
					}
					if (vKey == VK_END) { // SHIFT + END
						if (this.edit) {
							if (!this.select) {
								this.anchor = this.Cpos;
								if (this.Cpos < this.text.length) {
									this.SelBegin = this.Cpos;
									this.SelEnd = this.text.length;
									this.Cpos = this.text.length;
									this.select = true;
								}
							} else if (this.Cpos < this.text.length) {
								if (this.anchor < this.Cpos) {
									this.SelEnd = this.text.length;
								} else if (this.anchor > this.Cpos) {
									this.SelBegin = this.anchor;
									this.SelEnd = this.text.length;
								}
								this.Cpos = this.text.length;
							}
							this.Cx = _gr.CalcTextWidth(this.text.substring(this.offset), this.font);
							while (this.Cx >= this.w - this.rightMargin) {
								this.offset++;
								this.Cx = _gr.CalcTextWidth(this.text.substring(this.offset), this.font);
							}
							this.repaint();
						}
					}
					if (vKey == VK_LEFT) { // SHIFT + KEY LEFT
						if (this.edit) {
							if (!this.select) {
								this.anchor = this.Cpos;
								this.select = true;
								if (this.Cpos > 0) {
									this.SelEnd = this.Cpos;
									this.SelBegin = this.Cpos - 1;
									this.select = true;
									this.Cpos--;
								}
							} else if (this.Cpos > 0) {
								if (this.anchor < this.Cpos) {
									this.SelEnd--;
								} else if (this.anchor > this.Cpos) {
									this.SelBegin--;
								}
								this.Cpos--;
							}
							if (this.offset > 0) {
								const tmp = this.Cpos;
								if (tmp < this.offset) {
									this.offset--;
								}
							}
							this.repaint();
						}
					}
					if (vKey == VK_RIGHT) { // SHIFT + KEY RIGHT
						if (this.edit) {
							if (!this.select) {
								this.anchor = this.Cpos;
								if (this.Cpos < this.text.length) {
									this.SelBegin = this.Cpos;
									this.Cpos++;
									this.SelEnd = this.Cpos;
									this.select = true;
								}
							} else if (this.Cpos < this.text.length) {
								if (this.anchor < this.Cpos) {
									this.SelEnd++;
								} else if (this.anchor > this.Cpos) {
									this.SelBegin++;
								}
								this.Cpos++;
							}

							// handle scroll text on cursor selection
							const tmpX = this.getCx(this.Cpos);
							if (tmpX > (this.w - this.rightMargin)) {
								this.offset++;
							}
							this.repaint();
						}
					}
					break;
				}
				case kMask.ctrl: {
					if (vKey == 65) { // CTRL + A
						if (this.edit && this.text.length > 0) {
							this.SelBegin = 0;
							this.SelEnd = this.text.length;
							this.textSelected = this.text;
							this.select = true;
							this.repaint();
						}
					}
					if (vKey == 67) { // CTRL + C
						if (this.edit && this.select) {
							utils.SetClipboardText ? utils.SetClipboardText(this.textSelected.toString()) : cInputBox.doc.parentWindow.clipboardData.setData('Text', this.textSelected);
						}
					}
					if (vKey == 88) { // CTRL + X
						if (this.edit && this.select) {
							this.sText = this.text;
							utils.SetClipboardText ? utils.SetClipboardText(this.textSelected.toString()) : cInputBox.doc.parentWindow.clipboardData.setData('Text', this.textSelected);
							const p1 = this.SelBegin;
							const p2 = this.SelEnd;
							this.select = false;
							this.textSelected = '';
							this.Cpos = this.SelBegin;
							this.SelEnd = this.SelBegin;
							this.text = this.text.slice(0, p1) + this.text.slice(p2);
							this.calcText();
							this.repaint();
						}
					}
					if (vKey == 90) { // CTRL + Z
						if (this.edit) {
							this.text = this.sText;
							this.repaint();
						}
					}
					if (vKey == 86) { // CTRL + V
						cInputBox.clipboard = utils.GetClipboardText ? utils.GetClipboardText() : cInputBox.doc.parentWindow.clipboardData.getData('Text');
						if (this.edit && cInputBox.clipboard) {
							this.sText = this.text;
							if (this.select) {
								const p1 = this.SelBegin;
								const p2 = this.SelEnd;
								this.select = false;
								this.textSelected = '';
								this.Cpos = this.SelBegin;
								this.SelEnd = this.SelBegin;
								if (this.Cpos < this.text.length) {
									this.text = this.text.slice(0, p1) + cInputBox.clipboard + this.text.slice(p2);
								} else {
									this.text = this.text + cInputBox.clipboard;
								}
								this.Cpos += cInputBox.clipboard.length;
								this.calcText();
								this.repaint();
							} else {
								if (this.Cpos > 0) { // cursor pos > 0
									this.text = this.text.substring(0, this.Cpos) + cInputBox.clipboard + this.text.substring(this.Cpos, this.text.length);
								} else {
									this.text = cInputBox.clipboard + this.text.substring(this.Cpos, this.text.length);
								}
								this.Cpos += cInputBox.clipboard.length;
								this.calcText();
								this.repaint();
							}
						}
					}
					if (vKey == VK_HOME) { // CTRL + HOME
						this.on_key(VK_HOME, kMask.none);
					}
					if (vKey == VK_END) { // CTRL + END
						this.on_key(VK_END, kMask.none);
					}
					if (vKey == VK_BACK) { // CTRL + BACK
						//save text before update
						this.sText = this.text;
						if (this.edit) {
							if (this.select) {
								if (this.textSelected.length == this.text.length) {
									this.text = '';
									this.Cpos = 0;
								} else {
									if (this.SelBegin > 0) { // NOSONAR
										this.text = this.text.substring(0, this.SelBegin) + this.text.substring(this.SelEnd, this.text.length);
										this.Cpos = this.SelBegin;
									} else {
										this.text = this.text.substring(this.SelEnd, this.text.length);
										this.Cpos = this.SelBegin;
									}
								}
							} else if (this.Cpos <= this.text.length) {
								const leftTrim = [...this.text.substring(0, this.Cpos)].reverse().join('').trimEnd();
								const idx = leftTrim.search(/\b /);
								this.text = idx !== -1
									? this.text.substring(0, this.Cpos - idx) + this.text.substring(this.Cpos)
									: '';
								this.Cpos = idx !== -1 ? this.Cpos - idx : 0;
								this.repaint();
							}
						}
						this.calcText();
						this.offset = this.offset >= this.textSelected.length ? this.offset - this.textSelected.length : 0;
						this.textSelected = '';
						this.SelBegin = this.Cpos;
						this.SelEnd = this.SelBegin;
						this.select = false;
						this.repaint();
					}
					if (vKey === VK_DELETE) { // CTRL + DEL
						//save text before update
						this.sText = this.text;
						if (this.edit) {
							if (this.select) {
								if (this.textSelected.length == this.text.length) {
									this.text = '';
									this.Cpos = 0;
								} else {
									if (this.SelBegin > 0) { // NOSONAR
										this.text = this.text.substring(0, this.SelBegin) + this.text.substring(this.SelEnd, this.text.length);
										this.Cpos = this.SelBegin;
									} else {
										this.text = this.text.substring(this.SelEnd, this.text.length);
										this.Cpos = this.SelBegin;
									}
								}
							} else if (this.Cpos < this.text.length) {
								const right = this.text.substring(this.Cpos);
								const rightTrim = right.trimStart();
								let idx = rightTrim.search(/ \b/);
								if (idx !== -1) {
									const offset = right.length - rightTrim.length;
									const old = idx - 1;
									if (this.Cpos === 0 && offset) { idx = offset; }
									else { idx += offset; }
									while (right[old] === ' ' && right[idx] === ' ') { idx++; }
								}
								this.text = idx !== -1
									? this.text.substring(0, this.Cpos) + this.text.substring(this.Cpos + idx)
									: this.text.substring(0, this.Cpos);
								this.repaint();
							}
						}
						this.calcText();
						this.offset = this.offset >= this.textSelected.length ? this.offset - this.textSelected.length : 0;
						this.textSelected = '';
						this.SelBegin = this.Cpos;
						this.SelEnd = this.SelBegin;
						this.select = false;
						this.repaint();
					}
					if (vKey === VK_LEFT) { // CTRL + KEY LEFT
						if (this.edit && this.Cpos > 0) {
							let newSelIdx = 0;
							if (this.Cpos <= this.text.length) {
								const leftTrim = [...this.text.substring(0, this.Cpos)].reverse().join('').trimEnd();
								const idx = leftTrim.search(/\b /);
								newSelIdx = idx !== -1
									? this.Cpos - idx
									: 0;
							}
							this.SelEnd = this.SelBegin = this.Cpos = newSelIdx;
							this.select = false;
							this.calcText();
							this.offset = this.offset >= this.textSelected.length ? this.offset - this.textSelected.length : 0;
							this.repaint();
						}
					}
					if (vKey === VK_RIGHT) { // CTRL + KEY RIGHT
						if (this.edit && this.Cpos < this.text.length) {
							let newSelIdx = this.text.length;
							if (this.Cpos >= 0) {
								const right = this.text.substring(this.Cpos);
								const rightTrim = right.trimStart();
								let idx = rightTrim.search(/ \b/);
								if (idx !== -1) {
									const offset = right.length - rightTrim.length;
									if (this.Cpos === 0 && offset) { idx = offset; }
									else { idx += offset; }
									while (right[idx] === ' ') { idx++; }
								}
								newSelIdx = idx !== -1
									? this.Cpos + idx
									: this.text.length;
							}
							this.SelEnd = this.SelBegin = this.Cpos = newSelIdx;
							this.select = false;
							this.calcText();
							this.offset = this.offset >= this.textSelected.length ? this.offset - this.textSelected.length : 0;
							this.repaint();
						}
					}
					break;
				}
				case kMask.ctrlShift: {
					if (vKey == VK_HOME) { // CTRL + SHIFT + HOME
						this.on_key(VK_HOME, kMask.shift);
					}
					if (vKey == VK_END) { // CTRL + SHIFT + END
						this.on_key(VK_END, kMask.shift);
					}
					if (vKey === VK_LEFT) { // CTRL + SHIFT + KEY LEFT
						if (this.edit && this.Cpos > 0) {
							let newSelIdx = 0;
							if (this.Cpos <= this.text.length) {
								const leftTrim = [...this.text.substring(0, this.Cpos)].reverse().join('').trimEnd();
								const idx = leftTrim.search(/\b /);
								newSelIdx = idx !== -1
									? this.Cpos - idx
									: 0;
							}
							if (!this.select) {
								this.anchor = this.SelEnd = this.Cpos;
								this.Cpos = this.SelBegin = newSelIdx;
								this.select = true;
							} else {
								this.anchor = this.Cpos = this.SelBegin = newSelIdx;
							}
							this.calcText();
							this.offset = this.offset >= this.textSelected.length ? this.offset - this.textSelected.length : 0;
							this.repaint();
						}
					}
					if (vKey === VK_RIGHT) { // CTRL + SHIFT + KEY RIGHT
						if (this.edit && this.Cpos < this.text.length) {
							let newSelIdx = this.text.length;
							if (this.Cpos >= 0) {
								const right = this.text.substring(this.Cpos);
								const rightTrim = right.trimStart();
								let idx = rightTrim.search(/ \b/);
								if (idx !== -1) {
									const offset = right.length - rightTrim.length;
									if (this.Cpos === 0 && offset) { idx = offset; }
									else { idx += offset; }
									while (right[idx] === ' ') { idx++; }
								}
								newSelIdx = idx !== -1
									? this.Cpos + idx
									: this.text.length;
							}
							if (!this.select) {
								this.anchor = this.SelBegin = this.Cpos;
								this.SelEnd = this.Cpos = newSelIdx;
								this.select = true;
							} else {
								this.anchor = this.Cpos = this.SelEnd = newSelIdx;
							}
							this.calcText();
							this.offset = this.offset >= this.textSelected.length ? this.offset - this.textSelected.length : 0;
							this.repaint();
						}
					}
					break;
				}
			}
		}
		this.autoValidate(); // autosearch: has text changed after on_key or on_char ?
	};

	this.on_char = function (code, mask = getKeyboardMask()) { // callback doesn't provide mask
		if (code === 127 && mask === kMask.ctrl) { return; } // CTRL+BACK
		if (code > 31 && this.edit) {
			//save text before update
			this.sText = this.text;
			let p1, p2;
			if (this.select) {
				p1 = this.SelBegin;
				p2 = this.SelEnd;
				this.textSelected = '';
				this.Cpos = this.SelBegin;
				this.SelEnd = this.SelBegin;
			} else {
				p1 = this.Cpos;
				p2 = (this.text.length - this.Cpos) * -1;
			}
			if (this.Cpos < this.text.length) {
				this.text = this.text.slice(0, p1) + String.fromCharCode(code) + this.text.slice(p2);
			} else {
				this.text = this.text + String.fromCharCode(code);
			}
			this.Cpos++;
			if (this.select) {
				this.calcText();
				if (this.TWidth <= (this.w)) {
					this.offset = 0;
				} else if (this.Cpos - this.offset < 0) {
					this.offset = this.offset > 0 ? this.Cpos - 1 : 0;
				}
				this.select = false;
			}
			this.repaint();
		}
		this.autoValidate(); // autosearch: has text changed after on_key or on_char ?
	};

	this.autoValidate = () => {
		if (this.autoValidation && this.func) {
			if (this.text !== this.prevText) {
				// launch timer to process the search
				timer && window.ClearTimeout(timer);
				timer = window.SetTimeout(() => {
					this.func();
					timer && window.ClearTimeout(timer);
					timer = false;
				}, this.timeout);
				this.prevText = this.text;
			}
		}
	};
}

// Helpers

const cInputBox = {
	timerCursor: false,
	cursorState: true,
	doc: new ActiveXObject('htmlfile'),
	clipboard: null
};