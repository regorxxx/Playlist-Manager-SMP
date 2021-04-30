'use strict';

/* 
	Contextual Menu helper v 1.1 19/03/21
	Helper to create contextual menus on demand on panels without needing to create specific methods for
	every script, calculate IDs, etc. Menus are pushed to a list and created automatically, linking the entries
	to their idx without needing a 'switch' block or leaving holes to ensure idx get enough numbers to expand the script.
	The main utility of this helper is greatly reducing coding for simple menus and having both, the menu logic creation
	and the menus' functions on the same place. Creation order is done following entry/menus addition.
	
	Methods:
		_menu({bSupressDefaultMenu: true, idxInitial: 0})
			-bSupressDefaultMenu:	Suppress the default context menu. left shift + left windows key will bypass it. 
			-idxInitial:			Specifies an initial idx to create menus (useful to concatenate multiple menus objects)
			
		.btn_up(x, y, object)
			-NOTE: 		Called within callbacks to create the menu. Specifying an object (like another menu instance), lets you
						concatenate multiple menus. Uses object.btn_up() and object.btn_up_done()
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
	
	For example:
		-Standard menu:
			var menu = new _menu();
			menu.newEntry({entryText: 'Hola', func: () => {console.log('hola')}});
			menu.newEntry({entryText: 'sep'});
			menu.newEntry({entryText: 'Hola2', func: () => {console.log('hola2')}});
			var bSubMenu = true;
			const funct = () => {return (bSubMenu) ? 'SubMenu 1' : 'SubMenu 2';};
			menu.newMenu(funct);
			menu.newEntry({menuName: funct, entryText: 'Change SubMenu', func: () => {bSubMenu = !bSubMenu}});
			menu.newEntry({menuName: funct, entryText:'Hola 3', func: () => {console.log('hola3')}, flags: () => {return (bSubMenu) ? MF_STRING : MF_GRAYED}});
			menu.newCheckMenu(funct, 'Change SubMenu', 'Hola 3', () => {return (bSubMenu) ? 0 : 1;});
			menu.newEntry({entryText: 'Hola 4', func: () => {console.log('hola4')}});
			
			function on_mouse_rbtn_up(x, y) {return menu.btn_up(x, y);}
		
		Renders to: (note 'Hola 4' Entry is drawn after the sub-menu)
			+Hola
			+-----
			+HOla 2
			+SubMenu 1 / SubMenu 2:
				+Change SubMenu
				+Hola 3
			+Hola 4
		
		- Manually adding some entries to the menu (uses previous code too):
			var menuTwo = new _menuTwo();
			function _menuTwo() {
				this.idxInitial = 0;

				this.btn_up = (idxInitial) => {
					this.idxInitial = idxInitial;
					const menuName = menu.getMainMenuName();
					menu.getMenu(menuName).AppendMenuItem(MF_STRING, idxInitial + 1, 'Manual entry 1');
				}
				
				this.btn_up_done = (currIdx) => {
					if (currIdx == this.idxInitial + 1) {
						console.log('Manual entry 1');
						return;
					} else {return;}
				}
			}
			
			function on_mouse_rbtn_up(x, y) {return menu.btn_up(x, y, menuTwo);}
			
		Renders to:
			+Hola
			+-----
			+HOla 2
			+SubMenu 1 / SubMenu 2:
				+Change SubMenu
				+Hola 3
			+Hola 4
			+Manual entry 1
		
	TODO:
		- Add invisible IDs to entries names (?)
		- Add properties to the object to simplify its use
 */

include(fb.ComponentPath + 'docs\\Flags.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx.js');

