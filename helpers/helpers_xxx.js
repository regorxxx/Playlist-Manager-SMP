'use strict';
//03/05/21
include(fb.ComponentPath + 'docs\\Codepages.js');
include(fb.ComponentPath + 'docs\\Flags.js');

/* 
	Global Variables 
*/

function on_script_unload() {
	window.Tooltip.Deactivate();
}

// Folders
const folders = {};
folders.SMP = fb.ProfilePath + 'scripts\\SMP\\';
folders.xdata = folders.SMP+ 'xxx-data\\';
folders.xxx = folders.SMP + 'xxx-scripts\\';
folders.data = fb.ProfilePath + 'js_data\\';

// Tags descriptors: 
// Always use .toLowerCase first before checking if the set has the string. For ex
// numericTags.has(tagName.toLowerCase())
const dynamicTags = new Set(['rating','$year(%date%)']); // Tags only found by title formatting
const numericTags = new Set(['date','year','bpm','dynamic range','album dynamic range','rating','$year(%date%)']);  // These are tags which are always a number
const cyclicTags = new Set(['dynamic_genre']); // These are numeric tags with limited range: {0...K, k + 1 = 0}
// Put here the corresponding function for the cyclic tag. Swap lower/upper values before return if required. They must be always ordered.
// ALWAYS RETURN [valueLower, valueUpper, lowerLimit, upperLimit];
// Object keys must match the tag names at cyclicTags... 
const cyclicTagsDescriptor =	{	
									//dyngenre_map_xxx.js
									dynamic_genre(tagValue, valueRange, bReturnLimits) {return dyn_genre_range(tagValue, valueRange, bReturnLimits);},
								};
// Add here the external files required for cyclic tags
var bLoadTags; // This tells the helper to load tags descriptors extra files. False by default
if (bLoadTags) {
	let externalPath = 	[
						fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\dyngenre_map_xxx.js', //for dynamic_genre range function
					];

	for (let i = 0; i < externalPath.length; i++) {
		const path = externalPath[i];
		if ((isCompatible('1.4.0') ? utils.IsFile(path) : utils.FileTest(path, 'e'))) { //TODO: Deprecated
			console.log('cyclicTagsDescriptor - File loaded: ' + path);
			include(path, {always_evaluate: false});
		} else {
			console.log('cyclicTagsDescriptor - WARNING missing: ' + path);
		}
	}
}

const logicDic = ['and', 'or', 'and not', 'or not', 'AND', 'OR', 'AND NOT', 'OR NOT'];

// Playlists descriptors
const writablePlaylistFormats = new Set(['.m3u','.m3u8','.pls']); // These are playlist formats which are writable
const readablePlaylistFormats = new Set(['.m3u','.m3u8','.pls','.fpl']); // These are playlist formats which are writable

// UI
const scaleDPI = {}; // Caches _scale() values;
const fonts = {}; // Caches _gdifont() values;
const LEFT = DT_VCENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
const RIGHT = DT_VCENTER | DT_RIGHT | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
const CENTRE = DT_VCENTER | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
const SF_CENTRE = 285212672;

const ONE_DAY = 86400000;
const ONE_WEEK = 604800000;

const LM = _scale(5);
const TM = _scale(15);

const chars = {
	up : '\uF077',
	down : '\uF078',
	close : '\uF00D',
	rating_on : '\uF005',
	rating_off : '\uF006',
	heart_on : '\uF004',
	heart_off : '\uF08A',
	prev : '\uF049',
	next : '\uF050',
	play : '\uF04B',
	pause : '\uF04C',
	stop : '\uF04D',
	preferences : '\uF013',
	search : '\uF002',
	console : '\uF120',
	info : '\uF05A',
	audioscrobbler : '\uF202',
	minus : '\uF068',
	music : '\uF001',
	menu : '\uF0C9'
};

const popup = {
	ok : 0,
	yes_no : 4,
	yes : 6,
	no : 7,
	stop : 16,
	question : 32,
	info : 64
};

// Combinations of invisible chars may be used on UI elements to assign IDs...
const hiddenChars = ['\u200b','\u200c','\u200d','\u200e'];

/* 
	Functions
*/

// Useful for comparing properties...
const zeroOrGreaterThan = (value, limit) => {return (value === 0) ? 0 : ((value < limit) ? limit : value);};

// Repeat execution indefinitely according to interval (ms). Ex:
// const repeatedFunction = repeatFn(function, ms);
// repeatedFunction(arguments);
const repeatFn = (func, ms) => {
	return (...args) => {setInterval(func.bind(this, ...args), ms);};
};

// Delay execution according to interval (ms). Ex:
// const delayedFunction = delayFn(function, ms);
// delayedFunction(arguments);
const delayFn = (func, ms) => {
	return (...args) => {return setTimeout(func.bind(this, ...args), ms);};
};

// Halt execution if trigger rate is greater than delay (ms), so it fires only once after successive calls. Ex:
// const debouncedFunction = debounce(function, delay[, immediate]);
// debouncedFunction(arguments);
const debounce = (func, delay, immediate) => {
	let timerId;
	return (...args) => {
		const boundFunc = func.bind(this, ...args);
		clearTimeout(timerId);
		if (immediate && !timerId) {
			boundFunc();
		}
		const calleeFunc = immediate ? () => {timerId = null;} : boundFunc;
		timerId = setTimeout(calleeFunc, delay);
	};
};

// Limit the rate at which a function can fire to delay (ms).
// var throttledFunction = throttle(function, delay[, immediate]);
// throttledFunction(arguments);
const throttle = (func, delay, immediate) => {
	let timerId;
	return (...args) => {
		const boundFunc = func.bind(this, ...args);
		if (timerId) {
			return;
		}
		if (immediate && !timerId) {
			boundFunc();
		}
		timerId = setTimeout(() => {
			if(!immediate) {
				boundFunc(); 
			}
			timerId = null; 
		}, delay);
	};
};

// Fire functions only once
var doOnceCache = [];
const doOnce = (task, fn) => {
	return (...args) => {
		if(doOnceCache.indexOf(task) === -1) {
			doOnceCache.push(task);
			return fn(...args);
		}
	};
};

function _isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

/* 
	File manipulation 
*/
const fso = new ActiveXObject('Scripting.FileSystemObject');
const WshShell = new ActiveXObject('WScript.Shell');
const app = new ActiveXObject('Shell.Application');

function _isFile(file) {
	if (isCompatible('1.4.0')) {return utils.IsFile(file);} 
	else {return isString(file) ? fso.FileExists(file) : false;} //TODO: Deprecated
}

function _isFolder(folder) {
	if (isCompatible('1.4.0')) {return utils.IsDirectory(folder);} 
	else {return isString(folder) ? fso.FolderExists(folder) : false;} //TODO: Deprecated
}

function _createFolder(folder) {
	if (!_isFolder(folder)) {
		try {
			fso.CreateFolder(folder);
		} catch (e) {
			return false;
		}
		return _isFolder(folder);
	}
	return false;
}

// Delete. Can not be undone.
function _deleteFile(file) {
	if (_isFile(file)) {
		try {
			fso.DeleteFile(file);
		} catch (e) {
			return false;
		}
		return !(_isFile(file));
	}
	return false;
}

