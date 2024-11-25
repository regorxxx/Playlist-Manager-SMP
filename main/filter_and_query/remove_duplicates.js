'use strict';
//25/11/24

/*
	Remove duplicates
	Remove tracks with same tags (also duplicated files) from active playlist.
	if 'handleList = null' then it will work directly on current active playlist.
	If 'sortOutput = ""', then final order will be randomized. It follows 'plman.SortByFormat' conventions.
	Any 'sort...' variable follows titleformat conventions
		i.e. "%TITLE%|%ALBUM ARTIST%|%DATE%"
	Any 'check...' variable can follow both tag name or titleformat conventions (functions too)
		i.e. 'TITLE' or '%TITLE%'
	You can add multiple entries to the same variable but then it must follow titleformat conventions.
		i.e. 'checkKeys = [%TITLE% - %ARTIST%]'
	The multiple 'check...' variables are joined using ' - '

	CAVEAT:
		Note you can use these functions to filter lists! i.e. if you only check by artist/date,
		then any track with same artist/date is considered duplicated.
		That means this could be used both to find duplicates or for custom post-playlist
		creation filtering (1 track per artist, 1 track per date, etc.)
	Tip:
		Add musicBraiz track ID and album as default: solves same track with different dates...
*/

/* exported filterDuplicates, removeDuplicates, removeDuplicatesAsync, showDuplicates */

include('..\\..\\helpers\\helpers_xxx.js');
/* global isFoobarV2:readable, globTags:readable, globRegExp:readable */
include('..\\..\\helpers\\helpers_xxx_prototypes_smp.js');
/* global _p:readable, _t:readable, cartesian:readable */
if (isFoobarV2) { include('..\\..\\helpers\\helpers_xxx_tags_cache.js'); }
/* global tagsCache:readable */

/**
 * Filters duplicates on a handlelist, allowing only n+1 copies of a track identified by an array of keys
 *
 * @function
 * @name filterDuplicates
 * @kind function
 * @param {object} [o] - arguments
 * @param {FbMetadbHandleList?} o.handleList - [=null] Input handle List, null will use the active playlist
 * @param {string?} o.sortOutput - Output sorting. Omitting this will sort list by checkKeys unless bPreserveSort is used.
 * @param {string[]} o.checkKeys - Tag checking for duplicates. i.e. ['DATE', 'ARTIST', 'TITLE']
 * @param {string?} o.sortBias - Bias to chose the output track when there are duplicates. Recommended globQuery.remDuplBias
 * @param {number} o.nAllowed - Number of duplicates is always nAllowed + 1, since it allows n duplicates and the 'main' copy.
 * @param {boolean} o.bPreserveSort - Set to true to force original sorting at output
 * @param {boolean} o.bAdvTitle - Parse titles with RegExp to find duplicates (defined at globRegExp)
 * @param {boolean} o.bMultiple - Parse multi-value tags separately (by ', '), requiring a single match
 * @param {boolean} o.bProfile - Log profiling
 * @returns {FbMetadbHandleList?}
 */
