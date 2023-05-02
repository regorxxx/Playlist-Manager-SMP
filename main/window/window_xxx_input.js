'use strict';
//28/04/22

include('window_xxx_helpers.js');
include('..\\..\\helpers\\helpers_xxx_flags.js');

/* 
	TODO:
		- Repaint method for current region
 */

function _check({x, y, size = 4, value = false, shape = 'square', color = 0xFF4354AF}) {
	this.tt = '';
	this.shape = shape.toLowerCase();
	this.x = x;
	this.y = y;
	this.w = size;
	this.size = size;
	this.value = value;
	this.fillColor = color; // Blue
	this.gFont = this.shape === 'square' ? _gdiFont('Segoe UI', _scale(size * 5/6)) : null;
	this.bHovered = false;
	this.hoveredExtPad = this.size * 1/3;  // extra padding when hovered
	
	this.paint = (gr, x, y) => { // on_paint
		if (this.w <= 0) {return;}
		if (this.shape === 'square') {
			if (this.value) {
				gr.FillSolidRect(this.x, this.y, this.w < this.size? this.w : this.size, this.size, this.fillColor);
				gr.GdiDrawText('\u2714', this.gFont, 0xFFFFFFFF, this.x, this.y - _scale(this.size * 2/7),  this.w < this.size? this.w + 2: this.size + 2, _scale(this.size), DT_VCENTER|DT_CENTER|DT_NOPREFIX);
			} else {
				gr.FillSolidRect(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 0xFFFFFFFF);
			}
			gr.DrawRect(this.x, this.y,  this.w < this.size? this.w : this.size, this.size, 2, 0xFF000000);
			if (this.bHovered) {
				const hoverCol = this.value ? 0x20ffffff & this.fillColor : RGBA(0,0,0,15);
				gr.FillEllipse(this.x - this.hoveredExtPad * 3/2, this.y - this.hoveredExtPad * 3/2, this.size + this.hoveredExtPad * 2 * 3/2, this.size + this.hoveredExtPad * 2 * 3/2, hoverCol);
			}
		} else if (this.shape === 'circle') {
			gr.SetSmoothingMode(SmoothingMode.HighQuality);
			if (this.value) {
				gr.FillEllipse(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 0xFFFFFFFF);
				gr.DrawEllipse(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 1, this.fillColor);
				const innerSizeMinus = 6;
				if (this.w >= innerSizeMinus) {
					gr.FillEllipse(this.x + innerSizeMinus / 2, this.y + innerSizeMinus / 2, this.w < this.size? this.w - innerSizeMinus : this.size - innerSizeMinus, this.size - innerSizeMinus, this.fillColor);
				}
			} else {
				gr.FillEllipse(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 0xFFFFFFFF);
				gr.DrawEllipse(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 1, 0xFF000000);
			}
			if (this.bHovered) {
				const hoverCol = this.value ? 0x20ffffff & this.fillColor : RGBA(0,0,0,15);
				gr.FillEllipse(this.x - this.hoveredExtPad, this.y - this.hoveredExtPad, this.size + this.hoveredExtPad * 2, this.size + this.hoveredExtPad * 2, hoverCol);
			}
			gr.SetSmoothingMode(SmoothingMode.Default);
		}
	}
	
	// this.repaint = () => {
		// const padding = this.hoveredExtPad;
		// window.RepaintRect(this.x - padding, this.y - padding, this.h + this.checkboxSpacing + this.labelDrawnWidth + padding * 2, this.h + padding * 2);
	// }

	this.trackCheck = (x, y) => {
		return y >= this.y && y <= this.y + this.size && x >= this.x && x <= this.x + this.size;
	}
	
	this.move = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.bHovered = true;
			window.SetCursor(IDC_HAND);
			window.Repaint(true);
			// if (!bGroup) {this.repaint();}
			return true;
		} else if (this.bHovered) {
			this.bHovered = false;
			window.SetCursor(IDC_HAND);
			window.Repaint(true);
			// if (!bGroup) {this.repaint();}
		}
		return false;
	}
	
	this.btn_up = (x, y) => {
		if (this.trackCheck(x, y)) {
			if (this.shape === 'circle') {
				if (!this.value) {
					this.value = true;
					window.Repaint(true);
					return true;
				}
			} else if (this.shape === 'square') {
				this.value = !this.value;
				window.Repaint(true);
				// if (!bGroup) {this.repaint();}
				return true;
			}
		}
		return false;
	}
}

// Mostly based on ToggleControl by MordredKLB
function _toggleControl({x, y, size = _scale(10) * 1.5, value = false, color = RGB(65,81,181)}) {
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
	this.hoveredExtPad = this.slideH * 2/3;  // extra padding when hovered
	
	this.paint = (gr, x, y) => { // on_paint
		if (this.w <= 0) {return;} 
		gr.SetSmoothingMode(SmoothingMode.HighQuality);
		let fillColor = this.value ? lightenColor(this.fillColor, 35) : RGB(172, 172, 172);
		const fillY = this.y + this.slideH / 2;
		const fillWidth = this.toggleW - this.h;
		gr.FillEllipse(this.x + this.slideH * 0.5, fillY, this.slideH, this.slideH, fillColor);
		gr.FillEllipse(this.x + fillWidth + this.slideH * 0.5, fillY, this.slideH, this.slideH, fillColor);
		gr.FillSolidRect(this.x + this.h * 0.5, fillY, fillWidth, this.slideH, fillColor);
		
		let knobX = this.value ? this.x + this.toggleW - this.h : this.x;
		let knobCol = this.value ? this.fillColor : RGB(255,255,255);
		
		gr.DrawImage(this.knobShadowImg, knobX, this.y, this.knobShadowImg.Width, this.knobShadowImg.Height, 0, 0, this.knobShadowImg.Width, this.knobShadowImg.Height);
		if (this.bHovered) {
			const hoverCol = this.value ? 0x20ffffff & knobCol : RGBA(0,0,0,15);
			gr.FillEllipse(knobX - this.hoveredExtPad, this.y - this.hoveredExtPad, this.h + this.hoveredExtPad * 2, this.h + this.hoveredExtPad * 2, hoverCol);
		}
		gr.FillEllipse(knobX, this.y, this.h, this.h, knobCol);
		gr.SetSmoothingMode(SmoothingMode.Default);
	}
	
	// this.repaint = () => {
		// const padding = this.hoveredExtPad;
		// window.RepaintRect(this.x - padding, this.y - padding, this.h + this.checkboxSpacing + this.labelDrawnWidth + padding * 2, this.h + padding * 2);
	// }

	this.trackCheck = (x, y) => {
		return y >= this.y && y <= this.y + this.h && x >= this.x && x <= this.x + this.toggleW;
	}
	this.btn_up = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.value = !this.value;
			window.Repaint(true);
			// if (!bGroup) {this.repaint();}
			return true;
		}
		return false;
	}
	
	this.move = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.bHovered = true;
			window.SetCursor(IDC_HAND);
			window.Repaint(true);
			// if (!bGroup) {this.repaint();}
			return true;
		} else if (this.bHovered) {
			this.bHovered = false;
			window.SetCursor(IDC_HAND);
			window.Repaint(true);
			// if (!bGroup) {this.repaint();}
		}
		return false;
	}
	
	this.createKnobShadow = () => {
		this.knobShadowImg = gdi.CreateImage(this.knobShadowSize + this.h / 4, this.knobShadowSize + this.h / 4);
		const shimg = this.knobShadowImg.GetGraphics();
		shimg.FillEllipse(0, 0, this.knobShadowSize, this.knobShadowSize, RGBA(128, 128, 128, 128));
		this.knobShadowImg.ReleaseGraphics(shimg);
		this.knobShadowImg.StackBlur(2);
	}
	
	this.createKnobShadow();
}

