'use strict';
//01/06/21

include('helpers_xxx_prototypes.js');
include('helpers_xxx_file.js');

/* 
	Global Variables 
*/

// Playlists descriptors
const writablePlaylistFormats = new Set(['.m3u','.m3u8','.pls']); // These are playlist formats which are writable
const readablePlaylistFormats = new Set(['.m3u','.m3u8','.pls','.fpl']); // These are playlist formats which are writable

/* 
	Playlist manipulation 
*/

// Outputs indexes of all playlists with that name
function playlistCountNoLocked() {
	const playlistsNum = plman.PlaylistCount
	let count = 0;
	for (let i = 0; i < playlistsNum; i++) {
		if (!plman.IsPlaylistLocked(i)) {count++;};
	}
	return count;
}

// Select n tracks from playlist and remove the rest
// Start is zero by default
// When nTracks is negative, then the count is done 
// reversed from start to zero
// When nTracks is negative and start is zero or not provided,
// then start is set to playlist length
function removeNotSelectedTracks(playlistIndex, nTracks, start = 0) {
        plman.ClearPlaylistSelection(playlistIndex);
		const sign = Math.sign(nTracks);
		start = sign < 0 && !start ?  plman.PlaylistItemCount(playlistIndex) - 1 : start;
		const selection = range(start, start + sign * (Math.abs(nTracks) - 1), sign);
        plman.SetPlaylistSelection(playlistIndex, selection, true);
        plman.RemovePlaylistSelection(playlistIndex, true);
}

// Outputs indexes of all playlists with that name
function getPlaylistIndexArray(name) {
	let i = 0;
	let index = [];
	while (i < plman.PlaylistCount) {
		if (plman.GetPlaylistName(i) === name) {
			index.push(i);
		}
		i++;
	}
	return index;
}

// Removes all playlists with that name
function removePlaylistByName(name) { 
	let index = plman.FindPlaylist(name);
	while (index !== -1){
		plman.RemovePlaylist(index);
		index = plman.FindPlaylist(name);
	}
}

// Clears all playlists with that name
function clearPlaylistByName(name) { 
	let index = getPlaylistIndexArray(name);
	if (isArrayNumbers(index)) {
		for (let i of index){
			plman.UndoBackup(i);
			plman.ClearPlaylist(i);
		}
	}
	return index;
}

// True if There are playlists with same name
function arePlaylistNamesDuplicated() {
	let i = 0;
	let names = new Set();
	const count = plman.PlaylistCount;
	while (i < count) {
		names.add(plman.GetPlaylistName(i));
		i++;
	}
	return !(names.size === count);
}

// Playlists with same name
function findPlaylistNamesDuplicated() {
	let i = 0;
	let namesArray = [];
	const count = plman.PlaylistCount;
	while (i < count) {
		namesArray.push(plman.GetPlaylistName(i));
		i++;
	}
	const namesArrayNoDuplicates = [...new Set(namesArray)];
	namesArrayNoDuplicates.forEach((item) => {
		const i = namesArray.indexOf(item);
		namesArray = namesArray.slice(0, i).concat(namesArray.slice(i + 1, namesArray.length));
	});
	return namesArray;
}

function sendToPlaylist(handleList, playlistName) {
	// Clear playlist if needed. Preferred to removing it, since then we could undo later...
	// Look if target playlist already exists
	let i = 0;
	let plc = plman.PlaylistCount;
	while (i < plc) {
		if (plman.GetPlaylistName(i) === playlistName) {
			plman.ActivePlaylist = i;
			break;
		} else {
			i++;
		}
	}	
	if (i === plc) { //if no playlist was found before
		plman.CreatePlaylist(plc, playlistName);
		plman.ActivePlaylist = plc;
	}
	if (plman.PlaylistItemCount(plman.ActivePlaylist)) {
		plman.UndoBackup(plman.ActivePlaylist);
		plman.ClearPlaylist(plman.ActivePlaylist);
	}
	// Create playlist
	console.log('Final selection: ' +  handleList.Count  + ' tracks');
	plman.InsertPlaylistItems(plman.ActivePlaylist, 0, handleList);
	return handleList;
}