// Rename/move
function _renameFile(oldFilePath, newFilePath) {
	if (!_isFile(newFilePath)) {
		if (_isFile(oldFilePath)) {
			try {
				fso.MoveFile(oldFilePath, newFilePath);
			} catch (e) {
				return false;
			}
			return _isFile(newFilePath);
		}
		return false;
	}
	return false;
}

// Copy
function _copyFile(oldFilePath, newFilePath) {
	if (!_isFile(newFilePath)) {
		if (_isFile(oldFilePath)) {
			try {
				fso.CopyFile(oldFilePath, newFilePath);
			} catch (e) {
				return false;
			}
			return _isFile(newFilePath) && _isFile(oldFilePath);
		}
		return false;
	}
	return false;
}

// Sends file to recycle bin, can be undone
function _recycleFile(file) {
	if (_isFile(file)) {
		try {
			app.NameSpace(10).MoveHere(file);
		} catch (e) {
			return false;
		}
		return !(_isFile(file));
	}
	return false;
}

// Restores file from the recycle Bin, you must pass the original path. 
// Beware of collisions... same file deleted 2 times has the same virtual name on bin...
function _restoreFile(file) {
	if (!_isFile(file)) {
		const arr = isCompatible('1.4.0') ? utils.SplitFilePath(file) : utils.FileTest(file, 'split'); //TODO: Deprecated
		const OriginalFileName = (arr[1].endsWith(arr[2])) ? arr[1] : arr[1] + arr[2]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
		const items = app.NameSpace(10).Items();
		const numItems = items.Count;
		for (let i = 0; i < numItems; i++) {
			if (items.Item(i).Name === OriginalFileName) {
				_renameFile(items.Item(i).Path, file);
				break;
			}
		}
		let bFound = _isFile(file);
		if (!bFound){console.log('_restoreFile(): Can not restore file, \'' + OriginalFileName + '\' was not found at the bin.');}
		return bFound;
	} else {
		console.log('_restoreFile(): Can not restore file to \'' + file + '\' since there is already another file at the same path.');
		return false;
	}
}

function _open(file) {
	if (_isFile(file)) {
		return utils.ReadTextFile(file);
	} else {
		return '';
	}
}

function _save(file, value) {
	const filePath = isCompatible('1.4.0') ? utils.SplitFilePath(file)[0] : utils.FileTest(file, 'split')[0]; //TODO: Deprecated
	if (_isFolder(filePath) && utils.WriteTextFile(file, value)) {
		return true;
	}
	console.log('Error saving to ' + file);
	return false;
}

function _jsonParse(value) {
	try {
		let data = JSON.parse(value);
		return data;
	} catch (e) {
		return [];
	}
}

function _jsonParseFile(file) {
	return _jsonParse(_open(file));
}

// Opens explorer on file (and selects it) or folder
function _explorer(fileOrFolder) {
	if (_isFile(fileOrFolder)) {
		WshShell.Run('explorer /select,' + _q(fileOrFolder));
		return true; // There is no way to know if the explorer window got opened at the right path...
	} else if (_isFolder(fileOrFolder)) {
		WshShell.Run('explorer /e,' + _q(fileOrFolder));
		return true; // There is no way to know if the explorer window got opened at the right path...
	}
	return false;
}

// Workaround for bug on win 7 on utils.Glob(), matching extensions with same chars: utils.Glob(*.m3u) returns *.m3u8 files too
function getFiles(folderPath, extensionSet) {
	return utils.Glob(folderPath +'*.*').filter((item) => {
		return extensionSet.has('.' + item.split('.').pop().toLowerCase());
	});
}

function _run() {
	try {
		WshShell.Run([...arguments].map((arg) => {return _q(arg);}).join(' '));
		return true;
	} catch (e) {
		return false;
	}
}

function _runCmd(command, wait) {
	try {
		WshShell.Run(command, 0, wait);
	} catch (e) {
		console.log('_runCmd(): failed to run command ' + command);
	}
}

// Replace once originalString from a file
function editTextFile(filePath, originalString, newString) {
	let bDone = false;
	if (_isFile(filePath)){
		let fileText = utils.ReadTextFile(filePath);
		if (typeof fileText !== 'undefined' && fileText.length >= 1) {
			let fileTextNew = fileText;
			if (isArray(originalString) && isArray(newString) && originalString.length === newString.length) {
				originalString = originalString.filter(Boolean); // '' values makes no sense to be replaced
				if (isArrayStrings(originalString) && isArrayStrings(newString, true) && originalString.length === newString.length) { //newString may have blank values but both arrays must have same length
					let replacements = newString.length;
					for (let i = 0; i < replacements; i++) {
						fileTextNew = fileTextNew.replace(originalString[i], newString[i]);
					}
				}
			} else if (isString(originalString) && isString(newString)) {
				fileTextNew = fileTextNew.replace(originalString, newString);
			}
			if (fileTextNew !== fileText) {
				bDone = utils.WriteTextFile(filePath, fileTextNew, true);
				// Check
				if (_isFile(filePath) && bDone) {
					let check = utils.ReadTextFile(filePath, convertCharsetToCodepage('UTF-8'));
					bDone = (check === fileTextNew);
				}
			}
		}
	}
	return bDone;
}

function findRecursivePaths(path = fb.ProfilePath){
	let arr = [], pathArr = [];
	arr = utils.Glob(path + '*.*', 0x00000020); // Directory
	arr.forEach( (subPath) => {
		if (subPath.indexOf('\\..') !== -1 || subPath.indexOf('\\.') !== -1) {return;}
		if (subPath === path) {return;}
		pathArr.push(subPath);
		pathArr = pathArr.concat(findRecursivePaths(subPath + '\\'));
	});
	return pathArr;
}

function findRecursivefile(fileMask, inPaths = [fb.ProfilePath, fb.ComponentPath]){
	let fileArr = [];
	if (isArrayStrings(inPaths)) {
		let pathArr = [];
		inPaths.forEach( (path) => {pathArr = pathArr.concat(findRecursivePaths(path));});
		pathArr.forEach( (path) => {fileArr = fileArr.concat(utils.Glob(path + '\\' +  fileMask));});
	}
	return fileArr;
}

/* 
	String manipulation 
*/

String.prototype.replaceLast = function replaceLast(word, newWord) {
	const n = this.lastIndexOf(word);
	return this.slice(0, n) + this.slice(n).replace(word, newWord);
};

function _q(value) {
	return '"' + value + '"';
}

