'use strict';
//14/11/25

/* exported createMenuLeft, createMenuLeftMult, createMenuRightFilter, createMenuSearch, createMenuRightTop, createMenuRightSort, createMenuFilterSorting, importSettingsMenu, createMenuExport */

/* global list:readable, popup:readable, delayAutoUpdate:readable, bottomToolbar:readable, autoUpdateRepeat:writable, debouncedAutoUpdate:readable, autoBackRepeat:writable, instances:readable, pop:readable, panel:readable, Chroma:readable, stats:readable, cachePlaylist:readable, scrollBar:readable */
/* global debouncedUpdate:writable */ // eslint-disable-line no-unused-vars
include('..\\..\\helpers\\helpers_xxx.js');
/* global MF_STRING:readable, MF_GRAYED:readable, MF_MENUBARBREAK:readable, debounce:readable, VK_SHIFT:readable, folders:readable, checkUpdate:readable, globSettings:readable, globRegExp:readable, convertObjectToString:readable, repeatFn:readable, globTags:readable, globQuery:readable, clone:readable */
include('..\\..\\helpers\\helpers_xxx_controller.js');
/* global exportComponents:readable */
include('..\\..\\helpers\\callbacks_xxx.js');
/* global callbacksListener:readable */
include('..\\..\\helpers\\helpers_xxx_properties.js');
/* global overwriteProperties:readable, checkProperty:readable */
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
/* global isArrayStrings:readable, sanitize:readable, _p:readable, nextId:readable, isArrayEqual:readable, _b:readable, capitalize:readable, capitalizeAll:readable, isUUID:readable, _qCond:readable, _t:readable, range:readable, _ps:readable, isCompatible:readable */
include('..\\..\\helpers\\helpers_xxx_file.js');
/* global _isLink:readable, _isFile:readable, _save:readable, _deleteFile:readable, _renameFile:readable, _explorer:readable, WshShell:readable, getRelPath:readable, _open:readable, utf8:readable, _run:readable, _hasRecycleBin:readable, _restoreFile:readable, sanitizePath:readable, _isFolder:readable _createFolder:readable, mappedDrives:readable, _resolvePath:readable, _runCmd:readable, _copyFile:readable, _recycleFile:readable , _jsonParseFileCheck:readable, getFiles:readable, _moveFile:readable _foldPath:readable */
include('..\\..\\helpers\\helpers_xxx_export.js');
/* global exportSettings:readable, importSettings:readable */
include('..\\..\\helpers\\menu_xxx.js');
/* global _menu:readable */
include('..\\..\\helpers\\helpers_xxx_input.js');
/* global Input:readable */
include('..\\..\\helpers-external\\namethatcolor\\ntc.js');
/* global ntc:readable */
include('..\\..\\helpers\\helpers_xxx_playlists.js');
/* global getPlaylistIndexArray:readable, sendToPlaylist:readable, MAX_QUEUE_ITEMS:readable, fileRegex:readable, setLocks:readable */
include('..\\..\\helpers\\helpers_xxx_playlists_files.js');
/* global loadablePlaylistFormats:readable, writablePlaylistFormats:readable, savePlaylist:readable, relPathSplit:readable, resolveTrackRelativePath:readable */
include('..\\..\\helpers\\helpers_xxx_playlists_files_xspf.js');
/* global XSPF:readable */
include('..\\..\\helpers\\helpers_xxx_playlists_files_xsp.js');
/* global XSP:readable */
include('..\\..\\helpers\\helpers_xxx_tags.js');
/* global checkQuery:readable, stripSort:readable, getHandleListTagsV2:readable, checkSort:readable, queryReplaceWithCurrent:readable, isSubsongPath:readable, queryJoin:readable */
include('..\\..\\helpers\\helpers_xxx_UI.js');
/* global invert:readable, colorBlind:readable, RGB:readable, toRGB:readable, blendColors:readable */
include('..\\..\\helpers\\helpers_xxx_UI_chars.js');
/* global chars:readable */
include('playlist_manager_helpers.js');
/* global setCategory:readable, setTag:readable, setTrackTags:readable, clonePlaylistInUI:readable, setCategory:readable, convertToRelPaths:readable, setPlaylist_mbid:readable, cloneAsSmartPls:readable, switchLock:readable, cloneAsAutoPls:readable, findFormatErrors:readable, clonePlaylistMergeInUI:readable, clonePlaylistFile:readable, exportPlaylistFile:readable, exportPlaylistFiles:readable, exportPlaylistFileWithTracks:readable, exportPlaylistFileWithTracksConvert:readable, exportAutoPlaylistFileWithTracksConvert:readable, renamePlaylist:readable, renameFolder:readable, rewriteXSPQuery:readable, rewriteXSPSort:readable, rewriteXSPLimit:readable, findMixedPaths:readable, backup:readable, findExternal:readable, findSubSongs:readable, findBlank:readable, findDurationMismatch:readable, findSizeMismatch:readable, findSubSongs:readable, findDead:readable, cloneAsStandardPls:readable, findDuplicatesByPath:readable, findCircularReferences:readable, findDuplicatesByTF:readable */
include('playlist_manager_listenbrainz.js');
/* global ListenBrainz:readable, SimpleCrypto:readable */
include('playlist_manager_youtube.js');
/* global isYouTube:readable, youTube:readable */
include('..\\playlists\\playlist_revive.js');
/* global playlistRevive:readable, selectDeadItems:readable , getDeadItems:readable */
include('..\\playlists\\import_text_playlist.js');
/* global ImportTextPlaylist:readable */

// Menus
const menuRbtn = new _menu();
menuRbtn.cache = {};
const menuLbtn = new _menu();
const menuLbtnMult = new _menu();
const menuRbtnTop = new _menu();
const menuRbtnSort = new _menu();
const menuSearch = new _menu();
const menuFilterSorting = new _menu();