function savePlaylist(playlistIndex, playlistPath, extension = '.m3u8', playlistName = '', useUUID = null, bLocked = false, category = '', tags = [], relPath = '', trackTags = []) {
	if (!writablePlaylistFormats.has(extension)){
		console.log('savePlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + Array.from(writablePlaylistFormats).join(', '));
		return false;
	}
	if (!_isFile(playlistPath)) {
		const arr = isCompatible('1.4.0') ? utils.SplitFilePath(playlistPath) : utils.FileTest(playlistPath, 'split'); //TODO: Deprecated
		playlistPath = playlistPath.replaceLast(arr[2], extension);
		if (!playlistName.length) {playlistName = (arr[1].endsWith(arr[2])) ? arr[1] : arr[1] + arr[2];} // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
		let playlistText = [];
		// -------------- m3u
		if (extension === '.m3u8' || extension === '.m3u') {
			// Header text
			playlistText.push('#EXTM3U');
			playlistText.push('#EXTENC:UTF-8');
			playlistText.push('#PLAYLIST:' + playlistName);
			const UUID = (useUUID) ? nextId(useUUID) : ''; // May be visible or invisible chars!
			playlistText.push('#UUID:' + UUID);
			playlistText.push('#LOCKED:' + bLocked);
			playlistText.push('#CATEGORY:' + category);
			playlistText.push('#TAGS:' + (isArrayStrings(tags) ? tags.join(';') : ''));
			playlistText.push('#TRACKTAGS:' + (isArray(trackTags) ? JSON.stringify(trackTags) : ''));
			playlistText.push('#PLAYLISTSIZE:');
			// Tracks text
			if (playlistIndex !== -1) { // Tracks from playlist
				let trackText = [];
				const repl = '.\\';
				const tfo = fb.TitleFormat('#EXTINF:%_length_seconds%,%artist% - %title%$crlf()' + (relPath.length ? '$replace(%path%,\'' + relPath + '\',' + repl + ')' : '%path%'));
				const items = plman.GetPlaylistItems(playlistIndex);
				trackText = tfo.EvalWithMetadbs(items);
				playlistText[8] += items.Count; // Add number of tracks to size
				playlistText = playlistText.concat(trackText);
			} else { //  Else empty playlist
				playlistText[8] += 0; // Add number of tracks to size
			} 
		// ---------------- PLS
		} else if (extension === '.pls') { // The standard doesn't allow comments... so no UUID here.
			// Header text
			playlistText.push('[playlist]');
			// Tracks text
			if (playlistIndex !== -1) { // Tracks from playlist
				let trackText = [];
				const repl = '.\\';
				const tfo = fb.TitleFormat('File#placeholder#=' + (relPath.length ? '$replace(%path%,\'' + relPath + '\',' + repl + ')' : '%path%')  + '$crlf()Title#placeholder#=%title%' + '$crlf()Length#placeholder#=%_length_seconds%');
				const items = plman.GetPlaylistItems(playlistIndex);
				trackText = tfo.EvalWithMetadbs(items);
				//Fix file numbering since foobar doesn't output list index...
				let trackTextLength = trackText.length;
				for (let i = 0; i < trackTextLength; i++) { // It appears 3 times...
					trackText[i] = trackText[i].replace('#placeholder#', i + 1).replace('#placeholder#', i + 1).replace('#placeholder#', i + 1);
					trackText[i] += '\r\n'; // EoL after every track info group... just for readability
				}
				playlistText = playlistText.concat(trackText);
				playlistText.push('NumberOfEntries=' + items.Count); // Add number of tracks to size footer
			} else { //  Else empty playlist footer
				playlistText.push('NumberOfEntries=0');
			} 
			// End of Footer
			playlistText.push('Version=2');
		}
		// Write to file
		playlistText = playlistText.join('\r\n');
		let bDone = _save(playlistPath, playlistText);
		// Check
		if (_isFile(playlistPath) && bDone) {
			let check = utils.ReadTextFile(playlistPath, convertCharsetToCodepage('UTF-8'));
			bDone = (check === playlistText);
		}
		return bDone ? playlistPath : false;
	}
	return false;
}

function addHandleToPlaylist(handleList, playlistPath, relPath = '') {
	const extension = isCompatible('1.4.0') ? utils.SplitFilePath(playlistPath)[2] : utils.FileTest(playlistPath, 'split')[2]; //TODO: Deprecated
	if (!writablePlaylistFormats.has(extension)){
		console.log('addHandleToPlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + Array.from(writablePlaylistFormats).join(', '));
		return false;
	}
	if (_isFile(playlistPath)) {
		// Read original file
		let originalText = utils.ReadTextFile(playlistPath).split('\r\n');
		let bFound = false;
		let addSize = handleList.Count;
		let trackText = [];
		let size;
		if (typeof originalText !== 'undefined' && originalText.length) { // We don't check if it's a playlist by its content! Can break things if used wrong...
			let lines = originalText.length;
			if (extension === '.m3u8' || extension === '.m3u') {
				bFound = true; // no check for m3u8 since it can be anything
				let j = 0;
				while (j < lines) { // Changes size Line
					if (originalText[j].startsWith('#PLAYLISTSIZE:')) {
						size = Number(originalText[j].split(':')[1]);
						const newSize = size + addSize;
						originalText[j] = '#PLAYLISTSIZE:' + newSize;
						break;
					}
					j++;
				}
			} else if (extension === '.pls') {
				let j = 0;
				if (originalText[lines - 2].startsWith('NumberOfEntries=')) {
					bFound = true;
					// End of Footer
					size = Number(originalText[lines - 2].split('=')[1]);
					const newSize = size + addSize;
					trackText.push('NumberOfEntries=' + newSize);
					trackText.push('Version=2');
					originalText.pop(); //Removes old NumberOfEntries=..
					originalText.pop(); //Removes old Version=..
				} else {return false;} // Safety check
			}
		}
		if (!bFound) {return false;} // Safety check
		// New text
		// -------------- m3u
		if (extension === '.m3u8' || extension === '.m3u') {
			// Tracks text
			if (addSize !== 0) {
				const repl = '.\\';
				const tfo = fb.TitleFormat('#EXTINF:%_length_seconds%,%artist% - %title%$crlf()' + (relPath.length ? '$replace(%path%,\'' + relPath + '\',' + repl + ')' : '%path%'));
				trackText = [...tfo.EvalWithMetadbs(handleList), ...trackText]
			} else { //  Else empty handle
				return false;
			} 
		// ---------------- PLS
		} else if (extension === '.pls') { // The standard doesn't allow comments... so no UUID here.
			if (addSize !== 0) { // Tracks from playlist
				// Tracks text
				const repl = '.\\';
				const tfo = fb.TitleFormat('File#placeholder#=' + (relPath.length ? '$replace(%path%,\'' + relPath + '\',' + repl + ')' : '%path%')  + '$crlf()Title#placeholder#=%title%' + '$crlf()Length#placeholder#=%_length_seconds%');
				trackText = [...tfo.EvalWithMetadbs(handleList), ...trackText];
				//Fix file numbering since foobar doesn't output list index...
				let trackTextLength = trackText.length;
				for (let i = 0; i < trackTextLength - 2; i++) { // It appears 3 times per track...
					trackText[i] = trackText[i].replace('#placeholder#', size + 1).replace('#placeholder#', size + 1).replace('#placeholder#', size + 1);
					trackText[i] += '\r\n'; // EoL after every track info group... just for readability
				}
			} else { //  Else empty handle
				return false;
			} 
		}
		// Write to file
		trackText = trackText.join('\r\n');
		originalText = originalText.join('\r\n');
		let playlistText = originalText.concat('\r\n', trackText);
		let bDone = _save(playlistPath, playlistText);
		// Check
		if (_isFile(playlistPath) && bDone) {
			let check = utils.ReadTextFile(playlistPath, convertCharsetToCodepage('UTF-8'));
			bDone = (check === playlistText);
		}
		return bDone ? playlistPath : false;
	}
	return false;
}

function getFilePathsFromPlaylist(playlistPath) {
	let paths = [];
	if (!playlistPath || !playlistPath.length) {
		console.log('getFilePathsFromPlaylist(): no playlist path was provided');
		return paths;
	}
	const extension = isCompatible('1.4.0') ? utils.SplitFilePath(playlistPath)[2] : utils.FileTest(playlistPath, 'split')[2]; //TODO: Deprecated
	if (!writablePlaylistFormats.has(extension)){
		console.log('getFilePathsFromPlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + Array.from(writablePlaylistFormats).join(', '));
		return paths;
	}
	if (_isFile(playlistPath)) {
		// Read original file
		let originalText = utils.ReadTextFile(playlistPath).split('\r\n');
		if (typeof originalText !== 'undefined' && originalText.length) {
			let lines = originalText.length;
			if (extension === '.m3u8' || extension === '.m3u') {
				for (let j = 0; j < lines; j++) {
					if (!originalText[j].startsWith('#')) {paths.push(originalText[j]);}
				}
			} else if (extension === '.pls') {
				for (let j = 0; j < lines; j++) {
					if (originalText[j].startsWith('File')) {
						// Path may contain '=' so get anything past first '='
						let path = originalText[j].split('=').slice(1).join('='); // fileX=PATH
						paths.push(path);
					}
				}
			}
		}
	}
	return paths;
}

// Cache paths
var libItemsAbsPaths = [];
var libItemsRelPaths = {};

function precacheLibraryPaths() { // TODO: Share between panels
	libItemsAbsPaths = fb.TitleFormat('%path%').EvalWithMetadbs(fb.GetLibraryItems());
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function loadTracksFromPlaylist(playlistPath, playlistIndex, relPath = '') {
	let bDone = false;
	let handlePlaylist = getHandlesFromPlaylist(playlistPath, relPath);
	if (handlePlaylist) {
		plman.InsertPlaylistItems(playlistIndex, 0, handlePlaylist);
		bDone = true;
	}
	return bDone;
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function getHandlesFromPlaylist(playlistPath, relPath = '', bOmitNotFound = false) {
	// let test = new FbProfiler('getHandlesFromPlaylist');
	let bDone = false;
	const filePaths = getFilePathsFromPlaylist(playlistPath).map((path) => {return path.toLowerCase();});
	if (!filePaths.some((path) => {return path.startsWith('.\\');})) {relPath = '';} // No need to check rel paths if they are all absolute
	const playlistLength = filePaths.length;
	let handlePlaylist = [...Array(playlistLength)];
	const poolItems = fb.GetLibraryItems();
	const poolItemsCount = poolItems.Count;
	const poolItemsAbsPaths = libItemsAbsPaths.length === poolItems.Count ? libItemsAbsPaths : fb.TitleFormat('%path%').EvalWithMetadbs(poolItems);
	const poolItemsRelPaths = relPath.length ? (libItemsRelPaths.hasOwnProperty(relPath) && libItemsRelPaths[relPath].length === poolItems.Count ? libItemsRelPaths[relPath] : poolItemsAbsPaths.map((path) => {return path.replace(relPath, '.\\');})) : null; // Faster than tf again
	let pathPool = new Map();
	let filePool = new Set(filePaths);
	let path;
	if (relPath.length) {
		for (let i = 0; i < poolItemsCount; i++) {
			path = poolItemsAbsPaths[i].toLowerCase();
			if (filePool.has(path)) {
				pathPool.set(path, i);
				continue;
			}
			path = poolItemsRelPaths[i].toLowerCase();
			if (filePool.has(path)) {
				pathPool.set(path, i);
				continue;
			}
		}
	} else {
		for (let i = 0; i < poolItemsCount; i++) {
			path = poolItemsAbsPaths[i].toLowerCase();
			if (filePool.has(path)) {
				pathPool.set(path, i);
				continue;
			}
		}
	}
	let count = 0;
	for (let i = 0; i < playlistLength; i++) {
		if (pathPool.has(filePaths[i])) {
			handlePlaylist[i] = poolItems[pathPool.get(filePaths[i])];
			count++;
		}
	}
	if (count === filePaths.length || bOmitNotFound) {
		handlePlaylist = new FbMetadbHandleList(handlePlaylist);
	} else {handlePlaylist = null;}
	// test.Print();
	if (!libItemsAbsPaths.length) {libItemsAbsPaths = poolItemsAbsPaths;}
	if (relPath.length && (!libItemsRelPaths.hasOwnProperty(relPath) || !libItemsRelPaths[relPath].length)) {libItemsRelPaths[relPath] = poolItemsRelPaths;}
	return handlePlaylist;
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function arePathsInMediaLibrary(filePaths, relPath = '') {
	// let test = new FbProfiler('arePathsInMediaLibrary');
	if (!filePaths.some((path) => {return path.startsWith('.\\');})) {relPath = '';} // No need to check rel paths if they are all absolute
	const playlistLength = filePaths.length;
	const poolItems = fb.GetLibraryItems();
	const poolItemsCount = poolItems.Count;
	const poolItemsAbsPaths = libItemsAbsPaths.length === poolItems.Count ? libItemsAbsPaths : fb.TitleFormat('%path%').EvalWithMetadbs(poolItems);
	const poolItemsRelPaths = relPath.length ? (libItemsRelPaths.hasOwnProperty(relPath) && libItemsRelPaths[relPath].length === poolItems.Count ? libItemsRelPaths[relPath] : poolItemsAbsPaths.map((path) => {return path.replace(relPath, '.\\');})) : null; // Faster than tf again
	let filePool = new Set(filePaths.map((path) => {return path.toLowerCase();}));
	let path;
	let count = 0;
	if (relPath.length) {
		for (let i = 0; i < poolItemsCount; i++) {
			path = poolItemsAbsPaths[i].toLowerCase();
			if (filePool.has(path)) {
				count++;
				continue;
			}
			path = poolItemsRelPaths[i].toLowerCase();
			if (filePool.has(path)) {
				count++;
				continue;
			}
		}
	} else {
		for (let i = 0; i < poolItemsCount; i++) {
			path = poolItemsAbsPaths[i].toLowerCase();
			if (filePool.has(path)) {
				count++;
				continue;
			}
		}
	}
	// test.Print();
	if (libItemsAbsPaths.length !== poolItems.Count) {libItemsAbsPaths = poolItemsAbsPaths;}
	if (relPath.length && (!libItemsRelPaths.hasOwnProperty(relPath) || !libItemsRelPaths[relPath].length)) {libItemsRelPaths[relPath] = poolItemsRelPaths;}
	console.log(count);
	console.log(playlistLength);
	return (count === playlistLength);
}

function loadPlaylists(playlistArray) {
	let playlistArrayLength = playlistArray.length;
	let i = 0;
	while (i < playlistArrayLength) {
		let playlist = playlistArray[i];
		let newIndex = plman.CreatePlaylist(plman.PlaylistCount, playlist.name);
		plman.AddLocations(newIndex, [playlist.path], true);
		i++;
	}
	return i; // Number of playlists loaded
}