function capitalize(s) {
  if (typeof s !== 'string') {return '';}
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalizeAll(s, sep = ' ') {
  if (typeof s !== 'string') {return '';}
  return s.split(sep).map( (subS) => {return subS.charAt(0).toUpperCase() + subS.slice(1);}).join(sep); // Split, capitalize each subString and join
}

// https://www.dotnetforall.com/difference-between-typeof-and-valueof-in-javascript/
// We don't care about object-wrapped strings, they are deprecated and not recommended.
function isString(str){
	return (typeof str === 'string' && str.length > 0) ? true : false;
}

function nextId(method, bNext = true, bCharsForced = true) {
	switch (true) {
		case method === 'invisible':
			return nextIdInvisible(bNext, bCharsForced);
		case method === 'letters':
			return nextIdLetters(bNext, bCharsForced);
		case method === 'indicator':
			return nextIdIndicator(bNext);
		default:
			return null;
	}
}

const nextIdInvisible = (function() {
		var nextIndex = [0,0,0,0,0];
		const chars = hiddenChars;
		const charsForced = [' (*',')'];
		const num = chars.length;
		var prevId = nextIndex.length + charsForced.join('').length;

		return function(bNext = true, bCharsForced = true) {
			if (!bNext) {return prevId;}
			let a = nextIndex[0];
			let b = nextIndex[1];
			let c = nextIndex[2];
			let d = nextIndex[3];
			let e = nextIndex[4];
			let id = (bCharsForced ? charsForced[0] : '') + chars[a] + chars[b] + chars[c] + chars[d] + chars[e] + (bCharsForced ? charsForced[1] : '');
		
			a = ++a % num;
		
			if (!a) {
				b = ++b % num; 
				if (!b) {
					c = ++c % num;
					if (!c) {
						d = ++d % num;
						if (!d) {
							e = ++e % num;
						}
					}
				}
			}
			nextIndex = [a, b, c, d, e];
			prevId = id;
			return id;
		};
}());

const nextIdLetters = (function() {
		var nextIndex = [0,0,0,0,0];
		const chars = ['a','b','c','d','f'];
		const charsForced = [' (',')'];
		const num = chars.length;
		var prevId = nextIndex.length + charsForced.join('').length;

		return function(bNext = true, bCharsForced = true) {
			if (!bNext) {return prevId;}
			let a = nextIndex[0];
			let b = nextIndex[1];
			let c = nextIndex[2];
			let d = nextIndex[3];
			let e = nextIndex[4];
			let id = (bCharsForced ? charsForced[0] : '') + chars[a] + chars[b] + chars[c] + chars[d] + chars[e] + (bCharsForced ? charsForced[1] : '');
		
			a = ++a % num;
		
			if (!a) {
				b = ++b % num; 
				if (!b) {
					c = ++c % num;
					if (!c) {
						d = ++d % num;
						if (!d) {
							e = ++e % num;
						}
					}
				}
			}
			nextIndex = [a, b, c, d, e];
			prevId = id;
			return id;
		};
}());

const nextIdIndicator = (function() { // Same structure to ease compatibility
		return function() {
			return ' (*)';
		};
}());

function capitalizeFirstLetter(string) {
    return string[0].toUpperCase() + string.slice(1);
}

/* 
	Playlist manipulation 
*/

// Select n tracks from playlist and remove the rest
function removeNotSelectedTracks(playlistIndex, nTracks) {
        plman.ClearPlaylistSelection(playlistIndex);
        let selection = [];
		let i = 0;
        for (i; i < nTracks; ++i) {
            selection[i] = i;
        }
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

function savePlaylist(playlistIndex, playlistPath, extension = '.m3u8', playlistName = '', useUUID = null, bLocked = false, category = '', tags = []) {
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
			playlistText.push('#PLAYLISTSIZE:');
			// Tracks text
			if (playlistIndex !== -1) { // Tracks from playlist
				let trackText = [];
				// let tfo = fb.TitleFormat('%path%');
				let tfo = fb.TitleFormat('#EXTINF:%_length_seconds%,%artist% - %title%$crlf()' + '%path%');
				let items = plman.GetPlaylistItems(playlistIndex);
				trackText = tfo.EvalWithMetadbs(items);
				playlistText[7] += items.Count; // Add number of tracks to size
				playlistText = playlistText.concat(trackText);
			} else { //  Else empty playlist
				playlistText[7] += 0; // Add number of tracks to size
			} 
		// ---------------- PLS
		} else if (extension === '.pls') { // The standard doesn't allow comments... so no UUID here.
			// Header text
			playlistText.push('[playlist]');
			// Tracks text
			if (playlistIndex !== -1) { // Tracks from playlist
				let trackText = [];
				let tfo = fb.TitleFormat('File#placeholder#=%path%' + '$crlf()Title#placeholder#=%title%' + '$crlf()Length#placeholder#=%_length_seconds%');
				let items = plman.GetPlaylistItems(playlistIndex);
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
		let bDone = utils.WriteTextFile(playlistPath, playlistText, true);
		// Check
		if (_isFile(playlistPath) && bDone) {
			let check = utils.ReadTextFile(playlistPath, convertCharsetToCodepage('UTF-8'));
			bDone = (check === playlistText);
		}
		return bDone ? playlistPath : false;
	}
	return false;
}

function addHandleToPlaylist(handleList, playlistPath) {
	const extension = isCompatible('1.4.0') ? utils.SplitFilePath(file)[2] : utils.FileTest(file, 'split')[2]; //TODO: Deprecated
	if (!writablePlaylistFormats.has(extension)){
		console.log('savePlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + Array.from(writablePlaylistFormats).join(', '));
		return false;
	}
	if (!_isFile(playlistPath)) {
		let trackText = [];
		let addSize = handleList.Count;
		// -------------- m3u
		if (extension === '.m3u8' || extension === '.m3u') {
			// Tracks text
			if (addSize !== 0) {
				let tfo = fb.TitleFormat('#EXTINF:%_length_seconds%,%artist% - %title%$crlf()' + '%path%');
				trackText = tfo.EvalWithMetadbs(handleList);
			} else { //  Else empty handle
				return false;
			} 
		// ---------------- PLS
		} else if (extension === '.pls') { // The standard doesn't allow comments... so no UUID here.
			if (addSize !== 0) { // Tracks from playlist
				// Tracks text
				let tfo = fb.TitleFormat('File#placeholder#=%path%' + '$crlf()Title#placeholder#=%title%' + '$crlf()Length#placeholder#=%_length_seconds%');
				trackText = tfo.EvalWithMetadbs(handleList);
				//Fix file numbering since foobar doesn't output list index...
				let trackTextLength = trackText.length;
				for (let i = 0; i < trackTextLength; i++) { // It appears 3 times...
					trackText[i] = trackText[i].replace('#placeholder#', i + 1).replace('#placeholder#', i + 1).replace('#placeholder#', i + 1);
					trackText[i] += '\r\n'; // EoL after every track info group... just for readability
				}
			} else { //  Else empty handle
				return false;
			} 
		}
		// Read original file
		let originalText = utils.ReadTextFile(playlistPath).split('\r\n');
		let bFound = false;
		if (typeof originalText !== 'undefined' && originalText.length) { // We don't check if it's a playlist by its content! Can break things if used wrong...
			let lines = originalText.length;
			if (extension === '.m3u8' || extension === '.m3u') {
				let j = 0;
				while (j < lines) { // Changes size Line
					if (originalText[j].startsWith('#PLAYLISTSIZE:')) {
						size = Number(originalText[j].split(':')[1]);
						let newSize = size + addSize;
						originalText[j] = '#PLAYLISTSIZE:' + newSize;
						bFound = true;
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
					let newSize = size + addSize;
					trackText.push('NumberOfEntries=' + newSize);
					trackText.push('Version=2');
					originalText.pop(); //Removes old NumberOfEntries=..
					originalText.pop(); //Removes old Version=..
				} else {return false;} // Safety check
			}
		}
		if (!bFound) {return false;} // Safety check
		// Write to file
		trackText = trackText.join('\r\n');
		originalText = originalText.join('\r\n');
		let playlistText = playlistText.concat(trackText);
		let bDone = utils.WriteTextFile(playlistPath, playlistText, true);
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

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function loadTracksFromPlaylist(playlistPath, playlistIndex) {
	let test = new FbProfiler('Group #1');
	let bDone = false;
	const filePaths = getFilePathsFromPlaylist(playlistPath).map((path) => {return path.toLowerCase();});
	const playlistLength = filePaths.length;
	let handlePlaylist = [...Array(playlistLength)];
	let poolItems = fb.GetLibraryItems().Convert();
	let pathPool = new Map();
	let filePool = new Set(filePaths);
	poolItems.forEach( (handle, index) => {
		if (filePool.has(handle.Path.toLowerCase())) {
			pathPool.set(handle.Path.toLowerCase(), index);
		}
	});
	let count = 0;
	for (let i = 0; i < playlistLength; i++) {
		if (pathPool.has(filePaths[i])) {
			handlePlaylist[i] = poolItems[pathPool.get(filePaths[i])];
			count++;
		}
	}
	if (count === filePaths.length) {
		handlePlaylist = new FbMetadbHandleList(handlePlaylist);
		plman.InsertPlaylistItems(playlistIndex, 0, handlePlaylist);
		bDone = true;
	}
	test.Print();
	return bDone;
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

/* 
	Query and tag manipulation 
*/

// Replace #str# with current values, where 'str' is a TF expression which will be evaluated on handle
// Use try/catch to test validity of the query output
function queryReplaceWithCurrent(query, handle) {
	if (!query.length) {console.log('queryReplaceWithCurrent(): query is empty'); return;}
	if (!handle) {console.log('queryReplaceWithCurrent(): handle is null'); return;}
	if (query.indexOf('#') !== -1) {
		let idx = [query.indexOf('#')];
		let curr = idx[idx.length - 1];
		let next = -1;
		while (curr !== next) {
			curr = idx[idx.length - 1];
			next = query.indexOf('#', curr + 1);
			if (next !== -1 && curr !== next) {idx.push(next);}
			else {break;}
		}
		let count = idx.length;
		if (count % 2 === 0) { // Must be on pairs of 2
			let tempQuery = '';
			let tfo = '', tfoVal = '';
			for (let i = 0; i < count; i += 2) {
				tfo = query.slice(idx[i] + 1, idx[i + 1]);
				tfo = tfo.indexOf('$') === -1 ? '[%' + tfo + '%]' : '[' + tfo + ']';
				tfo = fb.TitleFormat(tfo);
				tfoVal = tfo.EvalWithMetadb(handle);
				tempQuery = tempQuery + query.slice((i > 0 ? idx[i - 1] + 1 : 0), idx[i]) + tfoVal;
			}
			query = tempQuery;
		}
	}
	return query;
}

// Joins an array of queries with 'SetLogic' between them: AND (NOT) / OR (NOT)
function query_join(queryArray, setLogic) {
		if (logicDic.indexOf(setLogic) === -1) {
			console.log('query_join(): setLogic (' + setLogic + ') is wrong');
			return;
		}
		let arrayLength = queryArray.length;
		// Wrong array
		let isArray = Object.prototype.toString.call(queryArray) === '[object Array]' ? 1 : 0; //queryArray
		if (!isArray || typeof queryArray === 'undefined' || queryArray === null || arrayLength === null || arrayLength === 0) {
			console.log('query_join(): queryArray [' + queryArray + '] was null, empty or not an array');
			return; //Array was null or not an array
		}
		
		let query = '';
		let i = 0;
		while (i < arrayLength) {
			if (i === 0) {
				query += (arrayLength > 1 ? '(' : '') + queryArray[i] + (arrayLength > 1 ? ')' : '');
			} else {
				query += ' ' + setLogic + ' (' + queryArray[i] + ')';
			}
			i++;
		}
		return query;
}

// It gets either a 2D array of tag values [[,],...], output from k_combinations(), or 1D array, and creates a query for all those combinations. 
// For 2D, every subset uses 'subtagsArrayLogic' between the tags. And then 'tagsArrayLogic' between subsets. QueryKey is the tag name.
// So that means you can create queries like:
// '(MOOD IS mood1 AND MOOD IS mood2) OR (MOOD IS mood1 AND MOOD IS mood3) OR ...'
// Currently configurable only AND (NOT) / OR (NOT) logics.
// For 1D arrays, only 'tagsArrayLogic' is used. i.e. 'STYLE IS style1 OR STYLE IS style2 ...'
function query_combinations(tagsArray, queryKey, tagsArrayLogic, subtagsArrayLogic) {
		// Wrong tagsArray
		if (tagsArray === null || Object.prototype.toString.call(tagsArray) !== '[object Array]' || tagsArray.length === null || tagsArray.length === 0) {
			console.log('query_combinations(): tagsArray [' + tagsArray + '] was null, empty or not an array');
			return; //Array was null or not an array
		}
		if (typeof queryKey === 'undefined' || queryKey === null || !queryKey) {
			console.log('query_combinations(): queryKey not set');
			return;
		}
		if (isArrayStrings(queryKey)) {
			let queryKeyLength = queryKey.length;
			let i = 0;
			let queryArray = [];
			while (i < queryKeyLength) {
				queryArray.push(query_combinations(tagsArray, queryKey[i], tagsArrayLogic, subtagsArrayLogic));
				i++;
			}
			return queryArray;
		}
		let tagsArrayLength = tagsArray.length;
		let query = '';
		let isArray = Object.prototype.toString.call(tagsArray[0]) === '[object Array]' ? 1 : 0; //subtagsArray
		if (!isArray) { //no subtagsArrays
			if (logicDic.indexOf(tagsArrayLogic) === -1) {
				console.log('query_combinations(): tagsArrayLogic (' + tagsArrayLogic + ') is wrong');
				return;
			}
			let i = 0;
			while (i < tagsArrayLength) {
				if (i === 0) {
					query += queryKey + ' IS ' + tagsArray[0];
				} else {
					query += ' ' + tagsArrayLogic + ' ' + queryKey + ' IS ' + tagsArray[i];
				}
				i++;
			}
		} else {
			if (logicDic.indexOf(tagsArrayLogic) === -1 || !logicDic.indexOf(subtagsArrayLogic) === -1) {
				console.log('query_combinations(): tagsArrayLogic (' + tagsArrayLogic + ') or subtagsArrayLogic (' + subtagsArrayLogic + ') are wrong');
				return;
			}
			let k = tagsArray[0].length; //SubtagsArrays length
			let i = 0;
			while (i < tagsArrayLength) {
				if (i !== 0) {
					query += ' ' + tagsArrayLogic + ' ';
				}
				let j = 0;
				while (j < k) {
					if (j === 0) {
						query += (k > 1 ? '(' : '') + queryKey + ' IS ' + tagsArray[i][0]; // only adds pharentesis when more than one subtag! Estetic fix...
					} else {
						query += ' ' + subtagsArrayLogic + ' ' + queryKey + ' IS ' + tagsArray[i][j];
					}
					j++;
				}
				query += (k > 1 ? ')' : '');
				i++;
			}
		}
		return query;
}

function checkQuery(query, bAllowEmpty) {
	let bPass = true;
	if (!bAllowEmpty && !query.length) {return false;}
	try {fb.GetQueryItems(new FbMetadbHandleList(), query);}
	catch (e) {bPass = false;}
	return bPass;
}

function getTagsValues(handle, tagsArray, bMerged = false) {
	if (!isArrayStrings (tagsArray)) {return null;}
	if (!handle) {return null;}
	
	const selInfo = sel.GetFileInfo();
	const tagArray_length = tagsArray.length;
	let outputArray = [];
	let i = 0;
	
	while (i < tagArray_length) {
		let tagValues = [];
		const tagIdx = selInfo.MetaFind(tagsArray[i]);
        const tagNumber = (tagIdx !== -1) ? selInfo.MetaValueCount(tagIdx) : 0;
		if (tagNumber !== 0) {
			let j = 0;
			while (j < tagNumber) {
				tagValues[j] = selInfo.MetaValue(tagIdx,j);
				j++;
			}
		}
		outputArray.push(tagValues);
		i++;
	}
	
	if (bMerged) {outputArray = outputArray.flat();}
	return outputArray;
}

function getTagsValuesV3(handle, tagsArray, bMerged = false) {
	if (!isArrayStrings (tagsArray)) {return null;}
	if (!handle) {return null;}
	
	const tagArray_length = tagsArray.length;
	let outputArray = [];
	let i = 0;
	let tagString = '';
	const outputArray_length = handle.Count;
	while (i < tagArray_length) {
		if (bMerged) {tagString += i === 0 ? '[%' + tagsArray[i] + '%]' : '[, ' + '%' + tagsArray[i] + '%]';} // We have all values separated by comma
		else {tagString += i === 0 ? '[%' + tagsArray[i] + '%]' : '| ' + '[%' + tagsArray[i] + '%]';} // We have tag values separated by comma and different tags by |
		i++;
	}
	let tfo = fb.TitleFormat(tagString);
	outputArray = tfo.EvalWithMetadbs(handle);
	if (bMerged) { // Just an array of values per track: n x 1
		for (let i = 0; i < outputArray_length; i++) {
			outputArray[i] = outputArray[i].split(', ');
			}
	} else { // Array of values tag and per track; n x tagNumber
		let tfo = fb.TitleFormat(tagString); 
		outputArray = tfo.EvalWithMetadbs(handle);
		for (let i = 0; i < outputArray_length; i++) {
			outputArray[i] = outputArray[i].split('| ');
			for (let j = 0; j < tagArray_length; j++) {
				outputArray[i][j] = outputArray[i][j].split(', ');
			}
		}
	}
	return outputArray;
}

function getTagsValuesV4(handle, tagsArray, bMerged = false, bEmptyVal = false) {
	if (!isArrayStrings (tagsArray)) {return null;}
	if (!handle) {return null;}
	
	const tagArray_length = tagsArray.length;
	let outputArrayi_length = handle.Count;
	let outputArray = [];
	let i = 0;
	while (i < tagArray_length) {
		if (tagsArray[i].toLowerCase() === 'skip') {
			outputArray[i] = [[]];
			i++;
			continue;
		}
		let tagString = ((tagsArray[i].indexOf('$') === -1) ? (bEmptyVal ? '%' + tagsArray[i] + '%' : '[%' + tagsArray[i] + '%]') : (bEmptyVal ? tagsArray[i]: '[' + tagsArray[i] + ']')); // Tagname or TF expression, with or without empty values
		let tfo = fb.TitleFormat(tagString);
		outputArray[i] = tfo.EvalWithMetadbs(handle);
		for (let j = 0; j < outputArrayi_length; j++) {
			outputArray[i][j] = outputArray[i][j].split(', ');
		}
		i++;
	}
	if (bMerged) {outputArray = outputArray.flat();}
	return outputArray;
}


function compareTagsValues(handle, tagsArray, bMerged = false) {
	
	let tags = getTagsValuesV3(handle, ['genre', 'composer'], true).flat();
	let genre = getTagsValuesV4(handle, ['genre', 'composer'], bMerged).flat(2);
	console.log(genre);
	console.log(tags);
	
	// let tagSet = new Set(tags[0][0].concat(tags[1][0]));
	// console.log(genreSet.difference(tagSet).size);
	// console.log(tagSet.difference(genreSet).size);
	// console.log([...genreSet]);
	// console.log([...tagSet]);
}


/* 
	Array and objects manipulation 
*/
function isArray(checkKeys) {
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0){
		return false; //Array was null or not an array
	}
	return true;
}


function isArrayStrings(checkKeys, bAllowEmpty = false) {
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		return false; //Array was null or not an array
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]') {
				return false; //values were null or not strings
			}
			if (!bAllowEmpty && checkKeys[i] === '') {
				return false; //values were empty
			}
		}
	}
	return true;
}

function isArrayNumbers(checkKeys) {
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		return false; //Array was null or not an array
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object Number]') {
				return false; //values were null or not numbers
			}
		}
	}
	return true;
}

