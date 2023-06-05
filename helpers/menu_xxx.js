'use strict';
//05/06/23

/* 
	Contextual Menu helper v2.4.0
	Helper to create contextual menus on demand on panels without needing to create specific methods for
	every script, calculate IDs, etc. Menus are pushed to a list and created automatically, linking the entries
	to their idx without needing a 'switch' block or leaving holes to ensure idx get enough numbers to expand the script.
	The main utility of this helper is greatly reducing coding for simple menus and having both, the menu logic creation
	and the menus' functions on the same place. Creation order is done following entry/menus addition.
	
	Methods:
		_menu({bInit = true, bSupressDefaultMenu = true, properties = null, iMaxEntryLen = Infinity, iMaxTabLen = Infinity, bAddInvisibleIds = true, onBtnUp = null, contextIdxInitial = 10000, mainIdxInitial = 100000, idxInitialOffset = 1000})
			-bInit:					Creates a main menu object at init. Set to false to directly replace with a contextual/main menu obj.
			-bSupressDefaultMenu:	Suppress the default context menu. left shift + left windows key will bypass it. 
			-bAddInvisibleIds:		When trying to add multiple (sub)menus with same name (and different parent), an invisible ID 
										may be added to allow it. .newMenu() will return the final name in such case.
			-onBtnUp:				Callback called after processing mouse btn_up. Respects the value of this inside the function, if any.
			-contextIdxInitial:		Initial id for Context Menu manager
			-mainIdxInitial:		Initial id for Main Menu manager
			-idxInitialOffset:		Every new context/main menu will be set at initial id + offset (i.e. by default 10 context menus are
										allowed without clashing)
		
		.btn_up(x, y, [object])
			-NOTE: 					Called within callbacks to create the menu. Specifying an object or array of objects 
										(like another menu instances), lets you concatenate multiple menus. Uses object.btn_up()
										and object.btn_up_done() on manually added entries
		
		.getMainMenuName()
			-NOTE:					Used to get the key of the main menu. Useful to concatenate multiple menus.
	
		.newMenu(menuName = 'main', subMenuFrom = 'main', flags = MF_STRING, context = null, main = null)
			-menuName:				Specifies the menu name or submenus names. 
			-NOTE:					Menu is called 'main' when it's called without an argument.
			-NOTE:					Every menu created will be appended to the main menu, unless provided another 'subMenuFrom' value.
			
		.newEntry({entryText: null, func: null, menuName: menuArr[0], flags: MF_STRING})
			-entryText: 			new menu entry text. Using 'sep' or 'separator' adds a dummy separator.
			-func: 					function associated to that entry
			-menuName:				to which menu/submenu the entry is associated. Uses main menu when not specified
			-flags:					flags for the text 
			-NOTE:					All arguments (but 'func') may be a variable or a function (evaluated when creating the menu)
		
		.newCheckMenu(menuName, entryTextA, entryTextB, idxFunc)
			-menuName:				to which menu/submenu the check is associated
			-entryTextA:			From entry A (idx gets calculated automatically)
			-entryTextB:			To entry B (idx gets calculated automatically)
			-idxFunc:				Logic to calculate the offset. i.e. EntryA and EntryB differ by 5 options, idxFunc must return
										values between 0 and 5.
			-NOTE:					All arguments (but 'idxFunc') may be a variable or a function (evaluated when creating the menu)
			
		.newCondEntry({entryText: '', condFunc})
			-condFunc:				Function called on .btn_up()
			-entryText: 			Just for information
			-NOTE:					Used to create dynamic menus only when calling the contextual menu, useful to check for tracks
										selection, etc. You may use any other method like .newMenu(), .newEntry(), etc. within 
										condFunc. Thus creating menus only if required.
	Usage:
		See examples folder.
 */

include(fb.ComponentPath + 'docs\\Flags.js');

