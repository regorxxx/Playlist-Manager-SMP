'use strict';

/*
	Remove duplicates 0.1 28/01/20
	Remove tracks with same tags (also duplicated files) from active playlist.
	if 'handleList = null' then it will work directly on current active playlist.
	If 'sortouput = ""', then final order will be randomized. It follows 'plman.SortByFormat' conventions.
	Any 'sort...' variable follows titleformat conventions
		i.e. "%title%|%artist%|%date%"
	Any 'check...' variable can follow both tag name or titleformat conventions (functions too) 
		i.e. 'title' or '%title%'
	You can add multiple entries to the same variable but then it must follow titleformat conventions.
		i.e. 'checkfirst = %title% - %artist%'
	The multiple 'check...' variables are joined using ' - '
	
	CAVEAT: Note you can use these functions to filter lists! i.e. if you only check by artist/date, then any track with same artist/date is considered duplicated
	That means this could be used both to find duplicates or for custom post-playlist creation filtering (1 track per artist, 1 track per date, etc.)
	TODO:
		- Clean unused things
		- Update v2 & V3
		- Add musicBraiz track ID and album as default: solves same track with different dates...
*/	

// Note number of final duplicates is always nAllowed + 1, since you allow n duplicates and the 'main' copy.
// 'nAllowed = 0' removes all duplicates.
function do_remove_duplicates(handleList = null, sortouput = null, checkKeys = ['title','artist','date'], nAllowed = 0) {
	// Check input
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('do_remove_duplicatesV2: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return; //Array was null or not an array
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('do_remove_duplicatesV2: checkKeys [' + checkKeys + '] some keys are not String objects');
				return; //Array was null or not an array
			}
		}
	}
		
	let bActivePlaylist = false;
	if (handleList === null) {
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
		else {sortInput += (check_i.replace('%',) === check_i) ? ' - %' + check_i + '%' :  ' - ' + check_i;}
		i++;
	}
	let tfo = fb.TitleFormat(sortInput);
	const tfoCopy = tfo.EvalWithMetadbs(copy);
	
	i = 0;
	let countMap = new Map([]);
	const count = tfoCopy.length;
	while (i < count) {
		const str = tfoCopy[i];
		if (countMap.has(str)) {
			if (countMap.get(str).val <= nAllowed) {
				countMap.get(str).val++;
				items.push(copy[i]);
			}
		} else {
			countMap.set(str, {val: 1});
			items.push(copy[i]);
		}
		i++;
	}
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list
	
	if (sortouput !== null) { // Output Sorting?
		if (sortouput.length && sortouput !== sortInput) {tfo = fb.TitleFormat(sortouput);}
		else {tfo = fb.TitleFormat('$rand()');}
		items.OrderByFormat(tfo, 1);
	}
	
	if (bActivePlaylist) {
		let removedCount = handleList.Count - items.Count;
		if (removedCount) { // Send to active playlist if there was no input list and changes were made
			plman.UndoBackup(plman.ActivePlaylist);
			plman.ClearPlaylist(plman.ActivePlaylist);
			plman.InsertPlaylistItems(plman.ActivePlaylist, 0, items);
			console.log('Removed ' + removedCount + ' duplicates from active playlist by: ' + sortInput);
		} else {
			console.log('No duplicates found by: ' + sortInput);
		}
	}
	return items;
}


// V2: Equal to V1 but without n checks (faster)
function do_remove_duplicatesV2(handleList = null, sortouput = null, checkKeys = ['title','artist','date']) {
	// Check input
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log('do_remove_duplicatesV2: checkKeys [' + checkKeys + '] was null, empty or not an array');
		return; //Array was null or not an array
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === '') {
				console.log('do_remove_duplicatesV2: checkKeys [' + checkKeys + '] some keys are not String objects');
				return; //Array was null or not an array
			}
		}
	}
		
	// Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
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
		else {sortInput += (check_i.replace('%',) === check_i) ? ' - %' + check_i + '%' :  ' - ' + check_i;}
		i++;
	}
	let tfo = fb.TitleFormat(sortInput);
	const tfoCopy = tfo.EvalWithMetadbs(copy);
	
	i = 0;
	let set = new Set();
	const count = tfoCopy.length;
	while (i < count) {
		const str = tfoCopy[i];
		if (!set.has(str)) {
			set.add(str);
			items.push(copy[i]);
		}
		i++;
	}
	items = new FbMetadbHandleList(items); // Converting the entire array is faster than directly adding to a handle list
	
	if (sortouput !== null) { // Output Sorting?
		if (sortouput.length && sortouput !== sortInput) {tfo = fb.TitleFormat(sortouput);}
		else {tfo = fb.TitleFormat('$rand()');}
		items.OrderByFormat(tfo, 1);
	}
	
	if (bActivePlaylist) {
		let removedCount = handleList.Count - items.Count;
		if (removedCount) { // Send to active playlist if there was no input list and changes were made
			plman.UndoBackup(plman.ActivePlaylist);
			plman.ClearPlaylist(plman.ActivePlaylist);
			plman.InsertPlaylistItems(plman.ActivePlaylist, 0, items);
			console.log('Removed ' + removedCount + ' duplicates from active playlist by: ' + sortInput);
		} else {
			console.log('No duplicates found by: ' + sortInput);
		}
	}
	return items;
}