// Expects key,value,key,value,...
// or key,value,value;key,value,...
// Outputs {key: value, key: value, ...}
// or  {key: [value, ...], key: [value, ...]}
function convertStringToObject(string, valueType, separator = ',', secondSeparator) {
	if (string === null || string === '') {
		return null;
	} else {
		let output = {};
		let array = [];
		if (secondSeparator) { // Split 2 times
			array = string.split(secondSeparator);
			for (let j = 0; j < array.length; j++) {
				let subArray = array[j].split(separator);
				if (subArray.length >= 2) {
					output[subArray[0]] = []; // First value is always the key
					for (let i = 1; i < subArray.length; i++) {
						if (valueType === 'string') {
							output[subArray[0]].push(subArray[i]);
						} else if (valueType === 'number') {
							output[subArray[0]].push(Number(subArray[i]));
						}
					}
				}
			}
		} else { // Only once
			array = string.split(separator);
			for (let i = 0; i < array.length; i += 2) {
				if (valueType === 'string') {
					output[array[i]] = array[i + 1];
				} else if (valueType === 'number') {
					output[array[i]] = Number(array[i + 1]);
				}
			}
		}
		return output;
	}
}

// Expects {key: value, key: value, ...}
// or  {key: [value, ...], key: [value, ...]}
// Outputs key,value,key,value,...
// or key,value,value;key,value,...
function convertObjectToString(object, separator = ',') {
	if (!object || !Object.keys(object).length) {
		return '';
	} else {
		let keys = Object.keys(object);
		let output = '';
		for(let i = 0; i < keys.length; i++) {
			output += (output.length) ? separator + keys[i] + separator + object[keys[i]] : keys[i] + separator + object[keys[i]];
		}
		return output;
	}
}

