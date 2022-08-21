'use strict';
//12/08/22

/* 	Playlist Manager
	Manager for Playlists Files and Auto-Playlists. Shows a virtual list of all playlists files within a configured folder (playlistPath).
	See readmes\playlist_manager.pdf for full documentation
*/

window.DefineScript('Playlist Manager', { author: 'XXX', version: '0.5.0-beta10', features: {drag_n_drop: false, grab_focus: true}});
include('helpers\\helpers_xxx.js');
include('helpers\\helpers_xxx_properties.js');
include('helpers\\helpers_xxx_playlists.js');
include('helpers\\helpers_xxx_playlists_files.js');
include('helpers\\buttons_panel_xxx.js');
include('helpers\\playlist_manager_list.js');
include('helpers\\playlist_manager_panel.js');
include('helpers\\playlist_manager_buttons.js');
include('helpers\\playlist_manager_menu.js');
include('helpers\\playlist_manager_helpers.js');
include('helpers\\helpers_xxx_file_zip.js');
include('helpers\\popup_xxx.js');
include('helpers\\helpers_xxx_instances.js');
include('helpers\\playlist_history.js');
include('helpers\\callbacks_xxx.js');

checkCompatible('1.6.1', 'smp');

// Cache
let plmInit = {};
const cacheLib = (bInit = false, message = 'Loading...', tt = 'Caching library paths...\nPanel will be disabled during the process.') => {
	const plmInstances = [...getInstancesByKey('Playlist Manager')]; // First look if there are other panels already loaded
	if (plmInstances[0] === window.ID) { // Only execute once per Foobar2000 instance
		if (plmInit.interval) {clearInterval(plmInit.interval); plmInit.interval = null;}
		else if (bInit) {return;} // Ensure it only runs once on startup
		if (!pop.isEnabled()) {pop.enable(true, message, tt);}
		libItemsAbsPaths = [];
		libItemsRelPaths = {};
		precacheLibraryPathsAsync().then((result) => {
			window.NotifyOthers('precacheLibraryPaths', [...libItemsAbsPaths]);
			console.log(result);
			pop.disable(true);
		}, (error) => {
			// Already using data from other instance. See on_notify_data
			pop.disable(true);
		}).finally(() => {
			if (typeof list !== 'undefined' && list && list.bRelativePath && list.playlistsPath) {
				if (!pop.isEnabled()) {pop.enable(true, message, tt);}
				precacheLibraryRelPaths(list.playlistsPath);
				pop.disable(true);
			}
		});
	} else {
		if (!pop.isEnabled()) {pop.enable(true, message, tt);} // Disabled on notify
		if (bInit) {window.NotifyOthers('precacheLibraryPaths ask', null);}
	}
};
addInstance('Playlist Manager');
plmInit.interval = setInterval(cacheLib, 500, true);

