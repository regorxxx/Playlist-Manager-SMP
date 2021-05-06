'use strict';

/* 	Playlist Manager v 0.2 11/02/21
	Manager for offline playlists. Shows a virtual list of all playlists files within a configured folder (PlaylistPath).
	After loading it on a panel, check panel properties to add a tracked folder (without quotes). For example: (that's a folder within my foobar profile)
	C:\Users\XXX\AppData\Roaming\foobar2000\playlist_manager\server\
	Autoplaylist json files are stored in your profile folder:
	foobar2000\js_data\
	Finally, you can import another Autoplaylist data file by this script or Auto-playlist Manager by marc2003 using the contextual menu.
	Note: left shift + left windows key + right mouse click will open default context menu.
	Features:
		- Manages Playlist files and AutoPlaylists.
			- Playlist files are linked to physical files (.m3u8, .m3u, .pls or .fpl).
			- AutoPlaylists are saved into json format.
			- All playlist are loaded in cache once, filtering just changes the "painted" playlist on the list.
		- AutoPlaylists: contains all functionality on Auto-playlist Manager by marc2003 plus more.
			- Create, rename, delete AutoPlaylists.
			- Edit query, sort pattern and sort forcing.
			- Adds tooltip info, UI features, filters, etc.
			- Number of tracks output is updated at foobar startup. (and/or 'at manual refresh')
		- Loads .m3u8, .m3u and .pls playlists x100 times faster than standard foobar (if all items are on library). i.e. "As fast as the native format".
		- Auto-saves changes within foobar to binded playlists files. (configurable)
		- Automatically updates changes within the tracked folder. (configurable)
		- New updates are delayed when performing internal updates/processing to avoid conflicts.
		- Bind playlist to files:
			- Tracks playlists for changes and update binded files.
			- Auto-saving (configurable).
			- Deleting the file also ask to delete the binded playlist.
			- Renaming the files also renames the binded playlist.
			- Show binded playlist (becomes active playlist).
		- Lock/unlock playlists (so they are read-only).
			- Automatically locking of native foobar playlists files (.fpl). (configurable)
			- When locked, playlists can not be updated nor edited. They can be deleted.
			- Filename can be changed, but not playlist name (inside the file). This allows to set different playlist and file names if required.
		- Playlist unique IDs. You can have multiple playlists with same name on the UI and binded to different files. (configurable)
			- If changing UUIDs config while having playlists already loaded, then new config will be used whenever they get updated.
			- You can manually force new UUID config just by renaming the files.
		- Show playlist size on the list. (some limits apply for .fpl playlist files) (configurable)
			- All (refresh autoplaylists queries)
			- Only standard playlist
			- No size
		- If you choose not to refresh autoplaylist sizes, then the first calculated size gets used: when imported from json or creating the autoplaylist.
		- Tooltips show different playlist info:
			- Name plus UUID.
			- Playlist size (tracks). Also for AutoPlaylists (the number of tracks output by the query).
			- Category / Tag(s).
			- Status (lock).
			- Query. Sort Pattern. (AutoPlaylists)
		- Cyclic filters:
			- Show All | Only Autoplaylists | Only Playlists
			- Show All | Not locked | Only locked
		- Cyclic Sorting:
			- Name: Az | Za
			- Size: Ascd. | Desc.
			- Category: Az | Za
		--UUIDs: added to the name, so they are separated from non tracked playlist by name when loaded in foobar. Some also allow some level of names duplication.
			- Invisible unicode chars plus (*)
			- (a-f)
			- (*) 
			- Or none
		- 3 different writable formats. (some limits apply for .pls playlist files) (configurable)
		- Filter (configurable) and sorting gets saved between reloads.
		- RecycleBin: deleting and restoring.
			- Uses timestamps to uniquely identify files: no collisions with other files within the RecycleBin.
		- A backup of the previous playlist json file is created every time the panel is loaded. Old backups are sent to recycle bin.
		- Properties descriptions change according to things set on the panel, not just the values. i.e. if you change the sort method, then the description reflects the associated states dynamically.
		 - UI:
			- UI resizable on the fly.
			- Selection indicators.
			- Now playing and loaded playlist indicators.
			- Empty / not empty playlist indicators. To be used as fallback when size is not shown.
			- Size (configurable).
			- Separators between different names/categories (configurable).
			- Colours for different playlists types and status (configurable).
	TODO (by relevance):
		- Better fpl support?
			* Save data to json, load data from json, overwrite only non fpl files
			* Replace 'update playlist' with save file UI for fpl files, when locked
			* Native FPL support ? (requires new SMP version)
			* Use queries by path instead of fpl and sort items by playlist order.
		- UUID:
			* nextId() called only for new playlist, reuse old id?
			* Reassign UUIDs when changing method?
				+ First save loaded playlist and then close them?
				+ Rename loaded playlists?
			* Save UUID on json but not on files?
		- Search box
			* By Name
			* By tag
			* By category
		- Drag n drop: (requires new SMP version)
			* Add playlists files to folder (requires new SMP version)
			* Add tracks to playlist file (requires new SMP version)
		- Different menu for header (?):
			* Filter by category (create list by caching all categories on files)
			* Filter by tag
		- Change all inputs to try error
*/

