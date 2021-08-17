'use strict';
include('helpers_xxx.js');
include('helpers_xxx_properties.js');
include('helpers_xxx_file.js');
include('helpers_xxx_prototypes.js');
include('helpers_xxx_clipboard.js');

function oPlaylist(id, path, name = void(0), extension = void(0), size = '?', fileSize = 0, bLocked = false, bAutoPlaylist = false, queryObj = {query: '', sort: '', bSortForced: false}, category = '', tags = [], trackTags = []) {
	if (typeof extension === 'undefined') {extension = isCompatible('1.4.0') ? utils.SplitFilePath(path)[2] : utils.FileTest(path, 'split')[2];}  //TODO: Deprecated
	if (typeof name === 'undefined') {
		const arr = isCompatible('1.4.0') ? utils.SplitFilePath(path) : utils.FileTest(path, 'split'); //TODO: Deprecated
		name = arr[1].endsWith(arr[2]) ? arr[1].replaceLast(arr[2],'') : arr[1]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
	}
	this.id = id;
	this.name = name;
	this.nameId = (id) ? name + id : name;
	this.extension = extension;
	this.path = path;
	this.size = size;
	this.fileSize = fileSize;
	this.isLocked = bLocked;
	this.isAutoPlaylist = bAutoPlaylist;
	this.query = queryObj['query'];
	this.sort = queryObj['sort'];
	this.bSortForced = queryObj['bSortForced'];
	this.category = category;
	this.tags = isArrayStrings(tags) ? tags : [];
	this.trackTags = isArray(trackTags) ? trackTags : [];
	this.bShow = true; // TODO:
	
}

function loadPlaylistsFromFolder(folderPath = getPropertyByKey(properties, 'playlistPath', prefix)) {
	const playlistPathArray = getFiles(folderPath, readablePlaylistFormats); // Workaround for Win7 bug on extension matching with utils.Glob()
	const playlistPathArray_length = playlistPathArray.length;
	let playlistArray = [];
	let i = 0;
	// let bCreated = false;
	// let newFplIndex = -1;
	while (i < playlistPathArray_length) {
		let name = '';
		var uuid = '';
		var bLocked = false;
		var category = '';
		var tags = [];
		var trackTags = [];
		var size = null;
		if (playlistPathArray[i].endsWith('.m3u8') || playlistPathArray[i].endsWith('.m3u')) { // Schema does not apply for foobar native playlist format
			let text = utils.ReadTextFile(playlistPathArray[i], convertCharsetToCodepage('UTF-8')).split('\r\n');
			if (typeof text !== 'undefined' && text.length >= 1) {
				let commentsText = text.filter(function(e) {return e.startsWith('#');});
				if (typeof commentsText !== 'undefined' && commentsText.length >= 1) { // Use playlist info
					let lines = commentsText.length;
					let lineText = '';
					let j = 0;
					let iFound = 0;
					while (j < lines) {
						let temp = '';
						lineText = commentsText[j];
						if (lineText.startsWith('#PLAYLIST:')) {
							iFound++;
							name = lineText.split(':').slice(1).join(':'); // Name may contain ':' too!
						}
						if (lineText.startsWith('#UUID:')) {
							iFound++;
							uuid = lineText.split(':').slice(1).join(':');
						}
						if (lineText.startsWith('#LOCKED:')) {
							iFound++;
							bLocked = (lineText.split(':')[1] === 'true');
						}
						if (lineText.startsWith('#CATEGORY:')) {
							iFound++;
							category = lineText.split(':').slice(1).join(':');
						}
						if (lineText.startsWith('#TAGS:')) {
							iFound++;
							tags = lineText.split(':').slice(1).join(':').split(';').filter(Boolean); // All values separated by ; as an array
						}
						if (lineText.startsWith('#TRACKTAGS:')) {
							iFound++;
							temp = lineText.split(':').slice(1).join(':');
							trackTags = temp.length ? JSON.parse(lineText.split(':').slice(1).join(':')) : []; // Array of objects
						}
						if (lineText.startsWith('#PLAYLISTSIZE:')) {
							iFound++;
							size = Number(lineText.split(':')[1]);
						}
						if (iFound === 7) {break;}
						j++;
					}
				}
			}			
			if (size === null) { // Or count tracks
				var filteredText = text.filter(function(e) {return !e.startsWith('#');});
				size = filteredText.length;
			}
		} else if (playlistPathArray[i].endsWith('.fpl')) { // AddLocations is async so it doesn't work...
			// Nothing
		} else if (playlistPathArray[i].endsWith('.pls')) {
			let text = utils.ReadTextFile(playlistPathArray[i]).split('\r\n');
			if (typeof text !== 'undefined' && text.length >= 1) {
				let sizeText = text.filter(function(e) {return e.startsWith('NumberOfEntries');});
				if (typeof sizeText !== 'undefined' && sizeText.length >= 1) { // Use playlist info
					size = Number(sizeText[0].split('=')[1]);
				}
			}			
			if (size === null) { // Or count tracks
				let fileText = text.filter(function(e) {return e.startsWith('File');});
				size = fileText.length;
			}	
		}
		let fileSize = isCompatible('1.4.0') ? utils.GetFileSize(playlistPathArray[i]) : utils.FileTest(playlistPathArray[i],'s'); //TODO: Deprecated
		playlistArray[i] = new oPlaylist(uuid, playlistPathArray[i], name.length ? name : void(0), void(0), size !== null ? size : void(0), fileSize, bLocked, void(0), void(0), category.length ? category : void(0), isArrayStrings(tags) ? tags : void(0), isArray(trackTags) ? trackTags : void(0));
		i++;
	}
	// if (bCreated) {plman.RemovePlaylist(newFplIndex);}
	
	return playlistArray;
}