var properties = {
	playlistPath			: ['Path to the folder containing the playlists' , (_isFile(fb.FoobarPath + 'portable_mode_enabled') ? '.\\profile\\' : fb.ProfilePath) + 'playlist_manager\\'],
	autoSave				: ['Auto-save delay with loaded foobar playlists (in ms). Forced > 1000. 0 disables it.', 3000],
	bFplLock				: ['Load .fpl native playlists as read only?' , true],
	extension				: ['Extension used when saving playlists (' + Array.from(writablePlaylistFormats).join(', ') + ')', '.m3u8'],
	autoUpdate				: ['Periodically checks playlist path (in ms). Forced > 200. 0 disables it.' , 5000],
	bShowSize				: ['Show playlist size' , true],
	bUpdateAutoplaylist		: ['Update Autoplaylist size by query output', true],
	bUseUUID				: ['Use UUIDs along playlist names (not available for .pls playlists).', false],
	optionUUID				: ['UUID current method', ''],
	methodState				: ['Current sorting method. Allowed: ', ''], // Description and value filled on list.init() with defaults. Just a placeholder
	sortState				: ['Current sorting order. Allowed: ', ''], // Description and value filled on list.init() with defaults. Just a placeholder
	bSaveFilterStates		: ['Maintain filters between sessions?', true], // Description and value filled on list.init() with defaults. Just a placeholder
	filterStates			: ['Current filters: ', '0,0'], // Description and value filled on list.init() with defaults. Just a placeholder
	bShowSep				: ['Show name/category separators: ', true],
	listColours				: ['Color codes for the list. Use contextual menu to set them: ', ''],
	bFirstPopup				: ['Playlist Manager: Fired once', false],
	bRelativePath			: ['Use relative paths for all new playlists', false],
	bFirstPopupFpl			: ['Playlist Manager fpl: Fired once', false],
	bFirstPopupPls			: ['Playlist Manager pls: Fired once', false],
	categoryState			: ['Current categories showed.', '[]'], // Description and value filled on list.init() with defaults. Just a placeholder
	bShowTips				: ['Usage text on tooltips.', true],
	bAutoLoadTag			: ['Automatically add \'bAutoLoad\' to all playlists', false],
	bAutoLockTag			: ['Automatically add \'bAutoLock\' to all playlists', false],
	bAutoCustomTag			: ['Automatically add custom tags to all playlists', false],
	autoCustomTag			: ['Custom tags to add', ''],
	bApplyAutoTags			: ['Apply actions based on tags (lock, load)', false],
	// autoPlaylistTags		: ['Playlist tags and actions config', JSON.parse({bAutoLoadTag: false, bAutoLockTag: false, bAutoCustomTag: false, bApplyAutoTags: false, autoCustomTag: ''})],
	bAutoTrackTag			: ['Enable auto-tagging for added tracks (at autosave)', false],
	bAutoTrackTagAlways		: ['Enable auto-tagging for added tracks (always)', false],
	bAutoTrackTagPls		: ['Auto-tagging for standard playlists', false],
	bAutoTrackTagLockPls	: ['Auto-tagging for locked playlists', false],
	bAutoTrackTagAutoPls	: ['Auto-tagging for AutoPlaylists', false],
	bAutoTrackTagAutoPlsInit: ['Auto-tagging for AutoPlaylists at startup', false],
	converterPreset			: ['Converter Preset list', JSON.stringify([
		{name: '', dsp: '...', tf: '.\\%filename%.mp3', path: '', extension: ''}, // Export all at same folder
		{name: '', dsp: '...', tf: '.\\%artist%\\%album%\\%track% - %title%.mp3', path: '', extension: ''}, // Transfer library
		{name: '--Kodi Librelec (<your_disk_name>)--', dsp: '...', tf: '/media/<your_disk_name>/music/$puts(art,$ascii($meta(artist,0)))$ifequal($strrchr($get(art),.),$len($get(art)),$puts(art,$cut($get(art),$sub($len($get(art)),1))),)$puts(alb,$ascii(%album%))$ifequal($strrchr($get(alb),.),$len($get(alb)),$puts(alb,$cut($get(alb),$sub($len($get(alb)),1))),)$replace($get(art),:,-,/,-,?,)/$replace($get(alb),:,-,/,-,?,)/$replace($ascii(%track% - %title%),:,-,/,-,?,).lossy.flac', path: '', extension: '.m3u'}, // Kodi-like library
		{name: '--Kodi Windows (<your_disk_name>)--', dsp: '...', tf: '<your_disk_name>:\\music\\$ascii($meta(artist,0)\\%album%\\%track% - %title%).mp3', path: '', extension: '.m3u'}, // Kodi-like library
		{name: '--Foobar2000 mobile (playlists folder)--', dsp: '...', tf: '..\\music\\$ascii($meta(artist,0)\\%album%\\%track% - %title%).mp3', path: '', extension: '.m3u8'}, // Foobar2000 mobile, playlists on different folder than music
		{name: '--Foobar2000 mobile (root)--', dsp: '...', tf: '.\\music\\%artist%\\$ascii($meta(artist,0)\\%track% - %title%).mp3', path: '', extension: '.m3u8'}, // Foobar2000 mobile, playlists on same root than music (without a folder)
		{name: '--Foobar2000 mobile (same folder)--', dsp: '...', tf: '.\\%artist%\\$ascii($meta(artist,0)\\%track% - %title%).mp3', path: '', extension: '.m3u8'} // Foobar2000 mobile, playlists on same folder than music
	])],
	bForbidDuplicates		: ['Skip duplicates when adding to playlists', true],
	bDeadCheckAutoSave		: ['Warn about dead items on auto-save', false],
	bBOM					: ['Save files as UTF8 with BOM?', false],
	removeDuplicatesAutoPls	: ['AutoPlaylists, Remove duplicates by', 'artist,date,title'],
	bRemoveDuplicatesAutoPls: ['AutoPlaylists, filtering enabled', true],
	bShowMenuHeader			: ['Show header on playlist menus?', true],
	bCopyAsync				: ['Copy tracks asynchronously on export?', true],
	bRemoveDuplicatesSmartPls: ['Smart Playlists, filtering enabled', true],
	bSavingWarnings			: ['Warnings when saving to another format', true],
	bFirstPopupXsp			: ['Playlist Manager xsp: Fired once', false],
	bFirstPopupXspf			: ['Playlist Manager xspf: Fired once', false],
	bCheckDuplWarnings		: ['Warnings when loading duplicated playlists', true],
	bSavingXsp				: ['Auto-save .xsp playlists?', false],
	bAllPls					: ['Track UI-only playlists?', false],
	autoBack				: ['Auto-backup interval for playlists (in ms). Forced > 1000. 0 disables it.', Infinity],
	autoBackN				: ['Auto-backup files allowed.', 50],
	filterMethod			: ['Current filter buttons', 'Playlist type,Lock state'],
	bSavingDefExtension		: ['Try to save playlists always as default format?', true],
	bNetworkPopup			: ['Playlist Manager on network drive: Fired once', false],
	bOpenOnExport			: ['Open folder on export actions?', true],
	bShowIcons				: ['Show playlist icons?', true],
	playlistIcons			: ['Playlist icons codes (Font Awesome)', JSON.stringify(
		Object.fromEntries(Object.entries(playlistDescriptors).map((plsPair) => {
			const key = plsPair[0];
			const icon = plsPair[1].icon ? plsPair[1].icon.charCodeAt(0).toString(16) : null;
			const iconBg = plsPair[1].iconBg ? plsPair[1].iconBg.charCodeAt(0).toString(16) : null;
			return [key, {icon, iconBg}];
		})))
	],
	bDynamicMenus			: ['Show dynamic menus?', true]
};
properties['playlistPath'].push({func: isString, portable: true}, properties['playlistPath'][1]);
properties['autoSave'].push({func: isInt, range: [[0,0],[1000, Infinity]]}, properties['autoSave'][1]); // Safety limit 0 or > 1000
properties['extension'].push({func: (val) => {return writablePlaylistFormats.has(val);}}, properties['extension'][1]);
properties['autoUpdate'].push({func: isInt, range: [[0,0],[200, Infinity]]}, properties['autoUpdate'][1]); // Safety limit 0 or > 200
properties['autoBack'].push({func: !isNaN, range: [[0,0],[1000, Infinity]]}, properties['autoBack'][1]); // Safety limit 0 or > 1000
properties['autoBackN'].push({func: isInt}, properties['autoBackN'][1]);
var prefix = 'plm_';
setProperties(properties, prefix);

