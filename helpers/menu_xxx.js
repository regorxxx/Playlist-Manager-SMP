'use strict';
//05/08/25

/* exported _menu */

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
 * @param {boolean?} o.bSuppressDefaultMenu - [=true] Suppress the default context menu. left shift + left windows key will bypass it.
 * @param {boolean?} o.bAddInvisibleIds - [=true] When trying to add multiple (sub)menus with same name (and different parent), an invisible Id may be added to allow it. .newMenu() and .findOrNewMenu() will return the final name in such case. Entries may be duplicated without conflicts though.
 * @param {function?} o.onBtnUp - [=null] Callback called after processing mouse btn_up. Respects the value of this inside the function, if any.
 * @param {number?} o.contextIdxInitial - [=10000] Initial id for Context Menu manager.
 * @param {number?} o.mainIdxInitial - [=100000] Initial id for Main Menu manager.
 * @param {number?} o.idxInitialOffset - [=1000] Every new context/main menu will be set at initial id + offset (i.e. by default 10 context menus are allowed without collisions).
 * @param {boolean} o.bLogEntries - [=false] Log entry calls into console.
 * @param {boolean} o.bThrowErrors - [=true] Throws an error when passing malformed arguments on any method. It may conflict with web requests if they are active when the panel crashes (although a workarounds is implemented).
 * @returns {void}
 */