function setTrackTags(trackTags, list, z) {
	let bDone = false;
	const oldTags = list.data[z].trackTags && list.data[z].trackTags.length ? JSON.stringify(list.data[z].trackTags) : '';
	const newTags = trackTags && trackTags.length ? JSON.stringify(trackTags) : '';
	if (oldTags !== newTags) { // Compares objects
		if (list.data[z].isAutoPlaylist || list.data[z].extension === '.fpl') {
			list.editData(list.data[z], {trackTags});
			list.update(true, true);
			list.filter();
			bDone = true;
		} else {
			const old_name = list.data[z].name;
			if (_isFile(list.data[z].path)) {
				delayAutoUpdate();
				bDone = editTextFile(list.data[z].path,'#TRACKTAGS:' + oldTags,'#TRACKTAGS:' + newTags);
				if (!bDone) {
					fb.ShowPopupMessage('Error changing track tag(s) on playlist file: ' + old_name + '\nPath: ' + list.data[z].path, window.Name + '\nTag(s): ' + trackTags);
				} else {
					list.editData(list.data[z], {trackTags});
					list.update(true , true);
					list.filter();
				}
			} else {
				fb.ShowPopupMessage('Playlist file does not exist: ' + old_name + '\nPath: ' + list.data[z].path, window.Name);
			}
		}
	}
	return bDone;
}

function setTag(tags, list, z) {
	let bDone = false;
	if (! new Set(tags).isEqual(new Set(list.data[z].tags))) { // Compares arrays
		if (list.data[z].isAutoPlaylist || list.data[z].extension === '.fpl') {
			list.editData(list.data[z], {tags});
			list.update(true, true);
			const tagState = [...new Set(list.tagState.concat(tags)).intersection(new Set(list.tags()))];
			list.filter({tagState});
			bDone = true;
		} else {
			const old_name = list.data[z].name;
			if (_isFile(list.data[z].path)) {
				delayAutoUpdate();
				bDone = editTextFile(list.data[z].path,'#TAGS:' + list.data[z].tags.join(';'),'#TAGS:' + tags.join(';'));
				if (!bDone) {
					fb.ShowPopupMessage('Error changing tag(s) on playlist file: ' + old_name + '\nPath: ' + list.data[z].path, window.Name + '\nTag(s): ' + tags);
				} else {
					list.editData(list.data[z], {tags});
					list.update(true , true);
					const tagState = [...new Set(list.tagState.concat(tags)).intersection(new Set(list.tags()))];
					list.filter({tagState});
					console.log(tagState)
				}
			} else {
				fb.ShowPopupMessage('Playlist file does not exist: ' + old_name + '\nPath: ' + list.data[z].path, window.Name);
			}
		}
	}
	return bDone;
}

