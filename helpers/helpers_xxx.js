'use strict';
//22/10/22

// Folders
const folders = {};
folders.xxxName = 'scripts\\SMP\\xxx-scripts\\'; // Edit here to change install path (this is relative to the profile path)
folders.dataName = 'js_data\\';
folders.xxx = fb.ProfilePath + folders.xxxName; 
folders.data = fb.ProfilePath + folders.dataName;
folders.userHelpers = folders.data + 'helpers\\';
folders.temp = folders.data + 'temp\\';
folders.userPresets = folders.data + 'presets\\';
folders.userPresetsGlobal = folders.userPresets + 'global\\';

// Global helpers
include(fb.ComponentPath + 'docs\\Codepages.js');
include(fb.ComponentPath + 'docs\\Flags.js');
include('helpers_xxx_basic_js.js');
include('helpers_xxx_console.js');
include('helpers_xxx_foobar.js');

/* 
	Global Variables 
*/
function loadUserDefFile(def) {
	let bSave = false;
	if (_isFile(def._file)) {
		const data = _jsonParseFileCheck(def._file, 'User definition file', window.Name, utf8);
		if (data) {
			for (let key in data) {
				if (def.hasOwnProperty(key)) {
					def[key] = data[key];
				}
			}
			if (Object.keys(data).length !== Object.keys(def)) {bSave = true;}
		}
	} else {bSave = true;}
	if (bSave) {
		const {_file, ...rest} = def;
		_save(def._file, JSON.stringify(rest, null, '\t'));
	}
	
}

// Tags: user replaceable with a presets file at folders.data
const globTags = {};
globTags._file = folders.userPresetsGlobal + 'globTags.json';
globTags._description = 'Don\'t add multiple tags to these variables. TITLE, DATE and RATING must be enclosed on %.';
globTags.title = '$ascii($lower($trim(%TITLE%)))';
globTags.date = '$year(%DATE%)';
globTags.artist = 'ARTIST';
globTags.genre = 'GENRE';
globTags.style = 'STYLE';
globTags.mood = 'MOOD';
globTags.bpm = 'BPM';
globTags.key = 'KEY';
globTags.rating = '%RATING%';
globTags.acoustidFP = 'ACOUSTID_FINGERPRINT_RAW';
globTags.fooidFP = 'FINGERPRINT_FOOID';
globTags.playCount = '$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%)';
globTags.sortPlayCount = '$sub(99999,' + globTags.playCount + ')';
globTags.remDupl = [globTags.title, globTags.artist, globTags.date];
// Load user file
loadUserDefFile(globTags);

// Queries: user replaceable with a presets file at folders.data
const globQuery = {};
globQuery._file = folders.userPresetsGlobal + 'globQuery.json';
globQuery.filter = 'NOT (' + globTags.rating + ' EQUAL 2 OR ' + globTags.rating + ' EQUAL 1) AND NOT (' + globTags.style + ' IS live AND NOT ' + globTags.style + ' IS hi-fi) AND %CHANNELS% LESS 3 AND NOT COMMENT HAS quad';
globQuery.female = globTags.style + ' IS female vocal OR ' + globTags.style + ' IS female OR ' + globTags.genre + ' IS female vocal OR ' + globTags.genre + ' IS female OR GENDER IS female';
globQuery.instrumental = globTags.style + ' IS instrumental OR ' + globTags.genre + ' IS instrumental OR SPEECHINESS EQUAL 0';
globQuery.acoustic = globTags.style + ' IS acoustic OR ' + globTags.genre + ' IS acoustic OR ACOUSTICNESS GREATER 75';
globQuery.notLowRating = 'NOT (' + globTags.rating + ' EQUAL 2 OR ' + globTags.rating + ' EQUAL 1)';
globQuery.ratingGr2 = globTags.rating + ' GREATER 2';
globQuery.ratingGr3 = globTags.rating + ' GREATER 3';
globQuery.shortLength = '%LENGTH_SECONDS% LESS 360';
globQuery.stereo = '%CHANNELS% LESS 3 AND NOT COMMENT HAS quad';
globQuery.noFemale = 'NOT (' + globQuery.female + ')';
globQuery.noInstrumental = 'NOT (' + globQuery.instrumental + ')';
globQuery.noAcoustic = 'NOT (' + globQuery.acoustic + ')';
globQuery.noRating = globTags.rating + ' MISSING';
globQuery.noLive = '(NOT ' + globTags.genre + ' IS live AND NOT ' + globTags.style + ' IS live) OR ((' + globTags.genre + ' IS live OR ' + globTags.style + ' IS live) AND ' + globTags.style + ' IS hi-fi)';
globQuery.noLiveNone = 'NOT ' + globTags.genre + ' IS live AND NOT ' + globTags.style + ' IS live';
globQuery.noSACD = 'NOT %_PATH% HAS .iso AND NOT CODEC IS MLP AND NOT CODEC IS DSD64 AND NOT CODEC IS DST64';
globQuery.compareTitle = '"$stricmp(' + globTags.title + ',' + globTags.title.replaceAll('%','#') + ')" IS 1';
// Load user file
loadUserDefFile(globQuery);

