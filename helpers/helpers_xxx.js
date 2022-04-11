'use strict';
//11/04/22

// Folders
const folders = {};
folders.xxxName = 'scripts\\SMP\\xxx-scripts\\'; // Edit here to change install path (this is relative to the profile path)
folders.dataName = 'js_data\\';
folders.xxx = fb.ProfilePath + folders.xxxName; 
folders.data = fb.ProfilePath + folders.dataName;

include(fb.ComponentPath + 'docs\\Codepages.js');
include(fb.ComponentPath + 'docs\\Flags.js');
include('helpers_xxx_basic_js.js');
include('helpers_xxx_console.js');
include('helpers_xxx_foobar.js');

/* 
	Global Variables 
*/

// Async processing
const iStepsLibrary = 100; // n steps to split whole library processing: check library tags, pre-cache paths, etc.
const iDelayLibrary = 100; // ms per step for whole handle processing
const iDelayPlaylists = 120; // ms per step for playlist processing: playlist manager
const iDelaySBDCache = 15; // ms per step for style/genre node processing: search by distance

// Console log file
conLog = fb.ProfilePath + 'console.log'; // Edit here to change logging file. Replace with '' or null to disable logging
conLogMaxSize = 5000000; // File size, in bytes. Setting to zero or null disables logging too

// Linux features
const soFeat = getSoFeatures();
const soFeatFile = folders.data + 'soFeatures.json';
initCheckFeatures(soFeat);

function getSoFeatures() {
	const soFeat = {gecko: true, clipboard: true, dpi: true, recycle: true, gdiplus: true, segoe: true, bio: true}
	const WshShell = new ActiveXObject('WScript.Shell');
	const app = new ActiveXObject('Shell.Application');
	let doc;
	// Internals
	try {doc = new ActiveXObject('htmlfile');} catch (e) {soFeat.gecko = false;}
	if (typeof doc !== 'undefined' && soFeat.gecko) {
		let clText = 'test', cache = null;
		try {
			cache = doc.parentWindow.clipboardData.getData('Text'); 
			doc.parentWindow.clipboardData.setData('Text', clText); 
			clText = doc.parentWindow.clipboardData.getData('Text');
			if (cache !== null) {doc.parentWindow.clipboardData.setData('Text', cache);} // Just in case previous clipboard data is needed
		} catch (e) {soFeat.clipboard = false;}
		if (clText !== 'test') {soFeat.clipboard = false;}
	} else {soFeat.clipboard = false;}
	// File system
	if (typeof app !== 'undefined') {
		try {app.NameSpace(10).MoveHere(null);} catch (e) {
			try {app.NameSpace(0).ParseName(null).InvokeVerb('delete');} catch (e) {soFeat.recycle = false;}
		}
	} else {soFeat.recycle = false;}
	// Scripting
	if (utils.IsFile && utils.IsFile(fb.ProfilePath + 'yttm\\foo_lastfm_img.vbs')) {
		try {
			new ActiveXObject("Scripting.FileSystemObject");
			new ActiveXObject("MSXML2.XMLHTTP");
			new ActiveXObject("ADODB.Stream");
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
	return soFeat;
}

function checkSoFeatures(soFeat) {
	let bPass = true;
	// Internals
	if (!soFeat.gecko) {
		fb.ShowPopupMessage('Found an issue on current installation:\nActiveXObject_Constructor failed:\nFailed to create ActiveXObject object via CLSID: htmlfile.\n\nFix: install \'Gecko\' package.\n' + 'https://wiki.winehq.org/Gecko', 'SO features');
		bPass = false;
	} else  if (!soFeat.clipboard) {
		fb.ShowPopupMessage('Found an issue on current installation:\nclipboardData failed.\n\nFix (Windows): Install IE11.\n' + 'https://www.microsoft.com/en-us/download/details.aspx?id=40902\t(32 bit)\nhttps://www.microsoft.com/en-us/download/details.aspx?id=40901\t(64 bit)' + '\n\nFix (Wine): Install IE8 with Winetricks.\n' + 'https://wiki.winehq.org/Winetricks' + '\n' + 'https://askubuntu.com/questions/1194126/problem-in-installing-internet-explorer-8' + '\n\nWARNING (Wine):\nApplying this fix will break internet connection on current profile.\ni.e. Bio Script config popup will work but image downloading will be broken. It\'s therefore recommended to don\'t apply this fix on online systems.', 'SO features');
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
		fb.ShowPopupMessage('Found an issue on current installation:\nRegistry entry not found:\nHKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI\n\nFix: add entry to registry.\n' + 'HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI          --->     96\n\nCMD command:\n' + 'reg.exe ADD "HKEY_CURRENT_USER\Control Panel\Desktop\WindowMetrics" /v AppliedDPI /t REG_DWORD /d 96', 'SO features');
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
		try {data = utils.ReadTextFile(soFeatFile, 65001);} catch (e) {}
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