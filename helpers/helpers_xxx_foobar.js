'use strict';
//12/08/22

include('helpers_xxx_file.js');
include('helpers_xxx_console.js');

/* 
	Panels
*/

function isCompatible(requiredVersionStr = '1.6.1', target = 'smp') {
	let requiredVersion = requiredVersionStr.split('.');
	let currentVersion = (target.toLowerCase === 'smp' ? utils : fb).Version.split('.'); // e.g. 0.1.0-alpha.2
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

function checkCompatible(requiredVersionStr = '1.6.1', target = 'smp') {
	if (!isCompatible(requiredVersionStr)) {
		console.popup('This script requires v' + requiredVersionStr + '. Current ' + (target.toLowerCase === 'smp' ? 'component' : 'Foobar2000') + ' version is v' + (target.toLowerCase === 'smp' ? utils : fb).Version + '.', window.Name);
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