function _menu({bInit = true, bSupressDefaultMenu = true, properties = null, iMaxEntryLen = Infinity, iMaxTabLen = Infinity, bAddInvisibleIds = true, onBtnUp = null, contextIdxInitial = 10000, mainIdxInitial = 100000, idxInitialOffset = 1000, bLogEntries = false} = {}) {
	// Checks
	if (onBtnUp && !isFunction(onBtnUp)) {throw new Error('onBtnUp is not a function');}
	if (iMaxEntryLen <= 0) {throw new Error('iMaxEntryLen can not be <= 0');}
	if (iMaxTabLen <= 0) {throw new Error('iMaxTabLen can not be <= 0');}
	
	// Globals
	let menuArrTemp = [];
	let menuArr = [];
	let menuMap = new Map();
	
	let contextMenuMap = new Map();
	let mainMenuMap = new Map();
	
	let entryArrTemp = [];
	let entryArr = [];
	
	let checkMenuArr = [];
	let checkMenuArrTemp = [];
	
	let checkMenuMap = new Map();
	let entryMap = new Map();
	let entryMapInverted = new Map();
	let idxMap = new Map();
	let idx = 0;
	
	const separator = /^sep$|^separator$/i;
	
	this.properties = properties; // To simplify usage along other scripts
	this.lastCall = '';
	
	const eTypeToStr = ['number', 'boolean', 'object']; // Variable types converted to string for menu and entry names
	
	// To retrieve elements
	this.getNumEntries = () => {return entryArr.length;};
	this.getEntries = () => {return [...entryArr];}; // To get all menu entries, but those created by conditional menus are not set yet!
	this.getEntriesAll = (object, bindArgs = null /*{pos: -1, args: null}*/) => {this.initMenu(object, bindArgs); const copy = [...entryArr]; this.clear(); return copy;}; // To get all menu entries, even cond ones!
	this.getMenus = () => {return [...menuArr];};
	this.getMainMenuName = () => {return menuArr[0].menuName;};
	this.hasMenu = (menuName, subMenuFrom = '') => {return (menuArr.findIndex((menu) => {return menu.menuName === menuName && (subMenuFrom.length ? menu.subMenuFrom === subMenuFrom : true);}) !== -1);};
	this.getMenuNameFrom = (menuName, subMenuFrom) => {
		const found = menuArr.find((menu) => menu.menuName.replace(hiddenCharsRegEx, '') === menuName && menu.subMenuFrom.replace(hiddenCharsRegEx, '') === subMenuFrom);
		return found ? found.menuName : null;
	};
	
	// To create new elements
	this.newMenu = (menuName = 'main', subMenuFrom = 'main', flags = MF_STRING, context = null /*{type, playlistIdx}*/, main = null /*{type}*/) => {
		const mType = typeof menuName, smType = typeof subMenuFrom;
		if (eTypeToStr.indexOf(mType) !== -1) {menuName = menuName.toString();}
		if (eTypeToStr.indexOf(smType) !== -1) {subMenuFrom = subMenuFrom.toString();}
		if (menuName === subMenuFrom) {subMenuFrom = '';}
		// Replace & with && to display it right on window, but check for && first to not duplicate!
		// No need to define regex and reuse since it's not expected to use it a lot anyway!
		if (mType === 'string' && subMenuFrom.indexOf('&') !== - 1) {subMenuFrom = subMenuFrom.replace(/&&/g,'&').replace(/&/g,'&&');}
		if (smType === 'string' && menuName.indexOf('&') !== - 1) {menuName = menuName.replace(/&&/g,'&').replace(/&/g,'&&');}
		if (context && main) {
			menuError({'function': 'newMenu\n', menuName, subMenuFrom, flags, context, main});
			throw 'A menu can not be a contextual menu and main menu at the same time';
		}
		if (bAddInvisibleIds) {
			if (this.hasMenu(menuName, subMenuFrom)) {
				menuError({'function': 'newMenu\n', menuName, subMenuFrom, flags}); 
				throw 'There is already another menu with same name and same root';
			} else if (this.hasMenu(menuName)) {
				menuName += invsId(true); // At this point don't use other name than this!
			}
		} else if (this.hasMenu(menuName)) {
			menuError({'function': 'newMenu\n', menuName, subMenuFrom, flags}); 
			throw 'There is already another menu with same name';
		}
		menuArr.push({menuName, subMenuFrom});
		if (menuArr.length > 1 || !bInit) {entryArr.push({menuName, subMenuFrom, flags, bIsMenu: true, context, main});}
		return menuName;
	};
	if (bInit) {this.newMenu();} // Default menu
	
	this.findOrNewMenu = (menuName = 'main', subMenuFrom = 'main', flags = MF_STRING) => { // Used when invisible IDs are used, so there is no need to check if the menu already exists...
		return this.getMenuNameFrom(menuName, subMenuFrom) || this.newMenu(menuName, subMenuFrom, flags);
	}
	
	this.newEntry = ({entryText = '', func = null, menuName = menuArr[0].menuName, flags = MF_STRING, data = null, bAddInvisibleIds = false}) => {
		const eType = typeof entryText, mType = typeof menuName;
		if (eTypeToStr.indexOf(eType) !== -1) {	entryText = entryText.toString();}
		if (eTypeToStr.indexOf(mType) !== -1) {menuName = menuName.toString();}
		if (eType === 'string') {
			if (entryText.indexOf('&') !== - 1) {entryText = entryText.replace(/&&/g,'&').replace(/&/g,'&&');}
			if (separator.test(entryText)) {func = null; flags = MF_GRAYED;}
		}
		if (mType === 'string' && menuName.indexOf('&') !== - 1) {menuName = menuName.replace(/&&/g,'&').replace(/&/g,'&&');}
		if (bAddInvisibleIds) {entryText += invsId(true);} // At this point don't use other name than this!
		entryArr.push({entryText, func, menuName, flags, bIsMenu: false, data});
		return entryArr[entryArr.length -1];
	};
	
	this.newCheckMenu = (menuName = this.getMainMenuName(), entryTextA = '', entryTextB = null, idxFun) => {
		const mType = typeof menuName, eAType = typeof entryTextA, eBType = typeof entryTextB;
		if (eTypeToStr.indexOf(mType) !== -1) {menuName = menuName.toString();}
		if (eTypeToStr.indexOf(eAType) !== -1) {entryTextA = entryTextA.toString();}
		if (eAType === 'string' && separator.test(entryTextA)) {return false;}
		if (entryTextB !== null && eBType !== 'undefined' && eTypeToStr.indexOf(eBType) !== -1) {entryTextB = entryTextB.toString();}
		if (eAType === 'string' && entryTextA.indexOf('&') !== - 1) {entryTextA = entryTextA.replace(/&&/g,'&').replace(/&/g,'&&');}
		if (eBType === 'string' && entryTextB.indexOf('&') !== - 1) {entryTextB = entryTextB.replace(/&&/g,'&').replace(/&/g,'&&');}
		if (mType === 'string' && menuName.indexOf('&') !== - 1) {menuName = menuName.replace(/&&/g,'&').replace(/&/g,'&&');}
		if (mType === 'string' && !this.hasMenu(menuName)) {menuError({'function': 'newCheckMenu\n', menuName, entryTextA, entryTextB, idxFun}); throw 'There is no menu with such name';}
		checkMenuArr.push({menuName, entryTextA, entryTextB, idxFun});
		return true;
	};
	
	this.newCondEntry = ({entryText = '', condFunc}) => {
		if (eTypeToStr.indexOf(typeof entryText) !== -1) {entryText = entryText.toString();}
		entryArr.push({entryText, condFunc});
		return entryArr[entryArr.length -1];
	};
	
	// <-- Internal
	this.getMenu = (menuName) => {return (!menuName) ? menuMap : menuMap.get(menuName);};
	this.getIdx = (menuNameEntryText) => {return (!menuNameEntryText) ? entryMap : entryMap.get(menuNameEntryText);};
	this.getEntry = (idx) => {return (typeof idx === 'undefined' || idx === -1) ? entryMapInverted : entryMapInverted.get(idx);};
	this.getEntryFunc = (idx) => {return (typeof idx === 'undefined' || idx === -1) ? idxMap : idxMap.get(idx);};
	this.getCheckMenu = (menuName) => {return (!menuName) ? checkMenuMap : checkMenuMap.get(menuName);};
	this.resetIds = () => {return invsId(void(0), true);}
	
	this.createMenu = (menuName = menuArr[0].menuName) => {
		if (isFunction(menuName)) {menuName = menuName();}
		menuMap.set(menuName, window.CreatePopupMenu());
		return menuMap.get(menuName);
	};
	
	this.addToMenu = ({entryText = null, func = null, menuName = menuArr[0].menuName, flags = MF_STRING}) => {
		if (separator.test(entryText)) {menuMap.get(menuName).AppendMenuSeparator();}
		else {
			idx++;
			if (isFunction(menuName)) {menuName = menuName();}
			if (isFunction(flags)) {flags = flags();}
			if (isFunction(entryText)) {entryText = entryText();}
			// Safe-checks
			const eType = typeof entryText, mType = typeof menuName;
			if (mType === 'undefined') {menuError({'function': 'addToMenu\n', menuName, entryText, flags}); throw 'menuName is not defined';}
			else if (eTypeToStr.indexOf(mType) !== -1) {menuName = menuName.toString();}
			else if (mType === 'function') {menuName = menuName.name;}
			else if (mType !== 'string') {menuError({'function': 'addToMenu\n', menuName, entryText, flags}); throw 'menuName type is not recognized';}
			if (eType === 'undefined') {menuError({'function': 'addToMenu\n', menuName, entryText, flags}); throw 'entryText is not defined!';}
			else if (eTypeToStr.indexOf(eType) !== -1) {entryText = entryText.toString();}
			else if (eType === 'function') {entryText = entryText.name;}
			else if (eType !== 'string') {menuError({'function': 'addToMenu\n', menuName, entryText, flags}); throw 'entryText type is not recognized';}
			// Cut len
			let [entryTextName, entryTextTab] = entryText.split('\t');
			let entryTextSanitized = entryTextName;
			const chars = [')', ']', '}', ':'];
			if (entryTextName.length > iMaxEntryLen) {
				const bHasChar = chars.map((c) => {return entryTextName.slice(-1) === c;});
				entryTextSanitized = entryTextName.substring(0, iMaxEntryLen) + '...' + bHasChar.map((b, i) => {return b ? chars[i] : '';}).filter(Boolean).join('');
			}
			if (entryTextTab) {
				if (entryTextTab.length > iMaxTabLen) {
					const bHasChar = chars.map((c) => {return entryTextTab.slice(-1) === c;});
					entryTextSanitized += '\t' + entryTextTab.substring(0, iMaxTabLen) + '...' + bHasChar.map((b, i) => {return b ? chars[i] : '';}).filter(Boolean).join('');
				} else {entryTextSanitized += '\t' + entryTextTab;}
			}
			// Delete invisible chars since they may appear as bugged chars with some fonts on Wine
			entryTextSanitized = entryTextSanitized.replace(hiddenCharsRegEx, '');
			// Create FB menu entry. Add proper error info
			try {menuMap.get(menuName).AppendMenuItem(flags, idx, entryTextSanitized);} catch (e) {throw new Error(e.message + '\nmenuName: ' + menuName);}
			// Add to index
			const entryName = (menuName !== this.getMainMenuName() ? menuName + '\\' + entryText : entryText);
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
	};
	
	this.checkMenu = (menuName, entryTextA, entryTextB, idxFunc) => {
		if (isFunction(menuName)) {menuName = menuName();}
		if (isFunction(entryTextA)) {entryTextA = entryTextA();}
		const entryNameA = menuName !== this.getMainMenuName() ? menuName + '\\' + entryTextA : entryTextA;
		if (entryTextB) { // Radio check
			if (isFunction(entryTextB)) {entryTextB = entryTextB();}
			const entryNameB = menuName !== this.getMainMenuName() ? menuName + '\\' + entryTextB : entryTextB;
			checkMenuMap.set(menuName, () => {
				return menuMap.get(menuName).CheckMenuRadioItem(this.getIdx(entryNameA), this.getIdx(entryNameB), this.getIdx(entryNameA) + idxFunc());
			});
		} else { // Item check
			checkMenuMap.set(menuName + entryTextA, () => {
				return menuMap.get(menuName).CheckMenuItem(this.getIdx(entryNameA), idxFunc());
			});
		}
	};
	
	this.concat = (menuObj) => {
		entryArr = entryArr.concat(menuObj.getEntries());
	};
	
	this.initMenu = (object, bindArgs = null /*{pos: -1, args: null}*/) => {
		entryArrTemp = [...entryArr]; // Create backup to restore later
		menuArrTemp = [...menuArr];
		checkMenuArrTemp = [...checkMenuArr];
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
				} else if (typeof objectMenu === 'string' && separator.test(objectMenu)) { // Separator
					this.newEntry({entryText: 'sep'});
				} else if (objectMenu.hasOwnProperty('btn_up') && objectMenu.hasOwnProperty('btn_up_done')) { // Object with hard-coded methods
					manualMenuArr.push(objectMenu);
				} else { // Error
					console.log('menu_xxx: Tried to merge an external menu without known methods (\'' + (typeof objectMenu === 'object' ? JSON.stringify(Object.keys(objectMenu)) : objectMenu) + '\').');
				}
			}
		}
		entryArr.forEach( (entry) => {
			if (entry.hasOwnProperty('condFunc') && entry.condFunc) { // Create menu
				if (bindArgs !== null) {
					if (bindArgs.pos >= 1) {entry.condFunc(...[...Array(bindArgs.pos)].map((_) => {return void(0);}), bindArgs.args);}
					else {entry.condFunc(bindArgs.args);}
				} else {entry.condFunc();}
			}
		});
		// Init menus
		menuArr.forEach( (menu) => {
			this.createMenu(menu.menuName);
		});
		// Init entries
		let contextIdx = contextIdxInitial;
		let mainIdx = mainIdxInitial;
		entryArr.forEach((entry) => {
			if (entry.hasOwnProperty('condFunc')) {return;} // Skip conditional entries (they are already done)
			if (!entry.bIsMenu) { // To main menu
				this.addToMenu({entryText: entry.entryText, func: entry.func, menuName: entry.menuName, flags: entry.flags});
			} else { // Append sub-menus
				const subMenuName = isFunction(entry.menuName) ? entry.menuName() : entry.menuName;
				const bMainMenu = subMenuName === this.getMainMenuName() && entry.subMenuFrom === '';
				if (subMenuName !== this.getMainMenuName()  || bMainMenu) {
					const flags = isFunction(entry.flags) ? entry.flags() : entry.flags;
					const subMenuFrom = isFunction(entry.subMenuFrom) ? entry.subMenuFrom() : entry.subMenuFrom;
					const subMenuNameSanitized = subMenuName.replace(hiddenCharsRegEx, ''); // Delete invisible chars since they may appear as bugged chars with some fonts on Wine
					// Fb especial menus
					const context = isFunction(entry.context) ? entry.context() : entry.context;
					const main = isFunction(entry.main) ? entry.main() : entry.main;
					if (context && context.type) {
						const type = ((isFunction(context.type) ? context.type() : context.type) || '').toLowerCase();
						let contextMenu;
						if (type === 'handlelist') { // InitContext()
							const idx = context.hasOwnProperty('playlistIdx') ? context.playlistIdx : plman.ActivePlaylist;
							if (idx === -1) {return;}
							const name = plman.GetPlaylistName(idx).replace(/&&/g,'&').replace(/&/g,'&&');
							const playlistItems = plman.GetPlaylistItems(idx);
							const count = playlistItems.Count;
							this.addToMenu({entryText: name + ': ' + count + ' tracks', func: null, menuName: subMenuName, flags: MF_GRAYED});
							this.addToMenu({entryText: 'sep'});
							if (count > 0) {
								contextMenu = fb.CreateContextMenuManager();
								contextMenu.InitContext(playlistItems);
								contextMenu.BuildMenu(this.getMenu(subMenuName), contextIdx, contextIdx + idxInitialOffset);
							}
						} else if (type === 'playlist') { // InitContextPlaylist()
							contextMenu = fb.CreateContextMenuManager();
							contextMenu.InitContextPlaylist();
							contextMenu.BuildMenu(this.getMenu(subMenuName), contextIdx, contextIdx + idxInitialOffset);
						} else if (type === 'nowplaying') { // InitContextPlaylist()
							contextMenu = fb.CreateContextMenuManager();
							contextMenu.InitContextPlaylist();
							contextMenu.BuildMenu(this.getMenu(subMenuName), contextIdx, contextIdx + idxInitialOffset);
						}
						if (contextMenu) {
							contextIdx += idxInitialOffset;
							if (!bMainMenu) {contextMenuMap.set(subMenuName, contextMenu);}
						}
					}
					if (main && main.type) {
						const type = ((isFunction(main.type) ? main.type() : main.type) || '').toLowerCase();
						const mainAllowed = new Set(['file', 'view', 'edit', 'playback', 'library', 'help']);
						let mainMenu;
						if (mainAllowed.has(type)) {
							mainMenu = fb.CreateMainMenuManager();
							mainMenu.Init(type);
							mainMenu.BuildMenu(this.getMenu(subMenuName), mainIdx, idxInitialOffset);
						}
						if (mainMenu) {
							mainIdx += idxInitialOffset;
							if (!bMainMenu) {mainMenuMap.set(subMenuName, mainMenu);}
						}
					}
					if (!bMainMenu) {this.getMenu(subMenuName).AppendTo(this.getMenu(subMenuFrom), flags, subMenuNameSanitized);}
				}
			}
		});
		// Init checks
		checkMenuArr.forEach((check) => {
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
	};
	// -->
	
	// Used to call the menus on callbacks, etc.
	this.btn_up = (x, y, object, forcedEntry = '', bExecute = true, replaceFunc = null, flag = 0, bindArgs = null /*{pos: -1, args: null}*/) => {
		// Recreate menu(s)
		const manualMenuArr = this.initMenu(object);
		// Find currently selected item
		const currIdx = forcedEntry.length ? this.getIdx(forcedEntry) : this.getMenu(menuArr[0].menuName).TrackPopupMenu(x, y, flag);
		let bDone;
		if (typeof currIdx !== 'undefined' && currIdx !== -1) {
			this.getEntryFunc().forEach((func, entryIdx) => {
				if (bDone) {return;}
				if (entryIdx === currIdx) {
					this.lastCall = forcedEntry.length ? forcedEntry : this.getEntry(currIdx);
					if (bLogEntries) {console.log('Called: ' + this.lastCall);}
					this.clear(); // Needed to not recreate conditional entries on recursive calls!
					if (bExecute) {
						if (bindArgs !== null) {
							if (bindArgs.pos >= 1) {func(...[...Array(bindArgs.pos)].map(() => {return void(0);}), bindArgs.args);}
							else {func(bindArgs.args);}
						} else {func();}
					}
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
			// Contextual menus
			if (!bDone && currIdx >= contextIdxInitial) {
				let contextIdx = contextIdxInitial;
				contextMenuMap.forEach((contextMenu, entryIdx) => {
					if (bDone) {return;}
					bDone = contextMenu.ExecuteByID(currIdx - contextIdx);
					contextIdx += idxInitialOffset;
				});
			}
			// Contextual menus
			if (!bDone && currIdx >= mainIdxInitial) {
				let mainIdx = mainIdxInitial;
				mainMenuMap.forEach((mainMenu, entryIdx) => {
					if (bDone) {return;}
					bDone = mainMenu.ExecuteByID(currIdx - mainIdx);
					mainIdx += idxInitialOffset;
				});
			}
		} else if (forcedEntry.length) {
			console.log('menu_xxx: Tried to call a menu with forced entry (\'' + forcedEntry + '\') but it doesn\'t exist. It may point to a bug or error.');
		}
		if (onBtnUp) {onBtnUp(x, y, object ,bExecute, replaceFunc, flag, bindArgs);}
		// Clear all
		this.clear();
		return bSupressDefaultMenu;
	};
	
	this.clear = (bForce = false) => {
		// These should be always cleared and created again on every call
		menuMap.clear();
		entryMap.clear();
		entryMapInverted.clear();
		idxMap.clear();
		checkMenuMap.clear();
		contextMenuMap.clear();
		mainMenuMap.clear();
		if (bAddInvisibleIds) {this.resetIds();}
		// Since menu is cleared on every call too, entry arrays are cleared whenever this.clear is called from the outside
		// Otherwise they are reused on next call
		if (entryArrTemp.length) {entryArr = [...entryArrTemp];}
		else if (bForce) {entryArr = [];}
		entryArrTemp = [];
		if (menuArrTemp.length) {menuArr = [...menuArrTemp];}
		else if (bForce) {menuArr = []; this.newMenu();}
		menuArrTemp = [];
		if (checkMenuArrTemp.length) {checkMenuArr = [...checkMenuArrTemp];}
		if (bForce) {checkMenuArr = [];}
		checkMenuArrTemp = [];
		idx = 0;
	};
	
	this.retry = (bindArgs = null /*{pos: -1, args: null}*/) => {
		this.btn_up(void(0), void(0), void(0), this.lastCall, true, void(0), void(0), bindArgs);
	};
	
	// Helpers
	this.getHiddenCharsRegEx = () => {return hiddenCharsRegEx;}
	const hiddenChars = ['\u200b','\u200c','\u200d','\u200e'];
	const hiddenCharsRegEx = /[\u200b\u200c\u200d\u200e]{1,5}$/g;
	const invsId = (function() {
		let nextIndex = [0,0,0,0,0];
		const chars = hiddenChars;
		const num = chars.length;
		let prevId = nextIndex.length;
		return function(bNext = true, bReset = false) {
			if (bReset) {nextIndex = [0,0,0,0,0]; return nextIndex;}
			if (!bNext) {return prevId;}
			let a = nextIndex[0];
			let b = nextIndex[1];
			let c = nextIndex[2];
			let d = nextIndex[3];
			let e = nextIndex[4];
			let id = chars[a] + chars[b] + chars[c] + chars[d] + chars[e];
			a = ++a % num;
			if (!a) {
				b = ++b % num; 
				if (!b) {
					c = ++c % num;
					if (!c) {
						d = ++d % num;
						if (!d) {e = ++e % num;}
					}
				}
			}
			nextIndex = [a, b, c, d, e];
			prevId = id;
			return id;
		};
	}());
	
	function isFunction(obj) {
	  return !!(obj && obj.constructor && obj.call && obj.apply);
	}
	
	function compareKeys(a, b) {
		const aKeys = Object.keys(a).sort();
		const bKeys = Object.keys(b).sort();
		return JSON.stringify(aKeys) === JSON.stringify(bKeys);
	}
	
	function isArray(checkKeys) {
		if (checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0){
			return false; //Array was null or not an array
		}
		return true;
	}
	
	function menuError({} = {}) {
		if (console.popup) {
			console.popup(
				Object.entries(...arguments)
					.map((arg) => {return (typeof arg[1] === 'object' ? [arg[0], JSON.stringify(arg[1])] : arg).join(': ');})
					.join('\n')
				, 'Menu'
			);
		} else {
			Object.entries(...arguments)
				.map((arg) => {return (typeof arg[1] === 'object' ? [arg[0], JSON.stringify(arg[1])] : arg).join(': ');})
				.forEach((arg) => {console.log(arg);});
		}
	}
}

// Adds a created menu to an already existing object (which is supposed to have a this.trace function
// Usage: _attachedMenu.call(parent, {rMenu: createStatisticsMenu.bind(parent)}
function _attachedMenu({rMenu = null, lMenu = null, popup = null} = {}) {
	this.rMmenu = rMenu;
	this.lMmenu = lMenu;
	this.rbtn_up = (x,y) => {
		if (this.trace(x,y) && rMenu) {
			return popup && popup.isEnabled() ? false : this.rMmenu().btn_up(x, y);
		}
		return false;
	}
	this.lbtn_up = (x,y) => {
		if (this.trace(x,y) && lMenu) {
			return popup && popup.isEnabled() ? false : this.lMmenu().btn_up(x, y);
		}
		return false;
	}
}