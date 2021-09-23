'use strict';
//01/06/21

include(fb.ComponentPath + 'docs\\Codepages.js');
include('helpers_xxx.js');
include('helpers_xxx_prototypes.js');
include('helpers_xxx_file.js');

/* 
	Global Variables 
*/

// Playlists descriptors
const writablePlaylistFormats = new Set(['.m3u','.m3u8','.pls']); // These are playlist formats which are writable
const readablePlaylistFormats = new Set(['.m3u','.m3u8','.pls','.fpl']); // These are playlist formats which are writable

/* 
	Playlist file manipulation 
*/

function savePlaylist(playlistIndex, playlistPath, extension = '.m3u8', playlistName = '', useUUID = null, bLocked = false, category = '', tags = [], relPath = '', trackTags = [], bBOM = false) {
	if (!writablePlaylistFormats.has(extension)){
		console.log('savePlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + Array.from(writablePlaylistFormats).join(', '));
		return false;
	}
	if (!_isFile(playlistPath)) {
		const arr = isCompatible('1.4.0') ? utils.SplitFilePath(playlistPath) : utils.FileTest(playlistPath, 'split'); //TODO: Deprecated
		playlistPath = playlistPath.replaceLast(arr[2], extension);
		if (!playlistName.length) {playlistName = (arr[1].endsWith(arr[2])) ? arr[1] : arr[1] + arr[2];} // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
		let playlistText = [];
		const relPathSplit = relPath.length ? relPath.split('\\').filter(Boolean) : null;
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
				const tfo = fb.TitleFormat('#EXTINF:%_length_seconds%,%artist% - %title%$crlf()%path%');
				const items = plman.GetPlaylistItems(playlistIndex);
				trackText = tfo.EvalWithMetadbs(items);
				if (relPath.length) { // Relative path conversion
					let trackPath = '';
					let trackInfo = '';
					trackText = trackText.map((item, i) => {
						[trackInfo, trackPath] = item.split('\n');
						trackPath = getRelPath(trackPath, relPathSplit);
						return trackInfo + '\n' + trackPath;
					});
				}
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
				const trackInfoPre = 'File#placeholder#=';
				const tfo = fb.TitleFormat((relPath.length ? '' : trackInfoPre) + '%path%' + '$crlf()Title#placeholder#=%title%' + '$crlf()Length#placeholder#=%_length_seconds%');
				const items = plman.GetPlaylistItems(playlistIndex);
				trackText = tfo.EvalWithMetadbs(items);
				if (relPath.length) { // Relative path conversion
					let trackPath = '';
					let trackInfo = '';
					trackText = trackText.map((item, i) => {
						[trackPath, ...trackInfo] = item.split('\n');
						trackPath = getRelPath(trackPath, relPathSplit);
						return trackInfoPre + trackPath + '\n' + trackInfo.join('\n');
					});
				}
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
		let bDone = _save(playlistPath, playlistText, bBOM);
		// Check
		if (_isFile(playlistPath) && bDone) {
			let check = utils.ReadTextFile(playlistPath, convertCharsetToCodepage('UTF-8'));
			bDone = (check === playlistText);
		}
		return bDone ? playlistPath : false;
	}
	return false;
}

function addHandleToPlaylist(handleList, playlistPath, relPath = '', bBOM = false) {
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
			// Safe checks to ensure proper encoding detection
			const codePage = checkCodePage(originalText, extension);
			if (codePage !== -1) {originalText = utils.ReadTextFile(playlistPath, codePage).split('\r\n');}
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
		const relPathSplit = relPath.length ? relPath.split('\\').filter(Boolean) : null;
		// -------------- m3u
		if (extension === '.m3u8' || extension === '.m3u') {
			// Tracks text
			if (addSize !== 0) {
				const tfo = fb.TitleFormat('#EXTINF:%_length_seconds%,%artist% - %title%$crlf()%path%');
				let newTrackText = tfo.EvalWithMetadbs(handleList);
				if (relPath.length) { // Relative path conversion
					let trackPath = '';
					let trackInfo = '';
					newTrackText = newTrackText.map((item, i) => {
						[trackInfo, trackPath] = item.split('\n');
						trackPath = getRelPath(trackPath, relPathSplit);
						console.log(relPathSplit);
						console.log(trackPath);
						return trackInfo + '\n' + trackPath;
					});
				}
				trackText = [...newTrackText, ...trackText];
			} else { //  Else empty handle
				return false;
			} 
		// ---------------- PLS
		} else if (extension === '.pls') { // The standard doesn't allow comments... so no UUID here.
			if (addSize !== 0) { // Tracks from playlist
				// Tracks text
				const trackInfoPre = 'File#placeholder#=';
				const tfo = fb.TitleFormat((relPath.length ? '' : trackInfoPre) + '%path%' + '$crlf()Title#placeholder#=%title%' + '$crlf()Length#placeholder#=%_length_seconds%');
				let newTrackText = tfo.EvalWithMetadbs(handleList);
				if (relPath.length) { // Relative path conversion
					let trackPath = '';
					let trackInfo = '';
					newTrackText = newTrackText.map((item, i) => {
						[trackPath, ...trackInfo] = item.split('\n');
						trackPath = getRelPath(trackPath, relPathSplit);
						return trackInfoPre + trackPath + '\n' + trackInfo.join('\n');
					});
				}
				trackText = [...newTrackText, ...trackText];
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
		let bDone = _save(playlistPath, playlistText, bBOM);
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
	if (_isFile(playlistPath)) { // TODO: skip blank lines ?
		// Read original file
		let originalText = utils.ReadTextFile(playlistPath).split('\r\n');
		if (typeof originalText !== 'undefined' && originalText.length) {
			// Safe checks to ensure proper encoding detection
			const codePage = checkCodePage(originalText, extension);
			if (codePage !== -1) {originalText = utils.ReadTextFile(playlistPath, codePage).split('\r\n');}
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

// Cache paths: calc once the paths for every item on library and share it with the other panels
// Relative paths are only calculated by specific panels, and is fast so it can be done on demand
var libItemsAbsPaths = [];
var libItemsRelPaths = {};

// Calculate paths in x steps to not freeze the UI
function precacheLibraryPaths(iSteps, iDelay) {
	return new Promise(resolve => {
		const items = fb.GetLibraryItems().Convert();
		const count = items.length;
		const range = count / iSteps;
		let libCopy = [...libItemsAbsPaths];
		const promises = [];
		for (let i = 1; i <= iSteps; i++) {
			promises.push(new Promise(resolve => {
				setTimeout(() => {
					if (libCopy.length !== count && libItemsAbsPaths.length !== count) {
						const items_i = new FbMetadbHandleList(items.slice((i - 1) * range, i === iSteps ? count : i * range));
						libCopy = libCopy.concat(fb.TitleFormat('%path%').EvalWithMetadbs(items_i));
						const progress = i / iSteps * 100;
						if (progress % 10 === 0) {console.log('Caching library paths ' + Math.round(progress) + '%.');}
						if (libItemsAbsPaths.length === count) {new Error('already cached');}
						else {resolve('done');}
					}
				}, iDelay * i);
			}));
		}
		Promise.all(promises).then((done) => {
			libItemsAbsPaths = libCopy;
			resolve('precacheLibraryPaths: got paths from ' + count + ' items.');
		}, (error) => {new Error(error);});
	});
}

async function precacheLibraryPathsAsync(iSteps = iStepsLibrary, iDelay = iDelayLibrary) {
	return await precacheLibraryPaths(iSteps, iDelay);
}

function precacheLibraryRelPaths(relPath) {
	if (libItemsAbsPaths.length && relPath.length && (!libItemsRelPaths.hasOwnProperty(relPath) || !libItemsRelPaths[relPath].length)) {
		libItemsRelPaths[relPath] = getRelPaths(libItemsAbsPaths, relPath);
		console.log('precacheLibraryRelPaths: got rel paths (' + relPath + ') from ' + libItemsRelPaths[relPath].length + ' items.')
	}
}

function getRelPaths(pathArr, relPath = '') {
	let relPathArr = [];
	if (isArrayStrings(pathArr)) {
		if (relPath.length) { // Relative path conversion
			const relPathSplit = relPath.length ? relPath.split('\\').filter(Boolean) : null;
			relPathArr = pathArr.map((item, i) => {
				return getRelPath(item, relPathSplit);
			});
		}
	}
	return relPathArr;
}

function getRelPath(itemPath, relPathSplit) {
	let cache = '';
	relPathSplit.forEach((folder, j) => {
		const level = new RegExp(folder + '\\\\', 'i')
		cache = itemPath.replace(level, '');
		if (itemPath === cache) {itemPath = '..\\' + cache;}
		else {itemPath = cache;}
	});
	if (!itemPath.startsWith('..\\')) {itemPath = '.\\' + itemPath;}
	return itemPath;
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
	if (!filePaths.some((path) => {return !/[A-Z]*:\\/.test(path);})) {relPath = '';} // No need to check rel paths if they are all absolute
	const playlistLength = filePaths.length;
	let handlePlaylist = [...Array(playlistLength)];
	const poolItems = fb.GetLibraryItems();
	const poolItemsCount = poolItems.Count;
	const newLibItemsAbsPaths = libItemsAbsPaths.length === poolItems.Count ? libItemsAbsPaths : fb.TitleFormat('%path%').EvalWithMetadbs(poolItems);
	const newLibItemsRelPaths = relPath.length ? (libItemsRelPaths.hasOwnProperty(relPath) && libItemsRelPaths[relPath].length === poolItems.Count ? libItemsRelPaths[relPath] : getRelPaths(newLibItemsAbsPaths, relPath)) : null; // Faster than TF again
	let pathPool = new Map();
	let filePool = new Set(filePaths);
	const filePoolSize = filePool.size;
	let path;
	if (relPath.length) {
		for (let i = 0; i < poolItemsCount; i++) {
			path = newLibItemsAbsPaths[i].toLowerCase();
			if (filePool.has(path)) {
				pathPool.set(path, i);
				continue;
			}
			path = newLibItemsRelPaths[i].toLowerCase();
			if (filePool.has(path)) {
				pathPool.set(path, i);
				continue;
			}
			if (path.startsWith('.\\')) {
				path = path.replace('.\\', '');
				if (filePool.has(path)) {
					pathPool.set(path, i);
					continue;
				}
			}
		}
	} else {
		for (let i = 0; i < poolItemsCount; i++) {
			path = newLibItemsAbsPaths[i].toLowerCase();
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
		// }
		} else {console.log(filePaths[i]);}
	}
	if (count === filePaths.length) {
		console.log(playlistPath.split('\\').pop() + ': Found all tracks on library.');
		handlePlaylist = new FbMetadbHandleList(handlePlaylist);
	} else if (bOmitNotFound) {
		console.log(playlistPath.split('\\').pop() + ': omitting not found items on library (' + (filePaths.length - count) + ').');
		handlePlaylist = new FbMetadbHandleList(handlePlaylist.filter((n) => n)); // Must filter since there are holes
	} else {
		console.log(playlistPath.split('\\').pop() + ': some items were not found on library (' + (filePaths.length - count) + ').');
		handlePlaylist = null;
	}
	// test.Print();
	if (!libItemsAbsPaths.length) {libItemsAbsPaths = newLibItemsAbsPaths;}
	if (relPath.length && (!libItemsRelPaths.hasOwnProperty(relPath) || !libItemsRelPaths[relPath].length)) {libItemsRelPaths[relPath] = newLibItemsRelPaths;}
	return handlePlaylist;
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function arePathsInMediaLibrary(filePaths, relPath = '') {
	// let test = new FbProfiler('arePathsInMediaLibrary');
	if (!filePaths.some((path) => {return !/[A-Z]*:\\/.test(path);})) {relPath = '';} // No need to check rel paths if they are all absolute
	const playlistLength = filePaths.length;
	const poolItems = fb.GetLibraryItems();
	const poolItemsCount = poolItems.Count;
	const newLibItemsAbsPaths = libItemsAbsPaths.length === poolItems.Count ? libItemsAbsPaths : fb.TitleFormat('%path%').EvalWithMetadbs(poolItems);
	const poolItemsAbsPaths = new Set(newLibItemsAbsPaths.map((_) => {return _.toLowerCase();}));
	const newLibItemsRelPaths = relPath.length ? (libItemsRelPaths.hasOwnProperty(relPath) && libItemsRelPaths[relPath].length === poolItems.Count ? libItemsRelPaths[relPath] : getRelPaths(newLibItemsAbsPaths, relPath)) : null; // Faster than tf again
	const poolItemsRelPaths = newLibItemsRelPaths ? new Set(newLibItemsRelPaths.map((_) => {return _.toLowerCase();})) : null;
	let filePool = new Set(filePaths.map((path) => {return path.toLowerCase();}));
	const filePoolSize = filePool.size;
	let path;
	let count = 0;
	if (relPath.length) {
		filePool.forEach((path) => {
			if (poolItemsAbsPaths.has(path)) {count++; return;}
			else if (poolItemsRelPaths.has(path)) {count++; return;}
			else if (poolItemsRelPaths.has('.\\' + path)) {count++; return;}
		});
	} else {
		count = poolItemsAbsPaths.intersectionSize(filePool);
	}
	// test.Print();
	if (!libItemsAbsPaths.length) {libItemsAbsPaths = newLibItemsAbsPaths;}
	if (relPath.length && (!libItemsRelPaths.hasOwnProperty(relPath) || !libItemsRelPaths[relPath].length)) {libItemsRelPaths[relPath] = newLibItemsRelPaths;}
	return (count === filePoolSize || count === playlistLength);
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

function checkCodePage(originalText, extension) {
	let codepage = -1;
	if (extension === '.m3u8') {codepage = convertCharsetToCodepage('UTF-8');}
	else if (extension === '.m3u' && originalText.length >= 2 && originalText[1].startsWith('#EXTENC:')) {
		const codepageName = originalText[1].split(':').pop();
		if (codepageName) {codepage = convertCharsetToCodepage(codepageName);}
	}
	return codepage ? codepage : -1;
}