{ // Info Popup
	let prop = getPropertiesPairs(properties, prefix);
	if (!prop['bFirstPopup'][1]) {
		prop['bFirstPopup'][1] = true;
		overwriteProperties(prop); // Updates panel
		isPortable(prop['playlistPath'][0]);
		const readmePath = folders.xxx + 'helpers\\readme\\playlist_manager.txt';
		const readme = _open(readmePath, utf8);
		if (readme.length) {fb.ShowPopupMessage(readme, window.Name);}
	}
}

// Panel and list
let panel = new _panel(true);
let list = new _list(LM, TM, 0, 0);
// Popups
const pop = new _popup({x: 0, y: 0, w: 0, h: 0});
pop.panelColor = opaqueColor(0xFF4354AF, 30); // Blue overlay
pop.textColor = invert(panel.getColorBackground(), true);
pop.border.enabled = false; // Just overlay without a popup
pop.icon.enabled = true; // Enable animation
if (!pop.isEnabled()) {pop.enable(true, 'Loading...', 'Caching library paths...\nPanel will be disabled during the process.');} // Disable panel on init until it's done

// Tracking a network drive?
if (!_hasRecycleBin(list.playlistsPath.match(/^(.+?:)/g)[0])) {
	console.log('Playlist manager: tracked folder is on a network drive.')
	if (!list.properties['bNetworkPopup'][1]) {
		list.properties['bNetworkPopup'][1] = true;
		overwriteProperties(list.properties); // Updates panel
		const file = folders.xxx + 'helpers\\readme\\playlist_manager_network.txt';
		const readme = _open(file, utf8);
		fb.ShowPopupMessage(readme, window.Name);
	}
} else if (list.properties['bNetworkPopup'][1]) {
	list.properties['bNetworkPopup'][1] = false;
	overwriteProperties(list.properties); // Updates panel
}

