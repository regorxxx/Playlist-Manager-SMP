'use strict';
//08/01/26

/* exported extendGR, checkCompatible */

/*
	Object
*/

// Add ES2022 method
// https://github.com/tc39/proposal-accessible-object-hasownproperty
if (!Object.hasOwn) {
	Object.defineProperty(Object, 'hasOwn', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (object, property) {
			if (object === null) {
				throw new TypeError('Cannot convert undefined or null to object');
			}
			return Object.prototype.hasOwnProperty.call(Object(object), property); // NOSONAR
		}
	});
}

/*
	RegExp
*/

// Add unofficial method for JSsplitter
// https://reference.codeproject.com/javascript/Reference/Global_Objects/Regexp/toSource
if (!RegExp.prototype.toSource) {
	Object.defineProperty(RegExp.prototype, 'toSource', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function () {
			return '/' + this.source + '/' + this.flags; // NOSONAR
		}
	});
}

/*
	FbTitleFormat
*/
// Add async calculation
FbTitleFormat.prototype.EvalWithMetadbsAsync = function EvalWithMetadbsAsync(handleList, slice = 1000, bLog = false) {
	const size = handleList.Count;
	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async (resolve) => { // NOSONAR
		const items = handleList.Convert();
		const count = items.length;
		const total = Math.ceil(size / slice);
		const tags = [];
		let prevProgress = -1;
		for (let i = 1; i <= total; i++) {
			await new Promise((resolve) => {
				setTimeout(() => {
					const iItems = new FbMetadbHandleList(items.slice((i - 1) * slice, i === total ? count : i * slice));
					tags.push(...this.EvalWithMetadbs(iItems));
					const progress = Math.round(i / total * 100);
					if (progress % 25 === 0 && progress > prevProgress) {
						prevProgress = progress;
						if (bLog) { console.log('EvalWithMetadbsAsync (' + this.Expression + ') ' + progress + '%.'); }
					}
					resolve('done');
				}, 25);
			});
		}
		resolve(tags);
	});
};

// Add caching
Object.defineProperty(fb, 'tfCache', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: {}
});

// Augment fb.TitleFormat() with 'Expression' property and add caching
{
	const old = fb.TitleFormat;
	fb.TitleFormat = function TitleFormat() {
		const bCache = Object.hasOwn(fb.tfCache, arguments[0]);
		const that = bCache ? fb.tfCache[arguments[0]] : old.apply(fb, [...arguments]);
		that.Expression = arguments[0];
		if (!bCache) { fb.tfCache[arguments[0]] = that; }
		return that;
	};
}

// Augment FbTitleFormat() constructor with 'Expression' property and add caching
{
	const oldProto = FbProfiler.prototype;
	const old = FbTitleFormat;
	FbTitleFormat = function FbTitleFormat() { // NOSONAR
		const bCache = Object.hasOwn(fb.tfCache, arguments[0]);
		const that = bCache ? fb.tfCache[arguments[0]] : old(...arguments);
		that.Expression = arguments[0];
		if (!bCache) { fb.tfCache[arguments[0]] = that; }
		return that;
	};
	Object.defineProperty(FbTitleFormat, Symbol.hasInstance, { value(instance) { return instance instanceof old; } });
	FbTitleFormat.prototype = oldProto;
}

