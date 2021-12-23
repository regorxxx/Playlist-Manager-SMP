'use strict';
//21/12/21

include('helpers_xxx_file.js');

/* 
	Panels
*/

function isCompatible(requiredVersionStr = '1.4.0') {
	let requiredVersion = requiredVersionStr.split('.');
	let currentVersion = utils.Version.split('.'); // e.g. 0.1.0-alpha.2
	if (currentVersion.length > 3) {
		curraentVersion.length = 3; // We need only numbers
	}

	for(let i = 0; i< currentVersion.length; ++i) {
		if (currentVersion[i] !== requiredVersion[i]) {
			return currentVersion[i] > requiredVersion[i];
		}
	}

	return true;
}

function checkCompatible(requiredVersionStr = '1.4.0') {
	if (!isCompatible(requiredVersionStr)) {
		fb.ShowPopupMessage('This script requires v' + requiredVersionStr + '. Current component version is v' + utils.Version + '.');
	}
}

function memoryUsed(bConsole = false) { // In Mbs
	let memUsage = -1;
	console.log(window.JsMemoryStats);
	if (isCompatible('1.4.0')) {memUsage = round(window.JsMemoryStats.MemoryUsage / 1000000, 2);} 
	else {memUsage = round(window.PanelMemoryUsage / 1000000, 2);} //TODO: Deprecated
	if (bConsole) {console.log(window.Name + ' mem usage: ' + memUsage + ' Mb');}
	return memUsage;
}

function isPortable(propertyText, bWarn = true) {
	let bPort = _isFile(fb.FoobarPath + 'portable_mode_enabled');
	if (bPort && bWarn) {
		if (isArray(propertyText)) {propertyText = propertyText.join('\n');}
		fb.ShowPopupMessage('This is a portable installation. It\'s recommended to use relative paths on the properties panel for these variables:\n' + propertyText, window.Name);
	}
	return bPort;
}

function lastStartup() {
	return lastModified(fb.ProfilePath + 'running');
}