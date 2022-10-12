'use strict';
//12/10/22

include('helpers_xxx.js');
include('helpers_xxx_properties.js');
include('helpers_xxx_prototypes.js');
include('playlist_manager_helpers.js');
include('playlist_manager_listenbrainz.js');
include('menu_xxx.js');

// Menus
const menuRbtn = new _menu();
const menuLbtn = new _menu();
const menuLbtnMult = new _menu();
const menuRbtnTop = new _menu();
const menuRbtnSort = new _menu();

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
	const pls = list.data[z];
	if (!pls) {
		fb.ShowPopupMessage('Selected playlist was null when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.', window.Name);
		return menu;
	}
	const autoTags = ['bAutoLoad', 'bAutoLock', 'bMultMenu'];
	const lb = listenBrainz;
	// Helpers
	const isPlsLoaded = () => {return plman.FindPlaylist(pls.nameId) !== -1;};
	const isPlsActive = () => {return plman.GetPlaylistName(plman.ActivePlaylist) !== pls.nameId;};
	const isAutoPls = () => {return pls.isAutoPlaylist || pls.query;};
	const isLockPls = () => {return pls.isLocked;};
	const isPlsEditable = () => {return pls.extension === '.m3u' || pls.extension === '.m3u8' || pls.extension === '.xspf' || pls.extension === '.fpl'  || pls.extension === '.xsp' || pls.isAutoPlaylist;};
	const isPlsLockable = () => {return isPlsEditable() || pls.extension === '.strm';};
	const isPlsUI = () => {return pls.extension === '.ui';};
	// Evaluate
	const bIsPlsLoaded = isPlsLoaded();
	const bIsPlsActive = isPlsActive();
	const bIsAutoPls = isAutoPls();
	const bIsLockPls = isLockPls();
	const bIsPlsEditable = isPlsEditable();
	const bIsPlsLockable = isPlsLockable();
	const bIsPlsUI = isPlsUI();
	const bWritableFormat = writablePlaylistFormats.has(pls.extension);
	const bListenBrainz = list.properties.lBrainzToken[1].length > 0;
	// Header
	if (list.bShowMenuHeader) {
		menu.newEntry({entryText: '--- ' + (bIsAutoPls ? (pls.extension === '.xsp' ? 'Smart Playlist' :'AutoPlaylist'): pls.extension + ' Playlist') + ': ' + pls.name + ' ---', flags: MF_GRAYED});
		menu.newEntry({entryText: 'sep'});
	}
	// Entries
	{	// Load
		// Load playlist within foobar. Only 1 instance allowed
		menu.newEntry({entryText: bIsPlsLoaded ? 'Reload playlist (overwrite)' : 'Load playlist', func: () => {list.loadPlaylist(z);}, flags: bIsPlsUI ? MF_GRAYED : MF_STRING});
		// Show binded playlist
		menu.newEntry({entryText: (bIsPlsLoaded && bIsPlsActive) ? 'Show binded playlist' : (bIsPlsLoaded ? 'Show binded playlist (active playlist)' : 'Show binded playlist (not loaded)'), func: () => {list.showBindedPlaylist(z);}, flags: bIsPlsLoaded && bIsPlsActive ? MF_STRING : MF_GRAYED});
		menu.newEntry({entryText: 'sep'});
		const selItems = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
		menu.newEntry({entryText: 'Send selection to playlist', func: () => {
			if (selItems && selItems.Count) {
				list.sendSelectionToPlaylist({playlistIndex: z, bCheckDup: true});
			}
		}, flags: !bIsAutoPls && !bIsLockPls && (bWritableFormat || bIsPlsUI) && selItems.Count ? MF_STRING : MF_GRAYED});
		menu.newEntry({entryText: 'sep'});
		// Renames both playlist file and playlist within foobar. Only 1 instance allowed
		menu.newEntry({entryText: (!bIsLockPls) ? 'Rename...' : (bIsAutoPls ? 'Rename...' : 'Rename... (only filename)'), func: () => {
			let newName = '';
			try {newName = utils.InputBox(window.ID, 'Rename playlist', window.Name, pls.name, true);} 
			catch(e) {return;}
			if (!newName.length) {return;}
			renamePlaylist(list, z, newName);
		}});
	}
	{	// Edit and update
		if (isAutoPls()) {
			// Change AutoPlaylist sort
			menu.newEntry({entryText: 'Edit sort pattern...', func: () => {
				let newSort = '';
				try {newSort = utils.InputBox(window.ID, 'Enter sort pattern\n\n(optional)', window.Name, pls.sort);}
				catch(e) {return;}
				let bDone = false;
				if (newSort !== pls.sort) { // Pattern
					list.editData(pls, {
						sort: newSort,
					});
					bDone = true;
				}
				if (pls.sort.length) { // And force sorting
					list.editData(pls, {
						bSortForced: pls.extension === '.xsp' ? false : WshShell.Popup('Force sort?\n(currently ' + pls.bSortForced + ')', 0, window.Name, popup.question + popup.yes_no) === popup.yes,
					});
					bDone = true;
				}
				if (bDone) {bDone = pls.extension === '.xsp' ? rewriteXSPSort(pls, newSort) : true;}
				if (bDone) {
					list.update(true, true);
					list.filter();
				}
			}, flags: !bIsLockPls ? MF_STRING : MF_GRAYED});
			// Change AutoPlaylist query
			menu.newEntry({entryText: 'Edit query...', func: () => {
				let newQuery = '';
				try {newQuery = utils.InputBox(window.ID, 'Enter autoplaylist query', window.Name, pls.query);}
				catch(e) {return;}
				const bPlaylist = newQuery.indexOf('#PLAYLIST# IS') !== -1;
				if (!bPlaylist && !checkQuery(newQuery, false, true)) {fb.ShowPopupMessage('Query not valid:\n' + newQuery, window.Name); return;}
				if (newQuery !== pls.query) {
					const bDone = pls.extension === '.xsp' ? rewriteXSPQuery(pls, newQuery) : true;
					if (bDone) {
						list.editData(pls, {
							query: newQuery,
							size: bPlaylist ? '?' : fb.GetQueryItems(fb.GetLibraryItems(), stripSort(newQuery)).Count,
						});
						list.update(true, true);
						list.filter();
					}
				}
			}, flags: !bIsLockPls ? MF_STRING : MF_GRAYED});
			if (pls.extension === '.xsp') {
				menu.newEntry({entryText: 'Edit limit...', func: () => {
					let input = '';
					try {input = Number(utils.InputBox(window.ID, 'Enter number of tracks', window.Name, pls.limit, true));}
					catch(e) {return;}
					if (isNaN(input)) {return;}
					if (!Number.isFinite(input)) {input = 0;}
					if (input !== pls.limit) {
						const bDone = rewriteXSPLimit(pls, input);
						if (bDone) {
							list.editData(pls, {
								limit: input,
							});
							list.update(true, true);
							list.filter();
						}
					}
				}, flags: !bIsLockPls ? MF_STRING : MF_GRAYED});
			}
		} else {
			// Updates playlist file with any new changes on the playlist binded within foobar
			menu.newEntry({entryText: !bIsLockPls ? 'Update playlist file' : 'Force playlist file update', func: () => {
				if (_isFile(pls.path)) {
					const oldNameId = pls.nameId;
					const oldName = pls.name;
					const duplicated = getPlaylistIndexArray(oldNameId);
					if (duplicated.length > 1) { // There is more than 1 playlist with same name
						fb.ShowPopupMessage('You have more than one playlist with the same name: ' + oldName + '\n' + 'Please delete any duplicates and leave only the one you want.'  + '\n' + 'The playlist file will be updated according to that unique playlist.', window.Name);
					} else {
						let answer = popup.yes;
						if (pls.isLocked) { // Safety check for locked files (but can be overridden)
							answer = WshShell.Popup('Are you sure you want to update a locked playlist?\nIt will continue being locked afterwards.', 0, window.Name, popup.question + popup.yes_no);
						}
						if (answer === popup.yes) {list.updatePlaylist({playlistIndex: z});}
					}
				} else {fb.ShowPopupMessage('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name);}
			}, flags: bIsPlsLoaded && !bIsPlsUI ? MF_STRING : MF_GRAYED});
			// Updates active playlist name to the name set on the playlist file so they get binded and saves playlist content to the file.
			menu.newEntry({entryText: bIsPlsActive ? 'Bind active playlist to this file' : 'Already binded to active playlist', func: () => {
				if (_isFile(pls.path)) {
					const oldNameId = plman.GetPlaylistName(plman.ActivePlaylist);
					const newNameId = pls.nameId;
					const newName = pls.name;
					var duplicated = plman.FindPlaylist(newNameId);
					if (duplicated !== -1) {
						fb.ShowPopupMessage('You already have a playlist loaded on foobar binded to the selected file: ' + newName + '\n' + 'Please delete that playlist first within foobar if you want to bind the file to a new one.' + '\n' + 'If you try to re-bind the file to its already binded playlist this error will appear too. Use \'Update playlist file\' instead.', window.Name);
					} else {
						list.updatePlman(newNameId, oldNameId);
						const bDone = list.updatePlaylist({playlistIndex: z});
						if (!bDone) {list.updatePlman(oldNameId, newNameId);} // Reset change
					}
				} else {fb.ShowPopupMessage('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name);}
			}, flags: bIsPlsActive  && !bIsLockPls && bWritableFormat ? MF_STRING : MF_GRAYED});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{	// Tags and category
		{	// Set category
			const menuName = menu.newMenu('Set category...', void(0), !bIsLockPls &&  bIsPlsEditable ? MF_STRING : MF_GRAYED);
			menu.newEntry({menuName, entryText: 'New category...', func: () => {
				let category = '';
				try {category = utils.InputBox(window.ID, 'Category name (only 1):', window.Name, pls.category !== null ? pls.category : '', true);} 
				catch(e) {return;}
				if (pls.category !== category) {setCategory(category, list, z);}
			}});
			menu.newEntry({menuName, entryText: 'sep'});
			list.categories().forEach((category, i) => {
				menu.newEntry({menuName, entryText: category, func: () => {
					if (pls.category !== category) {setCategory(i ? category : '', list, z);}
				}});
				menu.newCheckMenu(menuName, category, void(0), () => {return (pls.category === (i ? category : ''));});
			});
		}
		{	// Set tag(s)
			const menuName = menu.newMenu('Set playlist tag(s)...', void(0), !bIsLockPls &&  bIsPlsEditable ? MF_STRING : MF_GRAYED);
			menu.newEntry({menuName, entryText: 'New tag(s)...', func: () => {
				let tags = '';
				try {tags = utils.InputBox(window.ID, 'Tag(s) Name(s), multiple values separated by \';\' :', window.Name, pls.tags.join(';'), true);} 
				catch(e) {return;}
				tags = tags.split(';').filter(Boolean); // This filters blank values
				if (!isArrayEqual(pls.tags, tags)) {setTag(tags, list, z);}
			}});
			menu.newEntry({menuName, entryText: 'sep'});
			list.tags().concat(['sep', ...autoTags]).forEach((tag, i) => {
				menu.newEntry({menuName, entryText: tag, func: () => {
					let tags;
					if (i === 0) {tags = [];}
					else if (pls.tags.indexOf(tag) !== -1) {tags = [...new Set(pls.tags).difference(new Set([tag]))];} 
					else {tags = [...pls.tags, tag];}
					setTag(tags, list, z);
				}});
				menu.newCheckMenu(menuName, tag, void(0), () => {return (i ? pls.tags.indexOf(tag) !== -1 : pls.tags.length === 0);});
			});
		}
		// Adds track tag(s)
		menu.newEntry({entryText: 'Automatically add tag(s) to tracks...', func: () => {
			let tags = '';
			const currValue = pls.trackTags && pls.trackTags.length ? JSON.stringify(pls.trackTags) : '';
			try {tags = utils.InputBox(window.ID, 'Enter data json-formatted: [{"tagName":"tagValue"}]\n\nTagValue may be:\n- String or number (doesn\'t need quotes).\n- TF expression applied to added track.\n- JS:+Function name (see helpers_xxx_utils.js).\n\nFor ex: [{"Mood":"Chill"}] or [{"Rating":5}]', window.Name, currValue, true);} 
			catch(e) {return;}
			if (tags.length) {
				tags = tags.replaceAll('\'\'','"'); // Replace quotes
				try {tags = JSON.parse(tags);} catch(e){fb.ShowPopupMessage('Input is not a valid JSON:\n' + tags, window.Name); return;}
			}
			if (tagsString !== currValue) {setTrackTags(tags, list, z);}
		}, flags: !bIsLockPls && bIsPlsEditable ? MF_STRING : MF_GRAYED});
	}
	menu.newEntry({entryText: 'sep'});
	{	// Export and clone
		//	AutoPlaylists clone
		if (bIsAutoPls) { // For XSP playlists works the same as being an AutoPlaylist!
			menu.newEntry({entryText: 'Clone as standard playlist...', func: () => {
				cloneAsStandardPls(list, z, (pls.isAutoPlaylist && list.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls) ? list.removeDuplicatesAutoPls.split(',').filter((n) => n) : []);
			}, flags: bIsAutoPls ? MF_STRING : MF_GRAYED});
			menu.newEntry({entryText: 'Clone AutoPlaylist and edit...', func: () => { // Here creates a foobar autoplaylist no matter the original format
				cloneAsAutoPls(list, z);
			}, flags: bIsAutoPls ? MF_STRING : MF_GRAYED});
			menu.newEntry({entryText: 'Export as json file...', func: () => {
				const path = list.exportJson({idx: z});
				if (_isFile(path)) {_explorer(path);}
			}, flags: bIsAutoPls ? MF_STRING : MF_GRAYED});
			if (pls.extension === '.xsp') {
				// Copy
				menu.newEntry({entryText: 'Copy playlist file to...', func: () => {
					exportPlaylistFile(list, z);
				}, flags: loadablePlaylistFormats.has(pls.extension) ? MF_STRING : MF_GRAYED});
			}
		} else {	// Export and Rel. Paths handling
			// Rel Paths
			menu.newEntry({entryText: 'Force relative paths...', func: () => {
				convertToRelPaths(list, z);
			}, flags: bWritableFormat && !bIsLockPls ? MF_STRING : MF_GRAYED});
			// Clone as
			{
				const presets = [...writablePlaylistFormats, 'sep', '.ui'];
				const subMenuName = menu.newMenu('Clone as...');
				menu.newEntry({menuName: subMenuName, entryText: 'Select a format:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuName, entryText: 'sep'});
				presets.forEach((ext) => {
					const entryText = ext === '.ui' ? 'Clone in UI' : ext;
					if (ext === 'sep') {menu.newEntry({menuName: subMenuName, entryText, flags: MF_GRAYED}); return;}
					menu.newEntry({menuName: subMenuName, entryText, func: () => {
						clonePlaylistFile(list, z, ext);
					}});
				});
			}
			// Copy
			menu.newEntry({entryText: 'Copy playlist file to...', func: () => {
				exportPlaylistFile(list, z);
			}, flags: loadablePlaylistFormats.has(pls.extension) ? MF_STRING : MF_GRAYED});
			// Export and copy
			menu.newEntry({entryText: 'Export and Copy Tracks to...', func: () => {
				exportPlaylistFileWithTracks(list, z, void(0), list.properties['bCopyAsync'][1]);
			}, flags: bWritableFormat ? MF_STRING : MF_GRAYED});
		}
		{	// Export and Convert
			const presets = JSON.parse(list.properties.converterPreset[1]);
			const flags = bWritableFormat || bIsPlsUI || bIsAutoPls? MF_STRING : MF_GRAYED;
			const subMenuName = menu.newMenu('Export and Convert Tracks to...', void(0), presets.length ? flags : MF_GRAYED);
			menu.newEntry({menuName: subMenuName, entryText: 'Select a preset:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			presets.forEach((preset) => {
				const path = preset.path;
				let pathName = (path.length ? '(' + path.split('\\')[0] +'\\) ' + path.split('\\').slice(-2, -1) : '(Folder)');
				const dsp = preset.dsp;
				let dspName = (dsp !== '...' ? dsp  : '(DSP)');
				const tf = preset.tf;
				let tfName = preset.hasOwnProperty('name') && preset.name.length ? preset.name : preset.tf;
				const extension = preset.hasOwnProperty('extension') && preset.extension.length ? preset.extension : '';
				const extensionName = extension.length ? '[' + extension + ']' : '';
				if (pathName.length > 20) {pathName = pathName.substr(0, 20) + '...';}
				if (dspName.length > 20) {dspName = dspName.substr(0, 20) + '...';}
				if (tfName.length > 40) {tfName = tfName.substr(0, 40) + '...';}
				menu.newEntry({menuName: subMenuName, entryText: pathName + extensionName + ': ' + dspName + ' ---> ' + tfName, func: () => {
					const remDupl = list.bRemoveDuplicatesAutoPls ? list.removeDuplicatesAutoPls.split(',').filter((n) => n) : [];
					if (!pls.isAutoPlaylist) {
						exportPlaylistFileWithTracksConvert(list, z, tf, dsp, path, extension, remDupl);
					} else {
						exportAutoPlaylistFileWithTracksConvert(list, z, tf, dsp, path, extension, remDupl);
					}
				}, flags});
			});
		}
		{	// Export to ListenBrainz
			const subMenuName = menu.newMenu('Online sync...', void(0));
			menu.newEntry({menuName: subMenuName, entryText: 'Export to ListenBrainz' + (bListenBrainz ? '' : '\t(token not set)'), func: async () => {
				if (!await checkLBToken()) {return false;}
				let bUpdateMBID = false;
				let playlist_mbid = '';
				const bLookupMBIDs = list.properties.bLookupMBIDs[1];
				const token = bListenBrainz ? lb.decryptToken({lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1]}) : null;
				if (!token) {return false;}
				if (pls.playlist_mbid.length) {
					console.log('Syncing playlist with MusicBrainz: ' + pls.name);
					playlist_mbid = await lb.syncPlaylist(pls, list.playlistsPath, token, bLookupMBIDs);
					if (pls.playlist_mbid !== playlist_mbid) {bUpdateMBID = true; fb.ShowPopupMessage('Playlist had an MBID but no playlist was found with such MBID on server.\nA new one has been created. Check console.', window.Name);}
				} else {
					console.log('Exporting playlist to MusicBrainz: ' + pls.name);
					playlist_mbid = await lb.exportPlaylist(pls, list.playlistsPath, token, bLookupMBIDs);
					if (playlist_mbid && typeof playlist_mbid === 'string' && playlist_mbid.length) {bUpdateMBID = true;} 
				}
				if (!playlist_mbid || typeof playlist_mbid !== 'string' || !playlist_mbid.length) {fb.ShowPopupMessage('There were some errors on playlist syncing. Check console.', window.Name);}
				if (bUpdateMBID && bWritableFormat) {setPlaylist_mbid(playlist_mbid, list, pls);}
			}, flags: bListenBrainz ? MF_STRING : MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'Import from ListenBrainz' + (bListenBrainz ? '' : '\t(token not set)'), func: async () => {
				if (!await checkLBToken()) {return false;}
				let bDone = false;
				if (_isFile(pls.path)) {
					const token = bListenBrainz ? lb.decryptToken({lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1]}) : null;
					if (!token) {return false;}
					const jspf = await lb.importPlaylist(pls, token);
					if (jspf) {
						const handleList = contentResolver(jspf);
						if (handleList) {
							if (jspf.playlist.track.length !== handleList.Count) {
								const answer = WshShell.Popup('Some imported tracks have not been found on library (see console).\nDo you want to continue (omitting not found items)?', 0, window.Name, popup.question + popup.yes_no);
								if (answer === popup.no) {return false;}
							}
							if (pls.isLocked) { // Safety check for locked files (but can be overridden)
								let answer = WshShell.Popup('Are you sure you want to update a locked playlist?\nIt will continue being locked afterwards.', 0, window.Name, popup.question + popup.yes_no);
								if (answer === popup.no) {return false;}
							}
							const backPath = pls.path + '.back';
							_renameFile(pls.path, backPath);
							const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
							bDone = savePlaylist({handleList, playlistPath: pls.path, ext: pls.extension, playlistName: pls.name, bLocked: pls.isLocked, category: pls.category, tags: pls.tags, trackTags: pls.trackTags, playlist_mbid: pls.playlist_mbid, bBOM: list.bBOM});
							// Restore backup in case something goes wrong
							if (!bDone) {console.log('Failed saving playlist: ' + pls.path); _deleteFile(pls.path); _renameFile(backPath, pls.path);}
							else if (_isFile(backPath)) {_deleteFile(backPath);}
							if (bDone && bIsPlsLoaded) {sendToPlaylist(handleList, pls.name);}
							clearInterval(delay);
						}
					}
				} else {console.log('Playlist file not found: ' + pls.path);}
				if (!bDone) {fb.ShowPopupMessage('There were some errors on playlist syncing. Check console.', window.Name);}
				return bDone;
			}, flags: pls.playlist_mbid.length && bWritableFormat ? (bListenBrainz ? MF_STRING : MF_GRAYED) : MF_GRAYED});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{	// File management
		// Locks playlist file
		if (!bIsPlsUI) {
			menu.newEntry({entryText: !bIsLockPls ? 'Lock Playlist (read only)' : 'Unlock Playlist (writable)', func: () => {
				switchLock(list, z);
			}, flags: bIsPlsLockable ? MF_STRING : MF_GRAYED});
		}
		// Locks UI playlist
		if (bIsPlsUI || bIsPlsLoaded) {
			const lockTypes = ['AddItems', 'RemoveItems', 'ReplaceItems', 'ReorderItems', 'RenamePlaylist', 'RemovePlaylist', 'ExecuteDefaultAction'];
			const defaultLockTypes = lockTypes.slice(0, 4);
			const index = plman.FindPlaylist(pls.nameId);
			const playlistLockTypes = new Set(plman.GetPlaylistLockedActions(index));
			const lockName = plman.GetPlaylistLockName(index);
			const bSMPLock = lockName === 'foo_spider_monkey_panel' || !lockName;
			const bLocked = !bSMPLock || playlistLockTypes.size;
			const flags = bSMPLock ? MF_STRING: MF_GRAYED;
			const entryText = 'Edit UI Playlist lock' + (!bSMPLock ? ' ' + _p(lockName) : '');
			menu.newEntry({entryText, func: () => {
				let newLock = '';
				const oldLock = (bLocked ? [...playlistLockTypes] : []);
				try {newLock = utils.InputBox(window.ID, 'Lock types, multiple values separated by \',\':\n\n' + _p(lockTypes.joinEvery(', ', 4)), window.Name, oldLock.join(','), true);} 
				catch(e) {return;}
				newLock = [...new Set(newLock.split(/;|,/g)).intersection(lockTypes)]; // This filters blank values
				if (!isArrayEqual(newLock, oldLock)) {plman.SetPlaylistLockedActions(index, newLock);}
			}, flags});
		}
		menu.newEntry({entryText: 'sep'});
		// Deletes playlist file and playlist loaded
		menu.newEntry({entryText: 'Delete', func: () => {list.removePlaylist(z);}});
		menu.newEntry({entryText: 'Open file on explorer', func: () => {
			if (pls.isAutoPlaylist) {_explorer(list.filename);} // Open AutoPlaylist json file
			else {_explorer(_isFile(pls.path) ? pls.path : list.playlistsPath);} // Open playlist path
		}, flags: !bIsPlsUI ? MF_STRING : MF_GRAYED});
	}
	return menu;
}

// on callbacks
function createMenuLeftMult(forcedIndexes = []) {
	// Constants
	const indexes = forcedIndexes.length === 0 ? [...list.indexes] : [...forcedIndexes]; // When delaying menu, the mouse may move to other index...
	list.tooltip.SetValue(null);
	const menu = menuLbtnMult;
	menu.clear(true); // Reset on every call
	if (indexes.length === 0) {
		fb.ShowPopupMessage('Selected indexes wwere empty on createMenuLeftMult() when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.', window.Name);
		return menu;
	}
	const playlists = [];
	indexes.forEach((z, i) => {
		playlists.push(list.data[z]);
		if (!playlists[i]) {
			fb.ShowPopupMessage('Selected playlist was null when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.', window.Name);
			return menu;
		}
	});
	const autoTags = ['bAutoLoad', 'bAutoLock', 'bMultMenu'];	
	const playlistsUI = playlists.filter((pls) => {return pls.extension === '.ui';});
	// Helpers
	const isPlsLoaded = (pls) => {return plman.FindPlaylist(pls.nameId) !== -1;};
	const isPlsActive = (pls) => {return plman.GetPlaylistName(plman.ActivePlaylist) !== pls.nameId;};
	const isAutoPls = (pls) => {return pls.isAutoPlaylist || pls.query;};
	const isLockPls = (pls) => {return pls.isLocked;};
	const isPlsEditable = (pls) => {return pls.extension === '.m3u' || pls.extension === '.m3u8' || pls.extension === '.xspf' || pls.extension === '.fpl'  || pls.extension === '.xsp' || pls.isAutoPlaylist;};
	const isPlsLockable = (pls) => {return isPlsEditable(pls) || pls.extension === '.strm';};
	const isPlsUI = (pls) => {return pls.extension === '.ui';};
	// Evaluate
	const bIsPlsLoadedEvery = playlists.every((pls) => {return isPlsLoaded(pls);});
	const bIsPlsLoadedSome = bIsPlsLoadedEvery || playlists.some((pls) => {return isPlsLoaded(pls);});
	const bIsAutoPlsEvery = playlists.every((pls) => {return isAutoPls(pls);});
	const bIsAutoPlsSome = bIsAutoPlsEvery || playlists.some((pls) => {return isAutoPls(pls);});
	const bIsLockPlsEvery = playlists.filter((pls) => {return pls.extension !== '.ui';}).every((pls) => {return isLockPls(pls);});
	const bIsPlsEditable = playlists.some((pls) => {return isPlsEditable(pls);});
	const bIsPlsLockable = playlists.some((pls) => {return isPlsLockable(pls);});
	const bIsPlsUIEvery = playlistsUI.length === playlists.length;
	const bIsPlsUISome = playlistsUI.length ? true : false;
	const bWritableFormat = playlists.some((pls) => {return writablePlaylistFormats.has(pls.extension);});
	// Header
	if (list.bShowMenuHeader) {
		menu.newEntry({entryText: '--- ' +  playlists.length + ' playlists: ' + playlists.map((pls) => {return pls.name;}).joinUpToChars(', ', 20) + ' ---', flags: MF_GRAYED});
		menu.newEntry({entryText: 'sep'});
	}
	// Entries
	{	// Load
		// Load playlist within foobar. Only 1 instance allowed
		menu.newEntry({entryText: 'Load playlists', func: () => {
			indexes.forEach((z, i) => {
				const pls = playlists[i];
				if (!isPlsUI(pls)) {list.loadPlaylist(z);}
			})
		}, flags: bIsPlsLoadedEvery ? MF_GRAYED : MF_STRING});
		// Clone in UI
		menu.newEntry({entryText: 'Clone playlists in UI', func: () => {
			indexes.forEach((z, i) => {
				const pls = playlists[i];
				if (!isPlsUI(pls)) {clonePlaylistFile(list, z, '.ui');}
			})
		}, flags: bIsPlsLoadedEvery ? MF_GRAYED : MF_STRING});
	}
	menu.newEntry({entryText: 'sep'});
	{	// Tags and category
		{	// Set category
			const menuName = menu.newMenu('Set category...', void(0), !bIsLockPlsEvery && bIsPlsEditable ? MF_STRING : MF_GRAYED);
			menu.newEntry({menuName, entryText: 'New category...', func: () => {
				let category = '';
				try {category = utils.InputBox(window.ID, 'Category name (only 1):', window.Name, playlists[0].category !== null ? playlists[0].category : '', true);} 
				catch(e) {return;}
				indexes.forEach((z, i) => {
					const pls = playlists[i];
					if (!isLockPls(pls) && isPlsEditable(pls)) {
						if (pls.category !== category) {setCategory(category, list, z);}
					}
				});
			}});
			menu.newEntry({menuName, entryText: 'sep'});
			list.categories().forEach((category, i) => {
				const count =  playlists.reduce((total, pls) => {return (pls.category === (i === 0 ? '' : category) ? total + 1 : total);}, 0);
				const entryText = category + '\t' + _b(count);
				menu.newEntry({menuName, entryText, func: () => {
					indexes.forEach((z, j) => {
						const pls = playlists[j];
						if (!isLockPls(pls) && isPlsEditable(pls)) {
							if (pls.category !== category) {setCategory(i ? category : '', list, z);}
						}
					});
				}});
				menu.newCheckMenu(menuName, entryText, void(0), () => {return (playlists.length === count);});
			});
		}
		{	// Set tag(s)
			const menuName = menu.newMenu('Set playlist tag(s)...', void(0), !bIsLockPlsEvery &&  bIsPlsEditable ? MF_STRING : MF_GRAYED);
			menu.newEntry({menuName, entryText: 'New tag(s)...', func: () => {
				let tags = '';
				try {tags = utils.InputBox(window.ID, 'Tag(s) Name(s), multiple values separated by \';\' :', window.Name, playlists[0].tags.join(';'), true);} 
				catch(e) {return;}
				tags = tags.split(';').filter(Boolean); // This filters blank values
				indexes.forEach((z, i) => {
					const pls = playlists[i];
					if (!isLockPls(pls) && isPlsEditable(pls)) {
						if (!isArrayEqual(pls.tags, tags)) {setTag(tags, list, z);}
					}
				});
			}});
			menu.newEntry({menuName, entryText: 'sep'});
			let bAddId = false;
			const invId = nextId('invisible', true, false);
			list.tags().concat(['sep', ...autoTags]).forEach((tag, i) => {
				const count =  playlists.reduce((total, pls) => {return ((i === 0 ? pls.tags.length === 0 : pls.tags.includes(tag)) ? total + 1 : total);}, 0);
				if (tag === 'sep') {menu.newEntry({menuName, entryText: 'sep'}); bAddId = true; return;}
				const entryText = tag + '\t' + _b(count) + (bAddId ? invId : ''); // Add invisible id for entries after separator to duplicate check marks
				menu.newEntry({menuName, entryText, func: () => {
					let tags;
					indexes.forEach((z, j) => {
						const pls = playlists[j];
						if (!isLockPls(pls) && isPlsEditable(pls)) {
							if (i === 0) {tags = [];}
							else if (pls.tags.indexOf(tag) !== -1) {tags = [...new Set(pls.tags).difference(new Set([tag]))];} 
							else {tags = [...pls.tags, tag];}
							setTag(tags, list, z);
						}
					});
				}});
				menu.newCheckMenu(menuName, entryText, void(0), () => {return (playlists.length === count);});
			});
		}
		{	// Adds track tag(s)
			menu.newEntry({entryText: 'Automatically add tag(s) to tracks...', func: () => {
				let tags = '';
				const currValue = playlists[0].trackTags && playlists[0].trackTags.length ? JSON.stringify(playlists[0].trackTags) : '';
				try {tags = utils.InputBox(window.ID, 'Enter data json-formatted: [{"tagName":"tagValue"}]\n\nTagValue may be:\n- String or number (doesn\'t need quotes).\n- TF expression applied to added track.\n- JS:+Function name (see helpers_xxx_utils.js).\n\nFor ex: [{"Mood":"Chill"}] or [{"Rating":5}]', window.Name, currValue, true);} 
				catch(e) {return;}
				const tagsString = tags;
				if (tags.length) {
					tags = tags.replaceAll('\'\'','"'); // Replace quotes
					try {tags = JSON.parse(tags);} catch(e){fb.ShowPopupMessage('Input is not a valid JSON:\n' + tags, window.Name); return;}
				}
				indexes.forEach((z, i) => {
					const pls = playlists[i];
					if (!isLockPls(pls) && isPlsEditable(pls)) {
						if (tagsString !== JSON.stringify(pls.trackTags)) {setTrackTags(tags, list, z);}
					}
				});
			}, flags: !bIsLockPlsEvery && bIsPlsEditable ? MF_STRING : MF_GRAYED});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{ // Export and Convert
		const presets = JSON.parse(list.properties.converterPreset[1]);
		const flags = bWritableFormat || bIsPlsUISome || bIsAutoPlsSome ? MF_STRING : MF_GRAYED;
		const subMenuName = menu.newMenu('Export and Convert Tracks to...', void(0), presets.length ? flags : MF_GRAYED);
		menu.newEntry({menuName: subMenuName, entryText: 'Select a preset:', flags: MF_GRAYED});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		presets.forEach((preset) => {
			const path = preset.path;
			let pathName = (path.length ? '(' + path.split('\\')[0] +'\\) ' + path.split('\\').slice(-2, -1) : '(Folder)');
			const dsp = preset.dsp;
			let dspName = (dsp !== '...' ? dsp  : '(DSP)');
			const tf = preset.tf;
			let tfName = preset.hasOwnProperty('name') && preset.name.length ? preset.name : preset.tf;
			const extension = preset.hasOwnProperty('extension') && preset.extension.length ? preset.extension : '';
			const extensionName = extension.length ? '[' + extension + ']' : '';
			if (pathName.length > 20) {pathName = pathName.substr(0, 20) + '...';}
			if (dspName.length > 20) {dspName = dspName.substr(0, 20) + '...';}
			if (tfName.length > 40) {tfName = tfName.substr(0, 40) + '...';}
			menu.newEntry({menuName: subMenuName, entryText: pathName + extensionName + ': ' + dspName + ' ---> ' + tfName, func: () => {
				const remDupl = list.bRemoveDuplicatesAutoPls ? list.removeDuplicatesAutoPls.split(',').filter((n) => n) : [];
				indexes.forEach((z, i) => {
					const pls = playlists[i];
					if (writablePlaylistFormats.has(pls.extension) || isPlsUI(pls) || isAutoPls(pls)) {
						if (!pls.isAutoPlaylist) {exportPlaylistFileWithTracksConvert(list, z, tf, dsp, path, extension, remDupl);} 
						else {exportAutoPlaylistFileWithTracksConvert(list, z, tf, dsp, path, extension, remDupl);}
					}
				});
			}, flags});
		});
	}
	menu.newEntry({entryText: 'sep'});
	{	// File management
		// Locks playlist file
		menu.newEntry({entryText: !bIsLockPlsEvery ? 'Lock Playlist (read only)' : 'Unlock Playlist (writable)', func: () => {
			indexes.forEach((z, i) => {
				const pls = playlists[i];
				if (!isPlsUI(pls) && isLockPls(pls) === bIsLockPlsEvery) {switchLock(list, z);}
			});
		}, flags: bIsPlsLockable && !bIsPlsUIEvery ? MF_STRING : MF_GRAYED});
		// Locks UI playlist
		const lockTypes = ['AddItems', 'RemoveItems', 'ReplaceItems', 'ReorderItems', 'RenamePlaylist', 'RemovePlaylist', 'ExecuteDefaultAction'];
		const defaultLockTypes = lockTypes.slice(0, 4);
		menu.newEntry({entryText: 'Edit UI Playlist lock', func: () => {
			let newLock = '';
			try {newLock = utils.InputBox(window.ID, 'Lock types, multiple values separated by \',\':\n\n' + _p(lockTypes.joinEvery(', ', 4)), window.Name, '', true);} 
			catch(e) {return;}
			newLock = [...new Set(newLock.split(/;|,/g)).intersection(lockTypes)]; // This filters blank values
			playlistsUI.forEach((pls, i) => {
				const index = plman.FindPlaylist(pls.nameId);
				const playlistLockTypes = new Set(plman.GetPlaylistLockedActions(index));
				const lockName = plman.GetPlaylistLockName(index);
				const bSMPLock = lockName === 'foo_spider_monkey_panel' || !lockName;
				const bLocked = !bSMPLock || playlistLockTypes.size;
				const oldLock = (bLocked ? [...playlistLockTypes] : []);
				if (!isArrayEqual(newLock, oldLock)) {plman.SetPlaylistLockedActions(index, newLock);}
			});
		}, flags: bIsPlsUISome || bIsPlsLoadedSome ? MF_STRING : MF_GRAYED});
		menu.newEntry({entryText: 'sep'});
		// Deletes playlist file and playlist loaded
		menu.newEntry({entryText: 'Delete', func: () => {
			playlists.forEach((pls, i) => {
				// Index change on every removal so it has to be recalculated
				const z = list.data.indexOf(pls);
				if (z !== -1) {list.removePlaylist(z);}
			});
		}});
	}
	return menu;
}

function createMenuRight() {
	// Constants
	const menu = menuRbtn;
	menu.clear(true); // Reset one every call
	const bListenBrainz = list.properties.lBrainzToken[1].length > 0;
	const lb = listenBrainz;
	// Entries
	{ // New Playlists
		menu.newEntry({entryText: 'Add new empty playlist file...', func: () => {list.add({bEmpty: true});}});
		menu.newEntry({entryText: 'Add new AutoPlaylist...', func: () => {list.addAutoplaylist();}});
		menu.newEntry({entryText: 'Add new Smart Playlist...', func: () => {list.addSmartplaylist();}});
		menu.newEntry({entryText: 'sep'});
		menu.newEntry({entryText: 'Create new playlist file from active playlist...', func: () => {list.add({bEmpty: false});}});
		if (plman.IsAutoPlaylist(plman.ActivePlaylist)) {
			menu.newEntry({entryText: 'Create new AutoPlaylist from active playlist...', func: () => {
				const pls = {name: plman.GetPlaylistName(plman.ActivePlaylist)};
				plman.ShowAutoPlaylistUI(plman.ActivePlaylist); // Workaround to not being able to access AutoPlaylist data... user must copy/paste
				list.addAutoplaylist(pls, true);
			}});
		}
		menu.newEntry({entryText: 'Import from ListenBrainz' + (bListenBrainz ? '' : '\t(token not set)'), func: async () => {
			if (!await checkLBToken()) {return false;}
			let bDone = false;
			let playlist_mbid = '';
			try {playlist_mbid = utils.InputBox(window.ID, 'Enter Playlist MBID:', window.Name, '', true);}
			catch (e) {bDone = true;}
			playlist_mbid = playlist_mbid.replace(regExListenBrainz, ''); // Allow web link too
			if (playlist_mbid.length) {
				const token = bListenBrainz ? lb.decryptToken({lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1]}) : null;
				if (!token) {return false;}
				const jspf = await lb.importPlaylist({playlist_mbid}, token);
				if (jspf) {
					let bXSPF = false;
					if (list.playlistsExtension !== '.xspf') {
						const answer = WshShell.Popup('Save as .xspf format?\n(Items not found on library will be kept)', 0, window.Name, popup.question + popup.yes_no);
						if (answer === popup.yes) {bXSPF = true;}
					} else {bXSPF = true;}
					if (!bXSPF) {
						const handleList = contentResolver(jspf);
						if (jspf.playlist.track.length !== handleList.Count) {
							const answer = WshShell.Popup('Some imported tracks have not been found on library (see console).\nDo you want to continue (omitting not found items)?', 0, window.Name, popup.question + popup.yes_no);
							if (answer === popup.no) {return false;}
						}
						const playlistName = jspf.playlist.title;
						const playlistPath = list.playlistsPath + sanitize(playlistName) + list.playlistsExtension;
						const backPath = playlistPath + '.back';
						if (_isFile(playlistPath)) {
							let answer = WshShell.Popup('There is a playlist with same name/path.\nDo you want to overwrite it?.', 0, window.Name, popup.question + popup.yes_no);
							if (answer === popup.no) {return false;}
							_renameFile(playlistPath, backPath);
						}
						const useUUID = list.optionsUUIDTranslate();
						const category = list.categoryState.length === 1 && list.categoryState[0] !== list.categories(0) ? list.categoryState[0] : '';
						const tags = ['ListenBrainz'];
						if (list.bAutoLoadTag) {oPlaylistTags.push('bAutoLoad');}
						if (list.bAutoLockTag) {oPlaylistTags.push('bAutoLock');}
						if (list.bMultMenuTag) {oPlaylistTags.push('bMultMenu');}
						if (list.bAutoCustomTag) {list.autoCustomTag.forEach((tag) => {if (! new Set(oPlaylistTags).has(tag)) {oPlaylistTags.push(tag);}});}
						const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
						bDone = savePlaylist({handleList, playlistPath, ext: list.playlistsExtension, playlistName, category, tags, playlist_mbid, useUUID, bBOM: list.bBOM});
						// Restore backup in case something goes wrong
						if (!bDone) {console.log('Failed saving playlist: ' + playlistPath); _deleteFile(playlistPath); _renameFile(backPath, playlistPath);}
						else if (_isFile(backPath)) {_deleteFile(backPath);}
						const playlistNameId = playlistName + (list.bUseUUID ? nextId(useUUID, false) : '');
						if (bDone && plman.FindPlaylist(playlistNameId) !== -1) {sendToPlaylist(handleList, playlistNameId);}
						if (bDone) {list.update(false, true, list.lastIndex); list.filter()}
						clearInterval(delay);
					} else {
						const handleList = contentResolver(jspf, false);
						const playlist = jspf.playlist;
						const useUUID = list.optionsUUIDTranslate();
						const category = list.categoryState.length === 1 && list.categoryState[0] !== list.categories(0) ? list.categoryState[0] : '';
						const tags = ['ListenBrainz'];
						if (list.bAutoLoadTag) {oPlaylistTags.push('bAutoLoad');}
						if (list.bAutoLockTag) {oPlaylistTags.push('bAutoLock');}
						if (list.bMultMenuTag) {oPlaylistTags.push('bMultMenu');}
						let totalDuration = 0;
						playlist.creator = 'Playlist-Manager-SMP';
						playlist.meta = [
							{uuid: (useUUID ? nextId(useUUID) : '')},
							{locked: true},
							{category},
							{tags: (isArrayStrings(tags) ? tags.join(';') : '')},
							{trackTags: ''},
							{playlistSize: playlist.track.length},
							{duration: totalDuration},
							{playlist_mbid}
						];
						// Tracks text
						handleList.forEach((handle, i) => {
							if (!handle) {return;}
							const relPath = '';
							const tags = getTagsValuesV4(new FbMetadbHandleList(handle), ['TITLE', 'ARTIST', 'ALBUM', 'TRACK', 'LENGTH_SECONDS_FP', 'PATH', 'SUBSONG', 'MUSICBRAINZ_TRACKID']);
							const title = tags[0][0][0];
							const creator = tags[1][0].join(', ');
							const album = tags[2][0][0];
							const trackNum = Number(tags[3][0][0]);
							const duration = Math.round(Number(tags[4][0][0] * 1000)); // In ms
							totalDuration += Math.round(Number(tags[4][0][0])); // In s
							const location = [relPath.length ? getRelPath(tags[5][0][0], relPathSplit) : tags[5][0][0]].map((path) => {return 'file:///' + encodeURI(path.replace(/\\/g,'/').replace(/&/g,'%26'));});
							const subSong = Number(tags[6][0][0]);
							const meta = location[0].endsWith('.iso') ? [{subSong}] : [];
							const identifier = [tags[7][0][0]];
							playlist.track[i] = {
								location,
								annotation: void(0),
								title,
								creator,
								info: void(0),
								image: void(0),
								album,
								duration,
								trackNum,
								identifier,
								extension: {},
								link: [],
								meta
							};
						});
						// Fix JSPF identifiers as array
						playlist.track.forEach((track) => {
							if (!Array.isArray(track.identifier)) {track.identifier = [track.identifier];}
						});
						// YouTube source for missing files
						playlist.track.forEach((track) => {
							if (!track.hasOwnProperty('location')) {
								const uri = 'youtube.api.video?query=' + track.creator.replaceAll(' ','+') + '+-+' + track.title.replaceAll(' ','+') + '&skip_next=1&ssc=mAEB';
								track.location = [encodeURI(uri.replace(/&/g,'%26'))];
							}
						});
						// Update total duration of playlist
						playlist.meta.find((obj) => {return obj.hasOwnProperty('duration');}).duration = totalDuration;
						const playlistPath = list.playlistsPath + sanitize(playlist.title) + '.xspf';
						const playlistNameId = playlist.title + (list.bUseUUID ? nextId(useUUID, false) : '');
						let xspf = XSPF.toXSPF(jspf);
						const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
						xspf = xspf.join('\r\n');
						bDone = _save(playlistPath, xspf, list.bBOM);
						// Check
						if (_isFile(playlistPath) && bDone) {
							let check = _open(playlistPath, utf8);
							bDone = (check === xspf);
						}
						// Restore backup in case something goes wrong
						const backPath = playlistPath + '.back';
						if (!bDone) {console.log('Failed saving playlist: ' + playlistPath); _deleteFile(playlistPath); _renameFile(backPath, playlistPath);}
						else if (_isFile(backPath)) {_deleteFile(backPath);}
						if (bDone && plman.FindPlaylist(playlistNameId) !== -1) {sendToPlaylist(new FbMetadbHandleList(handleList.filter((n) => n)), playlistNameId);}
						if (bDone) {list.update(false, true, list.lastIndex); list.filter()}
						clearInterval(delay);
					}
				}
			} else {bDone = true;}
			if (!bDone) {fb.ShowPopupMessage('There were some errors on playlist syncing. Check console.', window.Name);}
			return bDone;
		}, flags: bListenBrainz ? MF_STRING : MF_GRAYED});
	}
	menu.newEntry({entryText: 'sep'});
	{	// File management
		{	// Refresh
			menu.newEntry({entryText: 'Manual refresh', func: () => {
				let test = new FbProfiler(window.Name + ': ' + 'Manual refresh');
				list.loadConfigFile();
				const z = (list.index !== -1) ? list.index : list.getCurrentItemIndex();
				list.bUpdateAutoplaylist = true;
				list.update(void(0), true, z); // Forces AutoPlaylist size update according to query and tags
				list.filter();
				list.lastPlsLoaded = [];
				if (typeof xspCache !== 'undefined') {xspCache.clear();} // Discard old cache to load new changes
				if (typeof xspfCache !== 'undefined') {xspfCache.clear();}
				test.Print();
			}});
		}
		{	// Restore
			const bBin = _hasRecycleBin(list.playlistsPath.match(/^(.+?:)/g)[0]);
			const subMenuName = menu.newMenu('Restore...' + (!bBin ? ' [missing recycle bin]' : ''), void(0), list.deletedItems.length ? MF_STRING : MF_GRAYED);
			if (list.deletedItems.length && bBin) {
				list.deletedItems.slice(0, 8).forEach((item, i) => {
					menu.newEntry({menuName: subMenuName, entryText: item.name, func: () => {
						list.addToData(list.deletedItems[i]);
						// Add new category to current view! (otherwise it gets filtered)
						// Easy way: intersect current view + new one with refreshed list
						const categoryState = [...new Set(list.categoryState.concat(list.deletedItems[i].category)).intersection(new Set(list.categories()))];
						if (list.deletedItems[i].isAutoPlaylist) {
							list.update(true, true); // Only paint and save to json
						} else if(list.deletedItems[i].extension === '.ui') {
							for (let j = 0; j < plman.PlaylistRecycler.Count; j++) { // First pls is the last one deleted
								if (plman.PlaylistRecycler.GetName(j) === list.deletedItems[i].nameId) {
									const size = plman.PlaylistRecycler.GetContent(j).Count;
									if (size === list.deletedItems[i].size) { // Must match on size and name to avoid restoring another pls with same name
										plman.PlaylistRecycler.Restore(j);
										break;
									}
								}
							}
							list.update(true, true); // Only paint and save to json
						} else {
							_restoreFile(list.deletedItems[i].path);
							// Revert timestamps
							let newPath = list.deletedItems[i].path.split('.').slice(0,-1).join('.').split('\\');
							const newName = newPath.pop().split('_ts_')[0];
							newPath = newPath.concat([newName]).join('\\') + list.deletedItems[i].extension;
							_renameFile(list.deletedItems[i].path, newPath);
							list.update(false, true); // Updates path..
						}
						list.filter({categoryState});
						list.deletedItems.splice(i, 1);
					}});
				});
			}
		}
		menu.newEntry({entryText: 'sep'});
		{	// Import json
			menu.newEntry({entryText: 'Add playlists from json file...', func: () => {
				list.bUpdateAutoplaylist = true; // Forces AutoPlaylist size update according to query and tags
				list.loadExternalJson();
			}});
			menu.newEntry({entryText: 'Export playlists as json file...', func: () => {
				let answer = WshShell.Popup('Export only AutoPlaylists (yes) or both AutoPlaylists and other playlists -.fpl & .xsp- (no)?', 0, window.Name, popup.question + popup.yes_no);
				const path = list.exportJson({idx: -1, bAllExt: answer === popup.yes ? false : true},); // All
				if (_isFile(path)) {_explorer(path);}
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
				findMixedPathsAsync().then((found) => {fb.ShowPopupMessage('Found these playlists with mixed relative and absolute paths:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);});
			}});
		}
		{	// External items
			menu.newEntry({menuName: subMenuName, entryText: 'External items...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for external items (i.e. items not found on library but present on their paths).\nDo you want to continue?', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				findExternalAsync().then((found) => {fb.ShowPopupMessage('Found these playlists with items not present on library:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);});
			}});
		}
		{	// Dead items
			menu.newEntry({menuName: subMenuName, entryText: 'Dead items...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for dead items (i.e. items that don\'t exist in their path).\nDo you want to continue?', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				findDeadAsync().then((found) => {fb.ShowPopupMessage('Found these playlists with dead items:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);});
			}});
		}
		{	// Duplicates
			menu.newEntry({menuName: subMenuName, entryText: 'Duplicated items...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for duplicated items (i.e. items that appear multiple times in a playlist).\nDo you want to continue?', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				findDuplicatesAsync().then((found) => {fb.ShowPopupMessage('Found these playlists with duplicated items:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);});
			}});
		}
		{	// Size mismatch
			menu.newEntry({menuName: subMenuName, entryText: 'Playlist size mismatch...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for reported playlist size not matching number of tracks.', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				findSizeMismatchAsync().then((found) => {fb.ShowPopupMessage('Found these playlists with size mismatch:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);});
			}});
		}
		{	// Duration mismatch
			menu.newEntry({menuName: subMenuName, entryText: 'Playlist duration mismatch...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for reported playlist duration not matching duration of tracks.', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				findDurationMismatchAsync().then((found) => {fb.ShowPopupMessage('Found these playlists with duration mismatch:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);});
			}});
		}
		{	// Blank Lines
			menu.newEntry({menuName: subMenuName, entryText: 'Blank lines...', func: () => {
				let answer = WshShell.Popup('Scan all playlists to check for blank lines (it may break playlist on other players).', 0, window.Name, popup.question + popup.yes_no);
				if (answer !== popup.yes) {return;}
				findBlankAsync().then((found) => {fb.ShowPopupMessage('Found these playlists with blank lines:\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);});
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
	const bListenBrainz = list.properties.lBrainzToken[1].length > 0;
	const lb = listenBrainz;
	// Entries
	{	// Playlist folder
		menu.newEntry({entryText: 'Set playlists folder...', func: () => {
			let input = '';
			try {input = sanitizePath(utils.InputBox(window.ID, 'Enter path', window.Name, list.properties['playlistPath'][1], true));}
			catch (e) {return;}
			if (!input.length) {return;}
			if (input === list.playlistsPath) {return;}
			if (!input.endsWith('\\')) {input += '\\';}
			let bDone = _isFolder(input);
			if (!bDone) {bDone = _createFolder(input);}
			if (!bDone) {
				fb.ShowPopupMessage('Path can not be found or created:\n\'' + input + '\'', window.Name);
				return;
			}
			// Update property to save between reloads
			list.properties['playlistPath'][1] = input;
			list.playlistsPath = input.startsWith('.') ? findRelPathInAbsPath(input) : input;
			list.playlistsPathDirName = list.playlistsPath.split('\\').filter(Boolean).pop();
			list.playlistsPathDisk = list.playlistsPath.split('\\').filter(Boolean)[0].replace(':','').toUpperCase();
			if (mappedDrives.indexOf(list.playlistsPath.match(/^(.+?:)/g)[0]) !== -1) {
				if (!list.properties['bNetworkPopup'][1]) {list.properties['bNetworkPopup'][1] = true;}
				const file = folders.xxx + 'helpers\\readme\\playlist_manager_network.txt';
				const readme = _open(file, utf8);
				fb.ShowPopupMessage(readme, window.Name);
			} else {list.properties['bNetworkPopup'][1] = false;}
			overwriteProperties(list.properties);
			list.checkConfig();
			let test = new FbProfiler(window.Name + ': ' + 'Manual refresh');
			list.headerTextUpdate();
			list.bUpdateAutoplaylist = true; 
			list.update(void(0), true, z); // Forces AutoPlaylist size update according to query and tags
			list.filter();
			test.Print();
			// Tracking network drive?
			window.Repaint();
			window.Reload();
		}});
		menu.newEntry({entryText: 'Open playlists folder', func: () => {_explorer(list.playlistsPath);}});
	}
	menu.newEntry({entryText: 'sep'});
	{	// Category Filter
		const subMenuName = menu.newMenu('Categories shown...');
		const options = list.categories();
		const defOpt = options[0];
		const optionsLength = options.length;
		menu.newEntry({menuName: subMenuName, entryText: 'Toogle (click) / Single (Shift + click):', func: null, flags: MF_GRAYED});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		menu.newEntry({menuName: subMenuName, entryText: 'Restore all', func: () => {
			list.filter({categoryState: options});
		}});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		const iInherit = (list.categoryState.length === 1 && list.categoryState[0] !== defOpt ? options.indexOf(list.categoryState[0]) : -1);
		options.forEach((item, i) => {
			const count =  list.data.reduce((total, pls) => {return (pls.category === (i === 0 ? '' : item) ? total + 1 : total);}, 0);
			menu.newEntry({menuName: subMenuName, entryText: item + '\t' + (i === iInherit ? '-inherit- ' : '') + _b(count), func: () => {
				let categoryState;
				// Disable all other tags when pressing shift
				if (utils.IsKeyPressed(VK_SHIFT)) {
					categoryState = [item];
				} else {
					categoryState = list.categoryState.indexOf(item) !== -1 ? list.categoryState.filter((categ) => {return categ !== item;}) : (item === defOpt ? [defOpt, ...list.categoryState] : list.categoryState.concat([item]).sort());
				}
				list.filter({categoryState});
			}});
			menu.newCheckMenu(subMenuName, item, void(0), () => {return list.categoryState.indexOf(item) !== -1;});
		});
	}
	{	// Tag Filter
		const subMenuName = menu.newMenu('Tags shown...');
		const options = list.tags();
		const defOpt = options[0];
		const optionsLength = options.length;
		menu.newEntry({menuName: subMenuName, entryText: 'Toogle (click) / Single (Shift + click):', func: null, flags: MF_GRAYED});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		menu.newEntry({menuName: subMenuName, entryText: 'Restore all', func: () => {
			list.filter({tagState: options});
		}});
		menu.newEntry({menuName: subMenuName, entryText: 'sep'});
		const bDef = list.tagState.indexOf(defOpt) !== -1;
		options.forEach((item, i) => {
			const bInherit = !bDef && list.tagState.indexOf(item) !== -1;
			const count =  list.data.reduce((total, pls) => {return ((i === 0 ? pls.tags.length === 0 : pls.tags.includes(item)) ? total + 1 : total);}, 0);
			menu.newEntry({menuName: subMenuName, entryText: item + '\t' + (bInherit && i !== 0 ? '-inherit- ' : '') + _b(count), func: () => {
				let tagState;
				// Disable all other categories when pressing shift
				if (utils.IsKeyPressed(VK_SHIFT)) {
					tagState = [item];
				} else {
					tagState = list.tagState.indexOf(item) !== -1 ? list.tagState.filter((tag) => {return tag !== item;}) : (item === defOpt ? [defOpt, ...list.tagState] : list.tagState.concat([item]).sort());
				}
				list.filter({tagState});
			}});
			menu.newCheckMenu(subMenuName, item, void(0), () => {return list.tagState.indexOf(item) !== -1;});
		});
	}
	menu.newEntry({entryText: 'sep'});
	{	// Playlist saving
		const menuName = menu.newMenu('Playlist saving');
		{
			{	// Relative folder
				const subMenuName = menu.newMenu('Save paths relative to folder...', menuName);
				const options = ['Yes: Relative to playlists folder', 'No: Use absolute paths (default)'];
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
				const subMenuName = menu.newMenu('Default playlist extension...', menuName);
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
					menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return options.indexOf(list.playlistsExtension);});
				}
				menu.newEntry({menuName: subMenuName, entryText: 'sep'});
				menu.newEntry({menuName: subMenuName, entryText: 'Force on (auto)saving', func: () => {
					const answer = WshShell.Popup('Apply default format in any case, not only to new playlists created.\n\nFormat of existing playlists will be changed to the default format whenever they are saved: Manually or on Auto-saving.\n\nOther saving related configuration may apply (like Smart Playlists being skipped or warning popups whenever format will be changed).', 0, window.Name, popup.question + popup.yes_no);
					list.bSavingDefExtension = (answer === popup.yes);
					if (list.properties['bSavingDefExtension'][1] !== list.bSavingDefExtension) {
						list.properties['bSavingDefExtension'][1] = list.bSavingDefExtension;
						overwriteProperties(list.properties);
					}
				}});
				menu.newCheckMenu(subMenuName, 'Force on (auto)saving', null,  () => {return list.bSavingDefExtension;});
			}
			{	// BOM
				const subMenuName = menu.newMenu('Save files with BOM...', menuName);
				const options = ['Yes: UTF8-BOM', 'No: UTF8'];
				const optionsLength = options.length;
				menu.newEntry({menuName: subMenuName, entryText: 'Playlists and json:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuName, entryText: 'sep'});
				if (optionsLength) {
					options.forEach((item, i) => {
						menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
							list.bBOM = (i === 0);
							list.properties['bBOM'][1] = list.bBOM;
							overwriteProperties(list.properties);
						}});
					});
				}
				menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return list.bBOM ? 0 : 1;});
			}
			{	// Saving warnings
				const subMenuName = menu.newMenu('Warnings about format change...', menuName);
				const options = ['Yes: If format will be changed', 'No: Never'];
				const optionsLength = options.length;
				menu.newEntry({menuName: subMenuName, entryText: 'Warns when updating a file:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuName, entryText: 'sep'});
				if (optionsLength) {
					options.forEach((item, i) => {
						menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
							list.bSavingWarnings = (i === 0);
							list.properties['bSavingWarnings'][1] = list.bSavingWarnings;
							overwriteProperties(list.properties);
						}});
					});
				}
				menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return list.bSavingWarnings ? 0 : 1;});
			}
			{	// Smart Playlist saving
				const subMenuName = menu.newMenu('Skip Smart Playlists on Auto-saving...', menuName);
				const options = ['Yes: Original format will be maintained', 'No: Format will change on Auto-saving'];
				const optionsLength = options.length;
				menu.newEntry({menuName: subMenuName, entryText: 'Treat Smart Playlists as AutoPlaylists:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuName, entryText: 'sep'});
				if (optionsLength) {
					options.forEach((item, i) => {
						menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
							list.bSavingXsp = (i === 1);
							list.properties['bSavingXsp'][1] = list.bSavingXsp;
							overwriteProperties(list.properties);
							if (list.bSavingXsp) {fb.ShowPopupMessage('Auto-saving Smart Playlists involves, by design, not having an Smart Playlist anymore but just a list of files (originated from their query).\n\nEnabling this option will allow Smart Playlists to be overwritten as an standard playlist whenever they are updated. Note this goes agains their intended aim (like Auto-playlists) and therefore the query and other related data will be lost as soon as it\'s converted to a list of paths (*).\n\nOption not recommended for most users, use it at your own responsibility.\n\n(*) If this happens, remember the original playlist could still be found at the Recycle Bin.', window.Name);}
						}});
					});
				}
				menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return list.bSavingXsp ? 1 : 0;});
			}
		}
	}
	{	// Panel behavior
		const menuName = menu.newMenu('Panel behavior');
		{	// Filtering
			const subMenuName = menu.newMenu('Save filtering between sessions...', menuName);
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
		{	// UI-only playlists
			const subMenuName = menu.newMenu('Track UI-only playlists...', menuName);
			const options = ['Yes: also show UI-only playlists','No: Only playlist files on tracked folder'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Use manager as native organizer:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bAllPls = (i === 0) ? true : false;
					list.properties['bAllPls'][1] = list.bAllPls;
					overwriteProperties(list.properties);
					if (list.bAllPls) {
						fb.ShowPopupMessage('UI-only playlists are non editable but they can be renamed, deleted or restored. Sending current selection to a playlist is also allowed.\nUI-only playlists have their own custom color to be easily identified.\n\nTo be able to use all the other features of the manager, consider creating playlist files instead. At any point you may use \'Create new playlist from Active playlist...\' to save UI-only playlists as tracked files.', window.Name);
					}
					createMenuRight().btn_up(-1,-1, null, 'Manual refresh');
				}});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bAllPls ? 0 : 1);});
		}
		menu.newEntry({menuName, entryText: 'sep'});
		{	// Duplicated pls handling
			const subMenuName = menu.newMenu('Duplicated playlists handling...', menuName);
			const options = ['Warn about playlists with duplicated names', 'Ignore it'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Only for tracked playlists within the manager:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bCheckDuplWarnings = (i === 0) ? true : false;
					list.properties['bCheckDuplWarnings'][1] = list.bCheckDuplWarnings;
					overwriteProperties(list.properties);
				}});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bCheckDuplWarnings ? 0 : 1);});
		}
		{	// Duplicated tracks handling
			const subMenuName = menu.newMenu('Duplicated tracks handling...', menuName);
			const options = ['Skip duplicates when adding new tracks', 'Only warn about it on tooltip'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'When sending selection to a playlist:', flags: MF_GRAYED});
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
			const subMenuName = menu.newMenu('Dead items handling...', menuName);
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
		menu.newEntry({menuName, entryText: 'sep'});
		{	// Auto-Saving
			menu.newEntry({menuName, entryText: 'Auto-saving interval...\t(' + list.properties['autoSave'][1] + ' ms)', func: () => {
				let input = 0;
				try {input = Number(utils.InputBox(window.ID, 'Save changes within foobar playlists into tracked files periodically.\nEnter integer number > ' + list.properties['autoSave'][2].range[1][0] + ' (ms):\n(0 to disable it)', window.Name, Number(list.properties['autoSave'][1]), true));}
				catch(e) {return;}
				if (isNaN(input)) {return;}
				if (!checkProperty(list.properties['autoSave'], input)) {return;}
				list.properties['autoSave'][1] = input;
				overwriteProperties(list.properties);
				window.Reload();
			}});
			menu.newCheckMenu(menuName, 'Auto-saving interval...', void(0),  () => {return (Number(list.properties['autoSave'][1]) !== 0 ? 1 : 0);});
		}
		{	// Auto-Loading
			menu.newEntry({menuName, entryText: 'Auto-loading interval...\t(' + list.properties['autoUpdate'][1] + ' ms)', func: () => {
				let input = 0;
				try {input = Number(utils.InputBox(window.ID, 'Check periodically the tracked folder for changes and update the list.\nEnter integer number > ' + list.properties['autoUpdate'][2].range[1][0] + ' (ms):\n(0 to disable it)', window.Name, Number(list.properties['autoUpdate'][1]), true));}
				catch(e) {return;}
				if (isNaN(input)) {return;}
				if (!checkProperty(list.properties['autoUpdate'], input)) {return;}
				list.properties['autoUpdate'][1] = input;
				overwriteProperties(list.properties);
				window.Reload();
			}});
			menu.newCheckMenu(menuName, 'Auto-loading interval...', void(0),  () => {return (Number(list.properties['autoUpdate'][1]) !== 0 ? 1 : 0);});
		}
		{	// Auto-Backup
			menu.newEntry({menuName, entryText: 'Auto-backup interval...\t(' + (isInt(list.properties['autoBack'][1]) ? list.properties['autoBack'][1] : '\u221E') + ' ms)', func: () => {
				let input = 0;
				try {input = Number(utils.InputBox(window.ID, 'Backup to zip periodically the tracked folder.\nEnter integer number > ' + list.properties['autoBack'][2].range[1][0] + ' (ms):\n(0 to disable it)\n(\'Infinity\' only on script unloading / playlist loading)', window.Name, Number(list.properties['autoBack'][1]), true));}
				catch(e) {return;}
				if (isNaN(input)) {return;}
				if (!checkProperty(list.properties['autoBack'], input)) {return;}
				list.properties['autoBack'][1] = input;
				overwriteProperties(list.properties);
				window.Reload();
			}});
			menu.newCheckMenu(menuName, 'Auto-backup interval...', void(0),  () => {return (Number(list.properties['autoBack'][1]) !== 0 ? 1 : 0);});
		}
	}
	{	// Playlists behavior
		const menuName = menu.newMenu('Playlists behavior');
		{	// UUID
			const subMenuName = menu.newMenu('Use UUIDs for playlist names...', menuName);
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
		menu.newEntry({menuName, entryText: 'sep'});
		{	// Playlist Size
			const subMenuName = menu.newMenu('Update AutoPlaylists size...', menuName);
			const options = ['Yes: Automatically on every startup', 'No: Only when loading them'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Track count on parenthesis:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.properties['bUpdateAutoplaylist'][1] = (i === 0) ? true : false; // True will force a refresh on script loading
					overwriteProperties(list.properties);
					if (list.properties['bUpdateAutoplaylist'][1]) {
						fb.ShowPopupMessage('Enabling this option will also load -internally- all queries from AutoPlaylists at startup to retrieve their tag count.(*)(**)\n\nIt\'s done asynchronously so it should not take more time to load the script at startup as consequence.\n\n(*) Note enabling this option will not incur on additional processing if you already enabled Tracks Auto-tagging on startup for AutoPlaylists.\n(**) For the same reasons, AutoPlaylists which perform tagging will always get their size updated no matter what this config is.', window.Name);
						}
				}});
			});
			//list.bUpdateAutoplaylist changes to false after firing, but the property is constant unless the user changes it...
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.properties['bUpdateAutoplaylist'][1] ? 0 : 1);});
		}
		{	// AutoPlaylist / Smart Playlists loading duplicates
			const subMenuName = menu.newMenu('Duplicates filter...', menuName);
			menu.newEntry({menuName: subMenuName, entryText: 'Removes duplicates after loading:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			menu.newEntry({menuName: subMenuName, entryText: 'On AutoPlaylist cloning', func: () => {
				list.bRemoveDuplicatesAutoPls = !list.bRemoveDuplicatesAutoPls;
				list.properties['bRemoveDuplicatesAutoPls'][1] = list.bRemoveDuplicatesAutoPls;
				overwriteProperties(list.properties);
			}});
			menu.newCheckMenu(subMenuName, 'On AutoPlaylist cloning', void(0), () => {return list.bRemoveDuplicatesAutoPls;});
			menu.newEntry({menuName: subMenuName, entryText: 'On Smart Playlist loading & cloning', func: () => {
				list.bRemoveDuplicatesSmartPls = !list.bRemoveDuplicatesSmartPls;
				list.properties['bRemoveDuplicatesSmartPls'][1] = list.bRemoveDuplicatesSmartPls;
				overwriteProperties(list.properties);
			}});
			menu.newCheckMenu(subMenuName, 'On Smart Playlist loading & cloning', void(0), () => {return list.bRemoveDuplicatesSmartPls;});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			menu.newEntry({menuName: subMenuName, entryText: 'Configure Tags or TF expression...', func: () => {
				let input = '';
				try {input = utils.InputBox(window.ID, 'Enter tag(s) or TF expression(s):\n(sep by comma)', window.Name, list.removeDuplicatesAutoPls.split(',').filter((n) => n), true);}
				catch (e) {return;}
				if (input) {input = input.split(',').filter((n) => n).join(',');}
				if (input === list.removeDuplicatesAutoPls) {return;}
				list.removeDuplicatesAutoPls = input;
				list.properties['removeDuplicatesAutoPls'][1] = list.removeDuplicatesAutoPls;
				overwriteProperties(list.properties);
			}});
		}
		menu.newEntry({menuName, entryText: 'sep'});
		{	// Playlist AutoTags & Actions
			const subMenuName = menu.newMenu('Playlist AutoTags and actions', menuName);
			menu.newEntry({menuName: subMenuName, entryText: 'Playlist file\'s Tags relatad actions:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			{
				const subMenuNameTwo = menu.newMenu('Automatically tag loaded playlists with...', subMenuName);
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'Set tags:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'sep', flags: MF_GRAYED});
				const options = ['bAutoLoad', 'bAutoLock', 'bMultMenu'];
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
					try {tag = utils.InputBox(window.ID, 'Enter tag(s) to be added to playlists on load:\nLeave it blank to deactivate auto-tagging.\n(sep by comma)', window.Name, options.join(','), true);}
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
				const options = ['Yes: At playlist loading', 'No: Ignore them'];
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
			const subMenuName = menu.newMenu('Tracks AutoTags and actions', menuName);
			menu.newEntry({menuName: subMenuName, entryText: 'Track\'s Tags related actions:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			{
				const subMenuNameTwo = menu.newMenu('Automatically tag added tracks on...', subMenuName);
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'Switch for different playlist types:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'sep', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'Standard playlists', func: () => {
					if (!list.bAutoTrackTagPls) {fb.ShowPopupMessage('Changes on playlist will not be (automatically) saved to the playlist file since it will be locked, but tracks added to it (on foobar) will be automatically tagged.\n\nEnabling this option may allow to use a playlist only for tagging purposes (for ex. native playlists), not caring at all about saving the changes to the associated files.', window.Name);}
					list.bAutoTrackTagPls = !list.bAutoTrackTagPls;
					list.properties['bAutoTrackTagPls'][1] = list.bAutoTrackTagPls;
					overwriteProperties(list.properties);
				}, flags: list.bAutoTrackTag ? MF_STRING: MF_GRAYED});
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'Locked playlists', func: () => {
					if (!list.bAutoTrackTagLockPls) {fb.ShowPopupMessage('Changes on playlist will not be (automatically) saved to the playlist file since it will be locked, but tracks added to it (on foobar) will be automatically tagged.\n\nEnabling this option may allow to use a playlist only for tagging purposes (for ex. native playlists), not caring at all about saving the changes to the associated files.', window.Name);}
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
					if (!list.bAutoTrackTagAutoPlsInit) {fb.ShowPopupMessage('Enabling this option will also load -internally- all queries from AutoPlaylists at startup to tag their tracks (*)(**)(***).\n\nThis bypasses the natural limit of tagging only applying to loaded AutoPlaylists within foobar; it\'s done asynchronously so it should not take more time to load the script at startup as consequence.\n\n(*) Only those with tagging set, the rest are not loaded to optimize processing time.\n(**) Note enabling this option will not incur on additional proccessing if you already set AutoPlaylists size updating on startup too (both will be done asynchronously).\n(***) For the same reasons, AutoPlaylists which perform tagging will always get their size updated no matter what the \'Update AutoPlaylists size...\' config is.', window.Name);}
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
		menu.newEntry({menuName, entryText: 'sep'});
		{	// Export and Converter settings
			{	//Export and copy
				const subMenuName = menu.newMenu('Export and copy...', menuName);
				menu.newEntry({menuName: subMenuName, entryText: 'Configuration of copy tools:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuName, entryText: 'sep'});
				menu.newEntry({menuName: subMenuName, entryText: 'Copy files asynchronously (on background)', func: () => {
					list.properties['bCopyAsync'][1] = !list.properties['bCopyAsync'][1];
					overwriteProperties(list.properties);
				}});
				menu.newCheckMenu(subMenuName, 'Copy files asynchronously (on background)', void(0),  () => {return list.properties['bCopyAsync'][1];});
			}
			{	//Export and convert
				const subMenuName = menu.newMenu('Export and convert...', menuName);
				menu.newEntry({menuName: subMenuName, entryText: 'Configuration of exporting presets:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuName, entryText: 'sep'});
				const presets = JSON.parse(list.properties.converterPreset[1]);
				presets.forEach((preset, i) => {
					const path = preset.path;
					let pathName = (path.length ? '(' + path.split('\\')[0] +'\\) ' + path.split('\\').slice(-2, -1) : '(Folder)');
					const dsp = preset.dsp;
					let dspName = (dsp !== '...' ? dsp  : '(DSP)');
					const tf = preset.tf;
					let tfName = preset.hasOwnProperty('name') && preset.name.length ? preset.name : preset.tf;
					const extension = preset.hasOwnProperty('extension') && preset.extension.length ? preset.extension : '';
					const extensionName = extension.length ? '[' + extension + ']' : '';
					if (pathName.length > 20) {pathName = pathName.substr(0, 20) + '...';}
					if (dspName.length > 20) {dspName = dspName.substr(0, 20) + '...';}
					if (tfName.length > 40) {tfName = tfName.substr(0, 40) + '...';}
					const subMenuNameTwo = menu.newMenu('Preset ' + (i + 1) + ': ' + pathName + extensionName +': ' + dspName + ' ---> ' + tfName, subMenuName);
					menu.newEntry({menuName: subMenuNameTwo, entryText: 'Set default export folder...', func: () => {
						let input = '';
						try {input = sanitizePath(utils.InputBox(window.ID, 'Enter destination path:\n(Left it empty to set output folder at execution)', window.Name, preset.path, true));}
						catch(e) {return;}
						if (input.length && !input.endsWith('\\')) {input += '\\';}
						if (input !== preset.path) {
							preset.path = input;
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.bDynamicMenus) {list.createMainMenuDynamic(); list.exportPlaylistsInfo();}
						}
					}});
					{
						const subMenuNameThree = menu.newMenu('Set playlist format...' + nextId('invisible', true, false), subMenuNameTwo);
						const options = ['', ...writablePlaylistFormats];
						options.forEach((extension) => {
							menu.newEntry({menuName: subMenuNameThree, entryText: extension.length ? extension : '(original)', func: () => {
								if (extension !== preset.extension) {
									preset.extension = extension;
									list.properties['converterPreset'][1] = JSON.stringify(presets);
									overwriteProperties(list.properties);
									if (list.bDynamicMenus) {list.createMainMenuDynamic(); list.exportPlaylistsInfo();}
								}
							}});
						});
						menu.newCheckMenu(subMenuNameThree, '(original)', options[options.length - 1],  () => {return options.indexOf(preset.extension || '');});
					}
					menu.newEntry({menuName: subMenuNameTwo, entryText: 'Set DSP preset...', func: () => {
						let input = '';
						try {input = utils.InputBox(window.ID, 'Enter DSP preset name:\n(empty or ... will show converter window)', window.Name, preset.dsp, true);}
						catch(e) {return;}
						if (!input.length) {input = '...';}
						if (input !== preset.dsp) {
							preset.dsp = input;
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.bDynamicMenus) {list.createMainMenuDynamic(); list.exportPlaylistsInfo();}
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
							if (list.bDynamicMenus) {list.createMainMenuDynamic(); list.exportPlaylistsInfo();}
						}
					}});
					menu.newEntry({menuName: subMenuNameTwo, entryText: 'sep'});
					menu.newEntry({menuName: subMenuNameTwo, entryText: 'Set name...', func: () => {
						const hasName = preset.hasOwnProperty('name') ? true : false;
						let input = '';
						try {input = utils.InputBox(window.ID, 'Enter preset name:\n(Left it empty to use TF expression instead)', window.Name, preset.hasOwnProperty('name') ? preset.name : '', true);}
						catch(e) {return;}
						if (!input.length) {return;}
						if (!hasName  || hasName && input !== preset.name) {
							preset.name = input;
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.bDynamicMenus) {list.createMainMenuDynamic(); list.exportPlaylistsInfo();}
						}
					}});
				});
				menu.newEntry({menuName: subMenuName, entryText: 'sep'});
				menu.newEntry({menuName: subMenuName, entryText: 'Add new preset', func: () => {
					presets.push({dsp: '...', tf: '.\\%filename%.mp3', path: ''});
					list.properties['converterPreset'][1] = JSON.stringify(presets);
					overwriteProperties(list.properties);
					if (list.bDynamicMenus) {list.createMainMenuDynamic(); list.exportPlaylistsInfo();}
				}});
				const subMenuNameTwo = menu.newMenu('Remove preset...', subMenuName);
				presets.forEach((preset, i) => {
					const path = preset.path;
					let pathName = (path.length ? '(' + path.split('\\')[0] +'\\) ' + path.split('\\').slice(-2, -1) : '(Folder)');
					const dsp = preset.dsp;
					let dspName = (dsp !== '...' ? dsp  : '(DSP)');
					const tf = preset.tf;
					let tfName = preset.hasOwnProperty('name') && preset.name.length ? preset.name : preset.tf;
					if (pathName.length > 20) {pathName = pathName.substr(0, 20) + '...';}
					if (dspName.length > 20) {dspName = dspName.substr(0, 20) + '...';}
					if (tfName.length > 40) {tfName = tfName.substr(0, 40) + '...';}
					menu.newEntry({menuName: subMenuNameTwo, entryText: 'Preset ' + (i + 1) + ': ' + pathName + ': ' + dspName + ' ---> ' + tfName, func: () => {
						presets.splice(i, 1);
						list.properties['converterPreset'][1] = JSON.stringify(presets);
						overwriteProperties(list.properties);
						if (list.bDynamicMenus) {list.createMainMenuDynamic(); list.exportPlaylistsInfo();}
					}});
				});
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'sep'});
				menu.newEntry({menuName: subMenuNameTwo, entryText: 'Restore defaults', func: () => {
					list.properties['converterPreset'][1] = list.defaultProperties['converterPreset'][3];
					overwriteProperties(list.properties);
					if (list.bDynamicMenus) {list.createMainMenuDynamic(); list.exportPlaylistsInfo();}
				}});
			}
		}
	}
	menu.newEntry({entryText: 'sep'});
	{	// UI
		const menuName = menu.newMenu('UI');
		{	// Playlist Size
			const subMenuName = menu.newMenu('Show Playlist size...', menuName);
			const options = ['Yes: Shown along the playlist name', 'No: Only shown on tooltip'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Track count on parenthesis:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bShowSize = (i === 0) ? true : false;
					list.properties['bShowSize'][1] = list.bShowSize;
					overwriteProperties(list.properties);
				}});
			});
			//list.bUpdateAutoplaylist changes to false after firing, but the property is constant unless the user changes it...
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bShowSize ? 0 : 1);});
		}
		{	// Name/category sep
			const subMenuName = menu.newMenu('Show name/category separators...', menuName);
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
		{	// Name/category sep
			const subMenuName = menu.newMenu('Set playlist icons...', menuName);
			const options = ['Yes: icons + playlist name','No: only playlist name'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'Show playlist icons?', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bShowIcons = (i === 0) ? true : false;
					list.properties['bShowIcons'][1] = list.bShowIcons;
					overwriteProperties(list.properties);
				}});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bShowIcons ? 0 : 1);});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			menu.newEntry({menuName: subMenuName, entryText: 'Personalize playlist icons...', func: () => {
				let input;
				try {input = utils.InputBox(window.ID, 'Edit Unicode values: {".ext": {"icon": "fxxx", "iconBg": "fxxx"}, ...}\n\nNull will disable the icon or background.\nSee also: https://fontawesome.com/v5/cheatsheet\n\nExample: {".m3u8":{"icon":"f15c","iconBg":null}}', window.Name, list.properties['playlistIcons'][1], true);} 
				catch(e) {return;}
				if (!input.length) {input = '{}';}
				if (input === list.properties['playlistIcons'][1]) {return;}
				try {JSON.parse(input)} catch(e) {return;}
				list.playlistIcons = JSON.parse(input);
				list.properties['playlistIcons'][1] = input;
				overwriteProperties(list.properties);
				list.updatePlaylistIcons();
				window.Repaint();
			}});
		}
		menu.newEntry({menuName, entryText: 'sep'});
		{	// Tooltips
			const subMenuName = menu.newMenu('Show usage info on tooltips...', menuName);
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
		{	// Playlist header menu
			const subMenuName = menu.newMenu('Show playlist header on menus...', menuName);
			const options = ['Yes: Show playlist format and name','No: Only the contextual menu'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'On playlist contextual menu:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bShowMenuHeader = (i === 0) ? true : false;
					list.properties['bShowMenuHeader'][1] = list.bShowMenuHeader;
					overwriteProperties(list.properties);
				}});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bShowMenuHeader ? 0 : 1);});
		}
		menu.newEntry({menuName, entryText: 'sep'});
		{	// Font size
			const subMenuName = menu.newMenu('Font size...', menuName);
			if (panel.listObjects.length || panel.textObjects.length) {
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
								panel.fontChanged();
								window.Repaint();
							}
						} else {
							let input;
							try {input = Number(utils.InputBox(window.ID, 'Input a number:', window.Name, panel.fonts.size, true));} 
							catch(e) {return;}
							if (input === panel.fonts.size) {return;}
							if (!Number.isSafeInteger(input)) {return;}
							panel.fonts.size = input;
							// Update property to save between reloads
							panel.properties['fontSize'][1] = input;
							overwriteProperties(panel.properties);
							panel.fontChanged();
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
			const subMenuName = menu.newMenu('Set custom color...', menuName);
			const options = ['AutoPlaylists...','Smart playlists...','UI-only playlists...','Locked Playlists...','Selection rectangle...'];
			const optionsLength = options.length;
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					if (i === 0) {list.colours.autoPlaylistColour = utils.ColourPicker(window.ID, list.colours.autoPlaylistColour);}
					if (i === 1) {list.colours.smartPlaylistColour = utils.ColourPicker(window.ID, list.colours.smartPlaylistColour);}
					if (i === 2) {list.colours.uiPlaylistColour = utils.ColourPicker(window.ID, list.colours.uiPlaylistColour);}
					if (i === 3) {list.colours.lockedPlaylistColour = utils.ColourPicker(window.ID, list.colours.lockedPlaylistColour);}
					if (i === 4) {list.colours.selectedPlaylistColour = utils.ColourPicker(window.ID, list.colours.selectedPlaylistColour);}
					// Update property to save between reloads
					list.properties.listColours[1] = convertObjectToString(list.colours);
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
						panel.properties.bCustomText[1] = panel.colours.bCustomText;
						overwriteProperties(panel.properties);
						panel.coloursChanged();
						window.Repaint();
					}});
				});
				menu.newCheckMenu(subMenuSecondName, options[0], options[optionsLength - 1], () => {return panel.colours.bCustomText;});
				menu.newEntry({menuName: subMenuSecondName, entryText: 'sep'});
				menu.newEntry({menuName: subMenuSecondName, entryText: 'Set custom colour...', func: () => {
					panel.colours.customText = utils.ColourPicker(window.ID, panel.colours.customText);
					// Update property to save between reloads
					panel.properties.customText[1] = panel.colours.customText;
					overwriteProperties(panel.properties);
					panel.coloursChanged();
					window.Repaint();
				}, flags: panel.colours.bCustomText ? MF_STRING : MF_GRAYED,});
			}
			{	// Buttons' Text color
				const subMenuSecondName = menu.newMenu('Buttons\' Text...', subMenuName);
				const options = ['Use default (black)', 'Custom'];
				const optionsLength = options.length;
				options.forEach((item, i) => {
					menu.newEntry({menuName: subMenuSecondName, entryText: item, func: () => {
						panel.colours.buttonsTextColor = i ? utils.ColourPicker(window.ID, panel.colours.buttonsTextColor) : RGB(0,0,0);
						panel.properties.buttonsTextColor[1] = panel.colours.buttonsTextColor;
						// Update property to save between reloads
						overwriteProperties(panel.properties);
						panel.coloursChanged();
						window.Repaint();
					}});
				});
				menu.newCheckMenu(subMenuSecondName, options[0], options[optionsLength - 1], () => {return (panel.colours.buttonsTextColor === RGB(0,0,0) ? 0 : 1);});
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
							panel.coloursChanged();
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
						panel.coloursChanged();
						window.Repaint();
					}, flags: panel.colours.mode === 2 ? MF_STRING : MF_GRAYED,});
				}
				menu.newEntry({menuName: subMenuSecondName, entryText: 'sep'});
				menu.newEntry({menuName: subMenuSecondName, entryText: 'Alternate rows background color', func: () => {
					panel.colours.bAltRowsColor = !panel.colours.bAltRowsColor;
					panel.properties['bAltRowsColor'][1] = panel.colours.bAltRowsColor;
					overwriteProperties(panel.properties);
					panel.coloursChanged();
					window.Repaint();
				}});
				menu.newCheckMenu(subMenuSecondName, 'Alternate rows background color', void(0), () => {return panel.colours.bAltRowsColor;});
			}
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			{	// Presets
				const subMenuSecondName = menu.newMenu('Presets...', subMenuName);
				const presets = [ /*[autoPlaylistColour, smartPlaylistColour, uiPlaylistColour, lockedPlaylistColour, selectedPlaylistColour, standard text, buttons, background ]*/
					{name: 'Color Blindness (light)', colors: [colorBlind.yellow[2], colorBlind.yellow[2], colorBlind.blue[0], colorBlind.blue[1], colorBlind.blue[1], colorBlind.black[2], colorBlind.black[2], colorBlind.white[0]]},
					{name: 'Color Blindness (dark)', colors: [colorBlind.yellow[1], colorBlind.yellow[1], colorBlind.yellow[2], colorBlind.blue[1], colorBlind.blue[2], colorBlind.white[1], colorBlind.black[2], colorBlind.black[2]]},
					{name: 'sep'},
					{name: 'Gray Scale (dark)', colors: [colorBlind.black[1], colorBlind.black[1], colorBlind.white[0], colorBlind.black[2], colorBlind.black[2], colorBlind.white[0], colorBlind.black[2], colorBlind.black[0]]},
					{name: 'Gray Scale (light)', colors: [colorBlind.black[1], colorBlind.black[1], colorBlind.black[0], colorBlind.black[1], colorBlind.black[2], colorBlind.black[2], colorBlind.black[2], colorBlind.white[0]]},
					{name: 'sep'},
					{name: 'Dark theme', colors: [blendColours(RGB(157, 158, 163), RGB(...toRGB(0xFFFF629B)), 0.6), blendColours(RGB(157, 158, 163), RGB(...toRGB(0xFF65CC32)), 0.6), blendColours(RGB(157, 158, 163), RGB(...toRGB(0xFF00AFFD)), 0.8), RGB(...toRGB(0xFFDC143C)), RGB(...toRGB(0xFF0080C0)), RGB(170, 170, 170), RGB(0, 0, 0), RGB(30, 30, 30)]},
					{name: 'sep'},
					{name: 'Default'}
				];
				presets.forEach((preset) => {
					if (preset.name.toLowerCase() === 'sep') {menu.newEntry({menuName: subMenuSecondName, entryText: 'sep'}); return;}
					menu.newEntry({menuName: subMenuSecondName, entryText: preset.name, func: () => {
						if (preset.name.toLowerCase() === 'default') {
							panel.properties.coloursMode[1] = panel.colours.mode = 0;
							panel.properties.buttonsTextColor[1] = panel.colours.buttonsTextColor = RGB(0,0,0);
							panel.properties.bCustomText[1] = panel.colours.bCustomText = false;
							list.colours = {};
						}
						else {
							panel.properties.coloursMode[1] = panel.colours.mode = 2;
							panel.properties.customBackground[1] = panel.colours.custom_background = preset.colors[7];
							panel.properties.buttonsTextColor[1] = panel.colours.buttonsTextColor = preset.colors[6];
							panel.properties.bCustomText[1] = panel.colours.bCustomText = true;
							panel.properties.customText[1] = panel.colours.customText = preset.colors[5];
							list.colours.autoPlaylistColour = preset.colors[0];
							list.colours.smartPlaylistColour = preset.colors[1];
							list.colours.uiPlaylistColour = preset.colors[2];
							list.colours.lockedPlaylistColour = preset.colors[3];
							list.colours.selectedPlaylistColour = preset.colors[4];
						}				
						list.properties.listColours[1] = convertObjectToString(list.colours);
						overwriteProperties(list.properties);
						overwriteProperties(panel.properties);
						panel.coloursChanged();
						list.checkConfig();
						window.Repaint();
					}});
				});
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
				panel.colours.buttonsTextColor = RGB(0,0,0);
				panel.coloursChanged();
				overwriteProperties(list.properties);
				list.checkConfig();
				window.Repaint();
			}});
		}
		menu.newEntry({menuName, entryText: 'sep'});
		{	// Shortcuts
			const subMenuName = menu.newMenu('Shortcuts...', menuName);
			{
				const subMenuNameL = menu.newMenu('Left CLick', subMenuName)
				const shortcuts =  list.getDefaultShortcuts('L');
				const modifiers = shortcuts.options.map((_) => {return _.key;});
				const actions = shortcuts.actions.map((_) => {return _.key;});
				menu.newEntry({menuName: subMenuNameL, entryText: 'Modifiers on L. Click:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuNameL, entryText: 'sep'});
				modifiers.forEach((modifier) => {
					const subMenuOption = menu.newMenu(modifier + nextId('invisible', true, false), subMenuNameL);
					actions.forEach((action) => {
						const flags = modifier === 'Double Click' && action === 'Multiple selection' ? MF_GRAYED : MF_STRING;
						menu.newEntry({menuName: subMenuOption, entryText: action, func: () => {
							list.lShortcuts[modifier] = action;
							list.properties['lShortcuts'][1] = JSON.stringify(list.lShortcuts);
							overwriteProperties(list.properties);
							if (action === 'Multiple selection') {
								fb.ShowPopupMessage('Allows to select multiple playlists at the same time and execute a shortcut action for every item. i.e. Loading playlist, locking, etc.\n\nNote opening the playlist menu will show a limited list of available actions according to the selection. To display the entire menu, use single selection instead. ', window.Name);
							}
						}, flags});
					});
					menu.newCheckMenu(subMenuOption, actions[0], actions[actions.length - 1], () => {
						const idx = actions.indexOf(list.lShortcuts[modifier]);
						return (idx !== -1 ? idx : 0);
					});
				});
				menu.newEntry({menuName: subMenuNameL, entryText: 'sep'});
				menu.newEntry({menuName: subMenuNameL, entryText: 'Restore defaults', func: () => {
					list.properties['lShortcuts'][1] = list.defaultProperties['lShortcuts'][3];
					list.lShortcuts = JSON.parse(list.properties['lShortcuts'][1]);
					overwriteProperties(list.properties);
				}});
			}
			{
				const subMenuNameM = menu.newMenu('Middle CLick', subMenuName)
				const shortcuts =  list.getDefaultShortcuts('M');
				const modifiers = shortcuts.options.map((_) => {return _.key;});
				const actions = shortcuts.actions.map((_) => {return _.key;});
				menu.newEntry({menuName: subMenuNameM, entryText: 'Modifiers on M. Click:', flags: MF_GRAYED});
				menu.newEntry({menuName: subMenuNameM, entryText: 'sep'});
				modifiers.forEach((modifier) => {
					const subMenuOption = menu.newMenu(modifier + nextId('invisible', true, false), subMenuNameM);
					actions.forEach((action) => {
						menu.newEntry({menuName: subMenuOption, entryText: action, func: () => {
							list.mShortcuts[modifier] = action;
							list.properties['mShortcuts'][1] = JSON.stringify(list.mShortcuts);
							overwriteProperties(list.properties);
							if (action === 'Multiple selection') {
								fb.ShowPopupMessage('Allows to select multiple playlists at the same time and execute a shortcut action for every item. i.e. Loading playlist, locking, etc.\n\nNote opening the playlist menu will show a limited list of available actions according to the selection. To display the entire menu, use single selection instead. ', window.Name);
							}
						}});
					});
					menu.newCheckMenu(subMenuOption, actions[0], actions[actions.length - 1], () => {
						const idx = actions.indexOf(list.mShortcuts[modifier]);
						return (idx !== -1 ? idx : 0);
					});
				});
				menu.newEntry({menuName: subMenuNameM, entryText: 'sep'});
				menu.newEntry({menuName: subMenuNameM, entryText: 'Restore defaults', func: () => {
					list.properties['mShortcuts'][1] = list.defaultProperties['mShortcuts'][3];
					list.lShortcuts = JSON.parse(list.properties['lShortcuts'][1]);				list.mShortcuts = JSON.parse(list.properties['mShortcuts'][1]);
					overwriteProperties(list.properties);
				}});
			}
		}
	}
	menu.newEntry({entryText: 'sep'});
	{	// Integration
		const menuName = menu.newMenu('Integration');
		{	// Dynamic menus
			const flags = isCompatible('1.6.1', 'smp') ? MF_STRING : MF_GRAYED;
			const subMenuName = menu.newMenu('Create dynamic menus...', menuName);
			const options = ['Yes: for CMD, foo_httpcontrol (ajquery-xxx), ...', 'No: don\'t integrate the panel in main menu'];
			const optionsLength = options.length;
			menu.newEntry({menuName: subMenuName, entryText: 'File\\Spider Monkey Panel\\Script commands:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			options.forEach((item, i) => {
				menu.newEntry({menuName: subMenuName, entryText: item, func: () => {
					list.bDynamicMenus = i === 0 ? true : false;
					if (list.bDynamicMenus) {
						fb.ShowPopupMessage('Remember to set different panel names to every Playlist Manager panel, otherwise menus will not be properly associated to a single panel.\n\nShift + Win + R. Click -> Configure panel... (\'edit\' at top)\n\nPlaylists tagged with \'bMultMenu\' will be associated to these special\nmenu entries:\n\t-Load tagged playlists\n\t-Clone tagged playlists in UI', window.Name);
					}
					list.properties['bDynamicMenus'][1] = list.bDynamicMenus;
					overwriteProperties(list.properties);
					// And create / delete menus
					if (list.bDynamicMenus) {list.createMainMenuDynamic(); list.exportPlaylistsInfo();} 
					else {list.deleteMainMenuDynamic(); list.deleteExportInfo();}
					if (folders.ajqueryCheck()) {exportComponents(folders.ajquerySMP);}
				}, flags});
			});
			menu.newCheckMenu(subMenuName, options[0], options[optionsLength - 1],  () => {return (list.bDynamicMenus ? 0 : 1);});
		}
		{	// ListenBrainz
			const subMenuName = menu.newMenu('ListenBrainz...', menuName);
			menu.newEntry({menuName: subMenuName, entryText: 'Set token...', func: async () => {return await checkLBToken('');}});
			menu.newCheckMenu(subMenuName, 'Set token...', void(0), () => {return list.properties.lBrainzToken[1].length ? true : false;});
			menu.newEntry({menuName: subMenuName, entryText: 'Open user profile'  + (bListenBrainz ? '' : '\t(token not set)'), func: async () => {
				if (!await checkLBToken()) {return;}
				const token = bListenBrainz ? lb.decryptToken({lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1]}) : null;
				if (!token) {return false;}
				const user = await lb.retrieveUser(token);
				if (user.length) {_runCmd('CMD /C START https://listenbrainz.org/user/' + user + '/playlists/', false);}
			}, flags: bListenBrainz ? MF_STRING: MF_GRAYED});
			menu.newEntry({menuName: subMenuName, entryText: 'sep'});
			menu.newEntry({menuName: subMenuName, entryText: 'Lookup for missing track MBIDs?', func: () => {
				list.properties.bLookupMBIDs[1] = !list.properties['bLookupMBIDs'][1];
				if (list.properties.bLookupMBIDs[1]) {
					fb.ShowPopupMessage('Exporting a playlist requires tracks to have \'MUSICBRAINZ_TRACKID\' tags on files.\n\nWhenever such tag is missing, the file can not be sent to ListenBrainz\'s online playlist. As workaround, the script may try to lookup missing MBIDs before exporting.\n\nNote results depend on the success of MusicBrainz api, so it\'s not guaranteed to find the proper match in all cases. Tag properly your files with Picard or foo_musicbrainz in such case.\n\nApi used:\nhttps://labs.api.listenbrainz.org/mbid-mapping', window.Name);
				}
				overwriteProperties(list.properties);
			}, flags: bListenBrainz ? MF_STRING: MF_GRAYED});
			menu.newCheckMenu(subMenuName, 'Lookup for missing track MBIDs?', void(0), () => {return list.properties.bLookupMBIDs[1];});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{	// Readme
		const path = folders.xxx + 'readmes\\playlist_manager.pdf';
		menu.newEntry({entryText: 'Open documentation...',  func: () => {
			if (_isFile(path)) {
				const bDone = _run(path);
				if (!bDone) {_explorer(path);}
			} else {console.log('Readme not found: ' + path);}
		}});
	}
	return menu;
}

function createMenuRightSort() {
	// Constants
	const z = (list.index !== -1) ? list.index : list.getCurrentItemIndex();
	const menu = menuRbtnSort;
	menu.clear(true); // Reset one every call
	// Entries
	{	// Sorting
		const options = Object.keys(list.sortMethods());
		const optionsLength = options.length;
		menu.newEntry({entryText: 'Change sorting method:', flags: MF_GRAYED});
		menu.newEntry({entryText: 'sep'});
		if (optionsLength) {
			options.forEach((item) => {
				menu.newEntry({entryText: item, func: () => {
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
		menu.newCheckMenu(menu.getMainMenuName(), options[0], options[optionsLength - 1],  () => {return options.indexOf(list.methodState);});
	}
	return menu;
}

function createMenuRightFilter(buttonKey) {
	// Constants
	const z = (list.index !== -1) ? list.index : list.getCurrentItemIndex();
	const menu = menuRbtnSort;
	menu.clear(true); // Reset one every call
	// Entries
	{	// Sorting
		const options = ['Lock state', 'Extension', 'Playlist type', 'Tag', 'Category'];
		const optionsLength = options.length;
		menu.newEntry({entryText: 'Change filtering method:', flags: MF_GRAYED});
		menu.newEntry({entryText: 'sep'});
		if (optionsLength) {
			options.forEach((item) => {
				menu.newEntry({entryText: item, func: () => {
					// Switch buttons if they are duplicated
					const buttonsArr = Object.entries(buttonsPanel.buttons);
					const idx = buttonsArr.findIndex((pair) => {return pair[0] !== buttonKey && pair[1].method === item;});
					if (idx !== -1) {buttonsPanel.buttons[buttonsArr[idx][0]].method = buttonsPanel.buttons[buttonKey].method;}
					// Set new one
					buttonsPanel.buttons[buttonKey].method = item;
					// Resize buttons
					recalcWidth();
					// Save properties
					list.properties['filterMethod'][1] = Object.values(buttonsPanel.buttons).map((button) => {return (button.hasOwnProperty('method') ? button.method : '');}).filter(Boolean).join(',');
					overwriteProperties(list.properties);
				}});
			});
		}
		menu.newCheckMenu(menu.getMainMenuName(), options[0], options[optionsLength - 1],  () => {return options.indexOf(buttonsPanel.buttons[buttonKey].method);});
	}
	menu.newEntry({entryText: 'sep'});
	{	// Restore
		menu.newEntry({entryText: 'Restore all filters', func: () => {
			list.resetFilter();
		}});
	}
	return menu;
}

async function checkLBToken(lBrainzToken = list.properties.lBrainzToken[1]) {
	if (!lBrainzToken.length) {
		const lb = listenBrainz;
		const encryptToken = '********-****-****-****-************';
		const currToken = list.properties.lBrainzEncrypt[1] ? encryptToken : list.properties.lBrainzToken[1];
		try {lBrainzToken = utils.InputBox(window.ID, 'Enter ListenBrainz user token:', window.Name, currToken, true);} 
		catch(e) {return false;}
		if (lBrainzToken === currToken || lBrainzToken === encryptToken) {return false;}
		if (lBrainzToken.length) {
			if (!(await lb.validateToken(lBrainzToken))) {fb.ShowPopupMessage('ListenBrainz Token not valid.', window.Name); return false;}
			const answer = WshShell.Popup('Do you want to encrypt the token?', 0, window.Name, popup.question + popup.yes_no);
			if (answer === popup.yes) {
				let pass = '';
				try {pass = utils.InputBox(window.ID, 'Enter a passowrd:\n(will be required on every use)', window.Name, pass, true);} 
				catch(e) {return false;}
				if (!pass.length) {return false;}
				lBrainzToken = new SimpleCrypto(pass).encrypt(lBrainzToken);
			}
			list.properties.lBrainzEncrypt[1] = answer === popup.yes;
		}
		list.properties.lBrainzToken[1] = lBrainzToken;
		overwriteProperties(list.properties);
	}
	return true;
}