'use strict';

/*
	Remove duplicates 0.1 28/01/20
	Remove tracks with same tags (also duplicated files) from active playlist.
	if 'handleList = null' then it will work directly on current active playlist.
	If 'sortouput = ""', then final order will be randomized. It follows 'plman.SortByFormat' conventions.
	Any 'sort...' variable follows titleformat conventions
		i.e. "%title%|%artist%|%date%"
	Any 'check...' variable can follow both tag name or titleformat conventions (functions too) 
		i.e. "title" or "%title%"
	You can add multiple entries to the same variable but then it must follow titleformat conventions.
		i.e. "checkfirst = %title% - %artist%"
	The multiple 'check...' variables are joined using " - "
	
	CAVEAT: Note you can use these functions to filter lists! i.e. if you only check by artist/date, then any track with same artist/date is considered duplicated
	That means this could be used both to find duplicates or for custom post-playlist creation filtering (1 track per artist, 1 track per date, etc.)
	TODO:
		- Clean unused things
		- Update v2 & V3
		- Add musicBraiz track ID and album as default: solves same track with different dates...
*/	

function do_remove_duplicates(handleList = null, sortouput = null, checkfirst = "title", checksecond = "artist", checkthird = "date") {
	if (!checkfirst && !checksecond && !checkthird) {
		return;
	}
	
	let items; // Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
		bActivePlaylist = true;
		handleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	} 
	items = handleList.Clone();
	
	let sortInput; // Sorting
	if (checkfirst) {sortInput = checkfirst.replace("%",) === checkfirst ? "%" + checkfirst + "%" : checkfirst;} // Using tags set
	if (checksecond) {sortInput += checksecond.replace("%",) === checksecond ? " - %" + checksecond + "%" :  " - " + checksecond;}
	if (checkthird) {sortInput += checkthird.replace("%",) === checkthird ? " - %" + checkthird + "%" : " - " + checkthird;}
	let tfo = fb.TitleFormat(sortInput);
	let strArray = tfo.EvalWithMetadbs(items); // We get all tf values at once
	let i = 0;
	let j = 0;
	let set = new Set();
	let itemsCount = items.Count;
	while (i < itemsCount) {
		// var str = tfo.EvalWithMetadb(items[i]);
		let str = strArray[j]; // This instead of calling it for every track, means -100ms per 30k tracks
		if (set.has(str)) {
			items.RemoveById(i);
			itemsCount--;
		} else {
			set.add(str);
			i++;
		}
		j++;
	}
	
	if (sortouput !== null) { // Output Sorting?
		if (sortouput.length && sortouput !== sortInput) {tfo = fb.TitleFormat(sortouput);}
		else {tfo = fb.TitleFormat("$rand()");}
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

// V2: Equal to V1 but can check an arbitrary number of tags
function do_remove_duplicatesV2(handleList = null, sortouput = null, checkKeys = ["title","artist","date"]) {
	// Check input
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log("do_remove_duplicatesV2: checkKeys [" + checkKeys + "] was null, empty or not an array");
		return; //Array was null or not an array
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === "") {
				console.log("do_remove_duplicatesV2: checkKeys [" + checkKeys + "] some keys are not String objects");
				return; //Array was null or not an array
			}
		}
	}
		
	let items; // Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
		bActivePlaylist = true;
		handleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	} 
	items = handleList.Clone();
	
	let sortInput; // Sorting
	let checklength = checkKeys.length;
    let i = 0;
	while (i < checklength) {
		let check_i = checkKeys[i];
		if (i === 0) {sortInput = (check_i.replace("%",) === check_i) ? "%" + check_i + "%" : check_i;}
		else {sortInput += (check_i.replace("%",) === check_i) ? " - %" + check_i + "%" :  " - " + check_i;}
		i++;
	}
	let tfo = fb.TitleFormat(sortInput);
	
	i = 0;
	let set = new Set();
	while (i < items.Count) {
		var str = tfo.EvalWithMetadb(items[i]);
		if (set.has(str)) {
			items.RemoveById(i);
		} else {
			set.add(str);
			i++;
		}
	}
	
	if (sortouput !== null) { // Output Sorting?
		if (sortouput.length && sortouput !== sortInput) {tfo = fb.TitleFormat(sortouput);}
		else {tfo = fb.TitleFormat("$rand()");}
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

// V3: Equal to V2 but allows a configurable number of duplicates (useful for playlist filtering)
// Note number of final duplicates is always nAllowed + 1, since you allow n duplicates and the "main" copy.
// "nAllowed = 0" match behaviour of V2.
function do_remove_duplicatesV3(handleList = null, sortouput = null, checkKeys = ["title","artist","date"], nAllowed = 0) {
	// Check input
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		console.log("do_remove_duplicatesV2: checkKeys [" + checkKeys + "] was null, empty or not an array");
		return; //Array was null or not an array
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]' || checkKeys[i] === "") {
				console.log("do_remove_duplicatesV2: checkKeys [" + checkKeys + "] some keys are not String objects");
				return; //Array was null or not an array
			}
		}
	}
		
	let items; // Active playlist or input list?
	let bActivePlaylist = false;
	if (handleList === null) {
		bActivePlaylist = true;
		handleList = plman.GetPlaylistItems(plman.ActivePlaylist);
	} 
	items = handleList.Clone();
	
	let sortInput; // Sorting
	let checklength = checkKeys.length;
    let i = 0;
	while (i < checklength) {
		let check_i = checkKeys[i];
		if (i === 0) {sortInput = (check_i.replace("%",) === check_i) ? "%" + check_i + "%" : check_i;}
		else {sortInput += (check_i.replace("%",) === check_i) ? " - %" + check_i + "%" :  " - " + check_i;}
		i++;
	}
	let tfo = fb.TitleFormat(sortInput);
	
	i = 0;
	let set = new Set();
	let countMap = new Map([]);
	while (i < items.Count) {
		var str = tfo.EvalWithMetadb(items[i]);
		if (set.has(str)) {
			if (countMap.get(tfo).val <= nAllowed) {
				countMap.get(tfo).val++;
				i++;
			} else {
				items.RemoveById(i);
			}
		} else {
			countMap.set(tfo, {val: 1});
			set.add(str);
			i++;
		}
	}
	
	if (sortouput !== null) { // Output Sorting?
		if (sortouput.length && sortouput !== sortInput) {tfo = fb.TitleFormat(sortouput);}
		else {tfo = fb.TitleFormat("$rand()");}
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