// Async processing
const iStepsLibrary = 100; // n steps to split whole library processing: check library tags, pre-cache paths, etc.
const iDelayLibrary = isCompatible('2.0', 'fb') ? 200 : 100; // ms per step for whole handle processing
const iDelayLibraryPLM = isCompatible('2.0', 'fb') ? 40 : 25; // ms per step for whole handle processing
const iDelayPlaylists = 120; // ms per step for playlist processing: playlist manager
const iDelaySBDCache = 150; // ms per step for style/genre node processing: search by distance

// Console log file
conLog = fb.ProfilePath + 'console.log'; // Edit here to change logging file. Replace with '' or null to disable logging
conLogMaxSize = 5000000; // File size, in bytes. Setting to zero or null disables logging too

/* 
	SO features
*/
const soFeat = getSoFeatures();
const soFeatFile = folders.temp + 'soFeatures.json';
if (Object.values(soFeat).slice(0, -1).some((val) => {return !val;})) { // Retry once if something fails
	new Promise((resolve) => {setTimeout(getSoFeatures, 1000); resolve(true);}).then((resolve) => {initCheckFeatures(soFeat);});
} else {initCheckFeatures(soFeat);}

function getSoFeatures() {
	const soFeat = {gecko: true, popup: true, clipboard: true, dpi: true, recycle: true, gdiplus: true, segoe: true, bio: true, x64: true};
	const WshShell = new ActiveXObject('WScript.Shell');
	const app = new ActiveXObject('Shell.Application');
	let doc;
	// Internals
	try {doc = new ActiveXObject('htmlfile');} catch (e) {soFeat.gecko = false;}
	if (typeof doc !== 'undefined' && doc && soFeat.gecko) {
		let clText = 'test', cache = null;
		try {cache = doc.parentWindow.clipboardData.getData('Text');} catch (e) {}
		try {
			doc.parentWindow.clipboardData.setData('Text', clText); 
			clText = doc.parentWindow.clipboardData.getData('Text');
		} catch (e) {soFeat.clipboard = false;}
		if (cache) {try {doc.parentWindow.clipboardData.setData('Text', cache);} catch (e) {}} // Just in case previous clipboard data is needed
		if (clText !== 'test') {soFeat.clipboard = false;}
	} else {soFeat.clipboard = false;}
	if (!soFeat.gecko || !soFeat.clipboard) {soFeat.popup = false;}
	// File system
	if (typeof app !== 'undefined') {
		try {app.NameSpace(10).MoveHere(null);} catch (e) {
			try {app.NameSpace(0).ParseName(null).InvokeVerb('delete');} catch (e) {soFeat.recycle = false;}
		}
	} else {soFeat.recycle = false;}
	// Scripting
	if (utils.IsFile && utils.IsFile(fb.ProfilePath + 'yttm\\foo_lastfm_img.vbs')) {
		try {
			new ActiveXObject('Scripting.FileSystemObject');
			new ActiveXObject('MSXML2.XMLHTTP');
			new ActiveXObject('ADODB.Stream');
		} catch (e) {soFeat.bio = false;}
	}
	// UI
	if (typeof WshShell !== 'undefined') {
		try {WshShell.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI');} catch (e) {soFeat.dpi = false;}
	} else {soFeat.dpi = false;}
	if (!utils.CheckFont('Arial')) {
		soFeat.gdiplus = false;
	}
	if (!utils.CheckFont('Segoe UI')) {
		soFeat.segoe = false;
	}
	const soArchFile = folders.temp + 'soArch.txt';
	if (!utils.IsFile(soArchFile)) {
		const soBat = folders.xxx + 'helpers-external\\checkso\\checkso.bat';
		const run = function () {try {WshShell.Run([...arguments].map((arg) => {return '"' + arg + '"';}).join(' '), 0, true);} catch (e) {}};
		run(soBat, soArchFile);
	}
	if (utils.IsFile(soArchFile) && (utils.ReadTextFile(soArchFile) || '').slice(0,3) !== 'x64') {soFeat.x64 = false;}
	return soFeat;
}

function checkSoFeatures(soFeat) {
	let bPass = true;
	// Internals
	if (!soFeat.gecko) {
		fb.ShowPopupMessage('Found an issue on current installation:\nActiveXObject_Constructor failed:\nFailed to create ActiveXObject object via CLSID: htmlfile.\n\nFix: install \'Gecko\' package.\n' + 'https://wiki.winehq.org/Gecko', 'SO features');
		bPass = false;
	} 
	if (!soFeat.clipboard) {
		fb.ShowPopupMessage('Found an issue on current installation:\nclipboardData failed.\n\nFix (Windows): Install IE11.\n' + 'https://www.microsoft.com/en-us/download/details.aspx?id=40902\t(32 bit)\nhttps://www.microsoft.com/en-us/download/details.aspx?id=40901\t(64 bit)' + '\n\nFix (Wine): Install IE8 with Winetricks.\n' + 'https://wiki.winehq.org/Winetricks' + '\n' + 'https://askubuntu.com/questions/1194126/problem-in-installing-internet-explorer-8' + '\n\nWARNING (Wine):\nApplying this fix will break internet connection on current profile.\ni.e. Bio Script config popup will work but image downloading will be broken. It\'s therefore recommended to don\'t apply this fix on online systems.', 'SO features');
		bPass = false;
	}
	if (!soFeat.popup) {
		fb.ShowPopupMessage('Found an issue on current installation:\nHTML popups failed.\n\nFix (Windows): Install IE11.\n' + 'https://www.microsoft.com/en-us/download/details.aspx?id=40902\t(32 bit)\nhttps://www.microsoft.com/en-us/download/details.aspx?id=40901\t(64 bit)' + '\n\nFix (Wine): Install IE8 with Winetricks.\n' + 'https://wiki.winehq.org/Winetricks' + '\n' + 'https://askubuntu.com/questions/1194126/problem-in-installing-internet-explorer-8' + '\n\nWARNING (Wine):\nApplying this fix will break internet connection on current profile.\ni.e. Bio Script config popup will work but image downloading will be broken. It\'s therefore recommended to don\'t apply this fix on online systems.', 'SO features');
		bPass = false;
	}
	// File system
	if (!soFeat.recycle) {
		// Not sure if there is an alternative (?)
		bPass = false;
	}
	// Scripting
	if (!soFeat.bio) {
		fb.ShowPopupMessage('Found an issue on current installation:\nMissing scripting components for vbs integration (BIO panel).\n\nFix:  Install \'wsh57\' and \'mdac28\' with Winetricks.\n' + 'https://wiki.winehq.org/Winetricks' + '\n\nTerminal command:\n' + 'sh winetricks wsh57 mdac28' + '\n\nFix: Also msado15 needs to be aded to the dll overrides in Winecfg:\n' + 'https://hydrogenaud.io/index.php?topic=121786.msg1005447#msg1005447' +'\n' + 'https://itectec.com/ubuntu/ubuntu-how-to-override-a-dll-without-using-the-winecfg-gui-in-wine/' + '\n' + 'https://wiki.winehq.org/Wine_User%27s_Guide#WINEDLLOVERRIDES.3DDLL_Overrides', 'SO features');
		bPass = false;
	}
	// UI
	if (!soFeat.dpi) {
		fb.ShowPopupMessage('Found an issue on current installation:\nRegistry entry not found:\nHKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI\n\nFix: add entry to registry.\n' + 'HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI          --->     96\n\nCMD command:\n' + 'reg.exe ADD "HKEY_CURRENT_USER\\Control Panel\\Desktop\\WindowMetrics" /v AppliedDPI /t REG_DWORD /d 96', 'SO features');
		bPass = false;
	}
	if (!soFeat.gdiplus) {
		fb.ShowPopupMessage('Found an issue on current installation:\nFonts are not found via utils.CheckFont() and gdi.Font().\n\nFix: install install \'gdiplus\' package with winetricks.\n' + 'https://wiki.winehq.org/Winetricks' + '\n\nTerminal command:\n' + 'sh winetricks gdiplus', 'SO features');
		bPass = false;
	} else if (!soFeat.segoe) {
		fb.ShowPopupMessage('Found an issue on current installation:\nSegoe UI font is missing.\n\nFix: install missing font.\n' + 'https://github.com/mrbvrz/segoe-ui-linux', 'SO features');
		bPass = false;
	}
	return bPass;
}

function initCheckFeatures(soFeat) {
	let data = null;
	const bPrevFile = utils.IsFile(soFeatFile);
	let bCheck = false;
	if (bPrevFile) {
		try {data = utils.ReadTextFile(soFeatFile, 65001);} catch (e) {/* continue regardless of error */}
		data = data ? JSON.parse(data) : null;
	}
	if (!bPrevFile || !data) {
		data = soFeat;
		bCheck = true;
	} else {
		for (let key in data) {
			if (!soFeat.hasOwnProperty(key) || data[key] !== soFeat[key]) {bCheck = true; break;}
		}
	}
	if (bCheck) {
		checkSoFeatures(soFeat); 
		utils.WriteTextFile(soFeatFile, JSON.stringify(soFeat), false);
	}
}