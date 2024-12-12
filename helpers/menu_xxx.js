'use strict';
//11/12/24

/* exported _menu, _attachedMenu */

/*
	Contextual Menu helper v2.6.0
 */

include(fb.ComponentPath + 'docs\\Flags.js');
/* global MF_STRING:readable, MF_GRAYED:readable, abortWebRequests:readable */

/**
 * Helper to create contextual menus on demand on panels without needing to create specific methods for every script, calculate IDs, etc. Menus are pushed to a list and created automatically, linking the entries to their idx without needing a 'switch' block or leaving holes to ensure idx get enough numbers to expand the script. The main utility of this helper is greatly reducing coding for simple menus and having both, the menu logic creation	and the menus' functions on the same place. Creation order is done following entry/menus addition.
 *
 * Usage: See examples folder
 *
 * @constructor
 * @name _menu
 * @param {object} [o] - arguments
 * @param {boolean?} o.bInit - [=true] Creates a main menu object at init. Set to false to directly replace with a contextual/main menu obj.
 * @param {boolean?} o.bSupressDefaultMenu - [=true] Suppress the default context menu. left shift + left windows key will bypass it.
 * @param {boolean?} o.bAddInvisibleIds - [=true] When trying to add multiple (sub)menus with same name (and different parent), an invisible Id may be added to allow it. .newMenu() and .findOrNewMenu() will return the final name in such case. Entries may be duplicated without conflicts though.
 * @param {function?} o.onBtnUp - [=null] Callback called after processing mouse btn_up. Respects the value of this inside the function, if any.
 * @param {number?} o.contextIdxInitial - [=10000] Initial id for Context Menu manager.
 * @param {number?} o.mainIdxInitial - [=100000] Initial id for Main Menu manager.
 * @param {number?} o.idxInitialOffset - [=1000] Every new context/main menu will be set at initial id + offset (i.e. by default 10 context menus are allowed without clashing).
 * @param {boolean} o.bLogEntries - [=false] Log entry calls into console.
 * @param {boolean} o.bThrowErrors - [=true] Throws an error when passing malformed arguments on any method. It may conflict with web requests if they are active when the panel crashes (although a workarounds is implemented).
 * @returns {void}
 */