/*
	gr
*/
// Augment gr.DrawRoundRect() with error handling
function extendGR(/** @type {GdiGraphics} */ gr, options = { DrawRoundRect: true, FillRoundRect: true, Repaint: true, Highlight: false, ImgBox: true, Debug: false }) {
	if (!gr.Extended) { gr.Extended = options; }
	else { Object.keys(options).forEach((opt) => { if (options[opt]) { gr.Extended[opt] = true; } }); }
	if (!gr.ExtendedDone) { gr.ExtendedDone = {}; }
	if (options.DrawRoundRect && !gr.ExtendedDone.DrawRoundRect) {
		const old = gr.DrawRoundRect.bind(gr);
		gr.DrawRoundRect = function DrawRoundRect() { // x, y, w, h, arc_width, arc_height, line_width, colour
			let that;
			try {
				that = old(...arguments);
			} catch (e) {
				let bRetry = true;
				const newArgs = [...arguments];
				newArgs[4] = newArgs[3] / 2 - Number.EPSILON;
				newArgs[5] = newArgs[5] / 2 - Number.EPSILON;
				try {
					that = old(...arguments);
				} catch (e) { // eslint-disable-line no-unused-vars
					bRetry = false;
					gr.DrawRect(newArgs[0], newArgs[1], newArgs[2], newArgs[3], newArgs[6], newArgs[7]);
				}
				if (typeof doOnce !== 'undefined' && options.Debug) {
					doOnce('Paint bug', fb.ShowPopupMessage.bind(fb))( // eslint-disable-line no-undef
						'SMP bug drawing: DrawRoundRect\n' +
						e.message + '\n\n' +
						'x, y, w, h, arc: ' + [...arguments].join(', ') + '\n' +
						(
							bRetry
								? 'Bypassed on second retry: ' + '\n' + 'x, y, w, h, arc: ' + [...newArgs].join(', ')
								: ''
						)
						, window.Name
					);
				}
			}
			return that;
		};
		gr.ExtendedDone.DrawRoundRect = true;
	}
	if (options.FillRoundRect && !gr.ExtendedDone.FillRoundRect) {
		const old = gr.FillRoundRect.bind(gr);
		gr.FillRoundRect = function FillRoundRect() { // x, y, w, h, arc_width, arc_height, colour
			let that;
			try {
				that = old(...arguments);
			} catch (e) {
				let bRetry = true;
				const newArgs = [...arguments];
				newArgs[4] = newArgs[3] / 2 - Number.EPSILON;
				newArgs[5] = newArgs[5] / 2 - Number.EPSILON;
				try {
					that = old(...arguments);
				} catch (e) { // eslint-disable-line no-unused-vars
					bRetry = false;
					gr.FillSolidRect(newArgs[0], newArgs[1], newArgs[2], newArgs[3], newArgs[6]);
				}
				if (typeof doOnce !== 'undefined' && options.Debug) {
					doOnce('Paint bug', fb.ShowPopupMessage.bind(fb))( // eslint-disable-line no-undef
						'SMP bug drawing: FillRoundRect\n' +
						e.message + '\n\n' +
						'x, y, w, h, arc: ' + [...arguments].join(', ') + '\n' +
						(
							bRetry
								? 'Bypassed on second retry: ' + '\n' + 'x, y, w, h, arc: ' + [...newArgs].join(', ')
								: ''
						)
						, window.Name
					);
				}
			}
			return that;
		};
		gr.ExtendedDone.FillRoundRect = true;
	}
	if (options.ImgBox && !gr.ExtendedDone.ImgBox) {
		const old = gr.DrawImage.bind(gr);
		gr.DrawImage = function DrawImage() { // img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, angleOpt, alphaOp
			const that = old(...arguments);
			gr.DrawRect(arguments[1], arguments[2], arguments[3], arguments[4], 2, 1694433280); // Red 90%
			return that;
		};
		gr.ExtendedDone.ImgBox = true;
	}
	if (options.Highlight && !gr.ExtendedDone.Highlight) {
		const size = Math.min(window.Height, window.Width) / 10;
		gr.FillSolidRect(size, 0, window.Width, size, 1694433280);
		gr.FillSolidRect(0, 0, size, window.Height - size, 1694433280);
		gr.FillSolidRect(window.Width - size, size, window.Width - size, window.Height, 1694433280);
		gr.FillSolidRect(0, window.Height - size, window.Width - size, window.Height, 1694433280);
		setTimeout(() => window.Repaint(true), 250);
		gr.ExtendedDone.Highlight = true;
	}
	if (options.Repaint && !window.debugPainting && !gr.ExtendedDone.Repaint) {
		window.debugPainting = true;
		const old = window.RepaintRect.bind(window);
		window.RepaintRect = (function () {
			if (this.debugPainting) {
				this.debugPaintingRects.push([...arguments].slice(0, 4));
				this.Repaint();
			} else {
				old(...arguments);
			}
		}).bind(window);
		gr.ExtendedDone.Repaint = true;
	}
}

/*
	FbMetadbHandleList
*/
// Sort handleList following another handleList; orderHandleList may differ in size
FbMetadbHandleList.partialSort = (handleList, orderHandleList) => { // 600 ms on 80K tracks
	let bOutputList = false;
	if (!Array.isArray(handleList)) { handleList = handleList.Convert(); bOutputList = true; }
	if (!Array.isArray(orderHandleList)) { orderHandleList = orderHandleList.Convert(); }
	const dic = new Map();
	orderHandleList.forEach((handle, i) => {
		const id = handle.RawPath + ',' + handle.SubSong;
		const prev = (dic.get(id) || []).concat([i]);
		dic.set(id, prev);
	});
	const output = new Array(handleList.length);
	handleList.forEach((handle) => {
		const id = handle.RawPath + ',' + handle.SubSong;
		const arrIdx = dic.get(id);
		const idx = arrIdx.pop();
		if (!arrIdx.length) { dic.delete(id); }
		output[idx] = handle;
	});
	return bOutputList ? new FbMetadbHandleList(output.filter(Boolean)) : output.filter(Boolean);
};

/*
	fb
*/
// Add caching
Object.defineProperty(fb, 'queryCache', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: new Map()
});

Object.defineProperty(fb, 'queryCacheUsed', {
	enumerable: true,
	configurable: false,
	writable: true,
	value: false
});