// Cycles an array n times. Changes the original variable.
// Use this to change states on buttons on click. So every click changes to next state.
// arr = [0,1,2]; arr.rotate(1); -> [1,2,0]
Array.prototype.rotate = (function() {
	var unshift = Array.prototype.unshift, splice = Array.prototype.splice;
	return function(count) {
		var len = this.length >>> 0, count = count >> 0;
		unshift.apply(this, splice.call(this, count % len, len));
		return this;
	};
})();

/* 
	Sets
*/

Set.prototype.isSuperset = function(subset) {
	for (let elem of subset) {
		if (!this.has(elem)) {
			return false;
		}
	}
	return true;
};

Set.prototype.union = function(setB) {
	let union = new Set(this);
	for (let elem of setB) {
		union.add(elem);
	}
	return union;
};

Set.prototype.intersection = function(setB) {
	let intersection = new Set();
	for (let elem of setB) {
		if (this.has(elem)) {
			intersection.add(elem);
		}
	}
	return intersection;
};

Set.prototype.difference = function(setB) {
	let difference = new Set(this);
	for (let elem of setB) {
		difference.delete(elem);
	}
	return difference;
};

Set.prototype.isEqual = function(subset) {
	return (this.size === subset.size && this.isSuperset(subset));
};

Set.prototype.unionSize = function(setB) {
	let size = 0;
	for (let elem of setB) {
		if (!this.has(elem)) {size++;}
	}
	return size;
};

