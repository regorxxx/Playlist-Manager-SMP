'use strict';
//22/06/22

//Always loaded along other buttons and panel
include('buttons_panel_xxx.js');
var buttonCoordinatesOne = {x: 1, y: () => {return window.Height - 22;}, w: () => {return window.Width / 7 * 2;}, h: 22};
var buttonCoordinatesTwo = {x: () => {return buttonCoordinatesOne.x + buttonCoordinatesOne.w();}, y: () => {return window.Height - 22;}, w: () => {return window.Width / 7 * 2;}, h: 22};
var buttonCoordinatesThree = {x: () => {return buttonCoordinatesTwo.x() + buttonCoordinatesTwo.w();}, y: () => {return window.Height - 22;}, w: () => {return window.Width / 7 * 3 - 1;}, h: 22};
buttonsPanel.config.orientation = 'x';

addButton({
	// Sort button: the name, icon and tooltip changes according to the list sort state. The 3 texts are sent as functions, so they are always refreshed when executed. 
	// Since the opposite sort state (Az -> Za) is expected to be on even indexes, we use that to toggle icon and tooltip for any method.
	sortButton: new themedButton(calcNextButtonCoordinates(buttonCoordinatesOne).x, calcNextButtonCoordinates(buttonCoordinatesOne, void(0), false).y, buttonCoordinatesOne.w, buttonCoordinatesOne.h, () => {return list.getSortState();}, function () {
		// let t0 = Date.now();
		// let t1 = 0;
		let newSortState = list.getOppositeSortState(list.getSortState()); // This always returns a valid state
		list.setSortState(newSortState);
		list.sort(void(0), true); // Uses current state
		// t1 = Date.now();
		// console.log('Call to Sort took ' + (t1 - t0) + ' milliseconds.');
	}, null, void(0), sortTooltip, 'plm_', void(0), sortIcon),
	// Cycle filtering between playlist types: all, autoplaylist, (standard) playlist
	filterOneButton: new themedButton(calcNextButtonCoordinates(buttonCoordinatesTwo).x, calcNextButtonCoordinates(buttonCoordinatesTwo, void(0), false).y, buttonCoordinatesTwo.w, buttonCoordinatesTwo.h, filterName, function () {
		doFilter(this);
	}, null, void(0), filterTooltip, 'plm_', void(0), chars.filter),
	// Cycle filtering between playlist lock states: all, not locked, locked
	filterTwoButton: new themedButton(calcNextButtonCoordinates(buttonCoordinatesThree).x, calcNextButtonCoordinates(buttonCoordinatesThree, void(0), false).y, buttonCoordinatesThree.w, buttonCoordinatesThree.h, filterName, function () {
		doFilter(this);
	}, null, void(0), filterTooltip, 'plm_', void(0), chars.filter),
});

// Defaults
buttonsPanel.buttons.filterOneButton.method = 'Playlist type';
buttonsPanel.buttons.filterOneButton.coord = buttonCoordinatesTwo;
buttonsPanel.buttons.filterTwoButton.method = 'Lock state';
buttonsPanel.buttons.filterTwoButton.coord = buttonCoordinatesThree;
recalcWidth();

/* 
	Helpers 
*/
// Recalc size
function recalcWidth () {
	let bResize = false;
	for (const key in buttonsPanel.buttons) {
		if (buttonsPanel.buttons.hasOwnProperty(key) && buttonsPanel.buttons[key].hasOwnProperty('method') && buttonsPanel.buttons[key].method === 'Lock state') {bResize = true;}
	}
	for (const key in buttonsPanel.buttons) {
		if (buttonsPanel.buttons.hasOwnProperty(key)) {
			const button = buttonsPanel.buttons[key];
			if (button.hasOwnProperty('method')) {
				if (button.method === 'Lock state') {
					button.coord.w = button.w = () => {return window.Width / 7 * 3;};
				} else if (!bResize) {
					button.coord.w = button.w = () => {return window.Width / 7 * 2.5;};
				} else {
					button.coord.w = button.w = () => {return window.Width / 7 * 2;};
				}
			}
		}
	}
}

