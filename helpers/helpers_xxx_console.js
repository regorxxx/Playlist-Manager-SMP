'use strict';
//17/12/23

include(fb.ComponentPath + 'docs\\Codepages.js');

// Console log file
// Edit here to change logging file. Replace with '' or null to disable logging
Object.defineProperty(console, 'File', {enumerable: false, configurable: false, writable: true, value: fb.ProfilePath + 'console.log'});
// File size, in bytes. Setting to zero or null disables logging too
Object.defineProperty(console, 'MaxSize', {enumerable: false, configurable: false, writable: true, value: 5000000});
// Interval to flush to console, in ms. Setting to zero or null writes to console file on every call (not recommended)
Object.defineProperty(console, 'Throttling', {enumerable: false, configurable: false, writable: true, value: 100});
// Interval use
Object.defineProperty(console, 'Timer', {enumerable: false, configurable: false, writable: true});
Object.defineProperty(console, 'Cache', {enumerable: false, configurable: false, writable: true, value: []});

/* global fso:readable */
const fsoCL = typeof fso !== 'undefined' ? fso : new ActiveXObject('Scripting.FileSystemObject'); // Reuse fso if possible

// Override logging
function consoleLog() {
	const bCache = console.Cache.length !== 0;
	const today = new Date().toLocaleDateString();
	let log = '';
	let lastMod = null;
	// Load previous log
	console.checkSize();
	if (utils.IsFile(console.File)) {
		try {log += utils.ReadTextFile(console.File, convertCharsetToCodepage('UTF-8'));} catch (e) {/* continue regardless of error */}
		lastMod = new Date(fsoCL.GetFile(console.File).DateLastModified).toLocaleDateString();
	}
	// Add dd/mm/yyyy
	if (lastMod !== today) {
		log += (log && log.length ? '\n' : '') + '--------->' + today + '<---------';
	}
	// Add HH:MM:SS
	const stamp = bCache ? '' : '[' + new Date().toLocaleTimeString() + ']';
	log += (log && log.length ? '\n' : '') + (bCache ? '' : stamp);
	// Unpack args
	const args = bCache ? console.Cache : [[...arguments]];
	if (bCache) {console.Cache = [];}
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
					if (arg !== null) {
						let instance = null;
						switch (true) {	// Get object types
							case arg instanceof Set: {instance = {name: 'Set', type: 'array'}; break;}
							case arg instanceof Map: {instance = {name: 'Map', type: 'array'}; break;}
							case arg instanceof WeakMap: {instance = {name: 'WeakMap', type: 'array'}; break;}
							case arg instanceof WeakSet: {instance = {name: 'WeakSet', type: 'array'}; break;}
							case arg instanceof Error: {instance = {name: 'Error', type: 'error'}; break;}
						}
						if (instance) {  // Convert to array objects if possible and stringify
							switch (instance.type) {
								case 'array': {val = [...arg]; break;}
								case 'error': {val = arg.toString(); break;}
							}
						}
						try {
							val = (instance ? instance.name + ' ' : 'Object ') + JSON.stringify(val ? val : arg, (k, v) => {
								if (typeof v !== 'undefined' && v !== null) {
									if (v.RawPath && v.Path) {
										return 'FbMetadbHandle ' + JSON.stringify({FileSize: v.FileSize, Length: v.Length, Path: v.Path, RawPath: v.RawPath, SubSong: v.SubSong}, null, ' ').replace(/{\n /,'{').replace(/"|\n/g,'').replace(/\\\\/g, '\\');
									}
									else if (v instanceof FbMetadbHandleList) {
										return 'FbMetadbHandleList ' + JSON.stringify({Count: v.Count}, null, ' ').replace(/{\n /,'{').replace(/"|\n/g,'')
									}
									else if (v instanceof Set) {
										return 'Set ' + JSON.stringify([...v]).replace(/"|\n/g,'');
									}
									else if (v instanceof Map) {
										return 'Map ' + JSON.stringify([...v]).replace(/"|\n/g,'');
									}
									else if (v instanceof WeakMap) {
										return 'WeakMap ' + JSON.stringify([...v]).replace(/"|\n/g,'');
									}
									else if (v instanceof WeakSet) {
										return 'WeakMap ' + JSON.stringify([...v]).replace(/"|\n/g,'');
									}
									else if (v instanceof Error) {
										return 'Error ' + arg.toString().replace(/"|\n/g,'');
									}
								}
								return v;
							});
						} catch (e) {
							if (e.message === 'can\'t access dead object') {
								console.logUI('Console.log: can\'t access dead object: ', type);
							} else {
								try {val = arg.constructor.name || (arg.constructor.toString().match(/function (\w*)/) || [ , ])[1];} catch (e) {}
								if (!val) {val = '--unknown type--';}
								console.logUI('Console.log: argument type not recognized: ', type, val);
							}
						}
					}
					break;
				}
			}
			log += (bCache && i === 0 ? '' : ' ') + val;
		});
	});
	// Write
	try {utils.WriteTextFile(console.File, log, false);} catch (e) {/* continue regardless of error */}
}

// Check file size doesn't exceed threshold or reset it
console.checkSize = () => {
	if (utils.IsFile(console.File) && utils.GetFileSize(console.File) > console.MaxSize) {
		try {utils.WriteTextFile(console.File, '', false);} catch (e) {/* continue regardless of error */}
		console.log('helpers_xxx: console log file size exceeds ' + (console.MaxSize / 1e7) + ' MB, creating new file: ' + console.File);
		return true;
	}
	return false;
};

// Force writing cache to file (usually used at on_script_unload)
console.flush = () => {
	if (console.Cache.length) {consoleLog();}
};

// Send to popup and console
console.popup = (arg, popupName, bPopup = true, bSplit = true) => {
	if (bPopup) {fb.ShowPopupMessage(arg, popupName);}
	if (bSplit) {
		arg.split('\n').forEach((line) => {
			if (line && line.length) {console.log(line);}
		});
	} else {
		console.log(arg);
	}
};

if (console.File && console.File.length && console.MaxSize && console.log) {
	console.logUI = console.log;
	console.log = function() {
		console.logUI(...arguments);
		if (console.Throttling) {
			clearTimeout(console.Timer);
			// Add HH:MM:SS
			const stamp = '[' + new Date().toLocaleTimeString() + ']';
			console.Cache.push([stamp, ...arguments]);
			console.Timer = setTimeout(consoleLog, console.Throttling);
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