Set.prototype.intersectionSize = function(setB) {
	let size = 0;
	for (let elem of setB) {
		if (this.has(elem)) {size++;}
	}
	return size;
};

Set.prototype.differenceSize = function(setB) {
	let size = this.size;
	for (let elem of setB) {
		if (this.has(elem)) {size--;}
	}
	return size;
};

/* 
	Combinatory 
*/

// Ksized-combinations of a given set of elements (array)
function k_combinations(aSet, k) {
		// FROM https://gist.github.com/axelpale/3118596
		let aSetLength = aSet.length;
		// Wrong set
		let isArray = Object.prototype.toString.call(aSet) === '[object Array]' ? 1 : 0; //set
		if (!isArray || typeof aSet === 'undefined' || aSet === null || aSetLength === null || aSetLength === 0) {
			console.log('k_combinations(): checkarraykeys [' + aSet + '] was null, empty or not an array');
			return; //Array was null or not an array
		}
		// Wrong K-size
		if (!k || k > aSetLength) {
			console.log('select_pairs: wrong combinatory number (' + k + ').');
			return;
		}
		// K-sized set has only one K-sized subset.
		if (k === aSetLength) {
			return [aSet];
		}
		
		let i, j, combs;
		// There is N 1-sized subsets in a N-sized set.
		if (k === 1) {
			combs = [];
			for (i = 0; i < aSetLength; i++) {
				combs.push([aSet[i]]);
			}
			return combs;
		}
		let head, tailcombs;
		combs = [];
		for (i = 0; i < aSetLength - k + 1; i++) {
			// head is a list that includes only our current element.
			head = aSet.slice(i, i + 1);
			// We take smaller combinations from the subsequent elements
			tailcombs = k_combinations(aSet.slice(i + 1), k - 1);
			// For each (k-1)-combination we join it with the current
			// and store it to the set of k-combinations.
			for (j = 0; j < tailcombs.length; j++) {
				combs.push(head.concat(tailcombs[j]));
			}
		}
		return combs;
}

// All possible combinations of a given set of elements (array)
function combinations(aSet) {
		// FROM https://gist.github.com/axelpale/3118596
		let aSetLength = aSet.length;
		// Wrong set
		let isArray = Object.prototype.toString.call(aSet) === '[object Array]' ? 1 : 0; //set
		if (!isArray || typeof aSet === 'undefined' || aSet === null || aSetLength === null || aSetLength === 0) {
			console.log('combinations(): checkarraykeys [' + aSet + '] was null, empty or not an array');
			return; //Array was null or not an array
		}
		// 1-sized set has only one subset.
		if (aSetLength === 1) {
			return [aSet];
		}
		
		let k, i, combs, k_combs;
		combs = [];
		
		// Calculate all non-empty k-combinations
		for (k = 1; k <= aSetLength; k++) {
			k_combs = k_combinations(aSet, k);
			for (i = 0; i < k_combs.length; i++) {
				combs.push(k_combs[i]);
			}
		}
		return combs;
}

// function fact(n) {
	// let result = 1;
	// for (; n > 1; n--) {result *= n;}
	// return result;
// }

const factLookup = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000, 6402373705728000, 121645100408832000, 2432902008176640000, 51090942171709440000, 1124000727777607680000, 25852016738884976640000, 620448401733239439360000]; // First 25 results
function fact(n) {
	if (factLookup[n]) {return factLookup[n];}
	return factLookup[n] = fact(n-1) * n;
}

// Total number of possible k-combinations
function nk_combinations(n, k) {
		if (k === n) {
			return 1;
		} else if (k > n){
			return 0;
		} else {
			return totalcomb = fact(n) / (fact(k) * fact(n - k));
		}
}

/* 
	UI
*/
let _bmp = gdi.CreateImage(1, 1);
let _gr = _bmp.GetGraphics();

function _tt(value, font = 'Segoe UI', fontsize = _scale(10), width = 1200) {
	this.tooltip = window.Tooltip;
	this.font = this.tooltip.SetFont(font, fontsize);
	this.width = this.tooltip.SetMaxWidth(width);
	this.text = this.tooltip.text = value;
	this.oldDelay = this.tooltip.GetDelayTime(3); //TTDT_INITIAL
	
	this.SetValue = function (value,  bForceActivate = false) {
		if (value === null) {
			this.Deactivate();
			return;
		} else {
			if (this.tooltip.Text !== value) {
				this.tooltip.Text = value;
				this.Activate();
			}
			if (bForceActivate) {this.Activate();} // Only on force to avoid flicker
		}
	};
	
	this.SetFont = function (font_name, font_size_pxopt, font_styleopt) {
		this.tooltip.SetFont(font_name, font_size_pxopt, font_styleopt);
	};
	
	this.SetMaxWidth = function (width) {
		this.tooltip.SetMaxWidth(width);
	};
	
	this.Activate = function () {
		this.tooltip.Activate();
	};
	
	this.Deactivate = function () {
		this.tooltip.Deactivate();
	};
	
	this.SetDelayTime = function (type, time) {
		this.tooltip.SetDelayTime(type, time) ;
    };
	
	this.GetDelayTime = function (type) {
		this.tooltip.GetDelayTime(type) ;
	};

}

function _scale(size) {
	if (!scaleDPI[size]) {
		let WshShell = new ActiveXObject('WScript.Shell');
		const DPI = WshShell.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI');
		scaleDPI[size] = Math.round(size * DPI / 72);
	}
	return scaleDPI[size];
}

function RGBA(r, g, b, a) {
	return ((a << 24) | (r << 16) | (g << 8) | (b));
}

function RGB(r, g, b) {
	return (0xff000000 | (r << 16) | (g << 8) | (b));
}

function toRGB(col) { // returns an array like [192, 0, 0]
	const a = col - 0xFF000000;
	return [a >> 16, a >> 8 & 0xFF, a & 0xFF];
}

