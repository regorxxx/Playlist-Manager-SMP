'use strict';
//06/04/22

include('window_xxx_helpers.js');
include('..\\..\\helpers\\helpers_xxx_flags.js');

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
			visibleFunc = (time) => Date.now() - time < this.timer || this.bHovered || this.bDrag,
			scrollFunc = () => void(0)
		} = {}) {
	this.tt = '';
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.size = size;
	this.color = color;
	this.bgColor = bgColor;
	this.bDrag = false;
	this.bDragUp = false;
	this.bDragDown = false;
	this.bHoveredCurr = false;
	this.bHoveredUp = false;
	this.bHoveredDown = false;
	this.bHovered = false;
	this.rows = rows;
	this.rowsPerPage = rowsPerPage;
	this.font = _gdiFont('Segoe UI', w);
	this.currRow = 0;
	this.time = Date.now();
	this.timer = timer;
	this.visibleFunc = visibleFunc;
	this.scrollFunc = scrollFunc;
	this.visible = true;
	this.barLength = this.h;
	this.buttonHeight = 0;
	
	this.calcCurrRow = (y) => {
		return y <= (this.y + this.buttonHeight)
			? 0
			: y >= (this.y + this.buttonHeight + this.barLength)
				? this.rows
				: (y - this.y - this.buttonHeight) / this.barLength * this.rows;
	};
	
	this.calcCurrPos = (row = this.currRow) => {
		return row <= 0
			? this.y + this.buttonHeight 
			: row >= this.rows
				? this.y + this.buttonHeight + this.barLength
				: row / this.rows * (this.y + this.buttonHeight + this.barLength);
	};
	
	this.paint = (gr, x, y) => { // on_paint
		if (this.w <= 0) {return;} 
		// Smooth visibility switch
		if (!this.visibleFunc(this.time)) {
			if (this.visible) {this.visible = false;}
			else { // Small bar when not shown
				gr.SetSmoothingMode(SmoothingMode.HighQuality);
				const w = Math.max(this.w / 10, _scale(2));
				let currY = Math.min(Math.max(this.calcCurrPos() - this.size / 2, this.y), this.y + this.h);
				const offset = currY + this.size - (this.y + this.h);
				if (offset > 0) {currY -= offset;}
				const currX = this.x + this.w * 2 / 3 - w;
				try {gr.FillRoundRect(currX, currY, w, this.size, w / 2, w / 2, this.color);} 
				catch (e) {gr.FillSolidRect(currX, currY, w, this.size, this.color);}
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
		if (this.bDragUp) {tintColor(up.button, 20);}
		if (this.bDragDown) {tintColor(down.button, 20);}
		// Bg
		gr.SetSmoothingMode(SmoothingMode.HighQuality);
		gr.FillSolidRect(this.x, this.y, this.w, this.h, bgColor);
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
		let currY = Math.min(Math.max(this.calcCurrPos() - this.size / 2, this.y + buttonHeight), this.y + this.buttonHeight + this.barLength);
		const offset = currY + this.size - (this.y + this.buttonHeight + this.barLength);
		if (offset > 0) {currY -= offset;}
		const currColor = this.bDrag
			? tintColor(color, 20) 
			: this.bHoveredCurr 
				? tintColor(color, 10)
				: color;
		gr.FillSolidRect(this.x, currY, this.w, this.size, currColor);
		gr.SetSmoothingMode(SmoothingMode.Default);
		if (this.visibleFunc) {this.repaint(this.timer);} // Smooth visibility switch
	};
	
	const debounced = {
		[this.timer]: debounce(window.RepaintRect, this.timer, false, window)
	}
	this.repaint = (timeout = 0) => {
		if (timeout === 0) {window.RepaintRect(this.x, this.y, this.x + this.w, this.y + this.h);}
		else {
			if (!debounced.hasOwnProperty(timeout)) {debounced[timeout] = debounce(window.RepaintRect, timeout, false, window)}
			debounced[timeout](this.x, this.y, this.x + this.w, this.y + this.h, true);
		}
	}

	this.trace = (x, y) => {
		return y >= this.y && y <= (this.y + this.h) && x >= this.x && x <= (this.x + this.w);
	};
	
	this.tracePos = (x, y) => {
		const currY = Math.min(Math.max(this.calcCurrPos() - this.size / 2, this.y + this.buttonHeight), this.y + this.buttonHeight + this.barLength);
		const top = Math.min(currY + this.size, this.y + this.buttonHeight + this.barLength);
		return y >= currY && y <= top && x >= this.x && x <= (this.x + this.w);
	};
	
	this.traceButtons = (x, y, button = 'up') => {
		return button === 'up'
			? y >= this.y && y <= (this.y + this.buttonHeight) && x >= this.x && x <= (this.x + this.w)
			: y >= (this.y + this.h - this.buttonHeight) && y <= (this.y + this.h) && x >= this.x && x <= (this.x + this.w);
	};
	
	this.btn_up = (x, y) => {
		this.bDrag = this.bDragUp = this.bDragDown = false;
		if (dragUpFunc) {clearInterval(dragUpFunc); dragUpFunc = null; prev = null;}
		if (dragUpFunc) {clearInterval(dragDownFunc); dragDownFunc = null; prev = null;}
		if (this.trace(x, y)) {
			this.repaint();
			return true;
		}
		return false;
	};
	
	let dragUpFunc = null;
	let dragDownFunc = null;
	let prev = null;
	this.btn_down = (x, y) => {
		if (this.trace(x, y)) {
			this.bHoveredCurr = this.tracePos(x, y);
			this.bHoveredUp = this.bHoveredCurr ? false : this.traceButtons(x, y, 'up');
			this.bHoveredDown = this.bHoveredCurr ? false : this.traceButtons(x, y, 'down');
			if (this.bHoveredCurr) {
				this.bDrag = true;
				this.bDragUp = this.bDragDown = false;
			} else if (this.bHoveredUp) {
				this.bDragUp = true;
				this.bDrag = this.bDragDown = false;
				dragUpFunc = setInterval(() => {
					if (this.bDragUp && this.currRow > 0) {
						const currY = Math.min(Math.max(this.calcCurrPos() - this.size / 2, this.y + this.buttonHeight), this.y + this.buttonHeight + this.barLength);
						const oldRow = this.currRow;
						const add = _scale(2);
						let i = add;
						while (oldRow === this.currRow) {
							this.currRow = Math.round(this.calcCurrRow(currY - i));
							i += add;
						}
						if (prev === this.currRow) {this.currRow--;}
						prev = this.currRow;
						this.scrollFunc(this.currRow);
						this.repaint();
					}
				}, 80);
			} else if (this.bHoveredDown) {
				this.bDragDown = true;
				this.bDrag = this.bDragUp = false;
				dragDownFunc = setInterval(() => {
					if (this.bDragDown && this.currRow < this.rows) {
						const currY = Math.min(Math.max(this.calcCurrPos() + this.size, this.y + this.buttonHeight), this.y + this.buttonHeight + this.barLength);
						const oldRow = this.currRow;
						const add = _scale(2);
						let i = add;
						while (oldRow === this.currRow) {
							this.currRow = Math.round(this.calcCurrRow(currY + i));
							i += add;
						}
						if (prev === this.currRow) {this.currRow++;}
						prev = this.currRow;
						this.scrollFunc(this.currRow);
						this.repaint();
					}
				}, 80);
			}
			this.repaint();
			return true;
		} else { 
			this.bHoveredCurr = this.bHovered = this.bHoveredUp = this.bHoveredDown = this.bDrag = this.bDragUp = this.bDragDown = false;
		}
		return false;
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
				const oldRow = this.currRow;
				this.currRow = this.calcCurrRow(y);
				if (oldRow !== this.currRow) {this.scrollFunc(this.currRow);}
			}
			this.repaint();
			return true;
		} else {
			if (this.bHoveredCurr || this.bHovered) {
				this.bHoveredCurr = this.bHovered = this.bHoveredUp = this.bHoveredDown = this.bDragUp = this.bDragDown = false;
				this.repaint();
			}
		}
		return false;
	};
}