function _menu({ bInit = true, bSuppressDefaultMenu = true, properties = null, iMaxEntryLen = Infinity, iMaxTabLen = Infinity, bAddInvisibleIds = true, onBtnUp = null, contextIdxInitial = 10000, mainIdxInitial = 100000, idxInitialOffset = 1000, bLogEntries = false, bThrowErrors = true } = {}) {
	const isFunction = _menu.isFunction;
	/* Checks */
	if (onBtnUp && !isFunction(onBtnUp)) { throwError('onBtnUp is not a function'); }
	if (iMaxEntryLen <= 0) { throwError('iMaxEntryLen can not be <= 0'); }
	if (iMaxTabLen <= 0) { throwError('iMaxTabLen can not be <= 0'); }

	/* Globals (private) */
	/** @typedef {object} Menu
	 * @property  {String|() => String} menuName
	 * @property  {String|() => String} subMenuFrom
	 */
	/** @type {Menu[]} - Temporal list of menus/submenus entries, reset on every call */
	let menuArrTemp = [];
	/** @type {Menu[]} - List of menus/submenus entries */
	let menuArr = [];
	/** @type {Map<string,MenuObject>} - Map for standard menus */
	const menuMap = new Map();
	/** @type {Map<string,MenuObject>} - Map for contextual menus (handle lists) */
	const contextMenuMap = new Map();
	/** @type {Map<string,MenuObject>} - Map for main menus */
	const mainMenuMap = new Map();
	/** @typedef {object} MenuEntry
	 * @property  {String|() => String} [entryText]
	 * @property  {String|() => String} menuName
	 * @property  {String|() => String} [subMenuFrom]
	 * @property  {Number|() => Number} flags
	 * @property  {boolean} bIsMenu
	 * @property  {Function?} [func]
	 * @property  {Function?} [condFunc]
	 * @property  {any?} [data]
	 * @property  {{type:String, playlistIdx:Number}} [context]
	 * @property  {{type:String}} [main]
	 */
	/** @typedef {object} MenuEntryCond
	 * @property  {String} entryText
	 * @property  {Function} condFunc
	 */
	/** @typedef {object} MenuSeparator
	 * @property  {Separator} entryText
	 * @property  {String|() => String} menuName
	 * @property  {0x00000001} flags - MF_GRAYED
	 * @property  {false} bIsMenu
	 * @property  {null} [func]
	 * @property  {null} [data]
	 */
	/** @type {MenuEntry[]} - Temporal list of all menu entries, including menus/submenus, reset on every call */
	let entryArrTemp = [];
	/** @type {MenuEntry[]} - List of all menu entries, including menus/submenus */
	let entryArr = [];
	/** @typedef {object} MenuCheck
	 * @property  {String|() => String} menuName
	 * @property  {String|() => String} entryTextA
	 * @property  {String|() => String} entryTextB
	 * @property  {Number|() => (Boolean|Number)} idxFunc
	 */
	/** @type {MenuCheck[]} - Temporal list of all menu checks  entries, reset on every call */
	let checkMenuArrTemp = [];
	/** @type {MenuCheck[]} - List of all menu checks entries */
	let checkMenuArr = [];
	/** @typedef {object} CheckFuncEntry
	 * @property  {String} name
	 * @property  {Boolean|Number|null} val
	 * @property  {Function} func
	 */
	/** @type {Map<string,CheckFuncEntry[]>} - Map for menu names and associated menu checks */
	const checkMenuMap = new Map();
	/** @type {Map<string,number>} - Map for entry names and associated idx */
	const entryMap = new Map();
	/** @type {Map<number,string>} - Map for idx and associated entry name */
	const entryMapInverted = new Map();
	/** @type {Map<number,function>} - Map for idx entries and associated functions */
	const idxMap = new Map();
	/** @type {number} - Internal menu idx count */
	let idx = 0;
	/** @typedef {'sep'|'separator'} Separator - Allowed separator strings. Case insensitive. */
	/** @type {RegExp} - Expression to check for separator entries */
	const separator = /(?:^|\\)(?:sep|separator)$/i;
	/** @type {object} - Properties object to simplify usage along other scripts */
	this.properties = properties;
	/** @type {string} - Last menu entry called */
	this.lastCall = '';
	/** @typedef {number|boolean|Object.<string, (string|number)>|string} stringLike - Allowed name entries types */
	/** @type {string[]} - Variable types converted to string for menu and entry names */
	const eTypeToStr = ['number', 'boolean', 'object'];
	/** @typedef {object} MenuLikeObject
	 * @property  {(number) => number} btn_up
	 * @property  {(number) => void} btn_up_done
	 */

	/* Methods (public) */
	/**
	 * Get total number of menu entries (parents and entries)
	 *
	 * @kind method
	 * @memberof _menu
	 * @param {stringLike|() => String} entry - Entry name
	 * @returns {String|() => String}
	 */
	this.cleanEntryName = (entry) => {
		if (entry !== null) {
			const type = typeof entry;
			if (type !== 'undefined') {
				if (eTypeToStr.includes(type)) { entry = entry.toString(); } // NOSONAR
				if (type === 'string' && entry.includes('&')) { entry = entry.replace(/&&/g, '&').replace(/&/g, '&&'); }
			}
		}
		return entry;
	};
	/* -> To retrieve elements */
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
	 * Gets all menu entries (parents and entries), but those created by conditional entries are not set yet!
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getEntries
	 * @returns {MenuEntry[]}
	 */
	this.getEntries = () => [...entryArr];
	/**
	 * Gets all menu entries (parents and entries) including conditional ones created on init.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getEntriesAll
	 * @param {Object} object - Specifying an object or array of objects (like another menu instances), lets you concatenate multiple menus. Uses object.btn_up() and object.btn_up_done() on manually added entries.
	 * @param {{pos:number, args?:any?}?} [bindArgs] - [=null] Arguments to pass -as is- to conditional menus on init. 'pos' >=1 may be set to specify the position of the argument.
	 * @returns {MenuEntry[]}
	 */
	this.getEntriesAll = (object, bindArgs = null /*{pos: -1, args: null}*/) => {
		this.initMenu(object, bindArgs);
		const copy = [...entryArr];
		this.clear();
		return copy;
	};
	/**
	 * Gets last menu entry created.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getLastEntry
	 * @returns {MenuEntry?}
	 */
	this.getLastEntry = () => { return (entryArr.length !== 0 ? entryArr[entryArr.length - 1] : null); };
	/**
	 * Checks if last entry matches a name by type
	 *
	 * @kind method
	 * @memberof _menu
	 * @name isLastEntry
	 * @param {string} name - Entry name for lookup
	 * @param {('entry'|'cond'|'menu')} [type] - [='entry'] Entry type.
	 * @returns {boolean}
	 */
	this.isLastEntry = (name, type = 'entry') => {
		const last = this.getLastEntry();
		return last && ((type === 'entry' || type === 'cond' && last.condFunc) && last.entryText === name || type === 'menu' && last.bIsMenu && last.menuName === name);
	};
	/**
	 * Returns if last entry is a separator
	 *
	 * @kind property
	 * @memberof _menu
	 * @type {boolean}
	 * @name isLastEntrySep
	 */
	this.isLastEntrySep = void (0); // Defined so JSDOC works properly
	Object.defineProperty(this, 'isLastEntrySep', { get() { return this.isLastEntry('sep'); } });
	/**
	 * Gets all submenu entries, but those created by conditional entries are not set yet!
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getMenus
	 * @returns {Menu[]}
	 */
	this.getMenus = () => [...menuArr];
	/**
	 * Gets the key of the main menu (root). Useful to concatenate multiple menus.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getMainMenuName
	 * @returns {string?}
	 */
	this.getMainMenuName = () => menuArr.length ? menuArr[0].menuName : null;
	/**
	 * Checks if a menu name exists at an specific parent or globally.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name hasMenu
	 * @param {string} menuName - Name for lookup
	 * @param {string} [subMenuFrom] - If not set, performs a global lookup.
	 * @returns {boolean}
	 */
	this.hasMenu = (menuName, subMenuFrom = '') => menuArr.find((menu) => menu.menuName === menuName && (subMenuFrom.length ? menu.subMenuFrom === subMenuFrom : true));
	/**
	 * Gets the key of the main menu (root). Useful to concatenate multiple menus.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getMenuNameFrom
	 * @param {string} menuName - Menu name for lookup.
	 * @param {string} [subMenuFrom] - [=this.getMainMenuName()] Parent menu. Uses the main menu, unless provided another value.
	 * @returns {string}
	 */
	this.getMenuNameFrom = (menuName, subMenuFrom = this.getMainMenuName() || '') => {
		menuName = menuName.replace(hiddenCharsRegEx, '');
		subMenuFrom = subMenuFrom.replace(hiddenCharsRegEx, '');
		const found = menuArr.find((entry) => entry.menuName.replace(hiddenCharsRegEx, '') === menuName && entry.subMenuFrom.replace(hiddenCharsRegEx, '') === subMenuFrom);
		return found ? found.menuName : null;
	};
	/**
	 * Gets all menu check entries, but those created by conditional entries are not set yet!
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getCheckMenus
	 * @returns {MenuCheck[]}
	 */
	this.getCheckMenus = () => [...checkMenuArr];
	/* -> To create new elements */
	/**
	 * Creates a parent menu which will contain any entries.
	 *
	 * @property
	 * @kind method
	 * @memberof _menu
	 * @name newMenu
	 * @param {stringLike|() => String} [menuName] - [='main'] Menu name.
	 * @param {stringLike|() => String} [subMenuFrom] - [=this.getMainMenuName()] Every menu created will be appended to the main menu, unless provided another value.
	 * @param {number} [flags] - [=MF_STRING] Flags for the text
	 * @param {{type:string, playlistIdx:number}?} [context] - [=null] Use to create contextual menus
	 * @param {{type:string}?} [main] - [=null] Use to create main foobar2000 menus
	 * @returns {string|() => String}
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
	 * @param {string} [menuName] - [='main'] Menu name.
	 * @param {string} [subMenuFrom] - [=this.getMainMenuName()] Every menu created will be appended to the main menu, unless provided another value.
	 * @param {number} [flags] - [=MF_STRING] Flags for the text
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
	 * @param {object} o - Arguments
	 * @param {stringlike|() => String} [o.entryText] - [=''] Entry name. Using 'sep' or 'separator' adds a dummy separator.
	 * @param {Function?} [o.func] - [=null] Function associated to entry and called on l. click.
	 * @param {stringlike|() => String} [o.menuName] - [=this.getMainMenuName()] To which menu/submenu the entry is associated. Uses main menu when not specified.
	 * @param {Number|() => Number} [o.flags] - [=MF_STRING] Flags for the text
	 * @param {any?} [o.data] - [=null] Arbitrary data attached to the entry
	 * @param {Boolean} [o.bAddInvisibleIds] -  [=false] Entries can have duplicate names without problems, but it may be difficult to use duplicate names for lookup. Invisible Ids may be automatically added to the entry name in such case setting this to true.
	 * @returns {MenuEntry}
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
	 * Equivalent to .newEntry() but returns the menu object instead of entry name, for chaining purposes.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name concatEntry
	 * @param {object} o - Arguments
	 * @returns {this}
	 */
	this.concatEntry = (...args) => {
		return this.newEntry(args[0]) && this;
	};
	/**
	 * Creates an separator attached to any parent menu.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name newEntry
	 * @param {stringLike|() => String} menuName - To which menu/submenu the sepearator is associated. Uses main menu when not specified.
	 * @returns {MenuSeparator}
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
	 * @param {stringLike|() => String} [menuName] - To which menu/submenu the check is associated. Uses main menu when not specified.
	 * @param {stringLike|() => String} [entryTextA] - [=''] From entry A (idx gets calculated automatically)
	 * @param {(stringLike|() => String)?} [entryTextB] - [=null] To entry B (idx gets calculated automatically). For boolean checks, omit it.
	 * @param {() =>(Boolean|Number)} [idxFunc] - [=null] Logic to calculate the offset. i.e. EntryA and EntryB differ by 5 options, this function must return values between 0 and 5. For Boolean checks of a single entry, just return true/false.
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
	 * @param {(options: array,len: int) => int} func - Logic to calculate the offset. i.e. EntryA and EntryB differ by 5 options, this function must return values between 0 and 4. For Boolean checks of a single entry, just return true/false. Note separator entries doesn't count. Options argument (filtered without separators) and its length as passed as arguments to the callback.
	 * @param {any[]|number} [options] - [=[]] When provided, its length is used to consider the last n entries. In case it's not provided or its length is one or zero, only a single entry is considered and the check is boolean. It may also be provided directly as a number.
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
	 * @param {String|() => String} text - String to append. May also be a function returning a text.
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
	 * @param {Function} [boolFunc] - [=() => true] Function which must return a boolean to set wether the indicator must be added or not. If not provided, the indicator is always added.
	 * @param {String} [indicator] - [='⬅'] String to append if 'boolFunc' returns true. It's appended by adding '\t' first.
	 * @returns {boolean}
	 */
	this.addIndicatorNameLast = (boolFunc = () => true, indicator = '⬅') => this.appendToLast(() => boolFunc() ? '\t' + indicator : '');
	/**
	 * Joins multiple strings preced by a tab (\t), meant to be used on menu entries as tips or show a value.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name tip
	 * @param {...stringLike} args - Strings to join.
	 * @returns {string}
	 */
	this.tip = (...args) => {
		let tip = '';
		args.forEach((arg) => {
			if (arg === null || typeof arg === 'undefined') { return; } else { arg = String(arg); } // NOSONAR
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
	 * @param {...stringLike} args - Strings to join.
	 * @returns {boolean}
	 */
	this.addTipLast = (...args) => this.appendToLast(this.tip(...args));
	/**
	 * Used to create dynamic menus only when calling the menu, useful to check for tracks selection, etc. You may use any other method like .newMenu(), .newEntry(), etc. within condFunc. Thus creating menus only if required at init.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name newCondEntry
	 * @param {stringLike} [entryText] - [=''] Just for identification, not used anywhere.
	 * @param {Function} condFunc - Function called on .btn_up().
	 * @returns {MenuEntryCond}
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
	 * @name isChecked
	 * @param {stringLike} [menuName] - [=this.getMainMenuName()] To which menu/submenu the entry is associated. Uses main menu when not specified.
	 * @param {stringLike} entryTextA - To which menu entry the check is associated. For boolean checks.
	 * @param {stringLike} [entryTextB] - [=''] To which last menu entry the check is associated. For radious checks, you need the first and last entry.
	 * @returns {Number|Boolean|null}
	 */
	this.isChecked = (menuName = this.getMainMenuName(), entryTextA, entryTextB = '') => { // NOSONAR
		menuName = this.cleanEntryName(menuName);
		entryTextA = this.cleanEntryName(entryTextA);
		entryTextB = this.cleanEntryName(entryTextB);
		const name = entryTextA + (entryTextB.length ? ' - ' + entryTextB : ''); // NOSONAR
		const check = (this.getCheckMenu(menuName) || []).find((check) => check.name === name);
		return (check ? check.val : null);
	};
	/* Internal methods (private) */
	/**
	 * Retrieves menu object by mapping or entire map.
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name getMenu
	 * @param {String} menuName - Menu name
	 * @returns {Map<String, MenuObject>|MenuObject}
	 */
	this.getMenu = (menuName) => !menuName ? menuMap : menuMap.get(menuName);
	/**
	 * Retrieves menu entry idx by name or entire map.
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name getIdx
	 * @param {string} menuNameEntryText - Menu/entry name
	 * @returns {Map<String,Number>|number}
	 */
	this.getIdx = (menuNameEntryText) => !menuNameEntryText ? entryMap : entryMap.get(menuNameEntryText);
	/**
	 * Retrieves menu entry name by idx or entire map.
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name getEntry
	 * @param {Number} idx - entry idx
	 * @returns {Map<Number,String>|String}
	 */
	this.getEntry = (idx) => (typeof idx === 'undefined' || idx === -1) ? entryMapInverted : entryMapInverted.get(idx);
	/**
	 * Retrieves menu entry function by idx or entire map.
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name getEntryFunc
	 * @param {number} idx - entry idx
	 * @returns {Map<number,Function>|Function}
	 */
	this.getEntryFunc = (idx) => (typeof idx === 'undefined' || idx === -1) ? idxMap : idxMap.get(idx);
	/**
	 * Retrieves menu checks by name or entire map.
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name getCheckMenu
	 * @param {String} menuName - Menu name
	 * @returns {Map<string,CheckFuncEntry[]>|CheckFuncEntry[]}
	 */
	this.getCheckMenu = (menuName) => !menuName ? checkMenuMap : checkMenuMap.get(menuName);
	/**
	 * Resets invisible ids added to entry/menus
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name resetIds
	 * @returns {void}
	 */
	this.resetIds = () => invsId(void (0), true);
	/**
	 * Creates SMP menu object with associated name.
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name createMenu
	 * @param {(String|()=>String)?} [menuName] - [=this.getMainMenuName()] Menu name. Uses Main menu if ommited.
	 * @returns {MenuObject}
	 */
	this.createMenu = (menuName = this.getMainMenuName()) => {
		if (isFunction(menuName)) { menuName = menuName(); }
		menuMap.set(menuName, window.CreatePopupMenu());
		return menuMap.get(menuName);
	};
	/**
	 * Adds a menu entry to a parent menu.
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name addToMenu
	 * @param {(String|()=>String)?} [entryText] - Entry name.
	 * @param {Function} [func] - [=null] Associated function to execute on click.
	 * @param {String|()=>String} [menuName] - [=this.getMainMenuName()] Parent menu name. Uses Main menu if ommited.
	 * @param {Number} [flags] - [= MF_STRING] Entry flags.
	 * @returns {MenuObject}
	 */
	this.addToMenu = ({ entryText = null, func = null, menuName = this.getMainMenuName(), flags = MF_STRING }) => {
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
				const entryNameNoTabs = entryName.replace(/\t[^\\]*/gi, '');
				entryMap.set(entryNameNoTabs, idx);
				entryMapInverted.set(idx, entryNameNoTabs);
			} else {
				entryMapInverted.set(idx, entryName);
			}
			idxMap.set(idx, func);
		}
	};
	/**
	 * Process a check menu entry and creates a check ready to be executed on menu call
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name checkMenu
	 * @param {(String|()=>String)?} menuName - Parent menu name.
	 * @param {(String|()=>String)?} entryTextA - First entry name.
	 * @param {(String|()=>String)?} entryTextB - Second entry name.
	 * @param {Number|() => (Boolean|Number)} idxFunc - Associated check function which must return either a boolean or number
	 * @returns {void}
	 */
	this.checkMenu = (menuName, entryTextA, entryTextB, idxFunc) => {
		if (isFunction(menuName)) { menuName = menuName(); }
		if (isFunction(entryTextA)) { entryTextA = entryTextA(); }
		const entryNameA = menuName !== this.getMainMenuName() ? menuName + '\\' + entryTextA : entryTextA;
		const idxA = this.getIdx(entryNameA);
		if (typeof idxA === 'undefined' || idxA === null) { console.log('Menu-Framework-SMP: .checkMenu() - entryA not found -> ' + entryNameA); }
		if (!checkMenuMap.has(menuName)) { checkMenuMap.set(menuName, []); }
		const menuChecks = this.getCheckMenu(menuName);
		if (entryTextB) { // Radio check
			if (isFunction(entryTextB)) { entryTextB = entryTextB(); }
			const entryNameB = menuName !== this.getMainMenuName() ? menuName + '\\' + entryTextB : entryTextB;
			menuChecks.push({
				name: entryTextA + ' - ' + entryTextB, val: null, func: () => {
					const idxB = this.getIdx(entryNameB);
					if (typeof idxB === 'undefined' || idxB === null) { console.log('Menu-Framework-SMP: .checkMenu() - entryB not found -> ' + entryNameB); }
					const delta = idxFunc();
					if (typeof delta !== 'number') { console.log('Menu-Framework-SMP: .checkMenu() - idxFunc() not a number -> ' + menuName + ' -> ' + delta); }
					if ((idxA + delta) > idxB) { console.log('Menu-Framework-SMP: .checkMenu() - idxA + idxFunc() over top idx (' + idxB + ') -> ' + menuName + ' -> ' + delta); }
					try { menuMap.get(menuName).CheckMenuRadioItem(idxA, idxB, idxA + delta); }
					catch (e) {
						throw new Error(e.message + '\n\tentryTextA:\t' + entryTextA + '\n\tentryNameA:\t' + entryNameA + '\n\tentryTextB:\t' + entryTextB + '\n\tentryNameB:\t' + entryNameB + '\n\tmenuName:\t' + menuName);
					}
					return delta;
				}
			});
		} else { // Item check
			menuChecks.push({
				name: entryTextA, val: null, func: () => {
					const bVal = idxFunc();
					if (typeof bVal !== 'boolean') { console.log('Menu-Framework-SMP: .checkMenu() - idxFunc() not a boolean -> ' + entryNameA + ' -> ' + bVal); }
					try { menuMap.get(menuName).CheckMenuItem(idxA, bVal); }
					catch (e) {
						throw new Error(e.message + '\n\tentryTextA:\t' + entryTextA + '\n\tentryNameA:\t' + entryNameA + '\n\tmenuName:\t' + menuName);
					}
					return bVal;
				}
			});
		}
	};
	/**
	 * Merges another _menu object to this one
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name concat
	 * @param {_menu} menuObj - Another instance of this constructor
	 * @returns {void}
	 */
	this.concat = (menuObj) => {
		entryArr = entryArr.concat(menuObj.getEntries());
		menuArr = menuArr.concat(menuObj.getMenus());
		checkMenuArr = checkMenuArr.concat(menuObj.getCheckMenus());
	};
	/**
	 * Process a check menu entry and creates a check ready to be executed on menu call
	 * @private
	 * @kind method
	 * @memberof _menu
	 * @name initMenu
	 * @param {(_menu|Separator|MenuLikeObject)} object? - Another instance of this constructor, a separator string or any object which has a btn_up() and btn_up_done() methods
	 * @param {{pos:number, args:any}?} [bindArgs] - [=null] Arguments passed to conditional entries, which are only executed at menu call. If pos is 0 or not present, then it's passed directly as first argument; otherwise, the conditional entry function is executed with arguments set to undefined -so it will use default variables- up to pos (where args is used).
	 * @returns {void}
	 */
	this.initMenu = (object, bindArgs = null) => {
		entryArrTemp = [...entryArr]; // Create backup to restore later
		menuArrTemp = [...menuArr];
		checkMenuArrTemp = [...checkMenuArr];
		// Add conditional entries/menus
		// Call other object's menu creation. It allows multiple instances of this framework, either manually appending items
		// or an entire new instance. Separators may be added too.
		let objectArr = [];
		const manualMenuArr = [];
		if (object) {
			if (Array.isArray(object)) { objectArr = object; }
			else { objectArr = [object]; }
			for (const objectMenu of objectArr) {
				if (compareKeys(this, objectMenu)) { // Another instance of this framework, just merge entries and done
					this.concat(objectMenu);
				} else if (typeof objectMenu === 'string' && separator.test(objectMenu)) { // Separator
					this.newSeparator();
				} else if (Object.hasOwn(objectMenu, 'btn_up') && Object.hasOwn(objectMenu, 'btn_up_done')) { // Object with hard-coded methods
					manualMenuArr.push(objectMenu);
				} else { // Error
					console.log('Menu-Framework-SMP: tried to merge an external menu without known methods (\'' + (typeof objectMenu === 'object' ? JSON.stringify(Object.keys(objectMenu)) : objectMenu) + '\').');
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

	/* Callback methods (public) */
	/**
	 * Used to call the menu element on UI within callbacks. Specifying an object or array of objects (like another menu instances), lets you concatenate multiple menus. Uses object.btn_up() and object.btn_up_done() on manually added entries.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name btn_up
	 * @param {number} x - X position in px
	 * @param {number} y - Y position in px
	 * @param {(_menu|Separator|MenuLikeObject)[]} [object] - Specifying an object or array of objects (like another menu instances), lets you concatenate multiple menus. Uses object.btn_up() and object.btn_up_done() on manually added entries.
	 * @param {string} [forcedEntry] - [=''] Call an specific menu entry by name and omit creation of menu on UI.
	 * @param {boolean} [bExecute] - [=true] Wether to execute the entry function or not. May be used to simulate calls.
	 * @param {function} [replaceFunc] - [=null] Function to execute instead of the entry function if 'bExecute' is set to false. The entry name is passed as argument.
	 * @param {number} [flag] - [=0] Flags for .TrackPopupMenu() SMP method.
	 * @param {{pos:number, args?:any}} [bindArgs] - [=null] Arguments passed to conditional entries, which are only executed at menu call. If pos is 0 or not present, then it's passed directly as first argument; otherwise, the conditional entry function is executed with arguments set to undefined -so it will use default variables- up to pos (where args is used).
	 * @returns {boolean} Flag to suppress default panel menu
	 */
	this.btn_up = (x, y, object, forcedEntry = '', bExecute = true, replaceFunc = null, flag = 0, bindArgs = null) => {
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
			console.log('Menu-Framework-SMP: tried to call a menu with forced entry (\'' + forcedEntry + '\') but it doesn\'t exist. It may point to a bug or error.');
		}
		if (onBtnUp) { onBtnUp(x, y, object, bExecute, replaceFunc, flag, bindArgs); }
		// Clear all
		this.clear();
		return bSuppressDefaultMenu;
	};
	/**
	 * Cleans all temporal data after the menu has been called on UI. Called everytime .btn_up() is fired. It may also be used to completely clean all cached entries by ussing the flag.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name clear
	 * @param {boolean} [bForce] - [=false] Wether to execute the entry function or not. May be used to simulate calls.
	 * @returns {boolean}
	 */
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
	 * Recreates the menu caññ with last entry executed.
	 *
	 * Shorthand for menu.btn_up(void (0), void (0), void (0), menu.lastCall, true, void (0), void (0), bindArgs);
	 *
	 * @kind method
	 * @memberof _menu
	 * @name retry
	 * @param {{pos:number, args:any}?} [bindArgs] - [=null] Arguments passed to conditional entries, which are only executed at menu call. If pos is 0 or not present, then it's passed directly as first argument; otherwise, the conditional entry function is executed with arguments set to undefined -so it will use default variables- up to pos (where args is used).
	 * @returns {boolean} Flag to suppress default panel menu
	 */
	this.retry = (bindArgs = null) => {
		return this.btn_up(void (0), void (0), void (0), this.lastCall, true, void (0), void (0), bindArgs);
	};

	/* Helpers (public) */
	/**
	 * Checks if a menu entry (object) is a separator.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name isSeparator
	 * @param {MenuEntry|String} obj - Menu entry-like object or string.
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
	 * @param {MenuEntry|String} obj - Menu entry-like object or string.
	 * @returns {boolean}
	*/
	this.isNotSeparator = (obj) => !this.isSeparator(obj);
	/**
	 * Returns an instance to the (private) RegExp used for hidden chars.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getHiddenCharsRegEx
	 * @returns {RegExp}
	*/
	this.getHiddenCharsRegEx = () => hiddenCharsRegEx;
	/**
	 * Returns the next invisible ID to avoid menu entries collisions.
	 *
	 * @kind method
	 * @memberof _menu
	 * @name getNextId
	 * @returns {String}
	*/
	this.getNextId = () => invsId(true);
	/** @type {String[]} - Unicode invisible chars used for IDs */
	const hiddenChars = ['\u200b', '\u200c', '\u200d', '\u200e'];
	/** @type {RegExp} - Regexp to check for invisible chars on strings */
	// eslint-disable-next-line no-misleading-character-class
	const hiddenCharsRegEx = /[\u200b\u200c\u200d\u200e]{1,5}$/g; // NOSONAR
	/**
	 * Helper to compute invisible IDs
	 *
	 * @name invsId
	 * @param {Boolean} [bNext] - [=true] Flag to retrieve the next item or last one
	 * @param {Boolean} [bReset] - [=false] Flag to reset Ids
	 * @returns {String}
	*/
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
	/**
	 * Helper to compare keys of 2 objects
	 *
	 * @name compareKeys
	 * @param {object} a
	   * @param {object} b
	 * @returns {Boolean}
	*/
	function compareKeys(a, b) {
		const aKeys = Object.keys(a).sort((a, b) => a.localeCompare(b));
		const bKeys = Object.keys(b).sort((a, b) => a.localeCompare(b));
		return JSON.stringify(aKeys) === JSON.stringify(bKeys);
	}
	/**
	 * Helper to output menu details on errors. Passes all arguments.
	 *
	 * @name menuError
	 * @returns {void}
	*/
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
	/**
	 * Crashing the panel when web requests are active may crash the entire foobar2000 instance
	 * As a workaround, the script tries to abort all request first and then throws the error after some ms
	 *
	 * @name throwError
	   * @param {String} message
	 * @returns {void}
	*/
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

/**
 * Attaches menu instances to an already existing object (which is supposed to have a this.trace method)
 * overriding this.rbtn_up and this.lbtn_up
 *
 * @kind method
 * @memberof _menu
 * @static
 * @name attachInstance
 * @param {object} [o] - Arguments
 * @param {object} parent - Parent object
 * @param {_menu} [o.rMenu] - Right click menu object
 * @param {_menu} [o.lMenu] - Left click menu object
 * @param {_popup} [o.popup] - Popup object, which stops menu processing if active
 * @returns {object} Parent object
 */
_menu.attachInstance = function attach({
	parent,
	rMenu = null,
	lMenu = null,
	popup = null
} = {}) {
	if (!parent) { throw new Error('No parent object was provided'); }
	parent.rMmenu = rMenu;
	parent.lMmenu = lMenu;
	parent.rbtn_up = (function rbtn_up(x, y, ...rest) {
		if (this.trace(x, y) && rMenu) {
			return popup && popup.isEnabled()
				? false
				: (_menu.isFunction(this.rMmenu) ? this.rMmenu() : this.rMmenu).btn_up(x, y, ...rest);
		}
		return false;
	}).bind(parent);
	this.lbtn_up = (function lbtn_up(x, y, ...rest) {
		if (this.trace(x, y) && lMenu) {
			return popup && popup.isEnabled()
				? false
				: (_menu.isFunction(this.lMenu) ? this.lMenu() : this.lMenu).btn_up(x, y, ...rest);
		}
		return false;
	}).bind(parent);
	return parent;
};

/**
 * Binds the menu to an already existing object (which is supposed to have a this.trace function)
 *
 * @kind method
 * @memberof _menu
 * @static
 * @name bindInstance
 * @param {object} parent
 * @param {_menu|() => _menu} menu
 * @param {'l'|'r'} mouse - Left or right click menu
 * @returns {object} Parent object
 */
_menu.bindInstance = function bindInstance(parent, menu, mouse = 'r') {
	return _menu.attachInstance({
		parent,
		[mouse === 'r' ? 'rMenu' : 'lMenu']: _menu.isFunction(menu) ? menu.bind(parent) : menu,
		popup: parent.pop || null
	});
};

/**
 * Helper to check if  is a function
 *
 * @kind method
 * @memberof _menu
 * @static
 * @name isFunction
 * @param {any} obj
 * @returns {Boolean}
*/
_menu.isFunction = function isFunction(obj) {
	return !!(obj && obj.constructor && obj.call && obj.apply);
};

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