function _colorPicker({x, y, size = 10, color = 0xFF4354AF, hoverColor = 0xFF4354AF}) {
	this.tt = '';
	this.x = x;
	this.y = y;
	this.w = size;
	this.size = size;
	this.color = color;
	this.gFont = _gdiFont('Segoe UI', _scale(size * 1/5)); // 1/4
	this.bHovered = false;
	this.hoveredExtPad = this.size * 1/3;  // extra padding when hovered
	this.hoverColor = hoverColor;
	const offset = 10;
	
	this.paint = (gr, x = this.x , y = this.y) => { // on_paint
		gr.FillSolidRect(x, y, this.w < this.size ? this.w : this.size, this.size, this.color);
		gr.DrawRect(x, y, this.w < this.size ? this.w : this.size, this.size, 1, 0xFF000000);
		if (this.bHovered) {
			const hoverCol = this.hoverColor !== null ? 0x20ffffff & this.hoverColor : RGBA(...toRGB(this.color), 128);
			gr.FillEllipse(this.x - this.hoveredExtPad, this.y - this.hoveredExtPad, this.size + this.hoveredExtPad * 2, this.size + this.hoveredExtPad * 2, hoverCol);
		}
		gr.GdiDrawText('(R,G,B)\n' + toRGB(this.color), this.gFont, 0xFF000000, x + this.size + offset, y, this.w - this.size - offset, this.size, DT_VCENTER|DT_NOPREFIX);
	}
	this.trackCheck = (x, y) => {
		return y >= this.y && y <= this.y + this.size && x >= this.x && x <= this.x + this.size;
	}
	
	this.move = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.bHovered = true;
			window.SetCursor(IDC_HAND);
			window.Repaint(true);
			// if (!bGroup) {this.repaint();}
			return true;
		} else if (this.bHovered) {
			this.bHovered = false;
			window.SetCursor(IDC_HAND);
			window.Repaint(true);
			// if (!bGroup) {this.repaint();}
		}
		return false;
	}
	
	this.btn_up = (x, y) => {
		if (this.trackCheck(x, y)) {
			this.color = utils.ColourPicker(0, this.color);
			window.Repaint(true); 
			return true;
		}
		return false;
	}
}

function _dropdownList({x, y, size = 4, value = false, shape = 'square', color = 0xFF4354AF}) {
	this.shape = shape.toLowerCase();
	this.tt = '';
	this.x = x;
	this.y = y;
	this.w = size;
	this.size = size;
	this.value = value;
	this.fillColor = color; // Blue
	this.gFont = this.shape === 'square' ? _gdiFont('Segoe UI', _scale(size * 5/6)) : null;
	
	this.containXY = function (x, y) {
		const x_calc = isFunction(this.x) ? this.x() : this.x;
		const y_calc = isFunction(this.y) ? this.y() : this.y;
		const w_calc = isFunction(this.w) ? this.w() : this.w;
		const h_calc = isFunction(this.h) ? this.h() : this.h;
		return (x_calc <= x) && (x <= x_calc + w_calc) && (y_calc <= y) && (y <= y_calc + h_calc );
	};
	
	this.changeState = function (state, ttArg) {
		// let old = this.state;
		// this.state = state;
		// if (state === buttonStates.hover) {
			// this.tt = isFunction(this.description) ? this.description(ttArg).toString() : this.description;
			// window.SetCursor(IDC_HAND);
		// } else {this.tt = '';}
		// return old;
	};
	
	this.paint = (gr, x, y) => { // on_paint
		if (this.w <= 0) {return;}
		if (this.shape === 'square') {
			if (this.value) {
				gr.FillSolidRect(this.x, this.y, this.w < this.size? this.w : this.size, this.size, this.fillColor);
				gr.GdiDrawText('\u2714', this.gFont, 0xFFFFFFFF, this.x, this.y - this.size * 2/7,  this.w < this.size? this.w + 2: this.size + 2, _scale(this.size), DT_VCENTER|DT_CENTER|DT_NOPREFIX);
			} else {
				gr.FillSolidRect(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 0xFFFFFFFF);
			}
			gr.DrawRect(this.x, this.y,  this.w < this.size? this.w : this.size, this.size, 2, 0xFF000000);
		} else if (this.shape === 'circle') {
			gr.SetSmoothingMode(SmoothingMode.HighQuality);
			if (this.value) {
				gr.FillEllipse(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 0xFFFFFFFF);
				gr.DrawEllipse(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 1, this.fillColor);
				const innerSizeMinus = 6;
				if (this.w >= innerSizeMinus) {
					gr.FillEllipse(this.x + innerSizeMinus / 2, this.y + innerSizeMinus / 2, this.w < this.size? this.w - innerSizeMinus : this.size - innerSizeMinus, this.size - innerSizeMinus, this.fillColor);
				}
			} else {
				gr.FillEllipse(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 0xFFFFFFFF);
				gr.DrawEllipse(this.x, this.y, this.w < this.size? this.w : this.size, this.size, 1, 0xFF000000);
			}
			gr.SetSmoothingMode(SmoothingMode.Default);
		}
	}
	
	// this.repaint = () => {
		// const padding = this.hoveredExtPad;
		// window.RepaintRect(this.x - padding, this.y - padding, this.h + this.checkboxSpacing + this.labelDrawnWidth + padding * 2, this.h + padding * 2);
	// }

	this.trackCheck = (x, y) => {
		return y >= this.y && y <= this.y + this.size && x >= this.x && x <= this.x + this.size;
	}
	this.btn_up = (x, y) => {
		if (this.trackCheck(x, y)) {
			if (this.shape === 'circle') {
				if (!this.value) {
					this.value = true;
					window.Repaint(true);
					return true;
				}
			} else if (this.shape === 'square') {
				this.value = !this.value;
				window.Repaint(true);
				// if (!bGroup) {this.repaint();}
				return true;
			}
		}
		return false;
	}
}

