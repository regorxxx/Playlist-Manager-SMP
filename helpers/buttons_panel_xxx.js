'use strict';
//22/03/22

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
	orientation: 'x',
	partAndStateID: 1 // 1 standard button, 6 no bg/border button (+hover)
};
// Button objs
buttonsPanel.propertiesPrefixes = new Set(); // Global properties names prefixes
buttonsPanel.buttons = {}; // Global list
// Others (internal use)
buttonsPanel.oldButtonCoordinates = {x: 0, y: 0, w: 0, h: 0}; // To store coordinates of previous buttons when drawing
buttonsPanel.tooltipButton = new _tt(null, 'Segoe UI', _scale(10), 1200);  // Global tooltip
buttonsPanel.gDown = false;
buttonsPanel.curBtn = null;

function calcNextButtonCoordinates(coord, buttonOrientation = buttonsPanel.config.orientation , recalc = true) {
	let newCoordinates;
	const orientation = buttonOrientation.toLowerCase();
	const old = buttonsPanel.oldButtonCoordinates;
	// This requires a panel reload after resizing
	// if (buttonOrientation === 'x') {
		// newCoordinates = {x: old.x + coord.x , y: coord.y, w: coord.w, h: coord.h};
		// if (recalc) {old.x += coord.x + coord.w;}
	// } else if (buttonOrientation === 'y') {
		// newCoordinates = {x: coord.x, y: old.y + coord.y, w: coord.w, h: coord.h};
		// if (recalc) {old.y += coord.y  + coord.h;}
	// }
	// This requires on_size_buttn() within on_size callback. Is equivalent to calculate the coordinates directly with inlined functions... but maintained here for compatibility purpose
	const keys = ['x','y','w','h'];
	const bFuncCoord = Object.fromEntries(keys.map((c) => {return [c, isFunction(coord[c])];}));
	const iCoord = Object.fromEntries(keys.map((c) => {return [c, bFuncCoord[c] ? coord[c]() : coord[c]];}));
	newCoordinates = Object.fromEntries(keys.map((c) => {return [c, bFuncCoord[c] ? () => {return old[c] + coord[c]();} : old[c] + iCoord[c]];}));
	if (recalc) {
		if (orientation === 'x') {old.x += iCoord.x + iCoord.w; old.h = Math.max(old.h, iCoord.h);}
		else if (orientation === 'y') {old.y += iCoord.y + iCoord.h; old.w = Math.max(old.w, iCoord.w);}
	}
	return newCoordinates;
}