// on callbacks
function createMenuLeft(forcedIndex = -1) {
	// Constants
	const z = (forcedIndex === -1) ? list.index : forcedIndex; // When delaying menu, the mouse may move to other index...
	list.tooltip.SetValue(null);
	const menu = menuLbtn;
	menu.clear(true); // Reset on every call
	if (z === -1) {
		fb.ShowPopupMessage('Selected index was -1 on createMenuLeft() when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.', window.Name + _ps(window.ScriptInfo.Name));
		return menu;
	}
	/** @type {PlaylistObj} */
	const pls = list.data[z];
	if (!pls) {
		fb.ShowPopupMessage('Selected playlist was null when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.', window.Name + _ps(window.ScriptInfo.Name));
		return menu;
	}
	const autoTags = ['bAutoLoad', 'bAutoLock', 'bMirrorChanges', 'bMultMenu', 'bSkipMenu', 'bPinnedFirst', 'bPinnedLast'];
	const lb = ListenBrainz;
	const uiIdx = plman.FindPlaylist(pls.nameId);
	const bIsPlsLoaded = uiIdx !== -1;
	// Helpers
	const isPlsActive = (pls) => plman.GetPlaylistName(plman.ActivePlaylist) === pls.nameId;
	const isAutoPls = (pls) => pls.isAutoPlaylist || pls.query;
	const isLockPls = (pls) => pls.isLocked;
	const isPlsEditable = (pls) => pls.extension === '.m3u' || pls.extension === '.m3u8' || pls.extension === '.xspf' || pls.extension === '.fpl' || pls.extension === '.xsp' || pls.isAutoPlaylist || pls.extension === '.ui';
	const isPlsLockable = (pls) => isPlsEditable(pls) || pls.extension === '.strm';
	const isPlsUI = (pls) => pls.extension === '.ui';
	const isFolder = (pls) => pls.isFolder;
	const locks = bIsPlsLoaded ? (plman.GetPlaylistLockedActions(uiIdx) || []) : [];
	// Evaluate
	const bIsPlsActive = isPlsActive(pls);
	const bIsAutoPls = isAutoPls(pls);
	const bIsFolder = isFolder(pls);
	const bIsValidXSP = pls.extension !== '.xsp' || Object.hasOwn(pls, 'type') && pls.type === 'songs';
	const bIsLockPls = isLockPls(pls);
	const bIsLockPlsRename = bIsPlsLoaded && locks.includes('RenamePlaylist');
	const bIsPlsEditable = isPlsEditable(pls);
	const bIsPlsLockable = isPlsLockable(pls);
	const bIsPlsUI = isPlsUI(pls);
	const bWritableFormat = writablePlaylistFormats.has(pls.extension);
	const bListenBrainz = list.properties.lBrainzToken[1].length > 0;
	const bManualSorting = list.methodState === list.manualMethodState();
	const bHasFolders = list.data.some(isFolder);
	// Enabled menus
	const showMenus = JSON.parse(list.properties.showMenus[1]);
	// Header
	if (list.bShowMenuHeader) {
		let header = (bIsFolder ? '[' : '--- ');
		switch (pls.extension) { // NOSONAR [open to future edits]
			case '.xsp': header += 'Smart Playlist'; break;
			default:
				if (bIsAutoPls) {
					header += 'AutoPlaylist';
					if (bIsPlsUI) { header += ' (UI)'; }
				}
				else if (bIsFolder) { header += 'Folder'; }
				else { header += pls.extension + ' Playlist'; }
		}
		header += ': ' + pls.name + (bIsFolder ? ']' : ' ---') + (bIsValidXSP ? '' : ' (invalid type)') + (bIsFolder ? ' -> ' + pls.pls.length + ' playlist(s)' : '');
		menu.newEntry({ entryText: header, flags: MF_GRAYED });
		menu.newSeparator();
	}
	if (bIsFolder) { createMenuFolder(menu, pls, z); }
	else {
		// Entries
		{	// Load
			{	// Load
				// Load playlist within foobar2000. Only 1 instance allowed
				((!list.bLiteMode || pls.isAutoPlaylist) && !bIsPlsUI) && menu.newEntry({
					entryText: bIsPlsLoaded ? 'Reload playlist (overwrite)' : 'Load playlist' + list.getGlobalShortcut('load'), func: () => {
						list.loadPlaylist(z);
					}, flags: bIsPlsUI ? MF_GRAYED : MF_STRING
				});
				// Show bound playlist
				menu.newEntry({
					entryText: bIsPlsUI
						? 'Show playlist'
						: 'Show bound playlist' + (bIsPlsLoaded && bIsPlsActive ? (bIsPlsLoaded ? ' (active playlist)' : ' (not loaded)') : ''),
					func: () => { list.showBoundPlaylist(z); }, flags: bIsPlsLoaded && !bIsPlsActive ? MF_STRING : MF_GRAYED
				});
				menu.newEntry({
					entryText: 'Close playlist' + (bIsPlsLoaded ? (locks.includes('RemovePlaylist') ? ' (locked)' : '') : ' (not loaded)') + (bIsPlsUI ? list.getGlobalShortcut('delete') : ''),
					func: () => { plman.RemovePlaylistSwitch(uiIdx); },
					flags: bIsPlsLoaded && !locks.includes('RemovePlaylist') ? MF_STRING : MF_GRAYED
				});
				// Contextual menu
				if (bIsPlsLoaded && showMenus['Playlist\'s items menu']) {
					menu.newSeparator();
					menu.newMenu('Items (contextual menu)', void (0), void (0), { type: 'handlelist', playlistIdx: plman.FindPlaylist(pls.nameId) });
				}
				if (showMenus['Queue handling']) {
					menu.newSeparator();
					menu.newEntry({
						entryText: 'Add tracks to queue',
						func: () => list.queuePlaylist(pls, { bAsync: true })
					});
					menu.newEntry({
						entryText: 'Add tracks to queue (random)',
						func: () => list.queuePlaylist(pls, { bAsync: true, bRandom: true, bDedup: true })
					});
				}
				menu.newSeparator();
				const selItems = fb.GetSelections(1);
				menu.newEntry({
					entryText: 'Copy selection to playlist', func: () => {
						if (selItems && selItems.Count) {
							list.sendSelectionToPlaylist({ playlistIndex: z, bCheckDup: true });
						}
					}, flags: !bIsAutoPls && !bIsLockPls && (bWritableFormat || bIsPlsUI) && selItems && selItems.Count ? MF_STRING : MF_GRAYED
				});
				menu.newSeparator();
			}
			// Renames both playlist file and playlist within foobar2000. Only 1 instance allowed
			menu.newEntry({
				entryText: (!bIsLockPls && !bIsLockPlsRename ? 'Rename...' : (bIsAutoPls || bIsPlsUI ? 'Rename...' : 'Rename... (only filename)')) + list.getGlobalShortcut('rename'), func: () => {
					const input = Input.string('string', pls.name, 'Enter playlist name:', window.Name + _ps(window.ScriptInfo.Name) + ': ' + pls.name, 'My playlist', void (0), true);
					if (input === null) { return; }
					renamePlaylist(list, z, input);
				}, flags: bIsPlsUI && bIsLockPlsRename ? MF_GRAYED : MF_STRING
			});
		}
		{	// Edit and update
			if (bIsAutoPls) {
				// Change AutoPlaylist sort
				menu.newEntry({
					entryText: 'Edit sort pattern...' + (bIsPlsUI ? '\t(cloning required)' : ''), func: () => {
						let bDone = false;
						let input = Input.string('string', pls.sort, 'Enter sort pattern\n(optional)\n\nMust start with \'SORT ASCENDING BY\' or \'SORT DESCENDING BY\'.', window.Name + _ps(window.ScriptInfo.Name) + ': ' + pls.name, 'SORT BY %GENRE%', [(s) => !s.length || s.match(/SORT.*$/)], false);
						if (input === null) {
							if (!Input.isLastEqual) { return; }
							else { input = Input.lastInput; }
						}
						if (input.length && !checkSort(input)) { fb.ShowPopupMessage('Sort pattern not valid:\n' + input + '\n\n\nSort patterns must start with \'SORT BY\', \'SORT ASCENDING BY\' or \'SORT DESCENDING BY\' plus a valid TF expression (not empty) For ex.:\nSORT BY ' + globTags.rating + '.', window.Name + _ps(window.ScriptInfo.Name)); return null; }
						if (!Input.isLastEqual) {
							list.editData(pls, {
								sort: input,
								modified: Date.now()
							});
							bDone = true;
						}
						if (pls.sort.length) { // And force sorting
							const bSortForced = pls.extension === '.xsp' ? false : WshShell.Popup('Force sort?\n(currently ' + pls.bSortForced + ')', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no) === popup.yes;
							if (bSortForced !== pls.bSortForced) {
								list.editData(pls, {
									bSortForced,
									modified: Date.now()
								});
								bDone = true;
							}
						}
						if (bDone) { bDone = pls.extension === '.xsp' ? rewriteXSPSort(pls, input) : true; }
						if (bDone) {
							list.update({ bReuseData: true, bNotPaint: true, currentItemIndex: z });
							list.filter();
						}
					}, flags: !bIsLockPls && bIsValidXSP ? MF_STRING : MF_GRAYED
				});
				// Change AutoPlaylist query
				menu.newEntry({
					entryText: 'Edit query...' + (bIsPlsUI ? '\t(cloning required)' : ''), func: () => {
						const bXsp = pls.extension === '.xsp';
						let newQuery = '';
						try { newQuery = utils.InputBox(window.ID, 'Enter ' + (bXsp ? 'Smart Playlist' : 'AutoPlaylist') + ' query:', window.Name + _ps(window.ScriptInfo.Name), pls.query); }
						catch (e) { return; } // eslint-disable-line no-unused-vars
						const bPlaylist = newQuery.includes('#PLAYLIST# IS');
						let sortFromQuery = newQuery;
						newQuery = stripSort(newQuery);
						sortFromQuery = sortFromQuery.replace(newQuery, '').trimStart();
						if (!bPlaylist && !checkQuery(newQuery)) { fb.ShowPopupMessage('Query not valid:\n' + newQuery, window.Name + _ps(window.ScriptInfo.Name)); return; }
						if (bXsp) {
							const { rules } = XSP.getRules(newQuery);
							if (!rules.length) { fb.ShowPopupMessage('Query has no equivalence on XSP format:\n' + newQuery + '\n\nhttps://kodi.wiki/view/Smart_playlists/Rules_and_groupings', window.Name + _ps(window.ScriptInfo.Name)); return; }
							const jsp = XSP.emptyJSP('songs');
							jsp.playlist.rules = rules;
							if (list.checkCircularXsp({ jsp, name: pls.name })) {
								console.popup(pls.name + ': Playlist has circular references, using other playlist as sources which produce infinite recursion.\n\nIt may also happen when the playlist references itself or if the lookup nesting is higher than 100 steps.', window.Name + _ps(window.ScriptInfo.Name));
							}
						}
						if (newQuery !== pls.query || (sortFromQuery && sortFromQuery !== pls.sort)) {
							const bDone = bXsp ? rewriteXSPQuery(pls, newQuery) : true;
							if (bDone) {
								list.editData(pls, {
									query: newQuery,
									sort: sortFromQuery || pls.sort || '',
									size: bPlaylist
										? '?'
										: fb.GetQueryItems(fb.GetLibraryItems(), newQuery).Count,
									modified: Date.now()
								});
								list.update({ bReuseData: true, bNotPaint: true, currentItemIndex: z });
								list.filter();
								// Refresh in UI
								const uiIdx = getPlaylistIndexArray(pls.nameId);
								(async () => {
									for (let idx of uiIdx) {
										if (!bXsp && plman.IsAutoPlaylist(idx) || bXsp && !plman.IsAutoPlaylist(idx)) {
											if (await list.loadPlaylist(z).bLoaded) { break; }
										}
									}
								})();
							}
						}
					}, flags: !bIsLockPls && bIsValidXSP ? MF_STRING : MF_GRAYED
				});
				if (pls.extension === '.xsp') { // Smart Playlist Limit
					menu.newEntry({
						entryText: 'Edit limit...', func: () => {
							let input = Input.number('int positive', pls.limit, 'Enter number of tracks:', window.Name + _ps(window.ScriptInfo.Name) + ': ' + pls.name, 50);
							if (input === null) { return; }
							if (!Number.isFinite(input)) { input = 0; }
							const bDone = rewriteXSPLimit(pls, input);
							if (bDone) {
								list.editData(pls, {
									limit: input,
									modified: Date.now()
								});
								list.update({ bReuseData: true, bNotPaint: true, currentItemIndex: z });
								list.filter();
								// Refresh in UI
								const uiIdx = getPlaylistIndexArray(pls.nameId);
								(async () => {
									for (let idx of uiIdx) {
										if (!plman.IsAutoPlaylist(idx)) {
											if (await list.loadPlaylist(z).bLoaded) { break; }
										}
									}
								})();
							}
						}, flags: !bIsLockPls && bIsValidXSP ? MF_STRING : MF_GRAYED
					});
				} else if (bIsPlsUI) { // Show AutoPlaylist UI
					menu.newEntry({
						entryText: 'Show AutoPlaylist properties...', func: () => {
							plman.ShowAutoPlaylistUI(uiIdx);
						}
					});
				}
			} else if (!list.bLiteMode) {
				if (pls.extension === '.ui') {
					// Convert UI playlist
					menu.newEntry({
						entryText: 'Convert to playlist file', func: () => {
							const idx = plman.FindPlaylist(pls.nameId);
							list.convertUiPlaylist({ idx, name: pls.name, toFolder: list.getParentFolder(pls) });
						}, flags: bIsPlsUI ? MF_STRING : MF_GRAYED
					});
				} else {
					// Updates playlist file with any new changes on the playlist bound within foobar2000
					menu.newEntry({
						entryText: !bIsLockPls ? 'Update playlist file' : 'Force playlist file update', func: () => {
							if (_isFile(pls.path)) {
								const oldNameId = pls.nameId;
								const oldName = pls.name;
								const duplicated = getPlaylistIndexArray(oldNameId);
								if (duplicated.length > 1) { // There is more than 1 playlist with same name
									fb.ShowPopupMessage('You have more than one playlist with the same name: ' + oldName + '\n' + 'Please delete any duplicates and leave only the one you want.' + '\n' + 'The playlist file will be updated according to that unique playlist.', window.Name + _ps(window.ScriptInfo.Name));
								} else {
									let answer = popup.yes;
									if (pls.isLocked) { // Safety check for locked files (but can be overridden)
										answer = WshShell.Popup('Are you sure you want to update a locked playlist?\nIt will continue being locked afterwards.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
									}
									if (answer === popup.yes) { list.updatePlaylist({ playlistIndex: z, bForceLocked: true }); }
								}
							} else { fb.ShowPopupMessage('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name + _ps(window.ScriptInfo.Name)); }
						}, flags: bIsPlsLoaded && !bIsPlsUI ? MF_STRING : MF_GRAYED
					});
					// Updates active playlist name to the name set on the playlist file so they get bound and saves playlist content to the file.
					menu.newEntry({
						entryText: !bIsPlsActive ? 'Bind active playlist to this file' : 'Already bound to active playlist', func: () => {
							if (_isFile(pls.path)) {
								const oldNameId = plman.GetPlaylistName(plman.ActivePlaylist);
								const newNameId = pls.nameId;
								const newName = pls.name;
								const duplicated = plman.FindPlaylist(newNameId);
								if (duplicated !== -1) {
									fb.ShowPopupMessage('You already have a playlist loaded on foobar2000 bound to the selected file: ' + newName + '\n' + 'Please delete that playlist first within foobar2000 if you want to bind the file to a new one.' + '\n' + 'If you try to re-bind the file to its already bound playlist this error will appear too. Use \'Update playlist file\' instead.', window.Name + _ps(window.ScriptInfo.Name));
								} else {
									list.updatePlman(newNameId, oldNameId);
									const bDone = list.updatePlaylist({ playlistIndex: z });
									if (!bDone) { list.updatePlman(oldNameId, newNameId); } // Reset change
								}
							} else { fb.ShowPopupMessage('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name + _ps(window.ScriptInfo.Name)); }
						}, flags: !bIsPlsActive && !bIsLockPls && bWritableFormat ? MF_STRING : MF_GRAYED
					});
				}
			}
			if (showMenus['Category'] || showMenus['Tags']) {
				menu.newSeparator();
			}
		}
		{	// Tags and category
			if (showMenus['Category']) {
				{	// Set category
					const menuName = menu.newMenu('Set category', void (0), !bIsLockPls && bIsPlsEditable || bIsPlsUI ? MF_STRING : MF_GRAYED);
					menu.newEntry({
						menuName, entryText: 'New category...', func: () => {
							const input = Input.string('string', pls.category !== null ? pls.category : '', 'Category name (only 1):', window.Name + _ps(window.ScriptInfo.Name) + ': ' + pls.name, 'My category');
							if (input === null) { return; }
							setCategory(input, list, z);
						}
					});
					menu.newSeparator(menuName);
					list.categories().forEach((category, i) => {
						menu.newEntry({
							menuName, entryText: category, func: () => {
								if (pls.category !== category) { setCategory(i ? category : '', list, z); }
							}
						});
						menu.newCheckMenuLast(() => (pls.category === (i ? category : '')));
					});
				}
			}
			if (showMenus['Tags']) {
				{	// Set tag(s)
					const menuName = menu.newMenu('Set playlist tag(s)', void (0), !bIsLockPls && bIsPlsEditable || bIsPlsUI ? MF_STRING : MF_GRAYED);
					menu.newEntry({
						menuName, entryText: 'New tag(s)...', func: () => {
							const input = Input.json(
								'array strings',
								pls.tags,
								'Tag(s) Name(s):\n(JSON)\n\nFor ex: ["Summer", "Cool"]',
								window.Name + _ps(window.ScriptInfo.Name) + ': ' + pls.name,
								'["TagA","TagB"]',
								void (0),
								true
							);
							if (input === null) { return; }
							setTag(input, list, z);
						}
					});
					menu.newSeparator(menuName);
					let bAddInvisibleIds = false;
					list.tags().concat(['sep', ...autoTags]).forEach((tag, i) => {
						if (menu.isSeparator(tag)) { menu.newSeparator(menuName); bAddInvisibleIds = true; return; } // Add invisible id for entries after separator to duplicate check marks
						menu.newEntry({
							menuName, entryText: tag, func: () => {
								let tags;
								if (i === 0) { tags = []; }
								else if (pls.tags.includes(tag)) { tags = [...new Set(pls.tags).difference(new Set([tag]))]; }
								else { tags = [...pls.tags, tag]; }
								setTag(tags, list, z);
							}, bAddInvisibleIds
						});
						menu.newCheckMenuLast(() => (i ? pls.tags.includes(tag) : pls.tags.length === 0));
					});
				}
				// Adds track tag(s)
				menu.newEntry({
					entryText: 'Automatically add tag(s) to tracks...', func: () => {
						let tags = '';
						const currValue = pls.trackTags && pls.trackTags.length ? JSON.stringify(pls.trackTags) : '';
						try { tags = utils.InputBox(window.ID, 'Enter data json-formatted: [{"TAGNAME":"tagValue"},...]\n\nTagValue may be:\n- String (with quotes) or number (doesn\'t need quotes).\n- Value list separated by comma (,).\n- TF expression applied to added track.\n- JS:+Function name (see helpers_xxx_utils.js).\n\nValues will be split by comma in any case.\n\nFor ex:\n \t[{"MOOD":"Chill"}]\n\t[{"ADDEDDATE":"JS:todayDate"}, {"ENERGY":5}]\n\t[{"PLAYLISTNAME":"JS:playlistName"}]', window.Name + _ps(window.ScriptInfo.Name), currValue, true); }
						catch (e) { return; } // eslint-disable-line no-unused-vars
						const tagsString = tags;
						if (tags.length) {
							tags = tags.replaceAll('\'\'', '"'); // Replace quotes
							try { tags = JSON.parse(tags); } catch (e) { fb.ShowPopupMessage('Input is not a valid JSON:\n' + tags, window.Name + _ps(window.ScriptInfo.Name)); return; } // eslint-disable-line no-unused-vars
						}
						if (tagsString !== currValue) { setTrackTags(tags, list, z); }
					}, flags: !bIsLockPls && bIsPlsEditable && bIsValidXSP && !bIsPlsUI ? MF_STRING : MF_GRAYED
				});
			}
			menu.newSeparator();
		}
		{	// Export and clone
			//	AutoPlaylists clone
			if (bIsAutoPls) { // For XSP playlists works the same as being an AutoPlaylist!
				menu.newEntry({
					entryText: 'Clone in UI' + list.getGlobalShortcut('clone ui'), func: () => {
						const remDupl = (pls.isAutoPlaylist && list.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls) ? list.removeDuplicatesAutoPls : [];
						clonePlaylistInUI(list, z, { remDupl, bAdvTitle: list.bAdvTitle, bMultiple: list.bMultiple });
					}
				});
				!list.bLiteMode && menu.newEntry({
					entryText: 'Clone as standard playlist...', func: () => {
						const remDupl = (pls.isAutoPlaylist && list.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls) ? list.removeDuplicatesAutoPls : [];
						cloneAsStandardPls(list, z, { remDupl, bAdvTitle: list.bAdvTitle, bMultiple: list.bMultiple });
					}, flags: bIsValidXSP ? MF_STRING : MF_GRAYED
				});
				menu.newEntry({
					entryText: 'Clone as AutoPlaylist and edit...' + (pls.isAutoPlaylist && !bIsPlsUI ? list.getGlobalShortcut('clone') : ''), func: () => { // Here creates a foobar2000 AutoPlaylist no matter the original format
						cloneAsAutoPls(list, z, uiIdx);
					}, flags: bIsValidXSP ? MF_STRING : MF_GRAYED
				});
				menu.addIndicatorNameLast(() => bIsPlsUI); // Add an indicator for required cloning
				!list.bLiteMode && menu.newEntry({
					entryText: 'Clone as Smart Playlist and edit...' + (pls.extension === '.xsp' ? list.getGlobalShortcut('clone') : '') + (bIsPlsUI ? '\t(cloning required)' : ''), func: () => { // Here creates a Kodi XSP smart no matter the original format
						cloneAsSmartPls(list, z);
					}, flags: bIsValidXSP && !bIsPlsUI ? MF_STRING : MF_GRAYED
				});
				if (showMenus['Export and copy']) {
					!list.bLiteMode && menu.newEntry({
						entryText: 'Export as json file...' + (bIsPlsUI ? '\t(cloning required)' : ''), func: () => {
							const path = list.exportJson({ idx: z, bAllExt: true });
							if (_isFile(path)) { _explorer(path); }
						}, flags: !bIsPlsUI ? MF_STRING : MF_GRAYED
					});
					if (pls.extension === '.xsp') {
						// Copy
						!list.bLiteMode && menu.newEntry({
							entryText: 'Copy playlist file to...', func: () => {
								exportPlaylistFile(list, z);
							}, flags: loadablePlaylistFormats.has(pls.extension) ? MF_STRING : MF_GRAYED
						});
					}
				}
			} else if (!list.bLiteMode) {	// Export and Rel. Paths handling
				if (showMenus['Relative paths handling']) {
					// Rel Paths
					menu.newEntry({
						entryText: 'Force relative paths...', func: () => {
							convertToRelPaths(list, z);
						}, flags: bWritableFormat && !bIsLockPls ? MF_STRING : MF_GRAYED
					});
				}
				// Clone as
				{
					const presets = [...writablePlaylistFormats, 'sep', '.ui'];
					const subMenuName = menu.newMenu('Clone as');
					menu.newEntry({ menuName: subMenuName, entryText: 'Select a format:', flags: MF_GRAYED });
					menu.newSeparator(subMenuName);
					presets.forEach((ext) => {
						const entryText = ext === '.ui'
							? 'Clone in UI' + list.getGlobalShortcut('clone ui')
							: ext + (ext === pls.extension ? list.getGlobalShortcut('clone') : '');
						if (menu.isSeparator(ext)) { menu.newEntry({ menuName: subMenuName, entryText, flags: MF_GRAYED }); return; }
						menu.newEntry({
							menuName: subMenuName, entryText, func: () => {
								clonePlaylistFile(list, z, ext);
							}
						});
					});
				}
				if (showMenus['Export and copy']) {
					// Copy
					menu.newEntry({
						entryText: 'Copy playlist file to...', func: () => {
							exportPlaylistFile(list, z);
						}, flags: loadablePlaylistFormats.has(pls.extension) ? MF_STRING : MF_GRAYED
					});
					// Export and copy
					menu.newEntry({
						entryText: 'Export and Copy Tracks to...', func: () => {
							exportPlaylistFileWithTracks({ list, z, bAsync: list.properties.bCopyAsync[1] });
						}, flags: bWritableFormat ? MF_STRING : MF_GRAYED
					});
				}
			} else { // Lite mode
				menu.newEntry({
					entryText: 'Clone in UI' + list.getGlobalShortcut('clone ui'), func: () => {
						clonePlaylistFile(list, z, '.ui');
					}
				});
			}
			if (showMenus['Export and copy']) {
				{	// Export and Convert
					const presets = JSON.parse(list.properties.converterPreset[1]);
					const flags = bWritableFormat || bIsPlsUI || bIsAutoPls && bIsValidXSP ? MF_STRING : MF_GRAYED;
					const subMenuName = menu.newMenu('Export and Convert Tracks to...', void (0), presets.length ? flags : MF_GRAYED);
					menu.newEntry({ menuName: subMenuName, entryText: 'Shift + Click to skip tracks conversion:', flags: MF_GRAYED });
					menu.newSeparator(subMenuName);
					presets.forEach((preset) => {
						const path = preset.path;
						const playlistOutPath = preset.playlistOutPath || '';
						let pathName = playlistOutPath.length
							? '(Fixed folder)'
							: path.length
								? '(' + path.split('\\')[0] + '\\) ' + path.split('\\').slice(-2, -1)
								: '(Folder)';
						const dsp = preset.dsp;
						let dspName = (dsp !== '...' ? dsp : '(DSP)');
						const tf = preset.tf;
						let tfName = Object.hasOwn(preset, 'name') && preset.name.length ? preset.name : preset.tf;
						const extension = Object.hasOwn(preset, 'extension') && preset.extension.length ? preset.extension : '';
						const extensionName = extension.length ? '[' + extension + ']' : '';
						const bExtendedM3U = Object.hasOwn(preset, 'bExtendedM3U') ? preset.bExtendedM3U : true;
						pathName = pathName.cut(20);
						dspName = dspName.cut(20);
						tfName = tfName.cut(35);
						menu.newEntry({
							menuName: subMenuName, entryText: pathName + extensionName + ': ' + dspName + ' ---> ' + tfName, func: () => {
								const bShift = utils.IsKeyPressed(VK_SHIFT);
								const remDupl = (pls.isAutoPlaylist && list.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls)
									? list.removeDuplicatesAutoPls
									: [];
								const exportFunc = pls.isAutoPlaylist
									? exportAutoPlaylistFileWithTracksConvert
									: exportPlaylistFileWithTracksConvert;
								exportFunc({
									list, z,
									tf,
									preset: bShift ? null : dsp,
									defPath: path,
									playlistOutPath,
									ext: extension,
									remDupl, // Include remDupl for XSP playlists
									bAdvTitle: list.bAdvTitle,
									bMultiple: list.bMultiple,
									bExtendedM3U
								});
							}, flags
						});
					});
				}
			}
			if (showMenus['Online sync']) {
				{	// Export to ListenBrainz
					const subMenuName = menu.newMenu('Online sync...', void (0), bIsValidXSP ? MF_STRING : MF_GRAYED);
					menu.newEntry({
						menuName: subMenuName, entryText: 'Export to ListenBrainz' + (bListenBrainz ? '' : '\t(token not set)'), func: async () => {
							if (!await checkLBToken()) { return false; }
							let bUpdateMBID = false;
							let playlist_mbid = '';
							const bLookupMBIDs = list.properties.bLookupMBIDs[1];
							const token = bListenBrainz ? lb.decryptToken({ lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1] }) : null;
							if (!token) { return false; }
							if (pls.playlist_mbid.length) {
								console.log('Playlist Manager: Syncing playlist with ListenBrainz -> ' + pls.name);
								playlist_mbid = await lb.syncPlaylist(pls, list.playlistsPath, token, bLookupMBIDs);
								if (playlist_mbid.length && pls.playlist_mbid !== playlist_mbid) { bUpdateMBID = true; fb.ShowPopupMessage('Playlist had an MBID but no playlist was found with such MBID on server.\nA new one has been created. Check console.', window.Name + _ps(window.ScriptInfo.Name)); }
							} else {
								console.log('Exporting playlist to ListenBrainz: ' + pls.name);
								playlist_mbid = await lb.exportPlaylist(pls, list.playlistsPath, token, bLookupMBIDs);
								if (playlist_mbid && typeof playlist_mbid === 'string' && playlist_mbid.length) { bUpdateMBID = true; }
							}
							if (!playlist_mbid || typeof playlist_mbid !== 'string' || !playlist_mbid.length) { lb.consoleError('Playlist was not exported.'); return; }
							if (list.properties.bSpotify[1]) {
								lb.retrieveUser(token).then((user) => lb.getUserServices(user, token)).then((services) => {
									if (services.includes('spotify')) {
										console.log('Playlist manager: Exporting playlist to Spotify -> ' + pls.name);
										lb.exportPlaylistToService({ playlist_mbid }, 'spotify', token);
									}
								});
							}
							if (bUpdateMBID && bWritableFormat) { setPlaylist_mbid(playlist_mbid, list, pls); }
						}, flags: bListenBrainz ? MF_STRING : MF_GRAYED
					});
					menu.newEntry({
						menuName: subMenuName, entryText: 'Import from ListenBrainz' + (bListenBrainz ? '' : '\t(token not set)'), func: async () => {
							if (!pls.playlist_mbid.length) { return Promise.resolve(false); }
							if (!await checkLBToken()) { return Promise.resolve(false); }
							let bDone = false;
							if (_isFile(pls.path)) {
								const token = bListenBrainz ? lb.decryptToken({ lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1] }) : null;
								if (!token) { return false; }
								lb.importPlaylist(pls, token)
									.then((jspf) => {
										if (jspf) {
											const data = lb.contentResolver(jspf);
											const handleArr = data.handleArr;
											const notFound = data.notFound;
											const bXSPF = pls.extension === '.xspf';
											const backPath = pls.path + '.back';
											if (!bXSPF) {
												let bYouTube = false;
												if (notFound.length && isYouTube) {
													const answer = WshShell.Popup('Some imported tracks have not been found on library (see console).\nDo you want to replace them with YouTube links?\n(Pressing \'No\' will omit not found items)?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
													if (answer === popup.yes) { bYouTube = true; }
												}
												if (pls.isLocked) { // Safety check for locked files (but can be overridden)
													let answer = WshShell.Popup('Are you sure you want to update a locked playlist?\nIt will continue being locked afterwards.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
													if (answer === popup.no) { return false; }
												}
												// Find missing tracks on youTube
												if (bYouTube) {
													if (!pop.isEnabled()) { // Display animation except for UI playlists
														pop.enable(true, 'Searching...', 'Searching YouTube...\nPanel will be disabled during the process.', 'searching');
													}
													// Add MBIDs to youTube track metadata
													notFound.forEach((track) => track.tags = { musicbrainz_trackid: track.identifier });
													// Send request in parallel every x ms and process when all are done
													return Promise.parallel(notFound, youTube.searchForYoutubeTrack, 5).then((results) => {
														let j = 0;
														const itemsLen = handleArr.length;
														let foundLinks = 0;
														results.forEach((result) => {
															for (void (0); j <= itemsLen; j++) {
																if (result.status !== 'fulfilled') { break; }
																const link = result.value;
																if (!link || !link.length) { break; }
																if (!handleArr[j]) {
																	handleArr[j] = link.url;
																	foundLinks++;
																	break;
																}
															}
														});
														list.disableAutosaveForPls(pls.nameId);
														const bLoaded = plman.FindPlaylist(pls.nameId) !== -1;
														const idx = plman.FindOrCreatePlaylist(pls.nameId, true);
														plman.ClearPlaylist(idx);
														return plman.AddPlaylistItemsOrLocations(idx, handleArr.filter(Boolean), true)
															.then(() => {
																plman.ActivePlaylist = idx;
																const handleList = plman.GetPlaylistItems(idx);
																console.log('Playlist Manager: Found ' + foundLinks + ' tracks on YouTube');
																const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
																if (_isFile(pls.path)) { _renameFile(pls.path, backPath); }
																bDone = savePlaylist({ handleList, playlistPath: pls.path, ext: pls.extension, playlistName: pls.name, UUID: (pls.id || null), bLocked: pls.isLocked, category: pls.category, tags: pls.tags, trackTags: pls.trackTags, playlist_mbid: pls.playlist_mbid, author: pls.author, description: pls.description, bBOM: list.bBOM, relPath: (list.bRelativePath ? list.playlistsPath : '') });
																// Restore backup in case something goes wrong
																if (!bDone) { console.log('Playlist Manager: Failed saving playlist\n\t ' + pls.path); _deleteFile(pls.path); _renameFile(backPath, pls.path); }
																else if (_isFile(backPath)) { _deleteFile(backPath); }
																if (bDone) {
																	list.update({ bReuseData: false, bNotPaint: true, currentItemIndex: list.lastIndex });
																	list.filter();
																}
																if (bDone && !bLoaded) { plman.RemovePlaylist(idx); }
																clearInterval(delay);
																list.enableAutosaveForPls(pls.nameId);
																return bDone;
															}).finally(() => {
																if (pop.isEnabled('searching')) { pop.disable(true); }
															});
													});
												} else {
													const handleList = data.handleList;
													const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
													if (_isFile(pls.path)) { _renameFile(pls.path, backPath); }
													bDone = savePlaylist({ handleList, playlistPath: pls.path, ext: pls.extension, playlistName: pls.name, UUID: (pls.id || null), bLocked: pls.isLocked, category: pls.category, tags: pls.tags, trackTags: pls.trackTags, playlist_mbid: pls.playlist_mbid, author: pls.author, description: pls.description, bBOM: list.bBOM, relPath: (list.bRelativePath ? list.playlistsPath : '') });
													// Restore backup in case something goes wrong
													if (!bDone) { console.log('Playlist Manager: Failed saving playlist\n\t ' + pls.path); _deleteFile(pls.path); _renameFile(backPath, pls.path); }
													else if (_isFile(backPath)) { _deleteFile(backPath); }
													const bLoaded = plman.FindPlaylist(pls.nameId) !== -1;
													if (bDone && bLoaded) {
														list.disableAutosaveForPls(pls.nameId);
														sendToPlaylist(handleList, pls.nameId);
														list.enableAutosaveForPls(pls.nameId);
													}
													clearInterval(delay);
												}
											} else {
												const playlist = jspf.playlist;
												const author = playlist.extension['https://musicbrainz.org/doc/jspf#playlist'].creator;
												let totalDuration = 0;
												playlist.creator = author + ' - Playlist-Manager-SMP';
												playlist.info = 'https://listenbrainz.org/user/' + author + '/playlists/';
												playlist.location = playlist.identifier;
												playlist.meta = [
													{ uuid: pls.id },
													{ locked: pls.isLocked },
													{ category: pls.category },
													{ tags: (isArrayStrings(pls.tags) ? pls.tags.join(';') : '') },
													{ trackTags: (isArrayStrings(pls.trackTags) ? pls.tags.join(';') : '') },
													{ playlistSize: playlist.track.length },
													{ duration: totalDuration },
													{ playlist_mbid: pls.playlist_mbid }
												];
												// Tracks text
												handleArr.forEach((handle, i) => {
													if (!handle) { return; }
													const relPath = '';
													const tags = getHandleListTagsV2(new FbMetadbHandleList(handle), ['TITLE', 'ARTIST', 'ALBUM', 'TRACK', 'LENGTH_SECONDS_FP', 'PATH', 'SUBSONG', 'MUSICBRAINZ_TRACKID']);
													const title = tags[0][0][0];
													const creator = tags[1][0].join(', ');
													const album = tags[2][0][0];
													const trackNum = Number(tags[3][0][0]);
													const duration = Math.round(Number(tags[4][0][0] * 1000)); // In ms
													totalDuration += Math.round(Number(tags[4][0][0])); // In s
													let trackPath = tags[5][0][0].replace(fileRegex, '');
													const bLink = _isLink(trackPath);
													trackPath = relPath.length && !_isLink(trackPath)
														? getRelPath(trackPath, relPathSplit)
														: trackPath;
													const location = [(bLink ? '' : 'file:///') + encodeURIComponent(trackPath.replace(/\\/g, '/'))];
													const subSong = Number(tags[6][0][0]);
													const meta = isSubsongPath(location[0] + ',' + subSong) ? [{ subSong }] : [];
													const identifier = [tags[7][0][0]];
													playlist.track[i] = {
														location,
														annotation: void (0),
														title,
														creator,
														info: void (0),
														image: void (0),
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
													if (!Array.isArray(track.identifier)) { track.identifier = [track.identifier]; }
												});
												// Update total duration of playlist
												playlist.meta.find((obj) => { return Object.hasOwn(obj, 'duration'); }).duration = totalDuration;
												let xspf = XSPF.toXSPF(jspf);
												const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
												xspf = xspf.join('\r\n');
												if (_isFile(pls.path)) { _renameFile(pls.path, backPath); }
												bDone = _save(pls.path, xspf, list.bBOM);
												// Check
												if (_isFile(pls.path) && bDone) { bDone = (_open(pls.path, utf8) === xspf); }
												// Restore backup in case something goes wrong
												if (!bDone) { console.log('Playlist Manager: Failed saving playlist\n\t ' + pls.path); _deleteFile(pls.path); _renameFile(backPath, pls.path); }
												else if (_isFile(backPath)) { _deleteFile(backPath); }
												if (bDone && plman.FindPlaylist(pls.nameId) !== -1) { sendToPlaylist(new FbMetadbHandleList(handleArr.filter((n) => n)), pls.nameId); }
												if (bDone) {
													list.update({ bReuseData: false, bNotPaint: true, currentItemIndex: list.lastIndex });
													list.filter();
												}
												clearInterval(delay);
												return bDone;
											}
										} else { return bDone; }
									})
									.finally(() => {
										if (!bDone) { lb.consoleError('Playlist was not imported.'); }
										return bDone;
									});
							} else {
								console.log('Playlist Manager: Playlist file not found\n\t ' + pls.path);
								return Promise.resolve(bDone);
							}
						}, flags: pls.playlist_mbid.length && bWritableFormat ? (bListenBrainz ? MF_STRING : MF_GRAYED) : MF_GRAYED
					});
					menu.newSeparator(subMenuName);
					menu.newEntry({
						menuName: subMenuName, entryText: 'Get URL...' + (pls.playlist_mbid ? '' : '\t(no MBID)'), func: async () => {
							console.popup('Playlist URL:\n\t ' + lb.getPlaylistURL(pls), window.Name + _ps(window.ScriptInfo.Name));
						}, flags: pls.playlist_mbid.length ? MF_STRING : MF_GRAYED
					});
					menu.newEntry({
						menuName: subMenuName, entryText: 'Open on Web...' + (pls.playlist_mbid ? '' : '\t(no MBID)'), func: async () => {
							const url = lb.getPlaylistURL(pls);
							if (lb.regEx.test(url)) { _run(lb.getPlaylistURL(pls)); }
						}, flags: pls.playlist_mbid.length ? MF_STRING : MF_GRAYED
					});
				}
			}
		}
		if (showMenus['File locks'] || showMenus['UI playlist locks'] && bIsPlsLoaded || showMenus['Sorting'] && bManualSorting || showMenus['Folders'] && bHasFolders) { menu.newSeparator(); }
		{	// File management
			// Locks playlist file
			if (showMenus['File locks']) {
				if (!bIsPlsUI) {
					menu.newEntry({
						entryText: (!bIsLockPls ? 'Lock Playlist (read only)' : 'Unlock Playlist (writable)') + list.getGlobalShortcut('lock file'), func: () => {
							switchLock(list, z);
						}, flags: bIsPlsLockable ? MF_STRING : MF_GRAYED
					});
				}
			}
			// Locks UI playlist
			if (showMenus['UI playlist locks']) {
				if (bIsPlsUI || bIsPlsLoaded) {
					const lockTypes = [
						{ type: 'AddItems', entryText: 'Adding items' },
						{ type: 'RemoveItems', entryText: 'Removing items' },
						{ type: 'ReplaceItems', entryText: 'Replacing items' },
						{ type: 'ReorderItems', entryText: 'Sorting items' },
						{ type: 'RenamePlaylist', entryText: 'Renaming playlist' },
						{ type: 'RemovePlaylist', entryText: 'Deleting playlist' },
						...(window.Bugs.SetPlaylistLockedActions
							? []
							: [{ type: 'ExecuteDefaultAction', entryText: 'Default action' }])
					].filter(Boolean);
					const index = plman.FindPlaylist(pls.nameId);
					const currentLocks = new Set(plman.GetPlaylistLockedActions(index) || []);
					const lockName = plman.GetPlaylistLockName(index);
					const bSMPLock = lockName === window.Parent || !lockName;
					const flags = bSMPLock ? MF_STRING : MF_GRAYED;
					const subMenuName = menu.newMenu('Edit UI Playlist lock');
					menu.newEntry({ menuName: subMenuName, entryText: 'Lock by action:' + (!bSMPLock ? '\t' + _p(lockName) : ''), flags: MF_GRAYED });
					menu.newSeparator(subMenuName);
					lockTypes.forEach((lock) => {
						menu.newEntry({
							menuName: subMenuName, entryText: lock.entryText, func: () => {
								setLocks(index, [lock.type], 'switch');
							}, flags
						});
						menu.newCheckMenuLast(() => currentLocks.has(lock.type));
					});
					menu.newSeparator(subMenuName);
					menu.newEntry({
						menuName: subMenuName, entryText: 'All locks' + (bIsPlsUI && !currentLocks.size ? list.getGlobalShortcut('lock ui') : ''), func: () => {
							setLocks(index, lockTypes.map((lock) => lock.type));
						}, flags
					});
					menu.newEntry({
						menuName: subMenuName, entryText: 'None' + (bIsPlsUI && currentLocks.size ? list.getGlobalShortcut('lock ui') : ''), func: () => {
							setLocks(index, []);
						}, flags
					});
				}
			}
			if (showMenus['Sorting'] && bManualSorting || showMenus['Folders'] && bHasFolders) {
				if (showMenus['File locks'] || showMenus['UI playlist locks'] && bIsPlsLoaded) { menu.newSeparator(); }
				if (showMenus['Sorting'] && bManualSorting) {
					const subMenuName = menu.newMenu('Sorting');
					menu.newEntry({ menuName: subMenuName, entryText: 'Manual sorting:', flags: MF_GRAYED });
					menu.newSeparator(subMenuName);
					const options = [
						{ name: 'Up', idx: (i) => i - 1 },
						{ name: 'Down', idx: (i) => i + 1 },
						{ name: 'sep' },
						{ name: 'Send to top', idx: 0 },
						{ name: 'Send to bottom', idx: Infinity },

					];
					options.forEach((opt) => {
						if (menu.isSeparator(opt)) { menu.newSeparator(subMenuName); return; }
						menu.newEntry({ menuName: subMenuName, entryText: opt.name, func: () => list.setManualSortingForPls([pls], opt.idx) });
					});
				}
				if (showMenus['Folders']) {
					const subMenuName = menu.newMenu('Move to folder');
					menu.newEntry({ menuName: subMenuName, entryText: 'Select folder:', flags: MF_GRAYED });
					menu.newSeparator(subMenuName);
					const { tree, folders } = list.getFolderTree(true);
					const count = new WeakMap;
					Object.values(tree).forEach((val) => count.set(val, 0));
					if (folders.length) {
						tree[subMenuName] = tree.none;
						delete tree.none;
						// Create submenus in order
						for (const from in tree) {
							tree[from].forEach((subMenu) => {
								if (tree[subMenu].size) {
									menu.findOrNewMenu(subMenu, from);
								}
							});
						}
						// Populate
						folders.forEach((opt) => {
							const menuName = opt.parents.length && !tree[opt.name].size
								? opt.parents.pop()
								: tree[opt.name].size
									? opt.name
									: subMenuName;
							const bSameFolder = opt.name === pls.inFolder;
							const bParent = opt.name === menuName;
							const entryText = (bParent
								? _b(opt.name)
								: opt.name
							) + '\t' + _b(opt.folder.pls.lengthFilteredDeep);
							const entriesCount = count.get(tree[menuName]) + 1;
							count.set(tree[menuName], entriesCount);
							if (entriesCount && entriesCount % 5 === 0) {
								menu.newEntry({ menuName, entryText: '', flags: MF_MENUBARBREAK | MF_GRAYED });
								menu.newSeparator(menuName);
							}
							if (bParent && [...tree[menuName]].some((sub) => tree[sub].size)) { menu.newSeparator(menuName); }
							menu.newEntry({
								menuName, entryText, func: () => {
									list.moveToFolder(pls, opt.folder);
									if (opt.folder.isOpen) { list.showPlsByObj(pls); }
									else { list.showPlsByObj(opt.folder); }
								}, flags: bSameFolder ? MF_GRAYED : MF_STRING
							});
						});
						if (pls.inFolder) {
							menu.newSeparator(subMenuName);
							menu.newEntry({
								menuName: subMenuName, entryText: '- no folder -', func: () => {
									list.moveToFolder(pls, null);
									list.showPlsByObj(pls);
								}
							});
						}
						menu.newSeparator(subMenuName);
					}
					menu.newEntry({
						menuName: subMenuName, entryText: 'New folder...', func: () => {
							const folder = list.addFolder();
							if (!folder) { return; }
							list.moveToFolder(pls, folder);
							list.update({ bReuseData: true });
							list.showPlsByObj(folder);
						}
					});
				}
			}
			if (showMenus['File management']) {
				menu.newSeparator();
				// Deletes playlist file and playlist loaded
				menu.newEntry({ entryText: 'Delete' + list.getGlobalShortcut('delete'), func: () => { list.removePlaylist(z); } });
				!list.bLiteMode && menu.newEntry({
					entryText: 'Open file on explorer', func: () => {
						if (pls.isAutoPlaylist) { _explorer(list.filename); } // Open AutoPlaylist json file
						else { _explorer(_isFile(pls.path) ? pls.path : list.playlistsPath); } // Open playlist path
					}, flags: !bIsPlsUI ? MF_STRING : MF_GRAYED
				});
			} else if (bIsPlsUI || list.bLiteMode) {
				menu.newSeparator();
				menu.newEntry({ entryText: 'Delete', func: () => { list.removePlaylist(z); } });
			}
		}
	}
	return menu;
}

function createMenuFolder(menu, folder, z) {
	const bOpen = folder.isOpen;
	const playlists = folder.pls.filtered;
	const indexes = playlists.map((p) => list.getIndex(p, true)); // When delaying menu, the mouse may move to other index...
	// Helpers
	const isPlsLoaded = (pls) => plman.FindPlaylist(pls.nameId) !== -1;
	const isPlsUI = (pls) => pls.extension === '.ui';
	const isFolder = (pls) => pls.isFolder;
	// Evaluate
	const bIsPlsLoadedEvery = playlists.every((pls) => isPlsLoaded(pls));
	const bIsValidXSPEveryOnly = playlists.every((pls) => (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type === 'songs') || true);
	const bIsFolderEvery = playlists.every((pls) => isFolder(pls));
	const bManualSorting = list.methodState === list.manualMethodState();
	// Enabled menus
	const showMenus = JSON.parse(list.properties.showMenus[1]);
	// Entries
	menu.newEntry({
		entryText: 'Expand/collapse', func: () => {
			list.switchFolder(z);
		}
	});
	menu.newSeparator();
	{ // New Playlists
		const subMenuName = menu.newMenu('New child item');
		!list.bLiteMode && menu.newEntry({ menuName: subMenuName, entryText: 'Playlist File ' + _p(list.playlistsExtension) + '...', func: () => { list.add({ bEmpty: true, toFolder: folder }); } });
		menu.newEntry({ menuName: subMenuName, entryText: 'UI-only Playlist...', func: () => { list.addUiPlaylist({ bInputName: true, toFolder: folder }); } });
		menu.newSeparator(subMenuName);
		menu.newEntry({ menuName: subMenuName, entryText: 'AutoPlaylist...', func: () => { list.addAutoPlaylist(void (0), void (0), folder); } });
		!list.bLiteMode && menu.newEntry({ menuName: subMenuName, entryText: 'Smart Playlist...', func: () => list.addSmartPlaylist(void (0), void (0), folder) });
		if (!list.bLiteMode) {
			menu.newSeparator(subMenuName);
			const subMenuNameTwo = menu.newMenu('New Playlist File (by ext)...', subMenuName);
			writablePlaylistFormats.forEach((ext) => {
				menu.newEntry({
					menuName: subMenuNameTwo,
					entryText: ext, func: () => {
						const rule = list.folderRules.others;
						const toFolder = rule.length
							? list.dataFolder.find((f) => f.name === rule) || list.addFolder(rule)
							: null;
						list.add({ bEmpty: true, toFolder, ext });
					}
				});
			});
		}
		menu.newSeparator(subMenuName);
		menu.newEntry({ menuName: subMenuName, entryText: 'Folder...', func: () => { list.addFolder(void (0), folder); } });
		menu.newSeparator(subMenuName);
		!list.bLiteMode && menu.newEntry({ menuName: subMenuName, entryText: 'New playlist from active...', func: () => { list.add({ bEmpty: false, toFolder: folder }); }, flags: plman.ActivePlaylist !== -1 ? MF_STRING : MF_GRAYED });
		if (plman.ActivePlaylist !== -1 && plman.IsAutoPlaylist(plman.ActivePlaylist)) {
			menu.newEntry({
				menuName: subMenuName,
				entryText: 'New AutoPlaylist from active ...', func: () => {
					const pls = { name: plman.GetPlaylistName(plman.ActivePlaylist) };
					plman.ShowAutoPlaylistUI(plman.ActivePlaylist); // Workaround to not being able to access AutoPlaylist data... user must copy/paste
					list.addAutoPlaylist(pls, true, folder);
				}, flags: plman.ActivePlaylist !== -1 ? MF_STRING : MF_GRAYED
			});
		}
		menu.newEntry({
			menuName: subMenuName,
			entryText: 'New playlist from selection...', func: () => {
				const oldIdx = plman.ActivePlaylist;
				if (oldIdx === -1) { return; }
				const name = list.properties.bAutoSelTitle[1]
					? list.plsNameFromSelection(oldIdx)
					: 'Selection from ' + plman.GetPlaylistName(oldIdx).cut(10);
				const pls = list.bLiteMode
					? list.addUiPlaylist({ bInputName: true, toFolder: folder })
					: list.add({ bEmpty: true, name, bInputName: true, toFolder: folder });
				if (pls) {
					const playlistIndex = list.getIndex(pls, true);
					const newIdx = plman.ActivePlaylist;
					plman.ActivePlaylist = oldIdx;
					list.sendSelectionToPlaylist({ playlistIndex, bCheckDup: true, bAlsoHidden: true, bPaint: false, bDelSource: false });
					// Don't reload the list but just paint with changes to avoid jumps
					plman.ActivePlaylist = newIdx;
					list.showCurrPls();
				}
			}, flags: plman.ActivePlaylist !== -1 ? MF_STRING : MF_GRAYED
		});
	}
	menu.newSeparator();
	menu.newEntry({
		entryText: 'Rename...' + list.getGlobalShortcut('rename'), func: () => {
			const input = Input.string('string', folder.nameId, 'Enter folder name:', window.Name + _ps(window.ScriptInfo.Name) + ':' + folder.name, 'My folder', void (0), true);
			if (input === null) { return; }
			renameFolder(list, z, input);
		}
	});
	menu.newSeparator();
	menu.newEntry({
		entryText: 'Multi-select child items...' + '\t' + _b(indexes.length), func: () => {
			if (!folder.isOpen) { list.switchFolder(z); }
			folder.pls.map((p) => list.multSelect(list.getIndex(p)));
		}, flags: indexes.length ? MF_STRING : MF_GRAYED
	});
	menu.newSeparator();
	{	// Load
		// Load playlist within foobar2000. Only 1 instance allowed
		menu.newEntry({
			entryText: 'Load entire folder' + list.getGlobalShortcut('load'), func: () => {
				indexes.forEach((z, i) => {
					const pls = playlists[i];
					if (!isPlsUI(pls) && !isFolder(pls)) { list.loadPlaylist(z, true); }
				});
			}, flags: bIsPlsLoadedEvery || bIsFolderEvery ? MF_GRAYED : MF_STRING
		});
		// Merge load
		menu.newEntry({
			entryText: 'Merge-load entire folder', func: () => {
				if (!bOpen) { list.switchFolder(z); }
				const zArr = playlists.map((p) => list.getIndex(p)).filter((idx, i) => !isFolder(playlists[i]));
				if (zArr.length) {
					clonePlaylistMergeInUI(list, zArr, { remDupl: [] });
				}
				if (!bOpen) { list.switchFolder(z); }
			}, flags: playlists.length < 2 || !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
		});
		menu.newEntry({
			entryText: 'Merge-load (no duplicates)', func: () => {
				if (!bOpen) { list.switchFolder(z); }
				const zArr = playlists.map((p) => list.getIndex(p)).filter((idx, i) => !isFolder(playlists[i]));
				if (zArr.length) {
					clonePlaylistMergeInUI(list, zArr, { remDupl: list.removeDuplicatesAutoPls, bAdvTitle: list.bAdvTitle, bMultiple: list.bMultiple });
				}
				if (!bOpen) { list.switchFolder(z); }
			}, flags: !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
		});
		// Clone in UI
		menu.newEntry({
			entryText: 'Clone entire folder in UI' + list.getGlobalShortcut('clone ui'), func: () => {
				if (!bOpen) { list.switchFolder(z); }
				const zArr = playlists.map((p) => list.getIndex(p)).filter((idx, i) => !isFolder(playlists[i]));
				zArr.forEach((z) => {
					const pls = list.data[z];
					if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { return; }
					if (!isPlsUI(pls) && !isFolder(pls)) {
						if (pls.isAutoPlaylist) {
							const remDupl = (pls.isAutoPlaylist && list.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls) ? list.removeDuplicatesAutoPls : [];
							cloneAsStandardPls(list, z, { remDupl, bAdvTitle: list.bAdvTitle, bMultiple: list.bMultiple }, false);
						} else {
							clonePlaylistFile(list, z, '.ui');
						}
					}
				});
				if (!bOpen) { list.switchFolder(z); }
			}, flags: !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
		});
		if (showMenus['Queue handling']) {
			menu.newSeparator();
			menu.newEntry({
				entryText: 'Add contents to queue', func: () => {
					if (!bOpen) { list.switchFolder(z); }
					const zArr = playlists.map((p) => list.getIndex(p)).filter((idx, i) => !isFolder(playlists[i]));
					zArr.forEach((z) => {
						if (plman.GetPlaybackQueueHandles().Count >= MAX_QUEUE_ITEMS) { return; }
						const pls = list.data[z];
						list.queuePlaylist(pls, { bAsync: true });
					});
					if (!bOpen) { list.switchFolder(z); }
				}, flags: !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
			});
			menu.newEntry({
				entryText: 'Add contents to queue (random)', func: () => {
					if (!bOpen) { list.switchFolder(z); }
					const zArr = playlists.map((p) => list.getIndex(p)).filter((idx, i) => !isFolder(playlists[i]));
					zArr.shuffle().forEach((z) => {
						if (plman.GetPlaybackQueueHandles().Count >= MAX_QUEUE_ITEMS) { return; }
						const pls = list.data[z];
						list.queuePlaylist(pls, { bAsync: true, bRandom: true, bDedup: true });
					});
					if (!bOpen) { list.switchFolder(z); }
				}, flags: !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
			});
		}
	}
	if (showMenus['Sorting'] && bManualSorting) {
		menu.newSeparator();
		const subMenuName = menu.newMenu('Sorting');
		menu.newEntry({ menuName: subMenuName, entryText: 'Manual sorting:', flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		const options = [
			{ name: 'Up', idx: (i) => i - 1 },
			{ name: 'Down', idx: (i) => i + 1 },
			{ name: 'sep' },
			{ name: 'Send to top', idx: 0 },
			{ name: 'Send to bottom', idx: Infinity },

		];
		options.forEach((opt) => {
			if (menu.isSeparator(opt)) { menu.newSeparator(subMenuName); return; }
			menu.newEntry({ menuName: subMenuName, entryText: opt.name, func: () => list.setManualSortingForPls([folder], opt.idx) });
		});
	}
	menu.newSeparator();
	{
		const subMenuName = menu.newMenu('Move to folder');
		menu.newEntry({ menuName: subMenuName, entryText: 'Select folder:', flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		const { tree, folders } = list.getFolderTree(true);
		const count = new WeakMap;
		Object.values(tree).forEach((val) => count.set(val, 0));
		if (folders.length) {
			tree[subMenuName] = tree.none;
			delete tree.none;
			// Create submenus in order
			for (const from in tree) {
				tree[from].forEach((subMenu) => {
					if (tree[subMenu].size) {
						menu.findOrNewMenu(subMenu, from);
					}
				});
			}
			// Populate
			folders.forEach((opt) => {
				const menuName = opt.parents.length && !tree[opt.name].size
					? opt.parents.pop()
					: tree[opt.name].size
						? opt.name
						: subMenuName;
				const bSameFolder = opt.name === folder.inFolder;
				const bParent = opt.name === menuName;
				const entryText = (bParent
					? _b(opt.name)
					: opt.name
				) + '\t' + _b(opt.folder.pls.lengthFilteredDeep);
				const entriesCount = count.get(tree[menuName]) + 1;
				count.set(tree[menuName], entriesCount);
				if (entriesCount && entriesCount % 5 === 0) {
					menu.newEntry({ menuName, entryText: '', flags: MF_MENUBARBREAK | MF_GRAYED });
					menu.newSeparator(menuName);
				}
				if (bParent && [...tree[menuName]].some((sub) => tree[sub].size)) { menu.newSeparator(menuName); }
				menu.newEntry({
					menuName, entryText, func: () => {
						list.moveToFolder(folder, opt.folder);
						if (opt.folder.isOpen) { list.showPlsByObj(folder); }
						else { list.showPlsByObj(opt.folder); }
					}, flags: bSameFolder ? MF_GRAYED : MF_STRING
				});
				if (bParent && tree[menuName].size && [...tree[menuName]].every((sub) => !tree[sub].size)) { menu.newSeparator(menuName); }
			});
			if (folder.inFolder) {
				menu.newSeparator(subMenuName);
				menu.newEntry({
					menuName: subMenuName, entryText: '- no folder -', func: () => {
						list.moveToFolder(folder, null);
						list.showPlsByObj(folder);
					}
				});
			}
			menu.newSeparator(subMenuName);
		}
		menu.newEntry({
			menuName: subMenuName, entryText: 'New folder...', func: () => {
				const parent = list.addFolder();
				if (!parent) { return; }
				list.moveToFolder(folder, parent);
				list.update({ bReuseData: true });
				list.showPlsByObj(parent);
			}
		});
	}
	menu.newSeparator();
	menu.newEntry({ entryText: 'Delete (only folder)' + list.getGlobalShortcut('delete'), func: () => { list.removePlaylist(z); } });
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
		fb.ShowPopupMessage('Selected indexes were empty on createMenuLeftMult() when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.', window.Name + _ps(window.ScriptInfo.Name));
		return menu;
	}
	const playlists = [];
	for (let z of indexes) {
		playlists.push(list.data[z]);
		if (!playlists.slice(-1)[0]) {
			fb.ShowPopupMessage('Selected playlist was null when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.\n\nInfo:\nIndexes:' + indexes + '\nPlaylists:' + playlists, window.Name + _ps(window.ScriptInfo.Name));
			return menu;
		}
	}
	const autoTags = ['bAutoLoad', 'bAutoLock', 'bMirrorChanges', 'bMultMenu', 'bSkipMenu', 'bPinnedFirst', 'bPinnedLast'];
	const lb = ListenBrainz;
	// Helpers
	const isPlsLoaded = (pls) => plman.FindPlaylist(pls.nameId) !== -1;
	const isAutoPls = (pls) => pls.isAutoPlaylist || pls.query;
	const isLockPls = (pls) => pls.isLocked;
	const isPlsEditable = (pls) => pls.extension === '.m3u' || pls.extension === '.m3u8' || pls.extension === '.xspf' || pls.extension === '.fpl' || pls.extension === '.xsp' || pls.isAutoPlaylist || pls.extension === '.ui' || pls.isFolder;
	const isPlsLockable = (pls) => isPlsEditable(pls) || pls.extension === '.strm';
	const isPlsUI = (pls) => pls.extension === '.ui';
	const nonPlsUI = playlists.filter((pls) => pls.extension !== '.ui');
	const isFolder = (pls) => pls.isFolder;
	// Pls
	const playlistsUI = playlists.filter((pls) => pls.extension === '.ui');
	const playlistsLoaded = playlists.filter((pls) => !isFolder(pls) && isPlsLoaded(pls));
	// Evaluate
	const bIsPlsLoadedEvery = playlists.every((pls) => isPlsLoaded(pls));
	const bIsPlsLoadedSome = bIsPlsLoadedEvery || playlists.some((pls) => isPlsLoaded(pls));
	const bIsAutoPlsEvery = playlists.every((pls) => isAutoPls(pls));
	const bIsValidXSPEveryOnly = playlists.every((pls) => (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type === 'songs') || true);
	const bIsValidXSPEvery = playlists.every((pls) => pls.extension !== '.xsp' || (Object.hasOwn(pls, 'type') && pls.type === 'songs'));
	const bIsAutoPlsSome = bIsAutoPlsEvery || playlists.some((pls) => isAutoPls(pls));
	const bIsLockPlsEvery = nonPlsUI.length && nonPlsUI.every((pls) => isLockPls(pls));
	const bIsFolderEvery = playlists.every((pls) => isFolder(pls));
	const bIsPlsEditable = playlists.some((pls) => isPlsEditable(pls));
	const bIsPlsLockable = playlists.some((pls) => isPlsLockable(pls));
	const bIsPlsUIEvery = playlistsUI.length === playlists.length;
	const bIsPlsUISome = playlistsUI.length !== 0;
	const bWritableFormat = playlists.some((pls) => writablePlaylistFormats.has(pls.extension));
	const bManualSorting = list.methodState === list.manualMethodState();
	const bListenBrainz = list.properties.lBrainzToken[1].length > 0;
	// Enabled menus
	const showMenus = JSON.parse(list.properties.showMenus[1]);
	// Header
	if (list.bShowMenuHeader) {
		const items = playlists.filter((pls) => !isFolder(pls));
		const itemsNum = items.length;
		const folderNum = playlists.length - itemsNum;
		menu.newEntry({
			entryText: '--- ' + items.length + ' playlists' + (folderNum ? ' (' + folderNum + ' folders)' : '') + ': ' + items.map((pls) => pls.name).joinUpToChars(', ', 20) + ' ---',
			flags: MF_GRAYED
		});
		menu.newSeparator();
	}
	// Entries
	{	// Load
		// Load playlist within foobar2000. Only 1 instance allowed
		menu.newEntry({
			entryText: 'Load playlists' + list.getGlobalShortcut('load'), func: () => {
				indexes.forEach((z, i) => {
					const pls = playlists[i];
					if (!isPlsUI(pls) && !isFolder(pls)) { list.loadPlaylist(z); }
				});
			}, flags: bIsPlsLoadedEvery || bIsFolderEvery ? MF_GRAYED : MF_STRING
		});
		// Merge load
		menu.newEntry({
			entryText: 'Merge-load playlists', func: () => {
				const zArr = [...indexes].filter((idx, i) => !isFolder(playlists[i]));
				if (zArr.length) {
					clonePlaylistMergeInUI(list, zArr, { remDupl: [] });
				}
			}, flags: playlists.length < 2 || !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
		});
		menu.newEntry({
			entryText: 'Merge-load (no duplicates)', func: () => {
				const zArr = [...indexes].filter((idx, i) => !isFolder(playlists[i]));
				if (zArr.length) {
					clonePlaylistMergeInUI(list, zArr, { remDupl: list.removeDuplicatesAutoPls, bAdvTitle: list.bAdvTitle, bMultiple: list.bMultiple });
				}
			}, flags: !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
		});
		// Clone in UI
		menu.newEntry({
			entryText: 'Clone playlists in UI' + list.getGlobalShortcut('clone ui'), func: () => {
				indexes.forEach((z, i) => {
					const pls = playlists[i];
					if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { return; }
					if (!isPlsUI(pls) && !isFolder(pls)) {
						if (pls.isAutoPlaylist) {
							const remDupl = (pls.isAutoPlaylist && list.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls) ? list.removeDuplicatesAutoPls : [];
							cloneAsStandardPls(list, z, { remDupl, bAdvTitle: list.bAdvTitle, bMultiple: list.bMultiple }, false);
						} else {
							clonePlaylistFile(list, z, '.ui');
						}
					}
				});
			}, flags: bIsPlsLoadedEvery || !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
		});
		if (showMenus['Queue handling']) {
			menu.newSeparator();
			menu.newEntry({
				entryText: 'Add tracks to queue', func: () => {
					playlists.forEach((pls) => {
						if (!isFolder(pls)) {
							list.queuePlaylist(pls, { bAsync: true });
						}
					});
				}, flags: !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
			});
			menu.newEntry({
				entryText: 'Add tracks to queue (random)', func: () => {
					[...playlists].shuffle().forEach((pls) => {
						if (!isFolder(pls)) {
							list.queuePlaylist(pls, { bAsync: true, bRandom: true, bDedup: true });
						}
					});
				}, flags: !bIsValidXSPEveryOnly || bIsFolderEvery ? MF_GRAYED : MF_STRING
			});
		}
		menu.newSeparator();
		// Convert UI playlists
		menu.newEntry({
			entryText: 'Convert to playlist files', func: () => {
				playlists.forEach((pls) => {
					if (isPlsUI(pls)) {
						const idx = plman.FindPlaylist(pls.nameId);
						list.convertUiPlaylist({ idx, name: pls.name, toFolder: list.getParentFolder(pls) });
					}
				});
			}, flags: bIsPlsUISome ? MF_STRING : MF_GRAYED
		});
	}
	if (showMenus['Category'] || showMenus['Tags']) { menu.newSeparator(); }
	{	// Tags and category
		if (showMenus['Category']) {	// Set category
			const menuName = menu.newMenu('Set category...', void (0), !bIsLockPlsEvery && bIsPlsEditable ? MF_STRING : MF_GRAYED);
			menu.newEntry({
				menuName, entryText: 'New category...', func: () => {
					let category = '';
					try { category = utils.InputBox(window.ID, 'Category name (only 1):', window.Name + _ps(window.ScriptInfo.Name), playlists[0].category !== null ? playlists[0].category : '', true); }
					catch (e) { return; } // eslint-disable-line no-unused-vars
					indexes.forEach((z, i) => {
						const pls = playlists[i];
						if (!isLockPls(pls) && isPlsEditable(pls)) {
							if (pls.category !== category) { setCategory(category, list, z); }
						}
					});
				}
			});
			menu.newSeparator(menuName);
			list.categories().forEach((category, i) => {
				const count = playlists.reduce((total, pls) => { return (pls.category === (i === 0 ? '' : category) ? total + 1 : total); }, 0);
				const entryText = category + '\t' + _b(count);
				menu.newEntry({
					menuName, entryText, func: () => {
						indexes.forEach((z, j) => {
							const pls = playlists[j];
							if (!isLockPls(pls) && isPlsEditable(pls)) {
								if (pls.category !== category) { setCategory(i ? category : '', list, z); }
							}
						});
					}
				});
				menu.newCheckMenuLast(() => (playlists.length === count));
			});
		}
		if (showMenus['Tags']) {	// Set tag(s)
			const menuName = menu.newMenu('Set playlist tag(s)...', void (0), !bIsLockPlsEvery && bIsPlsEditable ? MF_STRING : MF_GRAYED);
			menu.newEntry({
				menuName, entryText: 'New tag(s)...', func: () => {
					const tags = Input.json(
						'array strings',
						playlists[0].tags,
						'Tag(s) Name(s):\n(JSON)\n\nFor ex: ["Summer", "Cool"]',
						window.Name + _ps(window.ScriptInfo.Name) + ': ' + playlists.map((pls) => pls.name).joinUpToChars(', ', 50),
						'["TagA","TagB"]',
						void (0),
						true
					);
					if (tags === null) { return; }
					indexes.forEach((z, i) => {
						const pls = playlists[i];
						if (!isLockPls(pls) && isPlsEditable(pls)) {
							if (!isArrayEqual(pls.tags, tags)) { setTag(tags, list, z); }
						}
					});
				}
			});
			menu.newSeparator(menuName);
			let bAddInvisibleIds = false;
			list.tags().concat(['sep', ...autoTags]).forEach((tag, i) => {
				const count = playlists.reduce((total, pls) => { return ((i === 0 ? pls.tags.length === 0 : pls.tags.includes(tag)) ? total + 1 : total); }, 0);
				if (menu.isSeparator(tag)) { menu.newSeparator(menuName); bAddInvisibleIds = true; return; } // Add invisible id for entries after separator to duplicate check marks
				menu.newEntry({
					menuName, entryText: tag + '\t' + _b(count), func: () => {
						let tags;
						const bAll = playlists.every((pls) => isLockPls(pls) || !isPlsEditable(pls) || pls.tags.includes(tag));
						indexes.forEach((z, j) => {
							const pls = playlists[j];
							if (!isLockPls(pls) && isPlsEditable(pls)) {
								if (i === 0) { tags = []; }
								else if (pls.tags.includes(tag)) {
									if (bAll) { tags = [...new Set(pls.tags).difference(new Set([tag]))]; }
									else { return; }
								} else { tags = [...pls.tags, tag]; }
								if (!isArrayEqual(pls.tags, tags)) { setTag(tags, list, z); }
							}
						});
					}, bAddInvisibleIds
				});
				menu.newCheckMenuLast(() => (playlists.length === count));
			});
		}
		if (showMenus['Tags']) {	// Adds track tag(s)
			menu.newEntry({
				entryText: 'Automatically add tag(s) to tracks...', func: () => {
					let tags = '';
					const currValue = playlists[0].trackTags && playlists[0].trackTags.length ? JSON.stringify(playlists[0].trackTags) : '';
					try { tags = utils.InputBox(window.ID, 'Enter data json-formatted: [{"tagName":"tagValue"}]\n\nTagValue may be:\n- String or number (doesn\'t need quotes).\n- TF expression applied to added track.\n- JS:+Function name (see helpers_xxx_utils.js).\n\nFor ex: [{"Mood":"Chill"}] or [{"Rating":5}]', window.Name + _ps(window.ScriptInfo.Name), currValue, true); }
					catch (e) { return; } // eslint-disable-line no-unused-vars
					const tagsString = tags;
					if (tags.length) {
						tags = tags.replaceAll('\'\'', '"'); // Replace quotes
						try { tags = JSON.parse(tags); } catch (e) { fb.ShowPopupMessage('Input is not a valid JSON:\n' + tags, window.Name + _ps(window.ScriptInfo.Name)); return; } // eslint-disable-line no-unused-vars
					}
					indexes.forEach((z, i) => {
						const pls = playlists[i];
						if (!isLockPls(pls) && isPlsEditable(pls) && !isFolder(pls) && !isPlsUI(pls)) {
							if (tagsString !== JSON.stringify(pls.trackTags)) { setTrackTags(tags, list, z); }
						}
					});
				}, flags: !bIsLockPlsEvery && bIsPlsEditable && !bIsFolderEvery && !bIsPlsUIEvery ? MF_STRING : MF_GRAYED
			});
		}
	}
	if (showMenus['Export and copy'] || showMenus['Online sync']) { menu.newSeparator(); }
	if (showMenus['Export and copy']) { // Export and Convert
		const flags = (bWritableFormat || bIsPlsUISome || bIsAutoPlsSome) && bIsValidXSPEvery && !bIsFolderEvery ? MF_STRING : MF_GRAYED;
		{	// Copy
			menu.newEntry({
				entryText: 'Copy playlist files to...', func: () => {
					exportPlaylistFiles(list, indexes.filter((idx, i) => playlists[i].path.length && !playlists[i].isFolder));
				}, flags: bIsAutoPlsEvery ? MF_GRAYED : flags
			});
		}
		{	// Export and copy
			menu.newEntry({
				entryText: 'Export and Copy Tracks to...', func: () => {
					let path = '';
					try { path = sanitizePath(utils.InputBox(window.ID, 'Enter destination path:\n(don\'t forget adding \\ to copy to subfolder)', window.Name + _ps(window.ScriptInfo.Name), list.playlistsPath + 'Export\\', true)); }
					catch (e) { return; } // eslint-disable-line no-unused-vars
					if (!path.length) { return; }
					if (path === list.playlistsPath) { console.log('Playlist Manager: can\'t export playlist(s) to original path.'); return; }
					const bSubFolder = WshShell.Popup('Create a subfolder per playlist?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no) === popup.yes;
					indexes.filter((idx, i) => playlists[i].path.length && !playlists[i].isFolder).forEach((z) => {
						const plsPath = path + (bSubFolder ? list.data[z].name + '\\' : '');
						exportPlaylistFileWithTracks({ list, z, bAsync: list.properties.bCopyAsync[1], bNoInput: true, defPath: plsPath, bOpenOnExport: false });
					});
					if (list.properties.bOpenOnExport[1]) { _explorer(path); }
				}, flags: bIsAutoPlsEvery ? MF_GRAYED : flags
			});
		}
		{	// Export
			const presets = JSON.parse(list.properties.converterPreset[1]);
			const subMenuName = menu.newMenu('Export and Convert Tracks to...', void (0), presets.length ? flags : MF_GRAYED);
			menu.newEntry({ menuName: subMenuName, entryText: 'Shift + Click to skip tracks conversion:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			presets.forEach((preset) => {
				const path = preset.path;
				const playlistOutPath = preset.playlistOutPath || '';
				let pathName = playlistOutPath.length
					? '(Fixed folder)'
					: path.length
						? '(' + path.split('\\')[0] + '\\) ' + path.split('\\').slice(-2, -1)
						: '(Folder)';
				const dsp = preset.dsp;
				let dspName = (dsp !== '...' ? dsp : '(DSP)');
				const tf = preset.tf;
				let tfName = Object.hasOwn(preset, 'name') && preset.name.length ? preset.name : preset.tf;
				const extension = Object.hasOwn(preset, 'extension') && preset.extension.length ? preset.extension : '';
				const extensionName = extension.length ? '[' + extension + ']' : '';
				const bExtendedM3U = Object.hasOwn(preset, 'bExtendedM3U') ? preset.bExtendedM3U : true;
				pathName = pathName.cut(20);
				dspName = dspName.cut(20);
				tfName = tfName.cut(35);
				menu.newEntry({
					menuName: subMenuName, entryText: pathName + extensionName + ': ' + dspName + ' ---> ' + tfName, func: () => {
						const bShift = utils.IsKeyPressed(VK_SHIFT);
						const toConvertHandleList = new FbMetadbHandleList();
						Promise.serial(indexes.filter((idx, i) => !playlists[i].isFolder), (z, i) => {
							const pls = playlists[i];
							if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { return; }
							if (writablePlaylistFormats.has(pls.extension) || isPlsUI(pls) || isAutoPls(pls)) {
								const remDupl = (pls.isAutoPlaylist && list.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls)
									? list.removeDuplicatesAutoPls
									: [];
								const exportFunc = pls.isAutoPlaylist
									? exportAutoPlaylistFileWithTracksConvert
									: exportPlaylistFileWithTracksConvert;
								const { bDone, handleList } = exportFunc({
									list, z,
									tf,
									preset: null,
									defPath: path,
									playlistOutPath,
									ext: extension,
									remDupl, // Include remDupl for XSP playlists
									bAdvTitle: list.bAdvTitle,
									bMultiple: list.bMultiple,
									bExtendedM3U
								});
								return Promise.wait(60).then(() => {
									if (bDone && handleList) {
										handleList.Sort();
										toConvertHandleList.MakeUnion(handleList);
										toConvertHandleList.Sort();
									}
								});
							}
						}, 100).then(() => {
							if (!bShift && dsp) {
								console.log('Playlist Manager: ' + toConvertHandleList.Count + ' tracks to convert.');
								fb.RunContextCommandWithMetadb('Convert/' + dsp, toConvertHandleList, 8);
							}
						});
					}, flags
				});
			});
		}
	}
	if (showMenus['Online sync']) { // ListenBrainz
		const subMenuName = menu.newMenu('Online sync...', void (0), bIsValidXSPEvery ? MF_STRING : MF_GRAYED);
		const flags = (bWritableFormat || bIsPlsUISome || bIsAutoPlsSome) && bIsValidXSPEvery && !bIsFolderEvery ? MF_STRING : MF_GRAYED;
		menu.newEntry({
			menuName: subMenuName, entryText: 'Export to ListenBrainz' + (bListenBrainz ? '' : '\t(token not set)'), func: async () => {
				list.exportToListenbrainz(playlists);
			}, flags
		});
		menu.newSeparator(subMenuName);
		menu.newEntry({
			menuName: subMenuName, entryText: 'Get URL...' + (playlists.some((pls) => pls.playlist_mbid.length) ? '' : '\t(no MBID)'), func: async () => {
				console.popup('Playlist URL:\n\t ' + playlists.map((pls) => pls.nameId + ': ' + lb.getPlaylistURL(pls)).join('\n\t '), window.Name + _ps(window.ScriptInfo.Name));
			}, flags: playlists.some((pls) => pls.playlist_mbid.length) ? MF_STRING : MF_GRAYED
		});
	}
	if (showMenus['File locks'] || showMenus['UI playlist locks'] && (bIsPlsUISome || bIsPlsLoadedSome) || showMenus['Sorting'] && bManualSorting) { menu.newSeparator(); }
	{	// File management
		// Locks playlist file
		if (showMenus['File locks']) {
			menu.newEntry({
				entryText: !bIsLockPlsEvery ? 'Lock Playlist (read only)' : 'Unlock Playlist (writable)' + list.getGlobalShortcut('lock file'), func: () => {
					indexes.forEach((z, i) => {
						const pls = playlists[i];
						if (!isPlsUI(pls) && !isFolder(pls) && isLockPls(pls) === bIsLockPlsEvery) { switchLock(list, z); }
					});
				}, flags: bIsPlsLockable && !bIsPlsUIEvery && !bIsFolderEvery ? MF_STRING : MF_GRAYED
			});
		}
		// Locks UI playlist
		if (showMenus['UI playlist locks']) {
			if (bIsPlsUISome || bIsPlsLoadedSome) {
				const lockTypes = [
					{ type: 'AddItems', entryText: 'Adding items' },
					{ type: 'RemoveItems', entryText: 'Removing items' },
					{ type: 'ReplaceItems', entryText: 'Replacing items' },
					{ type: 'ReorderItems', entryText: 'Sorting items' },
					{ type: 'RenamePlaylist', entryText: 'Renaming playlist' },
					{ type: 'RemovePlaylist', entryText: 'Deleting playlist' },
					...(window.Bugs.SetPlaylistLockedActions
						? []
						: [{ type: 'ExecuteDefaultAction', entryText: 'Default action' }])
				].filter(Boolean);
				let bSMPLock = false, lockName = new Set();
				playlistsLoaded.forEach((pls) => {
					const index = plman.FindPlaylist(pls.nameId);
					const lockNamePls = plman.GetPlaylistLockName(index);
					if (!bSMPLock) { bSMPLock = (lockNamePls === window.Parent || !lockNamePls); }
					if (!bSMPLock) { lockName.add(lockNamePls); }
				});
				lockName = [...lockName][0] + (lockName.size > 1 ? ' & ...' : '');
				const flags = bSMPLock ? MF_STRING : MF_GRAYED;
				const subMenuName = menu.newMenu('Edit UI Playlist lock');
				menu.newEntry({ menuName: subMenuName, entryText: 'Lock by action:' + (!bSMPLock ? '\t' + _p(lockName) : ''), flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				lockTypes.forEach((lock) => {
					menu.newEntry({
						menuName: subMenuName, entryText: lock.entryText, func: () => {
							const report = [];
							playlistsLoaded.forEach((pls) => {
								const index = plman.FindPlaylist(pls.nameId);
								const lockName = plman.GetPlaylistLockName(index);
								const bSMPLock = lockName === window.Parent || !lockName;
								if (bSMPLock) {
									setLocks(index, [lock.type], 'switch');
								} else {
									report.push('\t- ' + pls.nameId + ': ' + lockName);
								}
							});
							if (report.length) {
								fb.ShowPopupMessage('These playlists can not be changed since lock is set by another component:\n' + report.join('\n'), window.Name + _ps(window.ScriptInfo.Name));
							}
						}, flags
					});
					menu.newCheckMenuLast(() => {
						return playlistsLoaded.every((pls) => {
							const index = plman.FindPlaylist(pls.nameId);
							const currentLocks = new Set(plman.GetPlaylistLockedActions(index) || []);
							return currentLocks.has(lock.type);
						});
					});
				});
				menu.newSeparator(subMenuName);
				menu.newEntry({
					menuName: subMenuName, entryText: 'All locks' + (bIsPlsUISome ? list.getGlobalShortcut('lock ui') : ''), func: () => {
						const report = [];
						playlistsLoaded.forEach((pls) => {
							const index = plman.FindPlaylist(pls.nameId);
							const lockName = plman.GetPlaylistLockName(index);
							const bSMPLock = lockName === window.Parent || !lockName;
							if (bSMPLock) {
								setLocks(index, lockTypes.map((lock) => lock.type));
							} else {
								report.push('\t- ' + pls.nameId + ': ' + lockName);
							}
						});
						if (report.length) {
							fb.ShowPopupMessage('These playlists can not be changed since lock is set by another component:\n' + report.join('\n'), window.Name + _ps(window.ScriptInfo.Name));
						}
					}, flags
				});
				menu.newEntry({
					menuName: subMenuName, entryText: 'None' + (bIsPlsUISome ? list.getGlobalShortcut('lock ui') : ''), func: () => {
						const report = [];
						playlistsLoaded.forEach((pls) => {
							const index = plman.FindPlaylist(pls.nameId);
							const lockName = plman.GetPlaylistLockName(index);
							const bSMPLock = lockName === window.Parent || !lockName;
							if (bSMPLock) {
								setLocks(index, []);
							} else {
								report.push('\t- ' + pls.nameId + ': ' + lockName);
							}
						});
						if (report.length) {
							fb.ShowPopupMessage('These playlists can not be changed since lock is set by another component:\n' + report.join('\n'), window.Name + _ps(window.ScriptInfo.Name));
						}
					}, flags
				});
			}
		}
		if (showMenus['Sorting'] && bManualSorting || showMenus['Folders']) {
			if (showMenus['File locks'] || showMenus['UI playlist locks'] && (bIsPlsUISome || bIsPlsLoadedSome)) { menu.newSeparator(); }
			if (showMenus['Sorting'] && bManualSorting) {
				const subMenuName = menu.newMenu('Sorting');
				menu.newEntry({ menuName: subMenuName, entryText: 'Manual sorting:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				const options = [
					{ name: 'Up', idx: (i) => i - 1 },
					{ name: 'Down', idx: (i) => i + 1 },
					{ name: 'sep' },
					{ name: 'Send to top', idx: 0 },
					{ name: 'Send to bottom', idx: Infinity },

				];
				options.forEach((opt) => {
					if (menu.isSeparator(opt)) { menu.newSeparator(subMenuName); return; }
					menu.newEntry({ menuName: subMenuName, entryText: opt.name, func: () => list.setManualSortingForPls(playlists, opt.idx) });
				});
			}
			if (showMenus['Folders']) {
				const subMenuName = menu.newMenu('Move to folder');
				menu.newEntry({ menuName: subMenuName, entryText: 'Select folder:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);

				const { tree, folders } = list.getFolderTree(true);
				const count = new WeakMap;
				Object.values(tree).forEach((val) => count.set(val, 0));
				if (folders.length) {
					tree[subMenuName] = tree.none;
					delete tree.none;
					// Create submenus in order
					for (const from in tree) {
						tree[from].forEach((subMenu) => {
							if (tree[subMenu].size) {
								menu.findOrNewMenu(subMenu, from);
							}
						});
					}
					// Populate
					folders.forEach((opt) => {
						const menuName = opt.parents.length && !tree[opt.name].size
							? opt.parents.pop()
							: tree[opt.name].size
								? opt.name
								: subMenuName;
						const bSameFolder = playlists.every((pls) => opt.name === pls.inFolder);
						const bChild = playlists.every((pls) => list.isUpperFolder(pls, opt.folder));
						const bParent = opt.name === menuName;
						const entryText = (bParent
							? _b(opt.name)
							: opt.name
						) + '\t' + _b(opt.folder.pls.lengthFilteredDeep);
						const entriesCount = count.get(tree[menuName]) + 1;
						count.set(tree[menuName], entriesCount);
						if (entriesCount && entriesCount % 5 === 0) {
							menu.newEntry({ menuName, entryText: '', flags: MF_MENUBARBREAK | MF_GRAYED });
							menu.newSeparator(menuName);
						}
						if (bParent && [...tree[menuName]].some((sub) => tree[sub].size)) { menu.newSeparator(menuName); }
						menu.newEntry({
							menuName, entryText, func: () => {
								const items = playlists
									.filter((item) => !list.isUpperFolder(item, opt.folder));
								list.moveToFolder(items, opt.folder);
								if (opt.folder.isOpen) { list.showPlsByObj(items[0]); }
								else { list.showPlsByObj(opt.folder); }
							}, flags: bSameFolder || bChild ? MF_GRAYED : MF_STRING
						});
						if (bParent && tree[menuName].size && [...tree[menuName]].every((sub) => !tree[sub].size)) { menu.newSeparator(menuName); }
					});
					if (playlists.some((pls) => pls.inFolder)) {
						menu.newSeparator(subMenuName);
						menu.newEntry({
							menuName: subMenuName, entryText: '- no folder -', func: () => {
								list.moveToFolder(playlists, null);
								list.showPlsByObj(playlists[0]);
							}
						});
					}
					menu.newSeparator(subMenuName);
				}
				menu.newEntry({
					menuName: subMenuName, entryText: 'New folder...', func: () => {
						const folder = list.addFolder();
						if (!folder) { return; }
						list.moveToFolder(playlists, folder);
						list.update({ bReuseData: true });
						list.showPlsByObj(folder);
					}
				});
			}
		}
		if (showMenus['File management']) {
			menu.newSeparator();
			// Deletes playlist file and playlist loaded
			menu.newEntry({
				entryText: 'Delete', func: () => {
					list.removePlaylists(list.indexes);
					list.indexes.length = 0; // Reset selection since there is no playlists now
				}
			});
		}
	}
	return menu;
}

function createMenuRight() {
	// Constants
	const menu = menuRbtn;
	menu.clear(true); // Reset one every call
	const bListenBrainz = list.properties.lBrainzToken[1].length > 0;
	const lb = ListenBrainz;
	// Enabled menus
	const showMenus = JSON.parse(list.properties.showMenus[1]);
	const sel = fb.GetSelections(1);
	// Entries
	{ // New Playlists
		!list.bLiteMode && menu.newEntry({
			entryText: 'New Playlist File ' + _p(list.playlistsExtension) + '...' + list.getGlobalShortcut('new file'), func: () => {
				const rule = list.folderRules.others;
				const toFolder = rule.length
					? list.dataFolder.find((f) => f.name === rule) || list.addFolder(rule)
					: null;
				list.add({ bEmpty: true, toFolder });
			}
		});
		menu.newEntry({
			entryText: 'New UI-only Playlist...' + list.getGlobalShortcut('new ui'), func: () => {
				const rule = list.folderRules.internalUi;
				const toFolder = rule.length
					? list.dataFolder.find((f) => f.name === rule) || list.addFolder(rule)
					: null;
				list.addUiPlaylist({ bInputName: true, toFolder });
			}
		});
		menu.newSeparator();
		menu.newEntry({
			entryText: 'New AutoPlaylist...', func: () => {
				const rule = list.folderRules.others;
				const toFolder = rule.length
					? list.dataFolder.find((f) => f.name === rule) || list.addFolder(rule)
					: null;
				const pls = list.addAutoPlaylist(void (0), void (0), toFolder);
				if (pls) { list.loadPlaylistOrShow(list.getPlaylistsIdxByObj([pls]), true); }
			}
		});
		!list.bLiteMode && menu.newEntry({
			entryText: 'New Smart Playlist...', func: () => {
				const rule = list.folderRules.others;
				const toFolder = rule.length
					? list.dataFolder.find((f) => f.name === rule) || list.addFolder(rule)
					: null;
				const pls = list.addSmartPlaylist(void (0), void (0), toFolder);
				if (pls) { list.loadPlaylistOrShow(list.getPlaylistsIdxByObj([pls]), true); }
			}
		});
		{	// Preset AutoPlaylists
			const options = [
				{ name: 'Media library', query: 'ALL' },
			].concat([
				{ name: 'sep' },
				{
					name: 'Recently added',
					query: globQuery.added,
					sort: 'SORT DESCENDING BY ' + _qCond(globTags.sortAdded),
					bSortForced: false,
					menu: 'Playcount and date'
				},
				{ name: 'sep', menu: 'Playcount and date' },
				{
					name: 'Never played',
					query: _qCond(globTags.playCount) + ' IS 0',
					menu: 'Playcount and date'
				},
				{
					name: 'Last played today',
					query: globQuery.lastPlayedFunc.replaceAll('#QUERYEXPRESSION#', 'DURING #NOW#'),
					sort: { tfo: globTags.playCountRateGlobalDay, direction: -1 },
					bSortForced: false,
					menu: 'Playcount and date'
				},
				{
					name: 'Last played yesterday',
					query: globQuery.lastPlayedFunc.replaceAll('#QUERYEXPRESSION#', 'DURING #YESTERDAY#'),
					sort: { tfo: globTags.playCountRateGlobalDay, direction: -1 },
					bSortForced: false,
					menu: 'Playcount and date'
				},
				{
					name: 'Last played last 5 days',
					query: globQuery.recentBy('5 DAYS'),
					sort: 'SORT DESCENDING BY ' + _qCond(globTags.sortLastPlayed),
					bSortForced: false,
					menu: 'Playcount and date'
				},
				{ name: 'sep', menu: 'Playcount and date' },
				{
					name: 'Daily listen rate ≥1',
					query: 'NOT ' + _qCond(globTags.playCountRateGlobalDay) + ' LESS 1',
					sort: { tfo: globTags.playCountRateGlobalDay, direction: -1 },
					bSortForced: false,
					menu: 'Playcount and date'
				},
				{
					name: 'Weekly listen rate ≥1',
					query: 'NOT ' + _qCond(globTags.playCountRateGlobalWeek) + ' LESS 1',
					sort: { tfo: globTags.playCountRateGlobalWeek, direction: -1 },
					bSortForced: false,
					menu: 'Playcount and date'
				},
				{
					name: 'Monthly listen rate ≥1',
					query: 'NOT ' + _qCond(globTags.playCountRateGlobalMonth) + ' LESS 1',
					sort: { tfo: globTags.playCountRateGlobalMonth, direction: -1 },
					bSortForced: false,
					menu: 'Playcount and date'
				},
				{
					name: 'Yearly listen rate ≥1',
					query: 'NOT ' + _qCond(globTags.playCountRateGlobalYear) + ' LESS 1',
					sort: { tfo: globTags.playCountRateGlobalYear, direction: -1 },
					bSortForced: false,
					menu: 'Playcount and date'
				}
			]).concat([
				{ name: 'sep' },
				{ name: 'Unrated tracks', query: globQuery.noRating, menu: 'Rating' },
				{ name: 'sep', menu: 'Rating' },
				{ name: 'Rated 1 tracks', query: globTags.rating + ' IS 1', menu: 'Rating' },
				{ name: 'Rated 2 tracks', query: globTags.rating + ' IS 2', menu: 'Rating' },
				{ name: 'Rated 3 tracks', query: globTags.rating + ' IS 3', menu: 'Rating' },
				{ name: 'Rated 4 tracks', query: globTags.rating + ' IS 4', menu: 'Rating' },
				{ name: 'Rated 5 tracks', query: globTags.rating + ' IS 5', menu: 'Rating' },
				{ name: 'sep', menu: 'Rating' },
				{ name: 'Loved tracks', query: globQuery.loved, menu: 'Rating' },
				{ name: 'Hated tracks', query: globQuery.hated, menu: 'Rating' },
				{ name: 'sep', menu: 'Rating' },
				{ name: 'Fav tracks', query: globQuery.fav, sort: 'SORT DESCENDING BY ' + _qCond(globTags.playCount), bSortForced: false, menu: 'Rating' },
			]).concat([
				{ name: 'sep' },
				{
					name: 'Same genres (any)',
					query: globTags.genre + ' IS #' + globTags.genre + '#',
					sort: 'SORT BY "$rand()"', bSortForced: false,
					menu: 'From selection', expansionBy: 'OR',
					plsName: 'Mix: ' + _t(globTags.genre)
				},
				{
					name: 'Same styles (any)',
					query: globTags.style + ' IS #' + globTags.style + '#',
					sort: 'SORT BY "$rand()"', bSortForced: false,
					menu: 'From selection', expansionBy: 'OR',
					plsName: 'Mix: ' + _t(globTags.style)
				},
				{
					name: 'Same genres (all)',
					query: globTags.genre + ' IS #' + globTags.genre, sort: 'SORT BY "$rand()"',
					bSortForced: false,
					menu: 'From selection', expansionBy: 'AND',
					plsName: 'Genre: ' + _t(globTags.genre)
				},
				{
					name: 'Same styles (all)',
					query: globTags.style + ' IS #' + globTags.style + '#',
					sort: 'SORT BY "$rand()"', bSortForced: false,
					menu: 'From selection', expansionBy: 'AND',
					plsName: 'Style: ' + _t(globTags.style)
				},
				{ name: 'sep', menu: 'From selection' },
				{
					name: 'Tracks (by Artist)',
					query: globTags.artist + ' IS #' + globTags.artistRaw + '#',
					menu: 'From selection', expansionBy: 'OR',
					plsName: 'Tracks by ' + globTags.artist
				},
				{
					name: 'Rated ≥3 tracks (by Artist)',
					query: queryJoin([globQuery.ratingGr2, globTags.artist + ' IS #' + globTags.artistRaw + '#']),
					sort: 'SORT BY "$rand()"', bSortForced: false,
					menu: 'From selection', expansionBy: 'OR',
					plsName: 'Rated ≥3 by ' + globTags.artist
				},
				{
					name: 'Fav tracks (by Artist)',
					query: queryJoin([globQuery.fav, globTags.artist + ' IS #' + globTags.artistRaw + '#']),
					sort: 'SORT DESCENDING BY ' + _qCond(globTags.playCount), bSortForced: false,
					menu: 'From selection', expansionBy: 'OR',
					plsName: 'Fav tracks by ' + globTags.artist
				},
				{
					name: 'Loved tracks (by artist)',
					query: queryJoin([globQuery.loved, globTags.artist + ' IS #' + globTags.artistRaw + '#']),
					sort: 'SORT DESCENDING BY ' + _qCond(globTags.playCount), bSortForced: false,
					menu: 'From selection', expansionBy: 'OR',
					plsName: 'Loved tracks by ' + globTags.artist
				},
			]);
			const subMenuName = menu.newMenu('Preset AutoPlaylists');
			options.forEach((opt) => {
				const subMenuNameTwo = opt.menu ? menu.findOrNewMenu(opt.menu, subMenuName) : subMenuName;
				let flags = MF_STRING;
				let name = opt.plsName || opt.name;
				if (opt.menu === 'From selection' && opt.query) {
					const sel = fb.GetFocusItem(true) || fb.GetSelection();
					if (!sel) { flags = MF_GRAYED; }
					else {
						opt.query = queryReplaceWithCurrent(opt.query, sel, void (0), { expansionBy: opt.expansionBy || 'AND', bToLowerCase: true });
						name = fb.TitleFormat(name).EvalWithMetadb(sel).cut(50);
					}
					delete opt.expansionBy;
				}
				delete opt.menu;
				menu.newEntry({
					menuName: subMenuNameTwo,
					entryText: opt.name, func: !opt.query ? null : () => {
						const rule = list.folderRules.others;
						const toFolder = rule.length
							? list.dataFolder.find((f) => f.name === rule) || list.addFolder(rule)
							: null;
						let i = 0;
						while (list.dataAll.some((pls) => pls.nameId === name)) {
							name = name.replace(/ \((\n\))/, '') + ' ' + _p(++i);
							if (i > 10) { fb.ShowPopupMessage('There are more than 10 playlists with same name: ' + opt.name, window.Name + _ps(window.ScriptInfo.Name)); return; }
						}
						const pls = list.addAutoPlaylist({ sort: '', ...opt, name }, false, toFolder);
						if (pls) { list.loadPlaylistOrShow(list.getPlaylistsIdxByObj([pls]), true); }
					}, flags
				});
			});
		}
		if (!list.bLiteMode) {
			menu.newSeparator();
			const menuName = menu.newMenu('New Playlist File (by ext)...');
			writablePlaylistFormats.forEach((ext) => {
				menu.newEntry({
					menuName,
					entryText: ext, func: () => {
						const rule = list.folderRules.others;
						const toFolder = rule.length
							? list.dataFolder.find((f) => f.name === rule) || list.addFolder(rule)
							: null;
						list.add({ bEmpty: true, toFolder, ext });
					}
				});
			});
		}
		if (showMenus['Folders']) {
			menu.newSeparator();
			menu.newEntry({ entryText: 'New Folder...' + list.getGlobalShortcut('new folder'), func: () => { list.addFolder(); } });
		}
		menu.newSeparator();
		!list.bLiteMode && menu.newEntry({ entryText: 'New playlist from active...', func: () => { list.add({ bEmpty: false }); }, flags: plman.ActivePlaylist !== -1 ? MF_STRING : MF_GRAYED });
		if (plman.ActivePlaylist !== -1 && plman.IsAutoPlaylist(plman.ActivePlaylist)) {
			menu.newEntry({
				entryText: 'New AutoPlaylist from active ...', func: () => {
					const pls = { name: plman.GetPlaylistName(plman.ActivePlaylist) };
					plman.ShowAutoPlaylistUI(plman.ActivePlaylist); // Workaround to not being able to access AutoPlaylist data... user must copy/paste
					list.addAutoPlaylist(pls, true);
				}, flags: plman.ActivePlaylist !== -1 ? MF_STRING : MF_GRAYED
			});
		}
		menu.newEntry({
			entryText: 'New playlist from selection...', func: () => {
				const oldIdx = plman.ActivePlaylist;
				if (oldIdx === -1) { return; }
				const name = list.properties.bAutoSelTitle[1]
					? list.plsNameFromSelection(oldIdx)
					: 'Selection from ' + plman.GetPlaylistName(oldIdx).cut(10);
				const rule = list.bLiteMode ? list.folderRules.plsFromSel : list.folderRules.others;
				const toFolder = rule.length
					? list.dataFolder.find((f) => f.name === rule) || list.addFolder(rule)
					: null;
				const pls = list.bLiteMode
					? list.addUiPlaylist({ bInputName: true, toFolder })
					: list.add({ bEmpty: true, name, bInputName: true, toFolder });
				if (pls) {
					const playlistIndex = list.getIndex(pls, true);
					const newIdx = plman.ActivePlaylist;
					plman.ActivePlaylist = oldIdx;
					list.sendSelectionToPlaylist({ playlistIndex, bCheckDup: true, bAlsoHidden: true, bPaint: false, bDelSource: false });
					// Don't reload the list but just paint with changes to avoid jumps
					plman.ActivePlaylist = newIdx;
					list.showCurrPls();
				}
			}, flags: sel && sel.Count !== 0 ? MF_STRING : MF_GRAYED
		});
	}
	{	// Find selection
		menu.newEntry({
			entryText: 'Find current selection...' + list.getGlobalShortcut('find'), func: () => {
				/** @type {string[]|| {{name:string, category:string}[]}} */
				const found = [];
				for (let i = 0; i < list.itemsAll; i++) {
					if (list.checkSelectionDuplicatesPlaylist({ playlistIndex: i, bAlsoHidden: true })) {
						found.push({ name: list.dataAll[i].name, category: list.dataAll[i].category });
					}
				}
				found.sort((a, b) => a.category.localeCompare(b.category, void (0), { sensitivity: 'base', numeric: true }));
				for (let i = 0, prevCat = null; i < found.length; i++) {
					if (prevCat !== found[i].category) {
						prevCat = found[i].category;
						found.splice(i, 0, { category: found[i].category });
					}
				}
				for (let i = 0; i < found.length; i++) {
					if (found[i].name) {
						found[i] = '\t- ' + found[i].name;
					} else {
						found[i] = (found[i].category || 'No category') + ':';
					}
				}
				const results = found.length ? found.join('\n') : 'None.';
				fb.ShowPopupMessage('In case of multiple selection, a single track match will be enough\nto show a playlist. So not all results will contain all tracks.\n\nHint: Use playlist search (Ctrl + F) to find items on loaded playlists.\n\nSelected tracks found on these playlists: [Category:] - Playlist\n\n' + results, window.Name + _ps(window.ScriptInfo.Name));
			}, flags: sel && sel.Count !== 0 ? MF_STRING : MF_GRAYED
		});
	}
	menu.newSeparator();
	{	// Import Tools
		const subMenuName = menu.newMenu('Import tools');
		if (showMenus['Online sync']) {
			menu.newEntry({
				menuName: subMenuName,
				entryText: 'Import from ListenBrainz...' + (bListenBrainz ? '' : '\t(token not set)'), func: async () => {
					if (!await checkLBToken()) { return Promise.resolve(false); }
					let bDone = false;
					let playlist_mbid = Input.string('string', menu.cache.playlist_mbid || '', 'Enter Playlist MBID:', window.Name + _ps(window.ScriptInfo.Name), '866b5a46-c474-4fae-8782-0f46240a9507', [(mbid) => isUUID(mbid.replace(lb.regEx, ''))]);
					if (playlist_mbid === null) { playlist_mbid = Input.isLastEqual ? Input.lastInput : ''; }
					if (playlist_mbid.length) {
						playlist_mbid = playlist_mbid.replace(lb.regEx, ''); // Allow web link too
						menu.cache.playlist_mbid = playlist_mbid;
						const token = bListenBrainz ? lb.decryptToken({ lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1] }) : null;
						if (!token) { return Promise.resolve(false); }
						pop.enable(true, 'Importing...', 'Importing tracks from ListenBrainz...\nPanel will be disabled during the process.');
						lb.importPlaylist({ playlist_mbid }, token)
							.then((jspf) => {
								if (jspf) {
									let bXSPF = false;
									if (list.playlistsExtension !== '.xspf') {
										const answer = WshShell.Popup('Save as .xspf format?\n(Items not found on library will be kept)', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
										if (answer === popup.yes) { bXSPF = true; }
									} else { bXSPF = true; }
									const data = lb.contentResolver(jspf);
									const handleArr = data.handleArr;
									const notFound = data.notFound;
									const playlist = jspf.playlist;
									const useUUID = list.optionsUUIDTranslate();
									const playlistName = playlist.title;
									const playlistNameId = playlistName + (list.bUseUUID ? nextId(useUUID, false) : '');
									const category = list.categoryState.length === 1 && list.categoryState[0] !== list.categories(0) ? list.categoryState[0] : '';
									const tags = ['ListenBrainz'];
									const author = playlist.extension['https://musicbrainz.org/doc/jspf#playlist'].creator;
									if (list.bAutoLoadTag) { tags.push('bAutoLoad'); }
									if (list.bAutoLockTag) { tags.push('bAutoLock'); }
									if (list.bMultMenuTag) { tags.push('bMultMenu'); }
									if (list.bAutoCustomTag) { list.autoCustomTag.forEach((tag) => { if (!new Set(tags).has(tag)) { tags.push(tag); } }); }
									if (!bXSPF) {
										let bYouTube = false;
										if (notFound.length && isYouTube) {
											const answer = WshShell.Popup('Some imported tracks have not been found on library (see console).\nDo you want to replace them with YouTube links?\n(Pressing \'No\' will omit not found items)?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
											if (answer === popup.yes) { bYouTube = true; }
										}
										const playlistPath = list.playlistsPath + sanitize(playlistName) + list.playlistsExtension;
										const backPath = playlistPath + '.back';
										// Find missing tracks on youTube
										if (bYouTube) {
											pop.enable(false, 'YouTube...', 'Importing tracks from YouTube...\nPanel will be disabled during the process.');
											list.disableAutosaveForPls(playlistNameId);
											// Add MBIDs to youTube track metadata
											notFound.forEach((track) => track.tags = { musicbrainz_trackid: track.identifier });
											// Send request in parallel every x ms and process when all are done
											return Promise.parallel(notFound, youTube.searchForYoutubeTrack, 5).then((results) => {
												let j = 0;
												const itemsLen = handleArr.length;
												let foundLinks = 0;
												results.forEach((result) => {
													for (void (0); j <= itemsLen; j++) {
														if (result.status !== 'fulfilled') { break; }
														const link = result.value;
														if (!link || !link.length) { break; }
														if (!handleArr[j]) {
															handleArr[j] = link.url;
															foundLinks++;
															break;
														}
													}
												});
												const bLoaded = plman.FindPlaylist(playlistNameId) !== -1;
												const idx = plman.FindOrCreatePlaylist(playlistNameId, true);
												plman.ClearPlaylist(idx);
												return plman.AddPlaylistItemsOrLocations(idx, handleArr.filter(Boolean), true)
													.finally(() => {
														plman.ActivePlaylist = idx;
														const handleList = plman.GetPlaylistItems(idx);
														console.log('Playlist Manager: Found ' + foundLinks + ' tracks on YouTube');
														const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
														if (_isFile(playlistPath)) {
															let answer = WshShell.Popup('There is a playlist with same name/path.\nDo you want to overwrite it?.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
															if (answer === popup.no) { return false; }
															_renameFile(playlistPath, backPath);
														}
														bDone = savePlaylist({ handleList, playlistPath, ext: list.playlistsExtension, playlistName, category, tags, playlist_mbid, author: author + ' - Playlist-Manager-SMP', description: playlist.description, useUUID, bBOM: list.bBOM, relPath: (list.bRelativePath ? list.playlistsPath : '') });
														// Restore backup in case something goes wrong
														if (!bDone) { console.log('Playlist Manager: Failed saving playlist\n\t ' + playlistPath); _deleteFile(playlistPath); _renameFile(backPath, playlistPath); }
														else if (_isFile(backPath)) { _deleteFile(backPath); }
														if (bDone) {
															list.update({ bReuseData: false, bNotPaint: true, currentItemIndex: list.lastIndex });
															list.filter();
														}
														if (bDone && !bLoaded) { plman.RemovePlaylist(idx); }
														clearInterval(delay);
														list.enableAutosaveForPls(playlistNameId);
														return bDone;
													});
											});
										} else {
											const handleList = data.handleList;
											const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
											if (_isFile(playlistPath)) {
												let answer = WshShell.Popup('There is a playlist with same name/path.\nDo you want to overwrite it?.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
												if (answer === popup.no) { return false; }
												_renameFile(playlistPath, backPath);
											}
											bDone = savePlaylist({ handleList, playlistPath, ext: list.playlistsExtension, playlistName, category, tags, playlist_mbid, author: author + ' - Playlist-Manager-SMP', description: playlist.description, useUUID, bBOM: list.bBOM, relPath: (list.bRelativePath ? list.playlistsPath : '') });
											// Restore backup in case something goes wrong
											if (!bDone) { console.log('Playlist Manager: Failed saving playlist\n\t ' + playlistPath); _deleteFile(playlistPath); _renameFile(backPath, playlistPath); }
											else if (_isFile(backPath)) { _deleteFile(backPath); }
											list.disableAutosaveForPls(playlistNameId);
											const idx = bDone ? plman.FindOrCreatePlaylist(playlistNameId, true) : -1;
											if (bDone && idx !== -1) { sendToPlaylist(handleList, playlistNameId); }
											if (bDone) {
												list.update({ bReuseData: false, bNotPaint: true, currentItemIndex: list.lastIndex });
												list.filter();
											}
											clearInterval(delay);
											list.enableAutosaveForPls(playlistNameId);
											return bDone;
										}
									} else {
										let totalDuration = 0;
										playlist.creator = author + ' - Playlist-Manager-SMP';
										playlist.info = 'https://listenbrainz.org/user/' + author + '/playlists/';
										playlist.location = playlist.identifier;
										playlist.meta = [
											{ uuid: (useUUID ? nextId(useUUID) : '') },
											{ locked: true },
											{ category },
											{ tags: (isArrayStrings(tags) ? tags.join(';') : '') },
											{ trackTags: '' },
											{ playlistSize: playlist.track.length },
											{ duration: totalDuration },
											{ playlist_mbid }
										];
										// Tracks text
										handleArr.forEach((handle, i) => {
											if (!handle) { return; }
											const relPath = '';
											const tags = getHandleListTagsV2(new FbMetadbHandleList(handle), ['TITLE', 'ARTIST', 'ALBUM', 'TRACK', 'LENGTH_SECONDS_FP', '_PATH_RAW', 'SUBSONG', 'MUSICBRAINZ_TRACKID']);
											const title = tags[0][0][0];
											const creator = tags[1][0].join(', ');
											const album = tags[2][0][0];
											const trackNum = Number(tags[3][0][0]);
											const duration = Math.round(Number(tags[4][0][0] * 1000)); // In ms
											totalDuration += Math.round(Number(tags[4][0][0])); // In s
											let trackPath = resolveTrackRelativePath(tags[5][0][0].replace(fileRegex, ''));
											const bLink = _isLink(trackPath);
											trackPath = relPath.length && !_isLink(trackPath)
												? getRelPath(trackPath, relPathSplit)
												: trackPath;
											const location = [(bLink ? '' : 'file:///') + encodeURIComponent(trackPath.replace(/\\/g, '/'))];
											const subSong = Number(tags[6][0][0]);
											const meta = isSubsongPath(location[0] + ',' + subSong) ? [{ subSong }] : [];
											const identifier = [tags[7][0][0]];
											playlist.track[i] = {
												location,
												annotation: void (0),
												title,
												creator,
												info: void (0),
												image: void (0),
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
											if (!Array.isArray(track.identifier)) { track.identifier = [track.identifier]; }
										});
										// Update total duration of playlist
										playlist.meta.find((obj) => { return Object.hasOwn(obj, 'duration'); }).duration = totalDuration;
										const playlistPath = list.playlistsPath + sanitize(playlist.title) + '.xspf';
										const playlistNameId = playlist.title + (list.bUseUUID ? nextId(useUUID, false) : '');
										let xspf = XSPF.toXSPF(jspf);
										const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
										xspf = xspf.join('\r\n');
										bDone = _save(playlistPath, xspf, list.bBOM);
										// Check
										if (_isFile(playlistPath) && bDone) { bDone = (_open(playlistPath, utf8) === xspf); }
										// Restore backup in case something goes wrong
										const backPath = playlistPath + '.back';
										if (!bDone) { console.log('Playlist Manager: Failed saving playlist\n\t ' + playlistPath); _deleteFile(playlistPath); _renameFile(backPath, playlistPath); }
										else if (_isFile(backPath)) { _deleteFile(backPath); }
										if (bDone && plman.FindPlaylist(playlistNameId) !== -1) { sendToPlaylist(new FbMetadbHandleList(handleArr.filter((n) => n)), playlistNameId); }
										if (bDone) {
											list.update({ bReuseData: false, bNotPaint: true, currentItemIndex: list.lastIndex });
											list.filter();
										}
										clearInterval(delay);
										return bDone;
									}
								} else { return bDone; }
							})
							.finally(() => {
								if (!bDone) { lb.consoleError('Playlist was not imported.'); }
								if (pop.isEnabled()) { pop.disable(true); }
								return bDone;
							});
					} else { return Promise.resolve(true); }
				}, flags: bListenBrainz ? MF_STRING : MF_GRAYED
			});
			menu.newSeparator(subMenuName);
		}
		menu.newEntry({
			menuName: subMenuName,
			entryText: 'Import from file \\ url...', func: () => {
				const path = Input.string('file|url', folders.xxx + 'examples\\track_list_to_import.txt', 'Enter path to text file with list of tracks:\n(URLs are also allowed as long as they point to a text file)', window.Name + _ps(window.ScriptInfo.Name), folders.xxx + 'examples\\track_list_to_import.txt', void (0), true) || Input.lastInput;
				if (path === null) { return; }
				if (!/https?:\/\/|www./.test(path) && !_isFile(path)) {
					fb.ShowPopupMessage('File not found:\n\n' + path, window.Name + _ps(window.ScriptInfo.Name));
					return;
				}
				// Presets
				const maskPresets = [
					{ name: 'Numbered Track list', val: JSON.stringify(['. ', '%TITLE%', ' - ', globTags.artist]), discard: '#' },
					{ name: 'Track list', val: JSON.stringify(['%TITLE%', ' - ', globTags.artist]), discard: '#' },
					{ name: 'M3U Extended', val: JSON.stringify(['#EXTINF:', ',', globTags.artist, ' - ', '%TITLE%']), discard: '' }
				];
				let bPresetUsed = false;
				let discardMask = '';
				let formatMask = Input.string(
					'string',
					list.properties.importPlaylistMask[1].replace(/"/g, '\''),
					'Enter pattern to retrieve tracks. Mask is saved for future use.\nPresets at bottom may also be loaded by their number ([x]).\n\nTo discard a section, use \'\' or "".\nTo match a section, put the exact chars to match.\nStrings with \'%\' are considered tags to extract.\n\n[\'. \', \'%TITLE%\', \' - \', \'%ALBUM ARTIST%\'] matches something like:\n1. Respect - Aretha Franklin' + (maskPresets.length ? '\n\n' + maskPresets.map((preset, i) => { return '[' + i + ']' + (preset.name.length ? ' ' + preset.name : '') + ': ' + preset.val; }).join('\n') : ''),
					window.Name + _ps(window.ScriptInfo.Name),
					maskPresets[0].val, void (0), true
				) || Input.lastInput;
				if (formatMask === null) { return; }
				try {
					formatMask = formatMask.replace(/'/g, '"');
					// Load preset if possible
					if (formatMask.search(/^\[\d*\]/g) !== -1) {
						const idx = formatMask.slice(1, -1);
						formatMask = idx >= 0 && idx < maskPresets.length ? maskPresets[idx].val : null;
						discardMask = idx >= 0 && idx < maskPresets.length ? maskPresets[idx].discard : null;
						bPresetUsed = true;
						if (!formatMask) { console.log('Playlist Manager: Invalid format mask preset'); return; }
					}
					// Parse mask
					formatMask = JSON.parse(formatMask);
				}
				catch (e) { console.log('Playlist Manager: Invalid format mask'); return; } // eslint-disable-line no-unused-vars
				if (!formatMask) { return; }
				if (!bPresetUsed) {
					discardMask = Input.string(
						'string',
						'',
						'Any line starting with the following string will be skipped:\n(For ex. to skip lines starting with \'#BLABLABLA...\', write \'#\')',
						window.Name + _ps(window.ScriptInfo.Name)
					) || Input.lastInput;
					if (discardMask === null) { return; }
				}
				const queryFilters = JSON.parse(list.properties.importPlaylistFilters[1]);
				if (!pop.isEnabled()) { // Display animation except for UI playlists
					pop.enable(true, 'Importing...', 'Importing file / url...\nPanel will be disabled during the process.', 'importing');
				}
				ImportTextPlaylist.getHandles({ path, formatMask, discardMask, queryFilters })
					.then((data) => {
						if (pop.isEnabled('importing')) { pop.disable(true); }
						let bYouTube = false;
						const notFoundFiltered = data.notFound
							.filter((v) => Object.hasOwn(v, 'creator') && Object.hasOwn(v, 'title'))
							.map((v) => { return { creator: v.creator, title: capitalize(v.title), tags: v.tags }; });
						if (data.notFound.length) {
							const report = data.notFound.reduce((acc, line) => {
								return acc + (acc.length ? '\n' : '') +
									'Line ' + line.idx + '-> ' +
									Object.keys(line.tags).map((key) => { return capitalize(key) + ': ' + line.tags[key]; }).join(', ');
							}, '');
							const reportPls = data.notFound.reduce((acc, line) => {
								return acc + (acc.length ? '\n' : '') +
									Object.keys(line.tags).map((key) => { return line.tags[key]; }).join(' - ');
							}, '');
							fb.ShowPopupMessage(reportPls, 'Not found list');
							fb.ShowPopupMessage(report, 'Tracks not found at source');
							if (notFoundFiltered.length && isYouTube) {
								const answer = WshShell.Popup('Some imported tracks have not been found on library (see popup).\nDo you want to replace them with YouTube links?\n(Pressing \'No\' will omit not found items)?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
								if (answer === popup.yes) { bYouTube = true; }
							}
						}
						if (bYouTube) {
							if (!pop.isEnabled()) { // Display animation except for UI playlists
								pop.enable(true, 'Searching...', 'Searching YouTube...\nPanel will be disabled during the process.', 'searching');
							}
							// Send request in parallel every x ms and process when all are done
							return Promise.parallel(notFoundFiltered, youTube.searchForYoutubeTrack, 5).then((results) => {
								let j = 0;
								const itemsLen = data.handleArr.length;
								let foundLinks = 0;
								results.forEach((result) => {
									for (void (0); j <= itemsLen; j++) {
										if (result.status !== 'fulfilled') { break; }
										const link = result.value;
										if (!link || !link.length) { break; }
										if (!data.handleArr[j]) {
											data.handleArr[j] = link.url;
											foundLinks++;
											break;
										}
									}
								});
								console.log('Playlist Manager: Found ' + foundLinks + ' tracks on YouTube');
								const idx = plman.FindOrCreatePlaylist('Import', true);
								plman.UndoBackup(idx);
								plman.ClearPlaylist(idx);
								plman.ActivePlaylist = idx;
								return plman.AddPlaylistItemsOrLocations(idx, data.handleArr.filter(Boolean), true);
							});
						} else if (data.handleList.Count) {
							const idx = plman.FindOrCreatePlaylist('Import', true);
							plman.UndoBackup(idx);
							plman.ClearPlaylist(idx);
							plman.InsertPlaylistItems(idx, 0, data.handleList);
							plman.ActivePlaylist = idx;
						}
					})
					.finally(() => {
						if (pop.isEnabled('searching') || pop.isEnabled('importing')) { pop.disable(true); }
					});
			}
		});
		if (!menu.isLastEntrySep) { menu.newSeparator(subMenuName); }
		menu.newEntry({
			menuName: subMenuName,
			entryText: 'Import AutoPlaylists from UI...', func: () => {
				try { fb.RunMainMenuCommand('Save configuration'); } catch (e) { console.log(e); }
				list.importAutoPlaylistsFromFoobar({ bSelect: true });
			},
			flags: list.isAutoPlaylistMissing() ? MF_STRING : MF_GRAYED
		});
		menu.newSeparator(subMenuName);
		{	// Import json
			menu.newEntry({
				menuName: subMenuName,
				entryText: 'Add playlists from json file...', func: () => {
					list.bUpdateAutoPlaylist = true; // Forces AutoPlaylist size update according to query and tags
					list.importJson();
				}
			});
			menu.newEntry({
				menuName: subMenuName,
				entryText: 'Export playlists as json file...', func: () => {
					let answer = WshShell.Popup('Export only AutoPlaylists (yes) or both AutoPlaylists and other playlists -.fpl & .xsp- (no)?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					const path = list.exportJson({ idx: -1, bAllExt: answer !== popup.yes },); // All
					if (_isFile(path)) { _explorer(path); }
				}
			});
		}
	}
	menu.newSeparator();
	{	// Maintenance tools
		const subMenuName = menu.newMenu('Playlists maintenance tools');
		menu.newEntry({ menuName: subMenuName, entryText: 'Perform checks on all playlists:', flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		if (!list.bLiteMode) {	// Absolute/relative paths consistency
			menu.newEntry({
				menuName: subMenuName, entryText: 'Absolute/relative paths...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check if any of them has absolute and relative paths in the same file. That probably leads to unexpected results when using those playlists in other environments.\nDo you want to continue?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Checking...', 'Checking absolute/relative paths...\nPanel will be disabled during the process.'); }
					findMixedPaths().then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with mixed relative and absolute paths:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		if (!list.bLiteMode) {	// External items
			menu.newEntry({
				menuName: subMenuName, entryText: 'External items...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for external items (i.e. items not found on library but present on their paths).\nDo you want to continue?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Searching...', 'Searching external items...\nPanel will be disabled during the process.'); }
					findExternal().then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with items not present on library:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		{	// Dead items
			menu.newEntry({
				menuName: subMenuName, entryText: 'Dead items...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for dead items (i.e. items that don\'t exist in their path).\nDo you want to continue?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Searching...', 'Searching dead items...\nPanel will be disabled during the process.'); }
					findDead().then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with dead items:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		{	// Duplicates
			menu.newEntry({
				menuName: subMenuName, entryText: 'Duplicated items by Path...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for duplicated items (i.e. items that appear multiple times in a playlist).\nDo you want to continue?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Searching...', 'Searching duplicated items...\nPanel will be disabled during the process.'); }
					findDuplicatesByPath().then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with duplicated items:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		{	// Duplicates by TF
			menu.newEntry({
				menuName: subMenuName, entryText: 'Duplicated items by TF...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for duplicated items by TF:\n' + list.properties.removeDuplicatesAutoPls[1] + '\nDo you want to continue?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Searching...', 'Searching duplicated items...\nPanel will be disabled during the process.'); }
					findDuplicatesByTF(list.removeDuplicatesAutoPls, 'pls').then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with duplicated items:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
			menu.newEntry({
				menuName: subMenuName, entryText: 'Duplicated items by TF (AutoPlaylists)...', func: () => {
					let answer = WshShell.Popup('Scan all AutoPlaylists to check for duplicated items by TF:\n' + list.properties.removeDuplicatesAutoPls[1] + '\nDo you want to continue?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Searching...', 'Searching duplicated items...\nPanel will be disabled during the process.'); }
					findDuplicatesByTF(list.removeDuplicatesAutoPls, 'autopls').then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with duplicated items:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		if (!list.bLiteMode) {	// Size mismatch
			menu.newEntry({
				menuName: subMenuName, entryText: 'Playlist size mismatch...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for reported playlist size not matching number of tracks.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Checking...', 'Checking playlist size mismatch...\nPanel will be disabled during the process.'); }
					findSizeMismatch().then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with size mismatch:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		if (!list.bLiteMode) {	// Duration mismatch
			menu.newEntry({
				menuName: subMenuName, entryText: 'Playlist duration mismatch...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for reported playlist duration not matching duration of tracks.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Checking...', 'Checking playlist duration mismatch...\nPanel will be disabled during the process.'); }
					findDurationMismatch().then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with duration mismatch:\n\n' + (report.length ? report.join('\n') : 'None.') + (list.itemsFpl && report.length ? '\n\nAll .fpl playlists cached duration tags have also been updated.' : ''), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		if (!list.bLiteMode) {	// Blank Lines
			menu.newEntry({
				menuName: subMenuName, entryText: 'Blank lines...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for blank lines (it may break playlist on other players).', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Checking...', 'Checking blank lines...\nPanel will be disabled during the process.'); }
					findBlank().then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with blank lines:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		{	// Subsong items
			menu.newEntry({
				menuName: subMenuName, entryText: 'Subsong items...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for items associated by \'Subsong index\' -for ex. ISO files- (it may break playlist on other players).\n\nAutoPlaylists are skipped since they only work within foobar2000, but beware when converting them to other formats. Use the options for AutoPlaylists in such case.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Checking...', 'Checking subsong items...\nPanel will be disabled during the process.'); }
					findSubSongs('pls').then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with subsong items:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
			if (list.dataAll.some((pls) => pls.isAutoPlaylist || pls.query)) {
				menu.newEntry({
					menuName: subMenuName, entryText: 'Subsong items (AutoPlaylists)...', func: () => {
						let answer = WshShell.Popup('Scan all AutoPlaylists and Smart playlists to check for items associated by \'Subsong index\' -for ex. ISO files- (it may break playlist on other players after exporting them).', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
						if (answer !== popup.yes) { return; }
						if (!pop.isEnabled()) { pop.enable(true, 'Checking...', 'Checking subsong items...\nPanel will be disabled during the process.'); }
						findSubSongs('autopls').then(({ found, report }) => {
							if (found.length) { list.filter({ plsState: found }); }
							fb.ShowPopupMessage('Found these playlists with subsong items:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
							pop.disable(true);
						});
					}
				});
			}
		}
		if (!list.bLiteMode) {	// Format specific errors
			menu.newEntry({
				menuName: subMenuName, entryText: 'Format specific errors...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for errors on playlist structure or format.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Checking...', 'Checking format errors...\nPanel will be disabled during the process.'); }
					findFormatErrors().then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with format errors:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		if (!list.bLiteMode) {	// Circular references
			menu.newEntry({
				menuName: subMenuName, entryText: 'Circular references...', func: () => {
					let answer = WshShell.Popup('Scan all playlists to check for circular references on Smart Playlists (.xsp).', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
					if (answer !== popup.yes) { return; }
					if (!pop.isEnabled()) { pop.enable(true, 'Checking...', 'Checking circular references...\nPanel will be disabled during the process.'); }
					findCircularReferences().then(({ found, report }) => {
						if (found.length) { list.filter({ plsState: found }); }
						fb.ShowPopupMessage('Found these playlists with circular references:\n\n' + (report.length ? report.join('\n') : 'None.'), window.Name + _ps(window.ScriptInfo.Name));
						pop.disable(true);
					});
				}
			});
		}
		menu.newSeparator(subMenuName);
		const deadItems = plman.PlaylistItemCount(plman.ActivePlaylist) < 20000
			? getDeadItems(plman.ActivePlaylist).length
			: '?';
		const bLoad = plman.ActivePlaylist !== -1;
		const bLocked = bLoad && new Set(plman.GetPlaylistLockedActions(plman.ActivePlaylist) || [])
			.intersectionSize(new Set(['AddItems', 'RemoveItems'])) > 0;
		menu.newEntry({
			menuName: subMenuName, entryText: 'Revive dead items (active playlist) \t' + (bLocked ? '[locked]' : _b(deadItems)), func: () => {
				if (utils.IsKeyPressed(VK_SHIFT)) {
					selectDeadItems(plman.ActivePlaylist);
				} else {
					list.addToSkipRwLock({ uiIdx: plman.ActivePlaylist, bNotify: true });
					playlistRevive({ playlist: plman.ActivePlaylist, simThreshold: 0.5, bFindAlternative: true, bNotifyPlsMan: false });
				}
			}, flags: bLoad && !bLocked && deadItems ? MF_STRING : MF_GRAYED
		});
	}
	menu.newSeparator();
	{	// File management
		{	// Restore
			const bBin = _hasRecycleBin(list.playlistsPath.match(/^(.+?:)/g)[0]);
			const bItems = (list.deletedItems.length + plman.PlaylistRecycler.Count) > 0;
			const subMenuName = menu.newMenu('Restore' + (!bBin ? ' [missing recycle bin]' : ''), void (0), bItems ? MF_STRING : MF_GRAYED);
			menu.newEntry({ menuName: subMenuName, entryText: 'Restore UI-only playlists or files:', flags: MF_GRAYED });
			if (list.deletedItems.length > 0 && bBin) {
				menu.newSeparator(subMenuName);
				list.deletedItems.slice(0, 8).forEach((item, i) => {
					if (item.extension === '.ui') { return; }
					menu.newEntry({
						menuName: subMenuName, entryText: item.name + '\t' + _p(item.isFolder ? 'folder' : 'file'), func: () => {
							list.addToData(item);
							// Add new category to current view! (otherwise it gets filtered)
							// Easy way: intersect current view + new one with refreshed list
							const categoryState = [...new Set(list.categoryState.concat(item.category)).intersection(new Set(list.categories()))];
							if (item.isAutoPlaylist) {
								list.update({ bReuseData: true, bNotPaint: true }); // Only paint and save to json
							} else if (item.extension === '.ui') {
								for (let j = 0; j < plman.PlaylistRecycler.Count; j++) { // First pls is the last one deleted
									if (plman.PlaylistRecycler.GetName(j) === item.nameId) {
										const size = plman.PlaylistRecycler.GetContent(j).Count;
										if (size === item.size) { // Must match on size and name to avoid restoring another pls with same name
											plman.PlaylistRecycler.Restore(j);
											break;
										}
									}
								}
								list.update({ bReuseData: true, bNotPaint: true }); // Only paint and save to json
							} else if (item.isFolder) {
								list.update({ bReuseData: true, bNotPaint: true }); // Only paint and save to json
							} else {
								_restoreFile(item.path);
								// Revert timestamps
								let newPath = item.path.split('.').slice(0, -1).join('.').split('\\');
								const newName = newPath.pop().split('_ts_')[0];
								newPath = newPath.concat([newName]).join('\\') + item.extension;
								_renameFile(item.path, newPath);
								list.update({ bReuseData: false, bNotPaint: true }); // Updates path..
							}
							list.filter({ categoryState });
							list.deletedItems.splice(i, 1);
							if (list.bAutoRefreshXsp) {
								list.refreshSmartPlaylists({ sources: [item.nameId] });
								if (['By track size', 'By duration'].includes(list.getMethodState())) {
									list.sort();
								}
							}
							list.showPlsByObj(item);
						}
					});
				});
			}
			if (bItems && !menu.isLastEntrySep) { menu.newSeparator(subMenuName); }
			if (plman.PlaylistRecycler.Count > 0) {
				const deletedItems = [];
				for (let i = 0; i < plman.PlaylistRecycler.Count; i++) { deletedItems.push(plman.PlaylistRecycler.GetName(i)); }
				deletedItems.slice(0, 8).forEach((entryText, i) => {
					menu.newEntry({
						menuName: subMenuName, entryText: entryText + '\t(UI)', func: () => {
							plman.PlaylistRecycler.Restore(i);
						}
					});
				});
			}
		}
		if (!list.bLiteMode) {	// Refresh
			menu.newSeparator();
			menu.newEntry({ entryText: 'Manual refresh', func: list.manualRefresh });
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
	const lb = ListenBrainz;
	const getColorName = (val) => val !== -1 && val !== null && typeof val !== 'undefined'
		? (ntc.name(Chroma(val).hex())[1] || '').toString() || 'unknown'
		: '-none-';
	// Enabled menus
	const showMenus = JSON.parse(list.properties.showMenus[1]);
	// Entries
	if (!list.bLiteMode) {	// Playlist folder
		menu.newEntry({
			entryText: 'Set playlists folder...', func: () => {
				const input = Input.string('path', _foldPath(list.playlistsPath), 'Enter path of tracked folder:\n\nRelative paths (to foobar2000\'s profile) are also allowed. For ex:\n\'.\\profile\\playlist_manager\\\'', window.Name + _ps(window.ScriptInfo.Name), _foldPath(list.properties['playlistsPath'][3]), void (0), true);
				if (input === null) { return; }
				let bDone = _isFolder(input);
				if (!bDone) { bDone = _createFolder(input); }
				if (!bDone) {
					fb.ShowPopupMessage('Path can not be found or created:\n\'' + input + '\'', window.Name + _ps(window.ScriptInfo.Name));
					return;
				}
				// Update property to save between reloads
				list.properties['playlistsPath'][1] = input;
				list.playlistsPath = _resolvePath(input);
				list.playlistsPathDirName = list.playlistsPath.split('\\').filter(Boolean).pop();
				list.playlistsPathDisk = list.playlistsPath.split('\\').filter(Boolean)[0].replace(':', '').toUpperCase();
				// Tracking network drive?
				if (mappedDrives.includes(list.playlistsPath.match(/^(.+?:)/g)[0])) {
					if (!list.infoPopups.networkDrive) { list.setInfoPopup('networkDrive'); }
					const file = folders.xxx + 'helpers\\readme\\playlist_manager_network.txt';
					const readme = _open(file, utf8);
					fb.ShowPopupMessage(readme, window.Name + _ps(window.ScriptInfo.Name));
				} else { list.setInfoPopup('networkDrive', false); }
				// Related features
				const answer = list.bLiteMode
					? popup.no
					: WshShell.Popup('Enable \'Relative paths handling\' entries?\n\n(Only useful when tracking playlists which use relative paths for tracks)', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
				if (answer === popup.yes) {
					list.updateMenus({ menus: { 'Relative paths handling': true }, bSave: false });
				}
				overwriteProperties(list.properties);
				bDone = list.checkConfig();
				let test = new FbProfiler(window.Name + _ps(window.ScriptInfo.Name) + ': ' + 'Manual refresh');
				list.headerTextUpdate();
				list.bUpdateAutoPlaylist = true;
				list.update({ bReuseData: false, bNotPaint: true, currentItemIndex: z }); // Forces AutoPlaylist size update according to query and tags
				list.checkConfigPostUpdate(bDone);
				list.filter();
				test.Print();
				list.repaint();
				window.Reload();
			}
		});
		menu.newSeparator();
	}
	if (!list.uiElements['Header buttons'].elements['Filter and sorting'].enabled) {
		if (showMenus['Category']) {	// Category Filter
			const subMenuName = menu.newMenu('Categories shown');
			const options = list.categories();
			const defOpt = options[0];
			menu.newEntry({ menuName: subMenuName, entryText: 'Toggle (click) / Single (Shift + click):', func: null, flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Restore all', func: () => {
					list.filter({ categoryState: options });
				}
			});
			menu.newSeparator(subMenuName);
			const iInherit = (list.categoryState.length === 1 && list.categoryState[0] !== defOpt ? options.indexOf(list.categoryState[0]) : -1);
			options.forEach((item, i) => {
				const count = list.data.reduce((total, pls) => { return (pls.category === (i === 0 ? '' : item) ? total + 1 : total); }, 0);
				menu.newEntry({
					menuName: subMenuName, entryText: item + '\t' + (i === iInherit ? '-inherit- ' : '') + _b(count), func: () => {
						let categoryState;
						// Disable all other tags when pressing shift
						if (utils.IsKeyPressed(VK_SHIFT)) {
							categoryState = [item];
						} else {
							categoryState = list.categoryState.includes(item)
								? list.categoryState.filter((category) => category !== item)
								: (item === defOpt ? [defOpt, ...list.categoryState] : list.categoryState.concat([item]).sort());
						}
						list.filter({ categoryState });
					}
				});
				menu.newCheckMenuLast(() => list.categoryState.includes(item));
			});
		}
		if (showMenus['Tags']) {	// Tag Filter
			const subMenuName = menu.newMenu('Tags shown');
			const options = list.tags();
			const defOpt = options[0];
			menu.newEntry({ menuName: subMenuName, entryText: 'Toggle (click) / Single (Shift + click):', func: null, flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Restore all', func: () => {
					list.filter({ tagState: options });
				}
			});
			menu.newSeparator(subMenuName);
			const bDef = list.tagState.includes(defOpt);
			options.forEach((item, i) => {
				const bInherit = !bDef && list.tagState.includes(item);
				const count = list.data.reduce((total, pls) => { return ((i === 0 ? pls.tags.length === 0 : pls.tags.includes(item)) ? total + 1 : total); }, 0);
				menu.newEntry({
					menuName: subMenuName, entryText: item + '\t' + (bInherit && i !== 0 ? '-inherit- ' : '') + _b(count), func: () => {
						let tagState;
						// Disable all other categories when pressing shift
						if (utils.IsKeyPressed(VK_SHIFT)) {
							tagState = [item];
						} else {
							tagState = list.tagState.includes(item) ? list.tagState.filter((tag) => { return tag !== item; }) : (item === defOpt ? [defOpt, ...list.tagState] : list.tagState.concat([item]).sort());
						}
						list.filter({ tagState });
					}
				});
				menu.newCheckMenuLast(() => list.tagState.includes(item));
			});
		}
		if (showMenus['Category'] || showMenus['Tags']) { menu.newSeparator(); }
	}
	if (!list.bLiteMode) {	// Playlist saving
		const menuName = menu.newMenu('Playlist saving');
		{
			if (!list.bLiteMode) {	// Relative folder
				const subMenuName = menu.newMenu('Save paths relative to folder', menuName);
				const options = ['Yes: Relative to playlists folder', 'No: Use absolute paths (default)'];
				const optionsLength = options.length;
				menu.newEntry({ menuName: subMenuName, entryText: 'How track\'s paths are written:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				if (optionsLength) {
					options.forEach((item, i) => {
						menu.newEntry({
							menuName: subMenuName, entryText: item, func: () => {
								list.bRelativePath = (i === 0);
								list.properties['bRelativePath'][1] = list.bRelativePath;
								overwriteProperties(list.properties);
								if (i === 0) { fb.ShowPopupMessage('All new playlists (and those saved from now on) will have their tracks\' paths edited to be relative to:\n\'' + list.playlistsPath + '\'\n\nFor example, for a file like this:\n' + list.playlistsPath + 'Music\\Artist A\\01 - hjk.mp3\n' + '--> .\\Music\\Artist A\\01 - hjk.mp3\n' + '\n\nBeware adding files which are not in a relative path to the playlist folder, they will be added \'as is\' no matter this setting:\n' + 'A:\\OTHER_FOLDER\\Music\\Artist A\\01 - hjk.mp3\n' + '-->A:\\OTHER_FOLDER\\Music\\Artist A\\01 - hjk.mp3\n\nAny playlist using absolute paths will be converted as soon as it gets updated/saved; apart from that, their usage remains the same.\nIf you want to mix relative and absolute playlists on the same tracked folder, you can do it locking the absolute playlists (so they never get overwritten).', window.Name + _ps(window.ScriptInfo.Name)); }
								else { fb.ShowPopupMessage('All new playlists (and those saved from now on) will use absolute paths.\n\nAny playlist using relative paths will be converted as soon as it gets updated/saved; apart from that, their usage remains the same.\nIf you want to mix relative and absolute playlists on the same tracked folder, you can do it locking the relative playlists (so they never get overwritten).', window.Name + _ps(window.ScriptInfo.Name)); }
							}
						});
					});
					menu.newCheckMenuLast(() => (list.bRelativePath ? 0 : 1), optionsLength);
				}
			}
			if (!list.bLiteMode) {	// Playlist extension
				const subMenuName = menu.newMenu('Default playlist extension', menuName);
				const options = [...writablePlaylistFormats];
				const optionsLength = options.length;
				menu.newEntry({ menuName: subMenuName, entryText: 'Writable formats:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				if (optionsLength) {
					options.forEach((item) => {
						menu.newEntry({
							menuName: subMenuName, entryText: item, func: () => {
								if (item === '.pls') {
									let answer = WshShell.Popup('Are you sure you want to change extension?\n.pls format does not support UUIDs, Lock status, Categories nor Tags.\nUUID will be set to none for all playlists.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
									if (answer !== popup.yes) { return; }
									menu.btn_up(void (0), void (0), void (0), 'Use UUIDs for playlist names...\\' + list.optionsUUID().pop()); // Force UUID change to no UUID using the menu routine
								}
								list.playlistsExtension = item;
								list.properties['extension'][1] = list.playlistsExtension;
								overwriteProperties(list.properties);
							}
						});
					});
					menu.newCheckMenuLast(() => options.indexOf(list.playlistsExtension), optionsLength);
				}
				menu.newSeparator(subMenuName);
				menu.newEntry({
					menuName: subMenuName, entryText: 'Force on (auto)saving', func: () => {
						const answer = WshShell.Popup('Apply default format in any case, not only to new playlists created.\n\nFormat of existing playlists will be changed to the default format whenever they are saved: Manually or on Auto-saving.\n\nOther saving related configuration may apply (like Smart Playlists being skipped or warning popups whenever format will be changed).', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
						list.bSavingDefExtension = (answer === popup.yes);
						if (list.properties['bSavingDefExtension'][1] !== list.bSavingDefExtension) {
							list.properties['bSavingDefExtension'][1] = list.bSavingDefExtension;
							overwriteProperties(list.properties);
						}
					}
				});
				menu.newCheckMenuLast(() => list.bSavingDefExtension);
			}
			if (!list.bLiteMode) {	// BOM
				const subMenuName = menu.newMenu('Save files with BOM', menuName);
				const options = ['Yes: UTF8-BOM', 'No: UTF8'];
				const optionsLength = options.length;
				menu.newEntry({ menuName: subMenuName, entryText: 'Playlists and json:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				if (optionsLength) {
					options.forEach((item, i) => {
						menu.newEntry({
							menuName: subMenuName, entryText: item, func: () => {
								list.bBOM = (i === 0);
								list.properties['bBOM'][1] = list.bBOM;
								overwriteProperties(list.properties);
							}
						});
					});
					menu.newCheckMenuLast(() => (list.bBOM ? 0 : 1), optionsLength);
				}
			}
			if (!list.bLiteMode) {	// Saving warnings
				const subMenuName = menu.newMenu('Warnings about format change', menuName);
				const options = ['Yes: If format will be changed', 'No: Never'];
				const optionsLength = options.length;
				menu.newEntry({ menuName: subMenuName, entryText: 'Warns when updating a file:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				if (optionsLength) {
					options.forEach((item, i) => {
						menu.newEntry({
							menuName: subMenuName, entryText: item, func: () => {
								list.bSavingWarnings = (i === 0);
								list.properties['bSavingWarnings'][1] = list.bSavingWarnings;
								overwriteProperties(list.properties);
							}
						});
					});
				}
				menu.newCheckMenuLast(() => (list.bSavingWarnings ? 0 : 1), optionsLength);
			}
			if (!list.bLiteMode) {	// Smart Playlist saving
				const subMenuName = menu.newMenu('Skip Smart Playlists on Auto-saving', menuName);
				const options = ['Yes: Original format will be maintained', 'No: Format will change on Auto-saving'];
				const optionsLength = options.length;
				menu.newEntry({ menuName: subMenuName, entryText: 'Treat Smart Playlists as AutoPlaylists:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				if (optionsLength) {
					options.forEach((item, i) => {
						menu.newEntry({
							menuName: subMenuName, entryText: item, func: () => {
								list.bSavingXsp = (i === 1);
								list.properties['bSavingXsp'][1] = list.bSavingXsp;
								overwriteProperties(list.properties);
								if (list.bSavingXsp) { fb.ShowPopupMessage('Auto-saving Smart Playlists involves, by design, not having an Smart Playlist anymore but just a list of files (originated from their query).\n\nEnabling this option will allow Smart Playlists to be overwritten as an standard playlist whenever they are updated. Note this goes against their intended aim (like Auto-playlists) and therefore the query and other related data will be lost as soon as it\'s converted to a list of paths (*).\n\nOption not recommended for most users, use it at your own responsibility.\n\n(*) If this happens, remember the original playlist could still be found at the Recycle Bin.', window.Name + _ps(window.ScriptInfo.Name)); }
							}
						});
					});
				}
				menu.newCheckMenuLast(() => (list.bSavingXsp ? 1 : 0), optionsLength);
			}
			if (!list.bLiteMode) {	// RW lock
				const subMenuName = menu.newMenu('Skip overwriting Playlists on file loading', menuName);
				const options = ['Yes: Playlist will be restored without saving', 'No: Clear playlist and load new files'];
				const optionsLength = options.length;
				menu.newEntry({ menuName: subMenuName, entryText: 'Playlist file behavior loading external files:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				if (optionsLength) {
					options.forEach((item) => {
						menu.newEntry({
							menuName: subMenuName, entryText: item, func: () => {
								list.properties['bRwLock'][1] = !list.properties['bRwLock'][1];
								overwriteProperties(list.properties);
								if (list.properties['bRwLock'][1]) { fb.ShowPopupMessage('Selections from the album list or loading a folder or file(s) into foobar2000 may overwrite the active playlist with the new track(s). In such case, autosaving may also overwrite the associated playlist file which may be undesirable or happen without the user noticing it.\n\nWhen this option is enabled, the playlist will be restored back to the previous state automatically and no saving will be performed. Note playback will start anyway with the selected track(s) although now they will not be visible on any playlist.\n\nThis "overwrite lock" safeguard is only applied to playlists with a playlist file associated, not to UI-only playlists. Also, if enabled, some extra garbage logging may be produced when manually applying undo on a playlist (which can not be avoided since every undo action counts -internally- as deleting the entire playlist).', window.Name + _ps(window.ScriptInfo.Name)); }
							}
						});
					});
				}
				menu.newCheckMenuLast(() => (list.properties.bRwLock[1] ? 0 : 1), optionsLength);
			}
		}
	}
	{	// Panel behavior
		const menuName = menu.newMenu('Panel behavior');
		{	// Filtering
			const subMenuName = menu.newMenu('Save filtering between sessions', menuName);
			const options = ['Yes: Always restore last used', 'No: Reset on startup'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Sorting, category and Playlists view:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bSaveFilterStates = (i === 0);
						list.properties['bSaveFilterStates'][1] = list.bSaveFilterStates;
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => (list.bSaveFilterStates ? 0 : 1), optionsLength);
		}
		if (!list.bLiteMode) {	// UI-only playlists
			const subMenuName = menu.newMenu('Track UI-only playlists', menuName);
			const options = ['Yes: also show UI-only playlists', 'No: Only playlist files on tracked folder'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Use manager as native organizer:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bAllPls = (i === 0);
						list.properties['bAllPls'][1] = list.bAllPls;
						overwriteProperties(list.properties);
						if (list.bAllPls) {
							fb.ShowPopupMessage('UI-only playlists are non editable but they can be renamed, deleted or restored. Sending current selection to a playlist is also allowed.\nUI-only playlists have their own custom color to be easily identified.\n\nTo be able to use all the other features of the manager, consider creating playlist files instead. At any point you may use \'Create new playlist from Active playlist...\' to save UI-only playlists as tracked files.', window.Name + _ps(window.ScriptInfo.Name));
						}
						createMenuRight().btn_up(-1, -1, null, 'Manual refresh');
					}
				});
			});
			menu.newCheckMenuLast(() => (list.bAllPls ? 0 : 1), optionsLength);
		}
		menu.newSeparator(menuName);
		{	// Duplicated pls handling
			const subMenuName = menu.newMenu('Duplicated playlists handling', menuName);
			const options = ['Warn about playlists with duplicated names', 'Ignore it'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Only for tracked playlists within the manager:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bCheckDuplWarnings = (i === 0);
						list.properties['bCheckDuplWarnings'][1] = list.bCheckDuplWarnings;
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => (list.bCheckDuplWarnings ? 0 : 1), optionsLength);
		}
		{	// Duplicated tracks handling
			const subMenuName = menu.newMenu('Duplicated tracks handling', menuName);
			const options = ['Skip duplicates when adding new tracks', 'Only warn about it on tooltip'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'When sending selection to a playlist:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bForbidDuplicates = (i === 0);
						list.properties['bForbidDuplicates'][1] = list.bForbidDuplicates;
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => (list.bForbidDuplicates ? 0 : 1), optionsLength);
		}
		{	// Dead items handling
			const subMenuName = menu.newMenu('Dead items handling', menuName);
			const options = ['Also check for dead items on auto-saving', 'Only on manual saving or when adding tracks'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Dead items warnings (streams are skipped):', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bDeadCheckAutoSave = (i === 0);
						list.properties['bDeadCheckAutoSave'][1] = list.bDeadCheckAutoSave;
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => (list.bDeadCheckAutoSave ? 0 : 1), optionsLength);
		}
		menu.newSeparator(menuName);
		{	// Auto-Saving
			['autoSave', 'autoUpdate', 'autoBack'].forEach((key) => {
				const prop = list.properties[key];
				const lower = prop[2].range[1][0];
				let text = '';
				let entryText = '';
				switch (key) {
					case 'autoSave':
						entryText = 'Auto-saving interval...\t(' + prop[1] + ' ms)';
						text = 'Save changes within foobar2000 playlists into tracked files periodically.\nEnter number >= ' + lower + ' (ms):\n(0 to disable it)';
						break;
					case 'autoUpdate':
						entryText = 'Auto-loading interval...\t(' + prop[1] + ' ms)';
						text = 'Check periodically the tracked folder for changes and update the list.\nEnter number >= ' + lower + ' (ms):\n(0 to disable it)';
						if (list.bLiteMode) { return; }
						break;
					case 'autoBack':
						entryText = 'Auto-backup interval...\t(' + (Number.isFinite(prop[1]) ? prop[1] : '\u221E') + ' ms)';
						text = 'Backup to zip periodically the tracked folder.\nEnter number >= ' + lower + ' (ms):\n(0 to disable it)\n(\'Infinity\' only on script unloading / playlist loading)';
						if (list.bLiteMode) { return; }
						break;
				}
				menu.newEntry({
					menuName, entryText, func: () => {
						const input = Input.number('int positive', Number(prop[1]), text, window.Name + _ps(window.ScriptInfo.Name), lower, [(n) => checkProperty(prop, n)]);
						if (input === null) { return; }
						prop[1] = input;
						overwriteProperties(list.properties);
						window.Reload();
					}
				});
				menu.newCheckMenuLast(() => (Number(prop[1]) !== 0));
			});
		}
		{	// Updates
			menu.newSeparator(menuName);
			const subMenuName = menu.newMenu('Loading delays', menuName);
			for (const key in list.delays) {
				let entry = key;
				let info = '';
				let bEnabled = true;
				switch (key) {
					case 'playlistLoading':
						entry = 'Playlist loading';
						break;
					case 'startupPlaylist':
						entry = '-> Startup playlists';
						info = 'Processed after \'Playlist loading\' step.';
						bEnabled = list.activePlsStartup.length || list.bApplyAutoTags;
						break;
					case 'dynamicMenus':
						entry = '      -> Dynamic menus';
						info = 'Processed after \'Startup playlists\' step.';
						bEnabled = list.iDynamicMenus > 0;
						break;
					case 'playlistCache':
						entry = '      -> Search cache';
						info = 'Processed after \'Startup playlists\' step.';
						bEnabled = list.requiresCachePlaylistSearch();
						break;
				}
				menu.newEntry({
					menuName: subMenuName, entryText: entry + '\t' + _b((bEnabled ? list.delays[key] : 0) + ' ms'), func: () => {
						const input = Input.number('int positive', list.delays[key], 'Enter value (ms):\n(>= 0)' + (info.length ? '\n\n' + info : ''), window.Name + _ps(window.ScriptInfo.Name), 50, [(n) => Number.isFinite(n)]);
						if (input === null) { return; }
						list.delays[key] = input;
						list.properties['delays'][1] = JSON.stringify(list.delays);
						overwriteProperties(list.properties);
					}, flags: bEnabled ? MF_STRING : MF_GRAYED
				});
			}
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Restore defaults', func: () => {
					list.properties['delays'][1] = list.properties['delays'][3];
					overwriteProperties(list.properties);
					list.delays = JSON.parse(list.properties['delays'][1]);
				}
			});
		}
		if (!list.bLiteMode) {	// Stop tracking library paths
			menu.newSeparator(menuName);
			menu.newEntry({
				menuName, entryText: 'Don\'t track library (until next startup)', func: () => {
					list.switchTracking(void (0), true);
				}
			});
			menu.newCheckMenuLast(() => !list.bTracking);
		}
	}
	{	// Playlists behavior
		const menuName = menu.newMenu('Playlists behavior');
		if (!list.bLiteMode) {
			{	// UUID
				const subMenuName = menu.newMenu('Use UUIDs for playlist names', menuName);
				const options = list.optionsUUID();
				const optionsLength = options.length;
				menu.newEntry({ menuName: subMenuName, entryText: 'For playlists tracked by Manager:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				options.forEach((item, i) => {
					menu.newEntry({
						menuName: subMenuName, entryText: item, func: () => {
							list.optionUUID = item;
							list.properties['optionUUID'][1] = list.optionUUID;
							list.bUseUUID = i !== (optionsLength - 1);
							list.properties['bUseUUID'][1] = list.bUseUUID;
							overwriteProperties(list.properties);
							list.updateAllUUID();
						}, flags: (i !== optionsLength - 1 && list.properties['extension'][1] === '.pls') ? MF_GRAYED : MF_STRING
					}); // Disable UUID for .pls playlists
				});
				menu.newCheckMenuLast(() => options.indexOf(list.optionUUID), optionsLength);
			}
			{	// Automatic playlist names
				const subMenuName = menu.newMenu('Automatic playlist names', menuName);
				const options = ['Yes: use ARTIST[ - ALBUM]', 'No: use source as name'];
				const optionsLength = options.length;
				menu.newEntry({ menuName: subMenuName, entryText: 'For playlists created from selection:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				options.forEach((item, i) => {
					menu.newEntry({
						menuName: subMenuName, entryText: item, func: () => {
							list.properties.bAutoSelTitle[1] = i === 0;
							overwriteProperties(list.properties);
						}
					});
				});
				menu.newCheckMenuLast(() => (list.properties.bAutoSelTitle[1] ? 0 : 1), optionsLength);
			}
			menu.newSeparator(menuName);
		}
		{	// Playlist Size
			const subMenuName = menu.newMenu('Update AutoPlaylists', menuName);
			const options = ['Yes: Automatically on every startup', 'No: Only when loading them'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Refresh metadata:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.properties['bUpdateAutoPlaylist'][1] = i === 0; // True will force a refresh on script loading
						overwriteProperties(list.properties);
						if (list.properties['bUpdateAutoPlaylist'][1]) {
							fb.ShowPopupMessage('Enabling this option will also load -internally- all queries from AutoPlaylists at startup to retrieve their tag count.(*)(**)\n\nIt\'s done asynchronously so it should not take more time to load the script at startup as consequence.\n\n(*) Note enabling this option will not incur on additional processing if you already enabled Tracks Auto-tagging on startup for AutoPlaylists.\n(**) For the same reasons, AutoPlaylists which perform tagging will always get their size updated no matter what this setting.', window.Name + _ps(window.ScriptInfo.Name));
						}
					}
				});
			});
			//list.bUpdateAutoPlaylist changes to false after firing, but the property is constant unless the user changes it...
			menu.newCheckMenuLast(() => (list.properties['bUpdateAutoPlaylist'][1] ? 0 : 1), optionsLength);
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Block panel while updating', func: () => {
					list.properties.bBlockUpdateAutoPls[1] = !list.properties.bBlockUpdateAutoPls[1];
					overwriteProperties(list.properties);
				}, flags: list.properties['bUpdateAutoPlaylist'][1] ? MF_STRING : MF_GRAYED
			});
			menu.newCheckMenuLast(() => list.properties.bBlockUpdateAutoPls[1]);
		}
		if (!list.bLiteMode) {	// Smart Playlists
			const subMenuName = menu.newMenu('Update Smart Playlists', menuName);
			const options = ['Yes: Automatically on source(s) changes', 'No: Only when loading them'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Refresh tracks and metadata:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bAutoRefreshXsp = list.properties['bAutoRefreshXsp'][1] = i === 0;
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => (list.properties['bAutoRefreshXsp'][1] ? 0 : 1), optionsLength);
		}
		if (!list.bLiteMode) {	// Other Playlists
			const subMenuName = menu.newMenu('Update other Playlists', menuName);
			const options = ['Yes: Automatically on startup', 'No: Only when loading them'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Refresh metadata for files:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			const bForced = list.requiresCachePlaylistSearch() && !list.bForceCachePls;
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bForceCachePls = list.properties['bForceCachePls'][1] = i === 0;
						overwriteProperties(list.properties);
					}, flags: bForced ? MF_GRAYED : MF_STRING
				});
			});
			menu.newCheckMenuLast(() => (list.properties['bForceCachePls'][1] || bForced ? 0 : 1), optionsLength);
			if (bForced) {
				menu.newSeparator(subMenuName);
				menu.newEntry({ menuName: subMenuName, entryText: 'Note: forced by search settings', flags: MF_GRAYED });
			}
		}
		{	// AutoPlaylist / Smart Playlists loading duplicates
			const subMenuName = menu.newMenu('Duplicates filter', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Removes duplicates after loading:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'On AutoPlaylist cloning', func: () => {
					list.bRemoveDuplicatesAutoPls = !list.bRemoveDuplicatesAutoPls;
					list.properties.bRemoveDuplicatesAutoPls[1] = list.bRemoveDuplicatesAutoPls;
					overwriteProperties(list.properties);
				}
			});
			menu.newCheckMenuLast(() => list.bRemoveDuplicatesAutoPls);
			if (!list.bLiteMode) {
				menu.newEntry({
					menuName: subMenuName, entryText: 'On Smart Playlist loading & cloning', func: () => {
						list.bRemoveDuplicatesSmartPls = !list.bRemoveDuplicatesSmartPls;
						list.properties.bRemoveDuplicatesSmartPls[1] = list.bRemoveDuplicatesSmartPls;
						overwriteProperties(list.properties);
					}
				});
				menu.newCheckMenuLast(() => list.bRemoveDuplicatesSmartPls);
			}
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Use RegExp for title matching', func: () => {
					list.bAdvTitle = !list.bAdvTitle;
					list.properties.bAdvTitle[1] = list.bAdvTitle;
					fb.ShowPopupMessage(globRegExp.title.desc, 'Playlist Manager');
					overwriteProperties(list.properties);
				}
			});
			menu.newCheckMenuLast(() => list.bAdvTitle);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Partial multi-value tag matching', func: () => {
					list.bMultiple = !list.bMultiple;
					list.properties.bMultiple[1] = list.bMultiple;
					fb.ShowPopupMessage(
						'When this option is enabled, multi-value tags are parsed independently and a track may be considered a duplicate if at least one of those values match (instead of requiring all to match in the same order).\n\nSo for \'[ARTIST, DATE, TITLE]\' tags, these are duplicates with this option enabled:\n' +
						'\nJimi Hendrix - 1969 - Blabla' +
						'\nJimi Hendrix experience, Jimi Hendrix - 1969 - Blabla' +
						'\nBand of Gypsys, Jimi Hendrix - 1969 - Blabla' +
						'\n\nWith multi-value parsing disabled, these are considered non-duplicated tracks since not all artists match.',
						'Playlist Manager'
					);
				}
			});
			menu.newCheckMenuLast(() => list.bMultiple);
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Configure Tags or TF expression...', func: () => {
					const input = Input.json(
						'array strings',
						list.removeDuplicatesAutoPls,
						'Enter tag(s) or TF expression(s):\n(JSON)',
						window.Name + _ps(window.ScriptInfo.Name),
						'["$ascii($lower($trim(%TITLE%)))","ARTIST","$year(%DATE%)"]',
						void (0),
						true
					);
					if (input === null) { return; }
					list.removeDuplicatesAutoPls = input;
					list.properties.removeDuplicatesAutoPls[1] = JSON.stringify(list.removeDuplicatesAutoPls);
					overwriteProperties(list.properties);
				}
			});
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Restore defaults...', func: () => {
					list.bRemoveDuplicatesAutoPls = list.properties.bRemoveDuplicatesAutoPls[3];
					list.properties.bRemoveDuplicatesAutoPls[1] = list.bRemoveDuplicatesAutoPls;
					list.bRemoveDuplicatesSmartPls = list.properties.bRemoveDuplicatesSmartPls[3];
					list.properties.bRemoveDuplicatesSmartPls[1] = list.bRemoveDuplicatesSmartPls;
					list.bAdvTitle = list.properties.bAdvTitle[3];
					list.properties.bAdvTitle[1] = list.bAdvTitle;
					list.removeDuplicatesAutoPls = JSON.parse(list.properties.removeDuplicatesAutoPls[3]);
					list.properties.removeDuplicatesAutoPls[1] = JSON.stringify(list.removeDuplicatesAutoPls);
					overwriteProperties(list.properties);
				}
			});
		}
		if (!list.bLiteMode) {	// XSPF playlists
			menu.newSeparator(menuName);
			{
				const subMenuName = menu.newMenu('XSPF playlists', menuName);
				const subMenuNameTwo = menu.newMenu('Non-tracked files on library', subMenuName);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Load them if found on disk', func: () => {
						list.xspfRules.bLoadNotTrackedItems = !list.xspfRules.bLoadNotTrackedItems;
						list.properties['xspfRules'][1] = JSON.stringify(list.xspfRules);
						overwriteProperties(list.properties);
						if (list.xspfRules.bLoadNotTrackedItems) {
							fb.ShowPopupMessage('Non-tracked files on library are omitted by default. Enabling this setting, it will try to load the files if they exist outside the library (breaking the XSPF specs).', window.Name + _ps(window.ScriptInfo.Name));
						}
					}
				});
				menu.newCheckMenuLast(() => list.xspfRules.bLoadNotTrackedItems);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Use foo_xspf_1 component', func: () => {
						list.xspfRules.bFallbackComponentXSPF = !list.xspfRules.bFallbackComponentXSPF;
						list.properties['xspfRules'][1] = JSON.stringify(list.xspfRules);
						overwriteProperties(list.properties);
						if (list.xspfRules.bFallbackComponentXSPF) {
							fb.ShowPopupMessage('Additional support for non-tracked files with subsongs (.cue, .iso, etc.) can be added by installing foo_xspf_1 (*) and using appropriate settings (**). For files with subsongs which are tracked on library, it is not needed.\n\nEnabling this setting, it will try to load the files if they exist outside the library using the component as fallback (breaking the XSPF specs).\n\n\n(*) https://github.com/Chocobo1/foo_xspf_1\n(**)https://github.com/Chocobo1/foo_xspf_1/issues/1#issuecomment-176006843', window.Name + _ps(window.ScriptInfo.Name));
						}
					}, flags: list.xspfRules.bLoadNotTrackedItems ? MF_STRING : MF_GRAYED
				});
				menu.newCheckMenuLast(() => list.xspfRules.bFallbackComponentXSPF && list.xspfRules.bLoadNotTrackedItems);
			}
			{
				const subMenuName = menu.newMenu('FPL playlists', menuName);
				{
					const bSupported = writablePlaylistFormats.has('.fpl');
					const subMenuNameTwo = menu.newMenu('Non-library files', subMenuName);
					if (!bSupported) {
						menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Newer SMP required', flags: MF_GRAYED });
						menu.newSeparator(subMenuNameTwo);
					}
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'Yes: full support', func: () => {
							list.fplRules.bNonTrackedSupport = true;
							list.properties['fplRules'][1] = JSON.stringify(list.fplRules);
							overwriteProperties(list.properties);
							fb.ShowPopupMessage('Non-library files will be fully supported with a performance penalty. Additionally, tracks will be asynchronous loaded in some cases (affecting some checks).\n\nWARNING: This feature currently works for actions related to sending selections, playlist maintenance tools and playlist cloning. It doesn\'t work for search or playlist exporting.', window.Name + _ps(window.ScriptInfo.Name));
						}, flags: bSupported ? MF_STRING : MF_GRAYED
					});
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'No: only library items', func: () => {
							list.fplRules.bNonTrackedSupport = false;
							list.properties['fplRules'][1] = JSON.stringify(list.fplRules);
							overwriteProperties(list.properties);
							fb.ShowPopupMessage('Non-library files will be omitted when internally processing .fpl playlists on actions like searching or sending selection to playlists. This will improve performance a bit.\n\nNote: playlist loading always support non-library files anyway.', window.Name + _ps(window.ScriptInfo.Name));
						}, flags: bSupported ? MF_STRING : MF_GRAYED
					});
					if (bSupported) { menu.newCheckMenuLast(() => list.fplRules.bNonTrackedSupport ? 0 : 1, 2); }
				}
				{
					menu.newEntry({
						menuName: subMenuName, entryText: 'Lock playlist on load', func: () => {
							list.fplRules.bLockOnLoad = !list.fplRules.bLockOnLoad;
							list.properties['fplRules'][1] = JSON.stringify(list.fplRules);
							overwriteProperties(list.properties);
							if (list.fplRules.bLockOnLoad) {
								fb.ShowPopupMessage('.fpl playlists loaded will be automatically locked to avoid unwanted changes or conversion to other formats.', window.Name + _ps(window.ScriptInfo.Name));
							}
						}
					});
					menu.newCheckMenuLast(() => list.fplRules.bLockOnLoad);
				}
			}
		}
		if (showMenus['Tags'] || showMenus['Folders']) { menu.newSeparator(menuName); }
		if (showMenus['Tags']) {	// Playlist AutoTags & Actions
			const subMenuName = menu.newMenu('Playlist AutoTags and actions', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Playlist file\'s Tags related actions:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			{
				const subMenuNameTwo = menu.newMenu('Automatically tag playlists', subMenuName);
				menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Set tags to add:', flags: MF_GRAYED });
				menu.newSeparator(subMenuNameTwo);
				const options = ['bAutoLoad', 'bAutoLock', 'bMultMenu', 'bSkipMenu'];
				options.forEach((item) => {
					const itemKey = item + 'Tag';
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: item, func: () => {
							list[itemKey] = !list[itemKey];
							list.properties[itemKey][1] = list[itemKey];
							overwriteProperties(list.properties);
						}
					});
					menu.newCheckMenuLast(() => list[itemKey]);
				});
				menu.newSeparator(subMenuNameTwo);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Custom tag...', func: () => {
						const tag = Input.string('trimmed string', options.join(','), 'Enter tag(s) to be added to playlists on load:\nLeave it blank to deactivate auto-tagging.\n(sep by comma)', window.Name + _ps(window.ScriptInfo.Name), 'summer,top');
						if (tag === null) { return; }
						list.bAutoCustomTag = !!tag.length;
						list.properties.bAutoCustomTag[1] = list.bAutoCustomTag;
						list.autoCustomTag = tag.split(',');
						list.properties.autoCustomTag[1] = tag;
						overwriteProperties(list.properties);
					}
				});
				menu.newCheckMenuLast(() => list.bAutoCustomTag);
			}
			{
				const subMenuNameTwo = menu.newMenu('Enable tag-based actions', subMenuName);
				const options = ['Yes: At playlist loading', 'No: Ignore them'];
				const optionsLength = options.length;
				options.forEach((item, i) => {
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: item, func: () => {
							list.bApplyAutoTags = (i === 0);
							list.properties.bApplyAutoTags[1] = list.bApplyAutoTags;
							overwriteProperties(list.properties);
							fb.ShowPopupMessage('To see the list of special tags and their associated actions check the documentation' + list.getGlobalShortcut('documentation', { bTab: false, bParen: true }) + ' or quick help' + list.getGlobalShortcut('quick help', { bTab: false, bParen: true }) + '.\n\nNote in the case of \'bMultMenu\' and \'bSkipMenu\', actions are always applied at dynamic menu usage (the former) and creation (the latter).', window.Name + _ps(window.ScriptInfo.Name));
							if (list.data.some((pls) => pls.tags.includes('bPinnedFirst') || pls.tags.includes('bPinnedLast'))) {
								list.sort();
							}
						}
					});
				});
				menu.newCheckMenuLast(() => (list.bApplyAutoTags ? 0 : 1), optionsLength);
			}
		}
		if (showMenus['Tags']) {	// Tracks AutoTags
			const subMenuName = menu.newMenu('Tracks AutoTags and actions', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Track\'s Tags related actions:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			{
				const subMenuNameTwo = menu.newMenu('Automatically tag added tracks on', subMenuName);
				menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Switch for different playlist types:', flags: MF_GRAYED });
				menu.newSeparator(subMenuNameTwo);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Standard playlists', func: () => {
						if (!list.bAutoTrackTagPls) { fb.ShowPopupMessage('Tracks added to non-locked playlist will be automatically tagged.', window.Name + _ps(window.ScriptInfo.Name)); }
						list.bAutoTrackTagPls = !list.bAutoTrackTagPls;
						list.properties['bAutoTrackTagPls'][1] = list.bAutoTrackTagPls;
						overwriteProperties(list.properties);
					}, flags: list.bAutoTrackTag ? MF_STRING : MF_GRAYED
				});
				menu.newCheckMenuLast(() => list.bAutoTrackTagPls);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Locked playlists', func: () => {
						if (!list.bAutoTrackTagLockPls) { fb.ShowPopupMessage('Changes on playlist will not be (automatically) saved to the playlist file since it will be locked, but tracks added to it (on foobar2000) will be automatically tagged.\n\nEnabling this option may allow to use a playlist only for tagging purposes (for ex. native playlists), not caring at all about saving the changes to the associated files.', window.Name + _ps(window.ScriptInfo.Name)); }
						list.bAutoTrackTagLockPls = !list.bAutoTrackTagLockPls;
						list.properties['bAutoTrackTagLockPls'][1] = list.bAutoTrackTagLockPls;
						overwriteProperties(list.properties);
					}, flags: list.bAutoTrackTag ? MF_STRING : MF_GRAYED
				});
				menu.newCheckMenuLast(() => list.bAutoTrackTagLockPls);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'AutoPlaylists', func: () => {
						if (!list.bAutoTrackTagAutoPls) { fb.ShowPopupMessage('Enabling this option will automatically tag all tracks retrieved by the AutoPlaylists\' queries.\n\nNote AutoPlaylists only load the tracks when they are loaded within foobar2000, therefore tagging only happens at that point. AutoPlaylists in the Playlist Manager but not loaded within foobar2000 are omitted.\n\nAlternatively, using the manual refresh menu entry will force AutoPlaylists tagging (and size updating) on all of them.\n\nIt may allow to automatically tag tracks according to some query or other tags (for ex. adding a tag \'Instrumental\' to all \'Jazz\' tracks automatically).\n\nUsing it in a creative way, AutoPlaylists may be used as pools which send tracks to other AutoPlaylists. For ex:\n- AutoPlaylist (A) which tags all \'Surf Rock\' or \'Beat Music\' tracks with \'Summer\'.\n- AutoPlaylist (B) which tags all tracks with from 2021 and rating 4 with \'Summer\'.\n- AutoPlaylist (C) filled with all tracks with a \'playlist\' tag equal to \'Summer\'. As result, this playlist will be filled with tracks from (A) and (C).', window.Name + _ps(window.ScriptInfo.Name)); }
						list.bAutoTrackTagAutoPls = !list.bAutoTrackTagAutoPls;
						list.properties['bAutoTrackTagAutoPls'][1] = list.bAutoTrackTagAutoPls;
						overwriteProperties(list.properties);
					}, flags: list.bAutoTrackTag ? MF_STRING : MF_GRAYED
				});
				menu.newCheckMenuLast(() => list.bAutoTrackTagAutoPls);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'AutoPlaylists (at startup)', func: () => {
						if (!list.bAutoTrackTagAutoPlsInit) { fb.ShowPopupMessage('Enabling this option will also load -internally- all queries from AutoPlaylists at startup to tag their tracks (*)(**)(***).\n\nThis bypasses the natural limit of tagging only applying to loaded AutoPlaylists within foobar2000; it\'s done asynchronously so it should not take more time to load the script at startup as consequence.\n\n(*) Only those with tagging set, the rest are not loaded to optimize processing time.\n(**) Note enabling this option will not incur on additional processing if you already set AutoPlaylists size updating on startup too (both will be done asynchronously).\n(***) For the same reasons, AutoPlaylists which perform tagging will always get their size updated no matter what the \'Update AutoPlaylists size...\' setting is.', window.Name + _ps(window.ScriptInfo.Name)); }
						list.bAutoTrackTagAutoPlsInit = !list.bAutoTrackTagAutoPlsInit;
						list.properties['bAutoTrackTagAutoPlsInit'][1] = list.bAutoTrackTagAutoPlsInit;
						overwriteProperties(list.properties);
					}, flags: list.bAutoTrackTag && list.bAutoTrackTagAutoPls ? MF_STRING : MF_GRAYED
				});
				menu.newCheckMenuLast(() => list.bAutoTrackTagAutoPlsInit);
				menu.newSeparator(subMenuNameTwo);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Block panel while updating (at startup)?', func: () => {
						list.properties.bBlockUpdateAutoPls[1] = !list.properties.bBlockUpdateAutoPls[1];
						overwriteProperties(list.properties);
					}, flags: list.bAutoTrackTagAutoPlsInit ? MF_STRING : MF_GRAYED
				});
				menu.newCheckMenuLast(() => list.properties.bBlockUpdateAutoPls[1]);
			}
			{
				const subMenuNameTwo = menu.newMenu('Enable auto-tagging', subMenuName);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'When saving and loading pls', func: () => {
						if (!list.bAutoTrackTag) { fb.ShowPopupMessage('Enables or disables the feature globally (all other options require this one to be switched on).\n\nEnabling this will automatically tag tracks added to playlist according to their set \'Track Tags\'. By default new playlist have none assigned, they must be configured per playlist (*).\n\nAutotagging is done while autosaving, on manual load (AutoPlaylists) and/or save. Also on manual refresh (AutoPlaylists).\n\n(*) Use contextual menu.', window.Name + _ps(window.ScriptInfo.Name)); }
						list.bAutoTrackTag = !list.bAutoTrackTag;
						list.properties['bAutoTrackTag'][1] = list.bAutoTrackTag;
						overwriteProperties(list.properties);
					}
				});
				menu.newCheckMenuLast(() => list.bAutoTrackTag);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Also adding tracks without autosave', func: () => {
						if (!list.bAutoTrackTagAlways) { fb.ShowPopupMessage('Auto-tagging is usually done at autosaving step. If autosave is disabled, playlist files will not reflect the changes done within foobar2000 and by default auto-tagging is skipped in that case.\n\nEnabling this option will make the changes to track\'s tags even if automatic playlist saving is disabled.', window.Name + _ps(window.ScriptInfo.Name)); }
						list.bAutoTrackTagAlways = !list.bAutoTrackTagAlways;
						list.properties['bAutoTrackTagAlways'][1] = list.bAutoTrackTagAlways;
						overwriteProperties(list.properties);
					}, flags: list.bAutoTrackTag ? MF_STRING : MF_GRAYED
				});
				menu.newCheckMenuLast(() => list.bAutoTrackTagAlways);
			}
		}
		if (showMenus['Folders']) {	// Folder destination
			{
				const subMenuName = menu.newMenu('Auto-add playlists to folder', menuName);
				menu.newEntry({ menuName: subMenuName, entryText: 'Set destination of new playlists:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				const options = [
					list.bAllPls ? { name: 'External UI-only playlists', rule: 'externalUi' } : null,
					list.bAllPls ? { name: 'UI-only playlists from panel', rule: 'internalUi' } : null,
					{ name: 'Any playlist from selection', rule: 'plsFromSel' },
					{ name: 'Any other case', rule: 'others' }
				].filter(Boolean);
				options.forEach((opt) => {
					const folder = list.folderRules[opt.rule];
					menu.newEntry({
						menuName: subMenuName, entryText: opt.name + (folder.length ? '\t' + _p(folder) : ''), func: () => {
							const input = Input.string(
								'string',
								folder,
								'Set destination folder:\n(if it does not exist, a new one will be created)',
								window.Name + _ps(window.ScriptInfo.Name),
								'My new playlists'
							);
							if (input === null) { return; }
							list.folderRules[opt.rule] = input;
							list.properties['folderRules'][1] = JSON.stringify(list.folderRules);
							overwriteProperties(list.properties);
						}
					});
					menu.newCheckMenuLast(() => !!list.folderRules[opt.rule].length);
				});
			}
		}
		{	// File deletion
			menu.newSeparator(menuName);
			{
				const subMenuName = menu.newMenu('Playlist deletion', menuName);
				menu.newEntry({ menuName: subMenuName, entryText: 'Bound UI-only playlist:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				const options = [
					'Always ask with popups',
					'Delete both (file and bound playlist)',
					'Only delete the playlist file'
				];
				options.forEach((entryText, i) => {
					menu.newEntry({
						menuName: subMenuName, entryText, func: () => {
							list.properties['deleteBehavior'][1] = i;
							overwriteProperties(list.properties);
						}
					});
				});
				menu.newCheckMenuLast(() => list.properties['deleteBehavior'][1], options.length);
			}
		}
	}
	menu.newSeparator();
	{	// Export/Import settings
		const menuName = menu.newMenu('File import/export');
		if (!list.bLiteMode) {	// Export and Converter settings
			menu.newSeparator(menuName);
			{	// Export and copy
				const subMenuName = menu.newMenu('Export and copy', menuName);
				menu.newEntry({ menuName: subMenuName, entryText: 'Configuration of copy tools:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				menu.newEntry({
					menuName: subMenuName, entryText: 'Copy files asynchronously (on background)', func: () => {
						list.properties['bCopyAsync'][1] = !list.properties['bCopyAsync'][1];
						overwriteProperties(list.properties);
					}
				});
				menu.newCheckMenuLast(() => list.properties['bCopyAsync'][1]);
			}
			{	// Export and convert
				const subMenuName = menu.newMenu('Export and convert', menuName);
				menu.newEntry({ menuName: subMenuName, entryText: 'Configuration of exporting presets:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				const presets = JSON.parse(list.properties.converterPreset[1]);
				presets.forEach((preset, i) => {
					const path = preset.path || '';
					const playlistOutPath = preset.playlistOutPath || '';
					let pathName = playlistOutPath.length
						? '(Fixed folder)'
						: path.length
							? '(' + path.split('\\')[0] + '\\) ' + path.split('\\').slice(-2, -1)
							: '(Folder)';
					const dsp = preset.dsp;
					let dspName = (dsp !== '...' ? dsp : '(DSP)');
					let tfName = Object.hasOwn(preset, 'name') && preset.name.length ? preset.name : preset.tf;
					const extension = Object.hasOwn(preset, 'extension') && preset.extension.length ? preset.extension : '';
					const extensionName = extension.length ? '[' + extension + ']' : '';
					pathName = pathName.cut(20);
					dspName = dspName.cut(20);
					tfName = tfName.cut(35);
					const subMenuNameTwo = menu.newMenu('Preset ' + (i + 1) + ': ' + pathName + extensionName + ': ' + dspName + ' ---> ' + tfName, subMenuName);
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'Set default export folder...', func: () => {
							const input = Input.string('path', preset.path, 'Enter output path:\n(At execution, the playlist name and extension will be appended and suggested as output)\n\nIf left empty, the default folder for the panel will be used instead.', window.Name + _ps(window.ScriptInfo.Name), '');
							if (input === null) { return; }
							preset.path = input;
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
						}
					});
					menu.newCheckMenuLast(() => !!preset.path.length);
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'Set fixed export path...', func: () => {
							const input = Input.string('file', playlistOutPath, 'Enter output path:\n(Left it empty to set output at execution)\n\n#EXPORT#, #PLAYLIST#, #EXT# and #PLAYLISTEXT# may also be used as placeholders for the default playlist export folder, playlist name, extension or name + extension.', window.Name + _ps(window.ScriptInfo.Name), '');
							if (input === null) { return; }
							preset.playlistOutPath = input;
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
						}
					});
					menu.newCheckMenuLast(() => !!playlistOutPath.length);
					{
						const subMenuNameThree = menu.newMenu('Set playlist format', subMenuNameTwo);
						const options = ['', ...writablePlaylistFormats];
						options.forEach((extension) => {
							menu.newEntry({
								menuName: subMenuNameThree, entryText: extension.length ? extension : '(original)', func: () => {
									if (extension !== preset.extension) {
										preset.extension = extension;
										list.properties['converterPreset'][1] = JSON.stringify(presets);
										overwriteProperties(list.properties);
										if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
									}
								}
							});
						});
						menu.newCheckMenuLast(() => options.indexOf(preset.extension || ''), options.length);
						if (extension === '.m3u8' || extension === '.m3u') {
							const bExtendedM3U = Object.hasOwn(preset, 'bExtendedM3U') ? preset.bExtendedM3U : true;
							menu.newSeparator(subMenuNameThree);
							menu.newEntry({
								menuName: subMenuNameThree, entryText: 'Extended M3U', func: () => {
									preset.bExtendedM3U = !bExtendedM3U;
									list.properties['converterPreset'][1] = JSON.stringify(presets);
									overwriteProperties(list.properties);
									if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
								}
							});
							menu.newCheckMenuLast(() => bExtendedM3U);
						}
					}
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'Set DSP preset...', func: () => {
							let input = Input.string('string', preset.dsp, 'Enter DSP preset name:\n(empty or ... will show converter window)', window.Name + _ps(window.ScriptInfo.Name), 'my preset');
							if (input === null) { return; }
							if (!input.length) { input = '...'; }
							if (input !== preset.dsp) {
								preset.dsp = input;
								list.properties['converterPreset'][1] = JSON.stringify(presets);
								overwriteProperties(list.properties);
								if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
							}
						}
					});
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'Set track filename expression...', func: () => {
							const input = Input.string('string', preset.tf, 'Enter TF expression:\n(it should match the one at the converter preset)', window.Name + _ps(window.ScriptInfo.Name), '.\\%FILENAME%.mp3', void (0), true);
							if (input === null) { return; }
							preset.tf = input;
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
						}
					});
					menu.newSeparator(subMenuNameTwo);
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'Set preset name...', func: () => {
							const input = Input.string('string', Object.hasOwn(preset, 'name') ? preset.name : '', 'Enter preset name:\n(Left it empty to use TF expression instead)', window.Name + _ps(window.ScriptInfo.Name), '-- Kodi --');
							if (input === null) { return; }
							preset.name = input;
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
						}
					});
					menu.newSeparator(subMenuNameTwo);
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'Clone preset...', func: () => {
							const clone = { ...preset };
							const input = Input.string('string', Object.hasOwn(clone, 'name') ? clone.name : '', 'Enter new preset name:\n(Left it empty to use TF expression instead)', window.Name + _ps(window.ScriptInfo.Name), '-- Kodi --');
							if (input === null) {
								if (!Input.isLastEqual) { return; }
							} else { clone.name = input; }
							presets.push(clone);
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
						}
					});
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'Move preset...', func: () => {
							const input = Input.number('int positive', i + 1, 'Enter new position:\n(from 1 to ' + presets.length + ')', window.Name + _ps(window.ScriptInfo.Name), '3');
							if (input === null) { return; }
							presets.splice(i, 1);
							presets.splice(input - 1, 0, preset);
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
						}
					});
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: 'Remove preset', func: () => {
							presets.splice(i, 1);
							list.properties['converterPreset'][1] = JSON.stringify(presets);
							overwriteProperties(list.properties);
							if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
						}
					});
				});
				menu.newSeparator(subMenuName);
				menu.newEntry({
					menuName: subMenuName, entryText: 'Add new preset...', func: () => {
						presets.push({ dsp: '...', tf: '.\\%filename%.mp3', path: '' });
						list.properties['converterPreset'][1] = JSON.stringify(presets);
						overwriteProperties(list.properties);
						if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
					}
				});
				menu.newSeparator(subMenuName);
				menu.newEntry({
					menuName: subMenuName, entryText: 'Restore defaults', func: () => {
						list.properties['converterPreset'][1] = list.defaultProperties['converterPreset'][3];
						overwriteProperties(list.properties);
						if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
					}
				});
			}
		}
		{	// Import from file
			menu.newSeparator(menuName);
			{
				const subMenuName = menu.newMenu('Import from file \\ url', menuName);
				menu.newEntry({ menuName: subMenuName, entryText: 'Configuration of import tool:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				menu.newEntry({
					menuName: subMenuName, entryText: 'Configure query filters...', func: () => {
						let input = Input.json(
							'array strings',
							JSON.parse(list.properties.importPlaylistFilters[1]),
							'Enter array of queries to apply as consecutive conditions:\n\n["%CHANNELS% LESS 3", "' + globTags.rating + ' GREATER 2"]\n\nThe example would try to find matches with 2 or less channels, then filter those results with rating > 2. In case the later filter does not output at least a single track, then will be skipped and only the previous filter applied (channels)... and so on (for more filters).',
							window.Name + _ps(window.ScriptInfo.Name),
							JSON.parse(list.properties.importPlaylistFilters[3]),
							void (0), true
						);
						if (input === null) { return; }
						list.properties.importPlaylistFilters[1] = JSON.stringify(input);
						overwriteProperties(list.properties);
					}
				});
			}
		}
	}
	menu.newSeparator();
	{	// UI
		const menuName = menu.newMenu('Panel UI');
		{	// Playlist Size
			const subMenuName = menu.newMenu('Show Playlist size', menuName);
			const options = ['Yes: Shown along the playlist name', 'No: Only shown on tooltip/columns'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Track count on parenthesis:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bShowSize = (i === 0);
						list.properties['bShowSize'][1] = list.bShowSize;
						overwriteProperties(list.properties);
					}
				});
			});
			//list.bUpdateAutoPlaylist changes to false after firing, but the property is constant unless the user changes it...
			menu.newCheckMenuLast(() => (list.bShowSize ? 0 : 1), optionsLength);
		}
		{	// Name/category sep
			const subMenuName = menu.newMenu('Show name/category separators', menuName);
			const options = ['Yes: Dotted line and initials', 'No: Only shown on tooltip'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'When sorting by name/category:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bShowSep = (i === 0);
						list.properties['bShowSep'][1] = list.bShowSep;
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => (list.bShowSep ? 0 : 1), optionsLength);
		}
		{	// Playlist icons
			const subMenuName = menu.newMenu('Set playlist icons', menuName);
			const options = ['Yes: icons + playlist name', 'No: only playlist name'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Show playlist icons:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bShowIcons = (i === 0);
						list.properties['bShowIcons'][1] = list.bShowIcons;
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => (list.bShowIcons ? 0 : 1), optionsLength);
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Personalize playlist icons...', func: () => {
					let input;
					try { input = utils.InputBox(window.ID, 'Edit Unicode values: {".ext": {"icon": "fxxx", "iconBg": "fxxx"}, ...}\n\nNull will disable the icon or background. Look for values at:\ngithub.com/regorxxx/foobar2000-assets/blob/main/Fonts/FA_4_7_0.pdf\n\nExample: {".m3u8":{"icon":"f15c","iconBg":null}}', window.Name + _ps(window.ScriptInfo.Name), list.properties['playlistIcons'][1], true); }
					catch (e) { return; } // eslint-disable-line no-unused-vars
					if (!input.length) { input = '{}'; }
					if (input === list.properties['playlistIcons'][1]) { return; }
					try { JSON.parse(input); } catch (e) { return; } // eslint-disable-line no-unused-vars
					list.playlistIcons = JSON.parse(input);
					list.properties['playlistIcons'][1] = input;
					overwriteProperties(list.properties);
					list.updatePlaylistIcons();
					list.repaint();
				}
			});
		}
		{	// Playlist status
			const subMenuName = menu.newMenu('Show playlist status', menuName);
			const options = Object.keys(list.statusIcons);
			menu.newEntry({ menuName: subMenuName, entryText: 'Icons at right:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((key) => {
				menu.newEntry({
					menuName: subMenuName, entryText: capitalize(key) + ' playlist', func: () => {
						list.statusIcons[key].enabled = !list.statusIcons[key].enabled;
						list.properties['statusIcons'][1] = JSON.stringify(list.statusIcons);
						overwriteProperties(list.properties);
					}
				});
				menu.newCheckMenuLast(() => list.statusIcons[key].enabled);
			});
		}
		menu.newSeparator(menuName);
		{	// Playlist header menu
			const subMenuName = menu.newMenu('Show playlist header on menus', menuName);
			const options = ['Yes: Show playlist format and name', 'No: Only the contextual menu'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'On playlist contextual menu:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.bShowMenuHeader = (i === 0);
						list.properties['bShowMenuHeader'][1] = list.bShowMenuHeader;
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => (list.bShowMenuHeader ? 0 : 1), optionsLength);
		}
		menu.newSeparator(menuName);
		{	// Font size
			const subMenuName = menu.newMenu('Font size', menuName);
			if (panel.listObjects.length || panel.textObjects.length) {
				menu.newEntry({ menuName: subMenuName, entryText: 'Global font:', flags: MF_GRAYED });
				menu.newSeparator(subMenuName);
				const options = [...panel.fonts.sizes, 'sep', 'Custom...\t' + _b(panel.fonts.size)];
				const optionsLength = options.length;
				options.forEach((item, index) => {
					if (menu.isSeparator(item)) { return menu.newSeparator(subMenuName); }
					menu.newEntry({
						menuName: subMenuName, entryText: item, func: () => {
							if (index !== optionsLength - 1) {
								if (panel.fonts.size === item) { return; }
								panel.fonts.size = item;
							} else {
								const input = Input.number('int positive', panel.fonts.size, 'Input a number:\n(>= 6)', 'Font size', 13, [(n) => n > 0]);
								if (!input) { return; }
								panel.fonts.size = input;
							}
							panel.properties['fontSize'][1] = panel.fonts.size;
							overwriteProperties(panel.properties);
							panel.fontChanged();
							list.repaint(true);
							scrollBar.resize();
							list.repaint(true);
						}
					});
				});
				menu.newCheckMenuLast((o, len) => {
					let idx = o.indexOf(panel.fonts.size);
					return idx !== -1 ? idx : (len - 1);
				}, options);
				menu.newSeparator(subMenuName);
				menu.newEntry({
					menuName: subMenuName, entryText: 'Bold font', func: () => {
						panel.colors.bBold = !panel.colors.bBold;
						panel.properties.bBold[1] = panel.colors.bBold;
						overwriteProperties(panel.properties);
						list.repaint();
					}
				});
				menu.newCheckMenuLast(() => panel.colors.bBold);
			}
		}
		{	// Font scaling
			const subMenuName = menu.newMenu('Font scaling', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'UI elements scaling:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			[
				{ text: 'Search Input', key: 'inputSize', bEnabled: list.uiElements['Search filter'].enabled },
				{ text: 'Header', key: 'title', bEnabled: !list.uiElements['Search filter'].enabled },
				{ text: 'Top buttons', key: 'headerSize', bEnabled: list.isTopButtonsEnabled() },
				{ text: 'Bottom buttons', key: 'buttons', bEnabled: list.uiElements['Bottom toolbar'].enabled },
				{ text: 'Columns', key: 'small', bEnabled: list.uiElements['Columns'].enabled }
			].forEach((entry) => {
				const subMenuNameTwo = menu.newMenu(entry.text, subMenuName, entry.bEnabled ? MF_STRING : MF_GRAYED);
				if (panel.listObjects.length || panel.textObjects.length) {
					const options = [0.5, 0.75, 1, 1.25, 1.5, 2, 'sep', 'Custom...\t' + _b(panel.fonts.scale[entry.key])];
					const optionsLength = options.length;
					options.forEach((item, index) => {
						if (menu.isSeparator(item)) { return menu.newSeparator(subMenuNameTwo); }
						menu.newEntry({
							menuName: subMenuNameTwo, entryText: item, func: () => {
								if (index !== optionsLength - 1) {
									if (panel.fonts.size === item) { return; }
									panel.fonts.scale[entry.key] = item;
								} else {
									const input = Input.number('real positive', panel.fonts.scale[entry.key], 'Input a number:\n(> 0)\n\nSetting it to 1 will adjust fonts based only on reported DPI.', 'Font scaling', 1, [(n) => n > 0]);
									if (!input) { return; }
									panel.fonts.scale[entry.key] = input;
								}
								panel.properties['fontScale'][1] = JSON.stringify(panel.fonts.scale);
								overwriteProperties(panel.properties);
								panel.fontChanged();
								list.repaint(true);
								scrollBar.resize();
								list.repaint(true);
							}
						});
					});
					menu.newCheckMenuLast((o, len) => {
						let idx = o.indexOf(panel.fonts.scale[entry.key]);
						return idx !== -1 ? idx : (len - 1);
					}, options);
				}
			});
		}
		{	// List colors
			const subMenuName = menu.newMenu('Custom colors', menuName);
			{
				const subMenuNameTwo = menu.newMenu('List items', subMenuName);
				const options = ['Standard playlists...', 'AutoPlaylists...', !list.bLiteMode ? 'Smart playlists...' : null, list.bAllPls ? 'UI-only playlists...' : null, 'Locked Playlists...', 'Selection rectangle...', showMenus['Folders'] ? 'Folders...' : null];
				options.forEach((item, i) => {
					if (!item) { return; }
					let key;
					switch (i) {
						case 0: key = 'standardPlaylist'; break;
						case 1: key = 'autoPlaylist'; break;
						case 2: key = 'smartPlaylist'; break;
						case 3: key = 'uiPlaylist'; break;
						case 4: key = 'lockedPlaylist'; break;
						case 5: key = 'selectedPlaylist'; break;
						case 6: key = 'folder'; break;
					}
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: item + '\t' + _b(getColorName(list.colors[key])), func: () => {
							list.colors[key] = utils.ColourPicker(window.ID, list.colors[key]);
							console.log('Playlist Manager: Selected color ->\n\t Android: ' + list.colors[key] + ' - RGB: ' + Chroma(list.colors[key]).rgb());
							// Update property to save between reloads
							list.properties.listColors[1] = convertObjectToString(list.colors);
							overwriteProperties(list.properties);
							list.checkConfigPostUpdate(list.checkConfig()); // Ensure related settings is set properly
							list.repaint();
						}
					});
				});
				menu.newSeparator(subMenuNameTwo);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Add font shading', func: () => {
						panel.colors.bFontOutline = !panel.colors.bFontOutline;
						panel.properties.bFontOutline[1] = panel.colors.bFontOutline;
						if (panel.colors.bFontOutline) {
							fb.ShowPopupMessage('Adds font shading to improve readability (usually along art background usage).\n\nIt may heavily affect performance on some systems.', window.Name + _ps(window.ScriptInfo.Name));
						}
						overwriteProperties(panel.properties);
						list.repaint();
					}
				});
				menu.newCheckMenuLast(() => panel.colors.bFontOutline);
			}
			{	// Text color
				const subMenuSecondName = menu.newMenu('Standard text', subMenuName);
				const options = [(window.InstanceType ? 'Use default UI setting' : 'Use columns UI setting'), 'Custom'];
				const optionsLength = options.length;
				options.forEach((item, i) => {
					menu.newEntry({
						menuName: subMenuSecondName, entryText: item + (i === 1 ? '\t' + _b(getColorName(panel.colors.customText)) : ''), func: () => {
							panel.colors.bCustomText = i !== 0;
							panel.properties.bCustomText[1] = panel.colors.bCustomText;
							if (panel.colors.bCustomText) {
								panel.colors.customText = utils.ColourPicker(window.ID, panel.colors.customText);
								console.log('Playlist Manager: Selected color ->\n\t Android: ' + panel.colors.customText + ' - RGB: ' + Chroma(panel.colors.customText).rgb());
								panel.properties.customText[1] = panel.colors.customText;
							}
							overwriteProperties(panel.properties);
							panel.colorsChanged();
							list.checkConfigPostUpdate(list.checkConfig({ bResetColors: true })); // Ensure related settings is set properly
							list.repaint();
						}
					});
				});
				menu.newCheckMenuLast(() => (panel.colors.bCustomText ? 1 : 0), optionsLength);
			}
			menu.newSeparator(subMenuName);
			{	// Header toolbar
				const subMenuSecondName = menu.newMenu('Header toolbar', subMenuName);
				const options = ['Use default', 'Custom'];
				const optionsLength = options.length;
				options.forEach((item, i) => {
					menu.newEntry({
						menuName: subMenuSecondName, entryText: item + (panel.properties.headerButtonsColor[1] !== -1 ? '\t' + _b(getColorName(panel.colors.headerButtons)) : ''), func: () => {
							panel.colors.headerButtons = i
								? utils.ColourPicker(window.ID, panel.colors.headerButtons)
								: -1;
							if (i) { console.log('Playlist Manager: Selected color ->\n\t Android: ' + panel.colors.headerButtons + ' - RGB: ' + Chroma(panel.colors.headerButtons).rgb()); }
							panel.properties.headerButtonsColor[1] = panel.colors.headerButtons;
							// Update property to save between reloads
							overwriteProperties(panel.properties);
							panel.colorsChanged();
							list.checkConfigPostUpdate(list.checkConfig({ bResetColors: true })); // Ensure related settings is set properly
							list.repaint();
						}
					});
				});
				menu.newCheckMenuLast(() => (panel.properties.headerButtonsColor[1] === -1 ? 0 : 1), optionsLength);
			}
			if (list.uiElements['Bottom toolbar'].enabled) {
				menu.newSeparator(subMenuName);
				{	// Filter bottom toolbar
					const defaultCol = invert(panel.getColorBackground());
					const subMenuSecondName = menu.newMenu('Bottom toolbar', subMenuName);
					const options = ['Use default', 'Custom'];
					const optionsLength = options.length;
					options.forEach((item, i) => {
						menu.newEntry({
							menuName: subMenuSecondName, entryText: item + (i == 1 && panel.colors.buttonsToolbarColor === defaultCol ? '\t' + _b(getColorName(panel.colors.buttonsToolbarColor)) : ''), func: () => {
								panel.colors.buttonsToolbarColor = i
									? utils.ColourPicker(window.ID, panel.colors.buttonsToolbarColor)
									: defaultCol;
								if (i) { console.log('Playlist Manager: Selected color ->\n\t Android: ' + panel.colors.buttonsToolbarColor + ' - RGB: ' + Chroma(panel.colors.buttonsToolbarColor).rgb()); }
								panel.properties.buttonsToolbarColor[1] = panel.colors.buttonsToolbarColor;
								// Update property to save between reloads
								overwriteProperties(panel.properties);
								panel.colorsChanged();
								list.checkConfigPostUpdate(list.checkConfig({ bResetColors: true })); // Ensure related settings is set properly
								list.repaint();
							}
						});
					});
					menu.newCheckMenuLast(() => (panel.colors.buttonsToolbarColor === defaultCol ? 0 : 1), optionsLength);
					menu.newSeparator(subMenuSecondName);
					menu.newEntry({
						menuName: subMenuSecondName, entryText: 'Set transparency...', func: () => {
							const input = Input.number('int positive', panel.colors.buttonsToolbarTransparency, 'Enter value:\n0 is transparent, 100 is opaque.\n(0 to 100)', window.Name + _ps(window.ScriptInfo.Name), 50);
							if (input === null) { return; }
							panel.properties.buttonsToolbarTransparency[1] = panel.colors.buttonsToolbarTransparency = input;
							// Update property to save between reloads
							overwriteProperties(panel.properties);
							panel.colorsChanged();
							list.checkConfigPostUpdate(list.checkConfig({ bResetColors: true })); // Ensure related settings is set properly
							list.repaint();
						}
					});
				}
				{	// Buttons' Text color
					const defaultCol = panel.colors.bButtonsBackground ? panel.colors.default.buttonsTextColor : invert(panel.getColorBackground());
					const subMenuSecondName = menu.newMenu('Buttons\' text', subMenuName);
					const options = ['Use default', 'Custom'];
					const optionsLength = options.length;
					options.forEach((item, i) => {
						menu.newEntry({
							menuName: subMenuSecondName, entryText: item + (i == 1 && panel.colors.buttonsTextColor === defaultCol ? '\t' + _b(getColorName(panel.colors.buttonsTextColor)) : ''), func: () => {
								panel.colors.buttonsTextColor = i
									? utils.ColourPicker(window.ID, panel.colors.buttonsTextColor)
									: defaultCol;
								if (i) { console.log('Playlist Manager: Selected color ->\n\t Android: ' + panel.colors.buttonsTextColor + ' - RGB: ' + Chroma(panel.colors.buttonsTextColor).rgb()); }
								panel.properties.buttonsTextColor[1] = panel.colors.buttonsTextColor;
								// Update property to save between reloads
								overwriteProperties(panel.properties);
								panel.colorsChanged();
								list.checkConfigPostUpdate(list.checkConfig({ bResetColors: true })); // Ensure related settings is set properly
								list.repaint();
							}
						});
					});
					menu.newCheckMenuLast(() => (panel.colors.buttonsTextColor === defaultCol ? 0 : 1), optionsLength);
				}
			}
			menu.newSeparator(subMenuName);
			{	// Background color
				const defaultButtonsCol = invert(panel.getColorBackground());
				const subMenuSecondName = menu.newMenu('Background', subMenuName);
				if (panel.customBackground) {
					const options = [(window.InstanceType ? 'Use default UI setting' : 'Use columns UI setting'), 'Splitter', 'Custom'];
					const optionsLength = options.length;
					options.forEach((item, i) => {
						menu.newEntry({
							menuName: subMenuSecondName, entryText: item + (i == 2 ? '\t' + _b(getColorName(panel.colors.customBackground)) : ''), func: () => {
								panel.colors.mode = i;
								panel.properties.colorsMode[1] = panel.colors.mode;
								if (panel.colors.mode === 2) {
									panel.colors.customBackground = utils.ColourPicker(window.ID, panel.colors.customBackground);
									console.log('Playlist Manager: Selected color ->\n\t Android: ' + panel.colors.customBackground + ' - RGB: ' + Chroma(panel.colors.customBackground).rgb());
									panel.properties.customBackground[1] = panel.colors.customBackground;
								}
								overwriteProperties(panel.properties);
								panel.colorsChanged();
								list.checkConfigPostUpdate(list.checkConfig({ bResetColors: true })); // Ensure related settings is set properly
								// Set defaults again
								if (panel.setDefault({ oldColor: defaultButtonsCol })) { overwriteProperties(panel.properties); }
								list.repaint();
							}
						});
					});
					menu.newCheckMenuLast(() => panel.colors.mode, optionsLength);
				}
				menu.newSeparator(subMenuSecondName);
				menu.newEntry({
					menuName: subMenuSecondName, entryText: 'Alternate rows background color', func: () => {
						panel.colors.bAltRowsColor = !panel.colors.bAltRowsColor;
						panel.properties['bAltRowsColor'][1] = panel.colors.bAltRowsColor;
						overwriteProperties(panel.properties);
						panel.colorsChanged();
						list.checkConfigPostUpdate(list.checkConfig({ bResetColors: true })); // Ensure related settings is set properly
						list.repaint();
					}
				});
				menu.newCheckMenuLast(() => panel.colors.bAltRowsColor);
			}
			menu.newSeparator(subMenuName);
			{	// Presets
				const subMenuSecondName = menu.newMenu('Presets', subMenuName);
				const presets = [ /*[autoPlaylist, smartPlaylist, smartPlaylist, lockedPlaylist, selectedPlaylist, standard text, buttons, background ]*/
					{ name: 'Color Blindness (light)', colors: [colorBlind.yellow[2], colorBlind.yellow[2], colorBlind.blue[0], colorBlind.blue[1], colorBlind.blue[1], colorBlind.black[2], colorBlind.white[0]] },
					{ name: 'Color Blindness (dark)', colors: [colorBlind.yellow[1], colorBlind.yellow[1], colorBlind.yellow[2], colorBlind.blue[1], colorBlind.blue[2], colorBlind.white[1], colorBlind.black[2]] },
					{ name: 'sep' },
					{ name: 'Gray Scale (dark)', colors: [colorBlind.black[1], colorBlind.black[1], colorBlind.white[0], colorBlind.black[2], colorBlind.black[2], colorBlind.white[0], colorBlind.black[0]] },
					{ name: 'Gray Scale (light)', colors: [colorBlind.black[1], colorBlind.black[1], colorBlind.black[0], colorBlind.black[1], colorBlind.black[2], colorBlind.black[2], colorBlind.white[0]] },
					{ name: 'sep' },
					{ name: 'Dark theme', colors: [blendColors(RGB(157, 158, 163), RGB(...toRGB(0xFFFF629B)), 0.6), blendColors(RGB(157, 158, 163), RGB(...toRGB(0xFF65CC32)), 0.6), blendColors(RGB(157, 158, 163), RGB(...toRGB(0xFF00AFFD)), 0.8), RGB(...toRGB(0xFFDC143C)), RGB(...toRGB(0xFF0080C0)), RGB(170, 170, 170), RGB(30, 30, 30)] },
					{ name: 'Dark theme (red)', colors: [blendColors(RGB(157, 158, 163), RGB(...toRGB(0xFFFF629B)), 0.6), blendColors(RGB(157, 158, 163), RGB(...toRGB(0xFF65CC32)), 0.6), blendColors(RGB(157, 158, 163), RGB(...toRGB(0xFF00AFFD)), 0.8), RGB(...toRGB(0xFFDC143C)), RGB(236, 47, 47), blendColors(RGB(236, 47, 47), RGB(170, 170, 170), 0.2), RGB(30, 30, 30)], buttonColors: [blendColors(RGB(236, 47, 47), invert(RGB(30, 30, 30)), 0.2), RGB(236, 47, 47)] },
					{ name: 'sep' },
					{ name: 'Default' }
				];
				presets.forEach((preset) => {
					if (menu.isSeparator(preset)) { menu.newSeparator(subMenuSecondName); return; }
					menu.newEntry({
						menuName: subMenuSecondName, entryText: preset.name, func: () => {
							// Panel and list
							if (preset.name.toLowerCase() === 'default') {
								panel.properties.colorsMode[1] = panel.colors.mode = 0;
								panel.properties.bCustomText[1] = panel.colors.bCustomText = false;
								list.colors = {};
							}
							else {
								panel.properties.colorsMode[1] = panel.colors.mode = 2;
								panel.properties.customBackground[1] = panel.colors.customBackground = preset.colors[6];
								panel.properties.bCustomText[1] = panel.colors.bCustomText = true;
								panel.properties.customText[1] = panel.colors.customText = preset.colors[5];
								list.colors.autoPlaylist = preset.colors[0];
								list.colors.smartPlaylist = preset.colors[1];
								list.colors.smartPlaylist = preset.colors[2];
								list.colors.lockedPlaylist = preset.colors[3];
								list.colors.selectedPlaylist = preset.colors[4];
								list.colors.folder = preset.colors[5];
							}
							list.properties.listColors[1] = convertObjectToString(list.colors);
							panel.colorsChanged();
							panel.setDefault({ all: true });
							// Buttons
							if (Object.hasOwn(preset, 'buttonColors') && preset.buttonColors.length) {
								if (preset.buttonColors[0] !== null) { panel.properties.buttonsTextColor[1] = panel.colors.buttonsTextColor = preset.buttonColors[0]; }
								if (preset.buttonColors[1] !== null) { panel.properties.buttonsToolbarColor[1] = panel.colors.buttonsToolbarColor = preset.buttonColors[1]; }
								panel.colorsChanged();
							}
							overwriteProperties(list.properties);
							overwriteProperties(panel.properties);
							list.checkConfigPostUpdate(list.checkConfig({ bResetColors: true })); // Ensure related settings is set properly
							list.repaint();
						}
					});
					menu.newCheckMenuLast(() => {
						return preset.name.toLowerCase() === 'default'
							? panel.colors.mode === 0
								&& panel.colors.buttonsTextColor === panel.colors.bButtonsBackground ? panel.colors.default.buttonsTextColor : invert(panel.getColorBackground())
								&& panel.colors.buttonsTextColor === invert(panel.getColorBackground())
								&& panel.colors.bCustomText === false
								&& list.colors.autoPlaylist === blendColors(panel.colors.text, RGB(...toRGB(0xFFFF629B)), 0.6) // At list.checkConfig
								&& list.colors.smartPlaylist === blendColors(panel.colors.text, RGB(...toRGB(0xFF65CC32)), 0.6)
								&& list.colors.smartPlaylist === blendColors(panel.colors.text, RGB(...toRGB(0xFF00AFFD)), 0.8)
								&& list.colors.lockedPlaylist === RGB(...toRGB(0xFFDC143C))
								&& list.colors.selectedPlaylist === RGB(...toRGB(0xFF0080C0))
							&& list.colors.folder === panel.colors.text
							: panel.colors.mode === 2
							&& panel.colors.customBackground === preset.colors[6]
							&& panel.colors.bCustomText === true
							&& panel.colors.customText === preset.colors[5]
							&& list.colors.autoPlaylist === preset.colors[0]
							&& list.colors.smartPlaylist === preset.colors[1]
							&& list.colors.smartPlaylist === preset.colors[2]
							&& list.colors.lockedPlaylist === preset.colors[3]
							&& list.colors.selectedPlaylist === preset.colors[4]
							&& list.colors.folder === preset.colors[5]
							&& (
								Object.hasOwn(preset, 'buttonColors') && preset.buttonColors.length
								&& (
									(preset.buttonColors[0] !== null && panel.colors.buttonsTextColor === preset.buttonColors[0] || preset.buttonColors[0] === null)
									&&
									(preset.buttonColors[1] !== null && panel.colors.buttonsToolbarColor === preset.buttonColors[1] || preset.buttonColors[1] === null)
								)
								|| !Object.hasOwn(preset, 'buttonColors')
							);
					});
				});
			}
			menu.newSeparator(subMenuName);
			{
				const subMenuSecondName = menu.newMenu('Dynamic colors', subMenuName);
				menu.newEntry({
					menuName: subMenuSecondName, entryText: 'Listen to color-servers', func: () => {
						list.properties.bOnNotifyColors[1] = !list.properties.bOnNotifyColors[1];
						overwriteProperties(list.properties);
						if (list.properties.bOnNotifyColors[1]) {
							window.NotifyOthers('Colors: ask color scheme', window.ScriptInfo.Name + ': set color scheme');
							window.NotifyOthers('Colors: ask color', window.ScriptInfo.Name + ': set colors');
						}
					}
				});
				menu.newCheckMenuLast(() => list.properties.bOnNotifyColors[1]);
			}
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Reset all to default', func: () => {
					list.properties.listColors[1] = convertObjectToString({});
					panel.properties.colorsMode[1] = panel.colors.mode = 0;
					panel.properties.bCustomText[1] = panel.colors.bCustomText = false;
					panel.properties.headerButtonsColor[1] = panel.colors.headerButtons = -1;
					panel.colorsChanged();
					panel.setDefault({ all: true });
					overwriteProperties(list.properties);
					overwriteProperties(panel.properties);
					list.checkConfigPostUpdate(list.checkConfig({ bResetColors: true })); // Ensure related settings is set properly
					list.repaint();
				}
			});
		}
		if (list.uiElements['Bottom toolbar'].enabled) {	// Buttons' toolbar
			const defaultButtonsCol = panel.colors.bButtonsBackground ? panel.colors.default.buttonsTextColor : invert(panel.getColorBackground());
			const subMenuName = menu.newMenu('Bottom toolbar', menuName);
			const options = ['Use default (toolbar)', 'Use no background buttons', 'Use background buttons (theme manager)'];
			const optionsLength = options.length;
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						panel.properties.bToolbar[1] = panel.colors.bToolbar = i === 0;
						panel.properties.bButtonsBackground[1] = panel.colors.bButtonsBackground = i === 2;
						// Update property to save between reloads
						overwriteProperties(panel.properties);
						panel.colorsChanged();
						if (panel.setDefault({ oldColor: defaultButtonsCol })) { overwriteProperties(panel.properties); }
						list.repaint();
					}
				});
			});
			menu.newCheckMenuLast(() => (panel.colors.bToolbar ? 0 : (panel.colors.bButtonsBackground ? 2 : 1)), optionsLength);
		}
		{	// Panel background
			const subMenuName = menu.newMenu('Panel background', menuName);
			const options = ['Use front cover', 'Use color background'];
			const optionsLength = options.length;
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						panel.imageBackground.enabled = i === 0;
						panel.properties.imageBackground[1] = JSON.stringify(panel.getConfig());
						if (panel.imageBackground.enabled) { // Add shadows by default
							const answer = WshShell.Popup('Add font shading to improve readability?\n(it may heavily affect performance on some systems)', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
							panel.colors.bFontOutline = answer === popup.yes;
						} else {
							panel.colors.bFontOutline = false;
						}
						panel.properties.bFontOutline[1] = panel.colors.bFontOutline;
						overwriteProperties(panel.properties);
						panel.updateImageBg(true);
						list.repaint();
					}
				});
			});
			menu.newCheckMenuLast(() => (panel.imageBackground.enabled ? 0 : 1), optionsLength);
			menu.newSeparator(subMenuName);
			{
				const subMenuNameTwo = menu.newMenu('Selection mode', subMenuName);
				const options = ['Follow selection', 'Follow now playing', 'External file...'];
				const optionsLength = options.length;
				options.forEach((item, i) => {
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: item, func: () => {
							if (i === 2) {
								const input = Input.string(
									'string',
									panel.imageBackground.mode === 2
										? panel.imageBackground.art.path
										: JSON.parse(panel.properties.imageBackground[1]).art.path || '',
									'Set file path:\n(relative paths have as root the foobar2000 folder with the exe)',
									window.Name + _ps(window.ScriptInfo.Name),
									'myfile.jpg'
								);
								if (input === null) { return; }
								panel.imageBackground.art.path = input;
							}
							panel.imageBackground.mode = i;
							panel.properties.imageBackground[1] = JSON.stringify(panel.getConfig());
							overwriteProperties(panel.properties);
							panel.updateImageBg(true);
							list.repaint();
						}
					});
				});
				menu.newCheckMenuLast(() => panel.imageBackground.mode, optionsLength);
				menu.newSeparator(subMenuNameTwo);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Cache same album\'s tracks art', func: () => {
						panel.imageBackground.bCacheAlbum = !panel.imageBackground.bCacheAlbum;
						panel.properties.imageBackground[1] = JSON.stringify(panel.getConfig());
						overwriteProperties(panel.properties);
					}, flags: panel.imageBackground.mode !== 2 ? MF_STRING : MF_GRAYED
				});
				menu.newCheckMenuLast(() => panel.imageBackground.bCacheAlbum);
			}
			menu.newSeparator(subMenuName);
			{
				const subMenuNameTwo = menu.newMenu('Display mode', subMenuName);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Maintain proportions', func: () => {
						panel.imageBackground.bProportions = !panel.imageBackground.bProportions;
						panel.properties.imageBackground[1] = JSON.stringify(panel.getConfig());
						overwriteProperties(panel.properties);
						panel.updateImageBg();
						list.repaint();
					}
				});
				menu.newCheckMenuLast(() => panel.imageBackground.bProportions);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Fill panel', func: () => {
						panel.imageBackground.bFill = !panel.imageBackground.bFill;
						panel.properties.imageBackground[1] = JSON.stringify(panel.getConfig());
						overwriteProperties(panel.properties);
						panel.updateImageBg();
						list.repaint();
					}
				});
				menu.newCheckMenuLast(() => panel.imageBackground.bFill);
				menu.newSeparator(subMenuNameTwo);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Tint all UI elements', func: () => {
						panel.imageBackground.bTint = !panel.imageBackground.bTint;
						panel.properties.imageBackground[1] = JSON.stringify(panel.getConfig());
						overwriteProperties(panel.properties);
						list.repaint();
					}
				});
				menu.newCheckMenuLast(() => panel.imageBackground.bTint);
			}
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Set transparency...\t' + _b(panel.imageBackground.transparency), func: () => {
					let input = Input.number('int positive', panel.imageBackground.transparency, 'Set transparency:\n0 is transparent, 100 is opaque.\n(0-100)', window.Name + _ps(window.ScriptInfo.Name), 50, [(n) => n >= 0 && n <= 100]);
					if (input === null) { return; }
					panel.imageBackground.transparency = input;
					panel.properties.imageBackground[1] = JSON.stringify(panel.getConfig());
					overwriteProperties(panel.properties);
					panel.updateImageBg();
					list.repaint();
				}
			});
			menu.newEntry({
				menuName: subMenuName, entryText: 'Set blur...\t' + _b(panel.imageBackground.blur), func: () => {
					let input = Input.number('int positive', panel.imageBackground.blur, 'Set blur:\n(>= 0)', window.Name + _ps(window.ScriptInfo.Name), 10);
					if (input === null) { return; }
					panel.imageBackground.blur = input;
					panel.properties.imageBackground[1] = JSON.stringify(panel.getConfig());
					overwriteProperties(panel.properties);
					panel.updateImageBg(true);
					list.repaint();
				}
			});
		}
		menu.newSeparator(menuName);
		{	// Tooltip
			const subMenuName = menu.newMenu('Tooltip', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Tooltip settings:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			{
				const subMenuNameTwo = menu.newMenu('Show usage info', subMenuName);
				const options = ['Yes: Show shortcuts', 'No: Only show basic info'];
				const optionsLength = options.length;
				menu.newEntry({ menuName: subMenuNameTwo, entryText: 'On playlist and header tooltips:', flags: MF_GRAYED });
				menu.newSeparator(subMenuNameTwo);
				options.forEach((item, i) => {
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: item, func: () => {
							list.tooltipSettings.bShowTips = (i === 0);
							list.properties.tooltipSettings[1] = JSON.stringify(list.tooltipSettings);
							overwriteProperties(list.properties);
						}
					});
				});
				menu.newCheckMenuLast(() => (list.tooltipSettings.bShowTips ? 0 : 1), optionsLength);
			}
			menu.newSeparator(subMenuName);
			Object.keys(list.tooltipSettings.show).forEach((key) => {
				const entryText = 'Show ' + capitalizeAll(key.split('')
					.reduce((prev, s) => prev + (s !== s.toLowerCase() ? ' ' : '') + s, ''))
					.replace('Mbid', 'MBID');
				menu.newEntry({
					menuName: subMenuName, entryText, func: () => {
						list.tooltipSettings.show[key] = !list.tooltipSettings.show[key];
						list.properties.tooltipSettings[1] = JSON.stringify(list.tooltipSettings);
						overwriteProperties(list.properties);
					}
				});
				menu.newCheckMenuLast(() => list.tooltipSettings.show[key]);
			});
		}
		{	// Scroll
			const subMenuName = menu.newMenu('List scrolling', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Scrolling settings:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			{
				const subMenuNameTwo = menu.newMenu('Rows per step', subMenuName);
				const options = [1, 2, 5, 10];
				const optionsLength = options.length;
				const autoScroll = Math.ceil(Math.min(list.items, list.rows) / 10);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Automatic\t' + _b(autoScroll), func: () => {
						list.scrollSettings.unit = null;
						list.properties.scrollSettings[1] = JSON.stringify(list.scrollSettings);
						overwriteProperties(list.properties);
					}
				});
				menu.newSeparator(subMenuNameTwo);
				options.forEach((item) => {
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: item, func: () => {
							list.scrollSettings.unit = item;
							list.properties.scrollSettings[1] = JSON.stringify(list.scrollSettings);
							overwriteProperties(list.properties);
						}
					});
				});
				menu.newSeparator(subMenuNameTwo);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: 'Custom...\t' + _b(list.scrollSettings.unit || autoScroll), func: () => {
						const input = Input.number('int', list.scrollSettings.unit || 0, 'Enter number of rows per step:\n(int number)\n\nSet to 0 for auto.', window.Name + _ps(window.ScriptInfo.Name), 2);
						if (input === null) { return; }
						list.scrollSettings.unit = input || null;
						list.properties.scrollSettings[1] = JSON.stringify(list.scrollSettings);
						overwriteProperties(list.properties);
					}
				});
				menu.newCheckMenuLast(() => {
					let idx = options.indexOf(list.scrollSettings.unit);
					return idx === -1
						? list.scrollSettings.unit ? optionsLength + 1 : 0
						: idx;
				}, optionsLength + 4);
			}
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Smooth scrolling', func: () => {
					list.scrollSettings.bSmooth = !list.scrollSettings.bSmooth;
					list.properties.scrollSettings[1] = JSON.stringify(list.scrollSettings);
					overwriteProperties(list.properties);
				}
			});
			menu.newCheckMenuLast(() => list.scrollSettings.bSmooth);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Reverse scrolling', func: () => {
					list.scrollSettings.bReversed = !list.scrollSettings.bReversed;
					list.properties.scrollSettings[1] = JSON.stringify(list.scrollSettings);
					overwriteProperties(list.properties);
				}
			});
			menu.newCheckMenuLast(() => list.scrollSettings.bReversed);
		}
		menu.newSeparator(menuName);
		{	// Columns
			const subMenuName = menu.newMenu('Columns', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Columns settings:' + '\t' + (list.getColumnsEnabled() ? '(disabled)' : ''), flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			list.columns.labels.forEach((key, i) => {
				const subMenuColumn = menu.newMenu('Column ' + (i + 1) + '\t ' + _b(key), subMenuName);
				{	// Metadata
					const options = ['duration', 'size', 'fileSize', 'trackSize', 'playlist_mbid', 'trackTags', 'isLocked'];
					const subMenuNameTwo = menu.newMenu('Metadata', subMenuColumn);
					menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Display:', flags: MF_GRAYED });
					menu.newSeparator(subMenuNameTwo);
					const toEntry = (s) => capitalizeAll(s.replace(/[A-Z]/g, ' $&').replace(/_/g, ' '));
					options.forEach((opt) => {
						menu.newEntry({
							menuName: subMenuNameTwo, entryText: toEntry(opt), func: () => {
								list.columns.labels[i] = opt;
								list.properties.columns[1] = JSON.stringify(list.columns);
								overwriteProperties(list.properties);
								list.repaint();
							}
						});
					});
					if (options.includes(key)) { menu.newCheckMenuLast(() => options.indexOf(key), options.length); }
				}
				{	// Size
					const options = ['normal', 'small', 'title'];
					const subMenuNameTwo = menu.newMenu('Size', subMenuColumn);
					menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Font size:', flags: MF_GRAYED });
					menu.newSeparator(subMenuNameTwo);
					options.forEach((opt) => {
						menu.newEntry({
							menuName: subMenuNameTwo, entryText: capitalize(opt), func: () => {
								list.columns.font[i] = opt;
								list.properties.columns[1] = JSON.stringify(list.columns);
								overwriteProperties(list.properties);
								list.repaint();
							}
						});
					});
					menu.newCheckMenuLast(() => { const idx = options.indexOf(list.columns.font[i]); return (idx !== -1 ? idx : 0); }, options.length);
				}
				{	// Align
					const options = ['right', 'left', 'center'];
					const subMenuNameTwo = menu.newMenu('Align', subMenuColumn);
					menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Alignment:', flags: MF_GRAYED });
					menu.newSeparator(subMenuNameTwo);
					options.forEach((opt) => {
						menu.newEntry({
							menuName: subMenuNameTwo, entryText: capitalize(opt), func: () => {
								list.columns.align[i] = opt;
								list.properties.columns[1] = JSON.stringify(list.columns);
								overwriteProperties(list.properties);
								list.repaint();
							}
						});
					});
					menu.newCheckMenuLast(() => { const idx = options.indexOf(list.columns.align[i]); return (idx !== -1 ? idx : 0); }, options.length);
				}
				{	// Color
					const options = ['playlistColor', 'textColor', 'custom'];
					const subMenuNameTwo = menu.newMenu('Color', subMenuColumn);
					menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Color:', flags: MF_GRAYED });
					menu.newSeparator(subMenuNameTwo);
					options.forEach((opt) => {
						menu.newEntry({
							menuName: subMenuNameTwo, entryText: capitalize(opt), func: () => {
								list.columns.color[i] = opt === 'custom'
									? utils.ColourPicker(window.ID, list.columns.color[i])
									: opt;
								if (opt === 'custom') { console.log('Playlist Manager: Selected color ->\n\t Android: ' + list.columns.color[i] + ' - RGB: ' + Chroma(list.columns.color[i]).rgb()); }
								list.properties.columns[1] = JSON.stringify(list.columns);
								overwriteProperties(list.properties);
								list.repaint();
							}
						});
					});
					menu.newCheckMenuLast(() => { const idx = options.indexOf(list.columns.color[i]); return (idx !== -1 ? idx : (options.length - 1)); }, options.length);
				}
				// Width
				menu.newEntry({
					menuName: subMenuColumn, entryText: 'Width' + '\t' + _b(list.columns.width[i]), func: () => {
						const input = Input.number('real positive', list.columns.width[i], 'Enter width: (px)\n(0 to set width automatically)', window.Name + _ps(window.ScriptInfo.Name), 60);
						if (input === null) { return; }
						list.columns.width[i] = input || 'auto';
						list.properties.columns[1] = JSON.stringify(list.columns);
						overwriteProperties(list.properties);
						list.repaint();
					}
				});
				menu.newSeparator(subMenuColumn);
				menu.newEntry({
					menuName: subMenuColumn, entryText: 'Show', func: () => {
						list.columns.bShown[i] = !list.columns.bShown[i];
						list.properties.columns[1] = JSON.stringify(list.columns);
						overwriteProperties(list.properties);
						list.repaint();
					}
				});
				menu.newCheckMenuLast(() => list.columns.bShown[i]);
			});
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Add new column...', func: () => {
					list.columns.labels.push('size');
					list.columns.width.push(list.columns.width.slice(-1)[0] || 'auto');
					list.columns.font.push(list.columns.font.slice(-1)[0] || 'normal');
					list.columns.align.push(list.columns.align.slice(-1)[0] || 'right');
					list.columns.color.push(list.columns.color.slice(-1)[0] || 'playlistColor');
					list.columns.bShown.push(true);
					list.properties['columns'][1] = JSON.stringify(list.columns);
					overwriteProperties(list.properties);
					list.repaint();
				}
			});
			const subMenuNameTwo = menu.newMenu('Remove column', subMenuName);
			list.columns.labels.forEach((key, i) => {
				const column = 'Column ' + (i + 1) + '\t ' + _b(key);
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: column, func: () => {
						list.columns.labels.splice(i, 1);
						list.columns.width.splice(i, 1);
						list.columns.font.splice(i, 1);
						list.properties['columns'][1] = JSON.stringify(list.columns);
						overwriteProperties(list.properties);
						list.repaint();
					}
				});
			});
			menu.newSeparator(subMenuName);
			{	// Line
				const subMenuNameTwo = menu.newMenu('Border', subMenuName);
				const options = ['none', 'first', 'all'];
				menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Column borders:', flags: MF_GRAYED });
				menu.newSeparator(subMenuNameTwo);
				options.forEach((opt) => {
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: capitalize(opt), func: () => {
							list.columns.line = opt;
							list.properties.columns[1] = JSON.stringify(list.columns);
							overwriteProperties(list.properties);
							list.repaint();
						}
					});
				});
				menu.newCheckMenuLast(() => { const idx = options.indexOf(list.columns.line); return idx !== -1 ? idx : 0; }, options.length);
			}
			{	// Auto-Width
				const subMenuNameTwo = menu.newMenu('Auto-Width', subMenuName);
				const options = ['entire list', 'current view'];
				menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Calculate by:', flags: MF_GRAYED });
				menu.newSeparator(subMenuNameTwo);
				options.forEach((opt) => {
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: capitalize(opt), func: () => {
							list.columns.autoWidth = opt;
							list.properties.columns[1] = JSON.stringify(list.columns);
							overwriteProperties(list.properties);
							list.repaint();
						}
					});
				});
				menu.newCheckMenuLast(() => { const idx = options.indexOf(list.columns.autoWidth); return idx !== -1 ? idx : 0; }, options.length);
			}
			{	// Size unis
				const subMenuNameTwo = menu.newMenu('Size units', subMenuName);
				const options = ['prefix', 'suffix'];
				menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Calculate by:', flags: MF_GRAYED });
				menu.newSeparator(subMenuNameTwo);
				options.forEach((opt) => {
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: capitalize(opt) + '\t' + _b(list.columns.sizeUnits[opt]), func: () => {
							const mode = WshShell.Popup('Use unicode char codes?\nFor example: (escape | input | display)\n\\u2665 | 2665 | \u2665\n\\u266A | 266A | \u266A\n\nMore info:\nhttps://www.rapidtables.com/code/text/unicode-characters.html', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no) === popup.yes
								? 'unicode'
								: 'string';
							const input = Input.string(mode, list.columns.sizeUnits[opt], 'Enter string to show as prefix/suffix:' + (mode === 'unicode' ? '\n(unicode chars are split by blank spaces)' : ''), window.Name + _ps(window.ScriptInfo.Name), mode === 'unicode' ? '' : ' t.');
							if (input === null) { return; }
							list.columns.sizeUnits[opt] = input;
							list.properties.columns[1] = JSON.stringify(list.columns);
							overwriteProperties(list.properties);
							list.repaint();
						}
					});
					menu.newCheckMenuLast(() => (list.columns.sizeUnits[opt].toString().length !== 0));
				});
			}
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Restore defaults', func: () => {
					list.properties.columns[1] = list.properties.columns[3];
					list.columns = JSON.parse(list.properties.columns[1]);
					overwriteProperties(list.properties);
					list.repaint();
				}
			});
		}
		{	// Enabled UI elements
			const subMenuName = menu.newMenu('UI elements', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Elements shown:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			Object.keys(list.uiElements).forEach((key) => {
				const subElement = list.uiElements[key];
				if (Object.hasOwn(subElement, 'elements')) {
					const subMenuNameTwo = menu.newMenu(key, subMenuName);
					const keys = list.bLiteMode
						? Object.keys(subElement.elements).filter((subKey) => subKey !== 'Folder')
						: Object.keys(subElement.elements);
					keys.sort((a, b) => subElement.elements[a].position - subElement.elements[b].position);
					const bCanHideSettings = (subKey) => {
						if (!list.uiElements['Search filter'].enabled) { return true; }
						else if (subKey === 'Settings menu') { return Object.hasOwn(subElement.elements, 'Power actions') && subElement.elements['Power actions'].enabled; }
						else if (subKey === 'Power actions') { return Object.hasOwn(subElement.elements, 'Settings menu') && subElement.elements['Settings menu'].enabled; }
						else { return true; }
					};
					keys.forEach((subKey) => {
						const flags = bCanHideSettings(subKey)
							? MF_STRING
							: MF_GRAYED;
						menu.newEntry({
							menuName: subMenuNameTwo, entryText: subKey, func: () => {
								subElement.elements[subKey].enabled = !subElement.elements[subKey].enabled;
								list.properties.uiElements[1] = JSON.stringify(list.uiElements);
								overwriteProperties(list.properties);
								list.updateUIElements();
							}, flags
						});
						menu.newCheckMenuLast(() => subElement.elements[subKey].enabled);
					});
					menu.newSeparator(subMenuNameTwo);
					const bEnable = keys.some((subKey) => !subElement.elements[subKey].enabled);
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: (bEnable ? 'Enable' : 'Disable') + ' all', func: () => {
							keys.forEach((subKey) => {
								if (!bEnable && !bCanHideSettings(subKey)) { return; }
								subElement.elements[subKey].enabled = bEnable;
							});
							list.properties.uiElements[1] = JSON.stringify(list.uiElements);
							overwriteProperties(list.properties);
							list.updateUIElements();
						}
					});
				} else {
					menu.newEntry({
						menuName: subMenuName, entryText: key, func: () => {
							subElement.enabled = !subElement.enabled;
							list.properties.uiElements[1] = JSON.stringify(list.uiElements);
							overwriteProperties(list.properties);
							const bReload = ['Scrollbar'].includes(key);
							list.updateUIElements(bReload);
						}
					});
					menu.newCheckMenuLast(() => subElement.enabled);
				}
			});
			menu.newSeparator(subMenuName);
			{ // Presets
				const options = [
					{
						name: 'Full', elements: {
							'Search filter': { enabled: true },
							'Columns': { enabled: true },
							'Bottom toolbar': { enabled: true },
							'Header buttons': {
								enabled: true, elements:
								{
									'Power actions': { enabled: true },
									'Filter and sorting': { enabled: true },
									'List menu': { enabled: true },
									'Settings menu': { enabled: true },
									'Folder': { enabled: !list.bLiteMode },
									'Help': { enabled: true },
								}
							}
						}
					},
					{
						name: 'Essential + Search', elements: {
							'Search filter': { enabled: true },
							'Bottom toolbar': { enabled: true },
							'Header buttons': {
								enabled: true, elements:
								{
									'Power actions': { enabled: true },
									'Filter and sorting': { enabled: true },
									'List menu': { enabled: true },
									'Settings menu': { enabled: false },
									'Folder': { enabled: false },
									'Help': { enabled: false },
								}
							}
						}
					},
					{
						name: 'Essential', elements: {
							'Search filter': { enabled: false },
							'Header buttons': {
								enabled: true, elements:
								{
									'Power actions': { enabled: true },
									'Filter and sorting': { enabled: true },
									'List menu': { enabled: true },
									'Settings menu': { enabled: false },
									'Folder': { enabled: false },
									'Help': { enabled: false },
								}
							}
						}
					},
					{
						name: 'Simple header', elements: {
							'Search filter': { enabled: false },
							'Bottom toolbar': { enabled: true },
							'Header buttons': {
								enabled: false, elements:
								{
									'Power actions': { enabled: false },
									'Filter and sorting': { enabled: false },
									'List menu': { enabled: false },
									'Settings menu': { enabled: false },
									'Folder': { enabled: false },
									'Help': { enabled: false },
								}
							}
						}
					},
				];
				const subMenuNameTwo = menu.newMenu('Presets', subMenuName);
				options.forEach((preset) => {
					menu.newEntry({
						menuName: subMenuNameTwo, entryText: preset.name, func: () => {
							Object.keys(preset.elements).forEach((key) => {
								const subElement = preset.elements[key];
								const subElementList = list.uiElements[key];
								if (Object.hasOwn(subElement, 'elements')) {
									const keys = Object.keys(subElement.elements);
									keys.forEach((subKey) => {
										subElementList.elements[subKey].enabled = subElement.elements[subKey].enabled;
									});
								} else {
									subElementList.enabled = subElement.enabled;
								}
							});
							list.properties.uiElements[1] = JSON.stringify(list.uiElements);
							overwriteProperties(list.properties);
							list.updateUIElements();
						}
					});
				});
			}
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Restore defaults', func: () => {
					list.properties.uiElements[1] = list.properties.uiElements[3];
					list.uiElements = JSON.parse(list.properties.uiElements[1]);
					overwriteProperties(list.properties);
					list.updateUIElements();
				}
			});
		}
		if (showMenus['Quick-search']) {	// QuickSearch
			menu.newSeparator(menuName);
			quickSearchMenu(menu, menuName);
		}
		menu.newSeparator(menuName);
		{	// Share UI settings
			menu.newEntry({
				menuName,
				entryText: 'Share UI settings...', func: () => {
					list.shareUiSettings('popup');
				}
			});
		}
	}
	menu.newSeparator();
	if (showMenus['Folders']) {
		const menuName = menu.newMenu('Folders');
		{	// Max Depth
			menu.newEntry({
				menuName, entryText: 'Max level depth...\t(' + (Number.isFinite(list.folders.maxDepth) ? list.folders.maxDepth : '\u221E') + ')', func: () => {
					const input = Input.number('int positive', list.folders.maxDepth, 'Enter positive integer value:', window.Name + _ps(window.ScriptInfo.Name), 3);
					if (input === null) { return; }
					list.folders.maxDepth = input;
					list.properties.folders[1] = JSON.stringify(list.folders);
					overwriteProperties(list.properties);
				}
			});
		}
		{	// Folder size
			const subMenuName = menu.newMenu('Show size', menuName);
			const options = [
				{ name: 'Deep recursion', settings: { bShowSize: true, bShowSizeDeep: true } },
				{ name: 'Current level', settings: { bShowSize: true, bShowSizeDeep: false } },
				{ name: 'None', settings: { bShowSize: false, bShowSizeDeep: false } },
			];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Show size along name:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item.name, func: () => {
						Object.keys(item.settings).forEach((key) => {
							list.folders[key] = item.settings[key];
						});
						list.properties.folders[1] = JSON.stringify(list.folders);
						overwriteProperties(list.properties);
						list.repaint();
					}
				});
			});
			menu.newCheckMenuLast(() => {
				const idx = options.findIndex((option) => Object.keys(option.settings).every((key) => list.folders[key] === option.settings[key]));
				return idx !== -1 ? idx : 2;
			}, optionsLength);
		}
		{	// Icons
			const subMenuName = menu.newMenu('Icons', menuName);
			const options = [
				{ name: 'Carets', icons: { open: chars.downOutline, closed: chars.leftOutline } },
				{ name: 'Folders (solid)', icons: { open: chars.folderOpenBlack, closed: chars.folderCloseBlack } },
				{ name: 'Folders (outline)', icons: { open: chars.folderOpenWhite, closed: chars.folderCloseWhite } },
				{ name: 'Custom...', icons: { open: null, closed: null } },
			];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'Icons for folders:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item.name, func: () => {
						if (Object.values(item.icons).filter(Boolean).length !== 2) {
							Object.keys(item.icons).forEach((key) => {
								if (!item.icons[key]) {
									const input = Input.string('unicode', list.folders.icons[key] || chars.downOutline, 'Enter folder\'s icon: (unicode - fxxx)\n\nLook for values at:\ngithub.com/regorxxx/foobar2000-assets/blob/main/Fonts/FA_4_7_0.pdf', window.Name + _ps(window.ScriptInfo.Name), chars.downOutline, void (0), false);
									if (input === null) { return; }
									item.icons[key] = input;
								}
							});
						}
						list.folders.icons = item.icons;
						list.properties.folders[1] = JSON.stringify(list.folders);
						overwriteProperties(list.properties);
						list.repaint();
					}
				});
			});
			menu.newCheckMenuLast(() => {
				const idx = options.findIndex((option) => isArrayEqual(Object.values(option.icons), Object.values(list.folders.icons)));
				return idx !== -1 ? idx : 3;
			}, optionsLength);
		}
		{	// Colors
			menu.newEntry({ menuName, entryText: 'Set color...' + '\t' + _b(getColorName(list.colors.folder)), func: () => createMenuRightTop().btn_up(void (0), void (0), void (0), 'List items\\Folders...') });
		}
		menu.newSeparator();
	}
	{	// Shortcuts
		const subMenuName = menu.newMenu('Shortcuts');
		menu.newEntry({ menuName: subMenuName, entryText: 'Mouse / Keyboard actions:', flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		{	// List L. Click
			const bListButton = list.uiElements['Header buttons'].elements['List menu'].enabled;
			const subMenuNameL = menu.newMenu('Left Click', subMenuName);
			const shortcuts = list.getDefaultShortcuts('L');
			const modifiers = shortcuts.options.map((_) => { return _.key; });
			const actions = shortcuts.actions.map((_) => { return _.key; });
			menu.newEntry({ menuName: subMenuNameL, entryText: 'Modifiers on L. Click:', flags: MF_GRAYED });
			menu.newSeparator(subMenuNameL);
			modifiers.forEach((modifier) => {
				const subMenuOption = modifier === 'Single Click' && !bListButton
					? menu.newMenu(modifier + '\t(enable List Menu button)', subMenuNameL, MF_GRAYED)
					: menu.newMenu(modifier, subMenuNameL);
				actions.forEach((action) => {
					const flags = modifier === 'Double Click' && action === 'Multiple selection' || !list.isValidAction(action)
						? MF_GRAYED
						: MF_STRING;
					menu.newEntry({
						menuName: subMenuOption, entryText: action, func: () => {
							list.lShortcuts[modifier] = action;
							list.properties['lShortcuts'][1] = JSON.stringify(list.lShortcuts);
							overwriteProperties(list.properties);
							if (action === 'Multiple selection') {
								fb.ShowPopupMessage('Allows to select multiple playlists at the same time and execute a shortcut action for every item. i.e. Loading playlist, locking, etc.\n\nNote opening the playlist menu will show a limited list of available actions according to the selection. To display the entire menu, use single selection instead. ', window.Name + _ps(window.ScriptInfo.Name));
							}
						}, flags
					});
				});
				menu.newCheckMenuLast(() => {
					const idx = actions.indexOf(list.lShortcuts[modifier]);
					return (idx !== -1 ? idx : 0);
				}, actions.length);
			});
			menu.newSeparator(subMenuNameL);
			menu.newEntry({
				menuName: subMenuNameL, entryText: 'Restore defaults', func: () => {
					list.properties['lShortcuts'][1] = list.defaultProperties['lShortcuts'][3];
					list.lShortcuts = JSON.parse(list.properties['lShortcuts'][1]);
					overwriteProperties(list.properties);
				}
			});
		}
		{	// List R. Click
			const bListButton = list.uiElements['Header buttons'].elements['List menu'].enabled;
			const subMenuNameR = menu.newMenu('Right Click' + (bListButton ? '' : '\t(enable List Menu button)'), subMenuName, bListButton ? MF_STRING : MF_GRAYED);
			const shortcuts = list.getDefaultShortcuts('R');
			const modifiers = shortcuts.options.map((_) => { return _.key; });
			const actions = shortcuts.actions.map((_) => { return _.key; });
			menu.newEntry({ menuName: subMenuNameR, entryText: 'Modifiers on R. Click:', flags: MF_GRAYED });
			menu.newSeparator(subMenuNameR);
			modifiers.forEach((modifier) => {
				const subMenuOption = menu.newMenu(modifier, subMenuNameR);
				actions.forEach((action) => {
					const flags = !list.isValidAction(action) ? MF_GRAYED : MF_STRING;
					menu.newEntry({
						menuName: subMenuOption, entryText: action, func: () => {
							list.rShortcuts[modifier] = action;
							list.properties['rShortcuts'][1] = JSON.stringify(list.rShortcuts);
							overwriteProperties(list.properties);
							if (action === 'Multiple selection') {
								fb.ShowPopupMessage('Allows to select multiple playlists at the same time and execute a shortcut action for every item. i.e. Loading playlist, locking, etc.\n\nNote opening the playlist menu will show a limited list of available actions according to the selection. To display the entire menu, use single selection instead. ', window.Name + _ps(window.ScriptInfo.Name));
							}
						}, flags
					});
				});
				menu.newCheckMenuLast(() => {
					const idx = actions.indexOf(list.rShortcuts[modifier]);
					return (idx !== -1 ? idx : 0);
				}, actions.length);
			});
			menu.newSeparator(subMenuNameR);
			menu.newEntry({
				menuName: subMenuNameR, entryText: 'Restore defaults', func: () => {
					list.properties['rShortcuts'][1] = list.defaultProperties['rShortcuts'][3];
					list.rShortcuts = JSON.parse(list.properties['rShortcuts'][1]);
					overwriteProperties(list.properties);
				}
			});
		}
		{	// List M. Click
			const subMenuNameM = menu.newMenu('Middle Click', subMenuName);
			const shortcuts = list.getDefaultShortcuts('M');
			const modifiers = shortcuts.options.map((_) => { return _.key; });
			const actions = shortcuts.actions.map((_) => { return _.key; });
			menu.newEntry({ menuName: subMenuNameM, entryText: 'Modifiers on M. Click:', flags: MF_GRAYED });
			menu.newSeparator(subMenuNameM);
			modifiers.forEach((modifier) => {
				const subMenuOption = menu.newMenu(modifier, subMenuNameM);
				actions.forEach((action) => {
					const flags = !list.isValidAction(action) ? MF_GRAYED : MF_STRING;
					menu.newEntry({
						menuName: subMenuOption, entryText: action, func: () => {
							list.mShortcuts[modifier] = action;
							list.properties['mShortcuts'][1] = JSON.stringify(list.mShortcuts);
							overwriteProperties(list.properties);
							if (action === 'Multiple selection') {
								fb.ShowPopupMessage('Allows to select multiple playlists at the same time and execute a shortcut action for every item. i.e. Loading playlist, locking, etc.\n\nNote opening the playlist menu will show a limited list of available actions according to the selection. To display the entire menu, use single selection instead. ', window.Name + _ps(window.ScriptInfo.Name));
							}
						}, flags
					});
				});
				menu.newCheckMenuLast(() => {
					const idx = actions.indexOf(list.mShortcuts[modifier]);
					return (idx !== -1 ? idx : 0);
				}, actions.length);
			});
			menu.newSeparator(subMenuNameM);
			menu.newEntry({
				menuName: subMenuNameM, entryText: 'Restore defaults', func: () => {
					list.properties['mShortcuts'][1] = list.defaultProperties['mShortcuts'][3];
					list.mShortcuts = JSON.parse(list.properties['mShortcuts'][1]);
					overwriteProperties(list.properties);
				}
			});
		}
		menu.newSeparator(subMenuName);
		{	// Header L. Click
			const subMenuNameL = menu.newMenu('Left Click (header)', subMenuName);
			const shortcuts = list.getDefaultShortcuts('L', 'HEADER');
			const modifiers = shortcuts.options.map((_) => { return _.key; });
			const actions = shortcuts.actions.map((_) => { return _.key; });
			menu.newEntry({ menuName: subMenuNameL, entryText: 'Modifiers on L. Click:', flags: MF_GRAYED });
			menu.newEntry({ menuName: subMenuNameL, entryText: '(on Action Button)', flags: MF_GRAYED });
			menu.newSeparator(subMenuNameL);
			modifiers.forEach((modifier) => {
				const subMenuOption = menu.newMenu(modifier, subMenuNameL);
				actions.forEach((action) => {
					const flags = modifier === 'Double Click' && action === 'Multiple selection' || !list.isValidAction(action)
						? MF_GRAYED
						: MF_STRING;
					menu.newEntry({
						menuName: subMenuOption, entryText: action, func: () => {
							list.lShortcutsHeader[modifier] = action;
							list.properties['lShortcutsHeader'][1] = JSON.stringify(list.lShortcutsHeader);
							overwriteProperties(list.properties);
							if (action === 'Multiple selection') {
								fb.ShowPopupMessage('Allows to select multiple playlists at the same time and execute a shortcut action for every item. i.e. Loading playlist, locking, etc.\n\nNote opening the playlist menu will show a limited list of available actions according to the selection. To display the entire menu, use single selection instead. ', window.Name + _ps(window.ScriptInfo.Name));
							}
						}, flags
					});
				});
				menu.newCheckMenuLast(() => {
					const idx = actions.indexOf(list.lShortcutsHeader[modifier]);
					return (idx !== -1 ? idx : 0);
				}, actions.length);
			});
			menu.newSeparator(subMenuNameL);
			menu.newEntry({
				menuName: subMenuNameL, entryText: 'Restore defaults', func: () => {
					list.properties['lShortcutsHeader'][1] = list.defaultProperties['lShortcutsHeader'][3];
					list.lShortcutsHeader = JSON.parse(list.properties['lShortcutsHeader'][1]);
					overwriteProperties(list.properties);
				}
			});
		}
		{	// Header M. Click
			const subMenuNameM = menu.newMenu('Middle Click (header)', subMenuName);
			const shortcuts = list.getDefaultShortcuts('M', 'HEADER');
			const modifiers = shortcuts.options.map((_) => { return _.key; });
			const actions = shortcuts.actions.map((_) => { return _.key; });
			menu.newEntry({ menuName: subMenuNameM, entryText: 'Modifiers on M. Click:', flags: MF_GRAYED });
			menu.newEntry({ menuName: subMenuNameM, entryText: '(on Action Button)', flags: MF_GRAYED });
			menu.newSeparator(subMenuNameM);
			modifiers.forEach((modifier) => {
				const subMenuOption = menu.newMenu(modifier, subMenuNameM);
				actions.forEach((action) => {
					const flags = !list.isValidAction(action) ? MF_GRAYED : MF_STRING;
					menu.newEntry({
						menuName: subMenuOption, entryText: action, func: () => {
							list.mShortcutsHeader[modifier] = action;
							list.properties['mShortcutsHeader'][1] = JSON.stringify(list.mShortcutsHeader);
							overwriteProperties(list.properties);
							if (action === 'Multiple selection') {
								fb.ShowPopupMessage('Allows to select multiple playlists at the same time and execute a shortcut action for every item. i.e. Loading playlist, locking, etc.\n\nNote opening the playlist menu will show a limited list of available actions according to the selection. To display the entire menu, use single selection instead. ', window.Name + _ps(window.ScriptInfo.Name));
							}
						}, flags
					});
				});
				menu.newCheckMenuLast(() => {
					const idx = actions.indexOf(list.mShortcutsHeader[modifier]);
					return (idx !== -1 ? idx : 0);
				}, actions.length);
			});
			menu.newSeparator(subMenuNameM);
			menu.newEntry({
				menuName: subMenuNameM, entryText: 'Restore defaults', func: () => {
					list.properties['mShortcutsHeader'][1] = list.defaultProperties['mShortcutsHeader'][3];
					list.mShortcutsHeader = JSON.parse(list.properties['mShortcutsHeader'][1]);
					overwriteProperties(list.properties);
				}
			});
		}
		menu.newSeparator(subMenuName);
		{	// Keyboard
			menu.newEntry({
				menuName: subMenuName, entryText: 'Enable F1-F12 keyboard actions', func: () => {
					list.properties.bGlobalShortcuts[1] = !list.properties.bGlobalShortcuts[1];
					overwriteProperties(list.properties);
					if (list.properties.bGlobalShortcuts[1]) { fb.ShowPopupMessage(list.listGlobalShortcuts(), window.Name + _ps(window.ScriptInfo.Name)); }
				}
			});
			menu.newCheckMenuLast(() => list.properties.bGlobalShortcuts[1]);
		}
		menu.newSeparator(subMenuName);
		menu.newEntry({
			menuName: subMenuName, entryText: 'Double click timer...', func: () => {
				let input = Input.number('int positive', list.iDoubleClickTimer, 'Enter ms:\nHigher values will delay more single clicking actions.', window.Name + _ps(window.ScriptInfo.Name), 300);
				if (input === null) { return; }
				if (!Number.isFinite(input)) { return; }
				list.iDoubleClickTimer = list.properties.iDoubleClickTimer[1] = input;
				if (WshShell.Popup('Update tooltip timer?\n(Dbl. Click timer x2)', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no) === popup.yes) {
					list.properties.iTooltipTimer[1] = input * 2;
					list.tooltip.SetDelayTime(0, list.properties.iTooltipTimer[1]); // TTDT_AUTOMATIC
				}
				overwriteProperties(list.properties);
			}
		});
		menu.newSeparator(subMenuName);
		menu.newEntry({
			menuName: subMenuName, entryText: 'Restore defaults (all)', func: () => {
				['lShortcuts', 'mShortcuts', 'lShortcutsHeader', 'mShortcutsHeader'].forEach((key) => {
					list.properties[key][1] = list.defaultProperties[key][3];
					list[key] = JSON.parse(list.properties[key][1]);
				});
				overwriteProperties(list.properties);
			}
		});
	}
	{	// Enabled menus
		const showMenus = JSON.parse(list.properties.showMenus[1]);
		const subMenuName = menu.newMenu('Features');
		menu.newEntry({ menuName: subMenuName, entryText: 'Menu entries / Features enabled:', flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		Object.keys(showMenus).forEach((key) => {
			if (list.bLiteMode && list.liteMenusOmit.includes(key)) { return; }
			menu.newEntry({
				menuName: subMenuName, entryText: key, func: () => {
					list.updateMenus({ menus: { [key]: !showMenus[key] } });
				}
			});
			menu.newCheckMenuLast(() => showMenus[key]);
		});
		menu.newSeparator(subMenuName);
		{ // Presets
			const defOpts = JSON.parse(list.properties.showMenus[3]);
			const options = [
				{
					name: 'Full',
					options: Object.fromEntries(Object.keys(showMenus).map((k) => [k, true]))
				},
				{
					name: 'Basic',
					options: { ...defOpts, ...Object.fromEntries(['Tags', 'Relative paths handling', 'Export and copy', 'Online sync', 'Statistics mode'].map((k) => [k, false])) }
				},
				{
					name: 'Online Sync',
					options: { 'Online sync': true, 'Relative paths handling': false, 'Export and copy': false, 'File locks': false, 'UI playlist locks': false, 'Statistics mode': false, 'Sorting': false }
				},
			];
			const subMenuNameTwo = menu.newMenu('Presets', subMenuName);
			options.forEach((preset) => {
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: preset.name, func: () => {
						list.updateMenus({ menus: preset.options });
					}
				});
			});
		}
		menu.newSeparator(subMenuName);
		menu.newEntry({
			menuName: subMenuName, entryText: 'Restore defaults', func: () => {
				list.updateMenus({ menus: JSON.parse(list.properties.showMenus[3]) });
			}
		});
	}
	{	// Integration
		const menuName = menu.newMenu('Integration');
		{	// Dynamic menus
			const flags = isCompatible('1.6.1', 'smp') || isCompatible('3.6.1', 'jsplitter') ? MF_STRING : MF_GRAYED;
			const subMenuName = menu.newMenu('Create dynamic menus', menuName);
			const options = ['No: don\'t integrate the panel in main menu', 'Yes: for usage on UI buttons', 'Yes: for CMD, foo_httpcontrol (ajquery-xxx), ...'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuName, entryText: 'File\\Spider Monkey Panel\\Script commands:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuName, entryText: item, func: () => {
						list.iDynamicMenus = i;
						if (list.iDynamicMenus > 0) {
							fb.ShowPopupMessage('Remember to set different panel names to every Playlist Manager panel, otherwise menus will not be properly associated to a single panel.\n\nShift + Win + R. Click -> Configure panel... (\'edit\' at top)\n\nPlaylists tagged with \'bMultMenu\' will be associated to these special\nmenu entries:\n\t-Load tagged playlists\n\t-Clone tagged playlists in UI', window.Name + _ps(window.ScriptInfo.Name));
						}
						list.properties['iDynamicMenus'][1] = list.iDynamicMenus;
						overwriteProperties(list.properties);
						// And create / delete menus
						if (list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => { list.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync(); }); }
						else { list.deleteMainMenuDynamic(); list.deleteExportInfo(); list.listenNames = false; }
						if (folders.ajqueryCheck()) { exportComponents(folders.ajquerySMP); }
					}, flags
				});
			});
			menu.newCheckMenuLast(() => list.iDynamicMenus, optionsLength);
		}
		if (showMenus['Online sync']) {	// ListenBrainz
			const subMenuName = menu.newMenu('ListenBrainz', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Set token...', func: async () => { return checkLBToken(''); } });
			menu.newCheckMenuLast(() => !!list.properties.lBrainzToken[1].length);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Retrieve token from other panels...', func: () => {
					callbacksListener.lBrainzTokenListener = true;
					let cache = { token: list.properties.lBrainzToken[1], encrypted: list.properties.lBrainzEncrypt[1] };
					window.NotifyOthers('xxx-scripts: lb token', null);
					setTimeout(() => {
						callbacksListener.lBrainzTokenListener = false;
						fb.ShowPopupMessage('ListenBrainz token report:\n\nOld value:  ' + cache.toStr({ bClosure: true }) + '\nNew value:  ' + { token: list.properties.lBrainzToken[1], encrypted: list.properties.lBrainzEncrypt[1] }.toStr({ bClosure: true }), window.Name + _ps(window.ScriptInfo.Name));
					}, 1500);
				}
			});
			menu.newEntry({
				menuName: subMenuName, entryText: 'Open user profile' + (bListenBrainz ? '' : '\t(token not set)'), func: async () => {
					if (!await checkLBToken()) { return; }
					const token = bListenBrainz ? lb.decryptToken({ lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1] }) : null;
					if (!token) { return false; }
					const user = await lb.retrieveUser(token);
					if (user.length) { _runCmd('CMD /C START https://listenbrainz.org/user/' + user + '/playlists/', false); }
				}, flags: bListenBrainz ? MF_STRING : MF_GRAYED
			});
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Lookup for missing track MBIDs', func: () => {
					list.properties.bLookupMBIDs[1] = !list.properties.bLookupMBIDs[1];
					if (list.properties.bLookupMBIDs[1]) {
						fb.ShowPopupMessage('Exporting a playlist requires tracks to have \'MUSICBRAINZ_TRACKID\' tags on files.\n\nWhenever such tag is missing, the file can not be sent to ListenBrainz\'s online playlist. As workaround, the script may try to lookup missing MBIDs before exporting.\n\nNote results depend on the success of MusicBrainz api, so it\'s not guaranteed to find the proper match in all cases. Tag properly your files with Picard or foo_musicbrainz in such case.\n\nApi used:\nhttps://labs.api.listenbrainz.org/mbid-mapping', window.Name + _ps(window.ScriptInfo.Name));
					}
					overwriteProperties(list.properties);
				}, flags: bListenBrainz ? MF_STRING : MF_GRAYED
			});
			menu.newCheckMenuLast(() => list.properties.bLookupMBIDs[1]);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Export playlists to Spotify', func: () => {
					list.properties.bSpotify[1] = !list.properties.bSpotify[1];
					if (list.properties.bSpotify[1]) {
						fb.ShowPopupMessage('Exporting a playlist to Spotify requires the service to be connected to your user profile, and \'Play music on ListenBrainz\' enabled.\n\nMore info: https://listenbrainz.org/profile/music-services/details/', window.Name + _ps(window.ScriptInfo.Name));
						const token = bListenBrainz ? lb.decryptToken({ lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1] }) : null;
						if (token) {
							lb.retrieveUser(token).then((user) => lb.getUserServices(user, token)).then((services) => {
								if (!services.includes('spotify')) {
									fb.ShowPopupMessage('Spotify\'s service is not connected.\n\nMore info: https://listenbrainz.org/profile/music-services/details/', window.Name + _ps(window.ScriptInfo.Name));
								}
							});
						}
					}
					overwriteProperties(list.properties);
				}, flags: bListenBrainz ? MF_STRING : MF_GRAYED
			});
			menu.newCheckMenuLast(() => list.properties.bSpotify[1]);
		}
		{	// Startup active playlist
			const nameUI = plman.GetPlaylistName(plman.ActivePlaylist);
			const idx = list.dataAll.findIndex((pls) => { return pls.nameId === nameUI; });
			const name = idx !== -1 ? list.dataAll[idx].name : nameUI;

			const subMenuName = menu.newMenu('Startup active playlist', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Set active playlist at startup:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Current playlist', func: () => {
					list.activePlsStartup = list.activePlsStartup === name ? '' : name;
					list.properties.activePlsStartup[1] = list.activePlsStartup;
					overwriteProperties(list.properties);
					window.NotifyOthers(window.ScriptInfo.Name + ': change startup playlist', list.activePlsStartup);
				}, flags: plman.ActivePlaylist !== -1 ? MF_STRING : MF_GRAYED
			});
			menu.newCheckMenuLast(() => (list.activePlsStartup === name));
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'By name...', func: () => {
					const input = Input.string('string', list.activePlsStartup, 'Input playlist name: (empty to disable)\n\nIn case the playlist is present on the manager, it\'s required to set \'bAutoLoad\' tag on playlist file to load it on startup too (otherwise playlist will not be loaded on startup).', 'Playlist Manager', 'My playlist');
					if (input === null) { return; }
					list.activePlsStartup = input;
					list.properties.activePlsStartup[1] = list.activePlsStartup;
					overwriteProperties(list.properties);
					window.NotifyOthers(window.ScriptInfo.Name + ': change startup playlist', list.activePlsStartup);
				}, flags: plman.ActivePlaylist !== -1 ? MF_STRING : MF_GRAYED
			});
			menu.newCheckMenuLast(() => (list.activePlsStartup.length !== 0 && list.activePlsStartup !== name));
		}
		{	// Startup auto-delete playlist
			const subMenuName = menu.newMenu('Startup auto-delete playlists', menuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Delete playlists at startup:', flags: MF_GRAYED });
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'By name...', func: () => {
					const input = Input.json('array strings', list.deletePlsStartup, 'Input playlist names:\n(JSON)\n\nRegExp are allowed in /[expression]/[flags] form. For ex: \\library\\i', 'Playlist Manager', '["Filter results", "Library viewer"]', void (0), true);
					if (input === null) { return; }
					list.deletePlsStartup = input;
					list.properties.deletePlsStartup[1] = JSON.stringify(list.deletePlsStartup);
					overwriteProperties(list.properties);
				}
			});
			menu.newCheckMenuLast(() => list.deletePlsStartup.length !== 0);
			menu.newSeparator(subMenuName);
			menu.newEntry({
				menuName: subMenuName, entryText: 'Also delete playlist file', func: () => {
					list.properties.deletePlsStartupFiles[1] = !list.properties.deletePlsStartupFiles[1];
					overwriteProperties(list.properties);
				}, flags: list.deletePlsStartup.length ? MF_STRING : MF_GRAYED
			});
			menu.newCheckMenuLast(() => list.deletePlsStartup.length !== 0 && list.properties.deletePlsStartupFiles[1]);
		}
	}
	{
		menu.newSeparator();
		const subMenuName = menu.newMenu('Logging');
		[
			{ key: 'autoSize', entryText: 'Autoplaylists updates' },
			{ key: 'loadPls', entryText: 'Load playlist' },
			{ key: 'profile', entryText: 'Global profiling' },
			{ key: 'mainMenu', entryText: 'Dynamic menus' },
		].forEach((opt) => {
			menu.newEntry({
				menuName: subMenuName, entryText: opt.entryText, func: () => {
					list.logOpt[opt.key] = !list.logOpt[opt.key];
					list.properties['logOpt'][1] = JSON.stringify(list.logOpt);
					overwriteProperties(list.properties);
				}
			});
			menu.newCheckMenuLast(() => list.logOpt[opt.key]);
		});
	}
	{
		const menuName = menu.newMenu('Updates');
		menu.newEntry({
			menuName, entryText: 'Automatically check for updates', func: () => {
				list.properties.bAutoUpdateCheck[1] = !list.properties.bAutoUpdateCheck[1];
				overwriteProperties(list.properties);
				if (list.properties.bAutoUpdateCheck[1]) {
					if (typeof checkUpdate === 'undefined') { include('..\\..\\helpers\\helpers_xxx_web_update.js'); }
					setTimeout(checkUpdate, 1000, { bDownload: globSettings.bAutoUpdateDownload, bOpenWeb: globSettings.bAutoUpdateOpenWeb, bDisableWarning: false });
				}
			}
		});
		menu.newCheckMenuLast(() => list.properties.bAutoUpdateCheck[1]);
		menu.newSeparator(menuName);
		menu.newEntry({
			menuName, entryText: 'Check for updates...', func: () => {
				if (typeof checkUpdate === 'undefined') { include('..\\..\\helpers\\helpers_xxx_web_update.js'); }
				checkUpdate({ bDownload: globSettings.bAutoUpdateDownload, bOpenWeb: globSettings.bAutoUpdateOpenWeb, bDisableWarning: false })
					.then((bFound) => !bFound && fb.ShowPopupMessage('No updates found.', window.Name + _ps(window.ScriptInfo.Name) + ': Update check'));
			}
		});
	}
	menu.newSeparator();
	menu.newEntry({
		entryText: 'Lite mode', func: () => {
			fb.ShowPopupMessage('By default Playlist Manager is installed with a myriad of features and the ability to manage playlist files.\nSome users may be looking for a simple foo_plorg replacement, in which case lite mode should be enabled.\n\nNote on lite mode, manager exclusively tracks UI-only playlists.', window.Name + _ps(window.ScriptInfo.Name));
			list.bLiteMode = !list.bLiteMode;
			list.properties['bLiteMode'][1] = list.bLiteMode;
			if (list.bLiteMode) {
				// Menus
				const menus = Object.fromEntries([...list.liteMenusOmit, 'Tags', 'Online sync', 'Statistics mode'].map((k) => [k, false]));
				list.updateMenus({ menus, bSave: false, bOverrideDefaults: true });
				// Other tools
				if (list.searchInput) {
					list.searchMethod.bPath = list.searchMethod.bRegExp = list.searchMethod.bMetaPls = false;
					list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
				}
				// Auto-save
				list.properties.autoSave[1] = 1000;
				debouncedUpdate = debounce(list.updatePlaylist, list.properties.autoSave[1]); // NOSONAR [shared on files]
				// Timeouts
				list.properties.delays[1] = JSON.stringify({
					playlistLoading: 0,
					startupPlaylist: 1000,
					dynamicMenus: 2500,
					playlistCache: 6000,
				});
				// Tracking
				list.bAllPls = list.properties.bAllPls[1] = true;
				overwriteProperties(list.properties);
				clearInterval(autoUpdateRepeat);
				list.switchTracking(false);
				// Auto-Backup
				clearInterval(autoBackRepeat);
				// Sorting
				list.changeSorting(list.manualMethodState());
				// Instances
				instances.remove(window.ScriptInfo.Name);
			} else {
				list.updateMenus({ menus: list.showMenusDef, bSave: false, bOverrideDefaults: true }); // Restore default values from init
				list.properties.autoSave[1] = list.properties.autoSave[3];
				list.properties.delays[1] = list.properties.delays[3];
				overwriteProperties(list.properties);
				const autoBackTimer = Number(list.properties.autoBack[1]);
				autoBackRepeat = autoBackTimer && isFinite(autoBackTimer) // NOSONAR [shared on files]
					? repeatFn(backup, autoBackTimer)(list.properties.autoBackN[1])
					: null;
				const autoUpdateTimer = Number(list.properties.autoUpdate[1]);
				autoUpdateRepeat = autoUpdateTimer && isFinite(autoUpdateTimer) // NOSONAR [shared on files]
					? repeatFn(debouncedAutoUpdate, autoUpdateTimer)()
					: null;
				debouncedUpdate = debounce(list.updatePlaylist, list.properties.autoSave[1]);
				instances.add(window.ScriptInfo.Name);
				list.switchTracking(true, false, false);
			}
			// Copy data
			const toDelete = [];
			const toCopy = [];
			const toMerge = [];
			const newFile = folders.data + 'playlistManager_' +
				(list.bLiteMode ? list.uuid : list.playlistsPathDirName.replace(':', '')) + '.json';
			toDelete.push(newFile, newFile + '.old');
			toCopy.push({ from: list.filename, to: newFile });
			toMerge.push({ from: newFile, to: list.filename, type: 'pls' });
			const sortingFile = list.filename.replace('.json', '_sorting.json');
			const newSortingFile = newFile.replace('.json', '_sorting.json');
			toDelete.push(newSortingFile, newSortingFile + '.old');
			if (_isFile(sortingFile)) {
				toCopy.push({ from: sortingFile, to: newSortingFile });
			}
			toMerge.forEach((d) => {
				d.file = d.from;
				d.from = _isFile(d.from) ? _jsonParseFileCheck(d.from, 'Data json', window.Name + _ps(window.ScriptInfo.Name), utf8) : null;
			});
			toDelete.forEach((f) => _recycleFile(f, true));
			toCopy.forEach((f) => _copyFile(f.from, f.to));
			toMerge.forEach((d) => {
				if (d.from) {
					let bDone = false;
					d.to = _jsonParseFileCheck(d.to, 'Data json', window.Name + _ps(window.ScriptInfo.Name), utf8);
					if (!d.to) {
						console.popup('Error restoring old playlists data from:\n' + d.file, window.Name + _ps(window.ScriptInfo.Name));
						return;
					}
					switch (d.type) { // NOSONAR
						case 'pls': {
							for (const pls of d.from) {
								if (!d.to.find((oldPls) => list.comparePls(oldPls, pls))) {
									d.to.push(pls);
									bDone = true;
								}
							}
						}
					}
					if (bDone) {
						_recycleFile(d.file + '.old', true);
						_copyFile(d.file, d.file + '.old');
						_save(d.file, JSON.stringify(d.to, list.replacer, '\t'), list.bBOM);
					}
				}
			});
			// Reset
			list.init();
		}
	});
	menu.newCheckMenuLast(() => list.bLiteMode);
	if (showMenus['Statistics mode']) {
		menu.newEntry({
			entryText: 'Statistics mode', func: () => {
				stats.bEnabled = !stats.bEnabled;
				list.properties['bStatsMode'][1] = stats.bEnabled;
				if (stats.bEnabled) { stats.init(); }
				overwriteProperties(list.properties);
				list.updateUIElements(); // Buttons, etc.
			}
		});
		menu.newCheckMenuLast(() => stats.bEnabled);
	}
	menu.newSeparator();
	menu.newEntry({ entryText: 'Open playlists folder...', func: () => { _explorer(list.playlistsPath); } });
	{	// Readme
		const path = folders.xxx + 'readmes\\playlist_manager.pdf';
		menu.newEntry({
			entryText: 'Open documentation...', func: () => {
				if (_isFile(path)) {
					const bDone = _run(path);
					if (!bDone) { _explorer(path); }
				} else { console.log('Playlist Manager: Readme not found\n\t ' + path); }
			}
		});
	}
	return menu;
}

