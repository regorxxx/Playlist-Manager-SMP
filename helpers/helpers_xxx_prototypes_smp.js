'use strict';
//07/06/23

/* 
	FbTitleFormat
*/
// Add async calculation
FbTitleFormat.prototype.EvalWithMetadbsAsync = function EvalWithMetadbsAsync(handleList, slice = 1000) {
	const size = handleList.Count;
	return new Promise(async (resolve) => {
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
					if (progress % 25 === 0 && progress > prevProgress) {prevProgress = progress; console.log('EvalWithMetadbsAsync ' + _p(this.Expression) + ' ' + progress + '%.');}
					resolve('done');
				}, 25);
			});
		}
		resolve(tags);
	});
}

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
		const bCache = fb.tfCache.hasOwnProperty(arguments[0]);
		const that = bCache ? fb.tfCache[arguments[0]] : old.apply(fb, [...arguments]);
		that.Expression = arguments[0];
		if (!bCache) {fb.tfCache[arguments[0]] = that;}
		return that;
	}
}

// Augment FbTitleFormat() constructor with 'Expression' property and add caching
{
	const old = FbTitleFormat;
	FbTitleFormat = function FbTitleFormat() {
		const bCache = fb.tfCache.hasOwnProperty(arguments[0]);
		const that = bCache ? fb.tfCache[arguments[0]] : old(...arguments);
		that.Expression = arguments[0];
		if (!bCache) {fb.tfCache[arguments[0]] = that;}
		return that;
	}
}

/* 
	FbMetadbHandleList
*/
// Sort handleList following another handleList; orderHandleList may differ in size
FbMetadbHandleList.partialSort = (handleList, orderHandleList) => { // 600 ms on 80K tracks
	let bOutputList = false;
	if (!Array.isArray(handleList)) {handleList = handleList.Convert(); bOutputList = true;}
	if (!Array.isArray(orderHandleList)) {orderHandleList = orderHandleList.Convert();}
	const dic = new Map();
	orderHandleList.forEach((handle, i) => {
		const id = handle.RawPath + ',' + handle.SubSong;
		const prev = (dic.get(id) || []).concat([i]);
		dic.set(id, prev);
	});
	const count = handleList.length;
	const output = new Array(handleList.length);
	handleList.forEach((handle, i) => {
		const id = handle.RawPath + ',' + handle.SubSong;
		const arrIdx = dic.get(id);
		let idx = i;
		idx = arrIdx.pop();
		if (!arrIdx.length) {dic.delete(id);}
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
	value: {}
});

fb.GetQueryItemsCheck = (handleList = fb.GetLibraryItems(), query, bCache = false) => {
	let outputHandleList;
	const id = handleList.Count + ' - ' + query;
	bCache = bCache && fb.queryCache.hasOwnProperty(id);
	if (bCache) {
		outputHandleList = fb.queryCache[id];
	} else {
		try {outputHandleList = fb.GetQueryItems(handleList, query);} catch (e) {outputHandleList = null}
		fb.queryCache[id] = outputHandleList;
	}
	return outputHandleList;
}

/* 
	plman
*/

plman.AddPlaylistItemsOrLocations = (plsIdx, items /*[handle, handleList, filePath, ...]*/, bSync = false) => {
	if (items.length === 0) {return bSync ? Promise.resolve(false) : false;}
	if (plsIdx === -1) {return  bSync ? Promise.resolve(false) : false;}
	let lastType = typeof items[0].RawPath !== 'undefined' ? 'handle' : typeof items[0].Count !== 'undefined' ? 'handleList' : 'path';
	let queue = lastType === 'path' ? [] : new FbMetadbHandleList();
	const timer = bSync ? 25 : null;
	const sendQueue = (item, type) => {
		switch (type) {
			case 'path': {
				plman.AddLocations(plsIdx, queue);
				queue = new FbMetadbHandleList();
				return bSync ? Promise.wait(timer) : true;
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
			case 'path': {queue.push(item); break;}
			case 'handle': {queue.Insert(queue.Count, item); break;}
			case 'handleList': {queue.InsertRange(queue.Count, item); break;}
		}
	};
	const processItem = (item) => {
		let type = typeof item.RawPath !== 'undefined'
			? 'handle' 
			: typeof item.Count !== 'undefined'
				? 'handleList'
				: 'path';
		// Send queue
		if (bSync) {
			if (type !== lastType) { // Avoid crash if first item is a handle
				return sendQueue(item, lastType).then(() => {
					lastType = type;
					addToQueue(item, type);
				});
			}
			addToQueue(item, type);
			return Promise.resolve();
		} else {
			if (type !== lastType) {
				sendQueue(item, lastType); 
				lastType = type;
			}
			addToQueue(item, type);
			return true;
		}
	}
	// Add items to playlist
	if (bSync) {
		return Promise.serial([...items], processItem).then(() => {
			// Add last items
			if (lastType === 'path') {
				plman.AddLocations(plsIdx, queue);
				return Promise.wait(timer);
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
		if (lastType === 'path') {plman.AddLocations(plsIdx, queue);}
		else {plman.InsertPlaylistItems(plsIdx, plman.PlaylistItemCount(plsIdx), queue);}
		return true;
	}
};