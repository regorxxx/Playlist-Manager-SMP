'use strict';
//03/02/22

include(fb.ComponentPath + 'docs\\Codepages.js');

// Console log file
let conLog = fb.ProfilePath + 'console.log'; // Edit here to change logging file. Replace with '' or null to disable logging
let conLogMaxSize = 5000000; // File size, in bytes. Setting to zero or null disables logging too

// Override logging
function consoleLog() {
	let log = '';
	// Load previous log
	if (utils.IsFile(conLog)) {log += utils.ReadTextFile(conLog, convertCharsetToCodepage('UTF-8'));}
	// Add HH:MM:SS
	const stamp = '[' + new Date().toLocaleTimeString() + ']';
	log += (log.length ? '\n' : '') + stamp;
	// Unpack args
	[...arguments].forEach((arg, i) => {
		const type = typeof arg;
		let val = null;
		switch (type) {
			case 'undefined': {
				val = void(0);
				break;
			}
			case 'function':
			case 'number':
			case 'boolean':
			case 'string': {
				val = arg.toString();
				break;
			}
			case 'object':
			default : {
				let instance = null;
				switch (true) {	// Get object types
					case arg instanceof Set: {instance = 'Set '; break;}
					case arg instanceof Map: {instance = 'Map '; break;}
					case arg instanceof WeakMap: {instance = 'WeakMap '; break;}
					case arg instanceof WeakSet: {instance = 'WeakSet '; break;}
				}
				if (instance) {val = Array.from(arg);} // Convert to array objects if possible and stringify
				try {val = (instance ? instance : 'Object ') + JSON.stringify(val ? val : arg);} 
				catch (e) {val = '--error type--'; console.logUI('Console.log: argument type not recognized: ', type, val ? val : arg);}
				break;
			}
		}
		log += ' ' + val;
	});
	// Write
	utils.WriteTextFile(conLog, log, false);
}
if (conLog && conLog.length && conLogMaxSize && console.log) {
	console.logUI = console.log;
	console.log = function() {
		console.logUI(...arguments);
		consoleLog(...arguments);
	};
	if (utils.IsFile(conLog) && utils.GetFileSize(conLog) > conLogMaxSize) {
		utils.WriteTextFile(conLog, '', false);
		console.log('helpers_xxx: console log file size exceeds ' + (conLogMaxSize / 10000000) + ' MB, creating new file: ' + conLog);
	}
}

// Send to popup and console
console.popup = (arg, popupName) => {
	fb.ShowPopupMessage(arg, popupName);
	arg.split('\n').forEach((line) => {
		if (line && line.length) {console.log(line);}
	;});
}