function createMenuRightSort() {
	// Constants
	const menu = menuRbtnSort;
	menu.clear(true); // Reset one every call
	// Entries
	{	// Sorting
		const options = Object.keys(list.sortMethods(false)).slice(0, -1)
			.sort((a, b) => a.localeCompare(b, void (0), { sensitivity: 'base', numeric: true }))
			.concat(['sep', list.manualMethodState()]);
		menu.newEntry({ entryText: 'Change sorting method:', flags: MF_GRAYED });
		menu.newSeparator();
		options.forEach((item) => {
			if (menu.isSeparator(item)) { menu.newSeparator(); return; }
			menu.newEntry({
				entryText: item, func: () => {
					list.changeSorting(item);
				}
			});
		});
		menu.newCheckMenuLast((o) => o.indexOf(list.methodState), options);
	}
	return menu;
}

function createMenuRightFilter(buttonKey) {
	// Constants
	const menu = menuRbtnSort;
	menu.clear(true); // Reset one every call
	// Entries
	{	// Filter
		const options = list.availableFilters();
		const optionsLength = options.length;
		menu.newEntry({ entryText: 'Change filtering method:', flags: MF_GRAYED });
		menu.newSeparator();
		if (optionsLength) {
			options.forEach((item) => {
				menu.newEntry({
					entryText: item, func: () => {
						// Switch buttons if they are duplicated
						const buttonsArr = Object.entries(bottomToolbar.buttons);
						const idx = buttonsArr.findIndex((pair) => { return pair[0] !== buttonKey && pair[1].method === item; });
						if (idx !== -1) { bottomToolbar.buttons[buttonsArr[idx][0]].method = bottomToolbar.buttons[buttonKey].method; }
						// Set new one
						bottomToolbar.buttons[buttonKey].method = item;
						// Resize buttons
						bottomToolbar.recalcWidth();
						// Save properties
						list.properties['filterMethod'][1] = Object.values(bottomToolbar.buttons).map((button) => { return (Object.hasOwn(button, 'method') ? button.method : ''); }).filter(Boolean).join(',');
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => options.indexOf(bottomToolbar.buttons[buttonKey].method), optionsLength);
		}
	}
	menu.newSeparator();
	{
		menu.newEntry({
			entryText: 'Reset also applies to search', func: () => {
				list.searchMethod.bResetFilters = !list.searchMethod.bResetFilters;
				list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
				overwriteProperties(list.properties);
			}, flags: list.searchInput ? MF_STRING : MF_GRAYED
		});
		menu.newCheckMenuLast(() => list.searchMethod.bResetFilters);
	}
	menu.newSeparator();
	{	// Reset
		menu.newEntry({
			entryText: 'Reset all filters', func: () => {
				list.resetFilter();
			}
		});
	}
	return menu;
}

function createMenuSearch() {
	// Constants
	const menu = menuSearch;
	menu.clear(true); // Reset one every call
	// Enabled menus
	const showMenus = JSON.parse(list.properties.showMenus[1]);

	menu.newEntry({ entryText: 'Search filter:', func: null, flags: MF_GRAYED });
	menu.newSeparator();
	{
		if (list.searchHistory.length) {
			list.searchHistory.slice(-5).forEach((text) => {
				menu.newEntry({
					entryText: text.cut(20), func: () => {
						list.searchCurrent = list.searchInput.text = text;
						list.repaint();
						list.search();
					}
				});
			});
			menu.newSeparator();
			menu.newEntry({
				entryText: 'Clear history', func: () => {
					list.searchHistory.splice(0, Infinity);
				}
			});
		} else {
			menu.newEntry({ entryText: '- no search history -', func: null, flags: MF_GRAYED });
		}
	}
	menu.newSeparator();
	// Settings
	{	// Filter
		const subMenu = menu.newMenu('Settings');
		const options = [
			{ entryText: 'By playlist\'s name', key: 'bName' },
			showMenus['Tags'] ? { entryText: 'By playlist\'s tags', key: 'bTags' } : null,
			showMenus['Category'] ? { entryText: 'By playlist\'s category', key: 'bCategory' } : null,
			{ entryText: 'By tracks\' metadata (from playlist)', key: 'bMetaPls' },
			{ entryText: 'By tracks\' metadata (from tracks)', key: 'bMetaTracks' },
			{ entryText: 'By tracks\' path', key: 'bPath' },
			{ entryText: 'By query (applied to tracks)', key: 'bQuery' },
			{ entryText: 'By query (string search)', key: 'bMetaQuery' }
		].filter(Boolean).sort((a, b) => a.entryText.localeCompare(b.entryText, void (0), { sensitivity: 'base', numeric: true }));
		menu.newEntry({ menuName: subMenu, entryText: 'Change filtering method:', flags: MF_GRAYED });
		menu.newSeparator(subMenu);
		options.forEach((opt) => {
			menu.newEntry({
				menuName: subMenu, entryText: opt.entryText, func: () => {
					list.searchMethod[opt.key] = !list.searchMethod[opt.key];
					// Save properties
					list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
					overwriteProperties(list.properties);
					if (list.searchInput.text.length || list.searchInput.prevText.length) {
						list.search();
					}
					if (list.searchMethod[opt.key]) {
						if (opt.key === 'bPath') {
							fb.ShowPopupMessage(
								'This option performs an extended search looking into the playlist files for matches against the tracks file paths. The file and folder names are used.' +
								'\n\nIt may produce some lag while searching if there are a lot of playlists, so disable it if not needed.' +
								'\n\nFor ex:' +
								'\nSimon & Garfunkel\\Bookends {2014 HD Tracks HD886447698259}\\01 - Mrs. Robinson.flac' +
								'\nWould match a search containing \'HD Tracks\' or \'Robinson\' but not \'Simon\'.' +
								'\n\nDrag n\' drop integration:' +
								'\nWhen using drag n\' drop over the search input box, the filename(s) of the selected track(s) will be automatically parsed for quick-searching. RegExp is used to search for multiple filenames at the same time.'
								, window.Name + _ps(window.ScriptInfo.Name)
							);
						} else if (opt.key === 'bMetaPls') {
							fb.ShowPopupMessage(
								'This option performs an extended search retrieving track\'s metadata from the playlist file (available on .m3u8, .m3u, .xspf and .pls formats). It\'s much faster than the mode looking for the track\'s tags (specially at startup).' +
								'\n\nTags checked:' +
								'ARTIST (*), TITLE, DURATION' +
								'\n\n(*) Not available on .pls format.'
								, window.Name + _ps(window.ScriptInfo.Name)
							);
						} else if (opt.key === 'bMetaTracks' || opt.key === 'bQuery') {
							if (opt.key === 'bMetaTracks') {
								fb.ShowPopupMessage(
									'This option performs an extended search retrieving all tracks from playlists files and looking for matches according to tags.' +
									'\n\nIt may produce some lag while searching if there are a lot of playlists, so disable it if not needed. When enabled, playlists are cached at startup (may take up to 10 seconds after loading the panel), to greatly speed up the process. But note the cache is build after startup, so making the search filter permanent across sessions may impose a huge impact at loading time with this search mode enable. To account for this, enable the \'Reset search on startup\' option.' +
									'\n\nTags checked:' +
									list.searchMethod.meta.join(', ')
									, window.Name + _ps(window.ScriptInfo.Name)
								);
							} else {
								fb.ShowPopupMessage(
									'This option performs an extended search retrieving all tracks from playlists files and looking for matches by query. If the query returns at least a track, it\'s considered a match.' +
									'\n\nIt may produce some lag while searching if there are a lot of playlists, so disable it if not needed. When enabled, playlists are cached at startup (may take up to 10 seconds after loading the panel), to greatly speed up the process. But note the cache is build after startup, so making the search filter permanent across sessions may impose a huge impact at loading time with this search mode enable. To account for this, enable the \'Reset search on startup\' option.'
									, window.Name + _ps(window.ScriptInfo.Name)
								);
							}
							Promise.serial(list.dataAll.filter((pls) => !pls.isAutoPlaylist), cachePlaylist.bind(list), 100)
								.then(() => console.log('Playlist Manager: Cached playlists for searching'));
						}
					}
				}
			});
			menu.newCheckMenuLast(() => list.searchMethod[opt.key]);
		});
		menu.newSeparator(subMenu);
		{
			const subMenuTwo = menu.newMenu('Drag n\' drop', subMenu);
			const max = list.searchMethod.dragDropPriority.length;
			menu.newEntry({ menuName: subMenuTwo, entryText: 'Method used by priority:', func: null, flags: MF_GRAYED });
			menu.newSeparator(subMenuTwo);
			list.searchMethod.dragDropPriority.forEach((method, i) => {
				menu.newEntry({
					menuName: subMenuTwo, entryText: (i + 1) + '. ' + capitalize(method.replace(/^b/, '').replace(/MetaTracks/, 'track tags')) + (!list.searchMethod[method] ? '\t(disabled)' : ''), func: () => {
						let input = Input.number('int positive', (i + 1), 'Enter position: (between 1 and ' + max + ')', window.Name + _ps(window.ScriptInfo.Name), 1, [(n) => n >= 1 && n <= max]);
						if (input === null) { return; }
						else { input -= 1; }
						const el = list.searchMethod.dragDropPriority.splice(i, 1);
						list.searchMethod.dragDropPriority.splice(input, 0, el[0]);
						list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
						overwriteProperties(list.properties);
					},
					flags: list.searchMethod[method] ? MF_STRING : MF_GRAYED
				});
			});
			menu.newSeparator(subMenuTwo);
			menu.newEntry({
				menuName: subMenuTwo, entryText: 'Query tags...', func: () => {
					const input = Input.json(
						'array strings',
						list.searchMethod.dragDropTags,
						'Enter tag(s) or TF expression(s):\n(JSON)',
						window.Name + _ps(window.ScriptInfo.Name),
						'["$ascii($lower($trim(%TITLE%)))","ARTIST","$year(%DATE%)"]',
						void (0),
						true
					);
					if (input === null) { return; }
					list.searchMethod.dragDropTags = input;
					list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
					overwriteProperties(list.properties);
				}
			});
		}
		if (showMenus['Quick-search']) {	// QuickSearch
			menu.newSeparator(subMenu);
			quickSearchMenu(menu, subMenu);
		}
		menu.newSeparator(subMenu);
		menu.newEntry({
			menuName: subMenu, entryText: 'Path level matching...' + '\t' + _b(list.searchMethod.pathLevel), func: () => {
				let input = Input.number('int positive', list.searchMethod.pathLevel, 'Enter path level to search matches:', window.Name + _ps(window.ScriptInfo.Name), 2);
				if (input === null) { return; }
				list.searchMethod.pathLevel = input;
				list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
				overwriteProperties(list.properties);
			}
		});
		menu.newSeparator(subMenu);
		menu.newEntry({
			menuName: subMenu, entryText: 'Auto-search', func: () => {
				list.searchMethod.bAutoSearch = !list.searchMethod.bAutoSearch;
				list.searchInput.autoValidation = list.searchMethod.bAutoSearch;
				list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
				overwriteProperties(list.properties);
				if (list.searchInput.autoValidation && list.searchInput.text.length || list.searchInput.prevText.length) {
					list.search();
				}
			}
		});
		menu.newCheckMenuLast(() => list.searchMethod.bAutoSearch);
		menu.newEntry({
			menuName: subMenu, entryText: 'Parse input as RegExp', func: () => {
				list.searchMethod.bRegExp = !list.searchMethod.bRegExp;
				list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
				overwriteProperties(list.properties);
				if (list.searchInput.autoValidation && list.searchInput.text.length || list.searchInput.prevText.length) {
					list.search();
				}
				if (list.searchMethod.bRegExp) {
					fb.ShowPopupMessage(
						'This option will parse all input as RegExp. The default flag, unless otherwise specified, is \'i\'. For ex:' +
						'\n\n\'Top\', \'top\' and /Top/ would match \'Top tracks\' but /top/ would not, since the first 2 queries are case insensitive but the rest are not. Searching for \'top\' or \'Top\' is thus equivalent to /top/i.' +
						'\n\nFor more info see:' +
						'\nhttps://regexr.com/'
						, window.Name + _ps(window.ScriptInfo.Name)
					);
				}
			}
		});
		menu.newCheckMenuLast(() => list.searchMethod.bRegExp);
		menu.newEntry({
			menuName: subMenu, entryText: 'Advanced fuzzy search (~)', func: () => {
				fb.ShowPopupMessage(
					'Fuzzy search may be enabled adding \'~\' to the beginning/end of the string.\nFor ex:\n\t"smmer~"\t-> Would match "summer"\n\nThe basic fuzzy search will only match simple words, but not sentences. Enable the advanced fuzzy search for those use cases (it will use an external library and may be slower).'
					, window.Name + _ps(window.ScriptInfo.Name)
				);
				list.searchMethod.bSimpleFuzzy = !list.searchMethod.bSimpleFuzzy;
				list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
				list.checkConfigPostUpdate();
				if (list.searchInput.autoValidation && list.searchInput.text.length || list.searchInput.prevText.length) {
					list.search();
				}
				overwriteProperties(list.properties);
			}
		});
		menu.newCheckMenuLast(() => !list.searchMethod.bSimpleFuzzy);
		menu.newSeparator(subMenu);
		menu.newEntry({
			menuName: subMenu, entryText: 'Reset along button filters', func: () => {
				list.searchMethod.bResetFilters = !list.searchMethod.bResetFilters;
				if (!list.bSaveFilterStates) { list.searchMethod.bResetStartup = list.searchMethod.bResetFilters; }
				list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
				overwriteProperties(list.properties);
			}
		});
		menu.newCheckMenuLast(() => list.searchMethod.bResetFilters);
		menu.newEntry({
			menuName: subMenu, entryText: 'Reset search on startup' + (!list.bSaveFilterStates && list.searchMethod.bResetFilters ? '\t[forced]' : ''), func: () => {
				list.searchMethod.bResetStartup = !list.searchMethod.bResetStartup;
				list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
				overwriteProperties(list.properties);
			}, flags: !list.bSaveFilterStates && list.searchMethod.bResetFilters ? MF_GRAYED : MF_STRING
		});
		menu.newCheckMenuLast(() => list.searchMethod.bResetStartup);
		menu.newSeparator(subMenu);
		{	// Restore
			menu.newEntry({
				menuName: subMenu, entryText: 'Restore defaults', func: () => {
					list.properties.searchMethod[1] = list.properties.searchMethod[3];
					list.searchMethod = JSON.parse(list.properties.searchMethod[1]);
					overwriteProperties(list.properties);
				}
			});
		}
	}
	return menu;
}

function createMenuFilterSorting() {
	// Constants
	const menu = menuFilterSorting;
	menu.clear(true); // Reset one every call
	const buttonKey = 'filterOneButton';
	// Enabled menus
	const showMenus = JSON.parse(list.properties.showMenus[1]);
	// Entries
	{	// Sorting method
		const subMenuName = menu.newMenu('Sorting method');
		const options = Object.keys(list.sortMethods(false)).slice(0, -1)
			.sort((a, b) => a.localeCompare(b, void (0), { sensitivity: 'base', numeric: true }))
			.concat(['sep', list.manualMethodState()]);
		menu.newEntry({ menuName: subMenuName, entryText: 'Change sorting method:', flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		options.forEach((item) => {
			if (menu.isSeparator(item)) { menu.newSeparator(subMenuName); return; }
			menu.newEntry({
				menuName: subMenuName,
				entryText: item, func: () => {
					list.changeSorting(item);
				}
			});
		});
		menu.newCheckMenuLast((o) => o.indexOf(list.methodState), options);
	}
	{	// Sorting
		const subMenuName = menu.newMenu('Sorting order');
		menu.newEntry({ menuName: subMenuName, entryText: 'Change sorting order:', flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		const options = ['Natural sorting', 'Inverse sorting'];
		options.forEach((item) => {
			menu.newEntry({ menuName: subMenuName, entryText: item, func: bottomToolbar.buttons.sortButton.func });
		});
		menu.newCheckMenuLast(() => list.getIndexSortState(), options);
	}
	menu.newSeparator();
	{
		const subMenuName = menu.newMenu('Other sorting tools');
		menu.newEntry({
			menuName: subMenuName,
			entryText: 'Apply current sorting to playlist tabs', func: () => {
				const plsNames = range(0, plman.PlaylistCount - 1).map((i) => plman.GetPlaylistName(i));
				const bHasFolders = list.itemsFolder !== 0 && showMenus['Folders'];
				if (list.getMethodState() === 'By name' && !bHasFolders) {
					plman.SortPlaylistsByName(list.getSortState() === 'Az' ? 1 : -1);
				} else {
					let data = clone(list.dataAll).map((item) => {
						if (item.isFolder) { item.isOpen = true; }
						return item;
					});
					data = list.processFolders({ data })
						.filter((item) => !item.isFolder);
					const plsDataNames = data.map((pls) => pls.nameId).filter((name) => plsNames.includes(name));
					for (let i = plman.PlaylistCount - 1; i >= 0; i--) {
						const idx = plsDataNames.indexOf(plsNames[i]);
						if (idx !== -1) {
							if (idx === i) { continue; }
							const lookFor = plsDataNames[i];
							if (typeof lookFor !== 'undefined') {
								const lookForIdx = plsNames.indexOf(lookFor);
								plman.MovePlaylist(lookForIdx, i);
								plsNames.splice(i, 0, plsNames.splice(lookForIdx, 1)[0]);
							}
						}
					}
				}
				console.log(
					'Playlist Manager: sorted playlist tabs in U. ' + list.getMethodState() + ' ' + _p(list.getSortState()) +
					(bHasFolders ? ' following folder tree' : '') + '.\n\t ' +
					plsNames.map((name, i) => _b(i) + ' ' + name).join(', ')
				);
			}, flags: list.bAllPls ? MF_STRING : MF_GRAYED
		});
		menu.newEntry({
			menuName: subMenuName,
			entryText: 'Alphabetically sort playlist tabs', func: () => {
				const bShift = utils.IsKeyPressed(VK_SHIFT);
				plman.SortPlaylistsByName(bShift ? -1 : 1);
				console.log(
					'Playlist Manager: sorted playlist tabs in UI. By name ' + _p(bShift ? 'Za' : 'Az') + '.\n\t ' +
					range(0, plman.PlaylistCount - 1).map((i) => _b(i) + ' ' + plman.GetPlaylistName(i)).join(', ')
				);
			}
		});
	}
	menu.newSeparator();
	if (showMenus['Category']) {	// Category Filter
		const subMenuName = menu.newMenu('Categories shown');
		const options = list.categories();
		const defOpt = options[0];
		menu.newEntry({ menuName: subMenuName, entryText: 'Toggle (click) / Single (Shift + click):', func: null, flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		menu.newEntry({
			menuName: subMenuName, entryText: 'Restore all', func: () => {
				list.filter({ categoryState: options });
			}
		});
		menu.newSeparator(subMenuName);
		const iInherit = (list.categoryState.length === 1 && list.categoryState[0] !== defOpt ? options.indexOf(list.categoryState[0]) : -1);
		options.forEach((item, i) => {
			const count = list.data.reduce((total, pls) => { return (pls.category === (i === 0 ? '' : item) ? total + 1 : total); }, 0);
			menu.newEntry({
				menuName: subMenuName, entryText: item + '\t' + (i === iInherit ? '-inherit- ' : '') + _b(count), func: () => {
					let categoryState;
					// Disable all other tags when pressing shift
					if (utils.IsKeyPressed(VK_SHIFT)) {
						categoryState = [item];
					} else {
						categoryState = list.categoryState.includes(item)
							? list.categoryState.filter((category) => category !== item)
							: (item === defOpt ? [defOpt, ...list.categoryState] : list.categoryState.concat([item]).sort());
					}
					list.filter({ categoryState });
				}
			});
			menu.newCheckMenuLast(() => list.categoryState.includes(item));
		});
	}
	if (showMenus['Tags']) {	// Tag Filter
		const subMenuName = menu.newMenu('Tags shown');
		const options = list.tags();
		const defOpt = options[0];
		menu.newEntry({ menuName: subMenuName, entryText: 'Toggle (click) / Single (Shift + click):', func: null, flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		menu.newEntry({
			menuName: subMenuName, entryText: 'Restore all', func: () => {
				list.filter({ tagState: options });
			}
		});
		menu.newSeparator(subMenuName);
		const bDef = list.tagState.includes(defOpt);
		options.forEach((item, i) => {
			const bInherit = !bDef && list.tagState.includes(item);
			const count = list.data.reduce((total, pls) => { return ((i === 0 ? pls.tags.length === 0 : pls.tags.includes(item)) ? total + 1 : total); }, 0);
			menu.newEntry({
				menuName: subMenuName, entryText: item + '\t' + (bInherit && i !== 0 ? '-inherit- ' : '') + _b(count), func: () => {
					let tagState;
					// Disable all other categories when pressing shift
					if (utils.IsKeyPressed(VK_SHIFT)) {
						tagState = [item];
					} else {
						tagState = list.tagState.includes(item) ? list.tagState.filter((tag) => { return tag !== item; }) : (item === defOpt ? [defOpt, ...list.tagState] : list.tagState.concat([item]).sort());
					}
					list.filter({ tagState });
				}
			});
			menu.newCheckMenuLast(() => list.tagState.includes(item));
		});
	}
	menu.newSeparator();
	{	// Filter
		const subMenuName = menu.newMenu('Filtering method');
		const options = list.availableFilters();
		const optionsLength = options.length;
		menu.newEntry({ menuName: subMenuName, entryText: 'Change filtering method:', flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		if (optionsLength) {
			options.forEach((item) => {
				menu.newEntry({
					menuName: subMenuName,
					entryText: item, func: () => {
						// Switch buttons if they are duplicated
						const buttonsArr = Object.entries(bottomToolbar.buttons);
						const idx = buttonsArr.findIndex((pair) => { return pair[0] !== buttonKey && pair[1].method === item; });
						if (idx !== -1) { bottomToolbar.buttons[buttonsArr[idx][0]].method = bottomToolbar.buttons[buttonKey].method; }
						// Set new one
						bottomToolbar.buttons[buttonKey].method = item;
						// Resize buttons
						bottomToolbar.recalcWidth();
						// Save properties
						list.properties['filterMethod'][1] = Object.values(bottomToolbar.buttons).map((button) => { return (Object.hasOwn(button, 'method') ? button.method : ''); }).filter(Boolean).join(',');
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => options.indexOf(bottomToolbar.buttons[buttonKey].method), optionsLength);
		}
	}
	{	// Filter
		const subMenuName = menu.newMenu('Current filter');
		const options = filterEntries.call(bottomToolbar.buttons[buttonKey]);
		const optionsLength = options.length;
		if (optionsLength) {
			menu.newEntry({ menuName: subMenuName, entryText: options[0].entryText, flags: options[0].flags });
			menu.newSeparator(subMenuName);
			options.slice(1).forEach((item) => {
				menu.newEntry({
					menuName: subMenuName,
					entryText: item.entryText,
					func: item.func,
					flags: item.flags
				});
			});
			menu.newCheckMenuLast(() => options.slice(1).findIndex((item) => item.check), optionsLength - 1);
			menu.newSeparator(subMenuName);
			menu.newEntry({ menuName: subMenuName, entryText: 'Cycle filter', func: bottomToolbar.buttons[buttonKey].func.bind(bottomToolbar.buttons[buttonKey]) });
		}
	}
	menu.newSeparator();
	{
		const subMenuName = menu.newMenu('Other filter settings');
		{	// Filtering
			const subMenuNameTwo = menu.newMenu('Save filtering between sessions', subMenuName);
			const options = ['Yes: Always restore last used', 'No: Reset on startup'];
			const optionsLength = options.length;
			menu.newEntry({ menuName: subMenuNameTwo, entryText: 'Sorting, category and Playlists view:', flags: MF_GRAYED });
			menu.newSeparator(subMenuNameTwo);
			options.forEach((item, i) => {
				menu.newEntry({
					menuName: subMenuNameTwo, entryText: item, func: () => {
						list.bSaveFilterStates = (i === 0);
						list.properties['bSaveFilterStates'][1] = list.bSaveFilterStates;
						overwriteProperties(list.properties);
					}
				});
			});
			menu.newCheckMenuLast(() => (list.bSaveFilterStates ? 0 : 1), optionsLength);
		}
		menu.newSeparator(subMenuName);
		menu.newEntry({
			menuName: subMenuName,
			entryText: 'Reset also applies to search', func: () => {
				list.searchMethod.bResetFilters = !list.searchMethod.bResetFilters;
				list.properties.searchMethod[1] = JSON.stringify(list.searchMethod);
				overwriteProperties(list.properties);
			}, flags: list.searchInput ? MF_STRING : MF_GRAYED
		});
		menu.newCheckMenuLast(() => list.searchMethod.bResetFilters);
	}
	menu.newSeparator();
	{	// Reset
		menu.newEntry({
			entryText: 'Reset all filters', func: () => {
				list.resetFilter();
			}, flags: Object.keys(list.getFilter(true)).length ? MF_STRING : MF_GRAYED
		});
	}
	return menu;
}

async function checkLBToken(lBrainzToken = list.properties.lBrainzToken[1]) {
	if (!lBrainzToken.length) {
		const lb = ListenBrainz;
		const encryptToken = '********-****-****-****-************';
		const currToken = list.properties.lBrainzEncrypt[1] ? encryptToken : list.properties.lBrainzToken[1];
		try { lBrainzToken = utils.InputBox(window.ID, 'Enter ListenBrainz user token:', window.Name + _ps(window.ScriptInfo.Name), currToken, true); }
		catch (e) { return false; } // eslint-disable-line no-unused-vars
		if (lBrainzToken === currToken || lBrainzToken === encryptToken) { return false; }
		if (lBrainzToken.length) {
			if (!(await lb.validateToken(lBrainzToken))) {
				lb.consoleError('Token can not be validated.');
				return false;
			}
			const answer = WshShell.Popup('Do you want to encrypt the token?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
			if (answer === popup.yes) {
				let pass = '';
				try { pass = utils.InputBox(window.ID, 'Enter a password:\n(will be required on every use)', window.Name + _ps(window.ScriptInfo.Name), pass, true); }
				catch (e) { return false; } // eslint-disable-line no-unused-vars
				if (!pass.length) { return false; }
				lBrainzToken = new SimpleCrypto(pass).encrypt(lBrainzToken);
			}
			list.properties.lBrainzEncrypt[1] = answer === popup.yes;
		}
		list.properties.lBrainzToken[1] = lBrainzToken;
		overwriteProperties(list.properties);
	}
	return true;
}

function filterEntries(method) {
	let entries = [];
	switch (method || this.method) {
		case 'Category': {
			const options = list.categories();
			const defOpt = options[0];
			const iInherit = list.categoryState.length === 1 && list.categoryState[0] !== defOpt
				? options.indexOf(list.categoryState[0])
				: -1;
			entries.push({ entryText: 'Cycle through the different categories:', flags: MF_GRAYED });
			options.forEach((item, i) => {
				entries.push({
					func: () => {
						list.filter({ categoryState: [item] });
					},
					entryText: item,
					tabText: list.categoryState.includes(item) ? (i === iInherit ? '\t-inherit-' : '') : '',
					check: list.categoryState.includes(item),
					flags: MF_STRING
				});
			});
			break;
		}
		case 'Extension': {
			entries.push({ entryText: 'Cycle through the different filters:', flags: MF_GRAYED });
			list.constExtStates().forEach((item, i) => {
				// Add a cross to those extensions not being used
				entries.push({
					func: () => {
						list.extStates = list.constExtStates().rotate(i);
						list.update({ bReuseData: true, bNotPaint: true });
						list.filter(); // Current filter state
					},
					entryText: item,
					tabText: (list.extStates[0] === item ? '' : (list.dataAll.some((pls) => { return pls.extension === item; }) || item === list.constExtStates()[0] ? '' : '\t[x]')),
					check: list.extStates[0] === item,
					flags: MF_STRING
				});
			});
			break;
		}
		case 'Lock state': {
			entries.push({ entryText: 'Cycle through the different filters:', flags: MF_GRAYED });
			list.constLockStates().forEach((item, i) => {
				entries.push({
					func: () => {
						list.lockStates = list.constLockStates().rotate(i);
						list.update({ bReuseData: true, bNotPaint: true });
						list.filter(); // Current filter state
					},
					entryText: item,
					tabText: '',
					check: list.lockStates[0] === item,
					flags: MF_STRING
				});
			});
			break;
		}
		case 'MBID': {
			entries.push({ entryText: 'Cycle through the different filters:', flags: MF_GRAYED });
			list.constMbidStates().forEach((item, i) => {
				entries.push({
					func: () => {
						list.mbidStates = list.constMbidStates().rotate(i);
						list.update({ bReuseData: true, bNotPaint: true });
						list.filter(); // Current filter state
					},
					entryText: item,
					tabText: '',
					check: list.mbidStates[0] === item,
					flags: MF_STRING
				});
			});
			break;
		}
		case 'Playlist type': {
			entries.push({ entryText: 'Cycle through the different filters:', flags: MF_GRAYED });
			list.constAutoPlaylistStates().forEach((item, i) => {
				entries.push({
					func: () => {
						list.autoPlaylistStates = list.constAutoPlaylistStates().rotate(i);
						list.update({ bReuseData: true, bNotPaint: true });
						list.filter(); // Current filter state
					},
					entryText: item,
					tabText: '',
					check: list.autoPlaylistStates[0] === item,
					flags: MF_STRING
				});
			});
			break;
		}
		case 'Tag': {
			const options = list.tags();
			const defOpt = options[0];
			const bInherit = !list.tagState.includes(defOpt);
			entries.push({ entryText: 'Cycle through the different tags:', flags: MF_GRAYED });
			list.tags().map((item, i) => {
				entries.push({
					func: () => {
						list.filter({ tagState: [item] });
					},
					entryText: item,
					tabText: list.tagState.includes(item) ? (bInherit && i !== 0 ? '\t-inherit-' : '') : '',
					check: list.tagState.includes(item),
					flags: MF_STRING
				});
			});
			break;
		}
	}
	return entries;
}

function quickSearchMenu(menu, menuName) {
	const subMenuName = menu.newMenu('Quick-search', menuName);
	{
		menu.newEntry({ menuName: subMenuName, entryText: 'Quick-search configuration:', flags: MF_GRAYED });
		menu.newSeparator(subMenuName);
		menu.newEntry({
			menuName: subMenuName, entryText: 'Force searching by name', func: () => {
				list.properties.bQuickSearchName[1] = !list.properties.bQuickSearchName[1];
				overwriteProperties(list.properties);
				if (list.properties.bQuickSearchName[1]) {
					fb.ShowPopupMessage('Enabling this option will force searching by name, without considering the current sorting method.\n\nIf searching by date, size, etc. is desired according to current sorting, disable it.', window.Name + _ps(window.ScriptInfo.Name));
				}
			}
		});
		menu.newCheckMenuLast(() => list.properties.bQuickSearchName[1]);
		menu.newSeparator(subMenuName);
		menu.newEntry({
			menuName: subMenuName, entryText: 'Jump to next item on multiple presses', func: () => {
				list.properties.bQuickSearchNext[1] = !list.properties.bQuickSearchNext[1];
				overwriteProperties(list.properties);
				fb.ShowPopupMessage('Enabling this option will allow to jump between items starting with the same char, instead of reusing the previous string.\n\nFor ex: pressing two times \'a\' will look for a playlist starting with \'a\' on first pressing and then for the next one.\n\nWhen the option is disabled, it would just look for a playlist starting with \'aa\'.', window.Name + _ps(window.ScriptInfo.Name));
			}
		});
		menu.newCheckMenuLast(() => list.properties.bQuickSearchNext[1]);
		menu.newEntry({
			menuName: subMenuName, entryText: 'Cycle on last result', func: () => {
				list.properties.bQuickSearchCycle[1] = !list.properties.bQuickSearchCycle[1];
				overwriteProperties(list.properties);
				if (list.properties.bQuickSearchCycle[1]) {
					fb.ShowPopupMessage('Enabling this option will cycle between all the found items, not stopping on the last one but going back to the first one when no more items are found.', window.Name + _ps(window.ScriptInfo.Name));
				}
			}, flags: list.properties.bQuickSearchNext[1] ? MF_STRING : MF_GRAYED
		});
		menu.newCheckMenuLast(() => list.properties.bQuickSearchCycle[1]);
	}
}

function importSettingsMenu() {
	const menu = new _menu();
	menu.newEntry({ entryText: 'Panel menu: ' + window.Name, flags: MF_GRAYED });
	menu.newSeparator();
	menu.newEntry({
		entryText: 'Export panel settings...', func: () => {
			const bData = WshShell.Popup('Also export playlists files and data?', 0, window.ScriptInfo.Name + ': Export panel settings', popup.question + popup.yes_no) === popup.yes;
			const playlistFilesMask = bData && list.playlistsPath.length
				? Array.from(loadablePlaylistFormats, (ext) => list.playlistsPath + '*' + ext)
				: [];
			exportSettings(
				list.properties,
				bData
					? [...playlistFilesMask, list.filename, list.filename + '.old', list.filename.replace('.json', '_sorting.json'), list.filename.replace('.json', '_config.json')]
					: [],
				window.ScriptInfo.Name
			);
		}
	});
	menu.newEntry({
		entryText: 'Import panel settings...', func: () => {
			let playlistsPath;
			importSettings(
				{
					onLoadSettings: (settings, bFound, panelName) => { // eslint-disable-line no-unused-vars
						if (settings) {
							if (Array.isArray(settings.playlistsPath)) {
								playlistsPath = _resolvePath(settings.playlistsPath[1]);
								console.log(panelName + ': setting new  tracked folder\n\t ' + playlistsPath);
							} else {
								playlistsPath = settings.playlistsPath;
								console.log(panelName + ': importing only playlists data into current tracked folder\n\t ' + playlistsPath);
							}
							return true;
						}
						return false;
					},
					onUnzipData: (importPath, panelName) => { // eslint-disable-line no-unused-vars
						let bDone = getFiles(importPath, loadablePlaylistFormats)
							.map((file) => {
								const newFile = file.replace(importPath, playlistsPath);
								return _moveFile(file, newFile);
							})
							.every((done) => {
								if (!done) {
									console.popup(panelName + ': failed importing playlist files.', window.Name + _ps(window.ScriptInfo.Name));
									return false;
								}
								return true;
							});
						if (bDone) { console.log(panelName + ': imported playlists files'); }
						bDone = bDone && getFiles(importPath, new Set(['.json', '.old']))
							.map((file) => {
								const newFile = file.replace(importPath, folders.data);
								return _moveFile(file, newFile);
							})
							.every((done) => {
								if (!done) {
									console.popup(panelName + ': failed importing playlist json.', window.Name + _ps(window.ScriptInfo.Name));
									return false;
								}
								return true;
							});
						if (bDone) { console.log(panelName + ': imported playlists json'); }
						return bDone;
					}
				},
				{ playlistsPath: list.playlistsPath },
				window.ScriptInfo.Name
			);
		}
	});
	menu.newSeparator();
	menu.newEntry({
		entryText: 'Share UI settings...', func: () => {
			list.shareUiSettings('popup');
		}
	});
	menu.newSeparator();
	menu.newEntry({
		entryText: 'Configure panel...', func: () => window.ShowConfigureV2()
	});
	menu.newEntry({
		entryText: 'Panel properties...', func: () => window.ShowProperties()
	});
	menu.newSeparator();
	menu.newEntry({
		entryText: 'Reload panel', func: () => window.Reload()
	});
	return menu;
}

function createMenuExport(forcedIndexes = []) {
	const indexes = forcedIndexes.length === 0 ? [...list.indexes] : [...forcedIndexes]; // When delaying menu, the mouse may move to other index...
	list.tooltip.SetValue(null);
	const menu = menuLbtnMult;
	menu.clear(true); // Reset on every call
	if (indexes.length === 0) {
		fb.ShowPopupMessage('Selected indexes were empty on createMenuLeftMult() when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.', window.Name + _ps(window.ScriptInfo.Name));
		return menu;
	}
	const playlists = [];
	for (let z of indexes) {
		playlists.push(list.data[z]);
		if (!playlists.slice(-1)[0]) {
			fb.ShowPopupMessage('Selected playlist was null when it shouldn\'t.\nPlease report bug with the steps you followed before this popup.\n\nInfo:\nIndexes:' + indexes + '\nPlaylists:' + playlists, window.Name + _ps(window.ScriptInfo.Name));
			return menu;
		}
	}
	// Helpers
	const isAutoPls = (pls) => pls.isAutoPlaylist || pls.query;
	const isPlsUI = (pls) => pls.extension === '.ui';
	const isFolder = (pls) => pls.isFolder;
	// Pls
	const playlistsUI = playlists.filter((pls) => pls.extension === '.ui');
	// Evaluate
	const bIsAutoPlsEvery = playlists.every((pls) => isAutoPls(pls));
	const bIsValidXSPEvery = playlists.every((pls) => pls.extension !== '.xsp' || (Object.hasOwn(pls, 'type') && pls.type === 'songs'));
	const bIsAutoPlsSome = bIsAutoPlsEvery || playlists.some((pls) => isAutoPls(pls));
	const bIsFolderEvery = playlists.every((pls) => isFolder(pls));
	const bIsPlsUISome = playlistsUI.length !== 0;
	const bWritableFormat = playlists.some((pls) => writablePlaylistFormats.has(pls.extension));
	// Enabled menus
	const flags = (bWritableFormat || bIsPlsUISome || bIsAutoPlsSome) && bIsValidXSPEvery && !bIsFolderEvery ? MF_STRING : MF_GRAYED;
	const presets = JSON.parse(list.properties.converterPreset[1]);
	const subMenuName = menu.newMenu('Export and Convert Tracks to...', void (0), presets.length ? flags : MF_GRAYED);
	menu.newEntry({ menuName: subMenuName, entryText: 'Shift + Click to skip tracks conversion:', flags: MF_GRAYED });
	menu.newSeparator(subMenuName);
	presets.forEach((preset) => {
		const path = preset.path;
		const playlistOutPath = preset.playlistOutPath || '';
		let pathName = playlistOutPath.length
			? '(Fixed folder)'
			: path.length
				? '(' + path.split('\\')[0] + '\\) ' + path.split('\\').slice(-2, -1)
				: '(Folder)';
		const dsp = preset.dsp;
		let dspName = (dsp !== '...' ? dsp : '(DSP)');
		const tf = preset.tf;
		let tfName = Object.hasOwn(preset, 'name') && preset.name.length ? preset.name : preset.tf;
		const extension = Object.hasOwn(preset, 'extension') && preset.extension.length ? preset.extension : '';
		const extensionName = extension.length ? '[' + extension + ']' : '';
		const bExtendedM3U = Object.hasOwn(preset, 'bExtendedM3U') ? preset.bExtendedM3U : true;
		pathName = pathName.cut(20);
		dspName = dspName.cut(20);
		tfName = tfName.cut(35);
		menu.newEntry({
			menuName: subMenuName, entryText: pathName + extensionName + ': ' + dspName + ' ---> ' + tfName, func: () => {
				const bShift = utils.IsKeyPressed(VK_SHIFT);
				const toConvertHandleList = new FbMetadbHandleList();
				Promise.serial(indexes.filter((idx, i) => !playlists[i].isFolder), (z, i) => {
					const pls = playlists[i];
					if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { return; }
					if (writablePlaylistFormats.has(pls.extension) || isPlsUI(pls) || isAutoPls(pls)) {
						const remDupl = (pls.isAutoPlaylist && list.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls)
							? list.removeDuplicatesAutoPls
							: [];
						const exportFunc = pls.isAutoPlaylist
							? exportAutoPlaylistFileWithTracksConvert
							: exportPlaylistFileWithTracksConvert;
						const { bDone, handleList } = exportFunc({
							list, z,
							tf,
							preset: null,
							defPath: path,
							playlistOutPath,
							ext: extension,
							remDupl, // Include remDupl for XSP playlists
							bAdvTitle: list.bAdvTitle,
							bMultiple: list.bMultiple,
							bExtendedM3U
						});
						return Promise.wait(60).then(() => {
							if (bDone && handleList) {
								handleList.Sort();
								toConvertHandleList.MakeUnion(handleList);
								toConvertHandleList.Sort();
							}
						});
					}
				}, 100).then(() => {
					if (!bShift && dsp) {
						console.log('Playlist Manager: ' + toConvertHandleList.Count + ' tracks to convert.');
						fb.RunContextCommandWithMetadb('Convert/' + dsp, toConvertHandleList, 8);
					}
				});
			}, flags
		});
	});
	return menu;
}