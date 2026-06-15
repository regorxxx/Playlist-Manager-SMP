'use strict';
//15/06/26

include(fb.ComponentPath + 'docs\\Codepages.js');
/* global convertCharsetToCodepage:readable */

// Console log file
// Edit here to change logging file. Replace with '' or null to disable logging
Object.defineProperty(console, 'File', { enumerable: false, configurable: false, writable: true, value: fb.ProfilePath + 'console.log' });
// File size, in bytes. Setting to zero or null disables logging too
Object.defineProperty(console, 'MaxSize', { enumerable: false, configurable: false, writable: true, value: 5000000 });
// Interval to flush to console, in ms. Setting to zero or null writes to console file on every call (not recommended)
Object.defineProperty(console, 'Throttling', { enumerable: false, configurable: false, writable: true, value: 100 });
// Interval use
Object.defineProperty(console, 'Timer', { enumerable: false, configurable: false, writable: true });
Object.defineProperty(console, 'Cache', { enumerable: false, configurable: false, writable: true, value: [] });
// Global switch
Object.defineProperty(console, 'Enabled', { enumerable: false, configurable: false, writable: true, value: true });
Object.defineProperty(console, 'EnabledFile', { enumerable: false, configurable: false, writable: true, value: true });

/* global fso:readable */
const fsoCL = typeof fso === 'undefined' ? new ActiveXObject('Scripting.FileSystemObject') : fso; // Reuse fso if possible

// Override logging
function consoleLog() {
	const bCache = console.Cache.length !== 0;
	const today = new Date().toLocaleDateString();
	let log = '';
	let lastMod = null;
	// Load previous log
	console.checkSize();
	if (utils.IsFile(console.File)) {
		try { log += utils.ReadTextFile(console.File, convertCharsetToCodepage('UTF-8')); } catch (e) {/* continue regardless of error */ } // eslint-disable-line no-unused-vars
		lastMod = new Date(fsoCL.GetFile(console.File).DateLastModified).toLocaleDateString();
	}
	// Add dd/mm/yyyy
	if (lastMod !== today) {
		log += (log && log.length ? '\r\n' : '') + '--------->' + today + '<---------';
	}
	// Add HH:MM:SS
	const stamp = bCache ? '' : '[' + new Date().toLocaleTimeString() + ']';
	log += (log && log.length ? '\r\n' : '') + (bCache ? '' : stamp);
	// Unpack args
	const args = bCache ? console.Cache : [[...arguments]];
	if (bCache) { console.Cache = []; }
	args.forEach((call, j) => {
		if (bCache && j !== 0) { log += '\r\n'; }
		call.forEach((arg, i) => {
			const val = console.formatArg(arg);
			log += (bCache && i === 0 ? '' : ' ') + val;
		});
	});
	// Write
	try { utils.WriteTextFile(console.File, log, false); } catch (e) {/* continue regardless of error */ } // eslint-disable-line no-unused-vars
}