function themedButton(x, y, w, h, text, func, state, gFont = _gdiFont('Segoe UI', 12), description, prefix = '', buttonsProperties = {}, icon = null, gFontIcon = _gdiFont('FontAwesome', 12)) {
	this.state = state ? state : buttonStates.normal;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.originalWindowWidth = window.Width;
	this.g_theme = window.CreateThemeManager('Button');
	this.gFont = gFont;
	this.gFontIcon = gFontIcon;
	this.description = description;
	this.text = text;
	this.textWidth  = isFunction(this.text) ? () => {return _gr.CalcTextWidth(this.text(), gFont);} : _gr.CalcTextWidth(this.text, gFont);
	this.icon = this.gFontIcon.Name !== 'Microsoft Sans Serif' ? icon : null; // if using the default font, then it has probably failed to load the right one, skip icon
	this.iconWidth = isFunction(this.icon) ? () => {return _gr.CalcTextWidth(this.icon(), gFontIcon);} : _gr.CalcTextWidth(this.icon, gFontIcon);
	this.func = func;
	this.prefix = prefix; // This let us identify properties later for different instances of the same button, like an unique ID
	this.descriptionWithID = isFunction(this.description) ? () => {return this.prefix ? this.prefix.replace('_','') + ': ' + this.description() : this.description();}: (this.prefix ? this.prefix.replace('_','') + ': ' + this.description : this.description); // Adds prefix to description, whether it's a func or a string
	this.buttonsProperties = Object.assign({}, buttonsProperties); // Clone properties for later use

	this.containXY = function (x, y) {
		const xCalc = isFunction(this.x) ? this.x() : this.x;
		const yCalc = isFunction(this.y) ? this.y() : this.y;
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		return (xCalc <= x) && (x <= xCalc + wCalc) && (yCalc <= y) && (y <= yCalc + hCalc );
	};

	this.changeState = function (state) {
		let old = this.state;
		this.state = state;
		return old;
	};

	this.draw = function (gr) {
		const wCalc = isFunction(this.w) ? this.w() : this.w;
		const hCalc = isFunction(this.h) ? this.h() : this.h;
		if (wCalc <= 0 || hCalc <= 0) {return;}
		if (this.state === buttonStates.hide) {
			return;
		}

		switch (this.state) {
			case buttonStates.normal:
				this.g_theme.SetPartAndStateID(buttonsPanel.config.partAndStateID, 1);
				break;

			case buttonStates.hover:
				buttonsPanel.tooltipButton.SetValue( (buttonsPanel.config.bShowID ? (isFunction(this.description) ? this.descriptionWithID() : this.descriptionWithID) : (isFunction(this.description) ? this.description() : this.description) ) , true); // ID or just description, according to string or func.
				this.g_theme.SetPartAndStateID(buttonsPanel.config.partAndStateID, 2);
				break;

			case buttonStates.down:
				this.g_theme.SetPartAndStateID(buttonsPanel.config.partAndStateID, 3);
				break;

			case buttonStates.hide:
				return;
		}
		
		const xCalc = isFunction(this.x) ? this.x() : this.x;
		const yCalc = isFunction(this.y) ? this.y() : this.y;
		
		this.g_theme.DrawThemeBackground(gr, xCalc, yCalc, wCalc, hCalc);
		const offset = 10;
		if (this.icon !== null) {
			let iconWidthCalculated = isFunction(this.icon) ? this.iconWidth() : this.iconWidth;
			let textWidthCalculated = wCalc - iconWidthCalculated - offset;
			let iconCalculated = isFunction(this.icon) ? this.icon() : this.icon;
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(iconCalculated, this.gFontIcon, buttonsPanel.config.textColor, xCalc + offset, yCalc, wCalc - iconWidthCalculated - offset, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Icon
			if (wCalc > iconWidthCalculated * 4 + offset * 4) {
				gr.GdiDrawText(textCalculated, this.gFont, buttonsPanel.config.textColor, xCalc + iconWidthCalculated, yCalc, wCalc - offset, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			} else {
				gr.GdiDrawText(textCalculated, this.gFont, buttonsPanel.config.textColor, xCalc + offset * 2 + iconWidthCalculated , yCalc, wCalc - offset * 3 - iconWidthCalculated, hCalc, DT_LEFT | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
			}
		} else {
			let textCalculated = isFunction(this.text) ? this.text() : this.text;
			gr.GdiDrawText(textCalculated, this.gFont, buttonsPanel.config.textColor, xCalc, yCalc, wCalc, hCalc, DT_CENTER | DT_VCENTER | DT_CALCRECT | DT_NOPREFIX); // Text
		}
	};

	this.onClick = function () {
		this.func && this.func();
	};
}

function drawAllButtons(gr) {
	for (let key in buttonsPanel.buttons) {
		if (Object.prototype.hasOwnProperty.call(buttonsPanel.buttons, key)) {
			buttonsPanel.buttons[key].draw(gr);
		}
	}
}

function chooseButton(x, y) {
	for (let key in buttonsPanel.buttons) {
		if (Object.prototype.hasOwnProperty.call(buttonsPanel.buttons, key)) {
			if (buttonsPanel.buttons[key].containXY(x, y) && buttonsPanel.buttons[key].state !== buttonStates.hide) {
				return buttonsPanel.buttons[key];
			}
		}
	}
	return null;
}

function on_paint_buttn(gr) {
	if (buttonsPanel.config.bToolbar){ // When not merged with panels
		if (buttonsPanel.oldButtonCoordinates.x < window.Width) {gr.FillSolidRect(0, 0, window.Width, window.Height, buttonsPanel.config.toolbarColor);} // Toolbar color fix
		else {gr.FillSolidRect(0, 0, window.Width, window.Height, utils.GetSysColour(15));} // Default
	}
	drawAllButtons(gr);
}

function on_mouse_move_buttn(x, y) {
	let old = buttonsPanel.curBtn;
	buttonsPanel.curBtn = chooseButton(x, y);

	if (old === buttonsPanel.curBtn) {
		if (buttonsPanel.gDown) {
			return;
		}
	} else if (buttonsPanel.gDown && buttonsPanel.curBtn && buttonsPanel.curBtn.state !== buttonStates.down) {
		buttonsPanel.curBtn.changeState(buttonStates.down);
		window.Repaint();
		return;
	} 
	
	//Tooltip fix
	if (old !== null) {
		// Needed because tooltip is only activated/deactivated on redrawing... otherwise it shows on empty spaces after leaving a button.
		if (buttonsPanel.curBtn === null) {buttonsPanel.tooltipButton.Deactivate();}
		// This forces redraw even if buttons have the same text! Updates position but tooltip becomes slower since it sets delay time to initial... 
		else if (old !== buttonsPanel.curBtn && old.description === buttonsPanel.curBtn.description) { 	
			buttonsPanel.tooltipButton.Deactivate();
			buttonsPanel.tooltipButton.SetDelayTime(3, 0); //TTDT_INITIAL
		} else {buttonsPanel.tooltipButton.SetDelayTime(3, buttonsPanel.tooltipButton.oldDelay);} 
	}
	old && old.changeState(buttonStates.normal);
	buttonsPanel.curBtn && buttonsPanel.curBtn.changeState(buttonStates.hover);
	window.Repaint();
}

function on_mouse_leave_buttn() {
	buttonsPanel.gDown = false;

	if (buttonsPanel.curBtn) {
		buttonsPanel.curBtn.changeState(buttonStates.normal);
		window.Repaint();
	}
}

function on_mouse_lbtn_down_buttn(x, y) {
	buttonsPanel.gDown = true;

	if (buttonsPanel.curBtn) {
		buttonsPanel.curBtn.changeState(buttonStates.down);
		window.Repaint();
	}
}

function on_mouse_lbtn_up_buttn(x, y) {
	buttonsPanel.gDown = false;

	if (buttonsPanel.curBtn) {
		buttonsPanel.curBtn.onClick();
		// Solves error if you create a new Whsell Popup (buttonsPanel.curBtn becomes null) after pressing the button and firing buttonsPanel.curBtn.onClick()
		if (buttonsPanel.curBtn) {
			buttonsPanel.curBtn.changeState(buttonStates.hover);
			window.Repaint();
		}
	}
}

function on_size_buttn() {
	const orientation = buttonsPanel.config.orientation.toLowerCase();
	if (orientation === 'x') {buttonsPanel.oldButtonCoordinates.x = 0;}
	else if (orientation === 'y') {buttonsPanel.oldButtonCoordinates.y = 0;}
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

function addButton(newButtons) {
	// Check if the button list already has the same button ID
	for (let buttonName in newButtons) {
		if (buttonsPanel.buttons.hasOwnProperty(buttonName)) {
			Object.defineProperty(newButtons, buttonName + Object.keys(buttonsPanel.buttons).length, Object.getOwnPropertyDescriptor(newButtons, buttonName));
			delete newButtons[buttonName];
		}
	}
	buttonsPanel.buttons = {...buttonsPanel.buttons, ...newButtons};
}