function _menu({ bInit = true, bSupressDefaultMenu = true, properties = null, iMaxEntryLen = Infinity, iMaxTabLen = Infinity, bAddInvisibleIds = true, onBtnUp = null, contextIdxInitial = 10000, mainIdxInitial = 100000, idxInitialOffset = 1000, bLogEntries = false, bThrowErrors = true } = {}) {
	// Checks
	if (onBtnUp && !isFunction(onBtnUp)) { throwError('onBtnUp is not a function'); }
	if (iMaxEntryLen <= 0) { throwError('iMaxEntryLen can not be <= 0'); }
	if (iMaxTabLen <= 0) { throwError('iMaxTabLen can not be <= 0'); }

	// Globals
	let menuArrTemp = [];
	let menuArr = [];
	const menuMap = new Map();

	const contextMenuMap = new Map();
	const mainMenuMap = new Map();

	let entryArrTemp = [];
	let entryArr = [];

	let checkMenuArr = [];
	let checkMenuArrTemp = [];

	const checkMenuMap = new Map();
	const entryMap = new Map();
	const entryMapInverted = new Map();
	const idxMap = new Map();
	let idx = 0;

	const separator = /(?:^|\\)(?:sep|separator)$/i;

	this.properties = properties; // To simplify usage along other scripts
	this.lastCall = '';

	const eTypeToStr = ['number', 'boolean', 'object']; // Variable types converted to string for menu and entry names

	this.cleanEntryName = (entry) => {
		if (entry !== null) {
			const type = typeof entry;
			if (type !== 'undefined') {
				if (eTypeToStr.includes(type)) { entry = entry.toString(); }
				if (type === 'string' && entry.includes('&')) { entry = entry.replace(/&&/g, '&').replace(/&/g, '&&'); }
			}
		}
		return entry;
	};
	// To retrieve elements
	/**
	 * Get total number of menu entries (parents and entries)
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getNumEntries
	 * @returns {number}
	 */
	this.getNumEntries = () => entryArr.length;
	/**
	 * Gets all menu entries (parents and entries), but those created by conditional menus are not set yet!
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getEntries
	 * @returns {{entryText?:string, menuName:string, subMenuFrom?:string, flags:number, bIsMenu:boolean, func?:function, data?:any, context?:{type:string, playlistIdx:number}, main?:{type:string}}[]}
	 */
	this.getEntries = () => [...entryArr];
	/**
	 * Gets all menu entries (parents and entries) including conditional ones created on init.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getEntriesAll
	 * @param {Object} object - Specifying an object or array of objects (like another menu instances), lets you concatenate multiple menus. Uses object.btn_up() and object.btn_up_done() on manually added entries.
	 * @param {{pos:number, args?:any}} bindArgs - Arguments to pass -as is- to conditional menus on init. 'pos' >=1 may be set to specify the position of the argument.
	 * @returns {{entryText?:string, menuName:string, subMenuFrom?:string, flags:number, bIsMenu:boolean, func?:function, data?:any, context?:{type:string, playlistIdx:number}, main?:{type:string}}[]}
	 */
	this.getEntriesAll = (object, bindArgs = null /*{pos: -1, args: null}*/) => { this.initMenu(object, bindArgs); const copy = [...entryArr]; this.clear(); return copy; };
	/**
	 * Gets last menu entry created.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getLastEntry
	 * @returns {{entryText?:string, menuName:string, subMenuFrom?:string, flags:number, bIsMenu:boolean, func?:function, data?:any, context?:{type:string, playlistIdx:number}, main?:{type:string}}?}
	 */
	this.getLastEntry = () => { return (entryArr.length !== 0 ? entryArr[entryArr.length - 1] : null); };
	/**
	 * Checks if last entry matches a name by type
	 *
	 * @kind method
	 * @memberof _menu
	 * @name isLastEntry
	 * @param {string} name - Entry name for lookup
	 * @param {('entry'|'cond'|'menu')} type - [='entry'] Entry type.
	 * @returns {boolean}
	 */
	this.isLastEntry = (name, type = 'entry' /* entry, cond, menu*/) => {
		const last = this.getLastEntry();
		return last && ((type === 'entry' || type === 'cond' && last.condFunc) && last.entryText === name || type === 'menu' && last.bIsMenu && last.menuName === name);
	};
	/**
	 * Returns if last entry is a separator
	 *
	 * @kind propgerty
	 * @memberof _menu
	 * @type {boolean}
	 * @name isLastEntrySep
	 */
	this.isLastEntrySep = void(0); // Defined so JSDOC works properly
	Object.defineProperty(this, 'isLastEntrySep', { get() { return this.isLastEntry('sep'); } });
	this.getMenus = () => [...menuArr];
	/**
	 * Gets the key of the main menu (root). Useful to concatenate multiple menus.
	 *
	 * @Function
	 * @name getMainMenuName
	 * @returns {string|null}
	 */
	this.getMainMenuName = () => menuArr.length ? menuArr[0].menuName : null;
	/**
	 * Checks if a menu name exists at an specific parent or globally.
	 *
	 * @Function
	 * @name hasMenu
	 * @param {string} menuName - Name for lookup
	 * @param {string} subMenuFrom - If not set, performs a global lookup.
	 * @returns {boolean}
	 */
	this.hasMenu = (menuName, subMenuFrom = '') => menuArr.find((menu) => menu.menuName === menuName && (subMenuFrom.length ? menu.subMenuFrom === subMenuFrom : true));
	/**
	 * Gets the key of the main menu (root). Useful to concatenate multiple menus.
	 *
	 * @Function
	 * @name getMenuNameFrom
	 * @param {string} menuName - Menu name for lookup.
	 * @param {string} subMenuFrom - Parent menu. Uses the main menu, unless provided another value.
	 * @returns {string}
	 */
	this.getMenuNameFrom = (menuName, subMenuFrom = this.getMainMenuName() || '') => {
		const found = menuArr.find((menu) => menu.menuName.replace(hiddenCharsRegEx, '') === menuName && menu.subMenuFrom.replace(hiddenCharsRegEx, '') === subMenuFrom);
		return found ? found.menuName : null;
	};
	/**
	 * Gets all menu check entries, but those created by conditional menus are not set yet!
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getCheckMenus
	 * @returns {{menuName:string, entryTextA:string, entryTextB:string, idxFunc:function}[]}
	 */
	this.getCheckMenus = () => [...checkMenuArr];

	// To create new elements
	/**
	 * Creates a parent menu which will contain any entries.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name newMenu
	 * @param {string} menuName - [='main'] Menu name.
	 * @param {string} subMenuFrom - Every menu created will be appended to the main menu, unless provided another value.
	 * @param {number} flags - Flags for the text
	 * @param {{type:string, playlistIdx:number}?} context - [=null] Use to create contextual menus
	 * @param {{type:string}?} main - [=null] Use to create main foobar2000 menus
	 * @returns {string}
	 */
	this.newMenu = (menuName = 'main', subMenuFrom = this.getMainMenuName() || 'main', flags = MF_STRING, context = null /*{type, playlistIdx}*/, main = null /*{type}*/) => { //NOSONAR
		menuName = this.cleanEntryName(menuName);
		subMenuFrom = this.cleanEntryName(subMenuFrom);
		if (menuName === subMenuFrom) { subMenuFrom = ''; }
		// Replace & with && to display it right on window, but check for && first to not duplicate!
		// No need to define regex and reuse since it's not expected to use it a lot anyway!
		if (context && main) {
			menuError({ 'function': 'newMenu\n', menuName, subMenuFrom, flags, context, main, mesage: 'A menu can not be a contextual menu and main menu at the same time' });
			throwError('A menu can not be a contextual menu and main menu at the same time');
		}
		if (bAddInvisibleIds) {
			if (this.hasMenu(menuName, subMenuFrom)) {
				menuError({ 'function': 'newMenu\n', menuName, subMenuFrom, flags, mesage: 'There is already another menu with same name and same root' });
				throwError('There is already another menu with same name and same root');
			} else if (this.hasMenu(menuName)) {
				menuName += invsId(true); // At this point don't use other name than this!
			}
		} else if (this.hasMenu(menuName)) {
			menuError({ 'function': 'newMenu\n', menuName, subMenuFrom, flags, mesage: 'There is already another menu with same name' });
			throwError('There is already another menu with same name');
		}
		menuArr.push({ menuName, subMenuFrom });
		if (menuArr.length > 1 || !bInit) { entryArr.push({ menuName, subMenuFrom, flags, bIsMenu: true, context, main }); }
		return menuName;
	};
	if (bInit) { this.newMenu(); } // Default menu
	/**
	 * Retrieves or creates a new parent menu by name. Used along invisible Ids, so there is no need to check if the menu already exists replacing the hidden chars first.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name findOrNewMenu
	 * @param {string} menuName - [='main'] Menu name.
	 * @param {string} subMenuFrom - Every menu created will be appended to the main menu, unless provided another value.
	 * @param {number} flags - Flags for the text
	 * @returns {string}
	 */
	this.findOrNewMenu = (menuName = 'main', subMenuFrom = this.getMainMenuName() || 'main', flags = MF_STRING) => {
		return this.getMenuNameFrom(menuName, subMenuFrom) || this.newMenu(menuName, subMenuFrom, flags);
	};
	/**
	 * Creates an entry attached to any parent menu.
	 * All arguments may be variables or functions (which will be evaluated when creating the menu on UI).
	 *
	 * @kind method
	 * @memberof _menu
	 * @name newEntry
	 * @param {string} entryText - [=''] Entry name. Using 'sep' or 'separator' adds a dummy separator.
	 * @param {function?} func - [=null] function associated to entry and called on l. click.
	 * @param {string} menuName - To which menu/submenu the entry is associated. Uses main menu when not specified.
	 * @param {number} flags - Flags for the text
	 * @param {any?} data - [=null] Arbitrary data attached to the entry
	 * @param {boolean?} bAddInvisibleIds - Entries can have duplicate names without problems, but it may be difficult to use duplicate names for lookup. Invisible Ids may be automatically added to the entry name in such case setting this to true.
	 * @returns {{entryText:string, menuName:string, flags:number, bIsMenu:false, func:function, data:any}}
	 */
	this.newEntry = ({ entryText = '', func = null, menuName = this.getMainMenuName(), flags = MF_STRING, data = null, bAddInvisibleIds = false }) => {
		menuName = this.cleanEntryName(menuName);
		entryText = this.cleanEntryName(entryText);
		if (typeof entryText === 'string' && separator.test(entryText)) { func = null; flags = MF_GRAYED; }
		if (bAddInvisibleIds) { entryText += invsId(true); } // At this point don't use other name than this!
		entryArr.push({ entryText, func, menuName, flags, bIsMenu: false, data });
		return entryArr[entryArr.length - 1];
	};
	/**
	 * Creates an separator attached to any parent menu.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name newEntry
	 * @param {string} menuName - To which menu/submenu the sepearator is associated. Uses main menu when not specified.
	 * @returns {{entryText:'sep', menuName:string, flags:MF_GRAYED, bIsMenu:false, func:null, data:null}}
	 */
	this.newSeparator = (menuName = this.getMainMenuName()) => {
		return this.newEntry({ entryText: 'sep', menuName });
	};
	/**
	 * Creates a check attached to a parent menu and menu entries (the bullet or check mark on UI).
	 * All arguments may be variables or functions (which will be evaluated when creating the menu on UI).
	 *
	 * @kind method
	 * @memberof _menu
	 * @name newCheckMenu
	 * @param {string} menuName - To which menu/submenu the check is associated. Uses main menu when not specified.
	 * @param {string} entryTextA - [=''] From entry A (idx gets calculated automatically)
	 * @param {string?} entryTextB - [=null] To entry B (idx gets calculated automatically). For boolean checks, omit it.
	 * @param {function?} idxFunc - [=null] Logic to calculate the offset. i.e. EntryA and EntryB differ by 5 options, this function must return values between 0 and 5. For Boolean checks of a single entry, just return true/false.
	 * @returns {boolean}
	 */
	this.newCheckMenu = (menuName = this.getMainMenuName(), entryTextA = '', entryTextB = null, idxFunc = null) => {
		if (!isFunction(idxFunc)) { menuError({ function: 'newCheckMenu\n', menuName, entryTextA, entryTextB, idxFunc }); throwError('Non valid \'idxFunc\' function provided'); }
		menuName = this.cleanEntryName(menuName);
		entryTextA = this.cleanEntryName(entryTextA);
		entryTextB = this.cleanEntryName(entryTextB);
		if (typeof entryTextA === 'string' && separator.test(entryTextA)) { return false; }
		if (typeof menuName === 'string' && !this.hasMenu(menuName)) { menuError({ function: 'newCheckMenu\n', menuName, entryTextA, entryTextB, idxFunc }); throwError('There is no menu with such name'); }
		checkMenuArr.push({ menuName, entryTextA, entryTextB, idxFunc });
		return true;
	};
	/**
	 * Creates a check attached to the last menu entry (the bullet or check mark on UI).
	 *
	 * Idx Check: Shorthand for .newCheckMenu(menuName, options[0], options[options.length - 1], idxFunc)
	 *
	 * Boolean check: Shorthand for .newCheckMenu(menuName, entryTextA, void(0), boolFunc)
	 *
	 * @kind method
	 * @memberof _menu
	 * @name newCheckMenuLast
	 * @param {(options: array,len: int) => int} func - Logic to calculate the offset. i.e. EntryA and EntryB differ by 5 options, this function must return values between 0 and 5. For Boolean checks of a single entry, just return true/false. Note separator entries doesn't count. Options argument (filtered without separartors) and its length as passed as arguments to the callback.
	 * @param {any[]|number} options - [=[]] When provided, its length is used to consider the last n entries. In case it's not provided or its length is one or zero, only a single entry is considered and the check is boolean. It may also be provided directly as a number.
	 * @returns {boolean}
	 */
	this.newCheckMenuLast = (func, options = []) => {
		if (!isFunction(func)) { menuError({ function: 'newCheckMenuLast\n', func, options }); throwError('Non valid \'func\' function provided'); }
		const lastEntry = this.getLastEntry();
		if (!lastEntry) { return false; }
		let lenFilter, len;
		if (options && Array.isArray(options)) {
			len = options.length;
			options = options.filter(this.isNotSeparator);
			lenFilter = options.length;
		} else {
			len = options ? Number(options) : 0;
		}
		return (len >= 1
			? this.newCheckMenu(lastEntry.menuName, entryArr[entryArr.length - len].entryText, lastEntry.entryText, () => func(options, lenFilter)) /* idx check */
			: this.newCheckMenu(lastEntry.menuName, lastEntry.entryText, void (0), () => func(len)) /* boolean check */
		);
	};
	/**
	 * Appends a string to the last menu entry added. Works with entries whose names are static or provided by functions.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name appendToLast
	 * @param {string|function} text - String to append. May also be a function returning a text.
	 * @returns {boolean}
	 */
	this.appendToLast = (text) => {
		const lastEntry = this.getLastEntry();
		if (lastEntry) {
			const lastName = lastEntry.entryText;
			lastEntry.entryText = () => (isFunction(lastName) ? lastName() : lastName) + (isFunction(text) ? String(text()) : text);
			return true;
		}
		return false;
	};
	/**
	 * Adds a forced bullet check to the last menu entry added.
	 *
	 * Shorthand for .newCheckMenu(menuName, entryTextA, entryTextA, () => 0))
	 *
	 * @kind method
	 * @memberof _menu
	 * @name addIndicatorCheckLast
	 * @returns {boolean}
	 */
	this.addIndicatorCheckLast = () => {
		const lastEntry = this.getLastEntry();
		return lastEntry
			? this.newCheckMenu(lastEntry.menuName, lastEntry.entryText, lastEntry.entryText, () => 0)
			: false;
	};
	/**
	 * Appends an indicator to the last menu entry added. Works with entries whose names are static or provided by functions.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name addIndicatorNameLast
	 * @param {function} boolFunc - [=() => true] Function which must return a boolean to set wether the indicator must be added or not. If not provided, the indicator is always added.
	 * @param {string} indicator - [='⬅'] String to append if 'boolFunc' returns true. It's appended by adding '\t' first.
	 * @returns {boolean}
	 */
	this.addIndicatorNameLast = (boolFunc = () => true, indicator = '⬅') => this.appendToLast(() => boolFunc() ? '\t' + indicator : '');
	/**
	 * Joins multiple strings preced by a tab (\t), meant to be used on menu entries as tips or show a value.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name tip
	 * @param {...string} args - Strings to join.
	 * @returns {string}
	 */
	this.tip = (...args) => {
		let tip = '';
		args.forEach((arg) => {
			if (arg === null || typeof arg === 'undefined') { return; } else { arg = String(arg); }
			if (arg.length) {
				if (!tip.length) { tip += '\t'; }
				tip += arg;
			}
		});
		return tip;
	};
	/**
	 * Adds a tip to last entry, joining multiple strings preced by a tab (\t).
	 *
	 * @kind method
	 * @memberof _menu
	 * @name addTipLast
	 * @param {...string} args - Strings to join.
	 * @returns {boolean}
	 */
	this.addTipLast = (...args) => this.appendToLast(this.tip(...args));
	/**
	 * Used to create dynamic menus only when calling the menu, useful to check for tracks selection, etc. You may use any other method like .newMenu(), .newEntry(), etc. within condFunc. Thus creating menus only if required at init.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name newCondEntry
	 * @param {string} entryText - [=''] Just for identification, not used anywhere.
	 * @param {function} condFunc - Function called on .btn_up().
	 * @returns {{entryText:string, condFunc:function}}
	 */
	this.newCondEntry = ({ entryText = '', condFunc }) => {
		if (eTypeToStr.includes(typeof entryText)) { entryText = entryText.toString(); }
		entryArr.push({ entryText, condFunc });
		return entryArr[entryArr.length - 1];
	};
	/**
	 * Should only be called on .initMenu(), thus within other checkMenu entries, to check if another entry has a radious or boolean check. For ex. in a submenu with an entry to input custom values, can be used to discover if any of the predefined entries are already checked. Returns null if the entry check was not found, otherwise returns a boolean or a number (with the delta idx) for radious checks.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name newCondEntry
	 * @param {string} menuName - To which menu/submenu the entry is associated. Uses main menu when not specified.
	 * @param {string} entryTextA - To which menu entry the check is associated. For boolean checks.
	 * @param {string} entryTextB - To which last menu entry the check is associated. For radious checks, you need the first and last entry.
	 * @returns {Number|Boolean|null}
	 */
	this.isChecked = (menuName = this.getMainMenuName(), entryTextA, entryTextB = '') => {
		menuName = this.cleanEntryName(menuName);
		entryTextA = this.cleanEntryName(entryTextA);
		entryTextB = this.cleanEntryName(entryTextB);
		const name = entryTextA + (entryTextB.length ? ' - ' + entryTextB : '');
		const check = (this.getCheckMenu(menuName) || []).find((check) => check.name === name);
		console.log(check, name, entryTextA);
		return (check ? check.val : null);
	};

	// <-- Internal
	this.getMenu = (menuName) => !menuName ? menuMap : menuMap.get(menuName);
	this.getIdx = (menuNameEntryText) => !menuNameEntryText ? entryMap : entryMap.get(menuNameEntryText);
	this.getEntry = (idx) => (typeof idx === 'undefined' || idx === -1) ? entryMapInverted : entryMapInverted.get(idx);
	this.getEntryFunc = (idx) => (typeof idx === 'undefined' || idx === -1) ? idxMap : idxMap.get(idx);
	this.getCheckMenu = (menuName) => !menuName ? checkMenuMap : checkMenuMap.get(menuName);
	this.resetIds = () => invsId(void (0), true);

	this.createMenu = (menuName = menuArr[0].menuName) => {
		if (isFunction(menuName)) { menuName = menuName(); }
		menuMap.set(menuName, window.CreatePopupMenu());
		return menuMap.get(menuName);
	};

	this.addToMenu = ({ entryText = null, func = null, menuName = menuArr[0].menuName, flags = MF_STRING }) => {
		if (separator.test(entryText)) { menuMap.get(menuName).AppendMenuSeparator(); }
		else {
			idx++;
			if (isFunction(menuName)) { menuName = menuName(); }
			if (isFunction(flags)) { flags = flags(); }
			if (isFunction(entryText)) { entryText = entryText(); }
			// Safe-checks
			const eType = typeof entryText, mType = typeof menuName;
			if (mType === 'undefined') { menuError({ 'function': 'addToMenu\n', menuName, entryText, flags }); throwError('menuName is not defined'); }
			else if (eTypeToStr.includes(mType)) { menuName = menuName.toString(); }
			else if (mType === 'function') { menuName = menuName.name; }
			else if (mType !== 'string') { menuError({ 'function': 'addToMenu\n', menuName, entryText, flags }); throwError('menuName type is not recognized'); }
			if (eType === 'undefined') { menuError({ 'function': 'addToMenu\n', menuName, entryText, flags }); throwError('entryText is not defined!'); }
			else if (eTypeToStr.includes(eType)) { entryText = entryText.toString(); }
			else if (eType === 'function') { entryText = entryText.name; }
			else if (eType !== 'string') { menuError({ 'function': 'addToMenu\n', menuName, entryText, flags }); throwError('entryText type is not recognized'); }
			// Cut len
			let [entryTextName, entryTextTab] = entryText.split('\t');
			let entryTextSanitized = entryTextName;
			const chars = [')', ']', '}', ':'];
			if (entryTextName.length > iMaxEntryLen) {
				const bHasChar = chars.map((c) => entryTextName.slice(-1) === c);
				entryTextSanitized = entryTextName.substring(0, iMaxEntryLen) + '...' + bHasChar.map((b, i) => { return b ? chars[i] : ''; }).filter(Boolean).join('');
			}
			if (entryTextTab) {
				if (entryTextTab.length > iMaxTabLen) {
					const bHasChar = chars.map((c) => entryTextTab.slice(-1) === c);
					entryTextSanitized += '\t' + entryTextTab.substring(0, iMaxTabLen) + '...' + bHasChar.map((b, i) => { return b ? chars[i] : ''; }).filter(Boolean).join('');
				} else { entryTextSanitized += '\t' + entryTextTab; }
			}
			// Delete invisible chars since they may appear as bugged chars with some fonts on Wine
			entryTextSanitized = entryTextSanitized.replace(hiddenCharsRegEx, '');
			// Create FB menu entry. Add proper error info
			try { menuMap.get(menuName).AppendMenuItem(flags, idx, entryTextSanitized); } catch (e) { throwError(e.message + '\nmenuName: ' + menuName); }
			// Add to index
			const entryName = (menuName !== this.getMainMenuName() ? menuName + '\\' + entryText : entryText);
			entryMap.set(entryName, idx);
			if (entryName.includes('\t')) {
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
		if (isFunction(menuName)) { menuName = menuName(); }
		if (isFunction(entryTextA)) { entryTextA = entryTextA(); }
		const entryNameA = menuName !== this.getMainMenuName() ? menuName + '\\' + entryTextA : entryTextA;
		const idxA = this.getIdx(entryNameA);
		if (typeof idxA === 'undefined' || idxA === null) { console.log('this.checkMenu: entryA not found -> ' + entryNameA); }
		if (!checkMenuMap.has(menuName)) { checkMenuMap.set(menuName, []); }
		const menuChecks = checkMenuMap.get(menuName);
		if (entryTextB) { // Radio check
			if (isFunction(entryTextB)) { entryTextB = entryTextB(); }
			const entryNameB = menuName !== this.getMainMenuName() ? menuName + '\\' + entryTextB : entryTextB;
			menuChecks.push({
				name: entryTextA + ' - ' + entryTextB, val: null, func: () => {
					const idxB = this.getIdx(entryNameB);
					if (typeof idxB === 'undefined' || idxB === null) { console.log('this.checkMenu: entryB not found -> ' + entryNameB); }
					const delta = idxFunc();
					if (typeof delta !== 'number') { console.log('this.checkMenu: idxFunc() not a number -> ' + menuName + ' -> ' + delta); }
					if ((idxA + delta) > idxB) { console.log('this.checkMenu: idxA + idxFunc() over top idx (' + idxB + ') -> ' + menuName + ' -> ' + delta); }
					menuMap.get(menuName).CheckMenuRadioItem(idxA, idxB, idxA + delta);
					return delta;
				}
			});
		} else { // Item check
			menuChecks.push({
				name: entryTextA, val: null, func: () => {
					const bVal = idxFunc();
					if (typeof bVal !== 'boolean') { console.log('this.checkMenu: idxFunc() not a boolean -> ' + entryNameA + ' -> ' + bVal); }
					menuMap.get(menuName).CheckMenuItem(idxA, bVal);
					return bVal;
				}
			});
		}
	};

	this.concat = (menuObj) => {
		entryArr = entryArr.concat(menuObj.getEntries());
		menuArr = menuArr.concat(menuObj.getMenus());
		checkMenuArr = checkMenuArr.concat(menuObj.getCheckMenus());
	};

	this.initMenu = (object, bindArgs = null /*{pos: -1, args: null}*/) => {
		entryArrTemp = [...entryArr]; // Create backup to restore later
		menuArrTemp = [...menuArr];
		checkMenuArrTemp = [...checkMenuArr];
		// Add conditional entries/menus
		// Call other object's menu creation. It allows multiple instances of this framework, either manually appending items
		// or an entire new instance. Separators may be added too.
		let objectArr = [];
		const manualMenuArr = [];
		if (object) {
			if (isArray(object)) { objectArr = object; }
			else { objectArr = [object]; }
			for (const objectMenu of objectArr) {
				if (compareKeys(this, objectMenu)) { // Another instance of this framework, just merge entries and done
					this.concat(objectMenu);
				} else if (typeof objectMenu === 'string' && separator.test(objectMenu)) { // Separator
					this.newSeparator();
				} else if (Object.hasOwn(objectMenu, 'btn_up') && Object.hasOwn(objectMenu, 'btn_up_done')) { // Object with hard-coded methods
					manualMenuArr.push(objectMenu);
				} else { // Error
					console.log('menu_xxx: Tried to merge an external menu without known methods (\'' + (typeof objectMenu === 'object' ? JSON.stringify(Object.keys(objectMenu)) : objectMenu) + '\').');
				}
			}
		}
		entryArr.forEach((entry) => {
			if (Object.hasOwn(entry, 'condFunc') && entry.condFunc) { // Create menu
				if (bindArgs !== null) {
					if (bindArgs.pos >= 1) { entry.condFunc(...Array.from({ length: bindArgs.pos }, () => void (0)), bindArgs.args); }
					else { entry.condFunc(bindArgs.args); }
				} else { entry.condFunc(); }
			}
		});
		// Init menus
		menuArr.forEach((menu) => {
			this.createMenu(menu.menuName);
		});
		// Init entries
		let contextIdx = contextIdxInitial;
		let mainIdx = mainIdxInitial;
		entryArr.forEach((entry) => {
			if (Object.hasOwn(entry, 'condFunc')) { return; } // Skip conditional entries (they are already done)
			if (!entry.bIsMenu) { // To main menu
				this.addToMenu({ entryText: entry.entryText, func: entry.func, menuName: entry.menuName, flags: entry.flags });
			} else { // Append sub-menus
				const subMenuName = isFunction(entry.menuName) ? entry.menuName() : entry.menuName;
				const bMainMenu = subMenuName === this.getMainMenuName() && entry.subMenuFrom === '';
				if (subMenuName !== this.getMainMenuName() || bMainMenu) {
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
							const idx = Object.hasOwn(context, 'playlistIdx') ? context.playlistIdx : plman.ActivePlaylist;
							if (idx === -1) { return; }
							const name = plman.GetPlaylistName(idx).replace(/&&/g, '&').replace(/&/g, '&&');
							const playlistItems = plman.GetPlaylistItems(idx);
							const count = playlistItems.Count;
							this.addToMenu({ entryText: name + ': ' + count + ' tracks', func: null, menuName: subMenuName, flags: MF_GRAYED });
							this.addToMenu({ entryText: 'sep', menuName: subMenuName });
							if (count > 0) {
								contextMenu = fb.CreateContextMenuManager();
								contextMenu.InitContext(playlistItems);
								contextMenu.BuildMenu(this.getMenu(subMenuName), contextIdx, contextIdx + idxInitialOffset);
							} else {
								this.addToMenu({ entryText: '   - No tracks -   ', menuName: subMenuName, flags: MF_GRAYED });
							}
						} else if (type === 'playlist' || type === 'nowplaying') { // InitContextPlaylist()
							contextMenu = fb.CreateContextMenuManager();
							contextMenu.InitContextPlaylist();
							contextMenu.BuildMenu(this.getMenu(subMenuName), contextIdx, contextIdx + idxInitialOffset);
						}
						if (contextMenu) {
							contextIdx += idxInitialOffset;
							if (!bMainMenu) { contextMenuMap.set(subMenuName, contextMenu); }
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
							if (!bMainMenu) { mainMenuMap.set(subMenuName, mainMenu); }
						}
					}
					if (!bMainMenu) { this.getMenu(subMenuName).AppendTo(this.getMenu(subMenuFrom), flags, subMenuNameSanitized); }
				}
			}
		});
		// Init checks
		checkMenuArr.forEach((check) => {
			this.checkMenu(check.menuName, check.entryTextA, check.entryTextB, check.idxFunc);
		});
		this.getCheckMenu().forEach((checkArr) => checkArr.forEach((check) => {
			check.val = check.func();
		}));
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

	/**
	 * Used to call the menu element on UI within callbacks. Specifying an object or array of objects (like another menu instances), lets you concatenate multiple menus. Uses object.btn_up() and object.btn_up_done() on manually added entries.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name btn_up
	 * @param {number} x - X position in px
	 * @param {number} y - Y position in px
	 * @param {Object} object - Specifying an object or array of objects (like another menu instances), lets you concatenate multiple menus. Uses object.btn_up() and object.btn_up_done() on manually added entries.
	 * @param {string} forcedEntry - [=''] Call an specific menu entry by name and ommit creation of menu on UI.
	 * @param {boolean} bExecute - [=True] Wether to execute the entry function or not. May be used to simulate calls.
	 * @param {function} replaceFunc - [=null] Function to execute instead of the entry function if 'bExecute' is set to false. The entry name is passed as argument.
	 * @param {number} TrackPopupMenu - [=0] Flags for .TrackPopupMenu() SMP method.
	 * @param {{pos:number, args?:any}} bindArgs - Arguments to pass -as is- to conditional menus on init. 'pos' >=1 may be set to specify the position of the argument.
	 * @returns {boolean}
	 */
	this.btn_up = (x, y, object, forcedEntry = '', bExecute = true, replaceFunc = null, flag = 0, bindArgs = null /*{pos: -1, args: null}*/) => {
		// Recreate menu(s)
		const manualMenuArr = this.initMenu(object);
		// Find currently selected item
		const currIdx = forcedEntry.length ? this.getIdx(forcedEntry) : this.getMenu(menuArr[0].menuName).TrackPopupMenu(x, y, flag);
		let bDone;
		if (typeof currIdx !== 'undefined' && currIdx !== -1) {
			this.getEntryFunc().forEach((func, entryIdx) => {
				if (bDone) { return; }
				if (entryIdx === currIdx) {
					this.lastCall = forcedEntry.length ? forcedEntry : this.getEntry(currIdx);
					if (bLogEntries) { console.log('Called: ' + this.lastCall); }
					this.clear(); // Needed to not recreate conditional entries on recursive calls!
					if (bExecute) {
						if (bindArgs !== null) {
							if (bindArgs.pos >= 1) { func(...Array.from({ length: bindArgs.pos }, () => void (0)), bindArgs.args); }
							else { func(bindArgs.args); }
						} else { func(); }
					}
					else if (replaceFunc) { replaceFunc(this.lastCall); }
					bDone = true;
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
				contextMenuMap.forEach((contextMenu) => {
					if (bDone) { return; }
					bDone = contextMenu.ExecuteByID(currIdx - contextIdx);
					contextIdx += idxInitialOffset;
				});
			}
			// Contextual menus
			if (!bDone && currIdx >= mainIdxInitial) {
				let mainIdx = mainIdxInitial;
				mainMenuMap.forEach((mainMenu) => {
					if (bDone) { return; }
					bDone = mainMenu.ExecuteByID(currIdx - mainIdx);
					mainIdx += idxInitialOffset;
				});
			}
		} else if (forcedEntry.length) {
			console.log('menu_xxx: Tried to call a menu with forced entry (\'' + forcedEntry + '\') but it doesn\'t exist. It may point to a bug or error.');
		}
		if (onBtnUp) { onBtnUp(x, y, object, bExecute, replaceFunc, flag, bindArgs); }
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
		if (bAddInvisibleIds) { this.resetIds(); }
		// Since menu is cleared on every call too, entry arrays are cleared whenever this.clear is called from the outside
		// Otherwise they are reused on next call
		if (entryArrTemp.length) { entryArr = [...entryArrTemp]; }
		else if (bForce) { entryArr = []; }
		entryArrTemp = [];
		if (menuArrTemp.length) { menuArr = [...menuArrTemp]; }
		else if (bForce) { menuArr = []; this.newMenu(); }
		menuArrTemp = [];
		if (checkMenuArrTemp.length) { checkMenuArr = [...checkMenuArrTemp]; }
		if (bForce) { checkMenuArr = []; }
		checkMenuArrTemp = [];
		idx = 0;
	};

	/**
	 * Recreates menu element with last entry executed.
	 *
	 * Shorthand for menu.btn_up(void (0), void (0), void (0), menu.lastCall, true, void (0), void (0), bindArgs);
	 *
	 * @kind method
	 * @memberof _menu
	 * @name retry
	 * @param {{pos:number, args?:any}} bindArgs - Arguments to pass -as is- to conditional menus on init. 'pos' >=1 may be set to specify the position of the argument.
	 * @returns {boolean}
	 */
	this.retry = (bindArgs = null /*{pos: -1, args: null}*/) => {
		this.btn_up(void (0), void (0), void (0), this.lastCall, true, void (0), void (0), bindArgs);
	};

	// Helpers
	/**
	 * Checks if a menu entry (object) is a separator.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name isSeparator
	 * @param {{entrytext?:string, name?:string}|string} obj - Menu entry object.
	 * @returns {boolean}
	 */
	this.isSeparator = (obj) => {
		const str = obj ? (obj.entryText || obj.name || obj) : null;
		return typeof str === 'string' ? separator.test(str) : false;
	};
	/**
	 * Checks if a menu entry (object) is not a separator.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name isNotSeparator
	 * @param {{entrytext:string, name?:string} obj - Menu entry object.
	* @returns {boolean}
	*/
	this.isNotSeparator = (obj) => !this.isSeparator(obj);
	this.getHiddenCharsRegEx = () => hiddenCharsRegEx;
	this.getNextId = () => invsId(true);
	const hiddenChars = ['\u200b', '\u200c', '\u200d', '\u200e'];
	// eslint-disable-next-line no-misleading-character-class
	const hiddenCharsRegEx = /[\u200b\u200c\u200d\u200e]{1,5}$/g; // NOSONAR
	const invsId = ((() => {
		let nextIndex = [0, 0, 0, 0, 0];
		const chars = hiddenChars;
		const num = chars.length;
		let prevId = '';
		return (bNext = true, bReset = false) => {
			if (bReset) { nextIndex = [0, 0, 0, 0, 0]; prevId = ''; return prevId; }
			if (!bNext) { return prevId; }
			let a = nextIndex[0];
			let b = nextIndex[1];
			let c = nextIndex[2];
			let d = nextIndex[3];
			let e = nextIndex[4];
			const id = chars[a] + chars[b] + chars[c] + chars[d] + chars[e];
			a = ++a % num;
			if (!a) {
				b = ++b % num;
				if (!b) {
					c = ++c % num;
					if (!c) {
						d = ++d % num;
						if (!d) { e = ++e % num; }
					}
				}
			}
			nextIndex = [a, b, c, d, e];
			prevId = id;
			return id;
		};
	})());

	function isFunction(obj) {
		return !!(obj && obj.constructor && obj.call && obj.apply);
	}

	function compareKeys(a, b) {
		const aKeys = Object.keys(a).sort((a, b) => a.localeCompare(b));
		const bKeys = Object.keys(b).sort((a, b) => a.localeCompare(b));
		return JSON.stringify(aKeys) === JSON.stringify(bKeys);
	}

	function isArray(checkKeys) {
		return !(checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0);
	}

	// eslint-disable-next-line no-empty-pattern
	function menuError({ } = {}) { // NOSONAR
		if (console.popup) {
			console.popup(
				Object.entries(...arguments)
					.map((arg) => { return (typeof arg[1] === 'object' ? [arg[0], JSON.stringify(arg[1])] : arg).join(': '); })
					.join('\n')
				, 'Menu'
			);
		} else {
			Object.entries(...arguments)
				.map((arg) => { return (typeof arg[1] === 'object' ? [arg[0], JSON.stringify(arg[1])] : arg).join(': '); })
				.forEach((arg) => { console.log(arg); }); // DEBUG
		}
	}
	// Crashing the panel when web requests are active may crash the entire foobar2000 instance
	// As a workaround, the script tries to abort all request first and then throws the error after some ms
	function throwError(message) {
		if (!bThrowErrors) { return; }
		const requests = window.WebRequests;
		if (requests && requests.size && typeof abortWebRequests !== 'undefined') {
			abortWebRequests(false);
		}
		if (!requests) { throw new Error(message); }
		else if (!requests.size || !requests.every((r) => r.status !== 0)) { setTimeout(() => { throw new Error(message); }, 100); }
		else { throwError(message); }
	}
}

// Adds a created menu to an already existing object (which is supposed to have a this.trace function
// Usage: _attachedMenu.call(parent, {rMenu: createStatisticsMenu.bind(parent)}
function _attachedMenu({
	rMenu = null,
	lMenu = null,
	popup = null
} = {}) {
	this.rMmenu = rMenu;
	this.lMmenu = lMenu;
	this.rbtn_up = (x, y, ...rest) => {
		if (this.trace(x, y) && rMenu) {
			return popup && popup.isEnabled() ? false : this.rMmenu().btn_up(x, y, ...rest);
		}
		return false;
	};
	this.lbtn_up = (x, y, ...rest) => {
		if (this.trace(x, y) && lMenu) {
			return popup && popup.isEnabled() ? false : this.lMmenu().btn_up(x, y, ...rest);
		}
		return false;
	};
}

// Add ES2022 method
// https://github.com/tc39/proposal-accessible-object-hasownproperty
if (!Object.hasOwn) {
	Object.defineProperty(Object, 'hasOwn', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (object, property) {
			if (object === null) {
				throw new TypeError('Cannot convert undefined or null to object');
			}
			return Object.prototype.hasOwnProperty.call(Object(object), property); // NOSONAR
		}
	});
}