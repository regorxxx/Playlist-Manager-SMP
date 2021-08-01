'use strict';

/* 
	Contextual Menu helper v 1.2 19/05/21
	Helper to create contextual menus on demand on panels without needing to create specific methods for
	every script, calculate IDs, etc. Menus are pushed to a list and created automatically, linking the entries
	to their idx without needing a 'switch' block or leaving holes to ensure idx get enough numbers to expand the script.
	The main utility of this helper is greatly reducing coding for simple menus and having both, the menu logic creation
	and the menus' functions on the same place. Creation order is done following entry/menus addition.
	
	Methods:
		_menu({bSupressDefaultMenu: true, idxInitial: 0})
			-bSupressDefaultMenu:	Suppress the default context menu. left shift + left windows key will bypass it. 
			-idxInitial:			Specifies an initial idx to create menus (useful to concatenate multiple menus objects)
			
		.btn_up(x, y, [object])
			-NOTE: 		Called within callbacks to create the menu. Specifying an object or array of objects (like another menu instances), 
						lets you concatenate multiple menus. Uses object.btn_up() and object.btn_up_done() on manually added entries
		.getMainMenuName()
			-NOTE:		Used to get the key of the main menu. Useful to concatenate multiple menus.
	
		.newMenu(menuName = 'main', subMenuFrom = 'main')
			-menuName:	Specifies the menu name or submenus names. 
			-NOTE:		Menu is called 'main' when it's called without an argument.
			-NOTE:		Every menu created will be appended to the main menu, unless provided another 'subMenuFrom' value.
			
		.newEntry({entryText: null, func: null, menuName: menuArr[0], flags: MF_STRING})
			-entryText: new menu entry text. Using 'sep' or 'separator' adds a dummy separator.
			-func: 		function associated to that entry
			-menuName:	to which menu/submenu the entry is associated. Uses main menu when not specified
			-flags:		flags for the text 
			-NOTE:		All arguments (but 'func') may be a variable or a function (evaluated when creating the menu)
		
		.newCheckMenu(menuName, entryTextA, entryTextB, idxFunc)
			-menuName:	to which menu/submenu the check is associated
			-entryTextA:From entry A (idx gets calculated automatically)
			-entryTextB:To entry B (idx gets calculated automatically)
			-idxFunc:	Logic to calculate the offset. i.e. EntryA and EntryB differ by 5 options, idxFunc must return values between 0 and 5.
			-NOTE:		All arguments (but 'idxFunc') may be a variable or a function (evaluated when creating the menu)
			
		.newCondEntry({entryText: '', condFunc})
			-condFunc:	Function called on .btn_up()
			-entryText: Just for information
			-NOTE:		Used to create dynamic menus only when calling the contextual menu, useful to check for tracks selection, etc.
						You may use any other method like .newMenu(), .newEntry(), etc. within condFunc. Thus creating menus only if required.
	Usage:
		See examples folder.
						
	TODO:
		- Add invisible IDs to entries names (?)
 */

include(fb.ComponentPath + 'docs\\Flags.js');