function _buttonList(x, y, w, h, text, func, gFont = _gdiFont('Segoe UI', 12), description, icon = null, gFontIcon = _gdiFont('FontAwesome', 12)) {
	this.state = buttonStates.normal;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.originalWindowWidth = window.Width;
	this.g_theme = window.CreateThemeManager('Button');
	this.gFont = gFont;
	this.gFontIcon = gFontIcon;
	this.description = description;
	this.tt = '';
	this.text = text;
	this.textWidth  = isFunction(this.text) ? () => {return _gr.CalcTextWidth(this.text(), gFont);} : _gr.CalcTextWidth(this.text, gFont);
	this.icon = this.gFontIcon.Name !== 'Microsoft Sans Serif' ? icon : null; // if using the default font, then it has probably failed to load the right one, skip icon
	this.iconWidth = isFunction(this.icon) ? () => {return _gr.CalcTextWidth(this.icon(), gFontIcon);} : _gr.CalcTextWidth(this.icon, gFontIcon);
	this.func = func;

	this.containXY = function (x, y) {
		const x_calc = isFunction(this.x) ? this.x() : this.x;
		const y_calc = isFunction(this.y) ? this.y() : this.y;
		const w_calc = isFunction(this.w) ? this.w() : this.w;
		const h_calc = isFunction(this.h) ? this.h() : this.h;
		return (x_calc <= x) && (x <= x_calc + w_calc) && (y_calc <= y) && (y <= y_calc + h_calc );
	};

	this.changeState = function (state, ttArg) {
		let old = this.state;
		this.state = state;
		if (state === buttonStates.hover) {
			this.tt = isFunction(this.description) ? this.description(ttArg).toString() : this.description;
			window.SetCursor(IDC_HAND);
		} else {this.tt = '';}
		return old;
	};

	this.paint = function (gr, x = this.x, y = this.y) {
		const w_calc = isFunction(this.w) ? this.w() : this.w;
		const h_calc = isFunction(this.h) ? this.h() : this.h;
		if (w_calc <= 0 || h_calc <= 0) {return;}
		if (this.state === buttonStates.hide) {
			return;
		}

		switch (this.state) {
			case buttonStates.normal:
				this.g_theme.SetPartAndStateID(1, 1);
				break;

			case buttonStates.hover:
				this.g_theme.SetPartAndStateID(1, 2);
				break;

			case buttonStates.down:
				this.g_theme.SetPartAndStateID(1, 3);
				break;

			case buttonStates.hide:
				return;
		}
		
		const x_calc = isFunction(x) ? x() : x;
		const y_calc = isFunction(y) ? y() : y;
		
		this.g_theme.DrawThemeBackground(gr, x_calc, y_calc, w_calc, h_calc);
		const offset = 10;
		if (this.icon !== null) {
			let iconWidthCalculated = isFunction(this.icon) ? this.iconWidth() : this.iconWidth;
			let textWidthCalculated = w_calc - iconWidthCalculated - offset;
			let iconCalculated = isFunction(this.icon) ? this.icon() : this.icon;
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(iconCalculated, this.gFontIcon, RGB(0, 0, 0), x_calc + offset, y_calc, w_calc - iconWidthCalculated - offset, h_calc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Icon
			if (w_calc > iconWidthCalculated * 4 + offset * 4) {
				gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), x_calc + iconWidthCalculated, y_calc, w_calc - offset, h_calc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			} else {
				gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), x_calc + offset * 2 + iconWidthCalculated , y_calc, w_calc - offset * 3 - iconWidthCalculated, h_calc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			}
		} else {
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(textCalculated, this.gFont, RGB(0, 0, 0), x_calc, y_calc, w_calc, h_calc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
		}
	};

	this.onClick = function () {
		return this.func && this.func();
	};
}