const autoSaveTimer = Number(list.properties.autoSave[1]); 
const autoUpdateTimer = Number(list.properties.autoUpdate[1]);
const autoBackTimer = Number(list.properties.autoBack[1]);
buttonsPanel.buttons.filterOneButton.method = list.properties.filterMethod[1].split(',')[0];
buttonsPanel.buttons.filterTwoButton.method = list.properties.filterMethod[1].split(',')[1];
recalcWidth();

addEventListener('on_colours_changed', () => {
	panel.coloursChanged();
	window.Repaint();
});

addEventListener('on_font_changed', () => {
	panel.fontChanged();
	window.Repaint();
});

addEventListener('on_key_down', (k) => {
	if (pop.isEnabled()) {return;}
	list.key_down(k);
});

addEventListener('on_mouse_lbtn_up', (x, y, mask) => {
	if (pop.isEnabled()) {return;}
	if (buttonsPanel.curBtn === null) {
		list.lbtn_up(x, y, mask);
	}
	on_mouse_lbtn_up_buttn(x, y);
});

addEventListener('on_mouse_lbtn_down', (x, y) => {
	if (pop.isEnabled()) {return;}
	on_mouse_lbtn_down_buttn(x, y);
});

addEventListener('on_mouse_lbtn_dblclk', (x, y) => {
	if (pop.isEnabled()) {return;}
	if (buttonsPanel.curBtn === null) {
		list.lbtn_dblclk(x, y);
	}
});

addEventListener('on_mouse_move', (x, y, mask) => {
	if (pop.isEnabled()) {pop.move(x, y, mask); window.SetCursor(IDC_WAIT); return;}
	on_mouse_move_buttn(x, y, mask);
	if (buttonsPanel.curBtn === null) {
		list.move(x, y, mask);
	} else {
		list.up_btn.hover = false;
		list.down_btn.hover = false;
	}
});

addEventListener('on_mouse_leave', () => {
	if (pop.isEnabled()) {return;}
	on_mouse_leave_buttn();
	list.onMouseLeaveList(); // Clears index selector
});

addEventListener('on_mouse_rbtn_up', (x, y) => {
	if (pop.isEnabled()) {return true;}
	if (list.traceHeader(x, y)) { // Header menu
		return createMenuRightTop().btn_up(x, y);
	} else if (buttonsPanel.curBtn === null) { // List menu
		return createMenuRight().btn_up(x, y);
	} else if (buttonsPanel.curBtn === buttonsPanel.buttons.sortButton) { // Sort button menu
		return createMenuRightSort().btn_up(x, y);
	} else if (buttonsPanel.curBtn === buttonsPanel.buttons.filterOneButton) { // Filter button menus
		return createMenuRightFilter('filterOneButton').btn_up(x, y);
	} else if (buttonsPanel.curBtn === buttonsPanel.buttons.filterTwoButton) {
		return createMenuRightFilter('filterTwoButton').btn_up(x, y);
	}
	return true; // left shift + left windows key will bypass this callback and will open default context menu.
});

addEventListener('on_mouse_wheel', (s) => {
	if (pop.isEnabled()) {return;}
	list.wheel({s});
});

