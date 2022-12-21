'use strict';
//21/12/22

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