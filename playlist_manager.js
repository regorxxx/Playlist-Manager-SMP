'use strict';
//21/11/25

/* 	Playlist Manager
	Manager for Playlists Files and Auto-Playlists. Shows a virtual list of all playlists files within a configured folder (playlistPath).
	See readmes\playlist_manager.pdf for full documentation
*/

/* exported delayAutoUpdate, plsRwLock */

if (!window.ScriptInfo.PackageId) { window.DefineScript('Playlist-Manager-SMP', { author: 'regorxxx', version: '1.0.0-beta.4', features: { drag_n_drop: true, grab_focus: true } }); }

include('helpers\\helpers_xxx.js');
/* global globSettings:readable, folders:readable, checkCompatible:readable, checkUpdate:readable globTags:readable, popup:readable, debounce:readable, repeatFn:readable, isPortable:readable, MK_CONTROL:readable, VK_SHIFT:readable,, dropEffect:readable, IDC_WAIT:readable, VK_CONTROL:readable, MK_SHIFT:readable, IDC_ARROW:readable, IDC_HAND:readable, globProfiler:readable, globQuery:readable, VK_ALT:readable */
include('helpers\\helpers_xxx_flags.js');
/* global VK_LWIN:readable, dropMask:readable */
include('helpers\\helpers_xxx_properties.js');
/* global setProperties:readable, getPropertiesPairs:readable, overwriteProperties:readable, getPropertiesValues:readable, getPropertyByKey:readable */
include('helpers\\helpers_xxx_prototypes.js');
/* global isInt:readable, isBoolean:readable, isStringWeak:readable, _t:readable, isJSON:readable, isString:readable, isUUID:readable, UUID:readable, _p:readable, range:readable, clone:readable, _ps:readable */
include('helpers\\helpers_xxx_prototypes_smp.js');
/* global extendGR:readable */
include('helpers\\helpers_xxx_playlists.js');
/* global getPlaylistIndexArray:readable */
include('helpers\\helpers_xxx_playlists_files.js');
/* global libItemsAbsPaths:writable, libItemsRelPaths:writable, precacheLibraryPathsAsync:readable, precacheLibraryRelPaths:readable, writablePlaylistFormats:readable, playlistDescriptors:readable */
include('helpers\\helpers_xxx_UI.js');
/* global _scale:readable, invert:readable, opaqueColor:readable, LM:readable, TM:readable, blendColors:readable, isDark:readable, getBrightness:readable, toRGB:readable */
include('helpers\\helpers_xxx_UI_chars.js');
/* global chars:readable */
include('helpers\\helpers_xxx_file.js');
/* global _isFile:readable, _copyFile:readable, _recycleFile:readable, WshShell:readable, _open:readable, utf8:readable, _hasRecycleBin:readable */
include('helpers\\helpers_xxx_tags.js');
/* global checkQuery:readable */
include('helpers\\popup_xxx.js');
/* global _popup:readable */
include('helpers\\helpers_xxx_instances.js');
/* global newInstancesManager:readable */
include('helpers\\playlist_history.js');
/* global PlsHistory:readable */
include('helpers\\callbacks_xxx.js');
/* global callbacksListener:readable, removeEventListenerSelf:readable */
include('main\\playlist_manager\\playlist_manager_list.js');
/* global _list:readable */
include('main\\playlist_manager\\playlist_manager_panel.js');
/* global _panel:readable */
include('main\\playlist_manager\\playlist_manager_buttons.js');
/* global createMenuRightFilter:readable, createMenuRightSort:readable, _listButtons */
include('main\\playlist_manager\\playlist_manager_menu.js');
/* global createMenuRightTop:readable, createMenuRight:readable, importSettingsMenu:readable */
include('main\\playlist_manager\\playlist_manager_helpers.js');
/* global backup:readable, switchLock:readable, clonePlaylistInUI:readable, exportPlaylistFileWithTracksConvert:readable, exportAutoPlaylistFileWithTracksConvert:readable, renamePlaylist:readable */
include('main\\playlist_manager\\playlist_manager_listenbrainz.js');
/* global ListenBrainz:readable */
include('main\\playlist_manager\\playlist_manager_statistics.js');
/* global _listStatistics:readable */
include('main\\window\\window_xxx_dynamic_colors.js');
/* global dynamicColors:readable, mostContrastColor:readable */
include('main\\window\\window_xxx_scrollbar.js');
/* global _scrollBar:readable */

globProfiler.Print('helpers');
checkCompatible('1.6.1', 'smp');

const instances = newInstancesManager(globSettings.instanceManager);

// Cache
let plmInit = { interval: null, lastUpdate: 0 };
const cacheLib = (bInit = false, message = 'Loading...', tt = 'Caching library paths...\nPanel will be disabled during the process.', bForce = false) => {
	if (typeof list !== 'undefined' && list && list.bLiteMode) { return null; }
	if (instances.isWorking) {
		if (plmInit.interval) { return null; }
		if (!bForce) {
			list.cacheLibTimer = debouncedCacheLib(bInit, message, tt, bForce);
			return list.cacheLibTimer;
		}
	}
	// Only execute once per Foobar2000 instance
	if ((instances.getMain(window.ScriptInfo.Name) || {}).id === window.ID || bForce) {
		if (plmInit.interval) { clearInterval(plmInit.interval); plmInit.interval = null; }
		else if (bInit) { return null; } // Ensure it only runs once on startup
		if (!pop.isEnabled()) { pop.enable(true, message, tt, 'cacheLib'); }
		libItemsAbsPaths = []; // NOSONAR
		libItemsRelPaths = {}; // NOSONAR
		precacheLibraryPathsAsync().then(() => {
			window.NotifyOthers('xxx-scripts: precacheLibraryPaths', [...libItemsAbsPaths]);
			pop.disable(true);
		}, () => {
			// Already using data from other instance. See on_notify_data
			pop.disable(true);
		}).finally(() => {
			if (typeof list !== 'undefined' && list) {
				if (list.bRelativePath && list.playlistsPath.length) {
					if (!pop.isEnabled()) { pop.enable(true, message, tt, 'cacheLib'); }
					precacheLibraryRelPaths(list.playlistsPath);
					list.plsCache.clear();
					fb.queryCache.clear();
					pop.disable(true);
					const lBrainzToken = list.properties.lBrainzToken[1];
					const bEncrypted = list.properties.lBrainzEncrypt[1];
					if (lBrainzToken.length && !bEncrypted) {
						ListenBrainz.validateToken(lBrainzToken, true).then((bValid) => { // Omit network errors
							if (!bValid) { ListenBrainz.consoleError('Token can not be validated.'); }
						});
					}
				}
				clearTimeout(list.cacheLibTimer);
				list.cacheLibTimer = null;
				list.bLibraryChanged = false;
			}
		});
	} else {
		if (!pop.isEnabled()) { pop.enable(true, message, tt, 'cacheLib waiting'); } // Disabled on notify
		else { pop.setReason('cacheLib waiting'); }
		window.NotifyOthers('xxx-scripts: precacheLibraryPaths ask', null);
	}
	return null;
};
const debouncedCacheLib = debounce(cacheLib, 5000);

