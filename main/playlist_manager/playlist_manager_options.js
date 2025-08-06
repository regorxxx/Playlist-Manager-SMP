'use strict';
//06/08/25

/* global list:readable, folders:readable */
include('..\\window\\window_xxx.js');
/* global _window:readable */
include('..\\..\\helpers\\menu_xxx.js');
/* global _menu:readable */
include('..\\..\\helpers\\helpers_xxx_properties.js');
/* global setProperties:readable, getPropertiesPairs:readable, overwriteProperties:readable */
include('..\\..\\helpers\\helpers_xxx_file.js');
/* global _createFolder:readable, _isFile:readable, _open:readable, utf8:readable, */
// Set default properties (used on data later)
let propertiesOptions = {
	bOptions:	['Options panel opened?'		, false		], // To maintain the same window on script reload (would be an ID when having multiple windows)
	tabWidth:	['full / text'					, 'full'	], // Tab behavior
	UI:			['default / material'			, 'material'], // Theme
};
setProperties(propertiesOptions, '', 0);
propertiesOptions = getPropertiesPairs(propertiesOptions, '', 0);
_createFolder(folders.data);

// Set options window
const options = new _window({width: window.Width, height: window.Height, tabWidth: propertiesOptions.tabWidth[1], UI: propertiesOptions.UI[1], properties: {...propertiesOptions, ...list.properties}, bFitData: true, bAutoSave: true});
// Set save and load methods to call them easily later (they would be used too if setting autosave to true)
options.save = () => {
	console.log('saving');
	overwriteProperties(options.properties);
	const jsonData = options.getTabData('Config');
	if (jsonData && jsonData.length) {utils.WriteTextFile(folders.data + 'options_data.json', JSON.stringify(options.getTabData('Config'), null, '\t'), true);}
};
options.load = () => {
	options.properties = getPropertiesPairs(options.properties, '', 0);
	// Only config tab is saved as json
	if (_isFile(folders.data + 'options_data.json')) {
		const text = _open(folders.data + 'options_data.json', utf8);
		if (text.length) {
			const data = JSON.parse(text);
			if (data) {options.configTab('Config', {data});}
		}
	}
};

// Add tabs with its data
options.addTab({title: 'Playlist saving', columns: 1, data: [
	/* eslint-disable indent */
	[
		{title: 'Playlist File handling'},
			{subTitle: 'Format', values: [
				{name: 'Try to save playlists always as default format?', pId: 'bSavingDefExtension', pIdx: 1, constructor: Boolean, tt: 'Apply default format in any case, not only to new playlists created.\n\nFormat of existing playlists will be changed to the default format whenever they are saved: Manually or on Auto-saving.\n\nOther saving related configuration may apply (like Smart Playlists being skipped or warning popups whenever format will be changed).'},
				{name: 'Auto-save .xsp playlists?', pId: 'bSavingXsp', pIdx: 1, constructor: Boolean, tt: 'Auto-saving Smart Playlists involves, by design, not having an Smart Playlist anymore but just a list of files (originated from their query).\n\nEnabling this option will allow Smart Playlists to be overwritten as an standard playlist whenever they are updated. Note this goes against their intended aim (like Auto-playlists) and therefore the query and other related data will be lost as soon as it\'s converted to a list of paths (*).\n\nOption not recommended for most users, use it at your own responsibility.\n\n(*) If this happens, remember the original playlist could still be found at the Recycle Bin.'},
				{name: 'Warnings when saving to another format', pId: 'bSavingWarnings', pIdx: 1, constructor: Boolean, tt: 'Warns if format will be changed whenever a playlist is saved.'}
			]},
			{subTitle: 'Format', values: [
				{name: 'Save files as UTF8 with BOM?', pId: 'bBOM', pIdx: 1, constructor: Boolean, tt: 'Save playlist files as UTF8-BOM'}
			]},
			{subTitle: 'Track handling', values: [
				{name: 'Use relative paths for all new playlists', pId: 'bRelativePath', pIdx: 1, constructor: Boolean, tt: (value) => {
					return (value ?'All new playlists (and those saved from now on) will have their tracks\' paths edited to be relative to:\n\'' + list.playlistsPath + '\'\n\nFor example, for a file like this:\n' + list.playlistsPath + 'Music\\Artist A\\01 - hjk.mp3\n' + '--> .\\Music\\Artist A\\01 - hjk.mp3\n' + '\n\nBeware adding files which are not in a relative path to the playlist folder, they will be added \'as is\' no matter this setting:\n' + 'A:\\OTHER_FOLDER\\Music\\Artist A\\01 - hjk.mp3\n' + '-->A:\\OTHER_FOLDER\\Music\\Artist A\\01 - hjk.mp3\n\nAny playlist using absolute paths will be converted as soon as it gets updated/saved; apart from that, their usage remains the same.\nIf you want to mix relative and absolute playlists on the same tracked folder, you can do it locking the absolute playlists (so they never get overwritten).' :'All new playlists (and those saved from now on) will use absolute paths.\n\nAny playlist using relative paths will be converted as soon as it gets updated/saved; apart from that, their usage remains the same.\nIf you want to mix relative and absolute playlists on the same tracked folder, you can do it locking the relative playlists (so they never get overwritten).');}
						}
			]},
	]
	/* eslint-enable indent */
], description: 'This tab modifies data saved on properties panel'});

