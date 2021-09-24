'use strict';

include('helpers_xxx_prototypes.js');
include('helpers_xxx_UI.js');

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
				if (cur_btn === null) {
					...
				}
			}
*/

const ButtonStates = {
	normal: 0,
	hover: 1,
	down: 2,
	hide: 3
};

var buttons = {}; // Global list
var propertiesPrefixes = new Set(); // Global properties names prefixes
const oldButtonCoordinates = {x: 0, y: 0, w: 0, h: 0}; // To store coordinates of previous buttons when drawing
const tooltipButton = new _tt(null, 'Segoe UI', _scale(10), 1200);  // Global tooltip
const bShowID = false; // Show Prefixes + ID on tooltips

// Toolbar color fix
var bToolbar = false; // Change this on buttons bars files to set the background color
var toolbarColor = RGB(211,218,237);
var textColor = RGB(0,0,0);

let g_down = false;
let cur_btn = null;

function calcNextButtonCoordinates(buttonCoordinates,  buttonOrientation = 'x' , recalc = true) {
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
	const isFunc = (_isFunction(buttonCoordinates.x) || _isFunction(buttonCoordinates.y) || _isFunction(buttonCoordinates.w) || _isFunction(buttonCoordinates.h));
	if (buttonOrientation === 'x') {
		newCoordinates = {x: (_isFunction(buttonCoordinates.x) ? () => {return oldButtonCoordinates.x + buttonCoordinates.x();} : oldButtonCoordinates.x + buttonCoordinates.x) , y: (_isFunction(buttonCoordinates.y) ? () => {return buttonCoordinates.y();} : buttonCoordinates.y), w: (_isFunction(buttonCoordinates.w) ? () => {return buttonCoordinates.w();} : buttonCoordinates.w), h: (_isFunction(buttonCoordinates.h) ? () => {return buttonCoordinates.h();} : buttonCoordinates.h)};
		if (recalc) {oldButtonCoordinates.x += (_isFunction(buttonCoordinates.x) ? buttonCoordinates.x() : buttonCoordinates.x) + (_isFunction(buttonCoordinates.w) ? buttonCoordinates.w() : buttonCoordinates.w);}
	} else if (buttonOrientation === 'y') {
		newCoordinates = {x: (_isFunction(buttonCoordinates.x) ? () => {return buttonCoordinates.x();} : buttonCoordinates.x), y: (_isFunction(buttonCoordinates.y) ? () => {return oldButtonCoordinates.y + buttonCoordinates.y();} : oldButtonCoordinates.y + buttonCoordinates.y), w: (_isFunction(buttonCoordinates.w) ? () => {return buttonCoordinates.w();} : buttonCoordinates.w), h: (_isFunction(buttonCoordinates.h) ? () => {return buttonCoordinates.h();} : buttonCoordinates.h)};
		if (recalc) {oldButtonCoordinates.y += (_isFunction(buttonCoordinates.y) ? buttonCoordinates.y() : buttonCoordinates.y)  + (_isFunction(buttonCoordinates.h) ? buttonCoordinates.h() : buttonCoordinates.h);}
	}
	return newCoordinates;
}