window.DefinePanel('Playlist Manager', { author: 'XXX' , version: '0.2', features: { drag_n_drop: false }});
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\buttons_panel_xxx.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\playlist_manager_list.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\playlist_manager_panel.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\playlist_manager_buttons.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\playlist_manager_menu.js');

var properties = {
	PlaylistPath		: ['Path to the folder containing the playlists' , fb.ProfilePath + 'playlist_manager\\'],
	AutoSave			: ['Auto-save delay when making changes within loaded foobar playlists (in ms). 0 disables it.' , 3000],
	FplLock				: ['Load .fpl native playlists as read only?' , true],
	Extension			: ['Extension used when saving playlists (' + Array.from(writablePlaylistFormats).join(', ') + ')' , '.m3u8'],
	AutoUpdate			: ['Periodically checks playlist path (in ms). Recommended > 1000. 0 disables it.' , 5000],
	ShowSize			: ['Show playlist size' , true],
	UpdateAutoplaylist	: ['Update Autoplaylist size by query output' , true],
	UseUUID				: ['Use UUIDs along playlist names (not available for .pls playlists).' , true],
	OptionUUID			: ['UUID current method' , ''],
	MethodState			: ['Current sorting method. Allowed: ', ''], // Description and value filled on list.init() with defaults. Just a placeholder
	SortState			: ['Current sorting order. Allowed: ', ''], // Description and value filled on list.init() with defaults. Just a placeholder
	SaveFilterStates	: ['Maintain filters between sessions?: ', true], // Description and value filled on list.init() with defaults. Just a placeholder
	FilterStates		: ['Current filters: ', '0,0'], // Description and value filled on list.init() with defaults. Just a placeholder
	ShowSep				: ['Show name/category separators: ', true],
	ListColours			: ['Color codes for the list. Use contextual menu to set them: ', ''],
	firstPopup			: ['Playlist Manager: Fired once', false],
};
properties['PlaylistPath'].push({func: isString}, properties['PlaylistPath'][1]);
properties['AutoSave'].push({range: [[0,0],[1000, Infinity]]}, properties['AutoSave'][1]);
properties['Extension'].push({func: (val) => {return (Array.from(writablePlaylistFormats).indexOf(val) !== -1);}}, properties['Extension'][1]);
properties['AutoUpdate'].push({range: [[0,0],[100, Infinity]]}, properties['AutoUpdate'][1]);
var prefix = 'plm_';
setProperties(properties, prefix);

{ // Info Popup
	let prop = getPropertiesPairs(properties, prefix);
	if (!prop['firstPopup'][1]) {
		prop['firstPopup'][1] = true;
		overwriteProperties(prop); // Updates panel
		const readmePath = fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\readme\\playlist_manager.txt';
		if ((isCompatible('1.4.0') ? utils.IsFile(readmePath) : utils.FileTest(readmePath, "e"))) {
			const readme = utils.ReadTextFile(readmePath, 65001);
			if (readme.length) {fb.ShowPopupMessage(readme, 'Playlist Manager');}
		}
	}
}

let panel = new _panel(true);
let list = new _list(LM, TM, 0, 0);

const autoSaveTimer =  zeroOrGreaterThan(getPropertyByKey(properties, 'AutoSave', prefix), 1000); // Safety limit 0 or > 1000
const autoUpdateTimer =  zeroOrGreaterThan(getPropertyByKey(properties, 'AutoUpdate', prefix), 100); // Safety limit 0 or > 100

function on_colours_changed() {
	panel.colours_changed();
	window.Repaint();
}

function on_font_changed() {
	panel.font_changed();
	window.Repaint();
}

function on_key_down(k) {
	list.key_down(k);
}

function on_mouse_lbtn_up(x, y) {
	if (cur_btn === null) {
		list.lbtn_up(x, y);
	}
	on_mouse_lbtn_up_buttn(x, y);
}