let properties = {
	playlistsPath: ['Tracked playlists folder', '.\\profile\\playlist_manager\\', { func: isString, portable: true }],
	autoSave: ['Auto-save delay with loaded playlists (in ms). Forced > 1000. 0 disables it.', 3000, { func: isInt, range: [[0, 0], [1000, Infinity]] }], // Safety limit 0 or > 1000
	fplRules: ['fpl playlists behavior', JSON.stringify({
		bLockOnLoad: true,
		bNonTrackedSupport: true,
	}), { func: isJSON }],
	extension: ['Extension used when saving playlists', '.m3u8', { func: (val) => writablePlaylistFormats.has(val) }],
	autoUpdate: ['Periodically checks playlist path (in ms). Forced > 200. 0 disables it.', 5000, { func: isInt, range: [[0, 0], [200, Infinity]] }], // Safety limit 0 or > 200
	bShowSize: ['Show playlist size', false, { func: isBoolean }],
	bUpdateAutoPlaylist: ['Update AutoPlaylist size by query output', true, { func: isBoolean }],
	bUseUUID: ['Use UUIDs along playlist names (not available for .pls playlists).', false, { func: isBoolean }],
	optionUUID: ['UUID current method', '', { func: isStringWeak }],
	methodState: ['Current sorting method. Allowed: ', '', { func: isStringWeak }], // Description and value filled on list.init() with defaults. Just a placeholder
	sortState: ['Current sorting order. Allowed: ', '', { func: isStringWeak }], // Description and value filled on list.init() with defaults. Just a placeholder
	bSaveFilterStates: ['Save filtering between sessions', true, { func: isBoolean }],
	filterStates: ['Current filters: ', '0,0', { func: isString }], // Description and value filled on list.init() with defaults. Just a placeholder
	bShowSep: ['Show name/category separators: ', true, { func: isBoolean }],
	listColors: ['List items color codes', '', { func: isStringWeak }],
	infoPopups: ['Info popups fired once', JSON.stringify({
		firstInit: false,
		fplFormat: false,
		plsFormat: false,
		xspFormat: false,
		xspfFormat: false,
		noLibTracked: false,
		subsongItem: false,
		networkDrive: false,
		plsMirror: false,
		autoTags: false
	}), { func: isJSON }],
	bRelativePath: ['Use relative paths for all new playlists', false, { func: isBoolean }],
	scrollSettings: ['Scroll settings', JSON.stringify({
		bSmooth: true,
		bReversed: false,
		unit: null
	}), { func: isJSON }],
	bOnNotifyColors: ['Adjust colors on panel notify', true, { func: isBoolean }],
	categoryState: ['Current categories showed.', JSON.stringify([]), { func: isJSON }], // Description and value filled on list.init() with defaults. Just a placeholder
	tooltipSettings: ['Tooltip settings', JSON.stringify({
		bShowTips: true,
		show: {
			category: true,
			dateCreated: false,
			dateModified: true,
			duration: true,
			locks: true,
			query: true,
			mbid: true,
			tags: true,
			trackSize: true,
		}
	}), { func: isJSON }],
	bAutoLoadTag: ['Automatically add \'bAutoLoad\' to all playlists', false, { func: isBoolean }],
	bAutoLockTag: ['Automatically add \'bAutoLock\' to all playlists', false, { func: isBoolean }],
	bAutoCustomTag: ['Automatically add custom tags to all playlists', false, { func: isBoolean }],
	autoCustomTag: ['Custom tags to add', '', { func: isStringWeak }],
	bApplyAutoTags: ['Apply actions based on tags (lock, load)', false, { func: isBoolean }],
	bAutoTrackTag: ['Enable auto-tagging for added tracks (at autosave)', false, { func: isBoolean }],
	bAutoTrackTagAlways: ['Enable auto-tagging for added tracks (always)', false, { func: isBoolean }],
	bAutoTrackTagPls: ['Auto-tagging for standard playlists', false, { func: isBoolean }],
	bAutoTrackTagLockPls: ['Auto-tagging for locked playlists', false, { func: isBoolean }],
	bAutoTrackTagAutoPls: ['Auto-tagging for AutoPlaylists', false, { func: isBoolean }],
	bAutoTrackTagAutoPlsInit: ['Auto-tagging for AutoPlaylists at startup', false, { func: isBoolean }],
	converterPreset: ['Converter Preset list', JSON.stringify([
		{ name: '', dsp: '...', tf: '.\\%FILENAME%.mp3', path: '', playlistOutPath: '', extension: '' }, // Export all at same folder
		{ name: '', dsp: '...', tf: '.\\' + _t(globTags.artist) + '\\%ALBUM%\\%TRACK% - %TITLE%.mp3', path: '', playlistOutPath: '', extension: '' }, // Transfer library
		{ name: '--Kodi LibrELEC (<your_disk_name>)--', dsp: '...', tf: '/media/<your_disk_name>/music/$puts(art,$ascii($if2($meta(' + globTags.artistRaw + ',0),$meta(ARTIST,0))))$ifequal($strrchr($get(art),.),$len($get(art)),$puts(art,$cut($get(art),$sub($len($get(art)),1))),)$puts(alb,$ascii(%album%))$ifequal($strrchr($get(alb),.),$len($get(alb)),$puts(alb,$cut($get(alb),$sub($len($get(alb)),1))),)$replace($get(art),:,-,/,-,?,)/$replace($get(alb),:,-,/,-,?,)/$replace($ascii(%TRACK% - %TITLE%),:,-,/,-,?,).lossy.flac', path: '', playlistOutPath: '', extension: '.m3u', bExtendedM3U: true }, // Kodi-like library
		{ name: '--Kodi Windows (<your_disk_name>)--', dsp: '...', tf: '<your_disk_name>:\\music\\$ascii($if2($meta(' + globTags.artistRaw + ',0),$meta(ARTIST,0))\\%album%\\%TRACK% - %TITLE%).mp3', path: '', playlistOutPath: '', extension: '.m3u', bExtendedM3U: true }, // Kodi-like library
		{ name: '--Foobar2000 mobile (playlists folder)--', dsp: '...', tf: '..\\music\\$ascii($if2($meta(' + globTags.artistRaw + ',0),$meta(ARTIST,0))\\%ALBUM%\\%TRACK% - %TITLE%).mp3', path: '', playlistOutPath: '', extension: '.m3u8', bExtendedM3U: true }, // Foobar2000 mobile, playlists on different folder than music
		{ name: '--Foobar2000 mobile (root)--', dsp: '...', tf: '.\\music\\$ascii($if2($meta(' + globTags.artistRaw + ',0),$meta(ARTIST,0))\\%ALBUM%\\%TRACK% - %TITLE%).mp3', path: '', playlistOutPath: '', extension: '.m3u8', bExtendedM3U: true }, // Foobar2000 mobile, playlists on same root than music (without a folder)
		{ name: '--Foobar2000 mobile (same folder)--', dsp: '...', tf: '.\\$ascii($if2($meta(' + globTags.artistRaw + ',0),$meta(ARTIST,0))\\%ALBUM%\\%TRACK% - %TITLE%).mp3', path: '', playlistOutPath: '', extension: '.m3u8', bExtendedM3U: true }, // Foobar2000 mobile, playlists on same folder than music
		{ name: '--FiiO (playlists folder)--', dsp: '...', tf: '\\storage\\external_sd1\\' + globTags.artistAlbumTrackTitlePath + '.mp3', path: '', playlistOutPath: '#EXPORT##PLAYLIST#.playlist#EXT#', extension: '.m3u8', bExtendedM3U: false } // FiiO music
	]), { func: isJSON }],
	bForbidDuplicates: ['Skip duplicates when adding to playlists', true, { func: isBoolean }],
	bDeadCheckAutoSave: ['Warn about dead items on auto-save', false, { func: isBoolean }],
	bBOM: ['Save files as UTF8 with BOM', false, { func: isBoolean }],
	removeDuplicatesAutoPls: ['AutoPlaylists, Remove duplicates by', JSON.stringify(globTags.remDupl), { func: isJSON }],
	bRemoveDuplicatesAutoPls: ['AutoPlaylists, filtering enabled', true, { func: isBoolean }],
	bShowMenuHeader: ['Show header on playlist menus', true, { func: isBoolean }],
	bCopyAsync: ['Copy tracks asynchronously on export', true, { func: isBoolean }],
	bRemoveDuplicatesSmartPls: ['Smart Playlists, filtering enabled', true, { func: isBoolean }],
	bSavingWarnings: ['Warnings when saving to another format', true, { func: isBoolean }],
	bQuickSearchName: ['Quick-search forced by name', true, { func: isBoolean }],
	deletePlsStartup: ['Delete playlists on startup', JSON.stringify([]), { func: isJSON }],
	bCheckDuplWarnings: ['Warnings when loading duplicated playlists', true, { func: isBoolean }],
	bSavingXsp: ['Auto-save .xsp playlists', false, { func: isBoolean }],
	bAllPls: ['Track UI-only playlists', false, { func: isBoolean }],
	autoBack: ['Auto-backup interval for playlists (in ms). Forced > 1000. 0 disables it.', Infinity, { func: !isNaN, range: [[0, 0], [1000, Infinity]] }], // Infinity calls it on unload and playlist changes only
	autoBackN: ['Auto-backup files allowed.', 50, { func: isInt }],
	filterMethod: ['Current filter buttons', 'Playlist type,Lock state', { func: isString }],
	bSavingDefExtension: ['Try to save playlists always as default format', true, { func: isBoolean }],
	deletePlsStartupFiles: ['Delete playlists files on startup', false, { func: isBoolean }],
	bOpenOnExport: ['Open folder on export actions', true, { func: isBoolean }],
	bShowIcons: ['Show playlist icons', true, { func: isBoolean }],
	playlistIcons: ['Playlist icons codes (Font Awesome)', JSON.stringify(
		Object.fromEntries(Object.entries(playlistDescriptors).map((plsPair) => {
			const key = plsPair[0];
			const icon = plsPair[1].icon ? plsPair[1].icon.charCodeAt(0).toString(16) : null;
			const iconBg = plsPair[1].iconBg ? plsPair[1].iconBg.charCodeAt(0).toString(16) : null;
			return [key, { icon, iconBg }];
		}))), { func: isJSON }],
	iDynamicMenus: ['Show dynamic menus', 1, { func: isInt, range: [[0, 2]] }],
	lShortcuts: ['L. click modifiers', JSON.stringify({
		Ctrl: 'Copy selection to playlist',
		Shift: 'Load / show playlist',
		'Ctrl + Shift': 'Clone playlist in UI',
		'Single Click': '- None -',
		'Double Click': 'Load / show playlist'
	}), { func: isJSON }],
	mShortcuts: ['M. click modifiers', JSON.stringify({
		Ctrl: '- None -',
		Shift: 'Multiple selection (range)',
		'Ctrl + Shift': '- None -',
		'Single Click': 'Multiple selection'
	}), { func: isJSON }],
	bMultMenuTag: ['Automatically add \'bMultMenu\' to all playlists', false, { func: isBoolean }],
	lBrainzToken: ['ListenBrainz user token', '', { func: isStringWeak }],
	lBrainzEncrypt: ['Encrypt ListenBrainz user token', false, { func: isBoolean }],
	bLookupMBIDs: ['Lookup for missing track MBIDs', true, { func: isBoolean }],
	bAdvTitle: ['AutoPlaylists, duplicates RegExp title matching', true, { func: isBoolean }],
	activePlsStartup: ['Active playlist on startup', '', { func: isStringWeak }],
	bBlockUpdateAutoPls: ['Block panel while updating AutoPlaylists', false, { func: isBoolean }],
	bQuickSearchNext: ['Quick-search jump to next item when letter is pressed twice', true, { func: isBoolean }],
	bQuickSearchCycle: ['Quick-search cycling when no more items found', true, { func: isBoolean }],
	mShortcutsHeader: ['M. click (header) modifiers', JSON.stringify({
		Ctrl: '- None -',
		Shift: '- None -',
		'Ctrl + Shift': '- None -',
		'Single Click': 'Multiple selection (all)'
	}), { func: isJSON }],
	lShortcutsHeader: ['L. click (header) modifiers', JSON.stringify({
		Ctrl: '- None -',
		Shift: '- None -',
		'Ctrl + Shift': '- None -',
		'Single Click': 'Show current / playing playlist',
		'Double Click': 'Cycle categories'
	}), { func: isJSON }],
	showMenus: ['Show menus configuration', JSON.stringify({
		'Playlist\'s items menu': false,
		'Category': true,
		'Tags': true,
		'Relative paths handling': false,
		'Export and copy': true,
		'Online sync': true,
		'Sorting': true,
		'File management': true,
		'UI playlist locks': true,
		'File locks': true,
		'Quick-search': true,
		'Folders': true,
		'Statistics mode': true,
		'Queue handling': true
	}), { func: isJSON }],
	searchMethod: ['Search settings', JSON.stringify({
		bName: true,
		bTags: true,
		bCategory: true,
		bPath: true,
		pathLevel: 2,
		bAutoSearch: true,
		bRegExp: true,
		bResetFilters: false,
		bResetStartup: false,
		bSimpleFuzzy: true,
		bMetaPls: true,
		bMetaTracks: false,
		meta: [globTags.artist, 'ALBUM', globTags.title, globTags.date],
		bQuery: true,
		bMetaQuery: true,
		dragDropPriority: ['bPath', 'bQuery', 'bMetaTracks'],
		dragDropTags: [globTags.title, globTags.artistRaw],
		text: '',
	}), { func: isJSON }],
	uiElements: ['UI elements', JSON.stringify({
		'Scrollbar': { enabled: true },
		'Search filter': { enabled: true },
		'Columns': { enabled: true },
		'Up/down buttons': { enabled: false },
		'Bottom toolbar': { enabled: true },
		'Header buttons': {
			enabled: true, elements:
			{
				'Power actions': { enabled: true, position: 0 },
				'Filter and sorting': { enabled: true, position: 1 },
				'Switch columns': { enabled: true, position: 2 },
				'List menu': { enabled: true, position: 3 },
				'Settings menu': { enabled: true, position: 4 },
				'Folder': { enabled: true, position: 5 },
				'Help': { enabled: true, position: 6 },
			}
		}
	}), { func: isJSON }],
	bSetup: ['Setup mode', true, { func: isBoolean }],
	iDoubleClickTimer: ['Double click timer', 375, { func: isInt }],
	rShortcuts: ['R. click modifiers', JSON.stringify({
		Ctrl: '- None -',
		Shift: 'Playlist\'s items menu',
		'Ctrl + Shift': '- None -',
		'Single Click': 'Manage playlist'
	}), { func: isJSON }],
	bSpotify: ['ListenBrainz export to Spotify', true, { func: isBoolean }],
	iTooltipTimer: ['Tooltip timer', 375 * 2, { func: isInt }],
	bGlobalShortcuts: ['Enable FX global shortcuts', true, { func: isBoolean }],
	columns: ['Columns options', JSON.stringify({
		labels: ['size', 'duration'],
		width: ['auto', 'auto'],
		font: ['small', 'small'],
		align: ['right', 'right'],
		color: ['playlistColor', 'playlistColor'],
		bShown: [true, true],
		line: 'none',
		autoWidth: 'entire list',
		sizeUnits: { prefix: '', suffix: ' \u266A' } // Musical note
	}), { func: isJSON }],
	bSkipMenuTag: ['Automatically add \'bSkipMenuTag\' to all playlists', false, { func: isBoolean }],
	bLiteMode: ['Lite mode enabled? (foo_plorg replacement)', false, { func: isBoolean }],
	bAutoSelTitle: ['Playlist\'s name from selection using ARTIST[ - ALBUM]', false, { func: isBoolean }],
	folders: ['Folders options', JSON.stringify({
		maxDepth: 3,
		bShowSize: true,
		bShowSizeDeep: true,
		icons: { open: chars.downOutline, closed: chars.leftOutline }
	}), { func: isJSON }],
	bStatsMode: ['Stats mode enabled', false, { func: isBoolean }],
	statsConfig: ['Stats mode configuration', JSON.stringify({
		// graph: {/* type, borderWidth, point */},
		// dataManipulation = {/* sort, filter, slice, distribution , probabilityPlot*/},
		background: { color: null },
		margin: { left: _scale(20), right: _scale(20), top: _scale(10), bottom: _scale(15) },
		// grid = {x: {/* show, color, width */}, y: {/* ... */}},
		// axis = {x: {/* show, color, width, ticks, labels, key, bSingleLabels */}, y: {/* ... */}}
	}), { func: isJSON }],
	bAutoUpdateCheck: ['Automatically check updates', globSettings.bAutoUpdateCheck, { func: isBoolean }],
	panelUUID: ['Panel UUID', UUID(), { func: isUUID }],
	bAutoRefreshXsp: ['Automatically refresh XSP playlists sources', true, { func: isBoolean }],
	deleteBehavior: ['Playlist file delete behavior', 0, { func: (n) => n >= 0 && n <= 2 }],
	delays: ['Panel loading delays', JSON.stringify({
		playlistLoading: 5000,
		startupPlaylist: 2000,
		dynamicMenus: 2500,
		playlistCache: 6000,
	}), { func: isJSON }],
	statusIcons: ['Playlist status icons', JSON.stringify({
		active: { enabled: true, string: String.fromCharCode(8226) /* • */, offset: true },
		playing: { enabled: true, string: String.fromCharCode(9654) /* ▶ */, offset: false },
		loaded: { enabled: true, string: String.fromCharCode(187) /* » */, offset: true }
	}), { func: isJSON }],
	bForceCachePls: ['Force playlist cache at init', false, { func: isBoolean }],
	importPlaylistFilters: ['Import file \\ url filters', JSON.stringify([globQuery.stereo, globQuery.notLowRating, globQuery.noLive, globQuery.noLiveNone]), { func: (x) => isJSON(x) && JSON.parse(x).every((query) => checkQuery(query, true)) }],
	importPlaylistMask: ['Import file \\ url pattern', JSON.stringify(['. ', '%TITLE%', ' - ', globTags.artist]), { func: isJSON }],
	bMultiple: ['Partial multi-value tag matching', true, { func: isBoolean }],
	folderRules: ['Send new playlists to folders', JSON.stringify({
		externalUi: '',
		internalUi: '',
		plsFromSel: '',
		others: ''
	}), { func: isJSON }],
	bRwLock: ['Not overwrite playlists loading new files', false, { func: isBoolean }],
	logOpt: ['Logging options', JSON.stringify({
		autoSize: false,
		loadPls: false,
		profile: false,
		mainMenu: false
	}), { func: isJSON }],
	xspfRules: ['XSPF playlists behavior', JSON.stringify({
		bFallbackComponentXSPF: false,
		bLoadNotTrackedItems: false,
	}), { func: isJSON }],
};
Object.keys(properties).forEach(p => properties[p].push(properties[p][1]));
setProperties(properties, 'plm_');
{	// Check if is a setup or normal init
	let prop = getPropertiesPairs(properties, 'plm_');
	const infoPopups = JSON.parse(prop.infoPopups[1]);
	if (infoPopups.firstInit && prop.bSetup[1]) { prop.bSetup[1] = false; overwriteProperties(prop); } // Don't apply on already existing installations
	if (!prop.bSetup[1] && !prop.bLiteMode[1]) {
		instances.init();
		instances.add(window.ScriptInfo.Name);
		instances.get(window.ScriptInfo.Name, true);
		plmInit.interval = setInterval(cacheLib, 500, true);
		instances.getInterval(window.ScriptInfo.Name, 30000);
	}
	// Update default values for JSON properties (for compat with new releases)
	const props = ['columns', 'rShortcuts', 'uiElements', 'searchMethod', 'showMenus', 'lShortcutsHeader', 'mShortcutsHeader', 'mShortcuts', 'lShortcuts', 'playlistIcons', 'logOpt'];
	let bDone = false;
	props.forEach((propKey) => {
		const oldProp = JSON.parse(prop[propKey][1]);
		const defProp = JSON.parse(prop[propKey][3]);
		let bParse = false;
		for (let key in defProp) {
			if (!Object.hasOwn(oldProp, key)) { oldProp[key] = defProp[key]; bParse = true; }
		}
		for (let key in oldProp) {
			if (!Object.hasOwn(defProp, key)) { delete oldProp[key]; bParse = true; }
		}
		if (bParse) {
			prop[propKey][1] = JSON.stringify(oldProp);
			bDone = true;
			console.log('Playlist Manager: Rewriting default values for property ' + _p(propKey));
		}
	});
	// Update default info popup values (for compat with new releases)
	if (!infoPopups.firstInit) {
		[	// xspf popup is left to fire again on purpose
			{ property: 'plm_16.Playlist Manager: Fired once', key: 'firstInit' },
			{ property: 'plm_18.Playlist Manager fpl: Fired once', key: 'fplFormat' },
			{ property: 'plm_19.Playlist Manager pls: Fired once', key: 'plsFormat' },
			{ property: 'plm_43.Playlist Manager xsp: Fired once', key: 'xspFormat' },
			{ property: 'plm_52.Playlist Manager on network drive: Fired once', key: 'networkDrive' },
		].map((o) => {
			if (window.GetProperty(o.property, false)) {
				window.SetProperty(o.property, null);
				infoPopups[o.key] = true;
				return true;
			}
		}).some((val) => {
			if (val) {
				bDone = true;
				prop.infoPopups[1] = JSON.stringify(infoPopups);
				return true;
			}
		});
	}
	// Update old properties (for compat with new releases)
	[
		{ property: 'plm_01.Path to the folder containing the playlists', key: 'playlistsPath' },
	].map((o) => {
		const val = window.GetProperty(o.property, null);
		if (val !== null) {
			window.SetProperty(o.property, null);
			prop[o.key][1] = val;
			return true;
		}
	}).some((val) => {
		if (val) {
			bDone = true;
			return true;
		}
	});
	if (bDone) { overwriteProperties(prop); }
	if (prop.bAutoUpdateCheck[1]) {
		include('helpers\\helpers_xxx_web_update.js');
		setTimeout(checkUpdate, 120000, { bDownload: globSettings.bAutoUpdateDownload, bOpenWeb: globSettings.bAutoUpdateOpenWeb });
	}
	// Rename json file on lite mode the first time it runs
	if (prop.panelUUID[1] === properties.panelUUID[1] && prop.bLiteMode[1]) {
		const file = folders.data + 'playlistManager_' + prop.playlistsPath[1].split('\\').filter(Boolean).pop().replace(':', '');
		if (_isFile(file + '.json')) {
			const newFile = folders.data + 'playlistManager_' + prop.panelUUID[1];
			const suffix = ['.json', '_sorting.json', '_config.json', '.json.old', '_sorting.json.old', '_config.json.old'];
			if (suffix.every((s) => { return !_isFile(file + s) || _copyFile(file + s, newFile + s); })) {
				console.log(window.Name + ' (Playlist-Manager-SMP): creating UUID file from existing JSON ' + _p(file + '.json')); // DEBUG
				suffix.forEach((s) => _recycleFile(file + s, true));
			} else {
				suffix.forEach((s) => _recycleFile(newFile + s, true));
				console.popup(window.Name + _ps(window.ScriptInfo.Name) + ': error creating UUID file from existing JSON\n\n' + file, window.Name + _ps(window.ScriptInfo.Name));
			}
		}
	}
}
// Panel
const bottomToolbar = new _listButtons(getPropertyByKey(properties, 'bSetup', 'plm_'));
const panel = new _panel(true, getPropertyByKey(properties, 'bSetup', 'plm_'));
// Popups
const pop = new _popup({
	configuration: {
		border: { enabled: false }, // Just overlay without a popup
		icon: { enabled: true }, // Enable animation
		color: { panel: opaqueColor(0xFF4354AF, 30), text: invert(panel.getColorBackground(), true) } // Blue overlay
	}
});
// Globals
let debouncedAutoUpdate;
let debouncedUpdate;
let delayAutoUpdate = () => void (0);
let autoBackRepeat;
let autoUpdateRepeat;
let plsRwLock;