function blendColours(c1, c2, f) {
	c1 = toRGB(c1);
	c2 = toRGB(c2);
	const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
	const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
	const b = Math.round(c1[2] + f * (c2[2] - c1[2]));
	return RGB(r, g, b);
}

function _gdiFont(name, size, style) {
	let id = name.toLowerCase() + '_' + size + '_' + (style || 0);
	if (!fonts[id]) {
		fonts[id] = gdi.Font(name, size, style || 0);
	}
	return fonts[id];
}


function _textWidth(value, font) {
	return _gr.CalcTextWidth(value, font);
}

function _sb(t, x, y, w, h, v, fn) {
	this.paint = (gr, colour) => {
		gr.SetTextRenderingHint(4);
		if (this.v()) {
			gr.DrawString(this.t, this.font, colour, this.x, this.y, this.w, this.h, SF_CENTRE);
		}
	}
	
	this.trace = (x, y) => {
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h && this.v();
	}
	
	this.move = (x, y) => {
		if (this.trace(x, y)) {
			window.SetCursor(IDC_HAND);
			return true;
		} else {
			//window.SetCursor(IDC_ARROW);
			return false;
		}
	}
	
	this.lbtn_up = (x, y) => {
		if (this.trace(x, y)) {
			if (this.fn) {
				this.fn(x, y);
			}
			return true;
		} else {
			return false;
		}
	}
	
	this.t = t;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.v = v;
	this.fn = fn;
	this.font = _gdiFont('FontAwesome', this.h);
}

function drawDottedLine(gr, x1, y1, x2, y2, line_width, colour, dot_sep) {
	if (y1 === y2) { // Horizontal
		const numberDots = Math.floor((x2 - x1) / dot_sep / 2);
		let newX1 = x1;
		let newX2 = x1 + dot_sep;
		for (let i = 0; i <= numberDots; i++) {
			gr.DrawLine(newX1, y1, newX2, y1, line_width, colour);
			newX1 += dot_sep * 2;
			newX2 += dot_sep * 2;
		}
	} else if (x1 === x2) { // Vertical
		const numberDots = Math.floor((y2 - y1) / dot_sep / 2);
		let newY1 = y1;
		let newY2 = y1 + dot_sep;
		for (let i = 0; i <= numberDots; i++) {
			gr.DrawLine(x1, newY1, x1, newY2, line_width, colour);
			newY1 += dot_sep * 2;
			newY2 += dot_sep * 2;
		}
	} else { // Any angle: Would work alone, but checking coordinates first is faster...
		const numberDots = Math.floor(((x2 - x1)**2 + (y2 - y1)**2)**(1/2) / dot_sep / 2);
		const angle = (y2 !== y1) ? Math.atan((x2 - x1)/(y2 - y1)) : 0;
		const xStep = dot_sep * Math.cos(angle);
		const yStep = dot_sep * Math.sin(angle);
		let newX1 = x1;
		let newX2 = x1 + xStep;
		let newY1 = y1;
		let newY2 = y1 + yStep;
		for (let i = 0; i <= numberDots; i++) {
			gr.DrawLine(newX1, newY1, newX2, newY2, line_width, colour);
			newX1 += xStep * 2;
			newX2 += xStep * 2;
			newY1 += yStep * 2;
			newY2 += yStep * 2;
		}
	}
}

/* 
	Properties
	propertiesObj 	--->	{propertyKey: [description, defaultValue, check, fallbackValue]}
	property			---> 	[description, defaultValue, check, fallbackValue]
	check			--->	{lower: val, greater: val, ...} (any combination)
	to add checks	--->	propertiesObj['propertyKey'].push(check, propertiesObj['propertyKey'][1])
*/

// Sets all properties at once using an object like this: {propertyKey : ['description',defaultValue]}
// Note it uses the get method by default. Change bForce to use Set method. 
// For ex. for setting properties with UI buttons after initialization.
function setProperties(propertiesDescriptor, prefix = '', count = 1, bPadding = true, bForce = false) {
	let bNumber = count > 0 ? true : false;
	for (let k in propertiesDescriptor){
		let description = prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0];
		if (bForce) { // Only use set when overwriting... this is done to have default values set first and then overwriting if needed.
			if (!checkProperty(propertiesDescriptor[k])) {window.SetProperty(description, propertiesDescriptor[k][3]);}
			else {window.SetProperty(description, propertiesDescriptor[k][1]);}
		} else {
			if (!checkProperty(propertiesDescriptor[k])) {checkProperty(propertiesDescriptor[k], window.GetProperty(description, propertiesDescriptor[k][3]));}
			else {checkProperty(propertiesDescriptor[k], window.GetProperty(description, propertiesDescriptor[k][1]));}
		}
		if (bNumber) {count++;}
	}
}

// Overwrites all properties at once
// For ex. for saving properties within a constructor (so this.propertiesDescriptor already contains count, padding, etc.).
function overwriteProperties(propertiesDescriptor) { // Equivalent to setProperties(propertiesDescriptor,'',0,false,true);
	for (let k in propertiesDescriptor){
		if (!checkProperty(propertiesDescriptor[k])) {
			window.SetProperty(propertiesDescriptor[k][0], propertiesDescriptor[k][3]);
		} else {
			window.SetProperty(propertiesDescriptor[k][0], propertiesDescriptor[k][1]);
		}
	}
}

// Recreates the property object like this: {propertyKey : ['description',defaultValue]} -> {propertyKey : userSetValue}
// Returns the entire list of values
function getProperties(propertiesDescriptor, prefix = '', count = 1, bPadding = true) {
	let bNumber = count > 0 ? true : false;
	let output = {};
	for (let k in propertiesDescriptor){
		output[k] = window.GetProperty(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]);
		if (bNumber) {count++};
	}
	return output;
}

// // Recreates the property object and gets the property variable associated to propertyKey: {propertyKey : ['description', defaultValue]} -> userSetValue
function getPropertyByKey(propertiesDescriptor, key, prefix = '', count = 1, bPadding = true) {
	let bNumber = count > 0 ? true : false;
	let output = null;
	for (let k in propertiesDescriptor){
		if (k === key) {
			output = window.GetProperty(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]);
			break;
		}
		if (bNumber) {count++};
	}
	return output;
}

// Recreates the property object and returns it: {propertyKey : ['description',defaultValue]} -> {propertyKey : ['prefix + count(padded) + 'description', userSetValue]}
// Use this to get descriptions along the values, instead of the previous ones
function getPropertiesPairs(propertiesDescriptor, prefix = '', count = 1, bPadding = true, bOnlyValues = false) {
	let bNumber = count > 0 ? true : false;
	let output = {};
	if (bOnlyValues) { // only outputs values, without description
		let cacheDescription = null;
		for (let k in propertiesDescriptor){
			output[k] = null;
			cacheDescription = prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0];
			output[k] = window.GetProperty(cacheDescription);
			if (!checkProperty(propertiesDescriptor[k], output[k])) {
				output[k] = propertiesDescriptor[k][3];
			}
			if (bNumber) {count++};
		}
	} else {
		for (let k in propertiesDescriptor){ // entire properties object with fixed descriptions
			output[k] = [null,null];
			output[k][0] =  prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0];
			output[k][1] = window.GetProperty(output[k][0]);
			if (propertiesDescriptor[k].length === 4) {
				if (!checkProperty(propertiesDescriptor[k], output[k][1])) {
					output[k][1] = propertiesDescriptor[k][3];
				}
				output[k][2] =  propertiesDescriptor[k][2];
				output[k][3] =  propertiesDescriptor[k][3];
			}
			if (bNumber) {count++};
		}
	}
	return output;
}

