'use strict';
//01/10/25

/* exported _scrollBar */

include('window_xxx_helpers.js');
/* global _tt:readable,  _scale:readable, _gdiFont:readable, DT_VCENTER:readable, DT_CENTER:readable, IDC_ARROW:readable, RGB:readable, RGBA:readable, toRGB:readable, getAlpha:readable, tintColor:readable, debounce:readable */
include('..\\..\\helpers\\helpers_xxx_flags.js');
/* global SmoothingMode:readable, VK_UP:readable, VK_DOWN:readable, VK_PGUP:readable, VK_PGDN:readable, VK_HOME:readable, VK_END:readable, MF_STRING:readable, MF_GRAYED:readable, MF_DISABLED:readable */

function _scrollBar({
	y = 0,
	w = _scale(8),
	x = window.Width - w,
	h = window.Height,
	size = h / _scale(5),
	rows = 0,
	rowsPerPage = 0,
	bgColor = RGB(230, 230, 220),
	color = RGB(210, 210, 210),
	timer = 1500,
	visibleFunc = (time) => this.bHovered || this.bDrag || Date.now() - time < this.timer,
	scrollFunc = () => void (0),
	scrollSpeed = 60, // ms
	dblclkFunc = () => void (0),
	tt = ''
} = {}) {
	this.tt = tt;
	this.x = x;
	this.y = y;
	this.w = w;
	this.wHidden = Math.max(this.w / 10, _scale(2));
	this.h = h;
	this.mx = -1;
	this.my = -1;
	this.size = size;
	this.color = color;
	this.bgColor = bgColor;
	this.bDrag = false;
	this.bDragUp = false;
	this.bDragDown = false;
	this.bHoveredCurr = false;
	this.bHoveredUp = false;
	this.bHoveredDown = false;
	this.bHoveredBarUp = false;
	this.bHoveredBarDown = false;
	this.bHovered = false;
	this.rows = rows;
	this.rowsPerPage = rowsPerPage;
	this.font = _gdiFont('Segoe UI', w);
	this.currRow = 0;
	this.time = Date.now();
	this.timer = timer;
	this.visibleFunc = visibleFunc;
	this.scrollFunc = scrollFunc;
	this.scrollSpeed = scrollSpeed;
	this.dblclkFunc = dblclkFunc;
	this.visible = true;
	this.barLength = this.h;
	this.buttonHeight = 0;
	this.tooltip = new _tt(null, void (0), void (0), 600);

	this.calcCurrRow = (y) => {
		return y <= (this.y + this.buttonHeight)
			? 0
			: y >= (this.y + this.buttonHeight + this.barLength - this.size)
				? this.rows
				: (y - this.y - this.buttonHeight) / (this.barLength - this.size) * this.rows;
	};

	this.calcCurrPos = (row = this.currRow) => {
		return row <= 0
			? this.y + this.buttonHeight
			: row >= this.rows
				? this.y + this.buttonHeight + this.barLength - this.size
				: this.y + this.buttonHeight + row / this.rows * (this.barLength - this.size);
	};

	this.paint = (gr) => { // on_paint
		if (this.w <= 1) { return; }
		// Smooth visibility switch
		if (!this.visibleFunc(this.time)) {
			if (this.visible) {
				this.visible = false;
				if (window.NotifyThis) { setTimeout(() => window.NotifyThis('xxx-scripts: scrollbar hidden', this.visible), this.timer); }
			} else { // Small bar when not shown
				this.wHidden = Math.max(this.w / 10, _scale(2));
				gr.SetSmoothingMode(SmoothingMode.HighQuality);
				const currY = Math.min(Math.max(this.calcCurrPos(), this.y), this.y + this.h - this.size);
				const currX = this.x + this.w * 2 / 3 - this.wHidden;
				try { gr.FillRoundRect(currX, currY, this.wHidden, this.size, this.wHidden / 2, this.wHidden / 2, this.color); }
				catch (e) { gr.FillSolidRect(currX, currY, this.wHidden, this.size, this.color); } // eslint-disable-line no-unused-vars
				gr.SetSmoothingMode(SmoothingMode.Default);
				return;
			}
		}
		// Colors according to state
		const bgColor = this.visible
			? this.bHovered
				? this.bgColor
				: RGBA(...toRGB(this.bgColor), Math.max(getAlpha(this.bgColor) - 75, 0))
			: RGBA(...toRGB(this.bgColor), Math.max(getAlpha(this.bgColor) - 150, 0));
		const color = this.visible
			? this.bHovered
				? this.color
				: RGBA(...toRGB(this.color), Math.max(getAlpha(this.color) - 75, 0))
			: RGBA(...toRGB(this.color), Math.max(getAlpha(this.color) - 150, 0));
		const buttonBgColor = {
			visible: this.visible ? RGBA(...toRGB(this.bgColor), Math.max(getAlpha(this.bgColor) - 50, 0)) : null,
			bHovered: this.bHoveredUp || this.bHoveredDown ? tintColor(RGBA(...toRGB(this.bgColor), Math.max(getAlpha(this.bgColor) - 75, 0)), 5) : null,
			notVisible: !this.visible ? RGBA(...toRGB(this.bgColor), Math.max(getAlpha(this.bgColor) - 125, 0)) : null
		};
		const buttonColor = {
			visible: this.visible ? RGBA(...toRGB(this.color), Math.max(getAlpha(this.color) - 50, 0)) : null,
			bHovered: this.bHoveredUp || this.bHoveredDown ? tintColor(RGBA(...toRGB(this.color), Math.max(getAlpha(this.color) - 75, 0)), 30) : null,
			notVisible: !this.visible ? RGBA(...toRGB(this.color), Math.max(getAlpha(this.color) - 125, 0)) : null
		};
		const up = {
			bg: (this.visible ? (this.bHoveredUp ? buttonBgColor.bHovered : buttonBgColor.visible) : buttonBgColor.notVisible),
			button: (this.visible ? (this.bHoveredUp ? buttonColor.bHovered : buttonColor.visible) : buttonColor.notVisible)
		};
		const down = {
			bg: (this.visible ? (this.bHoveredDown ? buttonBgColor.bHovered : buttonBgColor.visible) : buttonBgColor.notVisible),
			button: (this.visible ? (this.bHoveredDown ? buttonColor.bHovered : buttonColor.visible) : buttonColor.notVisible)
		};
		if (this.bDragUp) { up.button = tintColor(up.button, -20); }
		if (this.bDragDown) { down.button = tintColor(down.button, -20); }
		// Bg
		gr.SetSmoothingMode(SmoothingMode.HighQuality);
		gr.FillSolidRect(this.x, this.y, this.w, this.h, bgColor);
		if (this.bHoveredBarUp) { gr.FillSolidRect(this.x, this.y, this.w, this.currY(), tintColor(bgColor, 5)); }
		if (this.bHoveredBarDown) { gr.FillSolidRect(this.x, this.currY(), this.w, this.h - this.currY(), tintColor(bgColor, 5)); }

		// Buttons
		const buttonHeight = gr.CalcTextHeight('\u25BC', this.font) + _scale(2);
		gr.FillSolidRect(this.x, this.y, this.w, buttonHeight + _scale(2), up.bg);
		gr.FillSolidRect(this.x, this.y + this.h - buttonHeight - _scale(2), this.w, buttonHeight, down.bg);
		gr.SetTextRenderingHint(4); // AntiAlias
		gr.DrawString('\u25B2', this.font, up.button, this.x, this.y + _scale(1), this.w, buttonHeight - _scale(1), DT_VCENTER | DT_CENTER);
		gr.DrawString('\u25BC', this.font, down.button, this.x, this.y + this.h - buttonHeight + _scale(2), this.w, buttonHeight - _scale(2), DT_VCENTER | DT_CENTER);
		gr.SetTextRenderingHint(0); // Default
		// Curr position
		this.barLength = this.h - buttonHeight * 2;
		this.buttonHeight = buttonHeight;
		const currY = this.bDrag
			? Math.min(Math.max(this.my, this.y + buttonHeight), this.y + this.buttonHeight + this.barLength - this.size)
			: Math.min(Math.max(this.calcCurrPos(), this.y + buttonHeight), this.y + this.buttonHeight + this.barLength - this.size);
		const currColor = this.bDrag
			? tintColor(color, 20)
			: this.bHoveredCurr
				? tintColor(color, 10)
				: color;
		gr.FillSolidRect(this.x, currY, this.w, this.size, currColor);
		gr.SetSmoothingMode(SmoothingMode.Default);
		if (this.visibleFunc) { this.repaint(this.timer); } // Smooth visibility switch
	};

	const debounced = {
		[this.timer]: debounce(window.RepaintRect, this.timer, false, window)
	};
	this.repaint = (timeout = 0) => {
		if (timeout === 0) { window.RepaintRect(this.x, this.y, this.x + this.w, this.y + this.h); }
		else {
			if (!Object.hasOwn(debounced, timeout)) { debounced[timeout] = debounce(window.RepaintRect, timeout, false, window); }
			debounced[timeout](this.x, this.y, this.x + this.w, this.y + this.h, true);
		}
	};

	this.currY = () => {
		return Math.min(Math.max(this.calcCurrPos(), this.y + this.buttonHeight), this.y + this.buttonHeight + this.barLength);
	};

	this.bottom = () => {
		return Math.min(this.currY() + this.size, this.y + this.buttonHeight + this.barLength);
	};

	this.trace = (x, y) => {
		return y >= this.y && y <= (this.y + this.h) && x >= this.x && x <= (this.x + this.w);
	};

	this.tracePos = (x, y) => {
		return y >= this.currY() && y <= this.bottom() && x >= this.x && x <= (this.x + this.w);
	};

	this.traceButtons = (x, y, button = 'up') => {
		return button === 'up'
			? y >= this.y && y <= (this.y + this.buttonHeight) && x >= this.x && x <= (this.x + this.w)
			: y >= (this.y + this.h - this.buttonHeight) && y <= (this.y + this.h) && x >= this.x && x <= (this.x + this.w);
	};

	this.tracePosRel = (x, y, pos = 'u') => {
		return (pos === 'u' && y < this.currY() || pos === 'd' && y > this.bottom()) && x >= this.x && x <= (this.x + this.w);
	};

	this.btn_up = (x, y) => {
		this.bDrag = this.bDragUp = this.bDragDown = this.bHoveredBarUp = this.bHoveredBarDown = false;
		if (dragUpFunc) { clearInterval(dragUpFunc); dragUpFunc = null; draggingTime = 0; }
		if (dragDownFunc) { clearInterval(dragDownFunc); dragDownFunc = null; draggingTime = 0; }
		if (this.trace(x, y)) {
			this.repaint();
			return true;
		}
		return false;
	};

	let dragUpFunc = null;
	let dragDownFunc = null;
	let draggingTime = 0;
	this.btn_down = (x, y) => {
		if (this.trace(x, y)) {
			this.bHoveredCurr = this.tracePos(x, y);
			this.bHoveredUp = this.bHoveredCurr ? false : this.traceButtons(x, y, 'up');
			this.bHoveredDown = this.bHoveredCurr ? false : this.traceButtons(x, y, 'down');
			this.bHoveredBarUp = this.bHoveredCurr || this.bHoveredUp || this.bHoveredDown ? false : this.tracePosRel(x, y, 'u');
			this.bHoveredBarDown = !(this.bHoveredCurr || this.bHoveredUp || this.bHoveredDown || this.bHoveredBarUp);
			if (this.bHoveredCurr) {
				this.bDrag = true;
				this.my = this.calcCurrPos();
				this.bDragUp = this.bDragDown = false;
			} else if (this.bHoveredUp || this.bHoveredBarUp) {
				draggingTime = 0;
				this.bDragUp = true;
				this.bDrag = this.bDragDown = false;
				dragUpFunc = setInterval(() => {
					if (this.bHoveredBarUp && this.currY() <= y) {
						this.btn_up(x, this.currY());
						return;
					}
					if (this.bDragUp && this.currRow > 0) {
						const delta = draggingTime >= this.scrollSpeed * 9
							? 4
							: draggingTime >= this.scrollSpeed * 6
								? 2
								: 1;
						this.scrollFunc({ current: --this.currRow, delta });
						this.repaint();
					}
					draggingTime += this.scrollSpeed;
				}, this.scrollSpeed);
			} else if (this.bHoveredDown || this.bHoveredBarDown) {
				draggingTime = 0;
				this.bDragDown = true;
				this.bDrag = this.bDragUp = false;
				dragDownFunc = setInterval(() => {
					if (this.bHoveredBarDown && this.bottom() >= y) {
						this.btn_up(x, this.currY());
						return;
					}
					if (this.bDragDown && this.currRow < this.rows) {
						const delta = draggingTime >= this.scrollSpeed * 9
							? -4
							: draggingTime >= this.scrollSpeed * 6
								? -2
								: -1;
						this.scrollFunc({ current: ++this.currRow, delta });
						this.repaint();
					}
					draggingTime += this.scrollSpeed;
				}, this.scrollSpeed);
			}
			this.repaint();
			return true;
		} else {
			this.bHoveredCurr = this.bHovered = this.bHoveredUp = this.bHoveredDown = this.bHoveredBarUp = this.bHoveredBarDown = this.bDrag = this.bDragUp = this.bDragDown = false;
		}
		return false;
	};

	this.lbtn_dblclk = (x, y) => { // eslint-disable-line no-unused-vars
		if (!this.bHovered || !this.visible) { return false; }
		if (this.bHoveredCurr) {
			if (this.dblclkFunc) { this.dblclkFunc(this.currRow); }
		} else if (this.bHoveredDown || this.bHoveredUp) {
			const oldRow = this.currRow;
			this.currRow = this.bHoveredUp ? 0 : this.rows;
			if (oldRow !== this.currRow) { this.scrollFunc({ current: this.currRow, delta: oldRow - this.currRow }); }
			this.repaint();
		}
		return true;
	};

	this.move = (x, y) => {
		if (this.trace(x, y) || this.bDrag) {
			window.SetCursor(IDC_ARROW);
			this.bHovered = this.visible = true;
			this.time = Date.now();
			this.bHoveredCurr = this.tracePos(x, y);
			this.bHoveredUp = this.bHoveredCurr ? false : this.traceButtons(x, y, 'up');
			this.bHoveredDown = this.bHoveredCurr ? false : this.traceButtons(x, y, 'down');
			if (this.bDrag) {
				this.my = y;
				const oldRow = this.currRow;
				this.currRow = this.calcCurrRow(y);
				if (oldRow !== this.currRow) { this.scrollFunc({ current: this.currRow, delta: oldRow - this.currRow }); }
			}
			if (this.bHoveredCurr && this.tt) {
				if (this.tooltip.Text) { this.tooltip.Deactivate(); }
				this.tooltip.SetValue(this.tt, true);
			}
			this.repaint();
			return true;
		} else {
			this.my = -1;
			if (this.bHoveredCurr || this.bHovered) {
				this.bHoveredCurr = this.bHovered = this.bHoveredUp = this.bHoveredDown = this.bDragUp = this.bDragDown = this.bHoveredBarUp = this.bHoveredBarDown = false;
				this.repaint();
			}
			if (this.tooltip.Text) { this.tooltip.SetValue(null); }
		}
		return false;
	};

	this.rbtn_up = (x, y, mask) => { // eslint-disable-line no-unused-vars
		if (this.trace(x, y)) {
			this.contextMenu(x, y);
		}
		return true;
	};

	this.key_down = (k) => {
		switch (k) {
			// Scroll wheel
			case VK_UP: {
				if (this.currRow > 0) { this.scrollFunc({ current: --this.currRow, delta: 1 }); this.repaint(); }
				return true;
			}
			case VK_DOWN: {
				if (this.currRow < this.rows) { this.scrollFunc({ current: ++this.currRow, delta: -1 }); this.repaint(); }
				return true;
			}
			// Scroll entire pages
			case VK_PGUP: {
				if (this.currRow > 0) {
					const delta = Math.min(this.currRow, this.rows / 3);
					this.currRow -= delta;
					this.scrollFunc({ current: this.currRow, delta });
					this.repaint();
				}
				return true;
			}
			case VK_PGDN: {
				if (this.currRow < this.rows) {
					const delta = - Math.min(this.rows - this.currRow, this.rows / 3);
					this.currRow += delta;
					this.scrollFunc({ current: this.currRow, delta });
					this.repaint();
				}
				return true;
			}
			// Go to top/bottom
			case VK_HOME: {
				if (this.currRow > 0) {
					const delta = this.currRow;
					this.currRow = 0;
					this.scrollFunc({ current: this.currRow, delta });
					this.repaint();
				}
				return true;
			}
			case VK_END: {
				if (this.currRow < this.rows) {
					const delta = - (this.rows - this.currRow);
					this.currRow = this.rows;
					this.scrollFunc({ current: this.currRow, delta });
					this.repaint();
				}
				return true;
			}
		}
		return false;
	};

	this.contextMenu = function (x, y) {
		const _menu = window.CreatePopupMenu();
		_menu.AppendMenuItem(MF_STRING, 1, 'Scroll here');
		_menu.AppendMenuSeparator();
		_menu.AppendMenuItem(this.currRow > 0 ? MF_STRING : MF_GRAYED | MF_DISABLED, 2, 'Top');
		_menu.AppendMenuItem(this.currRow < this.rows ? MF_STRING : MF_GRAYED | MF_DISABLED, 3, 'Bottom');
		_menu.AppendMenuSeparator();
		_menu.AppendMenuItem(this.currRow > 0 ? MF_STRING : MF_GRAYED | MF_DISABLED, 4, 'Page Up');
		_menu.AppendMenuItem(this.currRow < this.rows ? MF_STRING : MF_GRAYED | MF_DISABLED, 5, 'Page Down');
		_menu.AppendMenuSeparator();
		_menu.AppendMenuItem(this.currRow > 0 ? MF_STRING : MF_GRAYED | MF_DISABLED, 6, 'Scroll Up');
		_menu.AppendMenuItem(this.currRow < this.rows ? MF_STRING : MF_GRAYED | MF_DISABLED, 7, 'Scroll Down');
		const idx = _menu.TrackPopupMenu(x, y);
		switch (idx) {
			case 1: {
				const oldRow = this.currRow;
				this.currRow = this.calcCurrRow(y);
				if (oldRow !== this.currRow) { this.scrollFunc({ current: this.currRow, delta: oldRow - this.currRow }); }
				break;
			}
			case 2:
				this.key_down(VK_HOME);
				break;
			case 3:
				this.key_down(VK_END);
				break;
			case 4:
				this.key_down(VK_PGUP);
				break;
			case 5:
				this.key_down(VK_PGDN);
				break;
			case 6:
				this.key_down(VK_UP);
				break;
			case 7:
				this.key_down(VK_DOWN);
				break;
			default: return false;
		}
		return true;
	};
}