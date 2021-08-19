'use strict';
include('helpers_xxx.js');
include('helpers_xxx_properties.js');
include('helpers_xxx_prototypes.js');
include('menu_xxx.js');

// Menus
const menuRbtn = new _menu();
const menuLbtn = new _menu();
const menuRbtnTop = new _menu();

// on callbacks
function createMenuLeft(forcedIndex = -1) {
	// Constants
	const z = (forcedIndex === -1) ? list.index : forcedIndex; // When delaying menu, the mouse may move to other index...
	list.tooltip.SetValue(null);
	const menu = menuLbtn;
	menu.clear(true); // Reset on every call
	if (z === -1) {
		fb.ShowPopupMessage('Selected index was -1 on createMenuLeft() when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.', window.Name);
		return menu;
	}
	// Helpers
	const isPlsLoaded = () => {return plman.FindPlaylist(list.data[z].nameId) !== -1;};
	const isPlsActive = () => {return plman.GetPlaylistName(plman.ActivePlaylist) !== list.data[z].nameId;};
	const isAutoPls = () => {return list.data[z].isAutoPlaylist;};
	const isLockPls = () => {return list.data[z].isLocked;};
	const isPlsEditable = () => {return list.data[z].extension === '.m3u' || list.data[z].extension === '.m3u8' || list.data[z].extension === '.fpl' || list.data[z].isAutoPlaylist;};
	// Entries
	{	// Load
		// Load playlist within foobar. Only 1 instance allowed
		menu.newEntry({entryText: isPlsLoaded() ? 'Reload playlist (overwrite)' : 'Load playlist', func: () => {list.loadPlaylist(z);}});
		// Show binded playlist
		menu.newEntry({entryText: (isPlsLoaded() && isPlsActive()) ? 'Show binded playlist' : (isPlsLoaded() ? 'Show binded playlist (active playlist)' : 'Show binded playlist (not loaded)'), func: () => {list.showBindedPlaylist(z);}, flags: isPlsLoaded() && isPlsActive() ? MF_STRING : MF_GRAYED});
		menu.newEntry({entryText: 'sep'});
		menu.newEntry({entryText: 'Send selection to playlist', func: () => {
			const selItems = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
			if (selItems && selItems.Count) {
				list.addTracksToPlaylist(z, selItems);
				const index = plman.FindPlaylist(list.data[z].nameId);
				if (index !== -1) {plman.InsertPlaylistItems(index, plman.PlaylistItemCount(index), selItems);}
			}
		}});
		menu.newEntry({entryText: 'sep'});
		// Renames both playlist file and playlist within foobar. Only 1 instance allowed
		menu.newEntry({entryText: (!isLockPls()) ? 'Rename...' : (isAutoPls ? 'Rename...' : 'Rename... (only filename)'), func: () => {
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
						list.editData(list.data[z], {
							name: new_name,
							id: list.bUseUUID ? new_id : '', // May have enabled/disabled UUIDs just before renaming
							nameId: list.bUseUUID ? new_name + new_id : new_name,
						});
						list.update(true, true);
						list.filter();
					} else {
						if (_isFile(list.data[z].path)) {
							// Locked files have the name variable as read only, so we only change the filename. We can not replace old_name with new name since successive renaming steps would not work. We simply strip the filename and replace it with the new name
							let newPath = list.data[z].path.split('.').slice(0,-1).join('.').split('\\').slice(0,-1).concat([new_name]).join('\\') + list.data[z].extension;
							// let newPath = list.data[z].path.replace(old_name + list.data[z].extension, new_name + list.data[z].extension);
							let bRenamedSucessfully = _renameFile(list.data[z].path, newPath);
							if (bRenamedSucessfully) {
								list.editData(list.data[z], {
									path: newPath,
								});
								if (!list.data[z].isLocked) {
									let originalStrings = ['#PLAYLIST:' + old_name, '#UUID:' + old_id];
									let newStrings = ['#PLAYLIST:' + new_name, '#UUID:' + (list.bUseUUID ? new_id : '')];
									let bDone = editTextFile(list.data[z].path, originalStrings, newStrings);
									if (!bDone) {
										fb.ShowPopupMessage('Error renaming playlist file: ' + old_name + ' --> ' + new_name + '\nPath: ' + list.data[z].path, window.Name);
									} else {
										list.editData(list.data[z], {
											name: new_name,
											id: list.bUseUUID ? new_id : '', // May have enabled/disabled UUIDs just before renaming
											nameId: list.bUseUUID ? new_name + new_id : new_name,
										});
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
			menu.newEntry({entryText: 'Edit sort pattern...', func: () => {
				let new_sort = '';
				try {new_sort = utils.InputBox(window.ID, 'Enter sort pattern\n\n(optional)', window.Name, list.data[z].sort);}
				catch(e) {return;}
				let bDone = false;
				if (new_sort !== list.data[z].sort) { // Pattern
					list.editData(list.data[z], {
						sort: new_sort,
					});
					bDone = true;
				}
				if (list.data[z].sort.length) { // And force sorting
					list.editData(list.data[z], {
						bSortForced: WshShell.Popup('Force sort?\n(currently ' + list.data[z].bSortForced + ')', 0, window.Name, popup.question + popup.yes_no) === popup.yes,
					});
					bDone = true;
				}
				if (bDone) {
					list.update(true, true);
					list.filter();
				}
			}, flags: !isLockPls() ? MF_STRING : MF_GRAYED});
			// Change AutoPlaylist query
			menu.newEntry({entryText: 'Edit query...', func: () => {
				let newQuery = '';
				try {newQuery = utils.InputBox(window.ID, 'Enter autoplaylist query', window.Name, list.data[z].query);}
				catch(e) {return;}
				if (!checkQuery(newQuery, false, true)) {fb.ShowPopupMessage('Query not valid:\n' + newQuery, window.Name); return;}
				if (newQuery !== list.data[z].query) {
					list.editData(list.data[z], {
						query: newQuery,
						size: fb.GetQueryItems(fb.GetLibraryItems(), stripSort(newQuery)).Count,
					});
					list.update(true, true);
					list.filter();
				}
			}, flags: !isLockPls() ? MF_STRING : MF_GRAYED});
		} else {
			// Updates playlist file with any new changes on the playlist binded within foobar
			menu.newEntry({entryText: !isLockPls() ? 'Update playlist file' : 'Force playlist file update', func: () => {
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
			menu.newEntry({entryText: isPlsActive() ? 'Bind active playlist to this file' : 'Already binded to active playlist', func: () => {
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
	menu.newEntry({entryText: 'sep'});
	{	// Tags and category
		// Set category
		menu.newEntry({entryText: 'Set category...', func: () => {
			let category = '';
			try {category = utils.InputBox(window.ID, 'Category name (only 1):', window.Name, list.data[z].category !== null ? list.data[z].category : '', true);} 
			catch(e) {return;}
			setCategory(category, list, z);
		}, flags: !isLockPls() &&  isPlsEditable() ? MF_STRING : MF_GRAYED});
		// Set tag(s)
		menu.newEntry({entryText: 'Set playlist tag(s)...', func: () => {
			let tags = '';
			try {tags = utils.InputBox(window.ID, 'Tag(s) Name(s), multiple values separated by \';\' :', window.Name, list.data[z].tags.join(';'), true);} 
			catch(e) {return;}
			tags = tags.split(';').filter(Boolean); // This filters blank values
			setTag(tags, list, z);
		}, flags: !isLockPls() && isPlsEditable() ? MF_STRING : MF_GRAYED});
		// Adds track tag(s)
		menu.newEntry({entryText: 'Automatically add tag(s) to tracks...', func: () => {
			let tags = '';
			const currValue = list.data[z].trackTags && list.data[z].trackTags.length ? JSON.stringify(list.data[z].trackTags) : '';
			try {tags = utils.InputBox(window.ID, 'Enter array of objects: [{"tagName":"tagValue"}]\n\nTagValue may be:\n- String or number.\n- TF expression applied to added track.\n- JS:+Function name (see helpers_xxx_utils.js).', window.Name, currValue, true);} 
			catch(e) {return;}
			if (tags.length) {
				tags = tags.replaceAll('\'\'','"'); // Replace quotes
				try {tags = JSON.parse(tags);} catch(e){fb.ShowPopupMessage('Input is not a valid JSON:\n' + tags, window.Name); return;}
			}
			setTrackTags(tags, list, z);
		}, flags: !isLockPls() && isPlsEditable() ? MF_STRING : MF_GRAYED});
	}
	menu.newEntry({entryText: 'sep'});
	{ // Export and Rel. Paths handling
		menu.newEntry({entryText: 'Force relative paths...', func: () => {
			convertToRelPaths(list, z);
		}, flags: writablePlaylistFormats.has(list.data[z].extension) ? MF_STRING : MF_GRAYED});
		menu.newEntry({entryText: 'Copy playlist file to...', func: () => {
			exportPlaylistFile(list, z);
		}, flags: writablePlaylistFormats.has(list.data[z].extension) ? MF_STRING : MF_GRAYED});
		menu.newEntry({entryText: 'Export and Copy Tracks to...', func: () => {
			exportPlaylistFileWithTracks(list, z);
		}, flags: writablePlaylistFormats.has(list.data[z].extension) ? MF_STRING : MF_GRAYED});
		// Convert
		const presets = JSON.parse(list.properties.converterPreset[1]);
		const subMenuName = menu.newMenu('Export and Convert Tracks to...', void(0), presets.length ? MF_STRING : MF_GRAYED);
		menu.newEntry({menuName: subMenuName, entryText: 'Select a preset:', flags: MF_GRAYED});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		presets.forEach((preset) => {
			const path = preset.path;
			let pathName = (path.length ? '(' + path.split('\\')[0] +'\\) ' + path.split('\\').slice(-2, -1) : '(Folder)')
			const dsp = preset.dsp;
			let dspName = (dsp !== '...' ? dsp  : '(DSP)');
			const tf = preset.tf;
			let tfName = preset.tf;
			if (pathName.length > 20) {pathName = pathName.substr(0, 20);}
			if (dspName.length > 20) {dspName = dspName.substr(0, 20);}
			if (tfName.length > 20) {tfName = tfName.substr(0, 20);}
			menu.newEntry({menuName: subMenuName, entryText: pathName + ': ' + dspName + ' ---> ' + tfName, func: () => {
				exportPlaylistFileWithTracksConvert(list, z, tf, dsp, path);
			}, flags: writablePlaylistFormats.has(list.data[z].extension) ? MF_STRING : MF_GRAYED});
		});
	}
	menu.newEntry({entryText: 'sep'});
	{	// File management
		// Locks playlist file
		menu.newEntry({entryText: !isLockPls() ? 'Lock Playlist (read only)' : 'Unlock Playlist (writeable)', func: () => {
			switchLock(list, z);
		}, flags: isPlsEditable() ? MF_STRING : MF_GRAYED});
		// Deletes playlist file and playlist loaded
		menu.newEntry({entryText: 'Delete', func: () => {list.removePlaylist(z);}});
		menu.newEntry({entryText: 'Open playlist folder', func: () => {
			if (list.data[z] && list.data[z].isAutoPlaylist) {_explorer(list.filename);} // Open AutoPlaylist json file
			else {_explorer(_isFile(list.data[z] ? list.data[z].path : null) ? list.data[z].path : list.playlistsPath);} // Open playlist path
		}});
	}
	return menu;
}

function createMenuRight() {
	// Constants
	const menu = menuRbtn;
	menu.clear(true); // Reset one every call
	// Entries
	{ // New Playlists
		menu.newEntry({entryText: 'Add new empty playlist file...', func: () => {list.add(true);}});
		menu.newEntry({entryText: 'Create new playlist file from active playlist...', func: () => {list.add(false);}});
		menu.newEntry({entryText: 'Add new AutoPlaylist...', func: () => {list.addAutoplaylist();}});
	}
	menu.newEntry({entryText: 'sep'});
	{	// File management
		{	// Refresh
			menu.newEntry({entryText: 'Manual refresh', func: () => {
				let test = new FbProfiler(window.Name + ': ' + 'Manual refresh');
				const z = (list.index !== -1) ? list.index : list.getCurrentItemIndex();
				list.bUpdateAutoplaylist = true; 
				list.update(void(0), true, z); // Forces AutoPlaylist size update according to query and tags
				list.filter();
				test.Print();
			}});
		}
		{	// Restore
			const subMenuName = menu.newMenu('Restore...', void(0), list.deletedItems.length ? MF_STRING : MF_GRAYED);
			if (list.deletedItems.length) {
				list.deletedItems.slice(0, 8).forEach((item, i) => {
					menu.newEntry({menuName: subMenuName, entryText: item.name, func: () => {
						list.addToData(list.deletedItems[i]);
						// Add new category to current view! (otherwise it gets filtered)
						// Easy way: intersect current view + new one with refreshed list
						const categoryState = [...new Set(list.categoryState.concat(list.deletedItems[i].category)).intersection(new Set(list.categories()))];
						if (list.deletedItems[i].isAutoPlaylist) {
							list.update(true, true); // Only paint and save to json
						} else {
							_restoreFile(list.deletedItems[i].path);
							// Revert timestamps
							let newPath = list.deletedItems[i].path.split('.').slice(0,-1).join('.').split('\\');
							const new_name = newPath.pop().split('_ts_')[0];
							newPath = newPath.concat([new_name]).join('\\') + list.deletedItems[i].extension;
							_renameFile(list.deletedItems[i].path, newPath);
							list.update(false, true); // Updates path..
						}
						list.filter({categoryState});
						list.deletedItems.splice(i, 1);
					}});
				});
			}
		}
		{	// Import json
			menu.newEntry({entryText: 'Add playlists from json file...', func: () => {
				list.bUpdateAutoplaylist = true; // Forces AutoPlaylist size update according to query and tags
				list.loadExternalJson();
			}});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{
		// Playlist errors
		const subMenuName = menu.newMenu('Check playlists consistency...');
		menu.newEntry({menuName: subMenuName, entryText: 'Perform checks on all playlists:', flags: MF_GRAYED});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		{	// Absolute/relative paths consistency
			menu.newEntry({menuName: subMenuName, entryText: 'Absolute/relative paths...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check if any of them has absolute and relative paths in the same file. That probably leads to unexpected results when using those playlists in other enviroments.\nDo you want to continue?', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				let found = [];
				list.dataAll.forEach((playlist) => {
					if (!playlist.isAutoPlaylist && playlist.extension !== '.fpl') {
						const filePaths = getFilePathsFromPlaylist(playlist.path);
						if (filePaths.some((path) => {return !(/[A-Z]*:\\/.test(path));}) && filePaths.some((path) => {return (/[A-Z]*:\\/.test(path));})) {found.push(playlist.path);}
					}
				});
				fb.ShowPopupMessage('Found these playlists with mixed relative and absolute paths:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);
			}});
		}
		{	// External items
			menu.newEntry({menuName: subMenuName, entryText: 'External items...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for external items (i.e. items not found on library but present on their paths).\nDo you want to continue?', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				let found = [];
				list.dataAll.forEach((playlist) => {
					if (!playlist.isAutoPlaylist && playlist.extension !== '.fpl') {
						const filePaths = getFilePathsFromPlaylist(playlist.path);
						if (!arePathsInMediaLibrary(filePaths, list.playlistsPath)) {
							const relPathSplit = list.playlistsPath.length ? list.playlistsPath.split('\\').filter(Boolean) : null;
							const bDead = filePaths.some((path) => {
								// Skip streams & look for absolute and relative paths (with and without .\)
								let bCheck = !path.startsWith('http://') && !path.startsWith('http://');
								if (/[A-Z]*:\\/.test(path)) {bCheck = bCheck && !_isFile(path);}
								else {
									let pathAbs = path;
									if (pathAbs.startsWith('.\\')) {pathAbs = pathAbs.replace('.\\', list.playlistsPath);}
									else {relPathSplit.forEach((folder) => {pathAbs = pathAbs.replace('..\\', folder + '\\');});}
									bCheck = bCheck && !_isFile(pathAbs);
								}
								return bCheck;
							});
							if (bDead) {
								found.push(playlist.path + '(contains dead items)');
							} else {
								found.push(playlist.path);
							}
						}
					}
				});
				fb.ShowPopupMessage('Found these playlists with items not present on library:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);
			}});
		}
		{	// Dead items
			menu.newEntry({menuName: subMenuName, entryText: 'Dead items...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for dead items (i.e. items that don\'t exist in their path).\nDo you want to continue?', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				let found = [];
				list.dataAll.forEach((playlist) => {
					if (!playlist.isAutoPlaylist && playlist.extension !== '.fpl') {
						const relPathSplit = list.playlistsPath.length ? list.playlistsPath.split('\\').filter(Boolean) : null;
						const filePaths = getFilePathsFromPlaylist(playlist.path);
						const bDead = filePaths.some((path) => {
							// Skip streams & look for absolute and relative paths (with and without .\)
							let bCheck = !path.startsWith('http://') && !path.startsWith('http://');
							if (/[A-Z]*:\\/.test(path)) {bCheck = bCheck && !_isFile(path);}
							else {
								let pathAbs = path;
								if (pathAbs.startsWith('.\\')) {pathAbs = pathAbs.replace('.\\', list.playlistsPath);}
								else {relPathSplit.forEach((folder) => {pathAbs = pathAbs.replace('..\\', folder + '\\');});}
								bCheck = bCheck && !_isFile(pathAbs);
							}
							return bCheck;
						});
						if (bDead) {found.push(playlist.path);}
					}
				});
				fb.ShowPopupMessage('Found these playlists with dead items:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);
			}});
		}
		{	// Duplicates
			menu.newEntry({menuName: subMenuName, entryText: 'Duplicated items...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for duplicated items (i.e. items that appear multiple times in a playlist).\nDo you want to continue?', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				let found = [];
				list.dataAll.forEach((playlist) => {
					if (!playlist.isAutoPlaylist && playlist.extension !== '.fpl') {
						const filePaths = getFilePathsFromPlaylist(playlist.path);
						if (new Set(filePaths).size !== filePaths.length) {found.push(playlist.path);}
					}
				});
				fb.ShowPopupMessage('Found these playlists with duplicated items:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);
			}});
		}
		{	// Size mismatch
			menu.newEntry({menuName: subMenuName, entryText: 'Playlist size mismatch...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for reported playlist size not matching number of tracks.', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				let found = [];
				list.dataAll.forEach((playlist) => {
					if (!playlist.isAutoPlaylist && playlist.extension !== '.fpl') {
						const filePathsNum = getFilePathsFromPlaylist(playlist.path).length;
						let text = _isFile(playlist.path) ? utils.ReadTextFile(playlist.path).split('\r\n') : void(0);
						let size;
						if (typeof text !== 'undefined' && text.length) {
							let lines = text.length;
							if (playlist.extension === '.m3u8' || playlist.extension === '.m3u') {
								let j = 0;
								while (j < lines) { // Changes size Line
									if (text[j].startsWith('#PLAYLISTSIZE:')) {
										size = Number(text[j].split(':')[1]);
										break;
									}
									j++;
								}
							} else if (playlist.extension === '.pls') {
								let j = 0;
								if (text[lines - 2].startsWith('NumberOfEntries=')) {
									size = Number(text[lines - 2].split('=')[1]);
								}
							}
						}
						if (typeof size === 'undefined') {found.push(playlist.path + '(no size tag found)');}
						else if (filePathsNum !== size) {found.push(playlist.path + '(tag: ' + size + ', paths: ' + filePathsNum + ')');}
					}
				});
				fb.ShowPopupMessage('Found these playlists with size missmatch:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);
			}});
		}
	}
	return menu;
}

function createMenuRightTop() {
	// Constants
	const z = (list.index !== -1) ? list.index : list.getCurrentItemIndex();
	const menu = menuRbtnTop;
	menu.clear(true); // Reset one every call
	// Entries
	{	// Playlist folder
		menu.newEntry({entryText: 'Set playlists folder...', func: () => {
			let input = '';
			try {input = utils.InputBox(window.ID, 'Enter path', window.Name, list.playlistsPath, true);}
			catch (e) {return;}
			if (!input.length) {return;}
			if (input === list.playlistsPath) {return;}
			if (!input.endsWith('\\')) {input += '\\';}
			list.playlistsPath = input;
			let bDone = _isFolder(list.playlistsPath);
			if (!bDone) {bDone = _createFolder(list.playlistsPath);}
			if (!bDone) {
				fb.ShowPopupMessage('Path can not be found or created:\n\'' + list.playlistsPath + '\'', window.Name);
				return;
			}
			// Update property to save between reloads
			list.properties['playlistPath'][1] = list.playlistsPath;
			overwriteProperties(list.properties);
			list.checkConfig();
			let test = new FbProfiler(window.Name + ': ' + 'Manual refresh');
			list.headerTextUpdate();
			list.bUpdateAutoplaylist = true; 
			list.update(void(0), true, z); // Forces AutoPlaylist size update according to query and tags
			list.filter();
			test.Print();
			window.Repaint();
			window.Reload();
		}});
		menu.newEntry({entryText: 'Open playlists folder', func: () => {_explorer(list.playlistsPath);}});
	}
	menu.newEntry({entryText: 'sep'});
	{	// Category Filter
		const subMenuName = menu.newMenu('Categories shown...');
		const options = list.categories();
		const optionsLength = options.length;
		menu.newEntry({menuName: subMenuName, entryText: 'Restore all', func: () => {
			list.filter({categoryState: options});
		}});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		options.forEach((item, i) => {
			menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
				const categoryState = list.categoryState.indexOf(item) !== -1 ? list.categoryState.filter((categ) => {return categ !== item;}) : (item === '(None)' ? ['(None)', ...list.categoryState] : list.categoryState.concat([item]).sort());
				list.filter({categoryState});
			}});
			menu.newCheckMenu(subMenuName, item, void(0), () => {return list.categoryState.indexOf(item) !== -1;});
		});
	}
	{	// Tag Filter
		const subMenuName = menu.newMenu('Tags shown...');
		const options = list.tags();
		const optionsLength = options.length;
		menu.newEntry({menuName: subMenuName, entryText: 'Restore all', func: () => {
			list.filter({tagState: options});
		}});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		options.forEach((item, i) => {
			menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
				const tagState = list.tagState.indexOf(item) !== -1 ? list.tagState.filter((tag) => {return tag !== item;}) : (item === '(None)' ? ['(None)', ...list.tagState] : list.tagState.concat([item]).sort());
				list.filter({tagState});
			}});
			menu.newCheckMenu(subMenuName, item, void(0), () => {return list.tagState.indexOf(item) !== -1;});
		});
	}
	menu.newEntry({entryText: 'sep'});
	{ // List config
		{	// Relative folder
			const subMenuName = menu.newMenu('Save paths relative to folder...');
			const options = ['Yes, relative to playlists folder', 'No, use absolute paths (default)'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'How track\'s paths are written:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			if (optionsLength) {
				options.forEach((item, i) => {
					menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
						list.bRelativePath = (i === 0) ? true : false;
						list.properties['bRelativePath'][1] = list.bRelativePath;
						overwriteProperties(list.properties);
						if (i === 0) {fb.ShowPopupMessage('All new playlists (and those saved from now on) will have their tracks\' paths edited to be relative to:\n\'' + list.playlistsPath + '\'\n\nFor example, for a file like this:\n' + list.playlistsPath + 'Music\\Artist A\\01 - hjk.mp3\n' + '--> .\\Music\\Artist A\\01 - hjk.mp3\n' + '\n\nBeware adding files which are not in a relative path to the playlist folder, they will be added \'as is\' no matter this setting:\n' + 'A:\\OTHER_FOLDER\\Music\\Artist A\\01 - hjk.mp3\n' + '-->A:\\OTHER_FOLDER\\Music\\Artist A\\01 - hjk.mp3\n\nAny playlist using absolute paths will be converted as soon as it gets updated/saved; appart from that, their usage remains the same.\nIf you want to mix relative and absolute playlists on the same tracked folder, you can do it locking the absolute playlists (so they never get overwritten).', window.Name);}
						else {fb.ShowPopupMessage('All new playlists (and those saved from now on) will use absolute paths.\n\nAny playlist using relative paths will be converted as soon as it gets updated/saved; appart from that, their usage remains the same.\nIf you want to mix relative and absolute playlists on the same tracked folder, you can do it locking the relative playlists (so they never get overwritten).', window.Name);}
					}});
				});
				menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bRelativePath ? 0 : 1);});
			}
		}
		{	// Playlist extension
			const subMenuName = menu.newMenu('Change playlist extension (saving)...');
			const options = Array.from(writablePlaylistFormats);
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Writable formats:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			if (optionsLength) {
				options.forEach((item) => {
					menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
						if (item === '.pls') {
							let answer = WshShell.Popup('Are you sure you want to change extension?\n.pls format does not support UUIDs, Lock status, Categories nor Tags.\nUUID will be set to none for all playlists.', 0, window.Name, popup.question + popup.yes_no);
							if (answer !== popup.yes) {return;}
							menu.btn_up(void(0), void(0), void(0), 'Use UUIDs for playlist names...\\' + list.optionsUUID().pop()); // Force UUID change to no UUID using the menu routine
						}
						list.playlistsExtension = item;
						list.properties['extension'][1] = list.playlistsExtension;
						overwriteProperties(list.properties);
					}});
				});
			}
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return options.indexOf(list.playlistsExtension);});
		}
		menu.newEntry({entryText: 'sep'});
		{	// Sorting
			const subMenuName = menu.newMenu('Change sorting method...');
			const options = Object.keys(list.sortMethods());
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Playlist list sorting:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			if (optionsLength) {
				options.forEach((item) => {
					menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
						const previousMethodState = list.methodState;
						list.methodState = item;
						list.sortState = Object.keys(list.sortMethods()[list.methodState])[0];
						// Update properties to save between reloads, but property descriptions change according to list.methodState
						list.properties['methodState'][1] = list.methodState;
						const removeProperties = {SortState: [list.properties['sortState'][0], null]}; // need to remove manually since we change the ID (description)!
						list.properties['sortState'][0] = list.properties['sortState'][0].replace(Object.keys(list.sortMethods()[previousMethodState]).join(','),''); // remove old keys
						list.properties['sortState'][0] += Object.keys(list.sortMethods()[list.methodState]); // add new ones
						list.properties['sortState'][1] = list.sortState; // and change value
						// And set properties
						deleteProperties(removeProperties); // Deletes old properties used as placeholders
						overwriteProperties(list.properties);
						list.sort(void(0), true); // uses current sort state and repaint
					}});
				});
			}
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return options.indexOf(list.methodState);});
		}
		{	// Filtering
			const subMenuName = menu.newMenu('Save filtering between sessions...');
			const options = ['Yes: Always restore last used','No: Reset on startup'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Sorting, category and Playlists view:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bSaveFilterStates = (i === 0) ? true : false;
					list.properties['bSaveFilterStates'][1] = list.bSaveFilterStates;
					overwriteProperties(list.properties);
				}});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bSaveFilterStates ? 0 : 1);});
		}
		menu.newEntry({entryText: 'sep'});
		{	// Playlist Size
			const subMenuName = menu.newMenu('Show Playlist size...');
			const options = ['Yes: And refresh autoplaylists size by query ouput', 'Yes: Only for standard playlists', 'No: Only shown on tooltip'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Track count on parenthesis:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bShowSize = (i <= 1) ? true : false;
					list.properties['bUpdateAutoplaylist'][1] = (i === 0) ? true : false; // True will force a refresh on script loading
					list.properties['bShowSize'][1] = list.bShowSize;
					overwriteProperties(list.properties);
				}});
			});
			//list.bUpdateAutoplaylist changes to false after firing, but the property is constant unless the user changes it...
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.properties['bUpdateAutoplaylist'][1] ? 0 : (list.bShowSize ? 1 : 2));});
		}
		{	// UUID
			const subMenuName = menu.newMenu('Use UUIDs for playlist names...');
			const options = list.optionsUUID();
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'For playlists tracked by Manager:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.optionUUID = item;
					list.properties['optionUUID'][1] = list.optionUUID;
					list.bUseUUID = (i === optionsLength - 1) ? false : true;
					list.properties['bUseUUID'][1] = list.bUseUUID;
					overwriteProperties(list.properties);
					list.updateAllUUID();
				}, flags: (i !== optionsLength - 1 && list.properties['extension'][1] === '.pls') ? MF_GRAYED : MF_STRING}); // Disable UUID for .pls playlists
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return options.indexOf(list.optionUUID);});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{	// Playlist AutoTags & Actions
		const subMenuName = menu.newMenu('Playlist AutoTags and actions');
		menu.newEntry({menuName: subMenuName, entryText: 'Playlist file\'s Tags relatad actions:', flags: MF_GRAYED});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		{
			const subMenuNameTwo = menu.newMenu('Automatically tag loaded playlists with...', subMenuName);
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'Set tags:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'sep', flags: MF_GRAYED});
			const options = ['bAutoLoad', 'bAutoLock'];
			const optionsLength = options.length;
			options.forEach((item, i) => {
				const itemKey = item + 'Tag';
				menu.newEntry({menuName: subMenuNameTwo, entryText: item, func: () => {
					list[itemKey] = !list[itemKey];
					list.properties[itemKey][1] = list[itemKey];
					overwriteProperties(list.properties);
				}});
				menu.newCheckMenu(subMenuNameTwo, item, void(0),  () => {return list[itemKey];});
			});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'sep'});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'Custom tag...', func: () => {
				let tag = '';
				try {tag = utils.InputBox(window.ID, 'Enter tag(s) to be added to playlists on load:\nLeave it blank to deactivate auto-tagging.\n(sep by comma)', window.Name, 'bAutoLoad,bAutoLock', true);}
				catch(e) {return;}
				tag = tag.trim();
				list.bAutoCustomTag = tag.length ? true : false;
				list.properties.bAutoCustomTag[1] = list.bAutoCustomTag;
				list.autoCustomTag = tag.split(',');
				list.properties.autoCustomTag[1] = tag;
				overwriteProperties(list.properties);
			}});
			menu.newCheckMenu(subMenuNameTwo, 'Custom tag...', void(0),  () => {return list.bAutoCustomTag;});
		}
		{
			const subMenuNameTwo = menu.newMenu('Apply actions according to AutoTags...', subMenuName);
			const options = ['Yes: when loading playlists', 'No: ignore them'];
			const optionsLength = options.length;
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuNameTwo, entryText: item, func: () => {
					list.bApplyAutoTags = (i === 0) ? true : false;
					list.properties.bApplyAutoTags[1] = list.bApplyAutoTags;
					overwriteProperties(list.properties);
				}});
			});
			menu.newCheckMenu(subMenuNameTwo, options[0], options[optionsLength - 1],  () => {return (list.bApplyAutoTags ? 0 : 1);});
		}
	}
	{	// Tracks AutoTags
		const subMenuName = menu.newMenu('Tracks AutoTags and actions');
		menu.newEntry({menuName: subMenuName, entryText: 'Track\'s Tags related actions:', flags: MF_GRAYED});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		{
			const subMenuNameTwo = menu.newMenu('Automatically tag added tracks on...', subMenuName);
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'Switch for different playlist types:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'sep', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'Standard playlists', func: () => {
				if (!list.bAutoTrackTagPls) {fb.ShowPopupMessage('Changes on playlist will not be (automatically) saved to the playlist file since it will be locked, but tracks added to it (on foobar) will be automatically tagged.\n\n	Enabling this option may allow to use a playlist only for tagging purposes (for ex. native playlists), not caring at all about saving the changes to the associated files.', window.Name);}
				list.bAutoTrackTagPls = !list.bAutoTrackTagPls;
				list.properties['bAutoTrackTagPls'][1] = list.bAutoTrackTagPls;
				overwriteProperties(list.properties);
			}, flags: list.bAutoTrackTag ? MF_STRING: MF_GRAYED});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'Locked playlists', func: () => {
				if (!list.bAutoTrackTagLockPls) {fb.ShowPopupMessage('Changes on playlist will not be (automatically) saved to the playlist file since it will be locked, but tracks added to it (on foobar) will be automatically tagged.\n\n	Enabling this option may allow to use a playlist only for tagging purposes (for ex. native playlists), not caring at all about saving the changes to the associated files.', window.Name);}
				list.bAutoTrackTagLockPls = !list.bAutoTrackTagLockPls;
				list.properties['bAutoTrackTagLockPls'][1] = list.bAutoTrackTagLockPls;
				overwriteProperties(list.properties);
			}, flags: list.bAutoTrackTag ? MF_STRING: MF_GRAYED});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'AutoPlaylists', func: () => {
				if (!list.bAutoTrackTagAutoPls) {fb.ShowPopupMessage('Enabling this option will automatically tag all tracks retrieved by the AutoPlaylists\' queries.\n\nNote AutoPlaylists only load the tracks when they are loaded within foobar, therefore tagging only happens at that point. AutoPlaylists in the Playlist Manager but not loaded within foobar are omitted.\n\nIt may allow to automatically tag tracks according to some query or other tags (for ex. adding a tag \'Instrumental\' to all \'Jazz\' tracks automatically).\n\nUsing it in a creative way, AutoPlaylists may be used as pools which send tracks to other AutoPlaylists. For ex:\n- AutoPlaylist (A) which tags all \'Surf Rock\' or \'Beat Music\' tracks with \'Summer\'.\n- AutoPlaylist (B) which tags all tracks with from 2021 and rating 4 with \'Summer\'.\n- AutoPlaylist (C) filled with all tracks with a \'playlist\' tag equal to \'Summer\'. As result, this playlist will be filled with tracks from (A) and (C).', window.Name);}
				list.bAutoTrackTagAutoPls = !list.bAutoTrackTagAutoPls;
				list.properties['bAutoTrackTagAutoPls'][1] = list.bAutoTrackTagAutoPls;
				overwriteProperties(list.properties);
			}, flags: list.bAutoTrackTag ? MF_STRING: MF_GRAYED});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'AutoPlaylists (at startup)', func: () => {
				if (!list.bAutoTrackTagAutoPlsInit) {fb.ShowPopupMessage('Enabling this option will also load -internally- all queries from AutoPlaylists at startup to tag their tracks (*)(**)(***).\n\nThis bypasses the natural limit of tagging only applying to loaded AutoPlaylists within foobar, although it will take more time to load the script at startup as consequence.\n\n(*) Only those with tagging set, the rest are not loaded to optimize loading time.\n(**) Note enabling this option will not incur on an additional startup time penalty if you already have \'Show size\' enabled for AutoPlaylists.\n(***) For the same reasons, Autoplaylists which perform tagging will always get their size updated no matter what the \'Show Size\' config is.', window.Name);}
				list.bAutoTrackTagAutoPlsInit = !list.bAutoTrackTagAutoPlsInit;
				list.properties['bAutoTrackTagAutoPlsInit'][1] = list.bAutoTrackTagAutoPlsInit;
				overwriteProperties(list.properties);
			}, flags: list.bAutoTrackTag && list.bAutoTrackTagAutoPls ? MF_STRING: MF_GRAYED});
			menu.newCheckMenu(subMenuNameTwo, 'Standard playlists', void(0),  () => {return list.bAutoTrackTagPls;});
			menu.newCheckMenu(subMenuNameTwo, 'Locked playlists', void(0),  () => {return list.bAutoTrackTagLockPls;});
			menu.newCheckMenu(subMenuNameTwo, 'AutoPlaylists', void(0),  () => {return list.bAutoTrackTagAutoPls;});
			menu.newCheckMenu(subMenuNameTwo, 'AutoPlaylists (at startup)', void(0),  () => {return list.bAutoTrackTagAutoPlsInit;});
		}
		{
			const subMenuNameTwo = menu.newMenu('Enable auto-tagging...', subMenuName);
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'When saving and loading pls', func: () => {
				if (!list.bAutoTrackTag) {fb.ShowPopupMessage('Enables or disables the feature globally (all other options require this one to be switched on).\n\nEnabling this will automatically tag tracks added to playlist according to their set \'Track Tags\'. By default new playlist have none assigned, they must be configured per playlist (*).\n\nAutotagging is done while autosaving, on manual load and/or save.\n\n(*) Use contextual menu.', window.Name);}
				list.bAutoTrackTag = !list.bAutoTrackTag;
				list.properties['bAutoTrackTag'][1] = list.bAutoTrackTag;
				overwriteProperties(list.properties);
			}});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'Also adding tracks without autosave', func: () => {
				if (!list.bAutoTrackTagAlways) {fb.ShowPopupMessage('Auto-tagging is usually done at autosaving step. If autosave is disabled, playlist files will not reflect the changes done within foobar and by default auto-tagging is skipped in that case.\n\nEnabling this option will make the changes to track\'s tags even if automatic playlist saving is disabled.', window.Name);}
				list.bAutoTrackTagAlways = !list.bAutoTrackTagAlways;
				list.properties['bAutoTrackTagAlways'][1] = list.bAutoTrackTagAlways;
				overwriteProperties(list.properties);
			}, flags: list.bAutoTrackTag ? MF_STRING: MF_GRAYED});
			menu.newCheckMenu(subMenuNameTwo, 'When saving and loading pls', void(0),  () => {return list.bAutoTrackTag;});
			menu.newCheckMenu(subMenuNameTwo, 'Also adding tracks without autosave', void(0),  () => {return list.bAutoTrackTagAlways;});
		}
	}
	{	// Export and Converter settings
		{
			const subMenuName = menu.newMenu('Export and convert...');
			menu.newEntry({menuName: subMenuName, entryText: 'Configuration of exporting presets:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			const presets = JSON.parse(list.properties.converterPreset[1]);
			presets.forEach((preset, i) => {
				const path = preset.path;
				let pathName = (path.length ? '(' + path.split('\\')[0] +'\\) ' + path.split('\\').slice(-2, -1) : '(Folder)')
				const dsp = preset.dsp;
				let dspName = (dsp !== '...' ? dsp  : '(DSP)');
				const tf = preset.tf;
				let tfName = preset.tf;
				if (pathName.length > 20) {pathName = pathName.substr(0, 20);}
				if (dspName.length > 20) {dspName = dspName.substr(0, 20);}
				if (tfName.length > 20) {tfName = tfName.substr(0, 20);}
				const subMenuNameTwo = menu.newMenu('Preset ' + (i + 1) + ': ' + pathName + ': ' + dspName + ' ---> ' + tfName, subMenuName);
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'Set DSP preset...', func: () => {
					let input = '';
					try {input = utils.InputBox(window.ID, 'Enter DSP preset name:\n(empty or ... will show converter window)', window.Name, preset.dsp, true);}
					catch(e) {return;}
					if (!input.length) {input = '...';}
					if (input !== preset.dsp) {
						preset.dsp = input;
						list.properties['converterPreset'][1] = JSON.stringify(presets);
						overwriteProperties(list.properties);
					}
				}});
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'Set track filename expression...', func: () => {
					let input = '';
					try {input = utils.InputBox(window.ID, 'Enter TF expression:\n(it should match the one at the converter preset)', window.Name, preset.tf, true);}
					catch(e) {return;}
					if (!input.length) {return;}
					if (input !== preset.tf) {
						preset.tf = input;
						list.properties['converterPreset'][1] = JSON.stringify(presets);
						overwriteProperties(list.properties);
					}
				}});
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'Set default export folder...', func: () => {
					let input = '';
					try {input = utils.InputBox(window.ID, 'Enter destination path:\n(Empty will use the current playlist path)', window.Name, preset.path, true);}
					catch(e) {return;}
					if (!input.endsWith('\\')) {input += '\\';}
					if (input !== preset.path) {
						preset.path = input;
						list.properties['converterPreset'][1] = JSON.stringify(presets);
						overwriteProperties(list.properties);
					}
				}});
			});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			menu.newEntry({menuName: subMenuName, entryText: 'Add new preset', func: () => {
				presets.push({dsp: '...', tf: '%filename%.mp3', path: ''});
				list.properties['converterPreset'][1] = JSON.stringify(presets);
				overwriteProperties(list.properties);
			}});
			const subMenuNameTwo = menu.newMenu('Remove preset...', subMenuName);
			presets.forEach((preset, i) => {
				const path = preset.path;
				let pathName = (path.length ? '(' + path.split('\\')[0] +'\\) ' + path.split('\\').slice(-2, -1) : '(Folder)')
				const dsp = preset.dsp;
				let dspName = (dsp !== '...' ? dsp  : '(DSP)');
				const tf = preset.tf;
				let tfName = preset.tf;
				if (pathName.length > 20) {pathName = pathName.substr(0, 20);}
				if (dspName.length > 20) {dspName = dspName.substr(0, 20);}
				if (tfName.length > 20) {tfName = tfName.substr(0, 20);}
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'Preset ' + (i + 1) + ': ' + pathName + ': ' + dspName + ' ---> ' + tfName, func: () => {
					presets.splice(i, 1);
					list.properties['converterPreset'][1] = JSON.stringify(presets);
					overwriteProperties(list.properties);
				}});
			});
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'sep'})
			menu.newEntry({menuName: subMenuNameTwo, entryText: 'Restore defaults', func: () => {
				const defPresets = [{dsp: '...', tf: '%filename%.mp3', path: ''}];
				list.properties['converterPreset'][1] = JSON.stringify(defPresets);
				overwriteProperties(list.properties);
			}});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{	
		{	// Duplicates handling
			const subMenuName = menu.newMenu('Duplicates handling...');
			const options = ['Skip duplicates when adding new tracks', 'Only warn about it on tooltip'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'When using Shift + L. Click on a playlist:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bForbidDuplicates = (i === 0) ? true : false;
					list.properties['bForbidDuplicates'][1] = list.bForbidDuplicates;
					overwriteProperties(list.properties);
				}});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bForbidDuplicates ? 0 : 1);});
		}
		{	// Dead items handling
			const subMenuName = menu.newMenu('Dead items handling...');
			const options = ['Also check for dead items on auto-saving', 'Only on manual saving or when adding tracks'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Dead items warnings (streams are skipped):', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bDeadCheckAutoSave = (i === 0) ? true : false;
					list.properties['bDeadCheckAutoSave'][1] = list.bDeadCheckAutoSave;
					overwriteProperties(list.properties);
				}});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bDeadCheckAutoSave ? 0 : 1);});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{	// Panel config
		{	// Name/category sep
			const subMenuName = menu.newMenu('Show name/category separators...');
			const options = ['Yes: Dotted line and initials','No: Only shown on tooltip'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'When sorting by name/category:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bShowSep = (i === 0) ? true : false;
					list.properties['bShowSep'][1] = list.bShowSep;
					overwriteProperties(list.properties);
				}});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bShowSep ? 0 : 1);});
		}
		{	// Tooltips
			const subMenuName = menu.newMenu('Show usage info on tooltips...');
			const options = ['Yes: Show shortcuts','No: Only show basic info'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'On playlist and header tooltips:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bShowTips = (i === 0) ? true : false;
					list.properties['bShowTips'][1] = list.bShowTips;
					overwriteProperties(list.properties);
				}});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bShowTips ? 0 : 1);});
		}
		{	// Font size
			const subMenuName = menu.newMenu('Font size...');
			if (panel.list_objects.length || panel.text_objects.length) {
				const options = [...panel.fonts.sizes, 'Other...'];
				const optionsLength = options.length;
				options.forEach((item, index) => {
					menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
						if (index !== optionsLength - 1) {
							if (panel.fonts.size !== item) {
								panel.fonts.size = item;
								// Update property to save between reloads
								panel.properties['fontSize'][1] = item;
								overwriteProperties(panel.properties);
								panel.font_changed();
								window.Repaint();
							}
						} else {
							let input;
							try {input = Number(utils.InputBox(window.ID, 'Input a number :', window.Name, panel.fonts.size, true));} 
							catch(e) {return;}
							if (input === panel.fonts.size) {return;}
							if (!Number.isSafeInteger(input)) {return;}
							panel.fonts.size = input;
							// Update property to save between reloads
							panel.properties['fontSize'][1] = input;
							overwriteProperties(panel.properties);
							panel.font_changed();
							window.Repaint();
						}
					}});
				});
				menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1], () => {
					let idx = options.indexOf(panel.fonts.size);
					return idx !== -1 ? idx : optionsLength - 1;
				});
			}
		}
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
					list.properties['listColours'][1] = coloursString;
					overwriteProperties(list.properties);
					list.checkConfig();
					window.Repaint();
				}});
			});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			{	// Text color
				const subMenuSecondName = menu.newMenu('Standard text...', subMenuName);
				const options = [(window.InstanceType ? 'Use default UI setting' : 'Use columns UI setting'), 'Custom'];
				const optionsLength = options.length;
				options.forEach((item, i) => {
					menu.newEntry({menuName: subMenuSecondName, entryText: item, func: () => {
						panel.colours.bCustomText = i !== 0;
						// Update property to save between reloads
						panel.properties['bCustomText'][1] = panel.colours.bCustomText;
						overwriteProperties(panel.properties);
						panel.colours_changed();
						window.Repaint();
					}});
				});
				menu.newCheckMenu(subMenuSecondName, options[0], options[optionsLength - 1], () => {return panel.colours.bCustomText;});
				menu.newEntry({menuName: subMenuSecondName, entryText: 'sep'});
				menu.newEntry({menuName: subMenuSecondName, entryText: 'Set custom colour...', func: () => {
					panel.colours.customText = utils.ColourPicker(window.ID, panel.colours.customText);
					// Update property to save between reloads
					panel.properties['customText'][1] = panel.colours.customText;
					overwriteProperties(panel.properties);
					panel.colours_changed();
					window.Repaint();
				}, flags: panel.colours.bCustomText ? MF_STRING : MF_GRAYED,});
			}
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			{	// Background color
				const subMenuSecondName = menu.newMenu('Background...', subMenuName);
				if (panel.custom_background) {
					const options = [(window.InstanceType ? 'Use default UI setting' : 'Use columns UI setting'), 'Splitter', 'Custom'];
					const optionsLength = options.length;
					options.forEach((item, i) => {
						menu.newEntry({menuName: subMenuSecondName, entryText: item, func: () => {
							panel.colours.mode = i;
							// Update property to save between reloads
							panel.properties['coloursMode'][1] = panel.colours.mode;
							overwriteProperties(panel.properties);
							window.Repaint();
						}});
					});
					menu.newCheckMenu(subMenuSecondName, options[0], options[optionsLength - 1], () => {return panel.colours.mode;});
					menu.newEntry({menuName: subMenuSecondName, entryText: 'sep'});
					menu.newEntry({menuName: subMenuSecondName, entryText: 'Set custom colour...', func: () => {
						panel.colours.custom_background = utils.ColourPicker(window.ID, panel.colours.custom_background);
						// Update property to save between reloads
						panel.properties['customBackground'][1] = panel.colours.custom_background;
						overwriteProperties(panel.properties);
						window.Repaint();
					}, flags: panel.colours.mode === 2 ? MF_STRING : MF_GRAYED,});
				}
			}
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			menu.newEntry({menuName: subMenuName, entryText: 'Reset all to default', func: () => {
				list.colours = {};
				panel.colours.mode = 0;
				panel.properties['coloursMode'][1] = panel.colours.mode;
				let coloursString = convertObjectToString(list.colours);
				list.properties['listColours'][1] = coloursString;
				panel.colours.bCustomText = false;
				panel.properties['bCustomText'][1] = panel.colours.bCustomText;
				panel.colours_changed();
				overwriteProperties(list.properties);
				list.checkConfig();
				window.Repaint();
			}});
		}
	}
	return menu;
}