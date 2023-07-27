'use strict';
//27/07/23

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
include('..\\..\\helpers\\helpers_xxx.js');
include('..\\..\\helpers\\helpers_xxx_prototypes_smp.js');
if (isFoobarV2) {include('..\\..\\helpers\\helpers_xxx_tags_cache.js');}

// Note number of final duplicates is always nAllowed + 1, since it allows n duplicates and the 'main' copy.
// 'nAllowed = 0' removes all duplicates.
function removeDuplicates({handleList = null, sortOutput = null, checkKeys = globTags.remDupl, sortBias = null /* globQuery.remDuplBias */, nAllowed = 0, bPreserveSort = (sortOutput === null && sortBias && sortBias.length), bAdvTitle = false, bProfile = false} = {}) {
	// Check input
	if (checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('removeDuplicates: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return handleList;
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('removeDuplicates: checkKeys [' + checkKeys + '] some keys are not String objects');
				return handleList;
			}
		}
	}
	if (bPreserveSort && (sortOutput !== null || !sortBias || !sortBias.length)) {bPreserveSort = false;}
	if (bProfile) {var test = new FbProfiler('removeDuplicates');}
	let copyHandleList, copyHandleListUnsorted;
	
	// Only use RegExp title matching when the tags contain title!
	const titleRe = /title/i;
	bAdvTitle = checkKeys.some((key) => {return key.match(titleRe);}) && bAdvTitle;
	
	// Active playlist or input list
	let bActivePlaylist = false;
	if (handleList === null) {
		if (plman.ActivePlaylist === -1) {console.log('removeDuplicates: No active playlist'); return null;}
		bActivePlaylist = true;
		copyHandleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	} else {
		copyHandleList = handleList.Clone();
	}
	let items = [];
	
	let sortInput; // Sorting
	let checklength = checkKeys.length;
	let i = 0;
	while (i < checklength) {
		let check_i = checkKeys[i];
		if (i === 0) {sortInput = (check_i.replace('%',) === check_i) ? '%' + check_i + '%' : check_i;}
		else {sortInput += (check_i.replace('%',) === check_i) ? ' - %' + check_i + '%' :  ' - ' + check_i;}
		i++;
	}
	if (sortBias && sortBias.length) { // In case of duplicates, prefer high rating non-live tracks
		if (bPreserveSort) {copyHandleListUnsorted = copyHandleList.Convert();}
		const biasTF = fb.TitleFormat(sortBias);
		copyHandleList.OrderByFormat(biasTF, -1); // 600 ms on 80K tracks
	}
	let tfo = fb.TitleFormat(sortInput);
	const tfoCopy = tfo.EvalWithMetadbs(copyHandleList);
	copyHandleList = copyHandleList.Convert();
	
	i = 0;
	let countMap = new Map([]);
	const count = tfoCopy.length;
	if (bAdvTitle) {
		const titleRe = globRegExp.title.re;
		const titleReV2 = globRegExp.ingAposVerbs.re;
		const titleReV3 = globRegExp.ingVerbs.re;
		while (i < count) {
			const str = tfoCopy[i].replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g').trim();
			if (countMap.has(str)) {
				if (countMap.get(str).val <= nAllowed) {
					countMap.get(str).val++;
					items.push(copyHandleList[i]);
				}
			} else {
				countMap.set(str, {val: 1});
				items.push(copyHandleList[i]);
			}
			i++;
		}
	} else {
		while (i < count) {
			const str = tfoCopy[i];
			if (countMap.has(str)) {
				if (countMap.get(str).val <= nAllowed) {
					countMap.get(str).val++;
					items.push(copyHandleList[i]);
				}
			} else {
				countMap.set(str, {val: 1});
				items.push(copyHandleList[i]);
			}
			i++;
		}
	}
	
	if (bPreserveSort) { // 600 ms on 80K tracks
		items = FbMetadbHandleList.partialSort(items, copyHandleListUnsorted);
	}
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list
	
	if (sortOutput !== null) { // Output Sorting?
		if (sortOutput.length && sortOutput !== sortInput) {tfo = fb.TitleFormat(sortOutput);}
		else {tfo = fb.TitleFormat('$rand()');}
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
	if (bProfile) {test.Print(nAllowed ? 'Task #1: Filter playlist' : 'Task #1: Remove duplicates', false);}
	return items;
}