{	// Info Popup and setup
	let prop = getPropertiesPairs(properties, 'plm_');
	const infoPopups = JSON.parse(prop.infoPopups[1]);
	// Disable panel on init until it's done
	if (prop.bSetup[1]) {
		pop.enable(true, 'Setup', 'Setup required.\nPanel will be disabled during the process.');
	} else if (!infoPopups.firstInit) {
		if (folders.JsPackageDirs) { // Workaround for https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/210
			WshShell.Popup('This script has been installed as a package.\nBefore closing the \'Spider Monkey Panel\\JSplitter configuration window\' all popups must be closed, take your time reading them and following their instructions.\nAfterwards, close the window. Panel will be reloaded.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.info + popup.ok);
			if (getPropertiesValues(properties, 'plm_').filter(Boolean).length === 0) { // At this point nothing works properly so just throw
				throw new Error('READ THE POPUPS AND STOP CLICKING ON BUTTONS WITHOUT READING!!!\nOtherwise TT, aka GeoRrGiA-ReBorN\'s master, will try\nto kill you with their good jokes.\n\nReally, read the popups and make our lives easier. Try reinstalling the script.\n\nThanks :)');
			}
		}
		infoPopups.firstInit = true;
		prop.infoPopups[1] = JSON.stringify(infoPopups);
		isPortable(prop['playlistsPath'][0]);
		const readmePath = folders.xxx + 'helpers\\readme\\playlist_manager.txt';
		const readme = _open(readmePath, utf8);
		const uiElements = JSON.parse(prop.uiElements[1]);
		if (readme.length) { fb.ShowPopupMessage(readme, 'Playlist Manager: introduction'); }
		{	// Lite mode
			const answer = WshShell.Popup('By default Playlist Manager is installed with a myriad of features and the ability to manage playlist files.\nSome users may be looking for a simple foo_plorg replacement, in which case lite mode should be enabled. \n\nEnable lite mode?', 0, 'Lite mode', popup.question + popup.yes_no);
			if (answer === popup.yes) {
				prop.bLiteMode[1] = true;
			}
		}
		{	// Simple mode
			const features = ['Tags', 'Relative paths handling', 'Export and copy', 'Online sync', 'Statistics mode'].concat(prop.bLiteMode[1] ? ['File locks'] : []);
			const otherFeatures = ['Advanced search tools'];
			const answer = prop.bLiteMode[1]
				? popup.no
				: WshShell.Popup('By default Playlist Manager is installed with some features hidden.\nHidden features may be switch at \'UI\\Playlist menus\' at any time.\nDo you want to enable them now?\n\nList: ' + [...features, ...otherFeatures].join(', '), 0, 'Features', popup.question + popup.yes_no);
			if (answer === popup.no) {
				// Menus
				const showMenus = JSON.parse(prop.showMenus[1]);
				features.forEach((key) => {
					showMenus[key] = false;
				});
				prop.showMenus[3] = prop.showMenus[1] = JSON.stringify(showMenus);
				// Other tools
				const searchMethod = JSON.parse(prop.searchMethod[1]);
				searchMethod.bPath = searchMethod.bRegExp = searchMethod.bMetaPls = false;
				prop.searchMethod[1] = JSON.stringify(searchMethod);
			}
		}
		if (prop.bLiteMode[1]) {	// Bottom toolbar
			const answer = WshShell.Popup('Show the bottom toolbar for quick access to sorting and filtering?\nUI elements can be tweaked later at Settings menu \'UI\\UI elements\' submenu.\n\n(Click no if looking for a simple replacement of foo_plorg)', 0, 'Bottom toolbar', popup.question + popup.yes_no);
			if (answer === popup.no) {
				uiElements['Bottom toolbar'].enabled = false;
				prop.uiElements[1] = JSON.stringify(uiElements);
			}
		}
		{	// UI tracking
			const answer = prop.bLiteMode[1]
				? popup.yes
				: WshShell.Popup('By default only physical playlist files are used.\nUI-only playlists tracking may be enabled at \'Panel behavior\'.\nDo you want to enable it now?\n\n(Enable it if looking for a replacement of foo_plorg)', 0, 'UI-only playlists tracking', popup.question + popup.yes_no);
			if (answer === popup.yes) {
				prop.bAllPls[1] = true;
			}
		}
		{	// Contextual menus
			const features = ['Playlist\'s items menu'];
			const answer = prop.bLiteMode[1]
				? popup.yes
				: prop.bAllPls[1]
					? WshShell.Popup('Show native contextual menu on UI-playlists (applies to its items)?', 0, 'Playlist contextual menus', popup.question + popup.yes_no)
					: popup.no;
			if (answer === popup.yes) {
				// Menus
				const showMenus = JSON.parse(prop.showMenus[1]);
				features.forEach((key) => {
					showMenus[key] = answer === popup.yes;
				});
				prop.showMenus[3] = prop.showMenus[1] = JSON.stringify(showMenus);
			}
		}
		{	// Manual sorting
			const answer = prop.bLiteMode[1]
				? popup.yes
				: WshShell.Popup('By default automatic sorting by name is used.\n\nManual sorting can be set at the ' + (uiElements['Bottom toolbar'].enabled ? 'sorting button at bottom and ' : '') + 'filter and sorting menu at top.\nWith manual sorting, playlists may be reordered using drag n\' drop or the contextual menu.\nDo you want to enable it now?\n\n(Enable it if looking for a replacement of foo_plorg)', 0, 'Manual sorting', popup.question + popup.yes_no);
			if (answer === popup.yes) {
				new Promise((resolve) => {
					const timer = setInterval(() => {
						if (list && list.bInit) { clearInterval(timer); resolve(); }
					}, 250);
				}).then(() => {
					list.changeSorting(list.manualMethodState());
				});
			}
		}
		{	// Folders
			const answer = prop.bLiteMode[1]
				? popup.yes
				: WshShell.Popup('By default folders are disabled and playlists may be sorted using categories/tags and the different filter/sorting options.\nEnabling folders allow to group items in a hierarchical list. Playlists may be moved using drag n\' drop.\nDo you want to enable it now?\n\n(Enable it if looking for a replacement of foo_plorg)', 0, 'Folders', popup.question + popup.yes_no);
			if (answer === popup.yes) {
				const showMenus = JSON.parse(prop.showMenus[1]);
				showMenus['Folders'] = true;
				prop.showMenus[3] = prop.showMenus[1] = JSON.stringify(showMenus);
			}
		}
		// Other changes due to lite mode
		if (prop.bLiteMode[1]) {
			prop.bAutoSelTitle[1] = true;
			prop.autoSave[1] = 1000;
			prop.delays[1] = JSON.stringify({
				playlistLoading: 0,
				startupPlaylist: 1000,
				dynamicMenus: 2500,
				playlistCache: 6000,
			});
		}
		overwriteProperties(prop); // Updates panel
		// Share ListenBrainz Token
		if (!prop.lBrainzToken[1].length) {
			callbacksListener.lBrainzTokenListener = true;
			setTimeout(() => window.NotifyOthers('xxx-scripts: lb token', null), 3000);
			setTimeout(() => { callbacksListener.lBrainzTokenListener = false; }, 6000);
		}
		// Create listener to check for same playlist path which usually requires a reminder to set another tracked folder
		const callback = () => !pop.isEnabled() && list && list.bInit
			? window.NotifyOthers(window.ScriptInfo.Name + ': playlistPath', null)
			: setTimeout(callback, 3000);
		setTimeout(callback, 6000);
		const listener = addEventListener('on_notify_data', (name, info) => {
			if (name === 'bio_imgChange' || name === 'biographyTags' || name === 'bio_chkTrackRev' || name === 'xxx-scripts: panel name reply') { return; }
			switch (name) { // NOSONAR
				case window.ScriptInfo.Name + ': playlistPath': {
					if (info) {
						if (info === list.playlistsPath) {
							fb.ShowPopupMessage('There is another Playlist Manager panel tracking the same folder (which is usually undesired), you may want to configure this panel to track a different playlist folder.\n\nIn case you want to track the same folder with multiple panels, read the \'Advanced Tips\' section at the PDF readme first. Don\'t forget to disable auto-saving and auto-backup on all but one of the panels if needed (to not process multiple times the same files).', 'Playlist Manager: found same tracked folder');
							removeEventListenerSelf();
						}
					}
					break;
				}
			}
		});
		setTimeout(() => removeEventListener(listener.event, null, listener.id), 20000);
		// Due to automatic category tagging, UI-only playlists (or old playlists with category set) would be hidden on first init...
		new Promise((resolve) => {
			const timer = setInterval(() => {
				if (list && list.bInit) { clearInterval(timer); resolve(); }
			}, 1000);
		}).then(() => {
			list.resetFilter();
			// Import AutoPlaylists
			if (list.isAutoPlaylistMissing()) {
				const answer = WshShell.Popup('Import native AutoPlaylists into the manager?\n\nClicking no will treat them as UI-only playlists and cloning or later importing (which can be done at any point) would be required to edit them.', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
				if (answer === popup.yes) {
					try { fb.RunMainMenuCommand('Save configuration'); } catch (e) { console.log(e); }
					list.importAutoPlaylistsFromFoobar({ bSelect: false });
				}
			}
		});
	}
	// Stats mode available?
	if (prop.bStatsMode[1]) {
		const showMenus = JSON.parse(prop.showMenus[1]);
		if (!showMenus['Statistics mode']) { prop.bStatsMode[1] = false; }
		overwriteProperties(prop); // Updates panel
	}
	// Disable panel on init until it's done
	if (!pop.isEnabled() && !prop.bLiteMode[1] && plmInit.interval) { pop.enable(true, 'Loading...', 'Caching library paths...\nPanel will be disabled during the process.', 'cacheLib'); }
}
globProfiler.Print('init');

// List and other UI elements
const list = new _list(LM, TM, 0, 0);
const stats = new _listStatistics(LM, TM, 0, 0, list.properties.bStatsMode[1], JSON.parse(list.properties.statsConfig[1]));
let scrollBar; // eslint-disable-line no-redeclare

const autoSaveTimer = Number(list.properties.autoSave[1]);
const autoUpdateTimer = Number(list.properties.autoUpdate[1]);
const autoBackTimer = Number(list.properties.autoBack[1]);

if (!list.properties.bSetup[1]) {
	// Auto-update if there are a different number of items on folder or the total file sizes change
	// Note tracking it's not perfect... yes, you could change characters on a file without modifying size
	// but that use-case makes no sense for playlists. These are not files with 'tags', no need to save timestamps or hashes.
	// We double the timers here. First we create an interval and then a debounced func. We call the debounced func every X ms,
	// and since its timer is lower than the interval it fires before the next call is done. That's the regular use case.
	// But we can also call the debounced func directly to delay it's execution (for ex. while updating files).
	debouncedAutoUpdate = (autoUpdateTimer) ? debounce(autoUpdate, autoUpdateTimer - 50) : null;
	autoUpdateRepeat = (autoUpdateTimer) ? repeatFn(debouncedAutoUpdate, autoUpdateTimer)() : null;
	// Used before updating playlists to finish all changes
	delayAutoUpdate = () => { if (typeof debouncedAutoUpdate === 'function') { debouncedAutoUpdate(); } };
	function autoUpdate() { // eslint-disable-line no-inner-declarations
		if (!list.playlistsPath.length || list.bLiteMode || !list.bInit) { return false; }
		let bDone = list.trackedFolderChanged;
		if (bDone) {
			if (!pop.isEnabled()) { pop.enable(true, 'Updating...', 'Loading playlists...\nPanel will be disabled during the process.'); }
			const z = list.offset + Math.round(list.rows / 2 - 1);
			list.cacheLastPosition(z);
			list.update({ bReuseData: false, bNotPaint: true, currentItemIndex: z });
			// Updates with current filter (instead of showing all files when something changes) and maintains focus on last selected item
			list.filter();
			list.jumpLastPosition();
			setTimeout(() => { if (pop.isEnabled()) { pop.disable(true); } }, 500);
			return true;
		}
		return false;
	}
	// Helpers
	autoBackRepeat = (autoBackTimer && isInt(autoBackTimer)) ? repeatFn(backup, autoBackTimer)(list.properties.autoBackN[1]) : null;
	const plsHistory = new PlsHistory();
	// Scroll bar
	scrollBar = list.uiElements['Scrollbar'].enabled ? new _scrollBar({ // eslint-disable-line no-global-assign
		w: _scale(5),
		size: _scale(14),
		bgColor: blendColors(panel.colors.highlight, panel.getColorBackground(), isDark(panel.getColorBackground()) ? 0.3 : 0.8),
		color: blendColors(panel.colors.highlight, panel.getColorBackground(), isDark(panel.getColorBackground()) ? 0.1 : 0.6),
		scrollFunc: ({ current, delta }) => { // eslint-disable-line no-unused-vars
			list.wheel({ s: delta, bPaint: true, bForce: true, scrollDelta: 1 });
		},
		dblclkFunc: (current) => { // eslint-disable-line no-unused-vars
			list.showCurrPls() || list.showCurrPls({ bPlayingPls: true });
		},
		tt: 'Double L. click to Show active or now playing playlist'
	}) : null;

	scrollBar.resize = function () {
		this.x = window.Width - this.w;
		this.y = list.getHeaderSize().h;
		this.h = list.h - (this.y - list.y) - 1;
		if (list.uiElements['Bottom toolbar'].enabled) { this.h -= bottomToolbar.h - _scale(1); }
		this.rows = Math.max(list.items - list.rows, 0);
		this.rowsPerPage = list.rows;
	};

	// Tracking a network drive?
	if (!_hasRecycleBin(list.playlistsPath.match(/^(.+?:)/g)[0])) {
		console.log('Playlist Manager: tracked folder is on a drive without Recycle Bin.');
		if (!list.infoPopups.networkDrive) {
			list.setInfoPopup('networkDrive');
			const file = folders.xxx + 'helpers\\readme\\playlist_manager_network.txt';
			const readme = _open(file, utf8);
			fb.ShowPopupMessage(readme, window.Name + _ps(window.ScriptInfo.Name));
		}
	} else if (list.infoPopups.networkDrive) {
		list.setInfoPopup('networkDrive', false);
	}

	{	// Check backup files after crash
		const backupInit = () => {
			setTimeout(() => {
				if (pop.isEnabled() || list && !list.bInit) { backupInit(); return; }
				list.backupRestore();
			}, 6000);
		};
		backupInit();
	}

	bottomToolbar.buttons.filterOneButton.method = list.properties.filterMethod[1].split(',')[0];
	bottomToolbar.buttons.filterTwoButton.method = list.properties.filterMethod[1].split(',')[1];
	bottomToolbar.recalcWidth();

	addEventListener('on_colours_changed', () => {
		panel.colorsChanged();
		if (list.checkConfig({ bResetColors: true })) { overwriteProperties(list.properties); }
		list.repaint();
	});

	addEventListener('on_font_changed', () => {
		panel.fontChanged();
		list.repaint();
	});

	addEventListener('on_char', (code) => {
		if (!list.bInit) { return; }
		if (pop.isEnabled() || stats.bEnabled) { return; }
		list.on_char(code);
	});

	addEventListener('on_key_down', (k) => {
		if (!list.bInit) { return; }
		if (pop.isEnabled() || stats.bEnabled) { return; }
		list.key_down(k);
	});

	addEventListener('on_mouse_lbtn_up', (x, y, mask) => {
		if (!list.bInit) { return; }
		if (pop.isEnabled() || stats.bEnabled) { return; }
		if (bottomToolbar.curBtn === null) {
			if (scrollBar && scrollBar.btn_up(x, y)) { return; }
			list.lbtn_up(x, y, mask);
		} else {
			bottomToolbar.on_mouse_lbtn_up_buttn(x, y);
		}
	});

	addEventListener('on_mouse_mbtn_up', (x, y, mask) => {
		if (!list.bInit) { return; }
		if (pop.isEnabled() || stats.bEnabled) { return; }
		if (bottomToolbar.curBtn === null) {
			list.mbtn_up(x, y, mask);
		}
	});

	addEventListener('on_mouse_lbtn_down', (x, y, mask) => {
		if (!list.bInit) { return; }
		if (pop.isEnabled() || stats.bEnabled) { return; }
		if (bottomToolbar.curBtn === null) {
			if (scrollBar && scrollBar.btn_down(x, y)) { return; }
			list.lbtn_down(x, y, mask);
		} else {
			bottomToolbar.on_mouse_lbtn_down_buttn(x, y);
		}
	});

	addEventListener('on_mouse_lbtn_dblclk', (x, y) => {
		if (!list.bInit) { return; }
		if (pop.isEnabled() || stats.bEnabled) { return; }
		if (bottomToolbar.curBtn === null) {
			if (scrollBar && scrollBar.lbtn_dblclk(x, y)) { return; }
			list.lbtn_dblclk(x, y);
		}
	});

	addEventListener('on_mouse_move', (x, y, mask, bDragDrop = false) => {
		if (stats.bEnabled) { return; }
		if (pop.isEnabled()) { pop.move(x, y, mask); window.SetCursor(IDC_WAIT); return; }
		if (scrollBar && scrollBar.move(x, y)) { list.move(-1, -1); bottomToolbar.curBtn = null; return; }
		if (!list.isInternalDrop()) { bottomToolbar.on_mouse_move_buttn(x, y, mask); }
		if (bottomToolbar.curBtn === null) {
			list.move(x, y, mask, bDragDrop);
		} else {
			list.move(-1, -1, void (0), bDragDrop, true);
			list.up_btn.hover = false;
			list.down_btn.hover = false;
		}
	});

	addEventListener('on_mouse_leave', () => {
		if (!list.bInit) { return; }
		if (pop.isEnabled() || stats.bEnabled) { return; }
		bottomToolbar.on_mouse_leave_buttn();
		list.onMouseLeaveList(); // Clears index selector
		scrollBar && scrollBar.move(-1, -1);
	});

	addEventListener('on_mouse_rbtn_up', (x, y, mask) => {
		if (!list.bInit) { return true; }
		if (pop.isEnabled() || stats.bEnabled) { return true; }
		if (utils.IsKeyPressed(VK_CONTROL) && utils.IsKeyPressed(VK_LWIN)) {
			return importSettingsMenu().btn_up(x, y);
		}
		if (list.modeUI === 'traditional' && bottomToolbar.curBtn === null) {
			if (list.traceHeader(x, y)) { // Header menu
				return createMenuRightTop().btn_up(x, y);
			} else { // List menu
				return createMenuRight().btn_up(x, y);
			}
		} else {
			if (bottomToolbar.curBtn === null) {
				if (scrollBar && scrollBar.trace(x, y)) { return scrollBar.rbtn_up(x, y); }
				else { return list.rbtn_up(x, y, mask); }
			}
			if (bottomToolbar.curBtn === bottomToolbar.buttons.sortButton) { // Sort button menu
				return createMenuRightSort().btn_up(x, y);
			} else if (bottomToolbar.curBtn === bottomToolbar.buttons.filterOneButton) { // Filter button menus
				return createMenuRightFilter('filterOneButton').btn_up(x, y);
			} else if (bottomToolbar.curBtn === bottomToolbar.buttons.filterTwoButton) {
				return createMenuRightFilter('filterTwoButton').btn_up(x, y);
			}
		}
		return true; // left shift + left windows key will bypass this callback and will open default context menu.
	});

	addEventListener('on_mouse_wheel', (s) => {
		if (!list.bInit) { return; }
		if (pop.isEnabled() || stats.bEnabled) { return; }
		if (list.scrollSettings.bReversed) { s = -s; }
		if (utils.IsKeyPressed(VK_CONTROL) && utils.IsKeyPressed(VK_ALT)) {	list.wheelResize(s); }
		else { list.wheel({ s }); }
	});

	addEventListener('on_paint', (gr) => {
		if (globSettings.bDebugPaint) { extendGR(gr, { DrawRoundRect: true, FillRoundRect: true, Repaint: true }); }
		else { extendGR(gr, { DrawRoundRect: true, FillRoundRect: true }); }
		list.prePaint();
		panel.paint(gr);
		if (!stats.bEnabled) {
			if (list.bPaintList) {
				if (panel.imageBackground.bTint && list.uiElements['Bottom toolbar'].enabled) {
					panel.paintImage(
						gr,
						{ w: window.Width, h: bottomToolbar.h, x: 0, y: bottomToolbar.y, offsetH: _scale(1) },
						{ transparency: (getBrightness(...toRGB(panel.getColorBackground())) < 50 ? 50 : 40) }
					);
				}
				if (list.uiElements['Bottom toolbar'].enabled) { bottomToolbar.on_paint_buttn(gr); }
			}
			list.paint(gr);
			if (list.bPaintList && scrollBar) {
				scrollBar.rows = Math.max(list.items - list.rows, 0);
				scrollBar.rowsPerPage = list.rows;
				scrollBar.currRow = list.offset;
				if (scrollBar.rows >= 1) {
					scrollBar.size = Math.max(Math.round(scrollBar.h / (scrollBar.rows === 1 ? 2 : scrollBar.rows)), _scale(14));
					scrollBar.paint(gr);
				}
			}
		}
		pop.paint(gr);
		if (window.highlight) { extendGR(gr, { Highlight: true }); }
		if (window.debugPainting) { window.drawDebugRectAreas(gr); }
	});

	addEventListener('on_size', () => {
		panel.size();
		list.size();
		bottomToolbar.on_size_buttn();
		scrollBar.resize();
		pop.resize();
	});

	addEventListener('on_playback_new_track', () => { // To show playing now playlist indicator...
		if (list.statusIcons.playing.enabled) { list.repaint(false, 'list'); }
		if (panel.imageBackground.mode === 1) { panel.updateImageBg(); }
	});

	addEventListener('on_selection_changed', () => {
		if (panel.imageBackground.mode === 0 || panel.imageBackground.mode === 1 && !fb.IsPlaying) {
			panel.updateImageBg();
		}
	});

	addEventListener('on_item_focus_change', () => {
		if (panel.imageBackground.mode === 0 || panel.imageBackground.mode === 1 && !fb.IsPlaying) {
			panel.updateImageBg();
		}
	});

	addEventListener('on_playlist_switch', () => {
		if (panel.imageBackground.mode === 0 || panel.imageBackground.mode === 1 && !fb.IsPlaying) {
			panel.updateImageBg();
		}
		if (list.statusIcons.active.enabled) { list.repaint(false, 'list'); }
	});

	addEventListener('on_playback_stop', (/** @type {number} */ reason) => {
		if (reason !== 2) { // Invoked by user or Starting another track
			if (panel.imageBackground.mode === 1) { panel.updateImageBg(); }
		}
	});

	addEventListener('on_playlists_changed', () => { // To show/hide loaded playlist indicators...
		if (panel.imageBackground.mode === 0 || panel.imageBackground.mode === 1 && !fb.IsPlaying) {
			panel.updateImageBg();
		}
		if (['playing', 'active', 'loaded'].some((key) => list.statusIcons[key].enabled)) { list.repaint(false, 'list'); }
	});

	addEventListener('on_notify_data', (name, info) => {
		if (name === 'bio_imgChange' || name === 'biographyTags' || name === 'bio_chkTrackRev' || name === 'xxx-scripts: panel name reply') { return; }
		switch (name) {
			// Internal use
			case 'xxx-scripts: scrollbar hidden': {
				window.RepaintRect(list.x + list.w - list.categoryHeaderOffset, list.y, list.x + list.w, list.y + list.h);
				break;
			}
			// External use
			case window.ScriptInfo.Name + ': playlistPath': {
				if (!info) { window.NotifyOthers(window.ScriptInfo.Name + ': playlistPath', list.playlistsPath); } // Share paths
				break;
			}
			case window.ScriptInfo.Name + ': get handleList': {
				if (info && info.length) {
					const plsName = info;
					if (list.hasPlaylists([plsName])) {
						window.NotifyOthers(window.ScriptInfo.Name + ': handleList', Promise.resolve(list.getHandleFromPlaylists([plsName], false)));
					}
				} // Share paths
				break;
			}
			case window.ScriptInfo.Name + ': switch tracking': {
				list.switchTracking(info);
				break;
			}
			case window.ScriptInfo.Name + ': change startup playlist': {
				if (list.activePlsStartup !== info) {
					list.activePlsStartup = info;
					list.properties.activePlsStartup[1] = list.activePlsStartup;
					overwriteProperties(list.properties);
				}
				break;
			}
			case window.ScriptInfo.Name + ': addToSkipRwLock': {
				if (info && (Object.hasOwn(info, 'uiIdx') || Object.hasOwn(info, 'name'))) {
					list.addToSkipRwLock({ uiIdx: info.uiIdx, name: info.name });
				}
				break;
			}
			case 'xxx-scripts: precacheLibraryPaths': {
				if (list.bLiteMode) { return; }
				if (!info) {
					cacheLib(void (0), void (0), void (0), true);
				} else {
					const now = Date.now();
					if (now - plmInit.lastUpdate > 1000) { plmInit.lastUpdate = now; } else { plmInit.lastUpdate = now; return; } // Update once per time needed...
					libItemsAbsPaths = [...info];
					if (plmInit.interval) { clearInterval(plmInit.interval); plmInit.interval = null; }
					console.log('precacheLibraryPaths: using paths from another instance.', window.Name + _ps(window.ScriptInfo.Name));
					// Update rel paths if needed with new data
					if (list.bRelativePath && list.playlistsPath.length) {
						if (Object.hasOwn(libItemsRelPaths, list.playlistsPath) && libItemsRelPaths[list.playlistsPath].length !== libItemsAbsPaths.length) {
							libItemsRelPaths[list.playlistsPath] = []; // Delete previous cache on library change
						}
						precacheLibraryRelPaths(list.playlistsPath);
					}
					clearTimeout(list.cacheLibTimer);
					list.cacheLibTimer = null;
					list.bLibraryChanged = false;
					list.plsCache.clear();
					fb.queryCache.clear();
					pop.disable(true);
				}
				break;
			}
			case 'xxx-scripts: precacheLibraryPaths ask': {
				if (list.bLiteMode || pop.isEnabled('cacheLib') || pop.isEnabled('cacheLib waiting')) { return; }
				if (list.bLibraryChanged) {
					window.NotifyOthers('xxx-scripts: precacheLibraryPaths', null);
				} else if (libItemsAbsPaths && libItemsAbsPaths.length) {
					window.NotifyOthers('xxx-scripts: precacheLibraryPaths', [...libItemsAbsPaths]);
				}
				break;
			}
			case 'xxx-scripts: lb token': {
				if (list.properties.lBrainzToken[1].length) {
					window.NotifyOthers('xxx-scripts: lb token reply', { lBrainzToken: list.properties.lBrainzToken[1], lBrainzEncrypt: list.properties.lBrainzEncrypt[1], name: window.Name });
				}
				break;
			}
			case 'xxx-scripts: lb token reply': {
				if (callbacksListener.lBrainzTokenListener) {
					console.log('lb token reply: using token from another instance.', window.Name + _ps(window.ScriptInfo.Name), _p('from ' + info.name));
					list.properties.lBrainzToken[1] = info.lBrainzToken;
					list.properties.lBrainzEncrypt[1] = info.lBrainzEncrypt;
					overwriteProperties(list.properties);
					callbacksListener.lBrainzTokenListener = false;
				}
				break;
			}
			case window.ScriptInfo.Name + ': share UI settings': {
				if (info) { list.applyUiSettings(clone(info)); }
				break;
			}
			case window.ScriptInfo.Name + ': set colors': { // Needs an array of 5 colors or an object {background, text, headerButtons, buttonsText, buttonsToolbar }
				if (info && list.properties.bOnNotifyColors[1]) {
					const colors = clone(info);
					const getColor = (key) => Object.hasOwn(colors, key) ? colors.background : colors[['background', 'text', 'headerButtons', 'buttonsText', 'buttonsToolbar'].indexOf(key)];
					const hasColor = (key) => typeof getColor(key) !== 'undefined';
					if (panel.colors.mode.colorMode !== 0 && hasColor('background')) {
						panel.colors.customBackground = getColor('background');
					}
					if (panel.colors.bCustomText && hasColor('text')) { panel.colors.customText = getColor('text'); }
					if (panel.colors.headerButtons !== -1 && hasColor('headerButtons')) { panel.colors.headerButtons = getColor('headerButtons'); }
					if (panel.colors.buttonsTextColor !== -1 && hasColor('buttonsText')) { panel.colors.buttonsTextColor = getColor('buttonsText'); }
					if (panel.colors.buttonsToolbarColor !== -1 && hasColor('buttonsToolbar')) { panel.colors.buttonsToolbarColor = getColor('buttonsToolbar'); }
					panel.colorsChanged();
					if (list.checkConfig({ bResetColors: true, bPreferBgColor: true })) { overwriteProperties(list.properties); } // Ensure related settings is set properly
					list.repaint();
				}
				break;
			}
			case 'Colors: set color scheme':
			case window.ScriptInfo.Name + ': set color scheme': { // Needs an array of at least 6 colors to automatically adjust dynamic colors
				if (info && list.properties.bOnNotifyColors[1]) {
					const { main, sec, note, mainAlt, secAlt } = dynamicColors( // eslint-disable-line no-unused-vars
						clone(info),
						panel.getColorBackground(),
						true
					);
					if (panel.colors.mode.colorMode !== 0) {
						panel.colors.customBackground = main;
					}
					if (panel.colors.bCustomText) { panel.colors.customText = blendColors(mostContrastColor(panel.getColorBackground()).color, sec, 0.3); }
					if (panel.colors.headerButtons !== -1) { panel.colors.headerButtons = blendColors(mostContrastColor(panel.getColorBackground()).color, note, 0.6); }
					if (panel.colors.buttonsTextColor !== -1) { panel.colors.buttonsTextColor = blendColors(mostContrastColor(panel.getColorBackground()).color, note, 0.6); }
					if (panel.colors.buttonsToolbarColor !== -1) { panel.colors.buttonsToolbarColor = mainAlt; }
					panel.colorsChanged();
					if (list.checkConfig({ bResetColors: true, bPreferBgColor: true })) { overwriteProperties(list.properties); } // Ensure related settings is set properly
					list.repaint();
				}
				break;
			}
		}
	});

	// Main menu commands
	addEventListener('on_main_menu_dynamic', (id) => {
		if (!list.bInit) { return; }
		if (list.iDynamicMenus > 0 && list.mainMenuDynamic && id < list.mainMenuDynamic.length) {
			const menu = list.mainMenuDynamic[id];
			let bDone = false;
			switch (menu.type.toLowerCase()) {
				case 'load playlist': {
					const idx = [...menu.arg];
					idx.forEach((i) => list.loadPlaylistOrShow(i, true));
					bDone = true;
					break;
				}
				case 'lock playlist': {
					const idx = [...menu.arg];
					idx.forEach((i) => switchLock(list, i, true));
					bDone = true;
					break;
				}
				case 'delete playlist': {
					const idx = [...menu.arg];
					list.removePlaylists(idx, true);
					bDone = true;
					break;
				}
				case 'clone in ui': {
					const idx = [...menu.arg];
					Promise.serial(idx, (i) => {
						const item = list.dataAll[i];
						const remDupl = (item.isAutoPlaylist && this.bRemoveDuplicatesAutoPls) || (item.extension === '.xsp' && this.bRemoveDuplicatesSmartPls) ? this.removeDuplicatesAutoPls : [];
						return clonePlaylistInUI(list, i, { remDupl, bMultiple: list.bMultiple, bAdvTitle: list.bAdvTitle, bAlsoHidden: true });
					});
					bDone = true;
					break;
				}
				case 'copy selection': {
					const idx = [...menu.arg];
					idx.forEach((i) => list.sendSelectionToPlaylist({ playlistIndex: i, bCheckDup: true, bAlsoHidden: true }));
					bDone = true;
					break;
				}
				case 'move selection': {
					const idx = [...menu.arg];
					idx.forEach((i) => list.sendSelectionToPlaylist({ playlistIndex: i, bCheckDup: true, bAlsoHidden: true, bDelSource: true }));
					bDone = true;
					break;
				}
				case 'manual refresh': {
					createMenuRight().btn_up(-1, -1, null, 'Manual refresh');
					bDone = true;
					break;
				}
				case 'new playlist (empty)': {
					let name = 'New playlist';
					if (list.dataAll.some((pls) => pls.name === name)) {
						name += ' ' + _p(list.dataAll.reduce((count, iPls) => { if (iPls.name.startsWith(name)) { count++; } return count; }, 0));
					}
					list.add({ bEmpty: true, name, bShowPopups: false });
					bDone = true;
					break;
				}
				case 'new playlist (ap)': {
					if (plman.ActivePlaylist === -1) { return; }
					const name = plman.GetPlaylistName(plman.ActivePlaylist);
					list.add({ bEmpty: false, name, bShowPopups: false });
					bDone = true;
					break;
				}
				case 'load playlist (mult)': {
					const idx = list.dataAll
						.map((pls, i) => (pls.tags.includes('bMultMenu') ? i : -1))
						.filter((idx) => idx !== -1);
					idx.forEach((i) => list.loadPlaylistOrShow(i, true));
					bDone = true;
					break;
				}
				case 'clone in ui (mult)': {
					const idx = list.dataAll
						.map((pls, i) => (pls.tags.includes('bMultMenu') ? i : -1))
						.filter((idx) => idx !== -1);
					Promise.serial(idx, (i) => clonePlaylistInUI(list, i, true));
					bDone = true;
					break;
				}
				case 'export convert (mult)': {
					const idx = list.dataAll
						.map((pls, i) => (pls.tags.includes('bMultMenu') ? i : -1))
						.filter((idx) => idx !== -1);
					idx.forEach((i) => {
						const pls = list.dataAll[i];
						const preset = menu.arg;
						const remDupl = (pls.isAutoPlaylist && list.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls)
							? list.removeDuplicatesAutoPls
							: [];
						const bExtendedM3U = Object.hasOwn(preset, 'bExtendedM3U') ? preset.bExtendedM3U : true;
						const exportFunc = pls.isAutoPlaylist
							? exportAutoPlaylistFileWithTracksConvert
							: exportPlaylistFileWithTracksConvert;
						exportFunc({
							list, z: i,
							tf: preset.tf,
							preset: preset.dsp,
							defPath: preset.path,
							ext: preset.extension,
							remDupl, // Include remDupl for XSP playlists
							bAdvTitle: list.bAdvTitle,
							bMultiple: list.bMultiple,
							bExtendedM3U
						});
					});
					bDone = true;
					break;
				}
			}
			if (list.logOpt.mainMenu || !bDone) {
				console.log('on_main_menu_dynamic: ' + (bDone ? menu.name : JSON.stringify(menu) + ' not found'));
			}
		}
	});

	// Autosave
	// Halt execution if trigger rate is greater than autosave (ms), so it fires only once after successive changes made.
	// if Autosave === 0, then it does nothing...
	debouncedUpdate = (autoSaveTimer !== 0) ? debounce(list.updatePlaylist, autoSaveTimer) : null;
	addEventListener('on_playlist_items_reordered', (/** @type {number} */ playlistIndex, oldName = null) => {
		if (!list.bInit) { return; }
		const name = plman.GetPlaylistName(playlistIndex);
		if (!list.isAutosave(name)) { return; }
		// Disable auto-saving on panel cache reload and ensure future update matches the right playlist
		if (pop.isEnabled() && debouncedUpdate && playlistIndex !== -1) { setTimeout(on_playlist_items_reordered, autoSaveTimer, playlistIndex, name); return; }
		if (oldName && oldName.length && name !== oldName) { return; }
		// Update
		if (debouncedUpdate) { debouncedUpdate({ playlistIndex, bCallback: true }); }
	});

	plsRwLock = { idx: -1, date: -1, apply: false, isUndo: false };
	addEventListener('on_playlist_items_removed', (playlistIndex, newCount, oldName = null) => {
		if (!list.bInit) { return; }
		const name = plman.GetPlaylistName(playlistIndex);
		if (panel.imageBackground.mode === 0 || panel.imageBackground.mode === 1 && !fb.IsPlaying) {
			panel.updateImageBg();
		}
		if (!list.isAutosave(name)) { return; }
		// Disable auto-saving on panel cache reload and ensure future update matches the right playlist
		if (pop.isEnabled() && debouncedUpdate && playlistIndex !== -1) { setTimeout(on_playlist_items_removed, autoSaveTimer, playlistIndex, newCount, name); return; }
		if (oldName && oldName.length && name !== oldName) { return; }
		if (list.isRwLock({ uiIdx: playlistIndex })) {
			if (newCount === 0 && !plsRwLock.isUndo) {
				plsRwLock.idx = playlistIndex;
				plsRwLock.date = Date.now();
				plsRwLock.apply = true;
			} else {
				plsRwLock.idx = -1;
				plsRwLock.date = -1;
				plsRwLock.apply = false;
			}
			plsRwLock.isUndo = false;
		}
		// Update
		if (debouncedUpdate) { debouncedUpdate({ playlistIndex, bCallback: true }); }
	});

	addEventListener('on_playlist_items_added', (/** @type {number} */ playlistIndex, oldName = null) => {
		if (!list.bInit) { return; }
		const name = plman.GetPlaylistName(playlistIndex);
		if (panel.imageBackground.mode === 0 || panel.imageBackground.mode === 1 && !fb.IsPlaying) {
			panel.updateImageBg();
		}
		if (!list.isAutosave(name)) { return; }
		// Disable auto-saving on panel cache reload and ensure future update matches the right playlist
		if (pop.isEnabled() && debouncedUpdate && playlistIndex !== -1) { setTimeout(on_playlist_items_added, autoSaveTimer, playlistIndex, name); return; }
		if (oldName && oldName.length && name !== oldName) { return; }
		if (!list.isRwLock({ uiIdx: playlistIndex }) || plsRwLock.idx !== playlistIndex || Date.now() - plsRwLock.date > 100) {
			plsRwLock.idx = -1;
			plsRwLock.date = -1;
			plsRwLock.apply = false;
			plsRwLock.isUndo = false;
		}
		// Update
		if (debouncedUpdate) {
			if (plsRwLock.apply) {
				list.updatePlaylist({ playlistIndex, bCallback: true, applyRwLock: plsRwLock.apply });
			} else {
				debouncedUpdate({ playlistIndex, bCallback: true });
			}
		} else if (list.bAutoTrackTag && playlistIndex < plman.PlaylistCount) { // Double check playlist index to avoid crashes with callback delays and playlist removing
			if (list.bAutoTrackTagAlways) { list.updatePlaylistOnlyTracks(playlistIndex); }
			else if (plman.IsAutoPlaylist(playlistIndex)) {
				if (list.bAutoTrackTagAutoPls) { list.updatePlaylistOnlyTracks(playlistIndex); }
			} else if (list.bAutoTrackTagPls || list.bAutoTrackTagLockPls) { list.updatePlaylistOnlyTracks(playlistIndex); }
		}
	});

	addEventListener('on_playlists_changed', () => {
		if (!list.bInit) { return; }
		if (list.bAllPls) { // For UI only playlists
			const moveToFolder = [];
			if (list.folderRules.externalUi.length) {
				const notTracked = range(0, plman.PlaylistCount - 1)
					.map((uiIdx) => {
						const name = plman.GetPlaylistName(uiIdx);
						return { uiIdx, dataIdx: list.getPlaylistIdxByUI({ name }), name };
					})
					.filter((pls) => pls.dataIdx === -1);
				if (notTracked.length) {
					const toFolder = list.dataFolder.find((f) => f.name === list.folderRules.externalUi) || list.addFolder(list.folderRules.externalUi);
					notTracked.forEach((pls) => {
						moveToFolder.push({ ...pls, toFolder });
					});
				}
			}
			list.update({ bReuseData: true, bNotPaint: true });
			const categoryState = [...new Set(list.categoryState).intersection(new Set(list.categories()))];
			if (moveToFolder.length) {
				moveToFolder.forEach((move) => {
					const idx = list.getPlaylistIdxByUI({ name: move.name });
					if (idx !== -1) {
						list.moveToFolder(list.dataAll[idx], move.toFolder);
					}
				});
			}
			list.filter({ categoryState });
		}
		if (!list.bUseUUID && plman.ActivePlaylist !== -1) {
			const lastPls = plsHistory.getLast();
			if (lastPls) {  // To rename bound playlist when UUIDs are not used
				const oldName = lastPls.name;
				if (lastPls.idx === plman.ActivePlaylist && !getPlaylistIndexArray(oldName).length) {
					const idx = list.getPlaylistsIdxByName([oldName]);
					if (idx.length === 1) {
						const newName = plman.GetPlaylistName(plman.ActivePlaylist);
						let bDone = list.data[idx[0]]
							? renamePlaylist(list, idx[0], newName, false)
							: false;
						if (bDone) { console.log('Playlist Manager: renamed playlist ' + oldName + ' --> ' + newName); list.showCurrPls(); }
						else { console.log('Playlist Manager: failed renaming playlist ' + oldName + ' --> ' + newName); }
					}
					plsHistory.onPlaylistSwitch();
				}
			}
		}
	});

	// Drag n drop to copy/move tracks to playlists (only files from foobar2000)
	addEventListener('on_drag_enter', (action, x, y, mask) => {
		if (!list.bInit) { return; }
		if (pop.isEnabled()) { pop.move(x, y, mask); window.SetCursor(IDC_WAIT); action.Effect = dropEffect.none; return; }
		// Avoid things outside foobar2000
		if (action.Effect === dropEffect.none || (action.Effect & dropEffect.link) === dropEffect.link) { action.Effect = dropEffect.none; }
	});

	addEventListener('on_drag_leave', (action, x, y, mask) => {
		on_mouse_leave(x, y, mask);
	});

	addEventListener('on_drag_over', (action, x, y, mask) => {
		if (!list.bInit) { return; }
		// Avoid things outside foobar2000
		if (action.Effect === dropEffect.none || (action.Effect & dropEffect.link) === dropEffect.link) { action.Effect = dropEffect.none; return; }
		if (pop.isEnabled()) { pop.move(x, y, mask); window.SetCursor(IDC_WAIT); action.Effect = dropEffect.none; return; }
		// Move playlist index only while not pressing alt
		on_mouse_move(x, y, mask, true);
		let bToFolder = false;
		if ((mask & 32) === 32) {
			if (list.index !== -1) {
				if (!list.data[list.index].isFolder) { list.index = -1; }
				else { bToFolder = true; }
				list.repaint(false, 'list');
			}
		}
		// Force scrolling so the list doesn't get blocked at current view
		list.up_btn.hover = list.up_btn.lbtn_up(x, y);
		list.down_btn.hover = list.down_btn.lbtn_up(x, y);
		// Check actions per UI element
		const headerButtons = Object.keys(list.headerButtons);
		if (list.traceHeader(x, y)) {
			if (list.searchInput && list.searchInput.trackCheck(x, y)) { // Search input
				const trackText = (method) => {
					if (method === 'bPath' && list.searchMethod.bPath) { action.Effect = dropEffect.copy; action.Text = 'Add paths to search box'; return true; }
					else if (method === 'bQuery' && list.searchMethod.bQuery) { action.Effect = dropEffect.copy; action.Text = 'Add query to search box'; return true; }
					else if (method === 'bMetaTracks' && list.searchMethod.bMetaTracks) { action.Effect = dropEffect.copy; action.Text = 'Add tags to search box'; return true; }
					return false;
				};
				if (!list.searchMethod.dragDropPriority.some(trackText)) {
					action.Effect = dropEffect.none; action.Text = 'Path searching must be enabled';
				}
				return;
			} else if (headerButtons.some((key) => list.headerButtons[key].inFocus)) { // New playlist button
				if (list.headerButtons.newPls.inFocus) {
					action.Text = 'Create new Playlist ' + _p((mask & MK_CONTROL) === MK_CONTROL ? 'copy' : 'move');
				} else {
					action.Effect = dropEffect.none;
					action.Text = '';
					return;
				}
			} else {
				action.Effect = dropEffect.none;
				action.Text = '';
				return;
			}
		} else if (bottomToolbar.curBtn !== null || (scrollBar && scrollBar.trace(x, y))) { // Scrollbar or buttons
			// else if (bottomToolbar.curBtn !== null || (list.index === -1 && (mask & 32) !== 32)) {action.Effect = dropEffect.none; return;}
			action.Effect = dropEffect.none;
			action.Text = '';
			return;
		} else { // List
			const modifier = (mask & MK_CONTROL) === MK_CONTROL
				? 'Copy'
				: 'Move';
			if ((mask & 32) === 32 || list.index === -1 || list.index >= list.items) { // NOSONAR [structure]
				action.Text = 'Create new Playlist ' + _p(modifier.toLowerCase()) + (bToFolder ? ' (in folder)' : '');
			} else if (list.data[list.index].isFolder) { action.Text = modifier + ' to selected Folder'; }
			else { action.Text = modifier + ' to selected Playlist'; }
		}
		// Set effects
		if ((mask & dropMask.ctrl) === dropMask.ctrl) { action.Effect = dropEffect.copy; } // Mask is mouse + key
		// else if ((mask & 32) === 32) {action.Effect = dropEffect.link;} // BUG: sends callback to on_drag_leave
		else { action.Effect = dropEffect.move; }
	});

	addEventListener('on_drag_drop', (action, x, y, mask) => {
		if (!list.bInit) { return; }
		// Avoid things outside foobar2000
		if (action.Effect === dropEffect.none) { return; }
		if (pop.isEnabled()) { pop.move(x, y, mask); window.SetCursor(IDC_WAIT); action.Effect = dropEffect.none; return; }
		list.on_drag_drop_external(action, x, y, mask, plman.ActivePlaylist);
		action.Effect = dropEffect.none; // Forces not sending things to a playlist
	});

	addEventListener('on_script_unload', () => {
		// Instance manager
		instances.remove(window.ScriptInfo.Name);
		// Backup
		if (autoBackTimer && list.playlistsPath.length && list.itemsAll) {
			backup(list.properties.autoBackN[1], true, false);
		}
		// Clear timeouts
		clearInterval(keyListener.fn);
		if (autoBackRepeat) { clearInterval(autoBackRepeat); }
		if (autoUpdateRepeat) { clearInterval(autoUpdateRepeat); }
		list.deleteMainMenuDynamic();
	});

	// Update cache on changes!
	addEventListener('on_library_items_added', () => {
		if (typeof list !== 'undefined') {
			list.bLibraryChanged = true;
			if (list.bTracking) {
				list.cacheLibTimer = debouncedCacheLib(false, 'Updating...');
				list.clearSelPlaylistCache();
				fb.queryCache.clear();
			} else if (!list.bLiteMode) {
				if (list.uiElements['Header buttons'].elements['Settings menu'].enabled) { list.repaint(false, 'header'); }
			}
		}
	});

	addEventListener('on_library_items_removed', () => {
		if (typeof list !== 'undefined') {
			list.bLibraryChanged = true;
			if (list.bTracking) {
				list.cacheLibTimer = debouncedCacheLib(false, 'Updating...');
				list.clearSelPlaylistCache();
				fb.queryCache.clear();
			} else if (!list.bLiteMode) {
				if (list.uiElements['Header buttons'].elements['Settings menu'].enabled) { list.repaint(false, 'header'); }
			}
		}
	});

	addEventListener('on_focus', (bFocused) => {
		list.on_focus(bFocused);
	});

	// key listener (workaround for keys not working when focus is not on panel)
	const keyListener = {};
	keyListener.bShift = false;
	keyListener.bCtrl = false;
	keyListener.fn = repeatFn(() => {
		if (!list.bInit) { return; }
		if (list.tooltip.bActive) {
			const bShift = utils.IsKeyPressed(VK_SHIFT);
			const bCtrl = utils.IsKeyPressed(VK_CONTROL);
			if (bShift === keyListener.bShift && bCtrl === keyListener.bCtrl) { return; }
			else if (bShift && bCtrl) { list.move(list.mx, list.my, MK_SHIFT + MK_CONTROL, list.bIsDragDrop); }
			else if (bShift) { list.move(list.mx, list.my, MK_SHIFT, list.bIsDragDrop); }
			else if (bCtrl) { list.move(list.mx, list.my, MK_CONTROL, list.bIsDragDrop); }
			else { list.move(list.mx, list.my, null, list.bIsDragDrop); }
			keyListener.bShift = bShift;
			keyListener.bCtrl = bCtrl;
		} else {
			keyListener.bShift = keyListener.bCtrl = false;
		}
	}, 500)();

	if (list.properties.bOnNotifyColors[1]) { // Ask color-servers at init
		setTimeout(() => {
			window.NotifyOthers('Colors: ask color scheme', window.ScriptInfo.Name + ': set color scheme');
			window.NotifyOthers('Colors: ask colors', window.ScriptInfo.Name + ': set colors');
		}, 1000);
	}

	stats.attachCallbacks();
} else {
	const button = bottomToolbar.buttons.setup;
	addEventListener('on_mouse_lbtn_up', (x, y, mask) => { // eslint-disable-line no-unused-vars
		bottomToolbar.on_mouse_lbtn_up_buttn(x, y);
	});
	addEventListener('on_mouse_lbtn_down', (x, y, mask) => { // eslint-disable-line no-unused-vars
		bottomToolbar.on_mouse_lbtn_down_buttn(x, y);
	});
	addEventListener('on_mouse_rbtn_up', (x, y, mask) => { // eslint-disable-line no-unused-vars
		if (utils.IsKeyPressed(VK_CONTROL) && utils.IsKeyPressed(VK_LWIN)) {
			return importSettingsMenu().btn_up(x, y);
		}
		return true; // left shift + left windows key will bypass this callback and will open default context menu.
	});
	addEventListener('on_mouse_move', (x, y, mask, bDragDrop = false) => { // eslint-disable-line no-unused-vars
		bottomToolbar.on_mouse_move_buttn(x, y, mask);
		if (bottomToolbar.curBtn === null) {
			pop.move(x, y, mask);
			window.SetCursor(IDC_ARROW);
		} else {
			list.up_btn.hover = false;
			list.down_btn.hover = false;
			window.SetCursor(IDC_HAND);
		}
	});
	addEventListener('on_mouse_leave', () => {
		bottomToolbar.on_mouse_leave_buttn();
	});
	addEventListener('on_paint', (gr) => {
		panel.paint(gr);
		bottomToolbar.on_paint_buttn(gr);
	});
	addEventListener('on_size', () => {
		pop.resize();
		button.w = window.Width / 2;
		button.h = window.Height / 3;
		button.x = window.Width / 2 - button.w / 2;
		button.y = window.Height / 2 - button.h / 2;
	});
}
globProfiler.Print('callbacks');

// Delete unused variables
properties = void (0);