function _menu({bSupressDefaultMenu = true, idxInitial = 0, xMenu = 0, yMenu = 0} = {}) {
	var menuArr = [];
	var menuMap = new Map();
	var entryArrTemp = [];
	var entryArr = [];
	var entryMap = new Map();
	var condEntryArr = [];
	var idxMap = new Map();
	var checkMenuMap = new Map();
	var checkMenuArr = [];
	var idx = idxInitial;
	
	// To create new elements
	this.newMenu = (menuName = 'main', subMenuFrom = 'main') => {
		if (menuName == subMenuFrom) {subMenuFrom = '';}
		menuArr.push({menuName: menuName, subMenuFrom: subMenuFrom});
		if (menuArr.length > 1) {entryArr.push({menuName: menuName, subMenuFrom: subMenuFrom, bIsMenu: true});}
		return menuName;
	}
	this.newMenu(); // Default menu
	
	this.newEntry = ({entryText = null, func = null, menuName = menuArr[0].menuName, flags = MF_STRING}) => {
		entryArr.push({entryText: entryText, func: func, menuName: menuName, flags: flags, bIsMenu: false});
		return entryArr[entryArr.length -1];
	}
	
	this.newCheckMenu = (menuName, entryTextA, entryTextB, idxFun) => {
		checkMenuArr.push({menuName: menuName, entryTextA: entryTextA, entryTextB: entryTextB, idxFun: idxFun});
	}
	
	this.newCondEntry = ({entryText = '', condFunc}) => {
		entryArr.push({entryText: entryText, condFunc: condFunc});
		return entryArr[condEntryArr.length -1];
	}

	this.getNumEntries = () => {return entryArr.length;}
	this.getMainMenuName = () => {return menuArr[0].menuName;}
	this.hasMenu = (menuName) => {return menuArr.indexOf(menuName) != -1;}
	
	// Internal
	this.getMenu = (menuName) => {return (!menuName) ? menuMap : menuMap.get(menuName);}
	this.getIdx = (entryText) => {return (!entryText) ? entryMap : entryMap.get(entryText);}
	this.getEntry = (idx) => {return (!idx) ? idxMap : idxMap.get(idx);}
	this.getCheckMenu = (menuName) => {return (!menuName) ? checkMenuMap : checkMenuMap.get(menuName);}
	
	this.createMenu = (menuName = menuArr[0].menuName) => {
		if (_isFunc(menuName)) {menuName = menuName();}
		menuMap.set(menuName, window.CreatePopupMenu());
		return menuMap.get(menuName);
	}
	
	this.addToMenu = ({entryText = null, func = null, menuName = menuArr[0].menuName, flags = MF_STRING}) => {
		if (entryText == 'sep' || entryText == 'separator') {menuMap.get(menuName).AppendMenuSeparator();}
		else {
			idx++;
			if (_isFunc(menuName)) {menuName = menuName();}
			if (_isFunc(flags)) {flags = flags();}
			if (_isFunc(entryText)) {entryText = entryText();}
			menuMap.get(menuName).AppendMenuItem(flags, idx, entryText);
			entryMap.set(entryText, idx);
			idxMap.set(idx, func);
		}
	}
	
	this.checkMenu = (menuName, entryTextA, entryTextB, idxFunc) => {
		checkMenuMap.set(menuName, () => {
			if (_isFunc(menuName)) {menuName = menuName();}
			if (_isFunc(entryTextA)) {entryTextA = entryTextA();}
			if (_isFunc(entryTextB)) {entryTextB = entryTextB();}
			return menuMap.get(menuName).CheckMenuRadioItem(this.getIdx(entryTextA), this.getIdx(entryTextB), this.getIdx(entryTextA) + idxFunc());
		});
	}
	
	this.btn_up = (x, y, object) => {
		// Add conditional entries/menus
		entryArrTemp = [...entryArr]; // Create backup to restore later
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
				const subMenuName = _isFunc(entry.menuName) ? entry.menuName() : entry.menuName;
				if (subMenuName != menuArr[0].menuName) {
					const subMenuFrom = _isFunc(entry.subMenuFrom) ? entry.subMenuFrom() : entry.subMenuFrom;
					this.getMenu(subMenuName).AppendTo(this.getMenu(entry.subMenuFrom), MF_STRING, subMenuName);
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
		// Call other object's menu creation
		if (object && object.hasOwnProperty('btn_up')) {
			object.btn_up(this.getNumEntries()); // The current num of entries may be used to create another menu
		}
		// Find currently selected item
		const currIdx = this.getMenu(menuArr[0].menuName).TrackPopupMenu(x, y);
		let bDone;
		this.getEntry().forEach( (func, entryIdx) => {
			if (entryIdx == currIdx) {
				func();
				return bDone = true;
			}
		});
		// Call other object's menu selection
		if (!bDone && object && object.hasOwnProperty('btn_up_done')) {
			object.btn_up_done(currIdx);
		}
		// Clear all
		this.clear();
		return bSupressDefaultMenu;
	}
	
	this.clear = () => {
		menuMap.clear();
		entryMap.clear();
		idxMap.clear();
		entryArr = [...entryArrTemp];
		entryArrTemp = [];
		idx = 0;
	}
}

// Helper
function _isFunc(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
};