// V2: Equal to V1 but without n checks (faster)
function removeDuplicatesV2({handleList = null, sortOutput = null, checkKeys = globTags.remDupl, sortBias = null /* globQuery.remDuplBias */, bPreserveSort = (sortOutput === null && sortBias && sortBias.length), bAdvTitle = false, bProfile = false} = {}) {
	// Check input
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('removeDuplicatesV2: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return handleList;
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('removeDuplicatesV2: checkKeys [' + checkKeys + '] some keys are not String objects');
				return handleList;
			}
		}
	}
	if (bPreserveSort && (sortOutput !== null || !sortBias || !sortBias.length)) {bPreserveSort = false;}
	if (bProfile) {var test = new FbProfiler('removeDuplicatesV2');}
	let copyHandleList, copyHandleListUnsorted;
	
	// Only use RegExp title matching when the tags contain title!
	const titleRe = /title/i;
	bAdvTitle = checkKeys.some((key) => {return key.match(titleRe);}) && bAdvTitle;
	
	// Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
		if (plman.ActivePlaylist === -1) {console.log('removeDuplicatesV2: No active playlist'); return null;}
		bActivePlaylist = true;
		copyHandleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	} else {
		copyHandleList = handleList.Clone();
	}
	let items = [];
	
	let sortInput; // Sorting
	let checklength = checkKeys.length;
	let i = 0;
	while (i < checklength) {
		let check_i = checkKeys[i];
		if (i === 0) {sortInput = (check_i.replace('%',) === check_i) ? '%' + check_i + '%' : check_i;}
		else {sortInput += (check_i.replace('%',) === check_i) ? '|%' + check_i + '%' :  '|' + check_i;}
		i++;
	}
	if (sortBias && sortBias.length) { // In case of duplicates, prefer high rating non-live tracks
		if (bPreserveSort) {copyHandleListUnsorted = copyHandleList.Convert();}
		const biasTF = fb.TitleFormat(sortBias);
		copyHandleList.OrderByFormat(biasTF, -1); // 600 ms on 80K tracks
	}
	let tfo = fb.TitleFormat(sortInput);
	const tfoCopy = tfo.EvalWithMetadbs(copyHandleList);
	copyHandleList = copyHandleList.Convert();
	
	i = 0;
	let set = new Set();
	const count = tfoCopy.length;
	if (bAdvTitle) {
		const titleRe = globRegExp.title.re;
		const titleReV2 = globRegExp.ingAposVerbs.re;
		const titleReV3 = globRegExp.ingVerbs.re;
		while (i < count) {
			const str = tfoCopy[i].replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g').trim();
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
	
	if (bPreserveSort) { // 600 ms on 80K tracks
		items = FbMetadbHandleList.partialSort(items, copyHandleListUnsorted);
	}
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list
	
	if (sortOutput !== null) { // Output Sorting?
		if (sortOutput.length && sortOutput !== sortInput) {tfo = fb.TitleFormat(sortOutput);}
		else {tfo = fb.TitleFormat('$rand()');}
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
	if (bProfile) {test.Print('Task #1: Remove duplicates', false);}
	return items;
}

// V3: Equal to V2 but async using tag cache
async function removeDuplicatesV3({handleList = null, sortOutput = null, checkKeys = globTags.remDupl, bAdvTitle = false, bTagsCache = true, bProfile = false} = {}) {
	// Check input
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('removeDuplicatesV3: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return handleList;
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('removeDuplicatesV3: checkKeys [' + checkKeys + '] some keys are not String objects');
				return handleList;
			}
		}
	}
	if (bProfile) {var test = new FbProfiler('removeDuplicatesV3');}
	
	// Only use RegExp title matching when the tags contain title!
	const titleRe = /title/i;
	bAdvTitle = checkKeys.some((key) => {return key.match(titleRe);}) && bAdvTitle;
	
	// Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
		if (plman.ActivePlaylist === -1) {console.log('removeDuplicatesV3: No active playlist'); return null;}
		bActivePlaylist = true;
		handleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	} 
	let items = [];
	let copy = handleList.Clone();
	
	let sortInput; // Sorting
	let tags = [];
	const count = copy.Count;
	const checklength = checkKeys.length;
	for (let i = 0; i < checklength; i++) {
		let check_i = checkKeys[i];
		if (i === 0) {sortInput = (check_i.replace('%',) === check_i) ? '%' + check_i + '%' : check_i;}
		else {sortInput += (check_i.replace('%',) === check_i) ? '|%' + check_i + '%' :  '|' + check_i;}
	}
	let tfo = fb.TitleFormat(sortInput);
	if (bTagsCache) {
		const tagNames = checkKeys.map((tagName) => {return (tagName.indexOf('$') === -1 ? '%' + tagName + '%' : tagName);});
		const tagsVal = await tagsCache.getTags(tagNames, handleList.Convert());
		for (let i = 0; i < count; i++) {
			let id = '';
			tagNames.forEach((tag, j) => {id += (j ?  '|' : '') + tagsVal[tag][i].join(', ');});
			tags.push(id);
		}
	} else {
		tags = tfo.EvalWithMetadbs(copy);
	}

	let set = new Set();
	if (bAdvTitle) {
		const titleRe = globRegExp.title.re;
		const titleReV2 = globRegExp.ingAposVerbs.re;
		const titleReV3 = globRegExp.ingVerbs.re;
		for (let i = 0; i < count; i++) {
			const str = tags[i].replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g').trim();
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
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list
	
	if (sortOutput !== null) { // Output Sorting?
		if (sortOutput.length && sortOutput !== sortInput) {tfo = fb.TitleFormat(sortOutput);}
		else {tfo = fb.TitleFormat('$rand()');}
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
	if (bProfile) {test.Print('Task #1: Remove duplicates', false);}
	return items;
}

// The inverse function to remove duplicates, only outputs duplicates according to TF
function showDuplicates({handleList = null, sortOutput = null, checkKeys = globTags.remDupl, bAdvTitle = false, bProfile = false} = {}) {
	// Check input
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('showDuplicates: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return handleList;
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('showDuplicates: checkKeys [' + checkKeys + '] some keys are not String objects');
				return handleList;
			}
		}
	}
	if (bProfile) {var test = new FbProfiler('showDuplicates');}
	
	// Only use RegExp title matching when the tags contain title!
	const titleRe = /title/i;
	bAdvTitle = checkKeys.some((key) => {return key.match(titleRe);}) && bAdvTitle;
	
	// Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
		if (plman.ActivePlaylist === -1) {console.log('showDuplicates: No active playlist'); return null;}
		bActivePlaylist = true;
		handleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	} 
	let items = [];
	let copy = handleList.Clone();
	
	let sortInput; // Sorting
	let checklength = checkKeys.length;
	let i = 0;
	while (i < checklength) {
		let check_i = checkKeys[i];
		if (i === 0) {sortInput = (check_i.replace('%',) === check_i) ? '%' + check_i + '%' : check_i;}
		else {sortInput += (check_i.replace('%',) === check_i) ? '|%' + check_i + '%' :  '|' + check_i;}
		i++;
	}
	let tfo = fb.TitleFormat(sortInput);
	const tfoCopy = tfo.EvalWithMetadbs(copy);
	
	// Count items per TF and store only those with more than 1 handle per TF
	i = 0;
	let map = new Map();
	const count = tfoCopy.length;
	if (bAdvTitle) {
		const titleRe = globRegExp.title.re;
		const titleReV2 = globRegExp.ingAposVerbs.re;
		const titleReV3 = globRegExp.ingVerbs.re;
		while (i < count) {
			const str = tfoCopy[i].replace(titleRe, '').replace(titleReV2, 'ing').replace(titleReV3, '$&g').trim();
			if (!map.has(str)) {map.set(str, [i]);}
			else {map.set(str, map.get(str).concat([i]));}
			i++;
		}
	} else {
		while (i < count) {
			const str = tfoCopy[i];
			if (!map.has(str)) {map.set(str, [i]);}
			else {map.set(str, map.get(str).concat([i]));}
			i++;
		}
	}
	map.forEach((idxArr, key) => {
		if (idxArr.length > 1) {idxArr.forEach((idx) => {items.push(copy[idx]);});}
	});
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list
	
	if (sortOutput !== null) { // Output Sorting?
		if (sortOutput.length && sortOutput !== sortInput) {tfo = fb.TitleFormat(sortOutput);}
		else {tfo = fb.TitleFormat('$rand()');}
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
	if (bProfile) {test.Print('Task #1: Show duplicates', false);}
	return items;
}