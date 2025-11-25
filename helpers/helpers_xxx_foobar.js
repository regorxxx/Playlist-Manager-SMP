'use strict';
//25/11/25

/* exported memoryUsed, isPortable, lastStartup, memoryPrint*/

include('helpers_xxx_file.js');
/* global _isFile:readable, lastModified:readable */
include('helpers_xxx_prototypes.js');
/* global round:readable, roughSizeOfObject:readable, _ps:readable */ /* window.FullPanelName:readable */
include('helpers_xxx_console.js');

/*
	Panels
*/

function memoryUsed(bConsole = false) { // In Mbs
	let memUsage = -1;
	memUsage = round(window.JsMemoryStats.MemoryUsage / 1000000, 2);
	if (bConsole) { console.log(window.FullPanelName + ' mem usage: ' + memUsage + ' Mb'); }
	return memUsage;
}

function memoryPrint(text, obj) {
	console.log(
		window.Name  + _ps(window.ScriptInfo.Name) + (text ? ' - ' + text : '') +
		(
			typeof obj !== 'undefined'
				? '\n\t Args memory usage: ' + utils.FormatFileSize(roughSizeOfObject(obj))
				: ''
		) +
		'\n\t Panel memory usage: ' + utils.FormatFileSize(window.JsMemoryStats.MemoryUsage) +
		'  /  Total memory usage:: ' + utils.FormatFileSize(window.JsMemoryStats.TotalMemoryLimit)
	);
}

function isPortable(propertyText, bWarn = true) {
	const bPort = _isFile(fb.FoobarPath + 'portable_mode_enabled');
	if (bPort && bWarn) {
		if (Array.isArray(propertyText)) { propertyText = propertyText.join('\n - '); }
		fb.ShowPopupMessage('This is a portable installation. It\'s recommended to use relative paths on the properties panel for these variables:\n\n - ' + propertyText, window.FullPanelName);
	}
	return bPort;
}

function lastStartup() {
	return lastModified(fb.ProfilePath + 'running');
}