fb.GetQueryItemsCheck = (handleList = fb.GetLibraryItems(), query = 'ALL', bCache = false) => {
	let outputHandleList;
	const id = handleList.Count + ' - ' + query;
	fb.queryCacheUsed = bCache = bCache && fb.queryCache.has(id); // eslint-disable-line no-prototype-builtins
	if (bCache) {
		outputHandleList = fb.queryCache.get(id);
	} else {
		try { outputHandleList = fb.GetQueryItems(handleList, query); } catch (e) { outputHandleList = null; } // eslint-disable-line no-unused-vars
		fb.queryCache.set(id, outputHandleList);
	}
	return outputHandleList;
};

/*
	plman
*/

plman.AddPlaylistItemsOrLocations = (plsIdx, items /*[handle, handleList, filePath, ...]*/, bSync = false) => {
	if (items.length === 0) { return bSync ? Promise.resolve(false) : false; }
	if (plsIdx === -1) { return bSync ? Promise.resolve(false) : false; }
	let lastType = typeof items[0].RawPath !== 'undefined'
		? 'handle'
		: typeof items[0].Count !== 'undefined'
			? 'handleList'
			: 'path';
	let queue = lastType === 'path' ? [] : new FbMetadbHandleList();
	const timer = (item, type) => {
		if (!bSync) { return 0; }
		else if (type === 'path') {
			if (item.endsWith('.xspf')) {
				try {
					const text = utils.ReadTextFile(item);
					return (text.match(/<track>/gi) || [void (0)]).length * 50;
				} catch { return 1000; }
			}
			else if (item.endsWith('.fpl')) { return 1000; }
			else if (item.startsWith('www.') || item.startsWith('http')) { return 500; }
		}
		return 50;
	};
	const sendQueue = (item, lastType, type) => {
		switch (lastType) {
			case 'path': {
				plman.AddLocations(plsIdx, queue);
				queue = new FbMetadbHandleList();
				return bSync ? Promise.wait(timer(item, type)) : true;
			}
			case 'handle':
			case 'handleList': {
				plman.InsertPlaylistItems(plsIdx, plman.PlaylistItemCount(plsIdx), queue);
				queue = [];
				return bSync ? Promise.resolve() : true;
			}
		}
	};
	const addToQueue = (item, type) => {
		switch (type) {
			case 'path': { queue.push(item); break; }
			case 'handle': { queue.Insert(queue.Count, item); break; }
			case 'handleList': { queue.InsertRange(queue.Count, item); break; }
		}
	};
	const processItem = (item) => {
		const type = typeof item.RawPath !== 'undefined'
			? 'handle'
			: typeof item.Count !== 'undefined'
				? 'handleList'
				: 'path';
		// Send queue
		if (bSync) {
			if (type !== lastType) { // Avoid crash if first item is a handle
				return sendQueue(item, lastType, type).then(() => {
					lastType = type;
					addToQueue(item, type);
				});
			}
			addToQueue(item, type);
			return Promise.resolve();
		} else {
			if (type !== lastType) {
				sendQueue(item, lastType, type);
				lastType = type;
			}
			addToQueue(item, type);
			return true;
		}
	};
	// Add items to playlist
	if (bSync) {
		return Promise.serial([...items], processItem).then(() => {
			// Add last items
			if (lastType === 'path') {
				plman.AddLocations(plsIdx, queue);
				return Promise.wait(
					queue.reduce((prev, curr) => prev + timer(curr, lastType), 50) +
					(queue.some((item) => item.startsWith('www.') || item.startsWith('http')) ? 1000 : 0)
				);
			} else {
				plman.InsertPlaylistItems(plsIdx, plman.PlaylistItemCount(plsIdx), queue);
				return true;
			}
		}).then(() => {
			return true;
		});
	} else {
		items.forEach(processItem);
		// Add last items
		if (lastType === 'path') { plman.AddLocations(plsIdx, queue); }
		else { plman.InsertPlaylistItems(plsIdx, plman.PlaylistItemCount(plsIdx), queue); }
		return true;
	}
};

if (!plman.GetGUID || !compareVersions(fb.Version, '2.0.0')) { plman.GetGUID = () => null; }

if (!plman.FindByGUID || !compareVersions(fb.Version, '2.0.0')) { plman.FindByGUID = () => -1; }

/*
	Paint
*/

// Add caching
Object.defineProperty(window, 'debugPainting', {
	enumerable: true,
	configurable: false,
	writable: true,
	value: false
});
Object.defineProperty(window, 'debugPaintingRects', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: []
});
Object.defineProperty(window, 'drawDebugRectAreas', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: (function drawDebugRectAreas(gr, px = 2, color = 1694433280) { // Red 90%
		if (!this.debugPaintingRects.length) { return; }
		try {
			this.debugPaintingRects.forEach((coords) => gr.DrawRect(...coords, px, color));
			this.debugPaintingRects.length = 0;
		} catch (e) { /* Continue */ } // eslint-disable-line no-unused-vars
	}).bind(window)
});

