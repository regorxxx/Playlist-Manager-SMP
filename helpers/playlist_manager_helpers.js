'use strict';
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx_properties.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx_file.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx_prototypes.js');

function oPlaylist (id, path, name = void(0), extension = void(0), size = '?', fileSize = 0, bLocked = false, bAutoPlaylist = false, queryObj = {query: '', sort: '', bSortForced: false}, category = '', tags = []) {
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
	this.bShow = true; // TODO:
	
}

function loadPlaylistsFromFolder (folderPath = getPropertyByKey(properties, 'playlistPath', prefix)) {
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
						lineText = commentsText[j];
						if (lineText.startsWith('#PLAYLIST:')) {
							iFound++;
							name = lineText.split(':')[1];
						}
						if (lineText.startsWith('#UUID:')) {
							iFound++;
							uuid = lineText.split(':')[1];
						}
						if (lineText.startsWith('#LOCKED:')) {
							iFound++;
							bLocked = (lineText.split(':')[1] === 'true');
						}
						if (lineText.startsWith('#CATEGORY:')) {
							iFound++;
							category = lineText.split(':')[1];
						}
						if (lineText.startsWith('#TAGS:')) {
							iFound++;
							tags = lineText.split(':')[1].split(';').filter(Boolean); // All values separated by ; as an array
						}
						if (lineText.startsWith('#PLAYLISTSIZE:')) {
							iFound++;
							size = Number(lineText.split(':')[1]);
						}
						if (iFound === 6) {break;}
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
		playlistArray[i] = new oPlaylist(uuid, playlistPathArray[i], name.length ? name : void(0), void(0), size !== null ? size : void(0), fileSize, bLocked, void(0), void(0), category.length ? category : void(0), isArrayStrings(tags) ? tags : void(0));
		i++;
	}
	// if (bCreated) {plman.RemovePlaylist(newFplIndex);}
	
	return playlistArray;
}