function SimpleButton(x, y, w, h, text, fonClick, state, g_font = _gdiFont('Segoe UI', 12), description, prefix = '', buttonsProperties = {}, icon = null, g_font_icon = _gdiFont('FontAwesome', 12)) {
	this.state = state ? state : ButtonStates.normal;
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
		if (this.state === ButtonStates.hide) {
			return;
		}

		switch (this.state) {
			case ButtonStates.normal:
				this.g_theme.SetPartAndStateID(1, 1);
				break;

			case ButtonStates.hover:
				tooltipButton.SetValue( (bShowID ? (_isFunction(this.description) ? this.descriptionWithID() : this.descriptionWithID) : (_isFunction(this.description) ? this.description() : this.description) ) , true); // ID or just description, according to string or func.
				this.g_theme.SetPartAndStateID(1, 2);
				break;

			case ButtonStates.down:
				this.g_theme.SetPartAndStateID(1, 3);
				break;

			case ButtonStates.hide:
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
			gr.GdiDrawText(iconCalculated, this.g_font_icon, textColor, x_calc + offset, y_calc, w_calc - iconWidthCalculated - offset, h_calc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Icon
			if (w_calc > iconWidthCalculated * 4 + offset * 4) {
				gr.GdiDrawText(textCalculated, this.g_font, textColor, x_calc + iconWidthCalculated, y_calc, w_calc - offset, h_calc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			} else {
				gr.GdiDrawText(textCalculated, this.g_font, textColor, x_calc + offset * 2 + iconWidthCalculated , y_calc, w_calc - offset * 3 - iconWidthCalculated, h_calc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			}
		} else {
			let textCalculated = _isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(textCalculated, this.g_font, textColor, x_calc, y_calc, w_calc, h_calc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
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
			if (buttons[key].containXY(x, y) && buttons[key].state !== ButtonStates.hide) {
				return buttons[key];
			}
		}
	}
	return null;
}

function on_paint_buttn(gr) {
	if (bToolbar){ // When not merged with panels
		if (oldButtonCoordinates.x < window.Width) {gr.FillSolidRect(0, 0, window.Width, window.Height, toolbarColor);} // Toolbar color fix
		else {gr.FillSolidRect(0, 0, window.Width, window.Height, utils.GetSysColour(15));} // Default
	}
	drawAllButtons(gr);
}

function on_mouse_move_buttn(x, y) {
	let old = cur_btn;
	cur_btn = chooseButton(x, y);

	if (old === cur_btn) {
		if (g_down) {
			return;
		}
	} else if (g_down && cur_btn && cur_btn.state !== ButtonStates.down) {
		cur_btn.changeState(ButtonStates.down);
		window.Repaint();
		return;
	} 
	
	//Tooltip fix
	if (old !== null) {
		if (cur_btn === null) {tooltipButton.Deactivate();} // Needed because tooltip is only activated/deactivated on redrawing... 
															// otherwise it shows on empty spaces after leaving a button.
		else if (old !== cur_btn && old.description === cur_btn.description) { 	// This forces redraw even if buttons have the same text!
			tooltipButton.Deactivate();											// Updates position but tooltip becomes slower since it sets delay time to initial... 
			tooltipButton.SetDelayTime(3, 0); //TTDT_INITIAL
		} else {tooltipButton.SetDelayTime(3, tooltipButton.oldDelay);} 
	}
	old && old.changeState(ButtonStates.normal);
	cur_btn && cur_btn.changeState(ButtonStates.hover);
	window.Repaint();
}

function on_mouse_leave_buttn() {
	g_down = false;

	if (cur_btn) {
		cur_btn.changeState(ButtonStates.normal);
		window.Repaint();
	}
}

function on_mouse_lbtn_down_buttn(x, y) {
	g_down = true;

	if (cur_btn) {
		cur_btn.changeState(ButtonStates.down);
		window.Repaint();
	}
}

function on_mouse_lbtn_up_buttn(x, y) {
	g_down = false;

	if (cur_btn) {
		cur_btn.onClick();
		if (cur_btn) { // Solves error if you create a new Whsell Popup (cur_btn becomes null) after pressing the button and firing cur_btn.onClick()
			cur_btn.changeState(ButtonStates.hover);
			window.Repaint();
		}
	}
}

function on_size_buttn() {
	if (buttonOrientation === 'x') {oldButtonCoordinates.x = 0;}
	else {oldButtonCoordinates.y = 0;}
}


function getUniquePrefix(string, sep = '_'){
	if (string === null || !string.length) {return '';}
	let newPrefix = string.replace(sep,'') + 0;  // First ID
	let i = 1;
	while (propertiesPrefixes.has(newPrefix)) { // The rest
		newPrefix = string.replace(sep,'') + i;
		i++;
	}
	propertiesPrefixes.add(newPrefix);
	newPrefix = newPrefix + sep;
	return newPrefix;
}