// Helpers
function filterName() {
	switch (this.method) {
		case 'Lock state': {
			return list.lockStates[0];
		}
		case 'Extension': {
			return list.extStates[0];
		}
		case 'Playlist type': {
			switch (list.autoPlaylistStates[0]) {
				case list.constAutoPlaylistStates()[0]: {return list.autoPlaylistStates[0];}
				case list.constAutoPlaylistStates()[1]: {return 'Ap';}
				case list.constAutoPlaylistStates()[2]: {return 'Pls';}
				case list.constAutoPlaylistStates()[3]: {return 'UI';}
			}
			break;
		}
		case 'Tag': {
			const options = ['All', ...list.tags()];
			const idx = list.tagState.length === 1 ? options.indexOf(list.tagState[0]) : -1;
			const name = idx !== -1 ? options[idx] : options[0];
			const lines = _gr.EstimateLineWrap(name, this.gFont, this.w() - 50);
			return lines[0] !== name ? lines[0] + '...': name;
		}
		case 'Category': {
			const options = ['All', ...list.categories()];
			const idx = list.categoryState.length === 1 ? options.indexOf(list.categoryState[0]) : -1;
			const name = idx !== -1 ? options[idx] : options[0];
			const lines = _gr.EstimateLineWrap(name, this.gFont, this.w() - 50);
			return lines[0] !== name ? lines[0] + '...': name;
		}
	}
}
function doFilter(parent) {
	switch (parent.method) {
		case 'Playlist type': {
			list.autoPlaylistStates.rotate(1);
			list.update(true, true);
			list.filter(); // Current filter states
			break;
		}
		case 'Lock state': {
			list.lockStates.rotate(1);
			list.update(true, true);
			list.filter(); // Current filter states
			break;
		}
		case 'Extension': {
			const initial = list.extStates[0];
			const defaultState = list.constExtStates()[0];
			list.extStates.rotate(1);
			// Filter non present extensions
			if (list.extStates[0] !== defaultState) { 
				while (!list.dataAll.some((pls) => {return pls.extension === list.extStates[0] || list.extStates[0] === defaultState;})) {
					list.extStates.rotate(1);
				}
			}
			// Only update UI when there is a change
			if (list.extStates[0] !== initial) {
				list.update(true, true);
				list.filter(); // Current filter states
			}
			break;
		}
		case 'Tag': {
			cycleTags();
			break;
		}
		case 'Category': {
			cycleCategories();
			break;
		}
	}
}
function filterTooltip() {
	let ttText = '';
	switch (this.method) {
		case 'Lock state': {
			ttText = 'Cycle through the different filters:\n' + list.constLockStates().map((item) => {return item + (list.lockStates[0] === item ? '  <--' : '');}).join('\n');
			break;
		}
		case 'Extension': {
			ttText = 'Cycle through the different filters:\n' + list.constExtStates().map((item) => {
				// Add a cross to those extensions not being used
				return item + (list.extStates[0] === item ? '\t<--' : (list.dataAll.some((pls) => {return pls.extension === item;}) || item === list.constExtStates()[0] ? '' : '\t[x]'));
			}).join('\n');
			break;
		}
		case 'Playlist type': {
			ttText = 'Cycle through the different filters:\n' + list.constAutoPlaylistStates().map((item) => {return item + (list.autoPlaylistStates[0] === item ? '  <--' : '');}).join('\n');
			break;
		}
		case 'Tag': {
			const options = list.categories();
			const defOpt = options[0];
			const bInherit = list.tagState.indexOf(defOpt) === -1;
			ttText = 'Cycle through the different tags:\n' + list.tags().map((item, i) => {return item + (list.tagState.indexOf(item) !== -1? '  <--' + (bInherit && i !== 0 ? '\t-inherit-' : '') : '');}).join('\n');
			break;
		}
		case 'Category': {
			const options = list.categories();
			const defOpt = options[0];
			const iInherit = (list.categoryState.length === 1 && list.categoryState[0] !== defOpt ? options.indexOf(list.categoryState[0]) : -1);
			ttText = 'Cycle through the different categories:\n' + options.map((item, i) => {return item + (list.categoryState.indexOf(item) !== -1 ? '  <--' + (i === iInherit ? '\t-inherit-' : '') : '');}).join('\n');
			break;
		}
	}
	if (list.bShowTips) {
		ttText += '\n-----------------------------------------';
		ttText += '\n(L. Click to cycle current filter)';
		ttText += '\n(R. Click to configure filters)';
	}
	return ttText;
}
function sortTooltip() {
	let ttText = '';
	ttText = !list.getIndexSortState() ? 'Natural sort' : 'Inverted sort';
	if (list.bShowTips) {
		ttText += '\n-----------------------------------------';
		ttText += '\n(L. Click to invert sorting)';
		ttText += '\n(R. Click to configure sorting)';
	}
	return ttText;
}
function sortIcon() {
	const bDir = !list.getIndexSortState(); // Natural or inverted order
	const varType = (list.methodState.match(/tag|name|category/gi) ? 'str' : (list.methodState.match(/date|size/gi) ? 'num' : 'other'));
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