options.addTab({title: 'Playlist behavior', columns: 4, data: [
	/* eslint-disable indent */
	[
		{title: 'Track handling'},
			{subTitle: 'Duplicates entries', values: [
				{name: 'Skip duplicates when adding tracks', pId: 'bForbidDuplicates', pIdx: 1, constructor: Boolean, tt: 'Skip duplicates when adding new tracks to a playlist or only warn about it on tooltip.'},
			]},
			{subTitle: 'Dead items', values: [
				{name: 'Check dead items on autosaving:', pId: 'bDeadCheckAutoSave', pIdx: 1, constructor: Boolean, tt: 'Check for dead items on auto-saving. Otherwise it\'s done only on manual saving or when adding tracks.'}
			]},
		{title: 'AutoPlaylists & Smart Playlists'},
			{values: [
				{name: 'AutoPlaylists filtering', pId: 'bRemoveDuplicatesAutoPls', pIdx: 1, constructor: Boolean, tt: 'Remove duplicates on AutoPlaylist cloning.\nLoading follows native behavior in any case, i.e. playlist is bound to a query.'},
				{name: 'Smart Playlists filtering', pId: 'bRemoveDuplicatesSmartPls', pIdx: 1, constructor: Boolean, tt: 'Remove duplicates on Smart Playlist loading & cloning.'},
				{name: 'Remove duplicates by:', pId: 'removeDuplicatesAutoPls', pIdx: 1, constructor: String, tt: 'Enter tag(s) or TF expression(s):\n(sep by comma)'},
				{name: 'Update AutoPlaylist size by query output', pId: 'bUpdateAutoPlaylist', pIdx: 1, constructor: Boolean, tt: 'Update AutoPlaylists size automatically on every startup, instead of doing it only when loading them.\n\nEnabling this option will also load -internally- all queries from AutoPlaylists at startup to retrieve their tag count.(*)(**)\n\nIt\'s done asynchronously so it should not take more time to load the script at startup as consequence.\n\n(*) Note enabling this option will not incur on additional processing if you already enabled Tracks Auto-tagging on startup for AutoPlaylists.\n(**) For the same reasons, AutoPlaylists which perform tagging will always get their size updated no matter what this config is.'}
			]},
	],
	[
		{title: 'Native playlists'},
			{values: [
				{name: 'Load .fpl native playlists as read only?', pId: 'bFplLock', pIdx: 1, constructor: Boolean, tt: '.fpl playlists will be loaded as locked files to avoid changing their format.'},
				{name: 'Track UI-only playlists?', pId: 'bAllPls', pIdx: 1, constructor: Boolean, tt: 'UI-only playlists are non editable but they can be renamed, deleted or restored. Sending current selection to a playlist is also allowed.\nUI-only playlists have their own custom color to be easily identified.\n\nTo be able to use all the other features of the manager, consider creating playlist files instead. At any point you may use \'Create new playlist from Active playlist...\' to save UI-only playlists as tracked files.'},
			]},
		{title: 'Playlist loading'},
			{values: [
				{name: 'Use UUIDs along playlist names ', pId: 'bUseUUID', pIdx: 1, constructor: Boolean},
				{name: 'Warn about duplicated playlists', pId: 'bCheckDuplWarnings', pIdx: 1, constructor: Boolean, tt: 'Warn about playlists with duplicated names for tracked playlists within the manager.'},
			]},
	],
	[
		{title: 'Automatic Track tagging'},
			{subTitle: 'Frequency', values: [
				{name: 'When saving / loading', pId: 'bAutoTrackTag', pIdx: 1, constructor: Boolean},
				{name: 'Regularly checked', pId: 'bAutoTrackTagAlways', pIdx: 1, constructor: Boolean},
			]},
			{subTitle: 'Formats', values: [
				{name: 'Standard playlists', pId: 'bAutoTrackTagPls', pIdx: 1, constructor: Boolean},
				{name: 'Locked playlists', pId: 'bAutoTrackTagLockPls', pIdx: 1, constructor: Boolean},
				{name: 'AutoPlaylists', pId: 'bAutoTrackTagAutoPls', pIdx: 1, constructor: Boolean},
				{name: 'AutoPlaylists at startup', pId: 'bAutoTrackTagAutoPlsInit', pIdx: 1, constructor: Boolean},
			]}
	],
	[
		{title: 'Automatic Playlist tagging'},
			{subTitle: 'Add these tags to all playlists', values: [
				{name: 'Add \'bAutoLoad\'', pId: 'bAutoLoadTag', pIdx: 1, constructor: Boolean},
				{name: 'Add \'bAutoLock\'', pId: 'bAutoLockTag', pIdx: 1, constructor: Boolean},
				{name: 'Add custom tag', pId: 'bAutoCustomTag', pIdx: 1, constructor: Boolean},
				{name: 'Custom tag:', pId: 'autoCustomTag', pIdx: 1, constructor: String},
			]},
			{subTitle: 'Automatic actions', values: [
				{name: 'Apply actions based on tags (lock, load)', pId: 'bApplyAutoTags', pIdx: 1, constructor: Boolean},
			]}
	]
	/* eslint-enable indent */
], description: 'This tab modifies data saved on properties panel'});

