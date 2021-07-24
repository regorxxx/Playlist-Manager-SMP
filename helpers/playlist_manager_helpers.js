'use strict';
include('helpers_xxx.js');
include('helpers_xxx_properties.js');
include('helpers_xxx_file.js');
include('helpers_xxx_prototypes.js');

function oPlaylist(id, path, name = void(0), extension = void(0), size = '?', fileSize = 0, bLocked = false, bAutoPlaylist = false, queryObj = {query: '', sort: '', bSortForced: false}, category = '', tags = [], trackTags = []) {
	if (typeof extension === 'undefined') {extension = isCompatible('1.4.0') ? utils.SplitFilePath(path)[2] : utils.FileTest(path, 'split')[2];}  //TODO: Deprecated
	if (typeof name === 'undefined') {
		const arr = isCompatible('1.4.0') ? utils.SplitFilePath(path) : utils.FileTest(path, 'split'); //TODO: Deprecated
		name = arr[1];
		if (name.endsWith(arr[2])) {name = name.replaceLast(arr[2],'');} // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
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
			list.editData(list.data[z], {
				trackTags: trackTags,
			});
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
					list.editData(list.data[z], {
						trackTags: trackTags,
					});
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
			list.editData(list.data[z], {
				tags: tags,
			});
			list.update(true, true);
			list.filter();
			bDone = true;
		} else {
			const old_name = list.data[z].name;
			if (_isFile(list.data[z].path)) {
				delayAutoUpdate();
				bDone = editTextFile(list.data[z].path,'#TAGS:' + list.data[z].tags.join(';'),'#TAGS:' + tags.join(';'));
				if (!bDone) {
					fb.ShowPopupMessage('Error changing tag(s) on playlist file: ' + old_name + '\nPath: ' + list.data[z].path, window.Name + '\nTag(s): ' + tags);
				} else {
					list.editData(list.data[z], {
						tags: tags,
					});
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

function setCategory(category, list, z) {
	let bDone = false;
	if (list.data[z].category !== category) {
		if (list.data[z].isAutoPlaylist || list.data[z].extension === '.fpl') {
			list.editData(list.data[z], {
				category: category,
			});
			// Add new category to current view! (otherwise it gets filtered)
			// Easy way: intersect current view + new one with refreshed list
			list.categoryState = [...new Set(list.categoryState.push(category)).intersection(new Set(list.categories()))];
			list.properties['categoryState'][1] =  JSON.stringify(list.categoryState);
			overwriteProperties(list.properties);
			list.update(true, true);
			list.filter();
			bDone = true;
		} else {
			const old_name = list.data[z].name;
			delayAutoUpdate();
			bDone = editTextFile(list.data[z].path,'#CATEGORY:' + list.data[z].category,'#CATEGORY:' + category);
			if (!bDone) {
				fb.ShowPopupMessage('Error changing category on playlist file: ' + old_name + '\nPath: ' + list.data[z].path, window.Name + '\nCategory: ' + category);
			} else {
				list.editData(list.data[z], {
					category: category,
				});
				// Add new category to current view! (otherwise it gets filtered)
				// Easy way: intersect current view + new one with refreshed list
				list.categoryState = [...new Set(list.categoryState.concat([category])).intersection(new Set(list.categories()))];
				list.properties['categoryState'][1] =  JSON.stringify(list.categoryState);
				list.update(true, true);
				list.filter();
			}
		}
	}
	return bDone;
}

function switchLock(list, z) {
	let bDone = false;
	const boolText = list.data[z].isLocked ? ['true','false'] : ['false','true'];
	if (list.data[z].isAutoPlaylist || list.data[z].extension === '.fpl') {
		list.editData(list.data[z], {
			isLocked: !list.data[z].isLocked,
		});
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
				list.editData(list.data[z], {
					isLocked: !list.data[z].isLocked,
				});
				list.update(true, true);
				list.filter();
			}
		} else {
			fb.ShowPopupMessage('Playlist file does not exist: ' + old_name + '\nPath: ' + list.data[z].path, window.Name);
		}
	}
	return bDone;
}