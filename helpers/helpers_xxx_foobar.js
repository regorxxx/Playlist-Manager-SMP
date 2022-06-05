'use strict';
//05/06/22

include('helpers_xxx_file.js');
include('helpers_xxx_console.js');

/* 
	Panels
*/

function isCompatible(requiredVersionStr = '1.6.1') {
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

function checkCompatible(requiredVersionStr = '1.6.1') {
	if (!isCompatible(requiredVersionStr)) {
		console.popup('This script requires v' + requiredVersionStr + '. Current component version is v' + utils.Version + '.', window.Name);
	}
}

function memoryUsed(bConsole = false) { // In Mbs
	let memUsage = -1;
	console.log(window.JsMemoryStats);
	memUsage = round(window.JsMemoryStats.MemoryUsage / 1000000, 2);
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

/* function on_key_upCrash(vkey) {
	if (vkey === VK_BACK && (utils.IsKeyPressed(0x5B) || utils.IsKeyPressed(0x5C))) {crashThisInstance;}
}
if (on_key_up) {
	const oldFunc = on_key_up;
	on_key_up = function(vkey) {
		oldFunc(vkey);
		on_key_upCrash(vkey);
	};
} else {var on_key_up = on_key_upCrash;} */