'use strict';
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\menu_xxx.js');

// Menus
const menu_rbtn = new _menu();
const menu_lbtn = new _menu();

// on callbacks
function createMenuLeft() {
	return;
}

function createMenuRight() {
	// Constants
	const z = (list.index !== -1) ? list.index : list.getCurrentItemIndex();
	const menu = menu_rbtn;
	menu.clear(); // Reset one every call
	// Main
	const menuName = menu.newMenu();
	// Entries
	menu.newEntry({menuName, entryText: 'Add new empty playlist file...', func: () => {list.add(true);}});
	menu.newEntry({menuName, entryText: 'Create new playlist file from active playlist...', func: () => {list.add(false);}});
	menu.newEntry({menuName, entryText: 'Add new AutoPlaylist...', func: () => {list.addAutoplaylist();}});
	menu.newEntry({menuName, entryText: 'sep'});
	{	// Submenu
		const subMenuName = menu.newMenu('Restore...');
		if (list.deleted_items.length) {
			list.deleted_items.slice(0, 8).forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item.name, func: () => {
					list.addToData(list.deleted_items[i]);
					if (list.deleted_items[i].isAutoPlaylist) {
						list.update(true, true); // Only paint and save to json
						list.filter();
					} else {
						_restoreFile(list.deleted_items[i].path);
						// Revert timestamps
						let newPath = list.deleted_items[i].path.split('.').slice(0,-1).join('.').split('\\');
						const new_name = newPath.pop().split('_ts_')[0];
						newPath = newPath.concat([new_name]).join('\\') + list.deleted_items[i].extension;
						_renameFile(list.deleted_items[i].path, newPath);
						list.update(false, true); // Updates path..
						list.filter();
					}
					list.deleted_items.splice(i, 1);
				}});
			});
		}
		menu.newEntry({menuName, entryText: 'sep'});
	}
	menu.newEntry({menuName, entryText: 'Manual refresh', func: () => {
		let test = new FbProfiler(window.Name + ': ' + 'Manual refresh');
		list.bUpdateAutoplaylist = true; 
		list.update(undefined, true, z); // Forces AutoPlaylist size update according to query and tags
		list.filter();
		test.Print();
	}});
	menu.newEntry({menuName, entryText: 'sep'});
	menu.newEntry({menuName, entryText: 'Add playlists from json file...', func: () => {
		list.bUpdateAutoplaylist = true; // Forces AutoPlaylist size update according to query and tags
		list.loadExternalJson();
	}});
	menu.newEntry({menuName, entryText: 'sep'});
	{	// Submenu
		const subMenuName = menu.newMenu('Change sorting method...');
		const options = Object.keys(list.sortMethods());
		const optionsLength = options.length;
		if (optionsLength) {
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					const previousMethodState = list.methodState;
					list.methodState = item;
					list.sortState = Object.keys(list.sortMethods()[list.methodState])[0];
					// Update properties to save between reloads, but property descriptions change according to list.methodState
					list.properties['MethodState'][1] = list.methodState;
					const removeProperties = {SortState: [list.properties['SortState'][0], null]}; // need to remove manually since we change the ID (description)!
					list.properties['SortState'][0] = list.properties['SortState'][0].replace(Object.keys(list.sortMethods()[previousMethodState]).join(','),''); // remove old keys
					list.properties['SortState'][0] += Object.keys(list.sortMethods()[list.methodState]); // add new ones
					list.properties['SortState'][1] = list.sortState; // and change value
					// And set properties
					overwriteProperties(removeProperties); // Deletes old properties used as placeholders
					overwriteProperties(list.properties);
					list.sort(undefined, true); // uses current sort state and repaint
				}});
			});
		}
		menu.checkMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return options.indexOf(list.methodState);});
	}
	{	// Submenu
		const subMenuName = menu.newMenu('Show Playlist size...');
		const options = ['Yes (and refresh autoplaylists size by query ouput)', 'Yes (only for standard playlists)', 'No (only shown on tooltip)'];
		const optionsLength = options.length;
		options.forEach((item, i) => {
			menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
				list.bShowSize = (i <= 1) ? true : false;
				list.properties['UpdateAutoplaylist'][1] = (i == 0) ? true : false; // True will force a refresh on script loading
				list.properties['ShowSize'][1] = list.bShowSize;
				overwriteProperties(list.properties);
			}});
		});
		//list.bUpdateAutoplaylist changes to false after firing, but the property is constant unless the user changes it...
		menu.checkMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.properties['UpdateAutoplaylist'][1] ? 0 : (list.bShowSize ? 1 : 2));});
	}
	{	// Submenu
		const subMenuName = menu.newMenu('Use UUIDs for playlist names...');
		const options = list.optionsUUID();
		const optionsLength = options.length;
		options.forEach((item, i) => {
			menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
				list.optionUUID = item;
				list.properties['OptionUUID'][1] = list.optionUUID;
				list.bUseUUID = (i === optionsLength - 1) ? false : true;
				list.properties['UseUUID'][1] = list.bUseUUID;
				overwriteProperties(list.properties);
				list.updateAllUUID();
			}});
		});
		menu.checkMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return options.indexOf(list.optionUUID);});
	}
	{	// Submenu
		const subMenuName = menu.newMenu('Save filtering between sessions...');
		const options = ['Yes (always restore last used)','No (reset on startup)'];
		const optionsLength = options.length;
		options.forEach((item, i) => {
			menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
				list.bSaveFilterStates = (i === 0) ? true : false;
				list.properties['SaveFilterStates'][1] = list.bSaveFilterStates;
				overwriteProperties(list.properties);
			}});
		});
		menu.checkMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bSaveFilterStates ? 0 : 1);});
	}
	{	// Submenu
		const subMenuName = menu.newMenu('Show name/category separators...');
		const options = ['Yes (dotted line)','No'];
		const optionsLength = options.length;
		options.forEach((item, i) => {
			menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
				list.bShowSep = (i === 0) ? true : false;
				list.properties['ShowSep'][1] = list.bShowSep;
				overwriteProperties(list.properties);
			}});
		});
		menu.checkMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bShowSep ? 0 : 1);});
	}
	menu.newEntry({menuName, entryText: 'sep'});
	menu.newEntry({menuName, entryText: 'Set playlists folder...', func: () => {
		let input = '';
		try {input = utils.InputBox(window.ID, 'Enter path', window.Name, list.playlistsPath, true);}
		catch (e) {return;}
		if (!input.length){return;}
		if (input === list.playlistsPath){return;}
		list.playlistsPath = input;
		let bDone = _isFolder(list.playlistsPath);
		if (!bDone) {bDone = _createFolder(list.playlistsPath);}
		if (!bDone) {
			fb.ShowPopupMessage('Path can not be found or created:\n\'' + list.playlistsPath + '\'', window.Name);
			return;
		}
		// Update property to save between reloads
		list.properties['PlaylistPath'][1] = list.playlistsPath;
		overwriteProperties(list.properties);
		list.checkConfig();
		window.Repaint();
	}});
	menu.newEntry({menuName, entryText: 'Open playlist\'s folder', func: () => {
		if (list.data[z] !== undefined && list.data[z].isAutoPlaylist) {_explorer(list.filename);} // Open AutoPlaylist json file
		else {_explorer(_isFile(list.data[z] !== undefined ? list.data[z].path : null) ? list.data[z].path : list.playlistsPath);} // Open playlist path
	}});
	menu.newEntry({menuName, entryText: 'sep'});
	{	// Submenu
		const subMenuName = menu.newMenu('Set custom colour...');
		const options = ['Autoplaylists...','Locked Playlists...','Selection rectangle...'];
		const optionsLength = options.length;
		options.forEach((item, i) => {
			menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
				if (i === 0) {list.colours.autoPlaylistColour = utils.ColourPicker(window.ID, list.colours.autoPlaylistColour);}
				if (i === 1) {list.colours.lockedPlaylistColour = utils.ColourPicker(window.ID, list.colours.lockedPlaylistColour);}
				if (i === 2) {list.colours.selectedPlaylistColour = utils.ColourPicker(window.ID, list.colours.selectedPlaylistColour);}
				// Update property to save between reloads
				let coloursString = convertObjectToString(list.colours);
				list.properties['ListColours'][1] = coloursString;
				overwriteProperties(list.properties);
				list.checkConfig();
				window.Repaint();
			}});
		});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		menu.newEntry({menuName: subMenuName, entryText: 'Reset all to default', func: () => {list.colours = {};}});
	}
	{	// Submenu
		const subMenuName = menu.newMenu('Font size...');
		if (panel.list_objects.length || panel.text_objects.length) {
			const options = panel.fonts.sizes;
			const optionsLength = options.length;
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					panel.fonts.size = item;
					// Update property to save between reloads
					panel.properties['fontSize'][1] = panel.fonts.size;
					overwriteProperties(panel.properties);
					panel.font_changed();
					window.Repaint();
				}});
			});
			menu.checkMenu(subMenuName, options[0], options[optionsLength - 1], () => {return panel.fonts.sizes.indexOf(panel.fonts.size);});
		}
	}
	{	// Submenu
		const subMenuName = menu.newMenu('Background...');
		if (panel.custom_background) {
			const options = [(window.InstanceType ? 'Use default UI setting' : 'Use columns UI setting'), 'Splitter', 'Custom']
			const optionsLength = options.length;
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					panel.colours.mode = i;
					// Update property to save between reloads
					panel.properties['coloursMode'][1] = panel.colours.mode;
					overwriteProperties(panel.properties);
					window.Repaint();
				}});
			});
			menu.checkMenu(subMenuName, options[0], options[optionsLength - 1], () => {return panel.colours.mode;});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			menu.newEntry({menuName: subMenuName, entryText: 'Set custom colour...', func: () => {
				panel.colours.custom_background = utils.ColourPicker(window.ID, panel.colours.custom_background);
				// Update property to save between reloads
				panel.properties['customBackground'][1] = panel.colours.custom_background;
				overwriteProperties(panel.properties);
				window.Repaint();
			}, flags: panel.colours.mode === 2 ? MF_STRING : MF_GRAYED,});
		}
	}
	return menu;
}