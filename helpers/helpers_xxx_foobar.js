﻿'use strict';
//25/09/25

/* exported checkCompatible, memoryUsed, isPortable, lastStartup, memoryPrint*/

include('helpers_xxx_file.js');
/* global _isFile:readable, lastModified:readable */
include('helpers_xxx_prototypes.js');
/* global round:readable, roughSizeOfObject:readable, _ps:readable */
include('helpers_xxx_console.js');

/*
	Panels
*/

function compareVersions(from, to) {
	if (typeof from === 'string') { from = from.split('.'); }
	if (typeof to === 'string') { to = to.split('.'); }
	for (let i = 0; i < to.length; ++i) {
		if (to[i] !== from[i]) {
			return typeof from[i] === 'undefined'
				? false
				: to[i].localeCompare(from[i], void (0), { numeric: true }) < 0;
		}
	}
	return true;
}

function isCompatible(requiredVersionStr = '1.6.1', target = 'smp') {
	target = target.toLowerCase();
	return target === 'smp' || target === 'jsplitter'
		? compareVersions(utils.Version.split('.'), requiredVersionStr.split('.')) && (target === 'jsplitter' ? fb.ComponentPath.includes('foo_uie_jsplitter') : true)
		: compareVersions(fb.Version.split('.'), requiredVersionStr.split('.'));
}

function checkCompatible(requiredVersionStr = '1.6.1', target = 'smp') {
	target = target.toLowerCase();
	if (!isCompatible(requiredVersionStr)) {
		const isJsHost = target === 'smp' || target === 'jsplitter';
		console.popup('This script requires v' + requiredVersionStr + '. Current ' + (isJsHost ? 'component' : 'Foobar2000') + ' version is v' + (isJsHost ? utils : fb).Version + '.', window.Name + _ps(window.ScriptInfo.Name));
	}
}

function memoryUsed(bConsole = false) { // In Mbs
	let memUsage = -1;
	memUsage = round(window.JsMemoryStats.MemoryUsage / 1000000, 2);
	if (bConsole) { console.log(window.Name + _ps(window.ScriptInfo.Name) + ' mem usage: ' + memUsage + ' Mb'); }
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
		fb.ShowPopupMessage('This is a portable installation. It\'s recommended to use relative paths on the properties panel for these variables:\n\n - ' + propertyText, window.Name + _ps(window.ScriptInfo.Name));
	}
	return bPort;
}

function lastStartup() {
	return lastModified(fb.ProfilePath + 'running');
}