function setCategory(category, list, z) {
	let bDone = false;
	if (list.data[z].category !== category) {
		if (list.data[z].isAutoPlaylist || list.data[z].extension === '.fpl') {
			list.editData(list.data[z], {category});
			// Add new category to current view! (otherwise it gets filtered)
			// Easy way: intersect current view + new one with refreshed list
			list.update(true, true);
			const categoryState = [...new Set(list.categoryState.concat([category])).intersection(new Set(list.categories()))];
			list.filter({categoryState});
			bDone = true;
		} else {
			const old_name = list.data[z].name;
			delayAutoUpdate();
			bDone = editTextFile(list.data[z].path,'#CATEGORY:' + list.data[z].category,'#CATEGORY:' + category);
			if (!bDone) {
				fb.ShowPopupMessage('Error changing category on playlist file: ' + old_name + '\nPath: ' + list.data[z].path, window.Name + '\nCategory: ' + category);
			} else {
				list.editData(list.data[z], {category});
				list.update(true, true);
				// Add new category to current view! (otherwise it gets filtered)
				// Easy way: intersect current view + new one with refreshed list
				const categoryState = [...new Set(list.categoryState.concat([category])).intersection(new Set(list.categories()))];
				list.filter({categoryState});
			}
		}
	}
	return bDone;
}

function switchLock(list, z) {
	let bDone = false;
	const boolText = list.data[z].isLocked ? ['true','false'] : ['false','true'];
	if (list.data[z].isAutoPlaylist || list.data[z].extension === '.fpl') {
		list.editData(list.data[z], {isLocked: !list.data[z].isLocked});
		list.update(true, true);
		list.filter();
		bDone = true;
	} else {
		const old_name = list.data[z].name;
		if (_isFile(list.data[z].path)) {
			delayAutoUpdate();
			bDone = editTextFile(list.data[z].path,'#LOCKED:' + boolText[0],'#LOCKED:' + boolText[1]);
			if (!bDone) {
				fb.ShowPopupMessage('Error changing lock status on playlist file: ' + old_name + '\nPath: ' + list.data[z].path, window.Name);
			} else {
				list.editData(list.data[z], {isLocked: !list.data[z].isLocked});
				list.update(true, true);
				list.filter();
			}
		} else {
			fb.ShowPopupMessage('Playlist file does not exist: ' + old_name + '\nPath: ' + list.data[z].path, window.Name);
		}
	}
	return bDone;
}

function convertToRelPaths(list, z) {
	let bDone = false;
	let answer = WshShell.Popup('Force relative paths to the playlist path, stripping all but the filenames.\nCan be manually undone (look at recycle bin). Are you sure?', 0, window.Name, popup.question + popup.yes_no);
	if (answer === popup.no) {return bDone;}
	const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
	const playlistPath = list.data[z].path;
	const paths = getFilePathsFromPlaylist(playlistPath);
	const relPaths = paths.map((path) => {return '.\\' + path.split('\\').pop();});
	let file = _open(playlistPath);
	paths.forEach((path, i) => {file = file.replace(path, relPaths[i]);});			
	let bDeleted = false;
	if (_isFile(playlistPath)) {
		bDeleted = _recycleFile(playlistPath);
	} else {bDeleted = true;}
	if (bDeleted) {
		bDone = _save(playlistPath, file);
		if (!bDone) {
			fb.ShowPopupMessage('Playlist generation failed while writing file \'' + playlistPath + '\'.', window.Name);
			_restoreFile(playlistPath); // Since it failed we need to restore the original playlist back to the folder!
			return bDone;
		}
		list.editData(list.data[z], {
			fileSize: isCompatible('1.4.0') ? utils.GetFileSize(playlistPath) : utils.FileTest(playlistPath, 's'), //TODO: Deprecated
		});
		console.log('Playlist Manager: done.');
		list.update(true, true); // We have already updated data before only for the variables changed
		list.filter();
	} else {
		fb.ShowPopupMessage('Playlist generation failed when overwriting original playlist file \'' + playlistPath + '\'. May be locked.', window.Name);
		return bDone;
	}
	clearInterval(delay);
	return bDone;
}