addEventListener('on_paint', (gr) => {
	panel.paint(gr);
	list.paint(gr);
	on_paint_buttn(gr);
	pop.paint(gr);
});

addEventListener('on_size', () => {
	panel.size();
	list.size();
	on_size_buttn();
	pop.resize();
});

addEventListener('on_playback_new_track', () => { // To show playing now playlist indicator...
	window.Repaint();
});

addEventListener('on_playlists_changed', () => { // To show/hide loaded playlist indicators...
	window.Repaint();
});

addEventListener('on_notify_data', (name, info) => { 
	switch (name) {
		case 'Playlist manager: playlistPath': {
			if (!info) {window.NotifyOthers('Playlist manager: playlistPath', list.playlistsPath);} // Share paths
			break;
		}
		case 'Playlist manager: get handleList': {
			if (info && info.length) {
				const plsName = info;
				if (list.hasPlaylists([plsName])) {
					window.NotifyOthers('Playlist manager: handleList', new Promise((resolve, reject) => {resolve(list.getHandleFromPlaylists([plsName], false));}));
				}
			} // Share paths
			break;
		}
		case 'precacheLibraryPaths': {
			libItemsAbsPaths = [...info];
			if (plmInit.interval) {clearInterval(plmInit.interval); plmInit.interval = null;}
			console.log('precacheLibraryPaths: using paths from another instance.');
			// Update rel paths if needed with new data
			if (list.bRelativePath && list.playlistsPath.length) {
				if (libItemsRelPaths.hasOwnProperty(list.playlistsPath) && libItemsRelPaths[list.playlistsPath].length !== libItemsAbsPaths.length) {
					libItemsRelPaths[list.playlistsPath] = []; // Delete previous cache on library change
				}
				precacheLibraryRelPaths(list.playlistsPath);
			}
			pop.disable(true);
			break;
		}
		case 'precacheLibraryPaths ask': {
			if (libItemsAbsPaths && libItemsAbsPaths.length) {
				window.NotifyOthers('precacheLibraryPaths', [...libItemsAbsPaths]);
			}
			break;
		}
	}
});

// Main menu commands
addEventListener('on_main_menu_dynamic', (id) => { 
	if (list.mainMenuDynamic && id < list.mainMenuDynamic.length) {
		const menu = list.mainMenuDynamic[id];
		let bDone = false;
		switch (menu.type.toLowerCase()){
			case 'load playlist': {
				const idx = [...menu.arg];
				idx.forEach((i) => {list.loadPlaylistOrShow(i, true);});
				bDone = true;
				break;
			}
			case 'lock playlist': {
				const idx = [...menu.arg];
				idx.forEach((i) => {switchLock(list, i, true);});
				bDone = true;
				break;
			}
			case 'delete playlist': {
				const idx = [...menu.arg];
				idx.forEach((i) => {list.removePlaylist(i, true);});
				bDone = true;
				break;
			}
			case 'clone in ui': {
				const idx = [...menu.arg];
				idx.forEach((i) => {clonePlaylistInUI(list, i, true);});
				bDone = true;
				break;
			}
			case 'send selection': {
				const idx = [...menu.arg];
				idx.forEach((i) => {list.sendSelectionToPlaylist({playlistIndex: i, bCheckDup: true, bAlsoHidden: true});});
				bDone = true;
				break;
			}
			case 'manual refresh': {
				createMenuRight().btn_up(-1,-1, null, 'Manual refresh');
				bDone = true;
				break;
			}
			case 'new playlist (empty)': {
				let name =  'New playlist';
				if (list.dataAll.some((pls) => {return pls.name === name;})) {
					name += ' ' + _p(list.dataAll.reduce((count, iPls) => {if (iPls.name.startsWith(name)) {count++;} return count;}, 0));
				}
				list.add({bEmpty: true, name, bShowPopups: false});
				bDone = true;
				break;
			}
			case 'new playlist (ap)': {
				if (plman.ActivePlaylist === -1) {return;}
				const name = plman.GetPlaylistName(plman.ActivePlaylist);
				list.add({bEmpty: false, name, bShowPopups: false});
				bDone = true;
				break;
			}
		}
		console.log('on_main_menu_dynamic: ' + (bDone ? menu.name :JSON.stringify(menu) + ' not found'));
	}
});

