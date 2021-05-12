'use strict';
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\menu_xxx.js');

// Menus
const menu_rbtn = new _menu();
const menu_lbtn = new _menu();

// on callbacks
function createMenuLeft(forcedIndex = null) {
	// Constants
	const z = (forcedIndex === null) ? list.index : forcedIndex; // When delaying menu, the mouse may move to other index...
	list.tooltip.SetValue(null);
	const menu = menu_lbtn;
	menu.clear(); // Reset on every call
	// Main
	const menuName = menu.newMenu();
	// Helpers
	const isPlsLoaded = () => {return plman.FindPlaylist(list.data[z].nameId) !== -1;};
	const isPlsActive = () => {return plman.GetPlaylistName(plman.ActivePlaylist) !== list.data[z].nameId;};
	const isAutoPls = () => {return list.data[z].isAutoPlaylist;};
	const isLockPls = () => {return list.data[z].isLocked;};
	// Entries
	{	// Load
		// Load playlist within foobar. Only 1 instance allowed
		menu.newEntry({menuName, entryText: isPlsLoaded() ? 'Reload playlist (overwrite)' : 'Load playlist', func: () => {list.loadPlaylist(z);}});
		// Show binded playlist
		menu.newEntry({menuName, entryText: (isPlsLoaded() && isPlsActive()) ? 'Show binded playlist' : (isPlsLoaded() ? 'Show binded playlist (active playlist)' : 'Show binded playlist (not loaded)'), func: () => {list.showBindedPlaylist(z);}, flags: isPlsLoaded() && isPlsActive() ? MF_STRING : MF_GRAYED});
		menu.newEntry({menuName, entryText: 'sep'});
		// Renames both playlist file and playlist within foobar. Only 1 instance allowed
		menu.newEntry({menuName, entryText: (!isLockPls()) ? 'Rename...' : (isAutoPls ? 'Rename...' : 'Rename... (only filename)'), func: () => {
			let new_name = '';
			try {new_name = utils.InputBox(window.ID, 'Rename playlist', window.Name, list.data[z].name, true);} 
			catch(e) {return;}
			if (!new_name.length) {return;}
			const new_nameId = new_name + ((list.bUseUUID && list.data[z].id.length) ? list.data[z].id : ''); // May have enabled/disabled UUIDs just before renaming
			const old_name = list.data[z].name;
			const old_nameId = list.data[z].nameId;
			const old_id = list.data[z].id;
			const new_id = (list.bUseUUID && old_id.length) ? old_id : nextId(list.optionsUUIDTranslate(), true); // May have enabled/disabled UUIDs just before renaming
			var duplicated = plman.FindPlaylist(new_nameId);
			if (duplicated !== -1) { // Playlist already exists on foobar...
				fb.ShowPopupMessage('You can not have duplicated playlist names within foobar: ' + old_name + '\n' + 'Choose another unique name for renaming.', window.Name);
			// } else if (_isFile(list.data[z].path.replace(old_name,new_name))){ // File already exists on the folder..
				// fb.ShowPopupMessage('You can not have duplicated playlist files on the same folder: ' + old_name + '\n' + 'Choose another unique name for renaming.', window.Name);
			} else {
				delayAutoUpdate();
				if (new_name.length && new_name !== old_name) {
					if (list.data[z].isAutoPlaylist) {
						list.data[z].name = new_name;
						if (list.bUseUUID) { // May have enabled/disabled UUIDs just before renaming
							list.data[z].id = new_id;
							list.data[z].nameId = new_name + list.data[z].id;
						} else {
							list.data[z].id = '';
							list.data[z].nameId = new_name; 
						}
						list.update(true, true);
						list.filter();
					} else {
						if (_isFile(list.data[z].path)) {
							// Locked files have the name variable as read only, so we only change the filename. We can not replace old_name with new name since successive renaming steps would not work. We simply strip the filename and replace it with the new name
							let newPath = list.data[z].path.split('.').slice(0,-1).join('.').split('\\').slice(0,-1).concat([new_name]).join('\\') + list.data[z].extension;
							// let newPath = list.data[z].path.replace(old_name + list.data[z].extension, new_name + list.data[z].extension);
							let bRenamedSucessfully = _renameFile(list.data[z].path, newPath);
							if (bRenamedSucessfully) {
								list.data[z].path = newPath;
								if (!list.data[z].isLocked) {
									let originalStrings = ['#PLAYLIST:' + old_name, '#UUID:' + old_id];
									let newStrings = ['#PLAYLIST:' + new_name, '#UUID:' + (list.bUseUUID ? new_id : '')];
									let bDone = editTextFile(list.data[z].path, originalStrings, newStrings);
									if (!bDone) {
										fb.ShowPopupMessage('Error renaming playlist file: ' + old_name + ' --> ' + new_name + '\nPath: ' + list.data[z].path, window.Name);
									} else {
										list.data[z].name = new_name;
										if (list.bUseUUID) { // May have enabled/disabled UUIDs just before renaming
											list.data[z].id = new_id;
											list.data[z].nameId = new_name + list.data[z].id;
										} else {
											list.data[z].id = '';
											list.data[z].nameId = new_name; 
										}
										list.update_plman(list.data[z].nameId, old_nameId); // Update with new id
										list.update(true, true);
										list.filter();
									}
								} else {
									list.update(true, true);
									list.filter();
								}
							} else {fb.ShowPopupMessage('Error renaming playlist file: ' + old_name + ' --> ' + new_name + '\nPath: ' + list.data[z].path, window.Name);}
						} else {fb.ShowPopupMessage('Playlist file does not exist: ' + list.data[z].name + '\nPath: ' + list.data[z].path, window.Name);}
					}
				}
			}
		}});
	}
	{	// Edit and update
		if (isAutoPls()) {
			// Change AutoPlaylist sort
			menu.newEntry({menuName, entryText: 'Edit sort pattern...', func: () => {
				let new_sort = '';
				try {new_sort = utils.InputBox(window.ID, 'Enter sort pattern\n\n(optional)', window.Name, list.data[z].sort);}
				catch(e) {return;}
				let bDone = false;
				if (new_sort !== list.data[z].sort) { // Pattern
					list.data[z].sort = new_sort;
					bDone = true;
				}
				if (list.data[z].sort.length) { // And force sorting
					list.data[z].bSortForced = WshShell.Popup('Force sort?\n(currently ' + list.data[z].bSortForced + ')', 0, window.Name, popup.question + popup.yes_no) === popup.yes;
					bDone = true;
				}
				if (bDone) {
					list.update(true, true);
					list.filter();
				}
			}, flags: !isLockPls() ? MF_STRING : MF_GRAYED});
			// Change AutoPlaylist query
			menu.newEntry({menuName, entryText: 'Edit query...', func: () => {
				let new_query = '';
				try {new_query = utils.InputBox(window.ID, 'Enter autoplaylist query', window.Name, list.data[z].query);}
				catch(e) {return;}
				if (!checkQuery(new_query, false)) {fb.ShowPopupMessage('Query not valid:\n' + new_query, window.Name); return;}
				if (new_query !== list.data[z].query) {
					list.data[z].query = new_query;
					list.data[z].size = fb.GetQueryItems(fb.GetLibraryItems(), new_query).Count;
					list.update(true, true);
					list.filter();
				}
			}, flags: !isLockPls() ? MF_STRING : MF_GRAYED});
		} else {
			// Updates playlist file with any new changes on the playlist binded within foobar
			menu.newEntry({menuName, entryText: !isLockPls() ? 'Update playlist file' : 'Force playlist file update', func: () => {
				if (_isFile(list.data[z].path)) {
					const old_nameId = list.data[z].nameId;
					const old_name = list.data[z].name;
					const duplicated = getPlaylistIndexArray(old_nameId);
					if (duplicated.length > 1) { // There is more than 1 playlist with same name
						fb.ShowPopupMessage('You have more than one playlist with the same name: ' + old_name + '\n' + 'Please delete any duplicates and leave only the one you want.'  + '\n' + 'The playlist file will be updated according to that unique playlist.', window.Name);
					} else {
						if (list.data[z].isLocked) { // Safety check for locked files (but can be overridden)
							let answer = WshShell.Popup('Are you sure you want to update a locked playlist?\nIt will continue being locked afterwards.', 0, window.Name, popup.question + popup.yes_no);
							if (answer === popup.yes) {
								list.updatePlaylist(z);
							}
						} else { // not locked
							list.updatePlaylist(z);
						}
					}
				} else {fb.ShowPopupMessage('Playlist file does not exist: ' + list.data[z].name + '\nPath: ' + list.data[z].path, window.Name);}
			}, flags: isPlsLoaded() ? MF_STRING : MF_GRAYED});
			// Updates active playlist name to the name set on the playlist file so they get binded and saves playlist content to the file.
			menu.newEntry({menuName, entryText: isPlsActive() ? 'Bind active playlist to this file' : 'Already binded to active playlist', func: () => {
				if (_isFile(list.data[z].path)) {
					const old_nameId = plman.GetPlaylistName(plman.ActivePlaylist);
					const new_nameId = list.data[z].nameId;
					const new_name = list.data[z].name;
					var duplicated = plman.FindPlaylist(new_nameId);
					if (duplicated !== -1) {
						fb.ShowPopupMessage('You already have a playlist loaded on foobar binded to the selected file: ' + new_name + '\n' + 'Please delete that playlist first within foobar if you want to bind the file to a new one.' + '\n' + 'If you try to re-bind the file to its already binded playlist this error will appear too. Use \'Update playlist file\' instead.', window.Name);
					} else {
						list.update_plman(new_nameId, old_nameId);
						list.updatePlaylist(z);
					}
				} else {fb.ShowPopupMessage('Playlist file does not exist: ' + list.data[z].name + '\nPath: ' + list.data[z].path, window.Name);}
			}, flags: isPlsActive() ? MF_STRING : MF_GRAYED});
		}
	}
	menu.newEntry({menuName, entryText: 'sep'});
	{	// Tags and category
		// Adds category
		menu.newEntry({menuName, entryText: 'Add category...', func: () => {
			let category = '';
			try {category = utils.InputBox(window.ID, 'Category name (only 1):', window.Name, list.data[z].category !== null ? list.data[z].category : '', true);} 
			catch(e) {return;}
			if (list.data[z].isAutoPlaylist) {
				list.data[z].category = category;
				list.update(true, true);
				list.filter();
			} else {
				const old_name = list.data[z].name;
				delayAutoUpdate();
				let bDone = editTextFile(list.data[z].path,'#CATEGORY:' + list.data[z].category,'#CATEGORY:' + category);
				if (!bDone) {
					fb.ShowPopupMessage('Error changing category on playlist file: ' + old_name + '\nPath: ' + list.data[z].path, window.Name + '\nCategory: ' + category);
				} else {
					list.data[z].category = category;
					list.update(true, true);
					list.filter();
				}
			}
		}, flags: !isLockPls() ? MF_STRING : MF_GRAYED});
		// Adds tag(s)
		menu.newEntry({menuName, entryText: 'Add tag(s)...', func: () => {
			let tags = '';
			try {tags = utils.InputBox(window.ID, 'Tag(s) Name(s), multiple values separated by \';\' :', window.Name, list.data[z].tags.join(';'), true);} 
			catch(e) {return;}
			tags = tags.split(';').filter(Boolean); // This filters blank values
			if (! new Set(tags).isEqual(new Set(list.data[z].tags))) { // Compares arrays
				if (list.data[z].isAutoPlaylist) {
					list.data[z].tags = tags;
					list.update(true, true);
					list.filter();
				} else {
					const old_name = list.data[z].name;
					if (_isFile(list.data[z].path)) {
						delayAutoUpdate();
						let bDone = editTextFile(list.data[z].path,'#TAGS:' + list.data[z].tags.join(';'),'#TAGS:' + tags.join(';'));
						if (!bDone) {
							fb.ShowPopupMessage('Error changing tag(s) on playlist file: ' + old_name + '\nPath: ' + list.data[z].path, window.Name + '\nTag(s): ' + tags);
						} else {
							list.data[z].tags = tags;
							list.update(true , true);
							list.filter();
						}
					} else {
						fb.ShowPopupMessage('Playlist file does not exist: ' + old_name + '\nPath: ' + list.data[z].path, window.Name);
					}
				}
			}
		}, flags: !isLockPls() ? MF_STRING : MF_GRAYED});
	}
	menu.newEntry({menuName, entryText: 'sep'});
	{	// File management
		// Locks playlist file
		menu.newEntry({menuName, entryText: !isLockPls() ? 'Lock Playlist (read only)' : 'Unlock Playlist (writeable)', func: () => {
			const boolText = list.data[z].isLocked ? ['true','false'] : ['false','true'];
			if (list.data[z].isAutoPlaylist) {
				list.data[z].isLocked = !list.data[z].isLocked;
				list.update(true, true);
				list.filter();
			} else {
				const old_name = list.data[z].name;
				if (_isFile(list.data[z].path)) {
					delayAutoUpdate();
					let bDone = editTextFile(list.data[z].path,'#LOCKED:' + boolText[0],'#LOCKED:' + boolText[1]);
					if (!bDone) {
						fb.ShowPopupMessage('Error changing lock status on playlist file: ' + old_name + '\nPath: ' + list.data[z].path, window.Name);
					} else {
						list.data[z].isLocked = !list.data[z].isLocked;
						list.update(true, true);
						list.filter();
					}
				} else {
					fb.ShowPopupMessage('Playlist file does not exist: ' + old_name + '\nPath: ' + list.data[z].path, window.Name);
				}
			}
		}});
		// Deletes playlist file and playlist loaded
		menu.newEntry({menuName, entryText: 'Delete', func: () => {list.removePlaylist(z);}});
	}
	return menu;
}