// TODO: Use m3u8 as default format if original playlist format is not writable
function exportPlaylistFile(list, z, defPath = '') {
	let bDone = false;
	const playlistPath = list.data[z].path;
	const arr = isCompatible('1.4.0') ? utils.SplitFilePath(playlistPath) : utils.FileTest(playlistPath, 'split'); //TODO: Deprecated
	const playlistName = arr[1].endsWith(arr[2]) ? arr[1] : arr[1] + arr[2]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
	let path = '';
	try {path = utils.InputBox(window.ID, 'Enter destination path:', window.Name,  defPath.length ? defPath + playlistName : playlistPath, true);} 
	catch(e) {return bDone;}
	if (!path.length) {return bDone;}
	if (path === playlistPath) {console.log('Playlist Manager: can\'t export playlist to original path.'); return bDone;}
	bDone = _copyFile(playlistPath, path);
	if (bDone) {_explorer(path); console.log('Playlist Manager: done.');}
	else {fb.ShowPopupMessage('Failed when copying playlist file to \'' + path + '\'. May be locked.', window.Name);}
	return bDone;
}

function exportPlaylistFileWithRelPaths(list, z, ext = '', defPath = '') {
	let bDone = false;
	const playlistPath = list.data[z].path;
	const arr = isCompatible('1.4.0') ? utils.SplitFilePath(playlistPath) : utils.FileTest(playlistPath, 'split'); //TODO: Deprecated
	const playlistName = arr[1].endsWith(arr[2]) ? arr[1] : arr[1] + arr[2]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
	let newPath = '';
	try {newPath = utils.InputBox(window.ID, 'Enter destination path:', window.Name,  defPath.length ? defPath + playlistName : playlistPath, true);} 
	catch(e) {return {bDone, newPath};}
	if (!newPath.length) {return {bDone, newPath};}
	if (newPath === playlistPath) {console.log('Playlist Manager: can\'t export playlist to original path.'); return {bDone, newPath};}
	const paths = getFilePathsFromPlaylist(playlistPath);
	let relPaths = paths.map((path) => {return '.\\' + path.split('\\').pop();});
	if (ext.length) {relPaths = relPaths.map((path) => {return path.split('.').slice(0, -1).concat([ext]).join('.');});}
	let file = _open(playlistPath);
	paths.forEach((path, i) => {file = file.replace(path, relPaths[i]);});
	let bDeleted = false;
	if (_isFile(newPath)) {
		bDeleted = _recycleFile(newPath);
	} else {bDeleted = true;}
	if (bDeleted) {
		bDone = _save(newPath, file);
		if (!bDone) {
			fb.ShowPopupMessage('Playlist generation failed while writing file \'' + newPath + '\'.', window.Name);
			_restoreFile(newPath); // Since it failed we need to restore the original playlist back to the folder!
			return {bDone, newPath, paths};
		}
	} else {
		fb.ShowPopupMessage('Playlist generation failed when overwriting a file \'' + newPath + '\'. May be locked.', window.Name);
		return {bDone, newPath, paths};
	}
	return {bDone, newPath, paths};
}

function exportPlaylistFileWithTracks(list, z, defPath = '') {
	let {bDone = false, newPath, paths} = exportPlaylistFileWithRelPaths(list, z, void(0), defPath);
	if (!newPath.length) {return;}
	if (bDone) {
		const root = isCompatible('1.4.0') ? utils.SplitFilePath(newPath)[0] : utils.FileTest(newPath, 'split')[0]; //TODO: Deprecated
		const report = [];
		const plsRoot = isCompatible('1.4.0') ? utils.SplitFilePath(list.data[z].path)[0] : utils.FileTest(list.data[z].path, 'split')[0]; //TODO: Deprecated
		paths.forEach((trackPath) => {
			const fileName = isCompatible('1.4.0') ? utils.SplitFilePath(trackPath).slice(1).join('') : utils.FileTest(trackPath, 'split')[1]; //TODO: Deprecated
			let bCopy = false;
			if (trackPath.startsWith('.\\')) {bCopy = _copyFile(plsRoot + trackPath.replace('.\\',''), root + fileName);} // Relative with indicator at start
			else if (_isFile(plsRoot + trackPath)) {bCopy = _copyFile(plsRoot + trackPath, root + fileName);} // Relative without indicator
			else if (_isFile(trackPath)) {bCopy = _copyFile(trackPath, root + fileName);} // Absolute 
			if (!bCopy && !_isFile(root + fileName)) {report.push(trackPath);} // Duplicates will fail on successive copying but present at output
		});
		_explorer(newPath);
		if (report.length) {fb.ShowPopupMessage('Failed when copying tracks to \'' + root + '\'.\nTracks not found:\n\n' + report.join('\n'), window.Name);}
		console.log('Playlist Manager: done.');
	} else {fb.ShowPopupMessage('Failed when copying playlist file to \'' + newPath + '\'.', window.Name);}
	return bDone;
}