// Autosave
// Halt execution if trigger rate is greater than autosave (ms), so it fires only once after successive changes made.
// if Autosave === 0, then it does nothing...
var debouncedUpdate = (autoSaveTimer !== 0) ? debounce(list.updatePlaylist, autoSaveTimer) : null;
addEventListener('on_playlist_items_reordered', (playlistIndex, oldName = null) => { 
	// Disable auto-saving on panel cache reload and ensure future update matches the right playlist
	if (pop.isEnabled() && debouncedUpdate && playlistIndex !== -1) {setTimeout(on_playlist_items_reordered, autoSaveTimer, playlistIndex, plman.GetPlaylistName(playlistIndex)); return;}
	if (oldName && oldName.length && plman.GetPlaylistName(playlistIndex) !== oldName) {return;}
	// Update
	debouncedUpdate ? debouncedUpdate({playlistIndex, bCallback: true}) : null;
});

addEventListener('on_playlist_items_removed', (playlistIndex, oldName = null) => { 
	// Disable auto-saving on panel cache reload and ensure future update matches the right playlist
	if (pop.isEnabled() && debouncedUpdate && playlistIndex !== -1) {setTimeout(on_playlist_items_removed, autoSaveTimer, playlistIndex, plman.GetPlaylistName(playlistIndex)); return;}
	if (oldName && oldName.length && plman.GetPlaylistName(playlistIndex) !== oldName) {return;}
	// Update
	debouncedUpdate ? debouncedUpdate({playlistIndex, bCallback: true}) : null;
});

addEventListener('on_playlist_items_added', (playlistIndex, oldName = null) => { 
	// Disable auto-saving on panel cache reload and ensure future update matches the right playlist
	if (pop.isEnabled() && debouncedUpdate && playlistIndex !== -1) {setTimeout(on_playlist_items_added, autoSaveTimer, playlistIndex, plman.GetPlaylistName(playlistIndex)); return;}
	if (oldName && oldName.length && plman.GetPlaylistName(playlistIndex) !== oldName) {return;}
	// Update
	if (debouncedUpdate) {debouncedUpdate({playlistIndex, bCallback: true});}
	else if (list.bAutoTrackTag && playlistIndex < plman.PlaylistCount) { // Double check playlist index to avoid crashes with callback delays and playlist removing
		if (list.bAutoTrackTagAlways) {list.updatePlaylistOnlyTracks(playlistIndex);}
		else if (plman.IsAutoPlaylist(playlistIndex)) {
			if (list.bAutoTrackTagAutoPls) {list.updatePlaylistOnlyTracks(playlistIndex);}
		} else if (list.bAutoTrackTagPls || list.bAutoTrackTagLockPls) {list.updatePlaylistOnlyTracks(playlistIndex);}
	}
});

if (plman.ActivePlaylist !== -1) {initplsHistory();}
addEventListener('on_playlists_changed', () => { 
	if (list.bAllPls) { // For UI only playlists
		list.update(true, true);
		const categoryState = [...new Set(list.categoryState).intersection(new Set(list.categories()))];
		list.filter({categoryState});
	}
	if (!list.bUseUUID && plman.ActivePlaylist !== -1) {
		const lastPls = plsHistory[0];
		if (lastPls) {  // To rename bound playlist when UUIDs are not used
			const oldName = lastPls.name;
			if (lastPls.idx === plman.ActivePlaylist && !getPlaylistIndexArray(oldName).length) {
				const idx = list.getPlaylistsIdxByName([oldName]);
				if (idx.length === 1) {
					const newName = plman.GetPlaylistName(plman.ActivePlaylist);
					let bDone = renamePlaylist(list, idx[0], newName, false);
					if (bDone) {console.log('Playlist manager: renamed playlist ' + oldName + ' --> ' + newName);}
					else {console.log('Playlist manager: failed renaming playlist ' + oldName + ' -\-> ' + newName);}
				}
			}
		}
	}
});