// Mostly based on INPUT BOX by Br3tt aka Falstaff (c)2013-2015
// Added extra functionality (like keyboard shortcuts), missing contextual menu actions and code cleanup
function _inputbox(w, h, defaultText, emptyText, textcolor, backcolor, bordercolor, backselectioncolor, func, parentObject, helpFile = null) {
	this.tt = '';
	this.font = _gdiFont('Segoe UI', _scale(10));
	this.font_italic = _gdiFont('Segoe UI', _scale(10), 2);
	this.w = w;
	this.h = h;
	this.textcolor = textcolor;
	this.backcolor = backcolor;
	this.bordercolor = bordercolor;
	this.backselectioncolor = backselectioncolor;
	this.defaultText = defaultText;
	this.text = defaultText;
	this.emptyText = emptyText;
	this.stext = '';
	this.prev_text = '';
	this.func = func;
	var gfunc = func;
	var gfunc_launch_timer = false;
	var g_parentObject = parentObject;
	this.autovalidation = false;
	this.edit = false;
	this.select = false;
	this.hover = false;
	this.Cpos = 0;
	this.Cx = 0;
	this.offset = 0;
	this.right_margin = 2;
	this.drag = false;
	this.active = false;
	this.helpFile = helpFile;
	
	this.setSize = function (w, h, font_size = 10) {
		this.w = w;
		this.h = h;
		this.font = _gdiFont('Segoe UI', _scale(font_size));
		this.font_italic = _gdiFont('Segoe UI', _scale(font_size), 2);
	};

	this.paint = function (gr, x, y) {
		this.x = x;
		this.y = y;
		if (this.edit) {
			var DT = DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_CALCRECT;
		} else {
			var DT = DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_CALCRECT | DT_END_ELLIPSIS;
		}
		// draw bg
		gr.SetSmoothingMode(0);
		if (this.bordercolor) {
			gr.FillSolidRect(x - 2, y + 0, (this.w + 4), this.h - 0, this.bordercolor);
		}
		gr.FillSolidRect(x - 1, y + 1, (this.w + 2), this.h - 2, this.backcolor);

		// adjust offset to always see the cursor
		if (!this.drag && !this.select) {
			this.Cx = _gr.CalcTextWidth(this.text.substr(this.offset, this.Cpos - this.offset), this.font);
			if (this.Cx) {
				while (this.Cx >= this.w - this.right_margin) {
					this.offset++;
					this.Cx = _gr.CalcTextWidth(this.text.substr(this.offset, this.Cpos - this.offset), this.font);
				}
			}
		}
		// draw selection
		if (this.SelBegin != this.SelEnd) {
			this.select = true;
			this.calcText();
			if (this.SelBegin < this.SelEnd) {
				if (this.SelBegin < this.offset) {
					var px1 = this.x;
				} else {
					var px1 = this.x + this.getCx(this.SelBegin);
				}
				var px1 = this.getCx(this.SelBegin);
				var px2 = this.getCx(this.SelEnd);
				this.text_selected = this.text.substring(this.SelBegin, this.SelEnd);
			} else {
				if (this.SelEnd < this.offset) {
					var px1 = this.x;
				} else {
					var px1 = this.x - this.getCx(this.SelBegin);
				}
				var px2 = this.getCx(this.SelBegin);
				var px1 = this.getCx(this.SelEnd);
				this.text_selected = this.text.substring(this.SelEnd, this.SelBegin);
			}
			if ((this.x + px1 + (px2 - px1)) > this.x + this.w) {
				gr.FillSolidRect(this.x + px1, this.y + 2, this.w - px1, this.h - 4, blendColors(this.backselectioncolor, this.backcolor, 0.2));
			} else {
				gr.FillSolidRect(this.x + px1, this.y + 2, px2 - px1, this.h - 4, blendColors(this.backselectioncolor, this.backcolor, 0.2));
			}
		} else {
			this.select = false;
			this.text_selected = '';
		}

		// draw text
		if (this.text.length > 0) {
			if (this.select && this.offset < this.SelBegin || this.offset < this.SelEnd) {
				if (this.offset < this.SelBegin) {
					const text = this.SelBegin < this.SelEnd ? [this.text.substring(this.offset, this.SelBegin), this.text.substring(this.SelBegin, this.SelEnd), this.text.substr(this.SelEnd)] : [this.text.substring(this.offset, this.SelEnd), this.text.substring(this.SelEnd, this.SelBegin), this.text.substr(this.SelBegin)];
					const textWidth = text.map((t) => {return gr.CalcTextWidth(t, this.font);});
					gr.GdiDrawText(text[0], this.font, this.edit ? this.textcolor : blendColors(this.textcolor, (this.backcolor == 0 ? 0xff000000 : this.backcolor), 0.35), this.x, this.y, textWidth[0], this.h, DT);
					gr.GdiDrawText(text[1], this.font, 0xFFFFFFFF, this.x + textWidth[0], this.y,  this.w - textWidth[0], this.h, DT);
					gr.GdiDrawText(text[2], this.font, this.edit ? this.textcolor : blendColors(this.textcolor, (this.backcolor == 0 ? 0xff000000 : this.backcolor), 0.35), this.x  + textWidth[0] + textWidth[1], this.y, this.w - textWidth[0] - textWidth[1], this.h, DT);
				} else if (this.offset < this.SelEnd) {
					const text = [this.text.substring(this.offset, this.SelEnd), this.text.substr(this.SelEnd)] ;
					const textWidth = text.map((t) => {return gr.CalcTextWidth(t, this.font);});
					gr.GdiDrawText(text[0], this.font, 0xFFFFFFFF, this.x, this.y, this.w > textWidth[0] ? textWidth[0] : this.w, this.h, DT);
					gr.GdiDrawText(text[1], this.font, this.textcolor , this.x + textWidth[0], this.y, this.w - textWidth[0], this.h, DT);
				};
			} else {
				gr.GdiDrawText(this.text.substr(this.offset), this.font, this.edit ? this.textcolor : blendColors(this.textcolor, (this.backcolor == 0 ? 0xff000000 : this.backcolor), 0.35), this.x, this.y, this.w, this.h, DT);
			}
		} else {
			gr.GdiDrawText(this.emptyText, this.font_italic, blendColors(this.textcolor, (this.backcolor === 0 ? 0xff000000 : this.backcolor), 0.35), this.x, this.y, this.w, this.h, DT);
		}
		// draw cursor
		if (this.edit && !this.select) {
			this.drawcursor(gr);
		}
	};

	this.drawcursor = function (gr) {
		if (cInputbox.cursor_state) {
			if (this.Cpos >= this.offset) {
				this.Cx = this.getCx(this.Cpos);
				var x1 = this.x + this.Cx;
				var x2 = x1;
				var y1 = this.y + 1;
				var y2 = this.y + this.h - 3;
				var lt = 1;
				gr.DrawLine(x1, y1, x2, y2, lt, this.textcolor);
			}
		}
	}

	this.repaint = function () {
		if (g_parentObject.hasOwnProperty('Repaint')) {g_parentObject.Repaint();}
		else if (g_parentObject.hasOwnProperty('repaint')) {g_parentObject.repaint();}
		else {console.log('oInputbox: parentObject has no repaint method.');}
	}

	this.calcText = function () {
		this.TWidth = _gr.CalcTextWidth(this.text.substr(this.offset), this.font);
	}

	this.getCx = function (pos) {
		if (pos >= this.offset) {
			var x = _gr.CalcTextWidth(this.text.substr(this.offset, pos - this.offset), this.font);
		} else {
			var x = 0;
		}
		return x;
	}

	this.getCPos = function (x) {
		var tx = x - this.x;
		var pos = 0;
		for (var i = this.offset; i < this.text.length; i++) {
			pos += _gr.CalcTextWidth(this.text.substr(i, 1), this.font);
			if (pos >= tx + 3) {
				break;
			}
		}
		return i;
	}

	this.on_focus = function (is_focused) {
		if (!is_focused && this.edit) {
			if (this.text.length == 0) {
				this.text = this.defaultText;
			};
			this.edit = false;
			// clear timer
			if (cInputbox.timer_cursor) {
				window.ClearInterval(cInputbox.timer_cursor);
				cInputbox.timer_cursor = false;
				cInputbox.cursor_state = true;
			}
			this.repaint();
		} else if (is_focused && this.edit) {
			this.resetCursorTimer();
		}
	}

	this.resetCursorTimer = function () {
		if (cInputbox.timer_cursor) {
			window.ClearInterval(cInputbox.timer_cursor);
			cInputbox.timer_cursor = false;
			cInputbox.cursor_state = true;
		}
		cInputbox.timer_cursor = window.SetInterval(function () {
				cInputbox.cursor_state = !cInputbox.cursor_state;
				if (g_parentObject.hasOwnProperty('Repaint')) {g_parentObject.Repaint();}
				else if (g_parentObject.hasOwnProperty('repaint')) {g_parentObject.repaint();}
				else {console.log('oInputbox: g_parentObject has no repaint method.');}
			}, 500);
	}

	this.trackCheck = (x,y) => {return (x >= this.x - 2 && x <= (this.x + this.w + 1) && y > this.y && y < (this.y + this.h));}

	this.check = function (callback, x, y, bDragDrop = false) {
		this.hover = this.trackCheck(x,y) ? true : false;
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
				this.text_selected = '';
				if (cInputbox.timer_cursor) {
					window.ClearInterval(cInputbox.timer_cursor);
					cInputbox.timer_cursor = false;
					cInputbox.cursor_state = true;
				}
			}
			this.repaint();
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
				this.text_selected = this.text;
				this.select = true;
				this.repaint();
			}
			break;
		case 'move':
			if (this.drag) {
				this.calcText();
				var tmp = this.getCPos(x);
				var tmp_x = this.getCx(tmp);
				if (tmp < this.SelBegin) {
					if (tmp < this.SelEnd) {
						if (tmp_x < this.x) {
							if (this.offset > 0) {
								this.offset--;
								this.repaint();
							}
						}
					} else if (tmp > this.SelEnd) {
						if ((tmp_x + this.x) > (this.x + this.w)) {
							var len = (this.TWidth > this.w) ? this.TWidth - this.w : 0;
							if (len > 0) {
								this.offset++;
								this.repaint();
							}
						}
					}
					this.SelEnd = tmp;
				} else if (tmp > this.SelBegin) {
					if ((tmp_x + this.x) > (this.x + this.w)) {
						var len = (this.TWidth > this.w) ? this.TWidth - this.w : 0;
						if (len > 0) {
							this.offset++;
							this.repaint();
						}
					}
					this.SelEnd = tmp;
				}
				this.Cpos = tmp;
				this.repaint();
			}
			// Set Mouse Cursor Style
			if ((this.hover || this.drag) && !bDragDrop) {
				window.SetCursor(IDC_IBEAM);
			} else if (this.ibeam_set) {
				window.SetCursor(IDC_ARROW);
			}
			this.ibeam_set = (this.hover || this.drag);
			break;
		case 'right':
			if (this.hover) {
				this.edit = true;
				this.resetCursorTimer();
				this.repaint();
				this.show_context_menu(x, y);
			} else {
				this.edit = false;
				this.select = false;
				this.SelBegin = 0;
				this.SelEnd = 0;
				this.text_selected = '';
				if (cInputbox.timer_cursor) {
					window.ClearInterval(cInputbox.timer_cursor);
					cInputbox.timer_cursor = false;
					cInputbox.cursor_state = true;
				}
				this.repaint();
			}
			break;
		};
		return this.hover;
	};

	this.show_context_menu = function (x, y) {
		const _menu = window.CreatePopupMenu();
		cInputbox.clipboard = utils.GetClipboardText ? utils.GetClipboardText() : cInputbox.doc.parentWindow.clipboardData.getData('Text');
		_menu.AppendMenuItem(this.stext.length ? MF_STRING : MF_GRAYED | MF_DISABLED, 1, 'Undo');
		_menu.AppendMenuSeparator();
		_menu.AppendMenuItem(this.select ? MF_STRING : MF_GRAYED | MF_DISABLED, 2, 'Cut');
		_menu.AppendMenuItem(this.select ? MF_STRING : MF_GRAYED | MF_DISABLED, 3, 'Copy');
		_menu.AppendMenuItem(cInputbox.clipboard ? MF_STRING : MF_GRAYED | MF_DISABLED, 4, 'Paste');
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
				if (this.edit && this.stext.length) {
					this.on_key(90, kMask.ctrl);
				}
				break;
			case 2:
				if (this.edit && this.select) {
					utils.SetClipboardText ? utils.SetClipboardText(this.text_selected.toString()) : cInputbox.doc.parentWindow.clipboardData.setData('Text', this.text_selected);
					var p1 = this.SelBegin;
					var p2 = this.SelEnd;
					this.offset = this.offset >= this.text_selected.length ? this.offset - this.text_selected.length : 0;
					this.select = false;
					this.text_selected = '';
					this.Cpos = this.SelBegin;
					this.SelEnd = this.SelBegin;
					this.text = this.text.slice(0, p1) + this.text.slice(p2);
					this.calcText();

					this.repaint();
				}
				break;
			case 3:
				if (this.edit && this.select) {
					utils.SetClipboardText ? utils.SetClipboardText(this.text_selected.toString()) : cInputbox.doc.parentWindow.clipboardData.setData('Text', this.text_selected);
				}
				break;
			case 4:
				if (this.edit && cInputbox.clipboard) {
					if (this.select) {
						var p1 = this.SelBegin;
						var p2 = this.SelEnd;
						this.select = false;
						this.text_selected = '';
						this.Cpos = this.SelBegin;
						this.SelEnd = this.SelBegin;

						if (this.Cpos < this.text.length) {
							this.text = this.text.slice(0, p1) + cInputbox.clipboard + this.text.slice(p2);
						} else {
							this.text = this.text + cInputbox.clipboard;
						}
						this.Cpos += cInputbox.clipboard.length;
						this.calcText();
						this.repaint();
					} else {
						if (this.Cpos > 0) { // cursor pos > 0
							this.text = this.text.substring(0, this.Cpos) + cInputbox.clipboard + this.text.substring(this.Cpos, this.text.length);
						} else {
							this.text = cInputbox.clipboard + this.text.substring(this.Cpos, this.text.length);
						}
						this.Cpos += cInputbox.clipboard.length;
						this.calcText();
						this.repaint();
					}
				};
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
	}

	this.on_key_down = function (vkey) {
		this.resetCursorTimer();
		this.on_key(vkey, getKeyboardMask());
	};

	this.on_key = function (vkey, mask) {
		if (mask == kMask.none) {
			switch (vkey) {
			case VK_SHIFT:
				break;
			case VK_ESCAPE:
				if (this.text.length) {
					this.stext = this.text;
					this.text = '';
					this.Cpos = 0;
					this.SelBegin = 0;
					this.SelEnd = 0;
					this.select = false;
					this.offset = 0;
					this.text_selected = '';
					this.repaint();
				} else {this.check('down', -1, -1);}
				break;
			case VK_BACK:
				//save text before update
				this.stext = this.text;
				if (this.edit) {
					if (this.select) {
						if (this.text_selected.length == this.text.length) {
							this.text = '';
							this.Cpos = 0;
						} else {
							if (this.SelBegin > 0) {
								this.text = this.text.substring(0, this.SelBegin) + this.text.substring(this.SelEnd, this.text.length);
								this.Cpos = this.SelBegin;
							} else {
								this.text = this.text.substring(this.SelEnd, this.text.length);
								this.Cpos = this.SelBegin;
							}
						}
					} else {
						if (this.Cpos > 0) {
							this.text = this.text.substr(0, this.Cpos - 1) + this.text.substr(this.Cpos, this.text.length - this.Cpos);
							if (this.offset > 0) {
								this.offset--;
							}
							this.Cpos--;
							this.repaint();
						}
					}
				}
				this.calcText();
				this.offset = this.offset >= this.text_selected.length ? this.offset - this.text_selected.length : 0;
				this.text_selected = '';
				this.SelBegin = this.Cpos;
				this.SelEnd = this.SelBegin;
				this.select = false;
				this.repaint();
				break;
			case VK_DELETE:
				//save text before update
				this.stext = this.text;
				if (this.edit) {
					if (this.select) {
						if (this.text_selected.length == this.text.length) {
							this.text = '';
							this.Cpos = 0;
						} else {
							if (this.SelBegin > 0) {
								this.text = this.text.substring(0, this.SelBegin) + this.text.substring(this.SelEnd, this.text.length);
								this.Cpos = this.SelBegin;
							} else {
								this.text = this.text.substring(this.SelEnd, this.text.length);
								this.Cpos = this.SelBegin;
							}
						}
					} else {
						if (this.Cpos < this.text.length) {
							this.text = this.text.substr(0, this.Cpos) + this.text.substr(this.Cpos + 1, this.text.length - this.Cpos - 1);
							this.repaint();
						}
					}
				}
				this.calcText();
				this.offset = this.offset >= this.text_selected.length ? this.offset - this.text_selected.length : 0;
				this.text_selected = '';
				this.SelBegin = this.Cpos;
				this.SelEnd = this.SelBegin;
				this.select = false;
				this.repaint();
				break;
			case VK_RETURN:
				if (this.edit && this.text.length >= 0) {
					if (this.func) {this.func();}
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
					} else {
						if (this.Cpos > 0)
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
					if (vkey == VK_HOME) { // SHIFT + HOME
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
							} else {
								if (this.Cpos > 0) {
									if (this.anchor < this.Cpos) {
										this.SelBegin = 0;
										this.SelEnd = this.anchor;
									} else if (this.anchor > this.Cpos) {
										this.SelBegin = 0;
									}
									this.Cpos = 0;
								}
							}
							if (this.offset > 0) {
								this.offset = 0;
							}
							this.repaint();
						}
					};
					if (vkey == VK_END) { // SHIFT + END
						if (this.edit) {
							if (!this.select) {
								this.anchor = this.Cpos;
								if (this.Cpos < this.text.length) {
									this.SelBegin = this.Cpos;
									this.SelEnd = this.text.length;
									this.Cpos = this.text.length;
									this.select = true;
								}
							} else {
								if (this.Cpos < this.text.length) {
									if (this.anchor < this.Cpos) {
										this.SelEnd = this.text.length;
									} else if (this.anchor > this.Cpos) {
										this.SelBegin = this.anchor;
										this.SelEnd = this.text.length;
									}
									this.Cpos = this.text.length;
								}
							}
							this.Cx = _gr.CalcTextWidth(this.text.substr(this.offset, this.Cpos - this.offset), this.font);
							while (this.Cx >= this.w - this.right_margin) {
								this.offset++;
								this.Cx = _gr.CalcTextWidth(this.text.substr(this.offset, this.Cpos - this.offset), this.font);
							}
							this.repaint();
						}
					};
					if (vkey == VK_LEFT) { // SHIFT + KEY LEFT
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
							} else {
								if (this.Cpos > 0) {
									if (this.anchor < this.Cpos) {
										this.SelEnd--;
									} else if (this.anchor > this.Cpos) {
										this.SelBegin--;
									}
									this.Cpos--;
								}
							}
							if (this.offset > 0) {
								var tmp = this.Cpos;
								var tmp_x = this.getCx(tmp);
								if (tmp < this.offset) {
									this.offset--;
								}
							}
							this.repaint();
						}
					};
					if (vkey == VK_RIGHT) { // SHIFT + KEY RIGHT
						if (this.edit) {
							if (!this.select) {
								this.anchor = this.Cpos;
								if (this.Cpos < this.text.length) {
									this.SelBegin = this.Cpos;
									this.Cpos++;
									this.SelEnd = this.Cpos;
									this.select = true;
								}
							} else {
								if (this.Cpos < this.text.length) {
									if (this.anchor < this.Cpos) {
										this.SelEnd++;
									} else if (this.anchor > this.Cpos) {
										this.SelBegin++;
									}
									this.Cpos++;
								}
							}

							// handle scroll text on cursor selection
							var tmp_x = this.getCx(this.Cpos);
							if (tmp_x > (this.w - this.right_margin)) {
								this.offset++;
							}
							this.repaint();
						}
					};
					break;
				};
				case kMask.ctrl: {
					if (vkey == 65) { // CTRL + A
						if (this.edit && this.text.length > 0) {
							this.SelBegin = 0;
							this.SelEnd = this.text.length;
							this.text_selected = this.text;
							this.select = true;
							this.repaint();
						}
					}
					if (vkey == 67) { // CTRL + C
						if (this.edit && this.select) {
							utils.SetClipboardText ? utils.SetClipboardText(this.text_selected.toString()) : cInputbox.doc.parentWindow.clipboardData.setData('Text', this.text_selected);
						}
					}
					if (vkey == 88) { // CTRL + X
						if (this.edit && this.select) {
							this.stext = this.text;
							utils.SetClipboardText ? utils.SetClipboardText(this.text_selected.toString()) : cInputbox.doc.parentWindow.clipboardData.setData('Text', this.text_selected);
							var p1 = this.SelBegin;
							var p2 = this.SelEnd;
							this.select = false;
							this.text_selected = '';
							this.Cpos = this.SelBegin;
							this.SelEnd = this.SelBegin;
							this.text = this.text.slice(0, p1) + this.text.slice(p2);
							this.calcText();
							this.repaint();
						}
					}
					if (vkey == 90) { // CTRL + Z
						if (this.edit) {
							this.text = this.stext;
							this.repaint();
						}
					}
					if (vkey == 86) { // CTRL + V
						cInputbox.clipboard = utils.GetClipboardText ? utils.GetClipboardText() : cInputbox.doc.parentWindow.clipboardData.getData('Text');
						if (this.edit && cInputbox.clipboard) {
							this.stext = this.text;
							if (this.select) {
								var p1 = this.SelBegin;
								var p2 = this.SelEnd;
								this.select = false;
								this.text_selected = '';
								this.Cpos = this.SelBegin;
								this.SelEnd = this.SelBegin;
								if (this.Cpos < this.text.length) {
									this.text = this.text.slice(0, p1) + cInputbox.clipboard + this.text.slice(p2);
								} else {
									this.text = this.text + cInputbox.clipboard;
								}
								this.Cpos += cInputbox.clipboard.length;
								this.calcText();
								this.repaint();
							} else {
								if (this.Cpos > 0) { // cursor pos > 0
									this.text = this.text.substring(0, this.Cpos) + cInputbox.clipboard + this.text.substring(this.Cpos, this.text.length);
								} else {
									this.text = cInputbox.clipboard + this.text.substring(this.Cpos, this.text.length);
								}
								this.Cpos += cInputbox.clipboard.length;
								this.calcText();
								this.repaint();
							}
						}
					}
					if (vkey == VK_HOME) { // CTRL + HOME
						this.on_key(VK_HOME, kMask.none);
					}
					if (vkey == VK_END) { // CTRL + END
						this.on_key(VK_END, kMask.none);
					}
					if (vkey == VK_BACK) { // CTRL + BACK
						//save text before update
						this.stext = this.text;
						if (this.edit) {
							if (this.select) {
								if (this.text_selected.length == this.text.length) {
									this.text = '';
									this.Cpos = 0;
								} else {
									if (this.SelBegin > 0) {
										this.text = this.text.substring(0, this.SelBegin) + this.text.substring(this.SelEnd, this.text.length);
										this.Cpos = this.SelBegin;
									} else {
										this.text = this.text.substring(this.SelEnd, this.text.length);
										this.Cpos = this.SelBegin;
									}
								}
							} else {
								if (this.Cpos <= this.text.length) {
									const leftTrim = [...this.text.substring(0, this.Cpos)].reverse().join('').trimEnd();
									const idx = leftTrim.search(/\b /);
									this.text = idx !== -1 
										? this.text.substr(0, this.Cpos - idx) + this.text.substring(this.Cpos)
										: '';
									this.Cpos = idx !== -1 ? this.Cpos - idx : 0;
									this.repaint();
								}
							}
						}
						this.calcText();
						this.offset = this.offset >= this.text_selected.length ? this.offset - this.text_selected.length : 0;
						this.text_selected = '';
						this.SelBegin = this.Cpos;
						this.SelEnd = this.SelBegin;
						this.select = false;
						this.repaint();
					}
					if (vkey === VK_DELETE) { // CTRL + SUPR
						//save text before update
						this.stext = this.text;
						if (this.edit) {
							if (this.select) {
								if (this.text_selected.length == this.text.length) {
									this.text = '';
									this.Cpos = 0;
								} else {
									if (this.SelBegin > 0) {
										this.text = this.text.substring(0, this.SelBegin) + this.text.substring(this.SelEnd, this.text.length);
										this.Cpos = this.SelBegin;
									} else {
										this.text = this.text.substring(this.SelEnd, this.text.length);
										this.Cpos = this.SelBegin;
									}
								}
							} else {
								if (this.Cpos < this.text.length) {
									const right = this.text.substring(this.Cpos);
									const rightTrim = right.trimStart();
									let idx = rightTrim.search(/ \b/);
									if (idx !== -1) {
										const offset = right.length - rightTrim.length;
										const old = idx - 1;
										if (this.Cpos === 0 && offset) {idx = offset;}
										else {idx += offset;}
										while (right[old] === ' ' && right[idx] === ' ') {idx++;}
									}
									this.text = idx !== -1 
										? this.text.substr(0, this.Cpos) + this.text.substr(this.Cpos + idx, this.text.length) 
										: this.text.substr(0, this.Cpos);
									this.repaint();
								}
							}
						}
						this.calcText();
						this.offset = this.offset >= this.text_selected.length ? this.offset - this.text_selected.length : 0;
						this.text_selected = '';
						this.SelBegin = this.Cpos;
						this.SelEnd = this.SelBegin;
						this.select = false;
						this.repaint();
					}
					if (vkey === VK_LEFT) { // CTRL + KEY LEFT
						if (this.edit && this.Cpos > 0) {
							let newSelIdx = 0;
							if (this.Cpos <= this.text.length) {
								const leftTrim = [...this.text.substring(0, this.Cpos)].reverse().join('').trimEnd();
								const idx = leftTrim.search(/\b /);
								newSelIdx = idx !== -1 
									? newSelIdx = this.Cpos - idx
									: 0;
							}
							this.SelEnd = this.SelBegin = this.Cpos = newSelIdx;
							this.select = false;
							this.calcText();
							this.offset = this.offset >= this.text_selected.length ? this.offset - this.text_selected.length : 0;
							this.repaint();
						}
					}
					if (vkey === VK_RIGHT) { // CTRL + KEY RIGHT
						if (this.edit && this.Cpos < this.text.length) {
							let newSelIdx = this.text.length;
							if (this.Cpos >= 0) {
								const right = this.text.substring(this.Cpos);
								const rightTrim = right.trimStart();
								let idx = rightTrim.search(/ \b/);
								if (idx !== -1) {
									const offset = right.length - rightTrim.length;
									if (this.Cpos === 0 && offset) {idx = offset;}
									else {idx += offset;}
									while (right[idx] === ' ') {idx++;}
								}
								newSelIdx = idx !== -1 
									? this.Cpos + idx 
									: this.text.length;
							}
							this.SelEnd = this.SelBegin = this.Cpos = newSelIdx;
							this.select = false;
							this.calcText();
							this.offset = this.offset >= this.text_selected.length ? this.offset - this.text_selected.length : 0;
							this.repaint();
						}
					}
					break;
				};
				case kMask.ctrlShift: {
					if (vkey == VK_HOME) { // CTRL + SHIFT + HOME
						this.on_key(VK_HOME, kMask.shift);
					}
					if (vkey == VK_END) { // CTRL + SHIFT + END
						this.on_key(VK_END, kMask.shift);
					}
					if (vkey === VK_LEFT) { // CTRL + SHIFT + KEY LEFT
						if (this.edit && this.Cpos > 0) {
							let newSelIdx = 0;
							if (this.Cpos <= this.text.length) {
								const leftTrim = [...this.text.substring(0, this.Cpos)].reverse().join('').trimEnd();
								const idx = leftTrim.search(/\b /);
								newSelIdx = idx !== -1 
									? newSelIdx = this.Cpos - idx
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
							this.offset = this.offset >= this.text_selected.length ? this.offset - this.text_selected.length : 0;
							this.repaint();
						}
					}
					if (vkey === VK_RIGHT) { // CTRL + SHIFT + KEY RIGHT
						if (this.edit && this.Cpos < this.text.length) {
							let newSelIdx = this.text.length;
							if (this.Cpos >= 0) {
								const right = this.text.substring(this.Cpos);
								const rightTrim = right.trimStart();
								let idx = rightTrim.search(/ \b/);
								if (idx !== -1) {
									const offset = right.length - rightTrim.length;
									if (this.Cpos === 0 && offset) {idx = offset;}
									else {idx += offset;}
									while (right[idx] === ' ') {idx++;}
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
							this.offset = this.offset >= this.text_selected.length ? this.offset - this.text_selected.length : 0;
							this.repaint();
						}
					}
					break;
				}
			}
		}

		// autosearch: has text changed after on_key or on_char ?
		if (this.autovalidation && gfunc) {
			if (this.text != this.prev_text) {
				// launch timer to process the search
				gfunc_launch_timer && window.ClearTimeout(gfunc_launch_timer);
				gfunc_launch_timer = window.SetTimeout(function () {
						gfunc();
						gfunc_launch_timer && window.ClearTimeout(gfunc_launch_timer);
						gfunc_launch_timer = false;
					}, 500);
				this.prev_text = this.text;
			}
		}
	}

	this.on_char = function (code, mask = getKeyboardMask()) { // callback doesn't provide mask
		if (code === 127 && mask === kMask.ctrl) {return;} // CTRL+BACK
		if (code > 31 && this.edit) {
			//save text before update
			this.stext = this.text;
			if (this.select) {
				var p1 = this.SelBegin;
				var p2 = this.SelEnd;
				this.text_selected = '';
				this.Cpos = this.SelBegin;
				this.SelEnd = this.SelBegin;
			} else {
				var p1 = this.Cpos;
				var p2 = (this.text.length - this.Cpos) * -1;
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
				} else {
					if (this.Cpos - this.offset < 0) {
						this.offset = this.offset > 0 ? this.Cpos - 1 : 0;
					}
				}
				this.select = false;
			}
			this.repaint();
		}

		// autosearch: has text changed after on_key or on_char ?
		if (this.autovalidation) {
			if (this.text != this.prev_text) {
				// launch timer to process the search
				gfunc_launch_timer && window.ClearTimeout(gfunc_launch_timer);
				gfunc_launch_timer = window.SetTimeout(function () {
						gfunc();
						gfunc_launch_timer && window.ClearTimeout(gfunc_launch_timer);
						gfunc_launch_timer = false;
					}, 500);
				this.prev_text = this.text;
			}
		}
	};
};

// Helpers

const cInputbox = {
	temp_gr: gdi.CreateImage(1, 1).GetGraphics(),
	timer_cursor: false,
	cursor_state: true,
	doc: new ActiveXObject('htmlfile'),
	clipboard: null
}