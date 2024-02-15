'use strict';
//15/02/24

/* exported getSoFeatures, checkSoFeatures, initCheckFeatures */

include('helpers_xxx.js');
/* global soFeatFile:readable, folders:readable, globProfiler:readable */

/*
	Global tags, queries, RegExp
*/

function getSoFeatures() {
	const soFeat = { gecko: true, popup: true, clipboard: true, dpi: true, recycle: true, gdiplus: true, segoe: true, bio: true, x64: true };
	const WshShell = new ActiveXObject('WScript.Shell');
	const app = new ActiveXObject('Shell.Application');
	let doc;
	// Internals
	try { doc = new ActiveXObject('htmlfile'); } catch (e) { soFeat.gecko = false; }
	if (typeof doc !== 'undefined' && doc && soFeat.gecko) {
		let clText = 'test', cache = null;
		try { cache = doc.parentWindow.clipboardData.getData('Text'); } catch (e) { /* continue */ }
		try {
			doc.parentWindow.clipboardData.setData('Text', clText);
			clText = doc.parentWindow.clipboardData.getData('Text');
		} catch (e) { soFeat.clipboard = false; }
		if (cache) { try { doc.parentWindow.clipboardData.setData('Text', cache); } catch (e) { /* continue */ } } // Just in case previous clipboard data is needed
		if (clText !== 'test') { soFeat.clipboard = false; }
	} else { soFeat.clipboard = false; }
	if (!soFeat.gecko || !soFeat.clipboard) { soFeat.popup = false; }
	globProfiler.Print('getSoFeatures.internals');
	// File system
	if (typeof app !== 'undefined') {
		try { app.NameSpace(10).MoveHere(null); } catch (e) {
			try { app.NameSpace(0).ParseName(null).InvokeVerb('delete'); } catch (e) { soFeat.recycle = false; }
		}
	} else { soFeat.recycle = false; }
	globProfiler.Print('getSoFeatures.fileSystem');
	// Scripting
	if (utils.IsFile && utils.IsFile(fb.ProfilePath + 'yttm\\foo_lastfm_img.vbs')) {
		try {
			new ActiveXObject('Scripting.FileSystemObject');
			new ActiveXObject('MSXML2.XMLHTTP');
			new ActiveXObject('ADODB.Stream');
		} catch (e) { soFeat.bio = false; }
	}
	globProfiler.Print('getSoFeatures.scripting');
	// UI
	if (typeof WshShell !== 'undefined') {
		try { WshShell.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI'); } catch (e) { soFeat.dpi = false; }
	} else { soFeat.dpi = false; }
	if (!utils.CheckFont('Arial')) {
		soFeat.gdiplus = false;
	}
	if (!utils.CheckFont('Segoe UI')) {
		soFeat.segoe = false;
	}
	globProfiler.Print('getSoFeatures.ui');
	// OS
	const soArchFile = folders.temp + 'soArch.txt';
	if (!utils.IsFile(soArchFile)) {
		const soBat = folders.xxx + 'helpers-external\\checkso\\checkso.bat';
		const run = function () { try { WshShell.Run([...arguments].map((arg) => '"' + arg + '"').join(' '), 0, true); } catch (e) { /* continue */ } };
		run(soBat, soArchFile);
	}
	if (utils.IsFile(soArchFile) && !(utils.ReadTextFile(soArchFile) || '').startsWith('x64')) { soFeat.x64 = false; }
	globProfiler.Print('getSoFeatures.os');
	return soFeat;
}

function checkSoFeatures(soFeat, bPopup = true) {
	let bPass = true;
	const tip = '\n\nTip:\nIn case you don\'t plan to fix the error, it can be hidden by changing \'bPopupOnCheckSOFeatures\' setting found at \'[FOOBAR PROFILE FOLDER]\\js_data\\presets\\global\\globSettings.json\'.';
	// Internals
	if (!soFeat.gecko) {
		bPopup && fb.ShowPopupMessage('Found an issue on current installation:\nActiveXObject_Constructor failed:\nFailed to create ActiveXObject object via CLSID: htmlfile.' + '\n\nFeatures affected:\nHTML file manipulation may not work (usually used for clipboard manipulation).' + tip + '\n\nFix: install \'Gecko\' package.\n' + 'https://wiki.winehq.org/Gecko', 'SO features');
		bPass = false;
	}
	if (!soFeat.clipboard) {
		bPopup && fb.ShowPopupMessage('Found an issue on current installation:\nclipboardData failed.' + '\n\nFeatures affected:\nClipboard manipulation will not work.' + tip + '\n\nFix (Windows): Install IE11.\n' + 'https://www.microsoft.com/en-us/download/details.aspx?id=40902\t(32 bit)\nhttps://www.microsoft.com/en-us/download/details.aspx?id=40901\t(64 bit)' + '\n\nFix (Wine): Install IE8 with Winetricks.\n' + 'https://wiki.winehq.org/Winetricks' + '\n' + 'https://askubuntu.com/questions/1194126/problem-in-installing-internet-explorer-8' + '\n\nWARNING (Wine):\nApplying this fix will break internet connection on current profile.\ni.e. Bio Script config popup will work but image downloading will be broken. It\'s therefore recommended to don\'t apply this fix on online systems.', 'SO features');
		bPass = false;
	}
	if (!soFeat.popup) {
		bPopup && fb.ShowPopupMessage('Found an issue on current installation:\nHTML popups failed.' + '\n\nFeatures affected:\nHTML windows will not work. None of my scripts use them (to ensure full Wine compatibility), but for ex. Bio Script configuration window does.' + tip + '\n\nFix (Windows): Install IE11.\n' + 'https://www.microsoft.com/en-us/download/details.aspx?id=40902\t(32 bit)\nhttps://www.microsoft.com/en-us/download/details.aspx?id=40901\t(64 bit)' + '\n\nFix (Wine): Install IE8 with Winetricks.\n' + 'https://wiki.winehq.org/Winetricks' + '\n' + 'https://askubuntu.com/questions/1194126/problem-in-installing-internet-explorer-8' + '\n\nWARNING (Wine):\nApplying this fix will break internet connection on current profile.\ni.e. Bio Script configuration window will work but image downloading will be broken. It\'s therefore recommended to don\'t apply this fix on online systems.', 'SO features');
		bPass = false;
	}
	// File system
	if (!soFeat.recycle) {
		// Not sure if there is an alternative (?)
		bPass = false;
	}
	// Scripting
	if (!soFeat.bio) {
		bPopup && fb.ShowPopupMessage('Found an issue on current installation:\nMissing scripting components for vbs integration (BIO panel).' + '\n\nFeatures affected:\nBio Script will not work properly (and any of my scripts integrated with it will skip its usage).' + tip + '\n\nFix:  Install \'wsh57\' and \'mdac28\' with Winetricks.\n' + 'https://wiki.winehq.org/Winetricks' + '\n\nTerminal command:\n' + 'sh winetricks wsh57 mdac28' + '\n\nFix: Also msado15 needs to be aded to the dll overrides in Winecfg:\n' + 'https://hydrogenaud.io/index.php?topic=121786.msg1005447#msg1005447' + '\n' + 'https://itectec.com/ubuntu/ubuntu-how-to-override-a-dll-without-using-the-winecfg-gui-in-wine/' + '\n' + 'https://wiki.winehq.org/Wine_User%27s_Guide#WINEDLLOVERRIDES.3DDLL_Overrides', 'SO features');
		bPass = false;
	}
	// UI
	if (!soFeat.dpi) {
		bPopup && fb.ShowPopupMessage('Found an issue on current installation:\nRegistry entry not found:\nHKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI' + '\n\nFeatures affected:\nUI scaling will not adjust properly according to screen resolution.' + tip + '\n\nFix: add entry to registry.\n' + 'HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI          --->     96\n\nCMD command:\n' + 'reg.exe ADD "HKEY_CURRENT_USER\\Control Panel\\Desktop\\WindowMetrics" /v AppliedDPI /t REG_DWORD /d 96', 'SO features');
		bPass = false;
	}
	if (!soFeat.gdiplus) {
		bPopup && fb.ShowPopupMessage('Found an issue on current installation:\nFonts are not found via utils.CheckFont() and gdi.Font().' + '\n\nFeatures affected:\nScript fonts may not be properly displayed or some symbols missing.' + tip + '\n\nFix: install install \'gdiplus\' package with winetricks.\n' + 'https://wiki.winehq.org/Winetricks' + '\n\nTerminal command:\n' + 'sh winetricks gdiplus', 'SO features');
		bPass = false;
	} else if (!soFeat.segoe) {
		bPopup && fb.ShowPopupMessage('Found an issue on current installation:\nSegoe UI font is missing.' + '\n\nFeatures affected:\nDefault and fallback font when others are missing will not be displayed properly and some texts may not be displayed at all.' + tip + '\n\nFix: install missing font.\n' + 'https://github.com/mrbvrz/segoe-ui-linux', 'SO features');
		bPass = false;
	}
	return bPass;
}

function initCheckFeatures(soFeat, bPopup = true) {
	let data = null;
	const bPrevFile = utils.IsFile(soFeatFile);
	let bCheck = false;
	if (bPrevFile) {
		try { data = utils.ReadTextFile(soFeatFile, 65001); } catch (e) {/* continue regardless of error */ }
		data = data ? JSON.parse(data) : null;
	}
	if (!bPrevFile || !data) {
		bCheck = true;
	} else {
		for (const key in soFeat) {
			if (!data.hasOwnProperty(key) || data[key] !== soFeat[key]) { bCheck = true; break; } // eslint-disable-line no-prototype-builtins
		}
	}
	if (bCheck) {
		checkSoFeatures(soFeat, bPopup);
		utils.WriteTextFile(soFeatFile, JSON.stringify(soFeat), false);
	}
	globProfiler.Print('initCheckFeatures');
}