// Auto-update if there are a different number of items on folder or the total file sizes change
// Note tracking it's not perfect... yes, you could change characters on a file without modifying size
// but that use-case makes no sense for playlists. These are not files with 'tags', no need to save timestamps or hashes.
// We double the timers here. First we create an interval and then a debounced func. We call the debounced func every X ms, 
// and since its timer is lower than the interval it fires before the next call is done. That's the regular use case.
// But we can also call the debounced func directly to delay it's execution (for ex. while updating files).
var debouncedAutoUpdate = (autoUpdateTimer) ? debounce(autoUpdate, autoUpdateTimer - 50) : null;
const autoUpdateRepeat = (autoUpdateTimer) ? repeatFn(debouncedAutoUpdate, autoUpdateTimer)() : null;
function delayAutoUpdate() {if (typeof debouncedAutoUpdate === 'function') {debouncedAutoUpdate();}} // Used before updating playlists to finish all changes
function autoUpdate() {
	const playlistPathArray = getFiles(getPropertyByKey(properties, 'playlistPath', prefix), loadablePlaylistFormats); // Workaround for win7 bug on extension matching with utils.Glob()
	const playlistPathArrayLength = playlistPathArray.length;
	if (playlistPathArrayLength !== (list.getPlaylistNum())) { // Most times that's good enough. Count total items minus virtual playlists
		list.update(false, true, list.lastIndex);
		list.filter(); // Maintains focus on last selected item
		return true;
	} else { // Otherwise check size
		let totalFileSize = 0;
		for (let i = 0; i < playlistPathArrayLength; i++) {
			totalFileSize += utils.GetFileSize(playlistPathArray[i]);
		}
		if (totalFileSize !== list.totalFileSize) { // User may have replaced a file with foobar executed
			list.update(false, true, list.lastIndex);
			list.filter(); // Updates with current filter (instead of showing all files when something changes) and maintains focus on last selected item
			return true;
		}
	}
	return false;
}

addEventListener('on_script_unload', () => { 
	// Instance manager
	removeInstance('Playlist Manager');
	// Backup
	if (autoBackTimer && list.playlistsPath.length && list.itemsAll) {
		backup(list.properties.autoBackN[1]);
	}
	// Clear timeouts
	clearInterval(keyListener.fn);
	if (autoBackRepeat) {clearInterval(autoBackRepeat);}
	if (autoUpdateRepeat) {clearInterval(autoUpdateRepeat);}
	if (autoUpdateRepeat) {clearInterval(autoUpdateRepeat);}
});
const autoBackRepeat = (autoBackTimer && isInt(autoBackTimer)) ? repeatFn(backup, autoBackTimer)(list.properties.autoBackN[1]) : null;

// Update cache on changes!
const debouncedCacheLib = debounce(cacheLib, 5000);
addEventListener('on_library_items_added', () => { 
	debouncedCacheLib(false, 'Updating...');
	typeof list !== 'undefined' && list.clearSelPlaylistCache();
});

addEventListener('on_library_items_removed', () => { 
	debouncedCacheLib(false, 'Updating...');
	typeof list !== 'undefined' && list.clearSelPlaylistCache();
});

// key listener (workaround for keys not working when focus is not on panel)
const keyListener = {};
keyListener.bShift = false;
keyListener.bCtrol = false;
keyListener.fn = repeatFn(() => {
	if (list.tooltip.bActive) {
		const bShift = utils.IsKeyPressed(VK_SHIFT);
		const bCtrol = utils.IsKeyPressed(VK_CONTROL);
		if (bShift === keyListener.bShift && bCtrol === keyListener.bCtrol) {return;}
		else if (bShift && bCtrol) {list.move(list.mx, list.my, MK_SHIFT + MK_CONTROL);}
		else if (bShift) {list.move(list.mx, list.my, MK_SHIFT);}
		else if (bCtrol) {list.move(list.mx, list.my, MK_CONTROL);}
		else {list.move(list.mx, list.my, null);}
		keyListener.bShift = bShift;
		keyListener.bCtrol = bCtrol;
	}
}, 500)();