function createMenuRight() {
	// Constants
	const z = (list.index !== -1) ? list.index : list.getCurrentItemIndex();
	const menu = menu_rbtn;
	menu.clear(); // Reset one every call
	// Main
	const menuName = menu.newMenu();
	// Entries
	{ // New Playlists
		menu.newEntry({menuName, entryText: 'Add new empty playlist file...', func: () => {list.add(true);}});
		menu.newEntry({menuName, entryText: 'Create new playlist file from active playlist...', func: () => {list.add(false);}});
		menu.newEntry({menuName, entryText: 'Add new AutoPlaylist...', func: () => {list.addAutoplaylist();}});
	}
	menu.newEntry({menuName, entryText: 'sep'});
	{	// File management
		{	// Restore
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
		}
		{	// Refresh
			menu.newEntry({menuName, entryText: 'Manual refresh', func: () => {
				let test = new FbProfiler(window.Name + ': ' + 'Manual refresh');
				list.bUpdateAutoplaylist = true; 
				list.update(void(0), true, z); // Forces AutoPlaylist size update according to query and tags
				list.filter();
				test.Print();
			}});
		}
		{	// Import json	
			menu.newEntry({menuName, entryText: 'Add playlists from json file...', func: () => {
				list.bUpdateAutoplaylist = true; // Forces AutoPlaylist size update according to query and tags
				list.loadExternalJson();
			}});
		}
	}
	menu.newEntry({menuName, entryText: 'sep'});
	{ // List config
		{	// Sorting
			const subMenuName = menu.newMenu('Change sorting method...');
			const options = Object.keys(list.sortMethods());
			const optionsLength = options.length;
			if (optionsLength) {
				options.forEach((item) => {
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
						list.sort(void(0), true); // uses current sort state and repaint
					}});
				});
			}
			menu.checkMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return options.indexOf(list.methodState);});
		}
		{	// Playlist Size
			const subMenuName = menu.newMenu('Show Playlist size...');
			const options = ['Yes: And refresh autoplaylists size by query ouput', 'Yes: Only for standard playlists', 'No: Only shown on tooltip'];
			const optionsLength = options.length;
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bShowSize = (i <= 1) ? true : false;
					list.properties['UpdateAutoplaylist'][1] = (i === 0) ? true : false; // True will force a refresh on script loading
					list.properties['ShowSize'][1] = list.bShowSize;
					overwriteProperties(list.properties);
				}});
			});
			//list.bUpdateAutoplaylist changes to false after firing, but the property is constant unless the user changes it...
			menu.checkMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.properties['UpdateAutoplaylist'][1] ? 0 : (list.bShowSize ? 1 : 2));});
		}
		{	// UUID
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
		{	// Filtering
			const subMenuName = menu.newMenu('Save filtering between sessions...');
			const options = ['Yes: Always restore last used','No: Reset on startup'];
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
		{	// Name/category sep
			const subMenuName = menu.newMenu('Show name/category separators...');
			const options = ['Yes: Dotted line and initials','No: Only shown on tooltip'];
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
	}
	menu.newEntry({menuName, entryText: 'sep'});
	{	// Playlist folder
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
			if (list.data[z] && list.data[z].isAutoPlaylist) {_explorer(list.filename);} // Open AutoPlaylist json file
			else {_explorer(_isFile(list.data[z] ? list.data[z].path : null) ? list.data[z].path : list.playlistsPath);} // Open playlist path
		}});
	}
	menu.newEntry({menuName, entryText: 'sep'});
	{	// Panel config
		{	// List colors
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
		{	// Font size
			const subMenuName = menu.newMenu('Font size...');
			if (panel.list_objects.length || panel.text_objects.length) {
				const options = panel.fonts.sizes;
				const optionsLength = options.length;
				options.forEach((item) => {
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
		{	// Background color
			const subMenuName = menu.newMenu('Background...');
			if (panel.custom_background) {
				const options = [(window.InstanceType ? 'Use default UI setting' : 'Use columns UI setting'), 'Splitter', 'Custom'];
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
	}
	return menu;
}