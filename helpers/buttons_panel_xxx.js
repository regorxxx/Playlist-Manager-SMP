'use strict';
//04/02/22

include('helpers_xxx_prototypes.js');
include('helpers_xxx_UI.js');
include('helpers_xxx_flags.js');

/* 
	This is the framework to create buttons as new objects with its own properties and tooltips. They can be merged and loaded multiple times
	as new buttons instances on the same toolbar. Coordinates get updated when loading multiple buttons, removing the need to manually set them.
	Check '_buttons_panel_blank.js' to see the universal buttons structure. It loads on foobar but does nothing, it's just empty. Callbacks are missing too.
	
	NOTE REGARDING CHANGES TO buttons_xxx.js and USE:
		- Callbacks: The standard file is meant to be used along a standalone panel/bar with only buttons. Contains the callbacks to draw all the buttons.
		Here all callbacks funcs have been renamed to '..._buttn', so you must call those on the callbacks of the main panel file:
			function on_mouse_move(x, y){
				on_mouse_move_buttn(x, y);
				...
			}
			...
		- Tooltip: If there is no other tooltip, it works as is. But if you have tooltips linked to other elements, then you must also check
		the mouse is not over a button at on_mouse_move(x,y). This way tooltip is not created/deactivated when mouse is outside a button:
			function on_mouse_move(x, y){
				on_mouse_move_buttn(x, y);
				if (curBtn === null) {
					...
				}
			}
*/

const buttonsPanel = {};
// General config
buttonsPanel.config = {
	bShowID: false, // Show Prefixes + ID on tooltips
	toolbarTooltip: '', // Shown on toolbar
	toolbarColor: RGB(211,218,237), // Toolbar color
	bToolbar: false, // Change this on buttons bars files to set the background color
	textColor: RGB(0,0,0),
	buttonOrientation: 'x',
	partAndStateID: 1 // 1 standard button, 6 no bg/border button (+hover)
};
// Button objs
buttonsPanel.propertiesPrefixes = new Set(); // Global properties names prefixes
var buttons = {}; // Global list

const oldButtonCoordinates = {x: 0, y: 0, w: 0, h: 0}; // To store coordinates of previous buttons when drawing
const tooltipButton = new _tt(null, 'Segoe UI', _scale(10), 1200);  // Global tooltip


let g_down = false;
let curBtn = null;

function calcNextButtonCoordinates(buttonCoordinates,  buttonOrientation = buttonsPanel.config.buttonOrientation , recalc = true) {
	let newCoordinates;
	// This requires a panel reload after resizing
	// if (buttonOrientation === 'x') {
		// newCoordinates = {x: oldButtonCoordinates.x + buttonCoordinates.x , y: buttonCoordinates.y, w: buttonCoordinates.w, h: buttonCoordinates.h};
		// if (recalc) {oldButtonCoordinates.x += buttonCoordinates.x + buttonCoordinates.w;}
	// } else if (buttonOrientation === 'y') {
		// newCoordinates = {x: buttonCoordinates.x, y: oldButtonCoordinates.y + buttonCoordinates.y, w: buttonCoordinates.w, h: buttonCoordinates.h};
		// if (recalc) {oldButtonCoordinates.y += buttonCoordinates.y  + buttonCoordinates.h;}
	// }
	// This requires on_size_buttn() within on_size callback. Is equivalent to calculate the coordinates directly with inlined functions... but maintained here for compatibility purporse
	const x = _isFunction(buttonCoordinates.x) ? buttonCoordinates.x() : buttonCoordinates.x;
	const y = _isFunction(buttonCoordinates.y) ? buttonCoordinates.y() : buttonCoordinates.y;
	const w = _isFunction(buttonCoordinates.w) ? buttonCoordinates.w() : buttonCoordinates.w;
	const h = _isFunction(buttonCoordinates.h) ? buttonCoordinates.h() : buttonCoordinates.h;
	newCoordinates = {x: oldButtonCoordinates.x + x , y: oldButtonCoordinates.y + y, w, h};
	if (buttonOrientation.toLowerCase() === 'x') {
		if (recalc) {oldButtonCoordinates.x += x + w; oldButtonCoordinates.h = Math.max(oldButtonCoordinates.h, h);}
	} else if (buttonOrientation.toLowerCase() === 'y') {
		if (recalc) {oldButtonCoordinates.y += y + h; oldButtonCoordinates.w = Math.max(oldButtonCoordinates.w, w);}
	}
	return newCoordinates;
}