// Like getProperties() but outputs just an array of values: {propertyKey : ['description',defaultValue]} -> [userSetValue1, userSetValue2, ...]
function getPropertiesValues(propertiesDescriptor, prefix = '', count = 1, skip = -1, bPadding = true) {
	let properties = getProperties(propertiesDescriptor, prefix, count, bPadding);
	let propertiesValues = [];
	if (skip === -1) {skip = Object.keys(propertiesDescriptor).length + 1;}
	let i = 0;
	for (let k in properties){
		i++;
		if (i < skip) {
			let property = properties[k];
			if (property !== null) {propertiesValues.push(property);}
		}
	}
	return propertiesValues;
}

// Like getPropertiesValues() but the array of keys: {propertyKey : ['description',defaultValue]} -> [propertyKey1, propertyKey2, ...]
function getPropertiesKeys(propertiesDescriptor, prefix = '', count = 1, skip = -1, bPadding = true) {
	let bNumber = count > 0 ? true : false;
	let propertiesKeys = [];
	if (skip === -1) {skip = Object.keys(propertiesDescriptor).length + 1;}
	let i = 0;
	for (let k in propertiesDescriptor){
		i++;
		if (i < skip) {
			propertiesKeys.push(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]);
			if (bNumber) {count++};
		}
	}
	return propertiesKeys;
}

// Recreates the property object and returns user set values: {propertyKey : ['description',defaultValue]} -> userSetValue1 , userSetValue2, ...
// Only returns an array of values; useful for enumerating properties at once (like tags, etc.)
function enumeratePropertiesValues(propertiesDescriptor, prefix = '', count = 1, sep = '|', skip = -1, bPadding = true) {
	let bNumber = count > 0 ? true : false;
	let output = '';
	if (skip === -1) {skip = Object.keys(propertiesDescriptor).length + 1;}
	let i = 0;
	for (let k in propertiesDescriptor){
		i++;
		if (i < skip) {
			let value = String(window.GetProperty(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0])); // TODO: toString();
			output += (output === '') ? value : sep + value ;
			if (bNumber) {count++};
		}
	}
	return output;
}

// Checks property against given conditions. This is called everytime a property is set, overwritten
// or get from/to the properties panel. Therefore allows for generic error checking.
// propertiesObj 	--->	{propertyKey: [description, defaultValue, check, fallbackValue]}
// property			---> 	[description, defaultValue, check, fallbackValue]
// check			--->	{lower: val, greater: val, ...} (any combination)
// to add checks	--->	propertiesObj['propertyKey'].push(check, propertiesObj['propertyKey'][1])
function checkProperty(property, withValue) {
	let bPass = true;
	let report = '';
	if (property.length !== 4) {return true;}  // No checks needed (?)
	const valToCheck = (typeof withValue !== 'undefined' ? withValue : property[1]);
	const checks = property[2];
	if (checks.hasOwnProperty('lower') && valToCheck >= checks['lower']) {
		bPass = false; report += 'Value must be lower than ' + checks['lower'] + '\n';
	}
	if (checks.hasOwnProperty('lowerEq') && valToCheck > checks['lowerEq']) {
		bPass = false; report += 'Value must be lower than or equal to ' + checks['lowerEq'] + '\n';
	}
	if (checks.hasOwnProperty('greater') && valToCheck <= checks['greater']) {
		bPass = false; report += 'Value must be greater than ' + checks['greater'] + '\n';
	}
	if (checks.hasOwnProperty('greaterEq') && valToCheck < checks['greaterEq']) {
		bPass = false; report += 'Value must be greater than or equal to' + checks['greaterEQ'] + '\n';
	}
	if (checks.hasOwnProperty('eq') && checks['eq'].indexOf(valToCheck) === -1) {
		bPass = false; report += 'Value must be equal to (any) ' + checks['eq'].join(', ') + '\n';
	}
	if (checks.hasOwnProperty('range') && !checks['range'].some( (pair) => {return (valToCheck >= pair[0] && valToCheck <= pair[1]);})) {
		bPass = false; report += 'Value must be within range(any) ' + checks['range'].join(' or ') + '\n';
	}
	if (checks.hasOwnProperty('func') && checks['func'] && !checks['func'](valToCheck)) {
		bPass = false; report += 'Value obey this condition: ' + checks['func'] + '\n';
	}
	if (!bPass) {
		fb.ShowPopupMessage('Property value is wrong. Using default value as fallback:\n\'' + property[0] + '\'\nWrong value: ' + valToCheck + '\nReplaced with: ' + property[3] + '\n' + report);
	}
	return bPass;
}

/* 
	Numbers
*/

const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1}, (_, i) => start + (i * step));

function round(floatnum, decimals){
	let result;
	if (decimals > 0) {
		if (decimals === 15) {result = floatnum;}
		else {result = Math.round(floatnum * Math.pow(10, decimals)) / Math.pow(10, decimals);}
	} else {result =  Math.round(floatnum);}
	return result;
}

function isInt(n){
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
}

// Adds/subtracts 'offset' to 'reference' considering the values must follow cyclic logic within 'limits' range (both values included)
// Ex: [1,8], x = 5 -> x + 4 = 1 <=> cyclicOffset(5, 4, [1,8])
function cyclicOffset(reference, offset, limits) {
		if (offset && reference >= limits[0] && reference <= limits[1]) {
			reference += offset;
			if (reference < limits[0]) {reference += limits[1];}
			if (reference > limits[1]) {reference -= limits[1];}
		}
		return reference;
}

/* 
	Panels
*/

function isCompatible(requiredVersionStr = '1.4.0') {
    let requiredVersion = requiredVersionStr.split('.');
    let currentVersion = utils.Version.split('.'); // e.g. 0.1.0-alpha.2
    if (currentVersion.length > 3) {
        currentVersion.length = 3; // We need only numbers
    }

    for(let i = 0; i< currentVersion.length; ++i) {
      if (currentVersion[i] !== requiredVersion[i]) {
          return currentVersion[i] > requiredVersion[i];
      }
    }

    return true;
}

function checkCompatible(requiredVersionStr = '1.4.0') {
	if (!is_compatible(requiredVersionStr)) {
		fb.ShowPopupMessage('This script requires v' + requiredVersionStr + '. Current component version is v' + utils.Version + '.');
	}
}

function memoryUsed(bConsole = false) { // In Mbs
	let memUsage = -1;
	if (isCompatible('1.4.0')) {memUsage = round(window.JsMemoryStats.memory_usage/1000000,2);} 
	else {memUsage = round(window.PanelMemoryUsage/1000000,2);} //TODO: Deprecated
	if (bConsole) {console.log(window.Name + ' mem usage: ' + memUsage + 'Mb')}
	return memUsage;
}

/* 
	Booleans
*/

// From Underscore 
function isBoolean(obj) {
   return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
}