function on_mouse_lbtn_down(x, y) {
	on_mouse_lbtn_down_buttn(x, y);
}

function on_mouse_lbtn_dblclk(x, y) {
	if (cur_btn === null) {
		list.lbtn_dblclk(x, y);
	}
}

function on_mouse_move(x, y) {
	on_mouse_move_buttn(x, y);
	if (cur_btn === null) {
		list.move(x, y);
	}
}

function on_mouse_leave() {
	on_mouse_leave_buttn();
	list.onMouseLeaveList(); // Clears index selector
}

function on_mouse_rbtn_up(x, y) {
	// You must return true, if you want to suppress the default context menu.
	// Note: left shift + left windows key will bypass this callback and will open default context menu.
	return createMenuRight().btn_up(x, y);
}

function on_mouse_wheel(s) {
	list.wheel(s);
}

function on_paint(gr) {
	panel.paint(gr);
	list.paint(gr);
	on_paint_buttn(gr);
}

function on_size() {
	panel.size();
	list.w = panel.w - (LM * 2);
	list.h = panel.h - TM;
	list.size();
	on_size_buttn();
}

function on_playback_new_track() { // To show playing now indicators...
	window.Repaint();
}

function on_playlists_changed() { // To show/hide loaded indicators...
	window.Repaint();
}


// function on_drag_over(action, x, y, mask) { // Tracks movement for index selecting inside the panel
	// if (cur_btn === null) {
		// list.move(x, y);
	// }
// }

// function on_drag_leave() {
	// on_mouse_leave_buttn();
	// list.onMouseLeaveList(); // Clears index selector
// }

// function on_drag_drop(action, x, y, mask) {
	// list.onDragDrop(); // Sends track to playlist file
// }

// Autosave
// Halt execution if trigger rate is greater than autosave (ms), so it fires only once after successive changes made.
// if Autosave === 0, then it does nothing...
var debouncedUpdate = (autoSaveTimer) ? debounce(list.updatePlaylist, autoSaveTimer) : null;
function on_playlist_items_reordered(playlistIndex) {
	debouncedUpdate ? debouncedUpdate(playlistIndex, true) : null;
}
 
function on_playlist_items_removed(playlistIndex) {
	debouncedUpdate ? debouncedUpdate(playlistIndex, true) : null;
}
  
function on_playlist_items_added(playlistIndex) {
	debouncedUpdate ? debouncedUpdate(playlistIndex, true) : null;
}

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
	const playlistPathArray = getFiles(getPropertyByKey(properties, 'PlaylistPath', prefix), readablePlaylistFormats); // Workaround for win7 bug on extension matching with utils.Glob()
	const playlistPathArrayLength = playlistPathArray.length;
	if (playlistPathArrayLength !== (list.dataAll.length - list.itemsAutoplaylist)) { // Most times that's good enough. Count total items minus virtual playlists
		list.update(false, true, list.lastIndex);
		list.filter(); // Maintains focus on last selected item
		return true;
	} else { // Otherwise check size
		let totalFileSize = 0;
		for (let i = 0; i < playlistPathArrayLength; i++) {
			totalFileSize += isCompatible('1.4.0') ? utils.GetFileSize(playlistPathArray[i]) : utils.FileTest(playlistPathArray[i],'s'); //TODO: Deprecated
		}
		if (totalFileSize !== list.totalFileSize) { // User may have replaced a file with foobar executed
			list.update(false, true);
			list.filter(); // Updates with current filter (instead of showing all files when something changes) and maintains focus on last selected item
			return true;
		}
	}
	return false;
}

function oPlaylist (id, path, name = void(0), extension = void(0), size = '?', fileSize = 0, bLocked = false, bAutoPlaylist = false, queryObj = {query: '', sort: '', bSortForced: false}, category = '', tags = []) {
	if (typeof extension === 'undefined') {extension = isCompatible('1.4.0') ? utils.SplitFilePath(path)[2] : utils.FileTest(path, 'split')[2];}  //TODO: Deprecated
	if (typeof name === 'undefined') {
		const arr = isCompatible('1.4.0') ? utils.SplitFilePath(path) : utils.FileTest(path, 'split'); //TODO: Deprecated
		name = arr[1];
		if (name.endsWith(arr[2])) {name = name.replaceLast(arr[2],'');} // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
	}
	this.id = id;
	this.name = name;
	this.nameId = (id) ? name + id : name;
	this.extension = extension;
	this.path = path;
	this.size = size;
	this.fileSize = fileSize;
	this.isLocked = bLocked;
	this.isAutoPlaylist = bAutoPlaylist;
	this.query = queryObj['query'];
	this.sort = queryObj['sort'];
	this.bSortForced = queryObj['bSortForced'];
	this.category = category;
	this.tags = isArrayStrings(tags) ? tags : [];
	this.bShow = true; // TODO:
	
}