function filterDuplicates({ handleList = null, sortOutput = null, checkKeys = globTags.remDupl, sortBias = null /* globQuery.remDuplBias */, nAllowed = 0, bPreserveSort = (sortOutput === null && sortBias && sortBias.length), bAdvTitle = false, bMultiple = false, bProfile = false } = {}) {
	// Check input
	if (checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('filterDuplicates: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return handleList;
	} else {
		let i = checkKeys.length;
		while (i--) {
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('filterDuplicates: checkKeys [' + checkKeys + '] some keys are not String objects');
				return handleList;
			}
		}
	}
	if (bPreserveSort && (sortOutput !== null || !sortBias || !sortBias.length)) { bPreserveSort = false; }
	const test = bProfile ? new FbProfiler('filterDuplicates') : null;
	let copyHandleList, copyHandleListUnsorted;

	// Only use RegExp title matching when the tags contain title!
	const titleRe = /title/i;
	bAdvTitle = checkKeys.some((key) => RegExp(titleRe).exec(key)) && bAdvTitle;

	// Active playlist or input list
	let bActivePlaylist = false;
	if (handleList === null) {
		if (plman.ActivePlaylist === -1) { console.log('filterDuplicates: No active playlist'); return null; }
		bActivePlaylist = true;
		copyHandleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	} else {
		copyHandleList = handleList.Clone();
	}
	let items = [];

	const sep = '|‎|'; // Contains U+200E invisible char
	let sortInput; // Sorting
	let checklength = checkKeys.length;
	let i = 0;
	while (i < checklength) {
		const key = _t(checkKeys[i]);
		if (i === 0) { sortInput = key; }
		else { sortInput += sep + key; }
		i++;
	}
	if (sortBias && sortBias.length) { // In case of duplicates, prefer high rating non-live tracks
		if (bPreserveSort) { copyHandleListUnsorted = copyHandleList.Convert(); }
		const biasTF = fb.TitleFormat(sortBias);
		copyHandleList.OrderByFormat(biasTF, -1); // 600 ms on 80K tracks
	}
	let tfo = fb.TitleFormat(sortInput);
	const tfoCopy = tfo.EvalWithMetadbs(copyHandleList);
	copyHandleList = copyHandleList.Convert();

	i = 0;
	const count = tfoCopy.length;
	const countMap = new Map([]);
	if (bMultiple) {
		const toSplitKeys = checkKeys.map((key) => !RegExp(globRegExp.singleTags.re).exec(key));
		if (bAdvTitle) {
			const titleRe = globRegExp.title.re;
			const titleReV2 = globRegExp.ingAposVerbs.re;
			const titleReV3 = globRegExp.ingVerbs.re;
			while (i < count) {
				const strArr = tfoCopy[i].split(sep).map((str, j) => {
					return toSplitKeys[j]
						? str.split(', ')
						: [str.replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g').trim()];
				});
				const combs = cartesian(...strArr);
				let bAdd = true;
				for (const str of combs) {
					const id = str.join(sep);
					const found = countMap.get(id);
					if (found) {
						if (found.val <= nAllowed) {
							found.val++;
						} else { bAdd = false; }
					} else {
						countMap.set(id, { val: 1 });
					}
				}
				if (bAdd) { items.push(copyHandleList[i]); }
				i++;
			}
		} else {
			while (i < count) {
				const strArr = tfoCopy[i].split(sep).map((str, j) => {
					return toSplitKeys[j]
						? str.split(', ')
						: [str];
				});
				const combs = cartesian(...strArr);
				let bAdd = true;
				for (const str of combs) {
					const id = str.join(sep);
					const found = countMap.get(id);
					if (found) {
						if (found.val <= nAllowed) {
							found.val++;
						} else { bAdd = false; }
					} else {
						countMap.set(id, { val: 1 });
					}
				}
				if (bAdd) { items.push(copyHandleList[i]); }
				i++;
			}
		}
	} else {
		if (bAdvTitle) { // NOSONAR
			const titleRe = globRegExp.title.re;
			const titleReV2 = globRegExp.ingAposVerbs.re;
			const titleReV3 = globRegExp.ingVerbs.re;
			while (i < count) {
				const str = tfoCopy[i]
					.replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g')
					.trim();
				const found = countMap.get(str);
				if (found) {
					if (found.val <= nAllowed) {
						found.val++;
						items.push(copyHandleList[i]);
					}
				} else {
					countMap.set(str, { val: 1 });
					items.push(copyHandleList[i]);
				}
				i++;
			}
		} else {
			while (i < count) {
				const str = tfoCopy[i];
				const found = countMap.get(str);
				if (found) {
					if (found.val <= nAllowed) {
						found.val++;
						items.push(copyHandleList[i]);
					}
				} else {
					countMap.set(str, { val: 1 });
					items.push(copyHandleList[i]);
				}
				i++;
			}
		}
	}

	if (bPreserveSort) { // 600 ms on 80K tracks
		items = FbMetadbHandleList.partialSort(items, copyHandleListUnsorted);
	}
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list

	if (sortOutput !== null) { // Output Sorting?
		if (sortOutput.length && sortOutput !== sortInput) { tfo = fb.TitleFormat(sortOutput); }
		else { tfo = fb.TitleFormat('$rand()'); }
		items.OrderByFormat(tfo, 1);
	}

	if (bActivePlaylist) {
		let removedCount = count - items.Count;
		if (removedCount) { // Send to active playlist if there was no input list and changes were made
			plman.UndoBackup(plman.ActivePlaylist);
			plman.ClearPlaylist(plman.ActivePlaylist);
			plman.InsertPlaylistItems(plman.ActivePlaylist, 0, items);
			console.log('Removed ' + removedCount + ' duplicates from active playlist by: ' + sortInput + (bAdvTitle ? '\t' + _p('Title RegExp') : ''));
		} else {
			console.log('No duplicates found by: ' + sortInput);
		}
	}
	if (bProfile) { test.Print(nAllowed ? 'Task #1: Filter playlist' : 'Task #1: Remove duplicates', false); }
	return items;
}

/**
 * Removes all duplicates on a handlelist, tracks identified by an array of keys. Faster than filterDuplicates
 *
 * @function
 * @name removeDuplicates
 * @kind function
 * @param {object} [o] - arguments
 * @param {FbMetadbHandleList?} o.handleList - [=null] Input handle List, null will use the active playlist
 * @param {string?} o.sortOutput - Output sorting. Omitting this will sort list by checkKeys unless bPreserveSort is used.
 * @param {string[]} o.checkKeys - Tag checking for duplicates. i.e. ['DATE', 'ARTIST', 'TITLE']
 * @param {string?} o.sortBias - Bias to chose the output track when there are duplicates. Recommended globQuery.remDuplBias
 * @param {boolean} o.bPreserveSort - Set to true to force original sorting at output
 * @param {boolean} o.bAdvTitle - Parse titles with RegExp to find duplicates (defined at globRegExp)
 * @param {boolean} o.bMultiple - Parse multi-value tags separately (by ', '), requiring a single match
 * @param {boolean} o.bProfile - Log profiling
 * @returns {FbMetadbHandleList?}
 */
function removeDuplicates({ handleList = null, sortOutput = null, checkKeys = globTags.remDupl, sortBias = null /* globQuery.remDuplBias */, bPreserveSort = (sortOutput === null && sortBias && sortBias.length), bAdvTitle = false, bMultiple = false, bProfile = false } = {}) {
	// Check input
	if (checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('removeDuplicates: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return handleList;
	} else {
		let i = checkKeys.length;
		while (i--) {
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('removeDuplicates: checkKeys [' + checkKeys + '] some keys are not String objects');
				return handleList;
			}
		}
	}
	if (bPreserveSort && (sortOutput !== null || !sortBias || !sortBias.length)) { bPreserveSort = false; }
	const test = bProfile ? new FbProfiler('removeDuplicates') : null;
	let copyHandleList, copyHandleListUnsorted;

	// Only use RegExp title matching when the tags contain title!
	const titleRe = /title/i;
	bAdvTitle = checkKeys.some((key) => RegExp(titleRe).exec(key)) && bAdvTitle;

	// Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
		if (plman.ActivePlaylist === -1) { console.log('removeDuplicates: No active playlist'); return null; }
		bActivePlaylist = true;
		copyHandleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	} else {
		copyHandleList = handleList.Clone();
	}
	let items = [];

	const sep = '|‎|'; // Contains U+200E invisible char
	let sortInput; // Sorting
	let checkLength = checkKeys.length;
	let i = 0;
	while (i < checkLength) {
		const key = _t(checkKeys[i]);
		if (i === 0) { sortInput = key; }
		else { sortInput += sep + key; }
		i++;
	}
	if (sortBias && sortBias.length) { // In case of duplicates, prefer high rating non-live tracks
		if (bPreserveSort) { copyHandleListUnsorted = copyHandleList.Convert(); }
		const biasTF = fb.TitleFormat(sortBias);
		copyHandleList.OrderByFormat(biasTF, -1); // 600 ms on 80K tracks
	}
	let tfo = fb.TitleFormat(sortInput);
	const tfoCopy = tfo.EvalWithMetadbs(copyHandleList);
	copyHandleList = copyHandleList.Convert();

	i = 0;
	const set = new Set();
	const count = tfoCopy.length;
	if (bMultiple) {
		const toSplitKeys = checkKeys.map((key) => !RegExp(globRegExp.singleTags.re).exec(key));
		if (bAdvTitle) {
			const titleRe = globRegExp.title.re;
			const titleReV2 = globRegExp.ingAposVerbs.re;
			const titleReV3 = globRegExp.ingVerbs.re;
			while (i < count) {
				const strArr = tfoCopy[i].split(sep).map((str, j) => {
					return toSplitKeys[j]
						? str.split(', ')
						: [str.replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g').trim()];
				});
				const combs = cartesian(...strArr);
				let bAdd = false;
				for (const str of combs) {
					const id = str.join(sep);
					if (!set.has(id)) {
						set.add(id);
						bAdd = true;
					}
				}
				if (bAdd) { items.push(copyHandleList[i]); }
				i++;
			}
		} else {
			while (i < count) {
				const strArr = tfoCopy[i].split(sep).map((str, j) => {
					return toSplitKeys[j]
						? str.split(', ')
						: [str];
				});
				const combs = cartesian(...strArr);
				let bAdd = false;
				for (const str of combs) {
					const id = str.join(sep);
					if (!set.has(id)) {
						set.add(id);
						bAdd = true;
					}
				}
				if (bAdd) { items.push(copyHandleList[i]); }
				i++;
			}
		}
	} else {
		if (bAdvTitle) { // NOSONAR
			const titleRe = globRegExp.title.re;
			const titleReV2 = globRegExp.ingAposVerbs.re;
			const titleReV3 = globRegExp.ingVerbs.re;
			while (i < count) {
				const str = tfoCopy[i]
					.replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g')
					.trim();
				if (!set.has(str)) {
					set.add(str);
					items.push(copyHandleList[i]);
				}
				i++;
			}
		} else {
			while (i < count) {
				const str = tfoCopy[i];
				if (!set.has(str)) {
					set.add(str);
					items.push(copyHandleList[i]);
				}
				i++;
			}
		}
	}

	if (bPreserveSort) { // 600 ms on 80K tracks
		items = FbMetadbHandleList.partialSort(items, copyHandleListUnsorted);
	}
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list

	if (sortOutput !== null) { // Output Sorting?
		if (sortOutput.length && sortOutput !== sortInput) { tfo = fb.TitleFormat(sortOutput); }
		else { tfo = fb.TitleFormat('$rand()'); }
		items.OrderByFormat(tfo, 1);
	}

	if (bActivePlaylist) {
		let removedCount = count - items.Count;
		if (removedCount) { // Send to active playlist if there was no input list and changes were made
			plman.UndoBackup(plman.ActivePlaylist);
			plman.ClearPlaylist(plman.ActivePlaylist);
			plman.InsertPlaylistItems(plman.ActivePlaylist, 0, items);
			console.log('Removed ' + removedCount + ' duplicates from active playlist by: ' + sortInput + (bAdvTitle ? '\t' + _p('Title RegExp') : ''));
		} else {
			console.log('No duplicates found by: ' + sortInput);
		}
	}
	if (bProfile) { test.Print('Task #1: Remove duplicates', false); }
	return items;
}

/**
 * Removes all duplicates on a handlelist, tracks identified by an array of keys. Async.
 *
 * @function
 * @name removeDuplicatesAsync
 * @kind function
 * @param {object} [o] - arguments
 * @param {FbMetadbHandleList?} o.handleList - [=null] Input handle List, null will use the active playlist
 * @param {string?} o.sortOutput - Output sorting. Omitting this will sort list by checkKeys unless bPreserveSort is used.
 * @param {string[]} o.checkKeys - Tag checking for duplicates. i.e. ['DATE', 'ARTIST', 'TITLE']
 * @param {boolean} o.bAdvTitle - Parse titles with RegExp to find duplicates (defined at globRegExp)
 * @param {boolean} o.bMultiple - Parse multi-value tags separately (by ', '), requiring a single match
 * @param {boolean} o.bTagsCache - Use tag cache file
 * @param {boolean} o.bProfile - Log profiling
 * @returns {FbMetadbHandleList?}
 */
async function removeDuplicatesAsync({ handleList = null, sortOutput = null, checkKeys = globTags.remDupl, bAdvTitle = false, bMultiple = true, bTagsCache = true, bProfile = false } = {}) {
	// Check input
	if (checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('removeDuplicatesAsync: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return Promise.resolve(handleList);
	} else {
		let i = checkKeys.length;
		while (i--) {
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('removeDuplicatesAsync: checkKeys [' + checkKeys + '] some keys are not String objects');
				return Promise.resolve(handleList);
			}
		}
	}
	const test = bProfile ? new FbProfiler('removeDuplicatesAsync') : null;

	// Only use RegExp title matching when the tags contain title!
	const titleRe = /title/i;
	bAdvTitle = checkKeys.some((key) => RegExp(titleRe).exec(key)) && bAdvTitle;

	// Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
		if (plman.ActivePlaylist === -1) {
			console.log('removeDuplicatesAsync: No active playlist');
			return Promise.resolve(null);
		}
		bActivePlaylist = true;
		handleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	}
	let items = [];
	let copy = handleList.Clone();

	const sep = '|‎|'; // Contains U+200E invisible char
	let sortInput; // Sorting
	let tags = [];
	const count = copy.Count;
	const checkLength = checkKeys.length;
	for (let i = 0; i < checkLength; i++) {
		let key = _t(checkKeys[i]);
		if (i === 0) { sortInput = key; }
		else { sortInput += sep + key; }
	}
	let tfo = fb.TitleFormat(sortInput);
	if (bTagsCache) {
		const tagNames = checkKeys.map((tagName) => _t(tagName));
		const tagsVal = await tagsCache.getTags(tagNames, handleList.Convert());
		for (let i = 0; i < count; i++) {
			let id = '';
			tagNames.forEach((tag, j) => { id += (j ? sep : '') + tagsVal[tag][i].join(', '); });
			tags.push(id);
		}
	} else {
		tags = tfo.EvalWithMetadbs(copy);
	}

	let set = new Set();
	if (bMultiple) {
		const dics = Array.from({ length: checkLength }, () => new Set());
		const toSplitKeys = checkKeys.map((key) => !RegExp(globRegExp.singleTags.re).exec(key));
		let i = 0;
		if (bAdvTitle) {
			const titleRe = globRegExp.title.re;
			const titleReV2 = globRegExp.ingAposVerbs.re;
			const titleReV3 = globRegExp.ingVerbs.re;
			while (i < count) {
				const strArr = tags[i].split(sep).map((str, j) => {
					return toSplitKeys[j]
						? str.split(', ')
						: [str.replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g').trim()];
				});
				const bFound = strArr.every((subStrArr, j) => subStrArr.some((subStr) => dics[j].has(subStr)));
				if (!bFound) {
					items.push(copy[i]);
					strArr.forEach((subStrArr, j) => subStrArr.forEach((subStr) => dics[j].add(subStr)));
				}
				i++;
			}
		} else {
			while (i < count) {
				const strArr = tags[i].split(sep).map((str, j) => {
					return toSplitKeys[j]
						? str.split(', ')
						: [str];
				});
				const bFound = strArr.every((subStrArr, j) => subStrArr.some((subStr) => dics[j].has(subStr)));
				if (!bFound) {
					items.push(copy[i]);
					strArr.forEach((subStrArr, j) => subStrArr.forEach((subStr) => dics[j].add(subStr)));
				}
				i++;
			}
		}
	} else {
		if (bAdvTitle) { // NOSONAR
			const titleRe = globRegExp.title.re;
			const titleReV2 = globRegExp.ingAposVerbs.re;
			const titleReV3 = globRegExp.ingVerbs.re;
			for (let i = 0; i < count; i++) {
				const str = tags[i]
					.replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g')
					.trim();
				if (!set.has(str)) {
					set.add(str);
					items.push(copy[i]);
				}
			}
		} else {
			for (let i = 0; i < count; i++) {
				const str = tags[i];
				if (!set.has(str)) {
					set.add(str);
					items.push(copy[i]);
				}
			}
		}
	}
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list

	if (sortOutput !== null) { // Output Sorting?
		if (sortOutput.length && sortOutput !== sortInput) { tfo = fb.TitleFormat(sortOutput); }
		else { tfo = fb.TitleFormat('$rand()'); }
		items.OrderByFormat(tfo, 1);
	}

	if (bActivePlaylist) {
		let removedCount = handleList.Count - items.Count;
		if (removedCount) { // Send to active playlist if there was no input list and changes were made
			plman.UndoBackup(plman.ActivePlaylist);
			plman.ClearPlaylist(plman.ActivePlaylist);
			plman.InsertPlaylistItems(plman.ActivePlaylist, 0, items);
			console.log('Removed ' + removedCount + ' duplicates from active playlist by: ' + sortInput + (bAdvTitle ? '\t' + _p('Title RegExp') : ''));
		} else {
			console.log('No duplicates found by: ' + sortInput);
		}
	}
	if (bProfile) { test.Print('Task #1: Remove duplicates', false); }
	return Promise.resolve(items);
}

/**
 * Inverse function to remove duplicates, only outputs duplicates according to an array of keys
 *
 * @function
 * @name showDuplicates
 * @kind function
 * @param {object} [o] - arguments
 * @param {FbMetadbHandleList?} o.handleList - [=null] Input handle List, null will use the active playlist
 * @param {string?} o.sortOutput - Output sorting. Omitting this will sort list by checkKeys.
 * @param {string[]} o.checkKeys - Tag checking for duplicates. i.e. ['DATE', 'ARTIST', 'TITLE']
 * @param {boolean} o.bAdvTitle - Parse titles with RegExp to find duplicates (defined at globRegExp)
 * @param {boolean} o.bMultiple - Parse multi-value tags separately (by ', '), requiring a single match
 * @param {boolean} o.bProfile - Log profiling
 * @returns {FbMetadbHandleList?}
 */
function showDuplicates({ handleList = null, sortOutput = null, checkKeys = globTags.remDupl, bAdvTitle = false, bMultiple = false, bProfile = false } = {}) {
	// Check input
	if (checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('showDuplicates: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return handleList;
	} else {
		let i = checkKeys.length;
		while (i--) {
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('showDuplicates: checkKeys [' + checkKeys + '] some keys are not String objects');
				return handleList;
			}
		}
	}
	const test = bProfile ? new FbProfiler('showDuplicates') : null;

	// Only use RegExp title matching when the tags contain title!
	const titleRe = /title/i;
	bAdvTitle = checkKeys.some((key) => RegExp(titleRe).exec(key)) && bAdvTitle;

	// Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
		if (plman.ActivePlaylist === -1) { console.log('showDuplicates: No active playlist'); return null; }
		bActivePlaylist = true;
		handleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	}
	let items = [];
	let copy = handleList.Clone();

	const sep = '|‎|'; // Contains U+200E invisible char
	let sortInput; // Sorting
	let checklength = checkKeys.length;
	let i = 0;
	while (i < checklength) {
		const key = _t(checkKeys[i]);
		if (i === 0) { sortInput = key; }
		else { sortInput += sep + key; }
		i++;
	}
	let tfo = fb.TitleFormat(sortInput);
	const tfoCopy = tfo.EvalWithMetadbs(copy);

	// Count items per TF and store only those with more than 1 handle per TF
	i = 0;
	const idxMap = new Map();
	const count = tfoCopy.length;
	if (bMultiple) {
		const toSplitKeys = checkKeys.map((key) => !RegExp(globRegExp.singleTags.re).exec(key));
		if (bAdvTitle) {
			const titleRe = globRegExp.title.re;
			const titleReV2 = globRegExp.ingAposVerbs.re;
			const titleReV3 = globRegExp.ingVerbs.re;
			while (i < count) {
				const strArr = tfoCopy[i].split(sep).map((str, j) => {
					return toSplitKeys[j]
						? str.split(', ')
						: [str.replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g').trim()];
				});
				const combs = cartesian(...strArr);
				for (let str of combs) {
					const id = str.join(sep);
					if (!idxMap.has(id)) { idxMap.set(id, [i]); }
					else { idxMap.set(id, idxMap.get(id).concat([i])); break; }
				}
				i++;
			}
		} else {
			while (i < count) {
				const strArr = tfoCopy[i].split(sep).map((str, j) => {
					return toSplitKeys[j]
						? str.split(', ')
						: [str];
				});
				const combs = cartesian(...strArr);
				for (let str of combs) {
					const id = str.join(sep);
					if (!idxMap.has(id)) { idxMap.set(id, [i]); }
					else { idxMap.set(id, idxMap.get(id).concat([i])); break; }
				}
				i++;
			}
		}
	} else {
		if (bAdvTitle) { // NOSONAR
			const titleRe = globRegExp.title.re;
			const titleReV2 = globRegExp.ingAposVerbs.re;
			const titleReV3 = globRegExp.ingVerbs.re;
			while (i < count) {
				const str = tfoCopy[i]
					.replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g')
					.trim();
				if (!idxMap.has(str)) { idxMap.set(str, [i]); }
				else { idxMap.set(str, idxMap.get(str).concat([i])); }
				i++;
			}
		} else {
			while (i < count) {
				const str = tfoCopy[i];
				if (!idxMap.has(str)) { idxMap.set(str, [i]); }
				else { idxMap.set(str, idxMap.get(str).concat([i])); }
				i++;
			}
		}
	}
	const idxSet = new Set(); 	// With multi-value tags idx may be duplicated at multiple maps
	idxMap.forEach((idxArr) => {
		if (idxArr.length > 1) {
			idxArr.forEach((idx) => {
				if (!bMultiple || !idxSet.has(idx)) {
					items.push(copy[idx]);
					if (bMultiple) { idxSet.add(idx); }
				}
			});
		}
	});
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list

	if (sortOutput !== null) { // Output Sorting?
		if (sortOutput.length && sortOutput !== sortInput) { tfo = fb.TitleFormat(sortOutput); }
		else { tfo = fb.TitleFormat('$rand()'); }
		items.OrderByFormat(tfo, 1);
	}

	if (bActivePlaylist) {
		let removedCount = handleList.Count - items.Count;
		if (removedCount) { // Send to active playlist if there was no input list and changes were made
			plman.UndoBackup(plman.ActivePlaylist);
			plman.ClearPlaylist(plman.ActivePlaylist);
			plman.InsertPlaylistItems(plman.ActivePlaylist, 0, items);
			console.log('Removed ' + removedCount + ' unique items from active playlist by: ' + sortInput + (bAdvTitle ? '\t' + _p('Title RegExp') : ''));
			console.log('Found ' + items.Count + ' duplicates on active playlist by: ' + sortInput + (bAdvTitle ? '\t' + _p('Title RegExp') : ''));
		} else {
			console.log('No unique items found by: ' + sortInput + (bAdvTitle ? '\t' + _p('Title RegExp') : ''));
		}
	}
	if (bProfile) { test.Print('Task #1: Show duplicates', false); }
	return items;
}