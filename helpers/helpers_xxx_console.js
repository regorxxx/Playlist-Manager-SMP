'use strict';
//14/08/22

include(fb.ComponentPath + 'docs\\Codepages.js');

// Console log file
let conLog = fb.ProfilePath + 'console.log'; // Edit here to change logging file. Replace with '' or null to disable logging
let conLogMaxSize = 5000000; // File size, in bytes. Setting to zero or null disables logging too
let conLogThrottling = 100; // Interval to flush to console, in ms. Setting to zero or null writes to console file on every call (not recommended)

let conLogTimer; // Interval use.
let conLogCache = []; // Internal use.

// Override logging
function consoleLog() {
	const bCache = conLogCache.length !== 0;
	let log = '';
	// Load previous log
	console.checkSize();
	if (utils.IsFile(conLog)) {try {log += utils.ReadTextFile(conLog, convertCharsetToCodepage('UTF-8'));} catch (e) {/* continue regardless of error */}}
	// Add HH:MM:SS
	const stamp = bCache ? '' : '[' + new Date().toLocaleTimeString() + ']';
	log += (log && log.length ? '\n' : '') + (bCache ? '' : stamp);
	// Unpack args
	const args = bCache ? conLogCache : [[...arguments]];
	if (bCache) {conLogCache = [];}
	args.forEach((call, j) => {
		if (bCache && j !== 0) {log += '\n';}
		call.forEach((arg, i) => {
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
			log += (bCache && i === 0 ? '' : ' ') + val;
		});
	});
	// Write
	try {utils.WriteTextFile(conLog, log, false);} catch (e) {/* continue regardless of error */}
}

// Check file size doesn't exceed threshold or reset it
console.checkSize = () => {
	if (utils.IsFile(conLog) && utils.GetFileSize(conLog) > conLogMaxSize) {
		try {utils.WriteTextFile(conLog, '', false);} catch (e) {/* continue regardless of error */}
		console.log('helpers_xxx: console log file size exceeds ' + (conLogMaxSize / 1e7) + ' MB, creating new file: ' + conLog);
		return true;
	}
	return false;
};

// Send to popup and console
console.popup = (arg, popupName, bPopup = true) => {
	if (bPopup) {fb.ShowPopupMessage(arg, popupName);}
	arg.split('\n').forEach((line) => {
		if (line && line.length) {console.log(line);}
	});
};

if (conLog && conLog.length && conLogMaxSize && console.log) {
	console.logUI = console.log;
	console.log = function() {
		console.logUI(...arguments);
		if (conLogThrottling) {
			clearTimeout(conLogTimer);
			// Add HH:MM:SS
			const stamp = '[' + new Date().toLocaleTimeString() + ']';
			conLogCache.push([stamp, ...arguments]);
			conLogTimer = setTimeout(consoleLog, conLogThrottling);
		} else {
			consoleLog(...arguments);
		}
	};
	console.checkSize();
}

// Rewrap FbProfiler to expose Name variable
if (FbProfiler.prototype) {
	const oldProto = FbProfiler.prototype;
	const oldFunc = FbProfiler;
	FbProfiler = function(name) {
		const obj = oldFunc(name);
		obj.Name = name;
		return obj;
	};
	FbProfiler.prototype = oldProto;
}

// Rewrap FbProfiler to also log to file
if (FbProfiler.prototype.Print) {
	FbProfiler.prototype.PrintUI = FbProfiler.prototype.Print;
	FbProfiler.prototype.Print = function(additionalMsgopt = '', printComponentInfoopt = true) {
		// Recreate the message format
		let message = '';
		if (printComponentInfoopt) {message += 'Spider Monkey Panel v' + utils.Version + ': ';}
		message += 'profiler (' + this.Name + '): ';
		if (additionalMsgopt && additionalMsgopt.length) {message += additionalMsgopt + ' ';}
		message += this.Time + 'ms';
		console.log(message); // Instead of using the original method, just use the basic log routine with debounce
		// this.PrintUI(additionalMsgopt, printComponentInfoopt);
		// consoleLog(message);
	};
	console.checkSize();
}