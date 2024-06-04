'use strict';
//28/05/24

/* global list:readable, chars:readable, _gr:readable, addButton:readable, buttonsPanel:readable, ThemedButton:readable, calcNextButtonCoordinates:readable, isArrayEqual:readable, cycleCategories:readable, cycleTags:readable */

//Always loaded along other buttons and panel
include('..\\..\\helpers\\buttons_panel_xxx.js');
const buttonCoordinatesOne = { x: 1, y: () => { return window.Height - 22; }, w: () => { return window.Width / 7 * 2; }, h: 22 };
const buttonCoordinatesTwo = { x: () => { return buttonCoordinatesOne.x + buttonCoordinatesOne.w(); }, y: () => { return window.Height - 22; }, w: () => { return window.Width / 7 * 2; }, h: 22 };
const buttonCoordinatesThree = { x: () => { return buttonCoordinatesTwo.x() + buttonCoordinatesTwo.w(); }, y: () => { return window.Height - 22; }, w: () => { return window.Width / 7 * 3 - 1; }, h: 22 };
buttonsPanel.config.orientation = 'x';

addButton({
	// Sort button: the name, icon and tooltip changes according to the list sort state. The 3 texts are sent as functions, so they are always refreshed when executed.
	// Since the opposite sort state (Az -> Za) is expected to be on even indexes, we use that to toggle icon and tooltip for any method.
	sortButton: new ThemedButton(calcNextButtonCoordinates(buttonCoordinatesOne).x, calcNextButtonCoordinates(buttonCoordinatesOne, void (0), false).y, buttonCoordinatesOne.w, buttonCoordinatesOne.h, () => { return list.getSortState(); }, function () {
		const test = new FbProfiler(window.Name + ': ' + 'Sorting - ' + list.getMethodState() + ' - ' + list.getSortState());
		let newSortState = list.getOppositeSortState(list.getSortState()); // This always returns a valid state
		list.setSortState(newSortState);
		list.sort(void (0), true); // Uses current state
		test.Print();
	}, null, void (0), sortTooltip, 'plm_', void (0), sortIcon),
	// Cycle filtering between playlist types: all, autoplaylist, (standard) playlist
	filterOneButton: new ThemedButton(calcNextButtonCoordinates(buttonCoordinatesTwo).x, calcNextButtonCoordinates(buttonCoordinatesTwo, void (0), false).y, buttonCoordinatesTwo.w, buttonCoordinatesTwo.h, filterName, function () {
		doFilter(this);
	}, null, void (0), filterTooltip, 'plm_', void (0), filterIcon),
	// Cycle filtering between playlist lock states: all, not locked, locked
	filterTwoButton: new ThemedButton(calcNextButtonCoordinates(buttonCoordinatesThree).x, calcNextButtonCoordinates(buttonCoordinatesThree, void (0), false).y, buttonCoordinatesThree.w, buttonCoordinatesThree.h, filterName, function () {
		doFilter(this);
	}, null, void (0), filterTooltip, 'plm_', void (0), filterIcon),
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
function recalcWidth() {
	let bResize = false;
	for (const key in buttonsPanel.buttons) {
		if (Object.hasOwn(buttonsPanel.buttons, key) && Object.hasOwn(buttonsPanel.buttons[key], 'method') && (buttonsPanel.buttons[key].method === 'Lock state' || buttonsPanel.buttons[key].method === 'MBID')) { bResize = true; }
	}
	for (const key in buttonsPanel.buttons) {
		if (Object.hasOwn(buttonsPanel.buttons, key)) {
			const button = buttonsPanel.buttons[key];
			if (Object.hasOwn(button, 'method')) {
				if (button.method === 'Lock state' || button.method === 'MBID') {
					button.coord.w = button.w = () => { return window.Width / 7 * 3; };
				} else if (!bResize) {
					button.coord.w = button.w = () => { return window.Width / 7 * 2.5; };
				} else {
					button.coord.w = button.w = () => { return window.Width / 7 * 2; };
				}
			}
		}
	}
}

// Helpers
function filterName() {
	switch (this.method) {
		case 'Category': {
			const states = list.categories();
			const options = ['All', ...states];
			const idx = list.categoryState.length === 1 ? options.indexOf(list.categoryState[0]) : -1;
			const name = idx !== -1 ? options[idx] : isArrayEqual(list.categoryState, states) ? options[0] : 'Multiple...';
			const lines = _gr.EstimateLineWrap(name, this.gFont, this.w() - 50);
			return lines[0] !== name ? lines[0] + '...' : name;
		}
		case 'Extension': {
			return list.extStates[0];
		}
		case 'Lock state': {
			return list.lockStates[0];
		}
		case 'MBID': {
			return list.mbidStates[0];
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
			const name = idx !== -1 ? options[idx] : isArrayEqual(list.tagState, states) ? options[0] : 'Multiple...';
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
			ttText = 'Cycle through the different categories:\n' + options.map((item, i) => { return item + (list.categoryState.indexOf(item) !== -1 ? '  <--' + (i === iInherit ? '\t-inherit-' : '') : ''); }).join('\n');
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
			const bInherit = list.tagState.indexOf(defOpt) === -1;
			ttText = 'Cycle through the different tags:\n' + list.tags().map((item, i) => { return item + (list.tagState.indexOf(item) !== -1 ? '  <--' + (bInherit && i !== 0 ? '\t-inherit-' : '') : ''); }).join('\n');
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