function SimpleButton(x, y, w, h, text, fonClick, state, g_font = _gdiFont('Segoe UI', 12), description, prefix = '', buttonsProperties = {}, icon = null, g_font_icon = _gdiFont('FontAwesome', 12)) {
	this.state = state ? state : buttonStates.normal;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.originalWindowWidth = window.Width;
	this.g_theme = window.CreateThemeManager('Button');
	this.g_font = g_font;
	this.g_font_icon = g_font_icon;
	this.description = description;
	this.text = text;
	this.textWidth  = _isFunction(this.text) ? () => {return _gr.CalcTextWidth(this.text(), g_font);} : _gr.CalcTextWidth(this.text, g_font);
	this.icon = this.g_font_icon.Name !== 'Microsoft Sans Serif' ? icon : null; // if using the default font, then it has probably failed to load the right one, skip icon
	this.iconWidth = _isFunction(this.icon) ? () => {return _gr.CalcTextWidth(this.icon(), g_font_icon);} : _gr.CalcTextWidth(this.icon, g_font_icon);
	this.fonClick = fonClick;
	this.prefix = prefix; // This let us identify properties later for different instances of the same button, like an unique ID
	this.descriptionWithID = _isFunction(this.description) ? () => {return this.prefix ? this.prefix.replace('_','') + ': ' + this.description() : this.description();}: (this.prefix ? this.prefix.replace('_','') + ': ' + this.description : this.description); // Adds prefix to description, whether it's a func or a string
	this.buttonsProperties = Object.assign({}, buttonsProperties); // Clone properties for later use

	this.containXY = function (x, y) {
		const x_calc = _isFunction(this.x) ? this.x() : this.x;
		const y_calc = _isFunction(this.y) ? this.y() : this.y;
		const w_calc = _isFunction(this.w) ? this.w() : this.w;
		const h_calc = _isFunction(this.h) ? this.h() : this.h;
		return (x_calc <= x) && (x <= x_calc + w_calc) && (y_calc <= y) && (y <= y_calc + h_calc );
	};

	this.changeState = function (state) {
		let old = this.state;
		this.state = state;
		return old;
	};

	this.draw = function (gr) {
		const w_calc = _isFunction(this.w) ? this.w() : this.w;
		const h_calc = _isFunction(this.h) ? this.h() : this.h;
		if (w_calc <= 0 || h_calc <= 0) {return;}
		if (this.state === buttonStates.hide) {
			return;
		}

		switch (this.state) {
			case buttonStates.normal:
				this.g_theme.SetPartAndStateID(buttonsPanel.config.partAndStateID, 1);
				break;

			case buttonStates.hover:
				tooltipButton.SetValue( (buttonsPanel.config.bShowID ? (_isFunction(this.description) ? this.descriptionWithID() : this.descriptionWithID) : (_isFunction(this.description) ? this.description() : this.description) ) , true); // ID or just description, according to string or func.
				this.g_theme.SetPartAndStateID(buttonsPanel.config.partAndStateID, 2);
				break;

			case buttonStates.down:
				this.g_theme.SetPartAndStateID(buttonsPanel.config.partAndStateID, 3);
				break;

			case buttonStates.hide:
				return;
		}
		
		const x_calc = _isFunction(this.x) ? this.x() : this.x;
		const y_calc = _isFunction(this.y) ? this.y() : this.y;
		
		this.g_theme.DrawThemeBackground(gr, x_calc, y_calc, w_calc, h_calc);
		const offset = 10;
		if (this.icon !== null) {
			let iconWidthCalculated = _isFunction(this.icon) ? this.iconWidth() : this.iconWidth;
			let textWidthCalculated = w_calc - iconWidthCalculated - offset;
			let iconCalculated = _isFunction(this.icon) ? this.icon() : this.icon;
			let textCalculated = _isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(iconCalculated, this.g_font_icon, buttonsPanel.config.textColor, x_calc + offset, y_calc, w_calc - iconWidthCalculated - offset, h_calc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Icon
			if (w_calc > iconWidthCalculated * 4 + offset * 4) {
				gr.GdiDrawText(textCalculated, this.g_font, buttonsPanel.config.textColor, x_calc + iconWidthCalculated, y_calc, w_calc - offset, h_calc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			} else {
				gr.GdiDrawText(textCalculated, this.g_font, buttonsPanel.config.textColor, x_calc + offset * 2 + iconWidthCalculated , y_calc, w_calc - offset * 3 - iconWidthCalculated, h_calc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			}
		} else {
			let textCalculated = _isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(textCalculated, this.g_font, buttonsPanel.config.textColor, x_calc, y_calc, w_calc, h_calc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
		}
	};

	this.onClick = function () {
		this.fonClick && this.fonClick();
	};
}

function drawAllButtons(gr) {
	for (let key in buttons) {
		if (Object.prototype.hasOwnProperty.call(buttons, key)) {
			buttons[key].draw(gr);
		}
	}
}

function chooseButton(x, y) {
	for (let key in buttons) {
		if (Object.prototype.hasOwnProperty.call(buttons, key)) {
			if (buttons[key].containXY(x, y) && buttons[key].state !== buttonStates.hide) {
				return buttons[key];
			}
		}
	}
	return null;
}

function on_paint_buttn(gr) {
	if (buttonsPanel.config.bToolbar){ // When not merged with panels
		if (oldButtonCoordinates.x < window.Width) {gr.FillSolidRect(0, 0, window.Width, window.Height, buttonsPanel.config.toolbarColor);} // Toolbar color fix
		else {gr.FillSolidRect(0, 0, window.Width, window.Height, utils.GetSysColour(15));} // Default
	}
	drawAllButtons(gr);
}

function on_mouse_move_buttn(x, y) {
	let old = curBtn;
	curBtn = chooseButton(x, y);

	if (old === curBtn) {
		if (g_down) {
			return;
		}
	} else if (g_down && curBtn && curBtn.state !== buttonStates.down) {
		curBtn.changeState(buttonStates.down);
		window.Repaint();
		return;
	} 
	
	//Tooltip fix
	if (old !== null) {
		if (curBtn === null) {tooltipButton.Deactivate();} // Needed because tooltip is only activated/deactivated on redrawing... 
															// otherwise it shows on empty spaces after leaving a button.
		else if (old !== curBtn && old.description === curBtn.description) { 	// This forces redraw even if buttons have the same text!
			tooltipButton.Deactivate();											// Updates position but tooltip becomes slower since it sets delay time to initial... 
			tooltipButton.SetDelayTime(3, 0); //TTDT_INITIAL
		} else {tooltipButton.SetDelayTime(3, tooltipButton.oldDelay);} 
	}
	old && old.changeState(buttonStates.normal);
	curBtn && curBtn.changeState(buttonStates.hover);
	window.Repaint();
}

function on_mouse_leave_buttn() {
	g_down = false;

	if (curBtn) {
		curBtn.changeState(buttonStates.normal);
		window.Repaint();
	}
}

function on_mouse_lbtn_down_buttn(x, y) {
	g_down = true;

	if (curBtn) {
		curBtn.changeState(buttonStates.down);
		window.Repaint();
	}
}

function on_mouse_lbtn_up_buttn(x, y) {
	g_down = false;

	if (curBtn) {
		curBtn.onClick();
		if (curBtn) { // Solves error if you create a new Whsell Popup (curBtn becomes null) after pressing the button and firing curBtn.onClick()
			curBtn.changeState(buttonStates.hover);
			window.Repaint();
		}
	}
}

function on_size_buttn() {
	if (buttonsPanel.config.buttonOrientation.toLowerCase() === 'x') {oldButtonCoordinates.x = 0;}
	else if (buttonsPanel.config.buttonOrientation.toLowerCase() === 'y') {oldButtonCoordinates.y = 0;}
}


function getUniquePrefix(string, sep = '_'){
	if (string === null || !string.length) {return '';}
	let newPrefix = string.replace(sep,'') + 0;  // First ID
	let i = 1;
	while (buttonsPanel.propertiesPrefixes.has(newPrefix)) { // The rest
		newPrefix = string.replace(sep,'') + i;
		i++;
	}
	buttonsPanel.propertiesPrefixes.add(newPrefix);
	newPrefix = newPrefix + sep;
	return newPrefix;
}