// Augment FbProfiler() constructor
if (FbProfiler) {
	const oldProto = FbProfiler.prototype;
	const old = FbProfiler;
	FbProfiler = function FbProfiler() { // NOSONAR
		const that = old(...arguments);
		Object.defineProperty(that, 'CheckPoints', {
			enumerable: true,
			configurable: false,
			writable: false,
			value: []
		});
		that.CheckPoint = (function CheckPoint(name) {
			let point = this.CheckPoints.find((check) => check.name.toLowerCase() === name.toLowerCase());
			if (point) {
				point.time = this.Time;
			} else {
				point = { name, time: this.Time, acc: 0 };
				this.CheckPoints.push(point);
			}
			return point;
		}).bind(that);
		that.CheckPointStep = (function CheckPointStep(name) {
			const point = this.CheckPoints.find((check) => check.name.toLowerCase() === name.toLowerCase());
			if (point) {
				const now = this.Time;
				point.acc += now - point.time;
				point.time = now;
			}
			return point ? point.acc : null;
		}).bind(that);
		that.ElapsedTimeSince = (function ElapsedTimeSince(name) {
			const point = this.CheckPoints.find((check) => check.name.toLowerCase() === name.toLowerCase());
			return (point ? this.Time - point.time : null);
		}).bind(that);
		that.CheckPointPrint = (function CheckPointStep(name, message) {
			const point = this.CheckPoints.find((check) => check.name.toLowerCase() === name.toLowerCase());
			if (point) { console.log('profiler (' + this.Name + '): ' + name + ' ' + point.acc + ' ms' + (message || '')); return true; }
			return null;
		}).bind(that);
		return that;
	};
	Object.defineProperty(FbProfiler, Symbol.hasInstance, { value(instance) { return instance instanceof old; } });
	FbProfiler.prototype = oldProto;

	fb.CreateProfiler = function CreateProfiler(name) {
		return new FbProfiler(name);
	};
}

if (fb.AddLocationsAsync) {
	fb.AddLocationsAsyncV2 = function AddLocationsAsyncV2(locations) {
		return new Promise((resolve) => {
			const id = fb.AddLocationsAsync([locations]);
			if (typeof addEventListener !== 'undefined' && typeof removeEventListenerSelf !== 'undefined') {
				/* global removeEventListenerSelf:readable */
				const listener = addEventListener('on_locations_added', (taskId, handleList) => {
					if (taskId === id) {
						removeEventListenerSelf();
						resolve(handleList);
					}
				});
				setTimeout(() => removeEventListener(listener.event, void (0), listener.id), 60000);
			} else {
				throw new Error('callbacks_xxx.js is missing');
			}
		});
	};
}

/* Global */

if (!window.Parent) {
	Object.defineProperty(window, 'Parent', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: fb.ComponentPath.includes('foo_uie_jsplitter')
			? 'foo_uie_jsplitter'
			: 'foo_spider_monkey_panel'
	});
}

if (!window.PanelName) {
	Object.defineProperty(window, 'PanelName', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: /{.{8}-.{4}-.{4}-.{4}-.{12}}/.test(window.Name)
			? window.ScriptInfo.Name
			: window.Name
	});
}

if (!window.FullPanelName) {
	Object.defineProperty(window, 'FullPanelName', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: window.Name + ' (' + window.ScriptInfo.Name + ')'
	});
}

/* SMP bugs */

if (!window.Bugs) { window.Bugs = {}; }

window.Bugs.SetPlaylistLockedActions = ![
	{ version: '1.6.2.25.10.29', target: 'smp' },
	{ version: '3.6.1.2', target: 'jsplitter' }
].some((host) => isCompatible(host.version, host.target));

/* Helpers */

function compareVersions(from, to) {
	if (typeof from === 'string') { from = from.split('.'); }
	if (typeof to === 'string') { to = to.split('.'); }
	const collator = typeof strNumCollator !== 'undefined'
		? strNumCollator // eslint-disable-line no-undef
		: new Intl.Collator(void (0), { sensitivity: 'base', numeric: true });
	for (let i = 0; i < to.length; ++i) {
		if (to[i] !== from[i]) {
			return typeof from[i] === 'undefined'
				? false
				: collator.compare(to[i], from[i]) < 0;
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
	if (!isCompatible(requiredVersionStr, target)) {
		const isJsHost = target === 'smp' || target === 'jsplitter';
		console.popup('This script requires v' + requiredVersionStr + '. Current ' + (isJsHost ? 'component' : 'Foobar2000') + ' version is v' + (isJsHost ? utils : fb).Version + '.', window.Name + ' (' + window.ScriptInfo.Name + ')');
	}
}