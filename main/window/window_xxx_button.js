'use strict';
//21/12/23

/* exported _button */

include('window_xxx_helpers.js');
/* global RGBA:readable, toRGB:readable, getBrightness:readable, debounce:readable, _gdiFont:readable, _tt:readable, RGBA:readable,  */
include('..\\..\\helpers\\helpers_xxx_flags.js');
/* global SF_CENTRE:readable, IDC_HAND:readable  */

function _button({
	text = '',
	x, y, w, h,
	isVisible = (time, timer) => this.hover || Date.now() - time < (timer || this.timer),
	notVisibleMode = 'invisible', // invisible | alpha
	lbtnFunc = () => void (0),
	lbtnDblFunc = () => void (0),
	rbtnFunc = () => void (0),
	scrollSpeed = 60, // ms
	scrollSteps = 3, // ms
	timer = 1500, // ms
	bTimerOnVisible = false, // ms
	tt = '',
	iDoubleClickTimer = 250, // ms
} = {}) {
	this.paint = (gr, color) => {
		if (this.w <= 0) { return; }
		// Smooth visibility switch
		let bLastStep = false;
		if (this.isVisible && !this.isVisible(this.time, this.timer)) {
			if (this.bVisible) {
				this.bVisible = false;
			} else {
				switch (this.notVisibleMode) { // NOSONAR
					case 'invisible': return;
					default: {
						color = RGBA(...toRGB(color), this.notVisibleMode);
						bLastStep = true;
					}
				}
			}
		}
		if (!this.hover) { color = RGBA(...toRGB(color), getBrightness(...toRGB(color)) < 50 ? 100 : 25); }
		gr.SetTextRenderingHint(4);
		const text = this.text && this.text.constructor && this.text.call && this.text.apply ? this.text.call(this, this) : this.text; // NOSONAR [support both this]
		gr.DrawString(text, this.font, color, this.x, this.y, this.w, this.h, SF_CENTRE);
		gr.SetTextRenderingHint(0);
		if (!bLastStep && this.isVisible) { this.repaint(this.timer); } // Smooth visibility switch
	};
	const debounced = {
		[this.timer]: debounce(window.RepaintRect, this.timer, false, window)
	};
	this.repaint = (timeout = 0) => {
		if (timeout === 0) { window.RepaintRect(this.x, this.y, this.w, this.h); }
		else {
			if (!Object.hasOwn(debounced, timeout)) { debounced[timeout] = debounce(window.RepaintRect, timeout, false, window); }
			debounced[timeout](this.x, this.y, this.w, this.h, true);
		}
	};
	this.trace = (x, y) => {
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h && this.isVisible();
	};
	this.move = (x, y) => {
		if (this.trace(x, y)) {
			this.time = Date.now();
			window.SetCursor(IDC_HAND);
			if (!this.hover) {
				this.hover = true;
				this.repaint();
			}
			if (this.hover && this.tt) {
				if (this.tooltip.Text) { this.tooltip.Deactivate(); }
				this.tooltip.SetValue(this.tt, true);
			}
			return true;
		} else {
			if (this.tooltip.Text) { this.tooltip.SetValue(null); }
			if (this.bTimerOnVisible && this.isVisible()) { this.time = Date.now(); }
			this.bDown = false;
			if (this.hover) {
				this.hover = false;
				this.repaint();
			}
			return false;
		}
	};
	let downFunc = null;
	let draggingTime = 0;
	this.lbtn_down = (x, y, mask, parent) => {
		if (!this.scrollSpeed) { return false; }
		if (this.trace(x, y)) {
			this.bHover = true;
			if (this.bHover) {
				this.bDown = true;
				if (this.lbtnFunc) {
					draggingTime = 0;
					downFunc = setInterval(() => {
						if (this.bDown) {
							const delta = 1 + (draggingTime > this.scrollSpeed * 3 ? Math.log(draggingTime / this.scrollSpeed) * this.scrollSteps : 0);
							this.lbtnFunc.call(parent, x, y, mask, parent, delta);
							this.repaint();
						}
						draggingTime += this.scrollSpeed;
					}, this.scrollSpeed);
				}
			}
			this.repaint();
			return true;
		} else {
			this.bHover = this.bDown = false;
		}
		return false;
	};
	this.lbtn_up = (x, y, mask, parent) => {
		this.bDown = false;
		if (downFunc) { clearInterval(downFunc); downFunc = null; draggingTime = 0; }
		if (this.trace(x, y)) {
			if (this.lbtnFunc) {
				if (!this.bDblClk) {
					if (parent) {
						this.timeoutLclk = setTimeout(() => this.lbtnFunc.call(parent, x, y, mask, parent, 1), this.iDoubleClickTimer);
					} else {
						this.timeoutLclk = setTimeout(() => this.lbtnFunc(x, y, mask, 1), this.iDoubleClickTimer);
					}
				} else { this.bDblClk = false; }
			}
			return true;
		} else {
			return false;
		}
	};
	this.rbtn_up = (x, y, mask, parent) => {
		if (this.trace(x, y)) {
			if (this.rbtnFunc) {
				if (parent) {
					this.rbtnFunc.call(parent, x, y, mask, parent);
				} else {
					this.rbtnFunc(x, y, mask);
				}
			}
			return true;
		} else {
			return false;
		}
	};
	this.lbtn_dblclk = (x, y, mask, parent) => {
		if (this.trace(x, y)) {
			if (!this.hover || !this.isVisible()) { return false; }
			else if (this.lbtnDblFunc) {
				if (parent) {
					this.lbtnDblFunc.call(parent, x, y, mask, parent);
				} else {
					this.lbtnDblFunc(x, y, mask);
				}
			}
			this.bDblClk = true;
			clearTimeout(this.timeoutLclk);
			this.timeoutLclk = null;
			return true;
		}
		return false;
	};
	this.hover = false;
	this.bDown = false;
	this.text = text;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.isVisible = isVisible;
	this.notVisibleMode = notVisibleMode;
	this.bTimerOnVisible = bTimerOnVisible;
	this.bVisible = true;
	this.lbtnFunc = lbtnFunc;
	this.lbtnDblFunc = lbtnDblFunc;
	this.rbtnFunc = rbtnFunc;
	this.tt = tt;
	this.font = _gdiFont('FontAwesome', this.h);
	this.tooltip = new _tt(null, void (0), void (0), 600);
	this.time = Date.now();
	this.timer = timer;
	this.bDblClk = false;
	this.scrollSpeed = scrollSpeed;
	this.scrollSteps = scrollSteps;
	this.iDoubleClickTimer = iDoubleClickTimer;
	this.timeoutLclk = null;
}