options.addTab({title: 'Panel behavior', columns: 1, data: [
	/* eslint-disable indent */
	[
		{title: 'List view'},
			{values: [
				{name: 'Save filtering between sessions:', pId: 'bSaveFilterStates', pIdx: 1, constructor: Boolean}
			]},
			{subTitle: 'Dead items', values: [
				{name: 'Check dead items on autosaving:', pId: 'bSavingXsp', pIdx: 1, constructor: Boolean}
			]},
		{title: 'Autosave & Autoload'},
			{values: [
				{name: 'Autosave interval (ms):', pId: 'autoSave', pIdx: 1, constructor: Number},
				{name: 'Autoload interval (ms):', pId: 'autoUpdate', pIdx: 1, constructor: Number},
				{name: 'Autobackup interval (ms):', pId: 'autoBack', pIdx: 1, constructor: Number}
			]}
	]
], description: 'This tab modifies data saved on properties panel'});

options.addTab({title: 'UI', columns: 1, data: [
	/* eslint-disable indent */
	[
		{title: 'List view'},
			{values: [
				{name: 'Show name/category separators:', pId: 'bShowSep', pIdx: 1, constructor: Boolean},
				{name: 'Show playlist size:', pId: 'bShowSize', pIdx: 1, constructor: Boolean},
				{name: 'Show header on playlist menus?', pId: 'bShowMenuHeader', pIdx: 1, constructor: Boolean},
			]},
		{title: 'Tooltip'},
			{values: [
				{name: 'Usage text on tooltips', pId: 'bShowTips', pIdx: 1, constructor: Boolean},
			]},
	]
	/* eslint-enable indent */
], description: 'This tab modifies data saved on properties panel'});

// Add a menu to swap windows
// Since auto-save is disabled, data saving is done when returning to the main window. Only exception to this rule is saving at script unload
// Using .loadAll() or .saveAll() instead of .load() / .save() will also apply for any embedded object
const windowMenu = new _menu();
windowMenu.newEntry({entryText: 'Show Options', func: () => {options.loadAll(); options.properties.bOptions[1] = true; options.saveAll(); list.repaint(true);}});
windowMenu.newEntry({entryText: 'Show Main', func: () => {options.properties.bOptions[1] = false; options.saveAll(); list.repaint(true);}});