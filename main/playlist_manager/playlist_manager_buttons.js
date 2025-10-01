'use strict';
//01/10/25

/* global list:readable, chars:readable, isArrayEqual:readable, cycleCategories:readable, cycleTags:readable, properties */
/* exported ThemedPanelButton, calcNextButtonCoordinates, on_paint_buttn, on_mouse_move_buttn, on_mouse_leave_buttn, on_mouse_lbtn_down_buttn, on_size_buttn, _listButtons */

/* global globFonts:readable, DT_LEFT:readable, DT_CALCRECT:readable, DT_VCENTER:readable, DT_CENTER:readable, DT_NOPREFIX:readable, globSettings:readable, panel:readable, WshShell:readable, popup:readable, overwriteProperties:readable, FontStyle:readable */
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
/* global isFunction:readable, _ps:readable */
include('..\\..\\helpers\\helpers_xxx_UI.js');
/* global RGB:readable, _tt:readable, _scale:readable, _gdiFont:readable, _gr:readable, extendGR:readable, opaqueColor:readable, RGBA:readable */
include('..\\..\\helpers\\helpers_xxx_flags.js');
/* global buttonStates:readable */

function _listButtons(bSetup = false) {
	// General config
	this.config = {
		toolbarColor: RGB(0, 0, 0), // Toolbar color
		toolbarTransparency: 5, // Toolbar color
		bToolbar: false, // Change this on buttons bars files to set the background color
		textColor: RGB(0, 0, 0),
		bUseThemeManager: true,
		partAndStateID: 6 // 1 standard button, 6 no bg/border button (+hover)
	};
	// Button objs
	this.buttons = {}; // Global list
	// Others (internal use)
	this.oldButtonCoordinates = { x: 0, y: 0, w: 0, h: 0 }; // To store coordinates of previous buttons when drawing
	this.tooltipButton = new _tt(null, 'Segoe UI', _scale(10), 1200);  // Global tooltip
	this.gDown = false;
	this.curBtn = null;
	this.useThemeManager = () => this.config.bUseThemeManager && this.config.partAndStateID === 1;
	this.x = 0;
	this.y = 0;
	this.w = 0;
	this.h = 0;
	const parent = this;

	const calcNextButtonCoordinates = (coord, recalc = true) => {
		let newCoordinates;
		const old = this.oldButtonCoordinates;
		const keys = ['x', 'y', 'w', 'h'];
		const bFuncCoord = Object.fromEntries(keys.map((c) => { return [c, isFunction(coord[c])]; }));
		const iCoord = Object.fromEntries(keys.map((c) => { return [c, bFuncCoord[c] ? coord[c]() : coord[c]]; }));
		newCoordinates = Object.fromEntries(keys.map((c) => { return [c, bFuncCoord[c] ? () => { return old[c] + coord[c](); } : old[c] + iCoord[c]]; }));
		if (recalc) {
			old.x += iCoord.x + iCoord.w;
			old.h = Math.max(old.h, iCoord.h);
		}
		return newCoordinates;
	};

	function ThemedPanelButton({
		x, y, w, h,
		text,
		func,
		state,
		description,
		icon = null,
		gFont = _gdiFont(globFonts.button.name, !properties ? panel.fonts.buttons.Size : globFonts.button.size),
		gFontIcon = _gdiFont(globFonts.buttonIcon.name, !properties ? panel.fonts.buttons.Size : globFonts.buttonIcon.size),
	} = {}) {
		this.state = state || buttonStates.normal;
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.originalWindowWidth = window.Width;
		this.g_theme = parent.config.bUseThemeManager
			? window.CreateThemeManager('Button')
			: null;
		this.gFont = gFont;
		this.gFontIcon = gFontIcon;
		this.description = description;
		this.text = text;
		this.textWidth = isFunction(this.text)
			? () => _gr.CalcTextWidth(this.text(), gFont)
			: _gr.CalcTextWidth(this.text, gFont);
		this.icon = this.gFontIcon.Name !== 'Microsoft Sans Serif' ? icon : null; // if using the default font, then it has probably failed to load the right one, skip icon
		this.iconWidth = isFunction(this.icon)
			? () => _gr.CalcTextWidth(this.icon(), gFontIcon)
			: _gr.CalcTextWidth(this.icon, gFontIcon);
		this.func = func;

		this.containXY = function (x, y) {
			const xCalc = isFunction(this.x) ? this.x() : this.x;
			const yCalc = isFunction(this.y) ? this.y() : this.y;
			const wCalc = isFunction(this.w) ? this.w() : this.w;
			const hCalc = isFunction(this.h) ? this.h() : this.h;
			return (xCalc <= x) && (x <= xCalc + wCalc) && (yCalc <= y) && (y <= yCalc + hCalc);
		};

		this.changeState = function (state) {
			let old = this.state;
			this.state = state;
			return old;
		};

		this.draw = function (gr, bLast = false) {
			extendGR(gr, { DrawRoundRect: true, FillRoundRect: true, Debug: globSettings.bDebugPaint }); // helpers_xxx_prototypes_smp.js
			// Draw?
			if (this.state === buttonStates.hide) { return; }
			const bDrawBackground = parent.config.partAndStateID === 1;
			// Check SO allows button theme
			if (parent.useThemeManager() && !this.g_theme) {
				if (!this.g_theme) { // may have been changed before drawing but initially not set
					this.g_theme = window.CreateThemeManager('Button');
					if (!this.g_theme) {
						parent.config.bUseThemeManager = false;
						console.log('Buttons: window.CreateThemeManager(\'Button\') failed, using experimental buttons');
					}
				}
			}
			const wCalc = isFunction(this.w) ? this.w() : this.w;
			const hCalc = isFunction(this.h) ? this.h() : this.h;
			if (wCalc <= 1 || hCalc <= 1) { return; }
			if (this.state === buttonStates.hide) { return; }
			// Themed Button states
			if (parent.useThemeManager()) {
				switch (this.state) {
					case buttonStates.normal:
						this.g_theme.SetPartAndStateID(parent.config.partAndStateID, 1);
						break;
					case buttonStates.hover:
						parent.tooltipButton.SetValue(
							isFunction(this.description)
								? this.description()
								: this.description,
							true
						);
						this.g_theme.SetPartAndStateID(parent.config.partAndStateID, 2);
						break;
					case buttonStates.down:
						this.g_theme.SetPartAndStateID(parent.config.partAndStateID, 3);
						break;
					case buttonStates.hide:
						return;
				}
			}
			// New coordinates must be calculated
			const xCalc = isFunction(this.x) ? this.x() : this.x;
			const yCalc = isFunction(this.y) ? this.y() : this.y;
			// Draw Button
			if (parent.useThemeManager()) { this.g_theme.DrawThemeBackground(gr, xCalc, yCalc, wCalc, hCalc); }
			else {
				const x = xCalc + 1; const y = yCalc; const w = Math.max(wCalc - 4, 0); const h = Math.max(hCalc - 2, 0); const arc = Math.min(w, h, _scale(5)) / 2;
				if (w > 0 && h > 0 && arc > 0) {
					gr.SetSmoothingMode(2); // Antialias for lines
					const toolbarAlpha = Math.min(parent.config.toolbarTransparency * 10, 100);
					switch (this.state) {
						case buttonStates.normal:
							if (bDrawBackground) {
								gr.FillRoundRect(x, y, w, h, arc, arc, RGB(240, 240, 240));
								gr.FillGradRect(x, y + 2, w, h / 2 - 2, 180, RGB(241, 241, 241), RGB(235, 235, 235));
								gr.FillGradRect(x, y + h / 2, w, h / 2, 180, RGB(219, 219, 219), RGB(207, 207, 207));
								gr.DrawRoundRect(x, y, w, h, arc, arc, 1, RGB(0, 0, 0));
								gr.DrawRoundRect(x + 1, y + 1, w - 2, h - 2, arc, arc, 1, RGB(243, 243, 243));
							} else if (parent.config.bToolbar) {
								gr.DrawLine(xCalc - 1, y, xCalc - 1, y + hCalc, 1, opaqueColor(parent.config.toolbarColor, toolbarAlpha));
								if (bLast) { gr.DrawLine(xCalc + wCalc - 2, y, xCalc + wCalc - 2, y + hCalc, 1, opaqueColor(parent.config.toolbarColor, toolbarAlpha)); }
							} else {
								gr.DrawRoundRect(x, y, w, h, arc, arc, 1, opaqueColor(parent.config.toolbarColor, toolbarAlpha / 2));
							}
							break;
						case buttonStates.hover:
							parent.tooltipButton.SetValue(
								isFunction(this.description)
									? this.description()
									: this.description,
								true
							);
							if (bDrawBackground) {
								gr.FillRoundRect(x, y, w, h, arc, arc, RGB(240, 240, 240));
								gr.FillGradRect(x, y + 2, w, h / 2 - 2, 180, RGB(241, 241, 241), RGB(235, 235, 235));
								gr.FillGradRect(x, y + h / 2, w, h / 2, 180, RGB(219, 219, 219), RGB(207, 207, 207));
							} else if (parent.config.bToolbar) {
								gr.FillSolidRect(x, y, wCalc, h, 1, RGB(160, 160, 160));
							}
							if (parent.config.bToolbar) {
								if (bLast) { gr.DrawLine(xCalc + wCalc - 2, y, xCalc + wCalc - 2, y + hCalc, 1, opaqueColor(parent.config.toolbarColor, toolbarAlpha)); }
								gr.DrawLine(xCalc - 1, y, xCalc - 1, y + hCalc, 1, opaqueColor(parent.config.toolbarColor, toolbarAlpha));
								gr.DrawRect(x, y + 1, w, h, 1, RGB(243, 243, 243));
							} else {
								gr.DrawRoundRect(x + 1, y + 1, w - 2, h - 2, arc, arc, 1, RGB(243, 243, 243));
							}
							if (bDrawBackground) {
								gr.FillRoundRect(x, y, w, h / 2, arc, arc, RGBA(225, 243, 252, 255));
								gr.FillRoundRect(x, y + h / 2, w, h / 2, arc, arc, RGBA(17, 166, 248, 50));
							} else if (parent.config.bToolbar) {
								gr.FillSolidRect(x, y + 1, w, h / 2 - 1, RGBA(255, 255, 255, 50));
								gr.FillSolidRect(x, y + h / 2, w, h / 2, RGBA(0, 0, 0, 10));
							} else {
								gr.FillRoundRect(x, y + 1, w, h / 2 - 1, arc, arc, RGBA(255, 255, 255, 50));
								gr.FillRoundRect(x, y + h / 2, w, h / 2, arc, arc, RGBA(0, 0, 0, 10));
							}
							if (bDrawBackground) {
								gr.DrawRoundRect(x, y, w, h, arc, arc, 1, RGB(0, 0, 0));
							} else if (!parent.config.bToolbar) {
								gr.DrawRoundRect(x, y, w, h, arc, arc, 1, RGB(160, 160, 160));
							}
							break;
						case buttonStates.down:
							if (bDrawBackground) {
								gr.FillRoundRect(x, y, w, h, arc, arc, RGB(240, 240, 240));
								gr.FillGradRect(x, y + 2, w, h / 2 - 2, 180, RGB(241, 241, 241), RGB(235, 235, 235));
								gr.FillGradRect(x, y + h / 2, w, h / 2, 180, RGB(219, 219, 219), RGB(207, 207, 207));
							}
							if (parent.config.bToolbar) {
								if (bLast) { gr.DrawLine(xCalc + wCalc - 2, y, xCalc + wCalc - 2, y + hCalc, 1, opaqueColor(parent.config.toolbarColor, toolbarAlpha)); }
								gr.DrawLine(xCalc - 1, y, xCalc - 1, y + hCalc, 1, opaqueColor(parent.config.toolbarColor, toolbarAlpha));
							} else {
								gr.DrawRoundRect(x, y, w, h, arc, arc, 1, RGB(0, 0, 0));
							}
							if (bDrawBackground) {
								gr.DrawRoundRect(x + 1, y + 1, w - 2, h - 2, arc, arc, 1, RGB(243, 243, 243));
								gr.FillRoundRect(x, y, w, h / 2, arc, arc, RGBA(225, 243, 252, 255));
								gr.FillRoundRect(x, y + h / 2, w, h / 2, arc, arc, RGBA(37, 196, 255, 80));
								gr.DrawRoundRect(x + 1, y + 1, w - 2, h - 2, arc, arc, 3, RGBA(0, 0, 0, 50));
							} else if (parent.config.bToolbar) {
								gr.FillSolidRect(x - 1, y, w + 2, h / 8, opaqueColor(parent.config.toolbarColor, toolbarAlpha / 2));
								gr.FillSolidRect(x - 1, y, w + 2, h / 6, opaqueColor(parent.config.toolbarColor, toolbarAlpha / 2));
								gr.FillSolidRect(x - 1, y + h / 6, w + 2, h / 6, opaqueColor(parent.config.toolbarColor, toolbarAlpha / 5));
								gr.FillSolidRect(x - 1, y, w + 2, h, opaqueColor(parent.config.toolbarColor, toolbarAlpha / 5));
							} else {
								gr.FillRoundRect(x, y, w, h / 8, arc / 4, arc / 4, opaqueColor(parent.config.toolbarColor, toolbarAlpha / 2));
								gr.FillRoundRect(x, y, w, h / 6, arc / 4, arc / 4, opaqueColor(parent.config.toolbarColor, toolbarAlpha / 2));
								gr.FillRoundRect(x, y + h / 6, w, h / 6, arc / 4, arc / 4, opaqueColor(parent.config.toolbarColor, toolbarAlpha / 5));
								gr.FillRoundRect(x, y, w, h, arc / 2, arc / 2, opaqueColor(parent.config.toolbarColor, toolbarAlpha / 5));
							}
							break;
						case buttonStates.hide:
							return;
					}
					gr.SetSmoothingMode(0);
				}
			}
			const offset = 10;
			if (this.icon !== null) {
				const iconWidthCalculated = isFunction(this.icon) ? this.iconWidth() : this.iconWidth;
				const textWidthCalculated = wCalc - iconWidthCalculated - offset;
				const iconCalculated = isFunction(this.icon) ? this.icon() : this.icon;
				const textCalculated = isFunction(this.text) ? this.text() : this.text;
				gr.GdiDrawText(iconCalculated, this.gFontIcon, parent.config.textColor, xCalc + offset, yCalc, textWidthCalculated, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Icon
				if (wCalc > iconWidthCalculated * 4 + offset * 4) {
					gr.GdiDrawText(textCalculated, this.gFont, parent.config.textColor, xCalc + iconWidthCalculated, yCalc, wCalc - offset, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
				} else {
					gr.GdiDrawText(textCalculated, this.gFont, parent.config.textColor, xCalc + offset * 2 + iconWidthCalculated, yCalc, wCalc - offset * 3 - iconWidthCalculated, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
				}
			} else {
				const textCalculated = isFunction(this.text) ? this.text() : this.text;
				gr.GdiDrawText(textCalculated, this.gFont, parent.config.textColor, xCalc, yCalc, wCalc, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			}
		};

		this.onClick = function () {
			this.func && this.func();
		};
	}

	const drawAllButtons = (gr) => {
		const keys = Object.keys(this.buttons);
		const len = keys.length;
		keys.forEach((key, i) => {
			if (Object.hasOwn(this.buttons, key)) {
				this.buttons[key].draw(gr, len === (i + 1));
			}
		});
	};

	const chooseButton = (x, y) => {
		for (let key in this.buttons) {
			if (Object.hasOwn(this.buttons, key)) {
				if (this.buttons[key].containXY(x, y) && this.buttons[key].state !== buttonStates.hide) {
					return this.buttons[key];
				}
			}
		}
		return null;
	};

	const retrieveBarCoords = () => {
		let x = 0, y = 0, w = 0, h = 0;
		for (let key in this.buttons) {
			if (Object.hasOwn(this.buttons, key)) {
				const button = this.buttons[key];
				x = Math.min(isFunction(button.x) ? button.x() : button.x, x);
				y = Math.max(isFunction(button.y) ? button.y() : button.y, y);
				w = Math.max((isFunction(button.x) ? button.x() : button.x) + (isFunction(button.w) ? button.w() : button.w), w);
				h = Math.max(isFunction(button.h) ? button.h() : button.h, h);
			}
		}
		return [x, y, w, h];
	};

	this.on_paint_buttn = (gr) => {
		if (bSetup) { // Overrides panel settings
			this.config.bToolbar = false;
			this.config.toolbarTransparency = 0;
			this.config.partAndStateID = 1;
			this.config.bUseThemeManager = false;
		}
		[this.x, this.y, this.w, this.h] = retrieveBarCoords();
		if (this.config.bToolbar) { // When not merged with panels
			gr.FillSolidRect(this.x, this.y, this.w, this.h, opaqueColor(this.config.toolbarColor, this.config.toolbarTransparency));
			gr.DrawLine(this.x, this.y, this.w, this.y, 1, opaqueColor(this.config.toolbarColor, Math.min(this.config.toolbarTransparency * 10, 100)));
		}
		drawAllButtons(gr);
	};

	this.on_mouse_move_buttn = (x, y) => {
		let old = this.curBtn;
		this.curBtn = chooseButton(x, y);

		if (old === this.curBtn) {
			if (this.gDown) {
				return;
			}
		} else if (this.gDown && this.curBtn && this.curBtn.state !== buttonStates.down) {
			this.curBtn.changeState(buttonStates.down);
			old && old.changeState(buttonStates.normal);
			list.repaint();
			return;
		}

		//Tooltip fix
		if (old !== null) {
			// Needed because tooltip is only activated/deactivated on redrawing... otherwise it shows on empty spaces after leaving a button.
			if (this.curBtn === null) { this.tooltipButton.Deactivate(); }
			// This forces redraw even if buttons have the same text! Updates position but tooltip becomes slower since it sets delay time to initial...
			else if (old !== this.curBtn && old.description === this.curBtn.description) {
				this.tooltipButton.Deactivate();
				this.tooltipButton.SetDelayTime(3, 0); //TTDT_INITIAL
			} else { this.tooltipButton.SetDelayTime(3, this.tooltipButton.oldDelay); }
		}
		old && old.changeState(buttonStates.normal);
		this.curBtn && this.curBtn.changeState(buttonStates.hover);
		list.repaint();
	};

	this.on_mouse_leave_buttn = () => {
		this.gDown = false;
		if (this.curBtn) {
			this.curBtn.changeState(buttonStates.normal);
			list.repaint();
		}
	};

	this.on_mouse_lbtn_down_buttn = (x, y) => { // eslint-disable-line no-unused-vars
		this.gDown = true;
		if (this.curBtn) {
			this.curBtn.changeState(buttonStates.down);
			list.repaint();
		}
	};

	this.on_mouse_lbtn_up_buttn = (x, y) => { // eslint-disable-line no-unused-vars
		this.gDown = false;
		if (this.curBtn) {
			this.curBtn.onClick();
			// Solves error if you create a new WshShell Popup (this.curBtn becomes null) after pressing the button and firing this.curBtn.onClick()
			if (this.curBtn) {
				this.curBtn.changeState(buttonStates.hover);
				list.repaint();
			}
		}
	};

	this.on_size_buttn = () => {
		if (bSetup) { return; }
		this.oldButtonCoordinates.x = 0;
		Object.keys(this.buttons).forEach((key) => {
			this.buttons[key].gFont = _gdiFont(globFonts.button.name, !properties ? panel.fonts.buttons.Size : globFonts.button.size);
			this.buttons[key].gFontIcon = _gdiFont(globFonts.buttonIcon.name, !properties ? panel.fonts.buttons.Size : globFonts.buttonIcon.size);
		});
	};

	const addButton = (newButtons) => {
		// Check if the button list already has the same button ID
		for (let buttonName in newButtons) {
			if (Object.hasOwn(this.buttons, buttonName)) {
				Object.defineProperty(newButtons, buttonName + Object.keys(this.buttons).length, Object.getOwnPropertyDescriptor(newButtons, buttonName));
				delete newButtons[buttonName];
			}
		}
		this.buttons = { ...this.buttons, ...newButtons };
	};

	// Recalc size
	this.recalcWidth = (bInit) => {
		const weights = [];
		for (const key in this.buttons) {
			if (Object.hasOwn(this.buttons, key)) {
				const button = this.buttons[key];
				let weight;
				if (Object.hasOwn(button, 'method')) {
					if (button.method === 'MBID') { weight = 2.6 / 7; }
					else if (button.method === 'Lock state') { weight = 2.6 / 7; }
					else { weight = 2 / 7; }
				} else if (!bInit) {
					const sortState = list.getSortState();
					if (sortState.length >= 5) { weight = 2.4 / 7; }
					else { weight = 2 / 7; }
				}
				weights.push({key, weight});
			}
		}
		const total = weights.reduce((prev, curr) => prev + curr.weight, 0);
		const extra = 1 - total;
		weights.forEach((w) => {
			const button = this.buttons[w.key];
			button.coord.w = button.w = () => window.Width * (w.weight + extra / 3);
		});
	};

	if (bSetup) {
		addButton({
			setup: new ThemedPanelButton({
				x: window.Width / 3,
				y: 0,
				w: window.Width / 2,
				h: window.Height / 3,
				text: 'Setup',
				func: function () {
					const answer = WshShell.Popup('First, before setup, be sure to close all Spider Monkey Panel windows.\nClicking ok will start the configuration of the panel. Read the popups and follow their instructions.\n\nPanel will be reloaded. Continue Setup?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer === popup.yes) {
						list.properties.bSetup[1] = false;
						overwriteProperties(list.properties); // Updates panel
						window.Reload();
					}
				},
				gFont: _gdiFont(globFonts.button.name, _scale(globFonts.standardBig.size), FontStyle.Bold),
				description: 'Click to start setup...'
			})
		});
	} else {
		const buttonCoordinatesOne = {
			x: () => 1,
			y: () => window.Height - buttonCoordinatesOne.h(),
			w: () => window.Width / 7 * 2,
			h: () => _gdiFont(globFonts.buttonIcon.name, !properties ? panel.fonts.buttons.Size : globFonts.buttonIcon.size).Height + _scale(6)
		};
		const buttonCoordinatesTwo = {
			x: () => buttonCoordinatesOne.x() + buttonCoordinatesOne.w(),
			y: () => window.Height - buttonCoordinatesOne.h(),
			w: () => window.Width / 7 * 2,
			h: () => buttonCoordinatesOne.h()
		};
		const buttonCoordinatesThree = {
			x: () => buttonCoordinatesTwo.x() + buttonCoordinatesTwo.w(),
			y: () => window.Height - buttonCoordinatesOne.h(),
			w: () => window.Width / 7 * 2 - 1,
			h: () => buttonCoordinatesOne.h()
		};

		addButton({
			// Sort button: the name, icon and tooltip changes according to the list sort state. The 3 texts are sent as functions, so they are always refreshed when executed.
			// Since the opposite sort state (Az -> Za) is expected to be on even indexes, we use that to toggle icon and tooltip for any method.
			sortButton: new ThemedPanelButton({
				x: calcNextButtonCoordinates(buttonCoordinatesOne).x,
				y: calcNextButtonCoordinates(buttonCoordinatesOne, false).y,
				w: buttonCoordinatesOne.w,
				h: buttonCoordinatesOne.h,
				text: () => list.getSortState(),
				func: function () {
					const test = new FbProfiler(window.Name + _ps(window.ScriptInfo.Name) + ': ' + 'Sorting - ' + list.getMethodState() + ' - ' + list.getSortState());
					let newSortState = list.getOppositeSortState(list.getSortState()); // This always returns a valid state
					list.setSortState(newSortState);
					list.sort(void (0), true); // Uses current state
					test.Print();
				},
				description: sortTooltip,
				icon: sortIcon
			}),
			// Cycle filtering between playlist types: all, AutoPlaylist, (standard) playlist
			filterOneButton: new ThemedPanelButton({
				x: calcNextButtonCoordinates(buttonCoordinatesTwo).x,
				y: calcNextButtonCoordinates(buttonCoordinatesTwo, false).y,
				w: buttonCoordinatesTwo.w,
				h: buttonCoordinatesTwo.h,
				text: filterName,
				func: function () { doFilter(this); },
				description: filterTooltip,
				icon: filterIcon
			}),
			// Cycle filtering between playlist lock states: all, not locked, locked
			filterTwoButton: new ThemedPanelButton({
				x: calcNextButtonCoordinates(buttonCoordinatesThree).x,
				y: calcNextButtonCoordinates(buttonCoordinatesThree, false).y,
				w: buttonCoordinatesThree.w,
				h: buttonCoordinatesThree.h,
				text: filterName,
				func: function () { doFilter(this); },
				description: filterTooltip,
				icon: filterIcon
			}),
		});

		// Defaults
		this.buttons.sortButton.coord = buttonCoordinatesOne;
		this.buttons.filterOneButton.method = 'Playlist type';
		this.buttons.filterOneButton.coord = buttonCoordinatesTwo;
		this.buttons.filterTwoButton.method = 'Lock state';
		this.buttons.filterTwoButton.coord = buttonCoordinatesThree;
		this.recalcWidth(true);
	}
}

/*
	Helpers
*/
function filterName() {
	switch (this.method) {
		case 'Category': {
			const states = list.categories();
			const options = ['All', ...states];
			const idx = list.categoryState.length === 1 ? options.indexOf(list.categoryState[0]) : -1;
			const name = idx !== -1
				? options[idx]
				: !list.bInit || isArrayEqual(list.categoryState, states)
					? options[0]
					: 'Multiple...';
			const lines = _gr.EstimateLineWrap(name, this.gFont, this.w() - 50);
			return lines[0] !== name ? lines[0] + '...' : name;
		}
		case 'Extension': {
			return list.extStates[0];
		}
		case 'Lock state': {
			return list.lockStates[0].replace('locked', 'lock').replace('Not', 'No');
		}
		case 'MBID': {
			return list.mbidStates[0].replace('With', '');
		}
		case 'Playlist type': {
			switch (list.autoPlaylistStates[0]) {
				case list.constAutoPlaylistStates()[0]: { return list.autoPlaylistStates[0]; }
				case list.constAutoPlaylistStates()[1]: { return 'Ap'; }
				case list.constAutoPlaylistStates()[2]: { return list.bLiteMode ? 'UI' : 'Pls'; }
				case list.constAutoPlaylistStates()[3]: { return 'UI'; }
			}
			break;
		}
		case 'Tag': {
			const states = list.tags();
			const options = ['All', ...states];
			const idx = list.tagState.length === 1 ? options.indexOf(list.tagState[0]) : -1;
			const name = idx !== -1
				? options[idx]
				: !list.bInit || isArrayEqual(list.tagState, states)
					? options[0]
					: 'Multiple...';
			const lines = _gr.EstimateLineWrap(name, this.gFont, this.w() - 50);
			return lines[0] !== name ? lines[0] + '...' : name;
		}
	}
}
function doFilter(parent) {
	switch (parent.method) {
		case 'Category': {
			cycleCategories();
			break;
		}
		case 'Extension': {
			const initial = list.extStates[0];
			const defaultState = list.constExtStates()[0];
			list.extStates.rotate(1);
			// Filter non present extensions
			if (list.extStates[0] !== defaultState) {
				while (!list.dataAll.some((pls) => { return pls.extension === list.extStates[0] || list.extStates[0] === defaultState; })) {
					list.extStates.rotate(1);
				}
			}
			// Only update UI when there is a change
			if (list.extStates[0] !== initial) {
				list.update({ bReuseData: true, bNotPaint: true });
				list.filter(); // Current filter states
			}
			break;
		}
		case 'Lock state': {
			list.lockStates.rotate(1);
			list.update({ bReuseData: true, bNotPaint: true });
			list.filter(); // Current filter states
			break;
		}
		case 'MBID': {
			list.mbidStates.rotate(1);
			list.update({ bReuseData: true, bNotPaint: true });
			list.filter(); // Current filter states
			break;
		}
		case 'Playlist type': {
			list.autoPlaylistStates.rotate(1);
			list.update({ bReuseData: true, bNotPaint: true });
			list.filter(); // Current filter states
			break;
		}
		case 'Tag': {
			cycleTags();
			break;
		}
	}
}

function filterTooltip() {
	let ttText = '';
	switch (this.method) {
		case 'Category': {
			const options = list.categories();
			const defOpt = options[0];
			const iInherit = (list.categoryState.length === 1 && list.categoryState[0] !== defOpt ? options.indexOf(list.categoryState[0]) : -1);
			ttText = 'Cycle through the different categories:\n' + options.map((item, i) => item + (list.categoryState.includes(item) ? '  <--' + (i === iInherit ? '\t-inherit-' : '') : '')).join('\n');
			break;
		}
		case 'Extension': {
			ttText = 'Cycle through the different filters:\n' + list.constExtStates().map((item) => {
				// Add a cross to those extensions not being used
				return item + (list.extStates[0] === item ? '\t<--' : (list.dataAll.some((pls) => { return pls.extension === item; }) || item === list.constExtStates()[0] ? '' : '\t[x]'));
			}).join('\n');
			break;
		}
		case 'Lock state': {
			ttText = 'Cycle through the different filters:\n' + list.constLockStates().map((item) => { return item + (list.lockStates[0] === item ? '  <--' : ''); }).join('\n');
			break;
		}
		case 'MBID': {
			ttText = 'Cycle through the different filters:\n' + list.constMbidStates().map((item) => { return item + (list.mbidStates[0] === item ? '  <--' : ''); }).join('\n');
			break;
		}
		case 'Playlist type': {
			ttText = 'Cycle through the different filters:\n' + list.constAutoPlaylistStates().map((item) => { return item + (list.autoPlaylistStates[0] === item ? '  <--' : ''); }).join('\n');
			break;
		}
		case 'Tag': {
			const options = list.tags();
			const defOpt = options[0];
			const bInherit = !list.tagState.includes(defOpt);
			ttText = 'Cycle through the different tags:\n' + list.tags().map((item, i) => item + (list.tagState.includes(item) ? '  <--' + (bInherit && i !== 0 ? '\t-inherit-' : '') : '')).join('\n');
			break;
		}
	}
	if (list.tooltipSettings.bShowTips) {
		ttText += '\n-----------------------------------------';
		ttText += '\n(L. Click to cycle current filter)';
		ttText += '\n(R. Click to configure filters)';
	}
	return ttText;
}

function sortTooltip() {
	let ttText = '';
	ttText = !list.getIndexSortState() ? 'Natural sort' : 'Inverted sort';
	if (list.tooltipSettings.bShowTips) {
		ttText += '\n-----------------------------------------';
		ttText += '\n(L. Click to invert sorting)';
		ttText += '\n(R. Click to configure sorting)';
	}
	return ttText;
}

function sortIcon() {
	const bDir = !list.getIndexSortState(); // Natural or inverted order
	const varType = (list.methodState.match(/tag|name|category/gi) ? 'str' : (list.methodState.match(/date|size|duration/gi) ? 'num' : 'other'));
	switch (varType) {
		case 'str': {
			return bDir ? '\uf15d' : '\uf15e';
		}
		case 'num': {
			return bDir ? '\uf162' : '\uf163';
		}
		default: {
			return bDir ? '\uf160' : '\uf161';
		}
	}
}

function filterIcon() {
	const processChar = (c) => { return String.fromCharCode(parseInt(c, 16)); };
	const icons = list.playlistIcons;
	switch (this.method) {
		case 'Category': {
			const curr = list.categoryState;
			const states = list.categories();
			if (!isArrayEqual(curr, states)) { return chars.bookmark; }
			else { return chars.filter; }
		}
		case 'Extension': {
			const curr = list.extStates[0];
			const states = list.constExtStates();
			if (curr !== states[0] && Object.hasOwn(icons, curr) && icons[curr].icon) { return processChar(icons[curr].icon); }
			else { return chars.filter; }
		}
		case 'Lock state': {
			const curr = list.lockStates[0];
			const states = list.constLockStates();
			if (curr === states[1]) { return chars.unlock; }
			else if (curr === states[2]) { return chars.lock; }
			else { return chars.filter; }
		}
		case 'MBID': {
			const curr = list.mbidStates[0];
			const states = list.constMbidStates();
			if (curr === states[1]) { return chars.unlock; }
			else if (curr === states[2]) { return chars.lock; }
			else { return chars.filter; }
		}
		case 'Playlist type': {
			const curr = list.autoPlaylistStates[0];
			const states = list.constAutoPlaylistStates();
			if (curr === states[1] && Object.hasOwn(icons, 'autoPlaylist') && icons['autoPlaylist'].icon) { return processChar(icons['autoPlaylist'].icon); }
			else if (curr === states[2] && Object.hasOwn(icons, '.m3u') && icons['.m3u8'].icon) { return processChar(icons['.m3u'].icon); }
			else if (curr === states[3] && Object.hasOwn(icons, '.ui') && icons['.ui'].icon) { return processChar(icons['.ui'].icon); }
			else { return chars.filter; }
		}
		case 'Tag': {
			const curr = list.tagState;
			const states = list.tags();
			if (!isArrayEqual(curr, states)) { return curr.length === 1 ? chars.tag : chars.tags; }
			else { return chars.filter; }
		}
		default: {
			return chars.filter;
		}
	}
}