function _menu({bSupressDefaultMenu = true, idxInitial = 0, properties = null} = {}) {
	var menuArrTemp = [];
	var menuArr = [];
	var menuMap = new Map();
	
	var entryArrTemp = [];
	var entryArr = [];
	
	var checkMenuArr = [];
	var checkMenuMap = new Map();
	
	var entryMap = new Map();
	var entryMapInverted = new Map();
	var idxMap = new Map();
	var idx = 0;
	
	this.properties = properties; // To simplify usage along other scripts
	this.lastCall = '';
	
	// To create new elements
	this.newMenu = (menuName = 'main', subMenuFrom = 'main', flags = MF_STRING) => {
		if (menuName === subMenuFrom) {subMenuFrom = '';}
		// Replace & with && to display it right on window, but check for && first to not duplicate!
		// No need to define regex and reuse since it's not expected to use it a lot anyway!
		if (typeof subMenuFrom === 'string' && subMenuFrom.indexOf('&') !== - 1) {subMenuFrom = subMenuFrom.replace(/&&/g,'&').replace(/&/g,'&&');}
		if (typeof menuName === 'string' && menuName.indexOf('&') !== - 1) {menuName = menuName.replace(/&&/g,'&').replace(/&/g,'&&');}
		menuArr.push({menuName, subMenuFrom});
		if (menuArr.length > 1) {entryArr.push({menuName, subMenuFrom, flags, bIsMenu: true});}
		return menuName;
	}
	this.newMenu(); // Default menu
	
	this.newEntry = ({entryText = null, func = null, menuName = menuArr[0].menuName, flags = MF_STRING}) => {
		if (typeof entryText === 'string' && entryText.indexOf('&') !== - 1) {entryText = entryText.replace(/&&/g,'&').replace(/&/g,'&&');}
		if (typeof menuName === 'string' && menuName.indexOf('&') !== - 1) {menuName = menuName.replace(/&&/g,'&').replace(/&/g,'&&');}
		entryArr.push({entryText, func, menuName, flags, bIsMenu: false});
		return entryArr[entryArr.length -1];
	}
	
	this.newCheckMenu = (menuName = this.getMainMenuName(), entryTextA, entryTextB, idxFun) => {
		if (typeof entryTextA === 'string' && entryTextA.indexOf('&') !== - 1) {entryTextA = entryTextA.replace(/&&/g,'&').replace(/&/g,'&&');}
		if (typeof menuName === 'string' && menuName.indexOf('&') !== - 1) {menuName = menuName.replace(/&&/g,'&').replace(/&/g,'&&');}
		checkMenuArr.push({menuName, entryTextA, entryTextB, idxFun});
	}
	
	this.newCondEntry = ({entryText = '', condFunc}) => {
		entryArr.push({entryText, condFunc});
		return entryArr[entryArr.length -1];
	}

	this.getNumEntries = () => {return entryArr.length;};
	this.getEntries = () => {return [...entryArr];}; // To get all menu entries, but those created by conditional menus are not set yet!
	this.getEntriesAll = (object) => {this.initMenu(object); const copy = [...entryArr]; this.clear(); return copy;}; // To get all menu entries, even cond ones!
	this.getMenus = () => {return [...menuArr];};
	this.getMainMenuName = () => {return menuArr[0].menuName;};
	this.hasMenu = (menuName) => {return (menuArr.indexOf(menuName) !== -1);};
	
	// Internal
	this.getMenu = (menuName) => {return (!menuName) ? menuMap : menuMap.get(menuName);};
	this.getIdx = (menuNameEntryText) => {return (!menuNameEntryText) ? entryMap : entryMap.get(menuNameEntryText);};
	this.getEntry = (idx) => {return (typeof idx === 'undefined' || idx === -1) ? entryMapInverted : entryMapInverted.get(idx);};
	this.getEntryFunc = (idx) => {return (typeof idx === 'undefined' || idx === -1) ? idxMap : idxMap.get(idx);};
	this.getCheckMenu = (menuName) => {return (!menuName) ? checkMenuMap : checkMenuMap.get(menuName);};
	
	this.createMenu = (menuName = menuArr[0].menuName) => {
		if (_isFunction(menuName)) {menuName = menuName();}
		menuMap.set(menuName, window.CreatePopupMenu());
		return menuMap.get(menuName);
	}
	
	this.addToMenu = ({entryText = null, func = null, menuName = menuArr[0].menuName, flags = MF_STRING}) => {
		if (entryText === 'sep' || entryText === 'separator') {menuMap.get(menuName).AppendMenuSeparator();}
		else {
			idx++;
			if (_isFunction(menuName)) {menuName = menuName();}
			if (_isFunction(flags)) {flags = flags();}
			if (_isFunction(entryText)) {entryText = entryText();}
			menuMap.get(menuName).AppendMenuItem(flags, idx, entryText);
			const entryName = menuName !== this.getMainMenuName() ? menuName + '\\' + entryText : entryText;
			entryMap.set(entryName, idx);
			if (entryName.indexOf('\t') !== -1) {
				const entryNameNoTabs = entryName.split('\t')[0];
				entryMap.set(entryNameNoTabs, idx);
				entryMapInverted.set(idx, entryNameNoTabs);
			} else {
				entryMapInverted.set(idx, entryName);
			}
			idxMap.set(idx, func);
		}
	}
	
	this.checkMenu = (menuName, entryTextA, entryTextB, idxFunc) => {
		if (_isFunction(menuName)) {menuName = menuName();}
		if (_isFunction(entryTextA)) {entryTextA = entryTextA();}
		const entryNameA = menuName !== this.getMainMenuName() ? menuName + '\\' + entryTextA : entryTextA;
		if (entryTextB) { // Radio check
			if (_isFunction(entryTextB)) {entryTextB = entryTextB();}
			const entryNameB = menuName !== this.getMainMenuName() ? menuName + '\\' + entryTextB : entryTextB;
			checkMenuMap.set(menuName, () => {
				return menuMap.get(menuName).CheckMenuRadioItem(this.getIdx(entryNameA), this.getIdx(entryNameB), this.getIdx(entryNameA) + idxFunc());
			});
		} else { // Item check
			checkMenuMap.set(menuName + entryTextA, () => {
				return menuMap.get(menuName).CheckMenuItem(this.getIdx(entryNameA), idxFunc());
			});
		}
	}
	
	this.concat = (menuObj) => {
		entryArr = entryArr.concat(menuObj.getEntries());
	}
	
	this.initMenu = (object) => {
		entryArrTemp = [...entryArr]; // Create backup to restore later
		menuArrTemp = [...menuArr];
		// Add conditional entries/menus
		// Call other object's menu creation. It allows multiple instances of this framework, either manually appending items
		// or an entire new instance. Separators may be added too.
		let objectArr = [];
		let manualMenuArr = [];
		if (object) {
			if (isArray(object)) {objectArr = object;}
			else {objectArr = [object];}
			for (const objectMenu of objectArr) {
				if (compareKeys(this, objectMenu)) { // Another instance of this framework, just merge entries and done
					this.concat(objectMenu);
				} else if (objectMenu === 'sep' || objectMenu === 'separator') { // Separator
					this.newEntry({entryText: 'sep'});
				} else if (objectMenu.hasOwnProperty('btn_up') && objectMenu.hasOwnProperty('btn_up_done')) { // Object with hard-coded methods
					manualMenuArr.push(objectMenu);
				} else { // Error
					console.log('menu_xxx: Tried to merge an external menu withouth known methods (\'' + (typeof objectMenu === 'object' ? JSON.stringify(Object.keys(objectMenu)) : objectMenu) + '\').');
				}
			}
		}
		entryArr.forEach( (entry) => {
			if (entry.hasOwnProperty('condFunc') && entry.condFunc) { // Create menu
				entry.condFunc();
			}
		});
		// Init menus
		menuArr.forEach( (menu) => {
			this.createMenu(menu.menuName);
		});
		// Init entries
		entryArr.forEach( (entry) => {
			if (entry.hasOwnProperty('condFunc')) {return;} // Skip conditional entries (they are already done)
			if (!entry.bIsMenu) { // To main menu
				this.addToMenu({entryText: entry.entryText, func: entry.func, menuName: entry.menuName, flags: entry.flags});
			} else { // Append sub-menus
				const subMenuName = _isFunction(entry.menuName) ? entry.menuName() : entry.menuName;
				if (subMenuName !== menuArr[0].menuName) {
					const flags = _isFunction(entry.flags) ? entry.flags() : entry.flags;
					const subMenuFrom = _isFunction(entry.subMenuFrom) ? entry.subMenuFrom() : entry.subMenuFrom;
					this.getMenu(subMenuName).AppendTo(this.getMenu(subMenuFrom), flags, subMenuName);
				}
			}
		});
		// Init checks
		checkMenuArr.forEach( (check) => {
			this.checkMenu(check.menuName, check.entryTextA, check.entryTextB, check.idxFun);
		});
		this.getCheckMenu().forEach( (func) => {
			func();
		});
		// Call other object's menu creation manually appended items
		if (manualMenuArr.length) {
			let idxAcum = this.getNumEntries();
			for (const objectMenu of manualMenuArr) {
				idxAcum = objectMenu.btn_up(idxAcum); // The current num of entries may be used to create another menu with that initial idx, subsequent calls should return/use the new idx
			}
		}
		return manualMenuArr;
	}
	
	this.btn_up = (x, y, object, forcedEntry = '', bExecute = true, replaceFunc = null, flag = 0) => {
		// Recreate menu(s)
		const manualMenuArr = this.initMenu(object);
		// Find currently selected item
		const currIdx = forcedEntry.length ? this.getIdx(forcedEntry) : this.getMenu(menuArr[0].menuName).TrackPopupMenu(x, y, flag);
		let bDone;
		if (typeof currIdx !== 'undefined' && currIdx !== -1) {
			this.getEntryFunc().forEach( (func, entryIdx) => {
				if (bDone) {return;}
				if (entryIdx === currIdx) {
					this.lastCall = forcedEntry.length ? forcedEntry : this.getEntry(currIdx);
					console.log('Called: ' + this.lastCall);
					this.clear(); // Needed to not recreate conditional entries on recursive calls!
					if (bExecute) {func();}
					else if (replaceFunc) {replaceFunc(this.lastCall);}
					bDone = true;
					return;
				}
			});
			// Call other object's menu selection
			if (!bDone && manualMenuArr.length) {
				for (const objectMenu of manualMenuArr) {
					objectMenu.btn_up_done(currIdx);
				}
			}
		} else if (forcedEntry.length) {
			console.log('menu_xxx: Tried to call a menu with forced entry (\'' + forcedEntry + '\') but it doesn\'t exist. It may point to a bug or error.');
		}
		// Clear all
		this.clear();
		return bSupressDefaultMenu;
	}
	
	this.clear = (bForce = false) => {
		// These should be always cleared and created again on every call
		menuMap.clear();
		entryMap.clear();
		entryMapInverted.clear();
		idxMap.clear();
		checkMenuMap.clear();
		// Since menu is cleared on every call too, entry arrays are cleared whenever this.clear is called from the outside
		// Otherwise they are reused on next call
		if (entryArrTemp.length) {entryArr = [...entryArrTemp];}
		else if (bForce) {entryArr = [];}
		entryArrTemp = [];
		if (menuArrTemp.length) {menuArr = [...menuArrTemp];}
		else if (bForce) {menuArr = []; this.newMenu();}
		menuArrTemp = [];
		idx = 0;
	}
}

// Helpers
function _isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

function compareKeys(a, b) {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	return JSON.stringify(aKeys) === JSON.stringify(bKeys);
}

function isArray(checkKeys) {
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0){
		return false; //Array was null or not an array
	}
	return true;
}