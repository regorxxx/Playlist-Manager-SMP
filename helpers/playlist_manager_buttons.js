'use strict';

var prefix = 'EDIT';
 
//Always loaded along other buttons and panel
include('buttons_panel_xxx.js');
var g_font = _gdiFont('Segoe UI', 12);
var buttonCoordinatesOne = {x: 1, y: () => {return window.Height - 22;}, w: () => {return window.Width / 7 * 2;}, h: 22};
var buttonCoordinatesTwo = {x: () => {return buttonCoordinatesOne.x + buttonCoordinatesOne.w();}, y: () => {return window.Height - 22;}, w: () => {return window.Width / 7 * 2;}, h: 22};
var buttonCoordinatesThree = {x: () => {return buttonCoordinatesTwo.x() + buttonCoordinatesTwo.w();}, y: () => {return window.Height - 22;}, w: () => {return window.Width / 7 * 3 - 1;}, h: 22};
var buttonOrientation = 'x';

prefix = getUniquePrefix(prefix, '_'); // Puts new ID before '_'

var newButtonsProperties = { //You can simply add new properties here
};
// newButtonsProperties = {...defaultProperties, ...newButtonsProperties}; // Add default properties at the beginning to be sure they work 
setProperties(newButtonsProperties, prefix); //This sets all the panel properties at once

// we change the default coordinates here to accommodate text for x orientation. Apply this on vertical as global!
// if (buttonOrientation === 'x') {buttonCoordinates.w += 0;}
// if (buttonOrientation === 'y') {buttonCoordinates.h += 0;}

var newButtons = {
	// Sort button: the name, icon and tooltip changes according to the list sort state. The 3 texts are sent as functions, so they are always refreshed when executed. 
	// Since the opposite sort state (Az -> Za) is expected to be on even indexes, we use that to toggle icon and tooltip for any method.
	SortButton: new SimpleButton(calcNextButtonCoordinates(buttonCoordinatesOne, buttonOrientation).x, calcNextButtonCoordinates(buttonCoordinatesOne, buttonOrientation,false).y, buttonCoordinatesOne.w, buttonCoordinatesOne.h, () => {return list.getSortState();}, function () {
		let t0 = Date.now();
		let t1 = 0;
		let newSortState = list.getOppositeSortState(list.getSortState()); // This always returns a valid state
		list.setSortState(newSortState);
		list.sort(void(0), true); // Uses current state
		t1 = Date.now();
		console.log('Call to Sort took ' + (t1 - t0) + ' milliseconds.');
	}, null, g_font, () => {return !list.getIndexSortState() ? 'Natural sort' : 'Inverted sort';} , prefix, newButtonsProperties, () => {return !list.getIndexSortState() ? chars.downLongArrow : chars.upLongArrow;}, _gdiFont('FontAwesome', 12)),
	// Cycle filtering between playlist types: all, autoplaylist, (standard) playlist
	// TODO: '\uf15d' : '\uf15e' for letters. '\uf162' : '\uf163' for numbers. '\uf160' : '\uf161' for attributes.
	TwoButton: new SimpleButton(calcNextButtonCoordinates(buttonCoordinatesTwo, buttonOrientation).x, calcNextButtonCoordinates(buttonCoordinatesTwo, buttonOrientation,false).y, buttonCoordinatesTwo.w, buttonCoordinatesTwo.h, plsFilterName, function () {
		let t0 = Date.now();
		let t1 = 0;
		list.autoPlaylistStates.rotate(1);
		list.update(true, true); // TODO: true,true Change when we split this.data from this.dataPaint
		list.filter(); // Current filter states
		t1 = Date.now();
		console.log('Call to Filter took ' + (t1 - t0) + ' milliseconds.');
	}, null, g_font, () => {return 'Cycle through the different filters.\n' + list.constAutoPlaylistStates()[0] + (list.autoPlaylistStates[0] === list.constAutoPlaylistStates()[0] ?  '  <--\n' : '\n') + list.constAutoPlaylistStates()[1] + (list.autoPlaylistStates[0] === list.constAutoPlaylistStates()[1] ?  '  <--\n' : '\n') + list.constAutoPlaylistStates()[2] + (list.autoPlaylistStates[0] === list.constAutoPlaylistStates()[2] ?  '  <--' : '');} , prefix, newButtonsProperties, chars.filter, _gdiFont('FontAwesome', 12)),
	// Cycle filtering between playlist lock states: all, not locked, locked
	ThreeButton: new SimpleButton(calcNextButtonCoordinates(buttonCoordinatesThree, buttonOrientation).x, calcNextButtonCoordinates(buttonCoordinatesThree, buttonOrientation,false).y, buttonCoordinatesThree.w, buttonCoordinatesThree.h, () => {return list.showStates[0];}, function () {
		let t0 = Date.now();
		let t1 = 0;
		list.showStates.rotate(1);
		list.update(true, true); // TODO: true,true Change when we split this.data from this.dataPaint
		list.filter(); // Current filter states
		t1 = Date.now();
		console.log('Call to Filter took ' + (t1 - t0) + ' milliseconds.');
	}, null, g_font, () => {return 'Cycle through the different filters.\n' + list.constShowStates()[0] + (list.showStates[0] === list.constShowStates()[0] ?  '  <--\n' : '\n') + list.constShowStates()[1] + (list.showStates[0] === list.constShowStates()[1] ?  '  <--\n' : '\n') + list.constShowStates()[2] + (list.showStates[0] === list.constShowStates()[2] ?  '  <--' : '');}, prefix, newButtonsProperties, chars.filter, _gdiFont('FontAwesome', 12)),
};
// Check if the button list already has the same button ID
for (var buttonName in newButtons) {
	if (buttons.hasOwnProperty(buttonName)) {
		// fb.ShowPopupMessage('Duplicated button ID (' + buttonName + ') on ' + window.Name);
		console.log('Duplicated button ID (' + buttonName + ') on ' + window.Name);
		Object.defineProperty(newButtons, buttonName + Object.keys(buttons).length, Object.getOwnPropertyDescriptor(newButtons, buttonName));
		delete newButtons[buttonName];
	}
}
// Adds to current buttons
buttons = {...buttons, ...newButtons};

// Helpers
function plsFilterName() {
	switch (list.autoPlaylistStates[0]) {
		case list.constAutoPlaylistStates()[0]: {return list.autoPlaylistStates[0];}
		case list.constAutoPlaylistStates()[1]: {return 'Ap';}
		case list.constAutoPlaylistStates()[2]: {return 'Pls';}
	}
}