console.formatArg = (arg) => {
	const clean = (v) => v.replace(/\\"|[[\]{}]\n/g, '').replace(/\\\\/g, '\\');
	const type = typeof arg;
	switch (type) {
		case 'undefined': return 'undefined';
		case 'number': return arg.toString().replace(/(-)?INFINITY/gi, '$1\u221E');
		case 'function':
		case 'boolean':
		case 'string': return clean(arg.toString());
		case 'object':
		default: {
			let val = arg;
			if (val !== null) {
				let instance = null;
				switch (true) {	// Get object types
					case Array.isArray(arg): { instance = { name: 'Array', type: 'array' }; break; }
					case arg instanceof Set: { instance = { name: 'Set', type: 'array' }; break; }
					case arg instanceof Map: { instance = { name: 'Map', type: 'array' }; break; }
					case arg instanceof WeakMap: { instance = { name: 'WeakMap', type: 'array' }; break; }
					case arg instanceof WeakSet: { instance = { name: 'WeakSet', type: 'array' }; break; }
					case arg instanceof Error: { instance = { name: 'Error', type: 'error' }; break; }
					case Object.prototype.toString.call(arg) === '[object Promise]': { instance = { name: 'Promise', type: 'promise' }; break; }
					case arg.constructor && arg.constructor.name === 'ReverseIterableMap': { instance = { name: 'Reverse Iterable Map', type: 'array' }; break; }
				}
				if (instance) {  // Convert to array objects if possible and stringify
					switch (instance.type) {
						case 'array': { val = [...arg]; break; }
						case 'error': { val = arg.toString(); break; }
					}
				}
				try {
					val = (instance ? instance.name + ' ' : 'Object ') + clean(JSON.stringify(val || arg, (k, v) => {
						if (typeof v !== 'undefined' && v !== null) {
							if ('FileSize' in v && 'Length' in v && 'Path' in v && 'RawPath' in v && 'SubSong' in v) {
								return 'FbMetadbHandle ' + JSON.stringify({ FileSize: v.FileSize, Length: v.Length, Path: v.Path, RawPath: v.RawPath, SubSong: v.SubSong }, null, ' ').replace(/{\n /, '{').replace(/["\n]/g, '').replace(/\\\\/g, '\\');
							} else if (v instanceof FbMetadbHandleList) {
								return 'FbMetadbHandleList ' + JSON.stringify({ Count: v.Count }, null, ' ').replace(/{\n /, '{').replace(/["\n]/g, '');
							} else if ('Handle' in v && 'PlaylistIndex' in v && 'PlaylistItemIndex' in v) {
								return 'FbMetadbHandleList ' + JSON.stringify({ Handle: { Path: v.Handle.Path, SubSong: v.Handle.SubSong }, PlaylistIndex: v.PlaylistIndex, PlaylistItemIndex: v.PlaylistItemIndex }, null, ' ').replace(/{\n /, '{').replace(/["\n]/g, '').replace(/\\\\/g, '\\');
							} else if (typeof GdiFont !== 'undefined' && v instanceof GdiFont) {
								return 'GdiFont ' + clean(JSON.stringify({ name: v.Name, height: v.Height, size: v.Size, style: v.Style }));
							} else if (typeof D2DFont !== 'undefined' && v instanceof D2DFont) {
								return 'D2DFont ' + clean(JSON.stringify({ name: v.Name, height: v.Height, size: v.Size, style: v.Style }));
							} else if (typeof GdiBitmap !== 'undefined' && v instanceof GdiBitmap) {
								return 'GdiBitmap ' + clean(JSON.stringify({ height: v.Height, width: v.Width }));
							} else if (typeof D2DBitmap !== 'undefined' && v instanceof D2DBitmap) {
								return 'D2DBitmap ' + clean(JSON.stringify({ height: v.Height, width: v.Width }));
							} else if (typeof GdiBrush !== 'undefined' && v instanceof GdiBrush) {
								return 'GdiBrush ' + clean(JSON.stringify({ type: v.Type, wrapMode: v.WrapMode }));
							} else if (typeof D2DBrush !== 'undefined' && v instanceof D2DBrush) {
								return 'D2DBrush ' + clean(JSON.stringify({ type: v.Type, wrapMode: v.WrapMode }));
							} else if (typeof D2DCompileInfo !== 'undefined' && v instanceof D2DCompileInfo) {
								return 'D2DCompileInfo ' + clean(JSON.stringify({ code: clean(JSON.stringify(v.Code)), error: v.Error }));
							} else if (typeof D2DEffect !== 'undefined' && v instanceof D2DEffect) {
								return 'D2DEffect ' + clean(JSON.stringify({ clsid: v.CLSID, description: v.Description, inputCount: v.InputCount, name: v.Name }));
							} else if ('EraseBackground' in v && 'ShowCaption' in v) {
								return 'PanelObject ' + clean('{ ' + Object.entries(v).filter(([, sv]) => typeof sv !== 'function').map(([sk, sv]) => sk + ': ' + console.formatArg(sv)).join(', ') + ' }');
							} else if ('AppendMenuItem' in v && 'AppendMenuSeparator' in v) {
								return 'MenuObject { }';
							} else if ('CalcTextHeight' in v && 'CalcTextWidth' in v) {
								let width, height;
								try { width = v.Width; height = v.Height; } catch (e) { /* Do nothing */ } // eslint-disable-line no-unused-vars
								return (window.DrawMode === 1 ? 'D2DGraphics ' : 'GdiGraphics ') + clean(JSON.stringify({ width, height }));
							} else if ('innerHTML' in v && 'innerText' in v && 'outerHTML' in v && 'textContent' in v) {
								return 'childNodes' in v
									? 'HtmlNode ' + clean(JSON.stringify({ className: v.className, tagName: v.tagName, childNodes: v.childNodes.length, innerHTML: v.innerHTML.length, innerText: v.innerText.length, outerHTML: v.outerHTML.length, textContent: v.textContent.length }))
									: 'HtmlDocument ' + clean(JSON.stringify({ head: !!v.head, body: !!v.body, documentElement: !!v.documentElement, root: !!v.root, innerHTML: v.innerHTML.length, innerText: v.innerText.length, outerHTML: v.outerHTML.length, textContent: v.textContent.length }));
							} else if (v instanceof ActiveXObject) {
								return 'ActiveXObject ' + clean('{ ' + Object.entries(v).map(([sk, sv]) => sk + ': ' + console.formatArg(sv)).join(', ') + '}');
							} else if (Array.isArray(v)) {
								return clean(JSON.stringify(v.map((sv) => console.formatArg(sv)), null, ''));
							} else if (v instanceof Set) {
								return 'Set ' + clean(JSON.stringify([...v].map((sv) => console.formatArg(sv))));
							} else if (v instanceof Map) {
								return 'Map ' + clean(JSON.stringify([...v].map((sv) => console.formatArg(sv))));
							} else if (v instanceof WeakMap) {
								return 'WeakMap ' + clean(JSON.stringify([...v].map((sv) => console.formatArg(sv))));
							} else if (v instanceof WeakSet) {
								return 'WeakMap ' + clean(JSON.stringify([...v].map((sv) => console.formatArg(sv))));
							} else if (v instanceof Error) {
								return 'Error ' + clean(arg.toString());
							} else if (typeof v === 'function') {
								return 'Function ' + v.name || 'anonymous';
							} else if (v instanceof Uint8Array) {
								return 'Uint8Array ' + clean(JSON.stringify(v));
							} else if (typeof v === 'object') {
								return clean('{ ' + Object.entries(v).map(([sk, sv]) => sk + ': ' + console.formatArg(sv)).join(', ') + ' }');
							} else {
								return clean(console.formatArg(v));
							}
						}
						return v;
					}));
				} catch (e) {
					if (e.message === 'can\'t access dead object') {
						console.logUI('Console.log: ' + e.message + ': ', type);
					} else {
						// eslint-disable-next-line no-sparse-arrays
						try { val = arg.constructor.name || (arg.constructor.toString().match(/function (\w*)/) || [,])[1]; }
						// eslint-disable-next-line no-unused-vars
						catch (e) { /* empty */ } //NOSONAR
						if (!val) { val = '--unknown type--'; }
						console.logUI('Console.log: argument type not recognized: ', type, val);
					}
				}
			}
			return val;
		}
	}
};

// Check file size doesn't exceed threshold or reset it
console.checkSize = () => {
	if (utils.IsFile(console.File) && utils.GetFileSize(console.File) > console.MaxSize) {
		try { utils.WriteTextFile(console.File, '', false); } catch (e) {/* continue regardless of error */ } // eslint-disable-line no-unused-vars
		console.log('helpers_xxx: console log file size exceeds ' + (console.MaxSize / 1e7) + ' MB, creating new file: ' + console.File);
		return true;
	}
	return false;
};

// Force writing cache to file (usually used at on_script_unload)
console.flush = () => {
	if (console.Cache.length) { consoleLog(); }
};

// Send to popup and console
console.popup = (arg, popupName, bPopup = true, bSplit = true) => {
	if (bPopup) { fb.ShowPopupMessage(arg, popupName); }
	if (typeof arg === 'string' && bSplit) {
		arg.split(/\r\n|\n\r|\n|\r/).forEach((line) => {
			if (line && line.length) { console.log(line); }
		});
	} else {
		console.log(arg); // as is
	}
};

if (console.File && console.File.length && console.MaxSize && console.log) {
	const oldLog = console.log;
	console.logUI = function () {
		const args = Array.from(arguments, (arg) => console.formatArg(arg));
		oldLog(...args);
	};
	console.log = function () {
		if (!console.Enabled) { return; }
		console.logUI(...arguments);
		if (!console.EnabledFile) { return; }
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

console.enable = () => { console.Enabled = true; };
console.disable = () => { console.flush(); console.Enabled = false; };
console.enableFile = () => { console.EnabledFile = true; };
console.disableFile = () => { console.EnabledFile = false; };

// Rewrap FbProfiler to expose Name variable
if (FbProfiler) {
	const oldProto = FbProfiler.prototype;
	const old = FbProfiler;
	FbProfiler = function (name) { // NOSONAR
		const that = old(name);
		that.Name = name;
		return that;
	};
	Object.defineProperty(FbProfiler, Symbol.hasInstance, { value(instance) { return instance instanceof old; } });
	FbProfiler.prototype = oldProto;

	fb.CreateProfiler = function CreateProfiler(name) {
		return new FbProfiler(name);
	};
}

// Rewrap FbProfiler to also log to file
if (FbProfiler.prototype.Print) {
	FbProfiler.prototype.PrintUI = FbProfiler.prototype.Print;
	FbProfiler.prototype.Print = function (additionalMsgOpt = '', printComponentInfoOpt = true) {
		// Recreate the message format
		let message = '';
		if (printComponentInfoOpt) { message += (fb.ComponentPath.includes('foo_uie_jsplitter') ? 'JSplitter' : 'Spider Monkey Panel') + ' v' + utils.Version + ': '; }
		message += 'profiler (' + this.Name + '): ';
		if (additionalMsgOpt && additionalMsgOpt.length) { message += additionalMsgOpt + ' '; }
		message += this.Time + 'ms';
		console.log(message); // Instead of using the original method, just use the basic log routine with
	};
	console.checkSize();
}