function loadPlaylistsFromFolder (folderPath = getPropertyByKey(properties, 'PlaylistPath', prefix)) {
	const playlistPathArray = getFiles(folderPath, readablePlaylistFormats); // Workaround for Win7 bug on extension matching with utils.Glob()
	const playlistPathArray_length = playlistPathArray.length;
	let playlistArray = [];
	let i = 0;
	// let bCreated = false;
	// let newFplIndex = -1;
	while (i < playlistPathArray_length) {
		let name = '';
		var uuid = '';
		var bLocked = false;
		var category = '';
		var tags = [];
		var size = null;
		if (playlistPathArray[i].endsWith('.m3u8') || playlistPathArray[i].endsWith('.m3u')) { // Schema does not apply for foobar native playlist format
			let text = utils.ReadTextFile(playlistPathArray[i], convertCharsetToCodepage('UTF-8')).split('\r\n');
			if (typeof text !== 'undefined' && text.length >= 1) {
				let commentsText = text.filter(function(e) {return e.startsWith('#');});
				if (typeof commentsText !== 'undefined' && commentsText.length >= 1) { // Use playlist info
					let lines = commentsText.length;
					let lineText = '';
					let j = 0;
					let iFound = 0;
					while (j < lines) {
						lineText = commentsText[j];
						if (lineText.startsWith('#PLAYLIST:')) {
							iFound++;
							name = lineText.split(':')[1];
						}
						if (lineText.startsWith('#UUID:')) {
							iFound++;
							uuid = lineText.split(':')[1];
						}
						if (lineText.startsWith('#LOCKED:')) {
							iFound++;
							bLocked = (lineText.split(':')[1] === 'true');
						}
						if (lineText.startsWith('#CATEGORY:')) {
							iFound++;
							category = lineText.split(':')[1];
						}
						if (lineText.startsWith('#TAGS:')) {
							iFound++;
							tags = lineText.split(':')[1].split(';').filter(Boolean); // All values separated by ; as an array
						}
						if (lineText.startsWith('#PLAYLISTSIZE:')) {
							iFound++;
							size = Number(lineText.split(':')[1]);
						}
						if (iFound === 6) {break;}
						j++;
					}
				}
			}			
			if (size === null) { // Or count tracks
				var filteredText = text.filter(function(e) {return !e.startsWith('#');});
				size = filteredText.length;
			}
		} else if (playlistPathArray[i].endsWith('.fpl')) { // AddLocations is async so it doesn't work...
			// if (bCreated) {
				// plman.AddLocations(newFplIndex, [playlistPathArray[i]], true);
				// size = plman.PlaylistItemCount(newFplIndex)
			// } else {
				// newFplIndex = plman.CreatePlaylist(plman.PlaylistCount, 'temp');
				// plman.AddLocations(newFplIndex, [playlistPathArray[i]], true);
				// size = plman.PlaylistItemCount(newFplIndex);
				// console.log(size);
				// bCreated = true;
			// }
		} else if (playlistPathArray[i].endsWith('.pls')) {
			let text = utils.ReadTextFile(playlistPathArray[i]).split('\r\n');
			if (typeof text !== 'undefined' && text.length >= 1) {
				let sizeText = text.filter(function(e) {return e.startsWith('NumberOfEntries');});
				if (typeof sizeText !== 'undefined' && sizeText.length >= 1) { // Use playlist info
					size = sizeText[0].split('=')[1];
				}
			}			
			if (size === null) { // Or count tracks
				let fileText = text.filter(function(e) {return e.startsWith('File');});
				size = fileText.length;
			}	
		}
		let fileSize = isCompatible('1.4.0') ? utils.GetFileSize(playlistPathArray[i]) : utils.FileTest(playlistPathArray[i],'s'); //TODO: Deprecated
		playlistArray[i] = new oPlaylist(uuid, playlistPathArray[i], name.length ? name : void(0), void(0), size !== null ? size : void(0), fileSize, bLocked, void(0), void(0), category.length ? category : void(0), isArrayStrings(tags) ? tags : void(0));
		i++;
	}
	// if (bCreated) {plman.RemovePlaylist(newFplIndex);}
	
	return playlistArray;
}