function exportPlaylistFileWithTracksConvert(list, z, tf = '%filename%.mp3', preset = '...', defPath = '') {
	fb.ShowPopupMessage('Playlist file will be exported to selected path. Track filenames will be changed according to the TF expression set at configuration.\n\nNote the TF expression should match whatever preset is used at the converter panel, otherwise actual filenames will not match with those on exported playlist.\n\nSame comment applies to the destination path, the tracks at the converter panel should be output to the same path the playlist file was exported to...\n\nConverter preset, filename TF and default path can be set at configuration (header menu). Default preset uses the one which requires user input. It\'s recommended to create a new preset for this purpose and set the output folder to be asked at conversion step.', window.Name);
	let bDone = false;
	const playlistPath = list.data[z].path;
	const arr = isCompatible('1.4.0') ? utils.SplitFilePath(playlistPath) : utils.FileTest(playlistPath, 'split'); //TODO: Deprecated
	const playlistName = arr[1].endsWith(arr[2]) ? arr[1] : arr[1] + arr[2]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
	// Set output
	let newPath = '';
	try {newPath = utils.InputBox(window.ID, 'Current preset: ' + preset + ' --> ' + tf + '\n\nEnter destination path:\n(root will be copied to clipboard)', window.Name, defPath.length ? defPath + playlistName : playlistPath, true);} 
	catch(e) {return bDone;}
	if (!newPath.length) {return bDone;}
	if (newPath === playlistPath) {console.log('Playlist Manager: can\'t export playlist to original path.'); return bDone;}
	// Get tracks
	const paths = getFilePathsFromPlaylist(playlistPath);
	const root = isCompatible('1.4.0') ? utils.SplitFilePath(newPath)[0] : utils.FileTest(newPath, 'split')[0]; //TODO: Deprecated
	_setClipboardData(root);
	const report = [];
	paths.forEach((trackPath) => {if (!_isFile(trackPath)) {report.push(trackPath);}});
	const handleList = getHandlesFromPlaylist(playlistPath, list.playlistsPath, true); // Omit not found
	if (handleList && handleList.Count) {
		// Convert tracks
		fb.RunContextCommandWithMetadb("Convert/" + preset, handleList, 8);
		if (handleList.Count !== paths.length) {fb.ShowPopupMessage('Failed when converting tracks to \'' + root + '\'.\nTracks not found:\n\n' + report.join('\n'), window.Name);}
		// Copy playlist file
		const fileNames = fb.TitleFormat(tf).EvalWithMetadbs(handleList);
		if (!isArrayStrings(fileNames)) {
			fb.ShowPopupMessage('Playlist generation failed while guessing new filenames:\n\n' + fileNames.join('\n'), window.Name);
			return bDone;
		}
		let relPaths = paths.map((_, i) => {return '.\\' + fileNames[i];});
		let file = _open(playlistPath);
		paths.forEach((path, i) => {file = file.replace(path, relPaths[i]);});
		let bDeleted = false;
		if (_isFile(newPath)) {
			bDeleted = _recycleFile(newPath);
		} else {bDeleted = true;}
		if (bDeleted) {
			bDone = _save(newPath, file);
			if (!bDone) {
				fb.ShowPopupMessage('Playlist generation failed while writing file \'' + newPath + '\'.', window.Name);
				_restoreFile(newPath); // Since it failed we need to restore the original playlist back to the folder!
			}
		} else {
			fb.ShowPopupMessage('Playlist generation failed when overwriting a file \'' + newPath + '\'. May be locked.', window.Name);
			return bDone
		}
		_explorer(newPath);
		console.log('Playlist Manager: done.');
	}
	return bDone;
}

function cycleCategories() {
	const options = ['All', ...list.categories()];
	let idx = 0; // All is the default
	if (list.categoryState.length === 1) { // If there is currently only one category selected then use the next one
		idx = options.indexOf(list.categoryState[0]);
		idx++;
	}
	else if (isArrayEqual(list.categoryState,list.categories())) {idx++;} // If it's already showing all categories, then use the first one
	if (idx >= options.length) {idx = 0;} // And cycle
	const categoryState = idx ? [options[idx]] : options.slice(1);
	list.filter({categoryState});
}