'use strict';
//29/10/25

/* exported loadPlaylistsFromFolder, setTrackTags, setCategory, setPlaylist_mbid, switchLock, switchLockUI, convertToRelPaths, getFilePathsFromPlaylist, cloneAsAutoPls, cloneAsSmartPls, cloneAsStandardPls, findFormatErrors, clonePlaylistMergeInUI, clonePlaylistFile, exportPlaylistFile, exportPlaylistFiles, exportPlaylistFileWithTracks, exportPlaylistFileWithTracksConvert, exportAutoPlaylistFileWithTracksConvert, renamePlaylist, renameFolder, cycleCategories, cycleTags, rewriteXSPQuery, rewriteXSPSort, rewriteXSPLimit, findMixedPaths, backup, findExternal, findSubSongs, findBlank, findDurationMismatch, findSizeMismatch, findDuplicatesByPath, findDead, findCircularReferences, findDuplicatesByTF */

/* global list:readable, delayAutoUpdate:readable */
include(fb.ComponentPath + 'docs\\Codepages.js');
include('..\\..\\helpers\\helpers_xxx.js');
/* global popup:readable, clone:readable, globQuery:readable,globTags:readable */
include('..\\..\\helpers\\helpers_xxx_properties.js');
include('..\\..\\helpers\\helpers_xxx_file.js');
/* global _isFile:readable, _copyFile:readable, _recycleFile:readable, WshShell:readable, _open:readable, utf8:readable, getFiles:readable, checkCodePage:readable, getFileMeta:readable, editTextFile:readable, _renameFile:readable, _deleteFile:readable, _save:readable, _restoreFile:readable, _isLink:readable, sanitizePath:readable, findRelPathInAbsPath:readable, testPath:readable, absPathRegExp:readable */
include('..\\..\\helpers\\helpers_xxx_file_zip.js');
/* global _zip:readable */
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
/* global isArrayStrings:readable, isArray:readable, sanitize:readable, _p:readable, nextId:readable, isArrayEqual:readable, round:readable, _ps:readable */
include('..\\..\\helpers\\helpers_xxx_clipboard.js');
/* global _setClipboardData:readable */
include('..\\..\\helpers\\helpers_xxx_playlists.js');
/* global getPlaylistIndexArray:readable, getHandlesFromPlaylist:readable, getHandlesFromUIPlaylists:readable, setLocks:readable  */
include('..\\..\\helpers\\helpers_xxx_playlists_files.js');
/* global loadablePlaylistFormats:readable, fplCache:readable, xmlDomCache:readable , getFilePathsFromPlaylist:readable, _explorer:readable, savePlaylist:readable, xspCache:readable, xspfCache:readable, arePathsInMediaLibrary:readable, pathTF:readable, loadXspPlaylist:readable, getHandlesFromPlaylistV2:readable */
include('..\\..\\helpers\\helpers_xxx_playlists_files_fpl.js');
/* global FPL:readable */
include('..\\..\\helpers\\helpers_xxx_playlists_files_xsp.js');
/* global XSP:readable */
include('..\\..\\helpers\\helpers_xxx_playlists_files_xspf.js');
/* global XSPF:readable */
include('..\\..\\helpers\\helpers_xxx_tags.js');
/* global checkQuery:readable, getSortObj:readable, stripSort:readable, subsongRegex:readable, isSubsongPath:readable */
include('..\\filter_and_query\\remove_duplicates.js');
/* global removeDuplicates:readable, showDuplicates:readable */

function PlaylistObj({ id, path, name = void (0), extension = void (0), size = '?', fileSize = 0, bLocked = false, bAutoPlaylist = false, queryObj = { query: '', sort: '', bSortForced: false }, category = '', tags = [], trackTags = [], limit = 0, duration = -1, playlist_mbid = '', author = 'Playlist-Manager-SMP', description = '', type = '', created = -1, modified = -1, trackSize = -1 } = {}) {
	if (path && (typeof extension === 'undefined' || typeof name === 'undefined')) {
		const sfp = utils.SplitFilePath(path);
		if (typeof extension === 'undefined') { extension = sfp[2]; }
		if (typeof name === 'undefined') { name = sfp[1]; }
	}
	this.id = id || '';
	this.name = name || '';
	this.nameId = (id) ? this.name + id : this.name;
	this.extension = (extension || '').toLowerCase();
	this.path = path || '';
	this.size = size;
	this.fileSize = fileSize;
	this.trackSize = round(trackSize, 2);
	this.isLocked = bLocked;
	this.isAutoPlaylist = bAutoPlaylist;
	this.query = queryObj['query'];
	this.sort = queryObj['sort'];
	this.bSortForced = queryObj['bSortForced'];
	this.category = category;
	this.tags = isArrayStrings(tags) ? tags : [];
	this.trackTags = isArray(trackTags) ? trackTags : [];
	this.limit = Number.isFinite(limit) ? limit : 0;
	this.duration = Number.isFinite(duration) ? round(duration, 2) : -1;
	this.playlist_mbid = playlist_mbid;
	this.author = author;
	this.description = description;
	this.created = created;
	this.modified = modified;
	if (this.extension === '.xsp') { this.type = type || ''; }
}

function loadPlaylistsFromFolder(folderPath = '', bProfile = true) {
	const test = bProfile ? new FbProfiler(window.Name + _ps(window.ScriptInfo.Name) + ': ' + 'loadPlaylistsFromFolder') : true;
	if (!folderPath.length && typeof list !== 'undefined') { folderPath = list.playlistsPath; }
	if (typeof xspCache !== 'undefined') { xspCache.clear(); }
	if (typeof xspfCache !== 'undefined') { xspfCache.clear(); }
	if (typeof xmlDomCache !== 'undefined') { xmlDomCache.clear(); }
	const playlistPathArray = getFiles(folderPath, loadablePlaylistFormats); // Workaround for Win7 bug on extension matching with utils.Glob()
	const playlistPathArrayLength = playlistPathArray.length;
	let playlistArray = [];
	for (let i = 0; i < playlistPathArrayLength; i++) {
		const file = playlistPathArray[i];
		if (!_isFile(file)) { continue; } // In some rare cases a file may have been deleted while updating the others leading to a crash otherwise...
		const extension = '.' + file.split('.').pop().toLowerCase();
		let name = '';
		let uuid = '';
		let bLocked = false;
		let category = '';
		let tags = [];
		let trackTags = [];
		let size = null;
		let queryObj = null;
		let limit = null;
		let duration = null;
		let trackSize = null;
		let playlist_mbid = '';
		let author = '';
		let description = '';
		let type = null;
		let created = -1;
		let modified = -1;
		const fileSize = utils.GetFileSize(file);
		const fileMeta = getFileMeta(file, true);
		if (fileMeta) {
			created = fileMeta.created;
			modified = fileMeta.modified;
		}
		if (extension === '.m3u8' || extension === '.m3u') { // Schema does not apply for foobar2000 native playlist format
			let text = _open(file).split(/\r\n|\n\r|\n|\r/);
			if (typeof text !== 'undefined' && text.length >= 1) {
				// Safe checks to ensure proper UTF-8 and codepage detection
				const codePage = checkCodePage(text, extension);
				if (codePage !== -1) { text = _open(file, codePage).split(/\r\n|\n\r|\n|\r/); }
				let commentsText = text.filter(function (e) { return e.startsWith('#'); });
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
						if (lineText.startsWith('#DURATION:')) {
							iFound++;
							duration = round(Number(lineText.split(':')[1]), 2);
						}
						if (lineText.startsWith('#PLAYLIST_MBID:')) {
							iFound++;
							playlist_mbid = lineText.split(':').slice(1).join(':');
						}
						if (lineText.startsWith('#AUTHOR:')) {
							iFound++;
							author = lineText.split(':').slice(1).join(':');
						}
						if (lineText.startsWith('#DESCRIPTION:')) {
							iFound++;
							description = lineText.split(':').slice(1).join(':');
						}
						if (iFound === 11 || !lineText.startsWith('#')) { break; }
						j++;
					}
				}
			}
			if (size === null) { // Or count tracks
				const filteredText = text.filter(function (e) { return !e.startsWith('#'); });
				size = filteredText.length;
			}
		} else if (extension === '.fpl') { // AddLocations is async so it doesn't work...
			const jspf = FPL.parseFile(file);
			if (Object.hasOwn(jspf, 'playlist') && jspf.playlist) {
				const jPls = jspf.playlist;
				name = Object.hasOwn(jPls, 'title') && jPls.title ? jPls.title : '';
				if (Object.hasOwn(jPls, 'meta') && Array.isArray(jPls.meta) && jPls.meta.length) {
					for (let metaData of jPls.meta) {
						if (Object.hasOwn(metaData, 'uuid')) { uuid = metaData.uuid ? metaData.uuid : ''; }
						if (Object.hasOwn(metaData, 'category')) { category = metaData.category ? metaData.category : ''; }
						if (Object.hasOwn(metaData, 'tags')) { tags = metaData.tags ? metaData.tags.split(';') : []; }
						if (Object.hasOwn(metaData, 'trackTags')) { trackTags = metaData.trackTags ? JSON.parse(metaData.trackTags) : []; }
						if (Object.hasOwn(metaData, 'playlistSize')) { size = typeof metaData.playlistSize !== 'undefined' ? Number(metaData.playlistSize) : null; }
						if (Object.hasOwn(metaData, 'duration')) { duration = typeof metaData.duration !== 'undefined' ? round(Number(metaData.duration), 2) : null; }
						if (Object.hasOwn(metaData, 'playlist_mbid')) { playlist_mbid = metaData.playlist_mbid ? metaData.playlist_mbid : ''; }
					}
				}
				if (Object.hasOwn(jPls, 'author')) { author = jPls.author; }
				if (Object.hasOwn(jPls, 'annotation')) { description = jPls.description; }
			}
			fplCache.set(file, jspf);
		} else if (extension === '.pls') {
			let text = _open(file).split(/\r\n|\n\r|\n|\r/);
			if (typeof text !== 'undefined' && text.length >= 1) {
				let sizeText = text.filter(function (e) { return e.startsWith('NumberOfEntries'); });
				if (typeof sizeText !== 'undefined' && sizeText.length >= 1) { // Use playlist info
					size = Number(sizeText[0].split('=')[1]);
				}
			}
			if (size === null) { // Or count tracks
				let fileText = text.filter(function (e) { return e.startsWith('File'); });
				size = fileText.length;
			}
		} else if (extension === '.strm') {
			let text = _open(file).split(/\r\n|\n\r|\n|\r/);
			if (typeof text !== 'undefined') {
				size = text.filter(Boolean).length;
				if (size > 1) { fb.ShowPopupMessage('.strm playlist can\'t contain multiple items: ' + file, window.Name + _ps(window.ScriptInfo.Name)); }
				bLocked = true; // Always locked by default
			}
		} else if (extension === '.xspf') {
			let text = _open(file);
			if (typeof text !== 'undefined') {
				const codePage = checkCodePage(text, extension);
				if (codePage !== -1) { text = _open(file, codePage); }
				const xmldom = XSPF.XMLfromString(text);
				const jspf = XSPF.toJSPF(xmldom, false);
				if (Object.hasOwn(jspf, 'playlist') && jspf.playlist) {
					const jPls = jspf.playlist;
					name = Object.hasOwn(jPls, 'title') && jPls.title ? jPls.title : '';
					if (Object.hasOwn(jPls, 'meta') && Array.isArray(jPls.meta) && jPls.meta.length) {
						let bLockedFound = false;
						for (let metaData of jPls.meta) {
							if (Object.hasOwn(metaData, 'uuid')) { uuid = metaData.uuid ? metaData.uuid : ''; }
							if (Object.hasOwn(metaData, 'locked')) { bLocked = metaData.locked && metaData.locked.length ? metaData.locked === 'true' : true; bLockedFound = true; }
							if (Object.hasOwn(metaData, 'category')) { category = metaData.category ? metaData.category : ''; }
							if (Object.hasOwn(metaData, 'tags')) { tags = metaData.tags ? metaData.tags.split(';') : []; }
							if (Object.hasOwn(metaData, 'trackTags')) { trackTags = metaData.trackTags ? JSON.parse(metaData.trackTags) : []; }
							if (Object.hasOwn(metaData, 'playlistSize')) { size = typeof metaData.playlistSize !== 'undefined' ? Number(metaData.playlistSize) : null; }
							if (Object.hasOwn(metaData, 'duration')) { duration = typeof metaData.duration !== 'undefined' ? round(Number(metaData.duration), 2) : null; }
							if (Object.hasOwn(metaData, 'playlist_mbid')) { playlist_mbid = metaData.playlist_mbid ? metaData.playlist_mbid : ''; }
						}
						if (!bLockedFound) { bLocked = true; } // Locked by default if meta not present
					}
					else if (Object.hasOwn(jPls, 'identifier') && jPls.identifier && jPls.identifier.startsWith('https://listenbrainz.org/playlist/')) {
						playlist_mbid = jPls.identifier.replace('https://listenbrainz.org/playlist/', ''); // MBID for playlists retrieved from ListenBrainz
					}
					if (Object.hasOwn(jPls, 'author')) { author = jPls.author; }
					if (Object.hasOwn(jPls, 'annotation')) { description = jPls.description; }
					if (size === null) { size = Object.hasOwn(jPls, 'track') && jPls.track ? jPls.track.length : null; } // Prefer playlist info over track count
					else if (Object.hasOwn(jPls, 'track') && jPls.track && size !== jPls.track.length) { fb.ShowPopupMessage('.xspf playlist size mismatch: ' + file + '\nReported size (' + size + ') is not equal to track count (' + jPls.track.length + ')', window.Name + _ps(window.ScriptInfo.Name)); }
				}
				xmlDomCache.set(file, xmldom);
			}
		} else if (extension === '.xsp') {
			let text = _open(file);
			if (typeof text !== 'undefined') {
				const codePage = checkCodePage(text, extension);
				if (codePage !== -1) { text = _open(file, codePage); }
				const xmldom = XSP.XMLfromString(text);
				const jsp = XSP.toJSP(xmldom, false);
				if (Object.hasOwn(jsp, 'playlist') && jsp.playlist) {
					const jPls = jsp.playlist;
					name = Object.hasOwn(jPls, 'name') && jPls.name ? jPls.name : '';
					queryObj = { query: XSP.getQuery(jsp), sort: XSP.getSort(jsp), bSortForced: false };
					bLocked = true;
					limit = Object.hasOwn(jPls, 'limit') && jPls.limit ? jPls.limit : 0;
					type = Object.hasOwn(jPls, 'type') && jPls.type ? jPls.type : '';
				}
				xmlDomCache.set(file, xmldom);
			}
		}
		playlistArray[i] = new PlaylistObj({
			id: uuid,
			path: file,
			name: name.length ? name : void (0), // Pass undefined to retrieve from path
			extension,
			size: size !== null ? size : void (0),
			fileSize,
			bLocked,
			bAutoPlaylist: false,
			queryObj: queryObj || void (0),
			category,
			tags: isArrayStrings(tags) ? tags : void (0),
			trackTags: isArray(trackTags) ? trackTags : void (0),
			limit: Number.isFinite(limit) ? limit : void (0),
			duration: Number.isFinite(duration) ? duration : void (0),
			trackSize: Number.isFinite(trackSize) ? trackSize : void (0),
			playlist_mbid,
			author,
			description,
			type: extension === '.xsp' && type !== null ? type : void (0),
			created,
			modified
		});
	}
	if (bProfile) { test.Print(); }
	return playlistArray;
}

function setTrackTags(trackTags, list, z) {
	let bDone = false;
	const pls = list.data[z];
	if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
		fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		return bDone;
	}
	if (pls.isFolder) { return bDone; }
	const extension = pls.extension;
	const oldTags = pls.trackTags && pls.trackTags.length ? JSON.stringify(pls.trackTags) : '';
	const newTags = trackTags && trackTags.length ? JSON.stringify(trackTags) : '';
	if (oldTags !== newTags) { // Compares objects
		if (pls.extension === '.ui' || pls.extension === '.strm' || pls.extension === '.pls') {
			console.log('Playlist Manager: Playlist\'s track tags can not be edited due to format ' + pls.extension);
		} else if (pls.isAutoPlaylist || extension === '.fpl' || extension === '.xsp') {
			list.editData(pls, { trackTags, modified: Date.now() });
			list.update({ bReuseData: true, bNotPaint: true });
			list.filter();
			bDone = true;
		} else {
			const name = pls.name;
			const path = pls.path;
			if (_isFile(path)) {
				// Backup
				const backPath = path + '.back';
				_copyFile(path, backPath);
				delayAutoUpdate();
				let reason = -1;
				if (extension === '.m3u' || extension === '.m3u8') { [bDone, reason] = editTextFile(path, '#TRACKTAGS:' + oldTags, '#TRACKTAGS:' + newTags, list.bBOM); }
				else if (extension === '.xspf') { [bDone, reason] = editTextFile(path, '<meta rel="tags">' + oldTags, '<meta rel="tags">' + newTags, list.bBOM); }
				if (bDone) { list.editData(pls, { fileSize: utils.GetFileSize(path) }); }
				if (!bDone && reason === 1) {
					bDone = rewriteHeader(list, pls);
					if (bDone) { setTag(trackTags, list, z); return; }
				}
				if (!bDone) {
					fb.ShowPopupMessage('Error changing track tag(s) on playlist file: ' + name + '\nTag(s): ' + trackTags + '\n\nPath: ' + path + '\n\nRestoring backup...', window.Name + _ps(window.ScriptInfo.Name));
					_renameFile(backPath, path); // Restore backup in case something goes wrong
					console.log('Playlist manager: Restoring backup...');
				} else {
					if (_isFile(backPath)) { _deleteFile(backPath); }
					list.editData(pls, { trackTags, modified: Date.now() });
					list.update({ bReuseData: true, bNotPaint: true });
					list.filter();
				}
			} else {
				fb.ShowPopupMessage('Playlist file does not exist: ' + pls.name + '\nPath: ' + path, window.Name + _ps(window.ScriptInfo.Name));
			}
		}
	}
	return bDone;
}

function setTag(tags, list, z) {
	let bDone = false;
	const pls = list.data[z];
	const extension = pls.extension;
	if (!new Set(tags).isEqual(new Set(pls.tags))) { // Compares arrays
		if (pls.isAutoPlaylist || extension === '.fpl' || extension === '.xsp' || pls.extension === '.ui' || pls.isFolder) {
			list.editData(pls, { tags, modified: Date.now() });
			list.update({ bReuseData: true, bNotPaint: true });
			const tagState = [...new Set(list.tagState.concat(tags)).intersection(new Set(list.tags()))];
			list.filter({ tagState });
			bDone = true;
		} else if (pls.extension === '.strm') {
			console.log('Playlist Manager: Playlist\'s tags can not be edited due to format ' + pls.extension);
		} else {
			const name = pls.name;
			const path = pls.path;
			if (_isFile(path)) {
				// Backup
				const backPath = path + '.back';
				_copyFile(path, backPath);
				delayAutoUpdate();
				let reason = -1;
				if (extension === '.m3u' || extension === '.m3u8') { [bDone, reason] = editTextFile(path, '#TAGS:' + pls.tags.join(';'), '#TAGS:' + tags.join(';'), list.bBOM); }
				else if (extension === '.xspf') { [bDone, reason] = editTextFile(path, '<meta rel="tags">' + pls.tags.join(';'), '<meta rel="tags">' + tags.join(';'), list.bBOM); }
				if (bDone) { list.editData(pls, { fileSize: utils.GetFileSize(path) }); }
				if (!bDone && reason === 1) {
					bDone = rewriteHeader(list, pls);
					if (bDone) { setTag(tags, list, z); return; }
				}
				if (!bDone) {
					fb.ShowPopupMessage('Error changing tag(s) on playlist file: ' + name + '\nTag(s): ' + tags + '\n\nPath: ' + path + '\n\nRestoring backup...', window.Name + _ps(window.ScriptInfo.Name));
					_renameFile(backPath, path); // Restore backup in case something goes wrong
					console.log('Playlist manager: Restoring backup...');
				} else {
					if (_isFile(backPath)) { _deleteFile(backPath); }
					list.editData(pls, { tags, modified: Date.now() });
					list.update({ bReuseData: true, bNotPaint: true });
					const tagState = [...new Set(list.tagState.concat(tags)).intersection(new Set(list.tags()))];
					list.filter({ tagState });
				}
			} else {
				fb.ShowPopupMessage('Playlist file does not exist: ' + name + '\nPath: ' + path, window.Name + _ps(window.ScriptInfo.Name));
			}
		}
	}
	// Rebuild dynamic menus if needed
	if (bDone && (tags.includes('bSkipMenu') || pls.tags.includes('bSkipMenu')) && list.iDynamicMenus > 0) { list.createMainMenuDynamic().then(() => list.exportPlaylistsInfo()); }
	if (bDone && (tags.includes('bPinnedFirst') || pls.tags.includes('bPinnedLast')) && list.bApplyAutoTags) { list.sort(); }
	return bDone;
}

function setCategory(category, list, z) {
	let bDone = false;
	const pls = list.data[z];
	const extension = pls.extension;
	if (extension === '.strm') { return bDone; }
	if (pls.category !== category) {
		if (pls.isAutoPlaylist || extension === '.fpl' || extension === '.xsp' || extension === '.ui' || pls.isFolder) {
			list.editData(pls, { category, modified: Date.now() });
			// Add new category to current view! (otherwise it gets filtered)
			// Easy way: intersect current view + new one with refreshed list
			list.update({ bReuseData: true, bNotPaint: true });
			const categoryState = [...new Set(list.categoryState.concat([category])).intersection(new Set(list.categories()))];
			list.filter({ categoryState });
			bDone = true;
		} else if (pls.extension === '.ui' || pls.extension === '.strm' || pls.extension === '.pls') {
			console.log('Playlist Manager: Playlist\'s category can not be edited due to format ' + pls.extension);
		} else {
			const name = pls.name;
			const path = pls.path;
			if (_isFile(path)) {
				// Backup
				const backPath = path + '.back';
				_copyFile(path, backPath);
				delayAutoUpdate();
				let reason = -1;
				if (extension === '.m3u' || extension === '.m3u8') { [bDone, reason] = editTextFile(path, '#CATEGORY:' + pls.category, '#CATEGORY:' + category, list.bBOM); }
				else if (extension === '.xspf') { [bDone, reason] = editTextFile(path, '<meta rel="category">' + pls.category, '<meta rel="category">' + category, list.bBOM); }
				if (bDone) { list.editData(pls, { fileSize: utils.GetFileSize(path) }); }
				if (!bDone && reason === 1) {
					bDone = rewriteHeader(list, pls);
					if (bDone) { setCategory(category, list, z); return; }
				}
				if (!bDone) {
					fb.ShowPopupMessage('Error changing category on playlist file: ' + name + '\nCategory: ' + category + '\n\nPath: ' + path + '\n\nRestoring backup...', window.Name + _ps(window.ScriptInfo.Name));
					_renameFile(backPath, path); // Restore backup in case something goes wrong
					console.log('Playlist manager: Restoring backup...');
				} else {
					if (_isFile(backPath)) { _deleteFile(backPath); }
					list.editData(pls, { category, modified: Date.now() });
					list.update({ bReuseData: true, bNotPaint: true });
					// Add new category to current view! (otherwise it gets filtered)
					// Easy way: intersect current view + new one with refreshed list
					const categoryState = [...new Set(list.categoryState.concat([category])).intersection(new Set(list.categories()))];
					list.filter({ categoryState });
				}
			} else {
				fb.ShowPopupMessage('Playlist file does not exist: ' + name + '\nPath: ' + path, window.Name + _ps(window.ScriptInfo.Name));
			}
		}
	}
	return bDone;
}

function setPlaylist_mbid(playlist_mbid, list, pls) {
	let bDone = false;
	const extension = pls.extension;
	if (pls.isFolder) { return bDone; }
	if (playlist_mbid !== pls.playlist_mbid) {
		if (pls.extension === '.ui' || pls.extension === '.strm') {
			console.log('Playlist Manager: Playlist\'s mbid can not be edited due to format ' + pls.extension);
		} else if (pls.isAutoPlaylist || extension === '.fpl' || extension === '.xsp') {
			if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
				fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
				return bDone;
			}
			list.editData(pls, { playlist_mbid, modified: Date.now() });
			list.update({ bReuseData: true, bNotPaint: true });
			bDone = true;
		} else {
			const name = pls.name;
			const path = pls.path;
			if (_isFile(path)) {
				// Backup
				const backPath = path + '.back';
				_copyFile(path, backPath);
				delayAutoUpdate();
				let reason = -1;
				if (extension === '.m3u' || extension === '.m3u8') { [bDone, reason] = editTextFile(path, '#PLAYLIST_MBID:' + pls.playlist_mbid, '#PLAYLIST_MBID:' + playlist_mbid, list.bBOM); }
				else if (extension === '.xspf') {
					[bDone, reason] = editTextFile(path, '<meta rel="playlist_mbid">' + pls.playlist_mbid, '<meta rel="playlist_mbid">' + playlist_mbid, list.bBOM);
					if (bDone) { // Force both metadata tags
						[bDone, reason] = editTextFile(path, '<identifier>' + pls.playlist_mbid, '<identifier>' + 'https://listenbrainz.org/playlist/' + playlist_mbid, list.bBOM);
					}
				}
				if (bDone) { list.editData(pls, { fileSize: utils.GetFileSize(path) }); }
				if (!bDone && reason === 1) {
					bDone = rewriteHeader(list, pls);
					if (bDone) { setPlaylist_mbid(playlist_mbid, list, pls); return; }
				}
				if (!bDone) {
					fb.ShowPopupMessage('Error changing playlist_mbid on playlist file: ' + name + '\nplaylist_mbid: ' + playlist_mbid + '\n\nPath: ' + path + '\n\nRestoring backup...', window.Name + _ps(window.ScriptInfo.Name));
					_renameFile(backPath, path); // Restore backup in case something goes wrong
					console.log('Playlist manager: Restoring backup...');
				} else {
					if (_isFile(backPath)) { _deleteFile(backPath); }
					list.editData(pls, { playlist_mbid, modified: Date.now() });
					list.update({ bReuseData: true, bNotPaint: true });
				}
			} else {
				fb.ShowPopupMessage('Playlist file does not exist: ' + name + '\nPath: ' + path, window.Name + _ps(window.ScriptInfo.Name));
			}
		}
	}
	return bDone;
}

function switchLock(list, z, bAlsoHidden = false) {
	if (z < 0 || (!bAlsoHidden && z >= list.items) || (bAlsoHidden && z >= list.itemsAll)) {
		console.log('Playlist Manager: Error editing playlist. Index out of bounds.');
		return false;
	}
	let bDone = false;
	const pls = bAlsoHidden ? list.dataAll[z] : list.data[z];
	const boolText = pls.isLocked ? ['true', 'false'] : ['false', 'true'];
	if (pls.extension === '.ui' || pls.extension === '.pls') {
		console.log('Playlist Manager: Playlist can not be locked due to format ' + pls.extension);
	} else if (pls.isAutoPlaylist || pls.extension === '.fpl' || pls.extension === '.strm' || pls.extension === '.xsp') {
		list.editData(pls, { isLocked: !pls.isLocked, modified: Date.now() });
		list.update({ bReuseData: true, bNotPaint: true });
		list.filter();
		bDone = true;
	} else {
		const name = pls.name;
		const path = pls.path;
		if (_isFile(path)) {
			// Backup
			const backPath = path + '.back';
			_copyFile(path, backPath);
			delayAutoUpdate();
			let reason = -1;
			if (pls.extension === '.m3u' || pls.extension === '.m3u8') { [bDone, reason] = editTextFile(path, '#LOCKED:' + boolText[0], '#LOCKED:' + boolText[1], list.bBOM); }
			else if (pls.extension === '.xspf') { [bDone, reason] = editTextFile(path, '<meta rel="locked">' + boolText[0], '<meta rel="locked">' + boolText[1], list.bBOM); }
			if (bDone) { list.editData(pls, { fileSize: utils.GetFileSize(path) }); }
			if (!bDone && reason === 1) {
				bDone = rewriteHeader(list, pls);
				if (bDone) { switchLock(list, z, bAlsoHidden); return; }
			}
			if (!bDone) {
				fb.ShowPopupMessage('Error changing lock status on playlist file: ' + name + '\n\nPath: ' + path + '\n\nRestoring backup...', window.Name + _ps(window.ScriptInfo.Name));
				_renameFile(backPath, path); // Restore backup in case something goes wrong
				console.log('Playlist manager: Restoring backup...');
			} else {
				if (_isFile(backPath)) { _deleteFile(backPath); }
				list.editData(pls, { isLocked: !pls.isLocked, modified: Date.now() });
				list.update({ bReuseData: true, bNotPaint: true });
				list.filter();
			}
		} else {
			fb.ShowPopupMessage('Playlist file does not exist: ' + name + '\nPath: ' + path, window.Name + _ps(window.ScriptInfo.Name));
		}
	}
	return bDone;
}

function switchLockUI(list, z, bAlsoHidden = false) {
	if (z < 0 || (!bAlsoHidden && z >= list.items) || (bAlsoHidden && z >= list.itemsAll)) {
		console.log('Playlist Manager: Error editing playlist. Index out of bounds.');
		return false;
	}
	const pls = bAlsoHidden ? list.dataAll[z] : list.data[z];
	const index = plman.FindPlaylist(pls.nameId);
	if (index === -1) { return false; }
	setLocks(index, ['AddItems', 'RemoveItems', 'ReplaceItems', 'ReorderItems', 'RenamePlaylist'], 'globalswitch');
	list.editData(pls, { isLocked: !pls.isLocked, modified: Date.now() });
	list.update({ bReuseData: true, bNotPaint: true });
	list.filter();
	return true;
}

function rewriteHeader(list, pls) {
	let bDone = false;
	if (pls.extension === '.m3u' || pls.extension === '.m3u8') {
		let fileText = _open(pls.path);
		const codePage = checkCodePage(fileText, pls.extension);
		if (codePage !== -1) { fileText = _open(pls.path, codePage); if (!fileText.length) { return false; } }
		fileText = fileText.split(/\r\n|\n\r|\n|\r/);
		const idx = fileText.findIndex((line) => { return line.startsWith('#EXTINF:') || !line.startsWith('#'); });
		if (idx !== -1) {
			const newHeader = [
				'#EXTM3U',
				'#EXTENC:UTF-8',
				'#PLAYLIST:' + pls.name,
				'#UUID:' + pls.id,
				'#LOCKED:' + pls.isLocked,
				'#CATEGORY:' + pls.category,
				'#TAGS:' + (isArrayStrings(pls.tags) ? pls.tags.join(';') : ''),
				'#TRACKTAGS:' + (isArray(pls.trackTags) ? JSON.stringify(pls.trackTags) : ''),
				'#PLAYLISTSIZE:' + pls.size,
				'#DURATION:' + pls.duration,
				'#PLAYLIST_MBID:' + pls.playlist_mbid,
			];
			fileText.splice(0, idx, ...newHeader);
			bDone = _save(pls.path, fileText.join('\r\n'));
		}
	} else if (pls.extension === '.xspf') {
		let fileText = _open(pls.path);
		const codePage = checkCodePage(fileText, pls.extension);
		if (codePage !== -1) { fileText = _open(pls.path, codePage); if (!fileText.length) { return false; } }
		fileText = fileText.split(/\r\n|\n\r|\n|\r/);
		const idx = fileText.findIndex((line) => line.includes('<trackList>'));
		if (idx >= 2) {
			const newHeader = [
				'	<title>' + pls.name + '</title>',
				'	<meta rel="uuid">' + pls.id + '</meta>',
				'	<meta rel="locked">' + pls.isLocked + '</meta>',
				'	<meta rel="category">' + pls.category + '</meta>',
				'	<meta rel="tags">' + (isArrayStrings(pls.tags) ? pls.tags.join(';') : '') + '</meta>',
				'	<meta rel="trackTags">' + (isArray(pls.trackTags) ? JSON.stringify(pls.trackTags) : '') + '</meta>',
				'	<meta rel="playlistSize">' + pls.size + '</meta>',
				'	<meta rel="duration">' + pls.duration + '</meta>',
				'	<meta rel="playlist_mbid">' + pls.playlist_mbid + '</meta>',
				'	<identifier>' + 'https://listenbrainz.org/playlist/' + pls.playlist_mbid + '</identifier>',
			];
			fileText.splice(2, idx - 2, ...newHeader);
			bDone = _save(pls.path, fileText.join('\r\n'));
		}
	}
	if (bDone) { list.editData(pls, { fileSize: utils.GetFileSize(pls.path) }); }
	return bDone;
}

function convertToRelPaths(list, z) {
	let bDone = false;
	let answer = WshShell.Popup('Force relative paths to the playlist path, stripping all but the filenames.\nCan be manually undone (look at recycle bin). Are you sure?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
	if (answer === popup.no) { return bDone; }
	const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
	const pls = list.data[z];
	const playlistPath = pls.path;
	const paths = getFilePathsFromPlaylist(playlistPath);
	const relPaths = paths.map((path) => '.\\' + path.split('\\').pop());
	const codePage = checkCodePage(_open(playlistPath), pls.extension);
	let file = _open(playlistPath, codePage !== -1 ? codePage : 0);
	if (file.length) {
		if (pls.extension === '.xspf') { // Paths must be URI encoded...
			paths.forEach((path, i) => { file = file.replace(encodeURIComponent(path.replace(/\\/g, '/')), encodeURIComponent(relPaths[i].replace(/\\/g, '/'))); });
		} else {
			paths.forEach((path, i) => { file = file.replace(path, relPaths[i]); });
		}
		let bDeleted = false;
		if (_isFile(playlistPath)) {
			bDeleted = _recycleFile(playlistPath, true);
		} else { bDeleted = true; }
		if (bDeleted) {
			bDone = _save(playlistPath, file, list.bBOM); // No BOM
			if (bDone) { list.editData(pls, { fileSize: utils.GetFileSize(pls.path), modified: Date.now() }); }
			else {
				fb.ShowPopupMessage('Playlist generation failed while writing file \'' + playlistPath + '\'.', window.Name + _ps(window.ScriptInfo.Name));
				_restoreFile(playlistPath); // Since it failed we need to restore the original playlist back to the folder!
				return bDone;
			}
			console.log('Playlist Manager: done.');
			list.update({ bReuseData: true, bNotPaint: true }); // We have already updated data before only for the variables changed
			list.filter();
		} else {
			fb.ShowPopupMessage('Playlist generation failed when overwriting original playlist file \'' + playlistPath + '\'. May be locked.', window.Name + _ps(window.ScriptInfo.Name));
			return bDone;
		}
	}
	clearInterval(delay);
	return bDone;
}

function cloneAsAutoPls(list, z, uiIdx = -1, toFolder = void (0)) { // May be used only to copy an Auto-Playlist or Smart Playlist
	let bDone = false;
	const pls = list.data[z];
	if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
		fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		return bDone;
	}
	if (typeof toFolder === 'undefined') {
		toFolder = list.isInFolder(pls) ? list.getParentFolder(pls) : null;
	}
	const playlistName = pls.name + ' (copy ' + list.dataAll.reduce((count, iPls) => { if (iPls.name.startsWith(pls.name + ' (copy ')) { count++; } return count; }, 0) + ')';
	const objectPlaylist = clone(pls);
	objectPlaylist.name = playlistName;
	if (pls.extension === '.ui' && uiIdx !== -1) {
		WshShell.Popup('Native AutoPlaylists not created with the manager require cloning first to fully integrate them in the manager.\n\nThe AutoPlaylist properties will be shown to let you manually copy the query and sort patterns to the input popups. You can close it afterwards.', 5, window.Name + _ps(window.ScriptInfo.Name), popup.info + popup.ok);
		plman.ShowAutoPlaylistUI(uiIdx);
	}
	bDone = !!list.addAutoPlaylist(objectPlaylist, void (0), toFolder);
	if (bDone) { console.log('Playlist Manager: cloning ' + playlistName + ' done.'); } else { console.log('Playlist Manager: Error duplicating playlist'); return false; }
	return bDone;
}

function cloneAsSmartPls(list, z, toFolder) { // May be used only to copy an Auto-Playlist or Smart Playlist
	let bDone = false;
	const pls = list.data[z];
	if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
		fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		return bDone;
	}
	if (typeof toFolder === 'undefined') {
		toFolder = list.isInFolder(pls) ? list.getParentFolder(pls) : null;
	}
	const playlistName = pls.name + ' (copy ' + list.dataAll.reduce((count, iPls) => { if (iPls.name.startsWith(pls.name + ' (copy ')) { count++; } return count; }, 0) + ')';
	const objectPlaylist = clone(pls);
	objectPlaylist.name = playlistName;
	bDone = !!list.addSmartPlaylist(objectPlaylist, void (0), toFolder);
	if (bDone) { console.log('Playlist Manager: cloning ' + playlistName + ' done.'); } else { console.log('Playlist Manager: Error duplicating playlist'); return false; }
	return bDone;
}

async function cloneAsStandardPls(list, z, opt = { remDupl: [], bAdvTitle: false, bMultiple: false }, bAddToList = true) { // May be used to copy an Auto-Playlist to standard playlist or simply to clone a standard one
	let bDone = false;
	const pls = list.data[z];
	if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
		fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		return bDone;
	}
	const playlistName = pls.name + ' (std copy ' + list.dataAll.reduce((count, iPls) => { if (iPls.name.startsWith(pls.name + ' (std copy ')) { count++; } return count; }, 0) + ')';
	const idx = getPlaylistIndexArray(pls.nameId);
	if (idx && idx.length === 1) { // Already loaded? Duplicate it
		plman.ActivePlaylist = idx[0];
		const newIdx = plman.DuplicatePlaylist(plman.ActivePlaylist, plman.GetPlaylistName(plman.ActivePlaylist).replace(pls.name, playlistName));
		if (newIdx !== -1) { plman.ActivePlaylist = newIdx; }
		else { console.log('Error duplicating playlist'); return false; }
		bDone = true;
	} else if (idx && idx.length === 0) { // Not loaded? Load, duplicate it
		bDone = await list.loadPlaylist(z).bDone;
		if (!bDone) { return false; }
		const newIdx = plman.DuplicatePlaylist(plman.ActivePlaylist, plman.GetPlaylistName(plman.ActivePlaylist).replace(pls.name, playlistName));
		plman.RemovePlaylistSwitch(plman.ActivePlaylist);
		if (newIdx !== -1) { plman.ActivePlaylist = newIdx - 1; }
		else { console.log('Error duplicating playlist'); return false; }
		bDone = true;
	} else {
		fb.ShowPopupMessage('You can not have duplicated playlist names within foobar2000: ' + pls.name + '\n' + 'Please delete all playlist with that name first; you may leave one. Then try loading the playlist again.', window.Name + _ps(window.ScriptInfo.Name));
		return false;
	}
	if (opt.remDupl && opt.remDupl.length && removeDuplicates) { removeDuplicates({ checkKeys: opt.remDupl, sortBias: globQuery.remDuplBias, bPreserveSort: true, bAdvTitle: opt.bAdvTitle, bMultiple: opt.bMultiple }); }
	if (bAddToList) {
		const objectPlaylist = list.add({ bEmpty: false }); // Create playlist from active playlist
		bDone = objectPlaylist && _isFile(objectPlaylist.path); // Debug popups are already handled at prev line
		if (bDone) {
			if (list.properties.bOpenOnExport[1]) { _explorer(objectPlaylist.path); }
			console.log('Playlist Manager: cloning ' + playlistName + ' done.');
		}
	}
	return bDone;
}

async function clonePlaylistInUI(list, z, opt = { remDupl: [], bAdvTitle: false, bMultiple: false, bAlsoHidden: false }, toFolder = void (0)) {
	if (z < 0 || (!opt.bAlsoHidden && z >= list.items) || (opt.bAlsoHidden && z >= list.itemsAll)) {
		console.log('Playlist Manager: Error cloning playlist. Index out of bounds.');
		return false;
	}
	let bDone = false;
	const pls = opt.bAlsoHidden ? list.dataAll[z] : list.data[z];
	// For query playlists, use the UI copy if possible
	const bUI = pls.extension === '.ui'
		|| (pls.extension === '.xsp' || pls.isAutoPlaylist) && plman.FindPlaylist(pls.nameId) !== -1;
	if (pls.isAutoPlaylist && !bUI && !checkQuery(pls.query, true, true)) { fb.ShowPopupMessage('Query not valid:\n' + pls.query, window.Name + _ps(window.ScriptInfo.Name)); return bDone; }
	if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
		fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		return bDone;
	}
	if (typeof toFolder === 'undefined') {
		toFolder = list.isInFolder(pls) ? list.getParentFolder(pls) : null;
	}
	// Create new playlist and check paths
	const handleList = !bUI
		? pls.isAutoPlaylist
			? fb.GetQueryItems(fb.GetLibraryItems(), stripSort(pls.query))
			: pls.extension === '.fpl' && list.fplRules.bNonTrackedSupport
				? (await getHandlesFromPlaylistV2({ playlistPath: pls.path, bOmitNotFound: true, bReturnNotFound: true })).handlePlaylist
				: getHandlesFromPlaylist({ playlistPath: pls.path, relPath: list.playlistsPath, bOmitNotFound: true })
		: getHandlesFromUIPlaylists([pls.nameId], false); // Omit not found
	if (handleList) {
		list.updatePlaylistHandleMeta(pls, handleList, true, true); // Update size on load
		if (handleList.Count) {
			if (pls.sort && pls.sort.length) {
				const sort = getSortObj(pls.sort);
				if (sort && sort.tf) {
					handleList.OrderByFormat(sort.tf, sort.direction);
				}
			}
			const playlistName = pls.name + ' (copy ' + list.dataAll.reduce((count, iPls) => { if (iPls.name.startsWith(pls.name + ' (copy ')) { count++; } return count; }, 0) + ')';
			const idx = plman.CreatePlaylist(plman.PlaylistCount, playlistName);
			if (idx !== -1) {
				plman.ActivePlaylist = idx;
				plman.InsertPlaylistItems(plman.ActivePlaylist, 0, handleList);
				if (opt.remDupl && opt.remDupl.length && removeDuplicates) { removeDuplicates({ checkKeys: opt.remDupl, sortBias: globQuery.remDuplBias, bPreserveSort: true, bAdvTitle: opt.bAdvTitle, bMultiple: opt.bMultiple }); }
				bDone = true;
			}
			if (toFolder) {
				list.moveToFolderStack({ nameId: playlistName, extension: '.ui' }, toFolder);
			}
			if (bDone) { console.log('Playlist Manager: cloning ' + playlistName + ' done.'); }
		}
	}
	return bDone;
}

async function clonePlaylistMergeInUI(list, zArr, opt = { remDupl: [], bAdvTitle: false, bMultiple: false }) {
	if (!Array.isArray(zArr)) {
		console.log('Playlist Manager: Error merge-loading playlists. Index is not an array.');
		return false;
	}
	for (let z of zArr) {
		if (z < 0 || (!opt.bAlsoHidden && z >= list.items) || (opt.bAlsoHidden && z >= list.itemsAll)) {
			console.log('Playlist Manager: Error merge-loading playlists (merge). Index out of bounds.');
			return false;
		}
	}
	let bDone = true;
	let handleList = new FbMetadbHandleList();
	let names = [];
	for (let z of zArr) {
		const pls = opt.bAlsoHidden ? list.dataAll[z] : list.data[z];
		const bUI = pls.extension === '.ui';
		if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
			fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
			return false;
		}
		// Create new playlist and check paths
		const handleListZ = !bUI
			? pls.isAutoPlaylist
				? fb.GetQueryItems(fb.GetLibraryItems(), stripSort(pls.query))
				: pls.extension === '.fpl' && list.fplRules.bNonTrackedSupport
					? (await getHandlesFromPlaylistV2({ playlistPath: pls.path, bOmitNotFound: true, bReturnNotFound: true })).handlePlaylist
					: getHandlesFromPlaylist({ playlistPath: pls.path, relPath: list.playlistsPath, bOmitNotFound: true })
			: getHandlesFromUIPlaylists([pls.nameId], false); // Omit not found
		if (bDone && handleListZ) {
			bDone = true;
			if (handleListZ.Count) {
				if (pls.sort && pls.sort.length) {
					const sort = getSortObj(pls.sort);
					if (sort && sort.tf) {
						handleListZ.OrderByFormat(sort.tf, sort.direction);
					}
				}
				handleList.AddRange(handleListZ);
				names.push(pls.name);
			}
		} else if (pls.size !== 0) { bDone = false; }
	}
	if (bDone && handleList && handleList.Count) {
		const playlistName = 'Merge-load from ' + names[0] + ' - ' + names[names.length - 1] + ' ' + _p(names.length);
		const idx = plman.CreatePlaylist(plman.PlaylistCount, playlistName);
		if (idx !== -1) {
			plman.ActivePlaylist = idx;
			plman.InsertPlaylistItems(plman.ActivePlaylist, 0, handleList);
			if (opt.remDupl && opt.remDupl.length && removeDuplicates) { removeDuplicates({ checkKeys: opt.remDupl, sortBias: globQuery.remDuplBias, bPreserveSort: true, bAdvTitle: opt.bAdvTitle, bMultiple: opt.bMultiple }); }
		} else { bDone = false; }
		if (bDone) { console.log('Playlist Manager: merge-load ' + names.join(', ') + ' done.'); }
	} else { bDone = false; }
	return bDone;
}

async function clonePlaylistFile(list, z, ext, toFolder) {
	if (ext === '.ui') { return clonePlaylistInUI(list, z, void (0), toFolder); }
	let bDone = false;
	const pls = list.data[z];
	const bUI = pls.extension === '.ui';
	if (typeof toFolder === 'undefined') {
		toFolder = list.isInFolder(pls) ? list.getParentFolder(pls) : null;
	}
	const playlistName = pls.name + ' (copy ' + list.dataAll.reduce((count, iPls) => { if (iPls.name.startsWith(pls.name + ' (copy ')) { count++; } return count; }, 0) + ')';
	const playlistPath = list.playlistsPath + sanitize(playlistName) + ext;
	// Create new playlist and check paths
	const handleList = !bUI
		? pls.extension === '.fpl' && list.fplRules.bNonTrackedSupport
			? (await getHandlesFromPlaylistV2({ playlistPath: pls.path, bOmitNotFound: true, bReturnNotFound: true })).handlePlaylist
			: getHandlesFromPlaylist({ playlistPath: pls.path, relPath: list.playlistsPath, bOmitNotFound: true })
		: getHandlesFromUIPlaylists([pls.nameId], false); // Omit not found
	const paths = !bUI
		? getFilePathsFromPlaylist(pls.path)
		: handleList
			? fb.TitleFormat(pathTF).EvalWithMetadbs(handleList)
			: [];
	const root = utils.SplitFilePath(playlistPath)[0];
	const report = [];
	const subsongRe = subsongRegex;
	paths.forEach((trackPath) => {
		if (!testPath(trackPath.replace(subsongRe, ''), list.playlistsPath) && !_isLink(trackPath)) { report.push(trackPath); }
	});
	if (handleList) {
		if (report.length) { fb.ShowPopupMessage('Failed when cloning playlist to \'' + root + '\'.\nTracks not found:\n\n' + report.join('\n'), window.Name + _ps(window.ScriptInfo.Name)); }
		if (handleList.Count) {
			// Retrieve new paths
			bDone = savePlaylist({ handleList, playlistPath, ext, playlistName, bLocked: pls.isLocked, category: pls.category, tags: pls.tags, trackTags: pls.trackTags, author: pls.author, description: pls.description, bBOM: list.bBOM, relPath: (list.bRelativePath ? list.playlistsPath : '') });
		}
	}
	bDone = bDone && _isFile(playlistPath); // Debug popups are already handled at prev line
	if (bDone) {
		if (list.properties.bOpenOnExport[1]) { _explorer(playlistPath); }
		console.log('Playlist Manager: cloning ' + playlistName + ' done.');
		list.update();
		list.filter();
		if (toFolder) {
			list.moveToFolderStack({ nameId: playlistName, extension: '.ui' }, toFolder);
		}
	}
	return bDone;
}

function exportPlaylistFile(list, z, defPath = '') {
	let bDone = false;
	const pls = list.data[z];
	if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
		fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		return bDone;
	}
	const playlistPath = pls.path;
	const playlistName = utils.SplitFilePath(playlistPath).slice(1).join('');
	let path = '';
	try { path = sanitizePath(utils.InputBox(window.ID, 'Enter destination path:', window.Name + _ps(window.ScriptInfo.Name), defPath.length ? defPath + playlistName : list.playlistsPath + 'Export\\' + playlistName, true)); }
	catch (e) { return bDone; } // eslint-disable-line no-unused-vars
	if (!path.length) { return bDone; }
	if (path === playlistPath) { console.log('Playlist Manager: can\'t export playlist to original path.'); return bDone; }
	if (_isFile(path)) {
		let answer = WshShell.Popup('There is a file with same name. Overwrite?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
		if (answer === popup.no) { return bDone; }
		bDone = _recycleFile(path, true);
	}
	bDone = _copyFile(playlistPath, path);
	if (bDone) {
		if (list.properties.bOpenOnExport[1]) { _explorer(path); }
		console.log('Playlist Manager: exporting -> ' + playlistName);
	} else { fb.ShowPopupMessage('Failed when copying playlist file to \'' + path + '\'. May be locked or there is already a file with such name.', window.Name + _ps(window.ScriptInfo.Name)); }
	return bDone;
}

function exportPlaylistFiles(list, zArr, defPath = '') {
	let bDone = false;
	if (!zArr.length) { return bDone; }
	const playlists = zArr.map((z) => list.data[z]);
	if (playlists.some((pls) => {
		const bError = pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs';
		if (bError) {
			fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		}
		return bError;
	})) { return bDone; }  // Don't load incompatible files
	let path = '';
	try { path = sanitizePath(utils.InputBox(window.ID, 'Enter destination path:\n(don\'t forget adding \\ to copy to subfolder)', window.Name + _ps(window.ScriptInfo.Name), defPath || list.playlistsPath + 'Export\\', true)); }
	catch (e) { return bDone; } // eslint-disable-line no-unused-vars
	if (!path.length) { return bDone; }
	if (path === list.playlistsPath) { console.log('Playlist Manager: can\'t export playlist(s) to original path.'); return bDone; }
	const bCopy = playlists.map((pls) => {
		const playlistPath = pls.path;
		const playlistName = utils.SplitFilePath(playlistPath).slice(1).join('');
		if (_isFile(path + playlistName)) {
			let answer = WshShell.Popup('There is a file with same name. Overwrite?', 0, window.Name + _ps(window.ScriptInfo.Name), popup.question + popup.yes_no);
			if (answer === popup.no) { return bDone; }
			bDone = _recycleFile(path + playlistName, true);
		}
		bDone = _copyFile(playlistPath, path + playlistName);
		if (bDone) {
			console.log('Playlist Manager: exporting -> ' + playlistName);
		} else { fb.ShowPopupMessage('Failed when copying playlist file to \'' + path + '\'. May be locked or there is already a file with such name.\n\n' + playlistPath, window.Name + _ps(window.ScriptInfo.Name)); }
		return bDone;
	});
	bDone = bDone && bCopy.every(Boolean);
	if (list.properties.bOpenOnExport[1] && bCopy.some(Boolean)) { _explorer(path); }
	return bDone;
}

function exportPlaylistFileWithRelPaths({ list, z, ext = '', defPath = '', bNoInput = false } = {}) {
	let bDone = false;
	const pls = list.data[z];
	let newPath = '';
	if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
		fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		return { bDone, newPath };
	}
	const playlistPath = pls.path;
	const playlistName = utils.SplitFilePath(playlistPath).slice(1).join('');
	if (bNoInput) {
		newPath = defPath + playlistName;
	} else {
		try { newPath = sanitizePath(utils.InputBox(window.ID, 'Enter destination path:', window.Name + _ps(window.ScriptInfo.Name), defPath.length ? defPath + playlistName : list.playlistsPath + 'Export\\' + playlistName, true)); }
		catch (e) { return { bDone, newPath }; } // eslint-disable-line no-unused-vars
	}
	if (!newPath.length) { return { bDone, newPath }; }
	if (newPath === playlistPath) { console.log('Playlist Manager: can\'t export playlist to original path.'); return { bDone, newPath }; }
	const paths = getFilePathsFromPlaylist(playlistPath);
	let relPaths = paths.map((path) => { return '.\\' + path.split('\\').pop(); });
	if (ext.length) { relPaths = relPaths.map((path) => { return path.split('.').slice(0, -1).concat([ext]).join('.'); }); }
	const codePage = checkCodePage(_open(playlistPath), pls.extension);
	let file = _open(playlistPath, codePage !== -1 ? codePage : 0);
	if (file.length) {
		paths.forEach((path, i) => { file = file.replace(path, relPaths[i]); });
		let bDeleted = false;
		if (_isFile(newPath)) {
			bDeleted = _recycleFile(newPath, true);
		} else { bDeleted = true; }
		if (bDeleted) {
			bDone = _save(newPath, file, list.bBOM); // No BOM
			if (!bDone) {
				fb.ShowPopupMessage('Playlist generation failed while writing file \'' + newPath + '\'.', window.Name + _ps(window.ScriptInfo.Name));
				_restoreFile(newPath); // Since it failed we need to restore the original playlist back to the folder!
				return { bDone, newPath, paths };
			}
		} else {
			fb.ShowPopupMessage('Playlist generation failed when overwriting a file \'' + newPath + '\'. May be locked.', window.Name + _ps(window.ScriptInfo.Name));
			return { bDone, newPath, paths };
		}
	}
	console.log('Playlist Manager: exporting -> ' + playlistName);
	return { bDone, newPath, paths };
}

function exportPlaylistFileWithTracks({ list, z, defPath = '', bAsync = true, bNoInput = false, bOpenOnExport = true } = {}) {
	let { bDone = false, newPath, paths } = exportPlaylistFileWithRelPaths({ list, z, defPath, bNoInput });
	if (!newPath.length) { return false; }
	if (bDone) {
		const pls = list.data[z];
		if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
			fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
			return bDone;
		}
		const playlistPath = pls.path;
		const playlistName = utils.SplitFilePath(playlistPath).slice(1).join('');
		const root = utils.SplitFilePath(newPath)[0];
		const report = [];
		const plsRoot = utils.SplitFilePath(playlistPath)[0];
		new Promise((resolve) => {
			const promises = [];
			paths.forEach((trackPath, i) => {
				promises.push(new Promise((resolve) => {
					const wait = bAsync ? 50 * i + (i % 4 === 0 ? 1000 : 0) : 0; // Give some time on Async processing between successive calls to not overload HDDs
					setTimeout(() => {
						const fileName = utils.SplitFilePath(trackPath).slice(1).join('');
						const outputName = root + fileName;
						let bCopy = false;
						if (trackPath.startsWith('.\\') || trackPath.startsWith('..\\')) { // Relative with indicator at start
							const absPath = findRelPathInAbsPath(trackPath, list.playlistsPath);
							bCopy = _copyFile(absPath, outputName, bAsync);
						} else if (_isFile(plsRoot + trackPath)) { bCopy = _copyFile(plsRoot + trackPath, outputName, bAsync); } // Relative without indicator
						else if (_isFile(trackPath)) { bCopy = _copyFile(trackPath, outputName, bAsync); } // Absolute
						if (!bCopy && !_isFile(outputName)) { report.push(trackPath); } // Duplicates will fail on successive copying but present at output
						resolve('done');
					}, wait);
				}));
			});
			Promise.all(promises).then(() => {
				resolve('done');
			});
		}).then(() => {
			if (list.properties.bOpenOnExport[1] && bOpenOnExport) { _explorer(newPath); }
			if (report.length) { fb.ShowPopupMessage('Failed when copying tracks to \'' + root + '\'.\nTracks not found:\n\n' + report.join('\n'), window.Name + _ps(window.ScriptInfo.Name)); }
			console.log('Playlist Manager: exporting tracks -> ' + playlistName);
			return bDone;
		});
	} else { fb.ShowPopupMessage('Failed when copying playlist file to \'' + newPath + '\'.', window.Name + _ps(window.ScriptInfo.Name)); }
	return bDone;
}

function exportPlaylistFileWithTracksConvert({ list, z, tf = '.\\%FILENAME%.mp3', preset = '...', defPath = '', ext = '', playlistOutPath = '', remDupl = [], bAdvTitle = false, bMultiple = false, bExtendedM3U = true } = {}) {
	const bOpenOnExport = list.properties.bOpenOnExport[1];
	if (bOpenOnExport) { fb.ShowPopupMessage('Playlist file will be exported to selected path. Track filenames will be changed according to the TF expression set at configuration.\n\nNote the TF expression should match whatever preset is used at the converter panel, otherwise actual filenames will not match with those on exported playlist.\n\nSame comment applies to the destination path, the tracks at the converter panel should be output to the same path the playlist file was exported to...\n\nConverter preset, filename TF and default path can be set at configuration (header menu). Default preset uses the one which requires user input. It\'s recommended to create a new preset for this purpose and set the output folder to be asked at conversion step.', window.Name + _ps(window.ScriptInfo.Name)); }
	let bDone = false;
	const pls = list.data[z];
	if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
		fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		return { bDone, handleList: null };
	}
	const playlistPath = pls.path;
	const bUI = pls.extension === '.ui';
	const bXSP = pls.extension === '.xsp';
	const arr = utils.SplitFilePath(playlistPath);
	const [playlistName, playlistExt] = bUI ? [pls.name, ''] : [arr[1], arr[2].toLowerCase()];
	let extension = ext.toLowerCase();
	if (!playlistExt.length) { extension = list.playlistsExtension; } // Use default extension for UI playlists
	const playlistNameExt = playlistName + (extension.length ? extension : playlistExt);
	// Set output
	let newPath = '';
	if (playlistOutPath) {
		newPath = playlistOutPath;
	} else {
		try {
			newPath = sanitizePath(
				utils.InputBox(
					window.ID,
					'Current preset: ' + preset + ' --> ' + tf.cut(100) + '\n\n\nEnter destination path:\n(root will be copied to clipboard)\n\n#EXPORT#, #PLAYLIST#, #EXT# and #PLAYLISTEXT# may also be used as placeholders for the default playlist export folder, playlist name, extension or name + extension.',
					window.Name + _ps(window.ScriptInfo.Name),
					defPath.length
						? defPath + playlistNameExt
						: list.playlistsPath + 'Export\\' + playlistNameExt,
					true
				)
			);
		} catch (e) { return { bDone, handleList: null }; } // eslint-disable-line no-unused-vars
	}
	if (!newPath.length) { return { bDone, handleList: null }; }
	newPath = sanitizePath(
		newPath
			.replace(/#EXPORT#/gi, defPath.length ? defPath : list.playlistsPath + 'Export\\')
			.replace(/#PLAYLIST#/gi, playlistName)
			.replace(/#EXT#/gi, extension.length ? extension : playlistExt)
			.replace(/#PLAYLISTEXT#/gi, playlistNameExt)
	);
	if (newPath === playlistPath) { console.log('Playlist Manager: can\'t export playlist to original path.'); return { bDone, handleList: null }; }
	// Get tracks
	const handleList = !bUI
		? getHandlesFromPlaylist({ playlistPath: pls.path, relPath: list.playlistsPath, bOmitNotFound: true, remDupl, bAdvTitle, bMultiple })
		: getHandlesFromUIPlaylists([pls.nameId], false); // Omit not found
	const subsongRe = subsongRegex;
	const paths = !bUI && !bXSP
		? getFilePathsFromPlaylist(playlistPath)
		: handleList
			? fb.TitleFormat(pathTF).EvalWithMetadbs(handleList)
			: [];
	const root = utils.SplitFilePath(newPath)[0];
	_setClipboardData(root);
	const report = [];
	if (bUI) {
		const newHandleList = new FbMetadbHandleList();
		paths.forEach((trackPath, i) => { if (!_isFile(trackPath.replace(subsongRe, ''))) { report.push(trackPath); } else { newHandleList.Add(handleList[i]); } });
		if (report.length) { // Omit not found
			handleList.RemoveAll();
			handleList.AddRange(newHandleList);
		}
	} else {
		paths.forEach((trackPath) => { if (!_isFile(trackPath.replace(subsongRe, ''))) { report.push(trackPath); } });
	}
	if (handleList) {
		if (report.length) {
			fb.ShowPopupMessage('Failed when converting tracks to \'' + root + '\'.\nTracks not found:\n\n' + report.join('\n'), window.Name + _ps(window.ScriptInfo.Name));
		}
		if (bXSP) {
			list.updatePlaylistHandleMeta(pls, handleList, true, true); // Update size on load
		}
		if (handleList.Count) {
			// Convert tracks
			if (preset) { fb.RunContextCommandWithMetadb('Convert/' + preset, handleList, 8); }
			// Retrieve new paths
			const fileNames = fb.TitleFormat(tf).EvalWithMetadbs(handleList);
			if (!isArrayStrings(fileNames)) {
				fb.ShowPopupMessage('Playlist generation failed while guessing new filenames:\n\n' + fileNames.join('\n'), window.Name + _ps(window.ScriptInfo.Name));
				return { bDone, handleList };
			}
			// Copy playlist file when original extension and output extension are the same or both share same format (M3U)
			let file = '';
			let bDeleted; // 3 possible states, false, true or nothing deleted (undefined)
			if (_isFile(newPath)) { bDeleted = _recycleFile(newPath, true); }
			if (!extension.length || playlistExt.length && (playlistExt.startsWith(extension) || extension.startsWith(playlistExt))) {
				const codePage = checkCodePage(_open(playlistPath), pls.extension);
				file = _open(playlistPath, codePage !== -1 ? codePage : 0);
				paths.forEach((path, i) => { file = file.replace(path, fileNames[i]); });
				if ((extension === '.m3u8' || extension === '.m3u') && !bExtendedM3U) {
					file = file.replace(/^#(?:EXT.*|.*:.*)[\r\n]*/gm, '');
				}
			} else { // Or create new playlist file when translating between different formats
				savePlaylist({ handleList, playlistPath: newPath, ext: extension, playlistName: pls.name, bLocked: pls.isLocked, category: pls.category, tags: pls.tags, trackTags: pls.trackTags, playlist_mbid: pls.playlist_mbid, author: pls.author, description: pls.description, bBOM: list.bBOM, bExtendedM3U });
				file = _open(newPath, utf8);
				paths.forEach((path, i) => { file = file.replace(path, fileNames[i]); });
			}
			if (bDeleted !== false) {
				bDone = file && file.length ? _save(newPath, file, list.bBOM) : false; // No BOM
				if (!bDone) {
					fb.ShowPopupMessage('Playlist generation failed while writing file \'' + newPath + '\'.', window.Name + _ps(window.ScriptInfo.Name));
					if (bDeleted) { _restoreFile(newPath); } // Since it failed, may need to restore the original playlist back to the folder!
				}
			} else {
				fb.ShowPopupMessage('Playlist generation failed when overwriting a file \'' + newPath + '\'. May be locked.', window.Name + _ps(window.ScriptInfo.Name));
				return { bDone, handleList };
			}
			if (bOpenOnExport) { _explorer(newPath); }
			console.log('Playlist Manager: exporting converted tracks -> ' + playlistName);
		}
	}
	return { bDone, handleList };
}

function exportAutoPlaylistFileWithTracksConvert({ list, z, tf = '.\\%FILENAME%.mp3', preset = '...', defPath = '', ext = '', playlistOutPath = '', remDupl = [], bAdvTitle = false, bMultiple = false, bExtendedM3U = true } = {}) {
	const bOpenOnExport = list.properties.bOpenOnExport[1];
	if (bOpenOnExport) { fb.ShowPopupMessage('Playlist file will be exported to selected path. Track filenames will be changed according to the TF expression set at configuration.\n\nNote the TF expression should match whatever preset is used at the converter panel, otherwise actual filenames will not match with those on exported playlist.\n\nSame comment applies to the destination path, the tracks at the converter panel should be output to the same path the playlist file was exported to...\n\nConverter preset, filename TF and default path can be set at configuration (header menu). Default preset uses the one which requires user input. It\'s recommended to create a new preset for this purpose and set the output folder to be asked at conversion step.', window.Name + _ps(window.ScriptInfo.Name)); }
	let bDone = false;
	const pls = list.data[z];
	if (pls.extension === '.xsp' && Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
		fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
		return { bDone, handleList: null };
	}
	const playlistName = pls.name;
	const extension = ext.length ? ext.toLowerCase() : list.playlistsExtension;
	const playlistNameExt = playlistName + extension;
	// Set output
	let newPath = '';
	if (playlistOutPath) {
		newPath = playlistOutPath;
	} else {
		try {
			newPath = sanitizePath(
				utils.InputBox(
					window.ID,
					'Current preset: ' + preset + ' --> ' + tf.cut(100) + '\n\n\nEnter destination path:\n(root will be copied to clipboard)\n\n#EXPORT#, #PLAYLIST# and #PLAYLISTEXT# may also be used as placeholders for the default playlist export folder, playlist name, extension or name + extension.',
					window.Name + _ps(window.ScriptInfo.Name),
					defPath.length
						? defPath + playlistNameExt
						: list.playlistsPath + 'Export\\' + playlistNameExt,
					true
				)
			);
		} catch (e) { return { bDone, handleList: null }; } // eslint-disable-line no-unused-vars
	}
	if (!newPath.length) { return { bDone, handleList: null }; }
	newPath = sanitizePath(
		newPath
			.replace(/#EXPORT#/gi, defPath.length ? defPath : list.playlistsPath + 'Export\\')
			.replace(/#PLAYLIST#/gi, playlistName)
			.replace(/#EXT#/gi, extension)
			.replace(/#PLAYLISTEXT#/gi, playlistNameExt)
	);
	// Get tracks
	// For query playlists, use the UI copy if possible
	const bUI = pls.extension === '.ui'
		|| (pls.extension === '.xsp' || pls.isAutoPlaylist) && plman.FindPlaylist(pls.nameId) !== -1;
	if (pls.isAutoPlaylist && !bUI && !checkQuery(pls.query, true, true)) { fb.ShowPopupMessage('Query not valid:\n' + pls.query, window.Name + _ps(window.ScriptInfo.Name)); return { bDone, handleList: null }; }
	let handleList = !bUI
		? pls.isAutoPlaylist
			? fb.GetQueryItems(fb.GetLibraryItems(), stripSort(pls.query))
			: getHandlesFromPlaylist({ playlistPath: pls.path, relPath: list.playlistsPath, bOmitNotFound: true })
		: getHandlesFromUIPlaylists([pls.nameId], false); // Omit not found
	if (handleList) {
		list.updatePlaylistHandleMeta(pls, handleList, true, true); // Update size on load
		if (handleList.Count) {
			const sortObj = pls.sort && pls.sort.length ? getSortObj(pls.sort) : null;
			if (remDupl && remDupl.length && removeDuplicates) { handleList = removeDuplicates({ handleList, checkKeys: remDupl, sortBias: globQuery.remDuplBias, bPreserveSort: !sortObj, bAdvTitle, bMultiple }); }
			if (sortObj) { handleList.OrderByFormat(sortObj.tf, sortObj.direction); }
			const subsongRe = subsongRegex;
			const paths = fb.TitleFormat(pathTF).EvalWithMetadbs(handleList);
			const root = utils.SplitFilePath(newPath)[0];
			_setClipboardData(root);
			const report = [];
			paths.forEach((trackPath) => { if (!_isFile(trackPath.replace(subsongRe, ''))) { report.push(trackPath); } });
			if (report.length) {
				fb.ShowPopupMessage('Failed when converting tracks to \'' + root + '\'.\nTracks not found:\n\n' + report.join('\n'), window.Name + _ps(window.ScriptInfo.Name));
			}
			// Convert tracks
			if (preset) { fb.RunContextCommandWithMetadb('Convert/' + preset, handleList, 8); }
			// Retrieve new paths
			const fileNames = fb.TitleFormat(tf).EvalWithMetadbs(handleList);
			if (!isArrayStrings(fileNames)) {
				fb.ShowPopupMessage('Playlist generation failed while guessing new filenames:\n\n' + fileNames.join('\n'), window.Name + _ps(window.ScriptInfo.Name));
				return { bDone, handleList };
			}
			let bDeleted; // 3 possible states, false, true or nothing deleted (undefined)
			if (_isFile(newPath)) { bDeleted = _recycleFile(newPath, true); }
			// Create new playlist file when translating between different formats
			savePlaylist({ handleList, playlistPath: newPath, ext: extension, playlistName: pls.name, bLocked: pls.isLocked, category: pls.category, tags: pls.tags, trackTags: pls.trackTags, playlist_mbid: pls.playlist_mbid, author: pls.author, description: pls.description, bBOM: list.bBOM, bExtendedM3U });
			let file = _open(newPath, utf8);
			paths.forEach((path, i) => { file = file.replace(path, fileNames[i]); });
			if (bDeleted !== false) {
				bDone = file && file.length ? _save(newPath, file, list.bBOM) : false; // No BOM
				if (!bDone) {
					fb.ShowPopupMessage('Playlist generation failed while writing file \'' + newPath + '\'.', window.Name + _ps(window.ScriptInfo.Name));
					if (bDeleted) { _restoreFile(newPath); } // Since it failed, may need to restore the original playlist back to the folder!
				}
			} else {
				fb.ShowPopupMessage('Playlist generation failed when overwriting a file \'' + newPath + '\'. May be locked.', window.Name + _ps(window.ScriptInfo.Name));
				return { bDone, handleList };
			}
			if (bOpenOnExport) { _explorer(newPath); }
			console.log('Playlist Manager: exporting converted tracks -> ' + playlistName);
		}
	}
	return { bDone, handleList };
}

function renamePlaylist(list, z, newName, bUpdatePlman = true) {
	const pls = list.data[z];
	const oldName = pls.name;
	const oldNameId = pls.nameId;
	const oldId = pls.id;
	const newNameId = newName + ((list.bUseUUID && pls.id.length) ? pls.id : ''); // May have enabled/disabled UUIDs just before renaming
	const newId = (list.bUseUUID && oldId.length) ? oldId : nextId(list.optionsUUIDTranslate(), true); // May have enabled/disabled UUIDs just before renaming
	const duplicated = plman.FindPlaylist(newNameId);
	let bRenamedSuccessfully = false;
	if (bUpdatePlman && duplicated !== -1 || !bUpdatePlman && duplicated !== plman.ActivePlaylist) { // Playlist already exists on foobar2000...
		fb.ShowPopupMessage('You can not have duplicated playlist names within foobar2000: ' + oldName + '\n\nChoose another unique name for renaming.', window.Name + _ps(window.ScriptInfo.Name));
	} else if (list.dataAll.some((pls) => pls.nameId === newNameId)) { // Playlist already exists on manager...
		fb.ShowPopupMessage('Name already used: ' + newNameId + '\n\nChoose another unique name for renaming.', window.Name + _ps(window.ScriptInfo.Name));
	} else {
		delayAutoUpdate();
		if (newName.length && newName !== oldName) {
			if (pls.isAutoPlaylist || pls.extension === '.ui') {
				list.editData(pls, {
					name: newName,
					id: list.bUseUUID ? newId : '', // May have enabled/disabled UUIDs just before renaming
					nameId: list.bUseUUID && pls.extension !== '.ui' ? newName + newId : newName,
					modified: Date.now()
				});
				list.editSortingFile(oldNameId, newNameId);
				if (bUpdatePlman) { list.updatePlman(pls.nameId, oldNameId); } // Update with new id
				list.update({ bReuseData: true, bNotPaint: true });
				list.filter();
				bRenamedSuccessfully = true;
			} else {
				if (_isFile(pls.path)) { // NOSONAR
					// Backup
					const oldPath = pls.path;
					const backPath = pls.path + '.back';
					_copyFile(oldPath, backPath);
					// Locked files have the name variable as read only, so we only change the filename. We can not replace oldName with new name since successive renaming steps would not work. We simply strip the filename and replace it with the new name
					let newPath = sanitizePath(pls.path.split('.').slice(0, -1).join('.').split('\\').slice(0, -1).concat([newName]).join('\\') + pls.extension);
					bRenamedSuccessfully = oldPath !== newPath ? _renameFile(oldPath, newPath) : true;
					if (bRenamedSuccessfully) {
						list.editData(pls, {
							path: newPath
						});
						list.editSortingFile(oldNameId, newNameId);
						if (!pls.isLocked) {
							let bDone = false;
							let reason = -1;
							if (pls.extension === '.m3u' || pls.extension === '.m3u8') {
								let originalStrings = ['#PLAYLIST:' + oldName, '#UUID:' + oldId];
								let newStrings = ['#PLAYLIST:' + newName, '#UUID:' + (list.bUseUUID ? newId : '')];
								[bDone, reason] = editTextFile(newPath, originalStrings, newStrings, list.bBOM); // No BOM
								if (!bDone && reason === 1) { // Retry with new header
									bDone = rewriteHeader(list, pls);
									if (bDone) { bDone = editTextFile(newPath, originalStrings, newStrings, list.bBOM); }
								}
							} else if (pls.extension === '.xspf') {
								let originalStrings = ['<title>' + oldName, '<meta rel="uuid">' + oldId];
								let newStrings = ['<title>' + newName, '<meta rel="uuid">' + (list.bUseUUID ? newId : '')];
								[bDone, reason] = editTextFile(newPath, originalStrings, newStrings, list.bBOM); // No BOM
								if (!bDone && reason === 1) { // Retry with new header
									bDone = rewriteHeader(list, pls);
									if (bDone) { bDone = editTextFile(newPath, originalStrings, newStrings, list.bBOM); }
								}
							} else if (pls.extension === '.xsp') {
								let originalStrings = ['<name>' + oldName];
								let newStrings = ['<name>' + newName];
								[bDone,] = editTextFile(newPath, originalStrings, newStrings, list.bBOM); // No BOM
							} else { bDone = true; }
							if (!bDone) {
								fb.ShowPopupMessage('Error renaming playlist file: ' + oldName + ' --> ' + newName + '\n\nOld Path: ' + oldPath + '\nNew Path: ' + newPath + '\n\nRestoring backup...', window.Name + _ps(window.ScriptInfo.Name));
								_renameFile(backPath, oldPath); // Restore backup in case something goes wrong
								console.log('Playlist manager: Restoring backup...');
							} else {
								list.editData(pls, {
									name: newName,
									id: list.bUseUUID ? newId : '', // May have enabled/disabled UUIDs just before renaming
									nameId: list.bUseUUID ? newName + newId : newName,
									modified: Date.now()
								});
								if (bUpdatePlman) { list.updatePlman(pls.nameId, oldNameId); } // Update with new id
								list.update({ bReuseData: true, bNotPaint: true });
								list.filter();
								bRenamedSuccessfully = true;
							}
						} else {
							list.update({ bReuseData: true, bNotPaint: true });
							list.filter();
							bRenamedSuccessfully = true;
						}
					} else { fb.ShowPopupMessage('Error renaming playlist file: ' + oldName + ' --> ' + newName + '\n\nOld Path: ' + oldPath + '\nNew Path: ' + newPath + '\n\nRestoring backup...', window.Name + _ps(window.ScriptInfo.Name)); }
					if (!_isFile(oldPath) && !_isFile(newPath)) { _renameFile(backPath, oldPath); console.log('Playlist manager: Restoring backup...'); } // Restore backup in case something goes wrong
					else { _deleteFile(backPath); }
				} else { fb.ShowPopupMessage('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name + _ps(window.ScriptInfo.Name)); }
			}
		}
	}
	if (bRenamedSuccessfully) { list.showPlsByObj(pls); }
	return bRenamedSuccessfully;
}

function renameFolder(list, z, newName) {
	const folder = list.data[z];
	if (list.dataAll.some((pls) => pls.nameId === newName)) {
		fb.ShowPopupMessage('Name already used: ' + newName + '\n\nChoose an unique name for renaming.', window.Name + _ps(window.ScriptInfo.Name));
		return false;
	} else {
		list.dataAll.forEach((pls) => {
			if (pls.inFolder === folder.nameId) { pls.inFolder = newName; }
		});
		list.editData(folder, {
			name: newName,
			id: '',
			nameId: newName
		});
		list.update({ bReuseData: true, bNotPaint: true });
		list.filter();
		// Set focus on new playlist if possible (if there is an active filter, then pls may be not found on this.data)
		list.showPlsByObj(folder);
	}
	return true;
}

function cycleCategories() {
	const options = ['All', ...list.categories()];
	let idx = 0; // All is the default
	if (list.categoryState.length === 1) { // If there is currently only one category selected then use the next one
		idx = options.indexOf(list.categoryState[0]);
		idx++;
	}
	else if (isArrayEqual(list.categoryState, list.categories())) { idx++; } // If it's already showing all categories, then use the first one
	if (idx >= options.length) { idx = 0; } // And cycle
	const categoryState = idx ? [options[idx]] : options.slice(1);
	list.filter({ categoryState });
}

function cycleTags() {
	const options = ['All', ...list.tags()];
	let idx = 0; // All is the default
	if (list.tagState.length === 1) { // If there is currently only one category selected then use the next one
		idx = options.indexOf(list.tagState[0]);
		idx++;
	}
	else if (isArrayEqual(list.tagState, list.tags())) { idx++; } // If it's already showing all categories, then use the first one
	if (idx >= options.length) { idx = 0; } // And cycle
	const tagState = idx ? [options[idx]] : options.slice(1);
	list.filter({ tagState });
}

function rewriteXSPQuery(pls, newQuery) {
	let bDone = false;
	if (pls.extension === '.xsp') {
		if (Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
			fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
			return bDone;
		}
		const { rules, match } = XSP.getRules(newQuery);
		if (rules.length) {
			const plsPath = pls.path;
			const jsp = loadXspPlaylist(plsPath);
			if (!jsp) { return bDone; }
			jsp.playlist.rules = rules;
			jsp.playlist.match = match;
			const xspText = XSP.toXSP(jsp);
			if (xspText && xspText.length) {
				// Backup
				const backPath = plsPath + '.back';
				_copyFile(plsPath, backPath);
				bDone = _save(plsPath, xspText.join('\r\n'));
				if (!bDone) {
					_renameFile(backPath, plsPath); // Restore backup in case something goes wrong
					console.log('Playlist manager: Restoring backup...');
				} else if (_isFile(backPath)) { _deleteFile(backPath); }
				if (bDone) {
					xspCache.set(plsPath, jsp);
					xmlDomCache.delete(plsPath);
				}
			}
		}
	}
	return bDone;
}

function rewriteXSPSort(pls, newSort) {
	let bDone = false;
	if (pls.extension === '.xsp') {
		if (Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
			fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
			return bDone;
		}
		const order = XSP.getOrder(newSort);
		const plsPath = pls.path;
		const jsp = loadXspPlaylist(plsPath);
		if (!jsp) { return bDone; }
		jsp.playlist.order = order;
		const xspText = XSP.toXSP(jsp);
		if (xspText && xspText.length) {
			// Backup
			const backPath = plsPath + '.back';
			_copyFile(plsPath, backPath);
			bDone = _save(plsPath, xspText.join('\r\n'));
			if (!bDone) {
				_renameFile(backPath, plsPath); // Restore backup in case something goes wrong
				console.log('Playlist manager: Restoring backup...');
			} else if (_isFile(backPath)) { _deleteFile(backPath); }
			if (bDone) {
				xspCache.set(plsPath, jsp);
				xmlDomCache.delete(plsPath);
			}
		}
	}
	return bDone;
}

function rewriteXSPLimit(pls, newLimit) {
	let bDone = false;
	if (pls.extension === '.xsp') {
		if (Object.hasOwn(pls, 'type') && pls.type !== 'songs') { // Don't load incompatible files
			fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name + _ps(window.ScriptInfo.Name));
			return bDone;
		}
		const plsPath = pls.path;
		const jsp = loadXspPlaylist(plsPath);
		if (!jsp) { return bDone; }
		jsp.playlist.limit = Number.isFinite(newLimit) ? newLimit : 0;
		const xspText = XSP.toXSP(jsp);
		if (xspText && xspText.length) {
			// Backup
			const backPath = plsPath + '.back';
			_copyFile(plsPath, backPath);
			bDone = _save(plsPath, xspText.join('\r\n'));
			if (!bDone) {
				_renameFile(backPath, plsPath); // Restore backup in case something goes wrong
				console.log('Playlist manager: Restoring backup...');
			} else if (_isFile(backPath)) { _deleteFile(backPath); }
			if (bDone) {
				xspCache.set(plsPath, jsp);
				xmlDomCache.delete(plsPath);
			}
		}
	}
	return bDone;
}

function backup(n = 50, bAsync = false, bProfile = true) { // Backup playlist and json file
	if (!list.playlistsPath.length || list.bLiteMode) { return false; }
	let test = bProfile ? new FbProfiler('Playlist manager Backup') : null;
	if (n && n !== -1) {
		const files = getFiles(list.playlistsPath + '_backup\\', new Set(['.zip'])).reverse();
		while (files.length >= n) {
			_recycleFile(files.pop(), true);
		}
	}
	const playlistFilesMask = Array.from(loadablePlaylistFormats, (ext) => list.playlistsPath + '*' + ext); // Ext already has a .
	_zip(
		[...playlistFilesMask, list.filename, list.filename + '.old', list.filename.replace('.json', '_sorting.json'), list.filename.replace('.json', '_sorting.json.old'), list.filename.replace('.json', '_config.json')],
		list.playlistsPath + '_backup\\' + new Date().toISOString().split('.')[0].replace(/[ :,]/g, '_') + '.zip',
		bAsync
	);
	if (test) { test.Print(); }
	return true;
}

function findMixedPaths() {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		const playlists = list.dataAll
			.filter((pls) => !pls.isAutoPlaylist && pls.extension !== '.ui' && pls.extension !== '.xsp' && !pls.isFolder);
		const total = playlists.length - 1;
		let prevProgress = -1;
		console.log('Playlist Manager: Retrieving file paths.');
		Promise.serial(
			playlists,
			(playlist) => getFilePathsFromPlaylist(playlist.path),
			60
		).then((filePathsArr) => {
			return Promise.serial(
				filePathsArr,
				(filePaths, i) => {
					if (filePaths.some((path) => !absPathRegExp.test(path)) && filePaths.some((path) => absPathRegExp.test(path))) {
						found.push(playlists[i]);
					}
					const progress = total ? Math.round(i / total * 10) * 10 : 100;
					if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking paths ' + progress + '%.'); }
				},
				60
			);
		}).then(() => {
			if (found.length && !report.length) { found.forEach((pls) => { report.push(pls.extension === '.ui' ? pls.nameId : pls.path); }); }
			resolve({ found, report });
		});
	});
}

// 5 files per chunk seems to be the sweet spot for slow HDDs
function findExternal(chunks = 5) {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		const playlists = list.dataAll
			.filter((pls) => !pls.isAutoPlaylist && pls.extension !== '.xsp' && !pls.isFolder);
		const libItems = fb.GetLibraryItems();
		const total = playlists.length - 1;
		let prevProgress = -1;
		const subsongRe = subsongRegex;
		const tf = fb.TitleFormat(pathTF);
		console.log('Playlist Manager: Retrieving file paths.');
		Promise.serial(
			playlists,
			(playlist) => {
				return (playlist.extension === '.ui'
					? tf.EvalWithMetadbs(getHandlesFromUIPlaylists([playlist.nameId], false))
					: getFilePathsFromPlaylist(playlist.path)
				);
			},
			60
		).then((filePathsArr) => {
			return Promise.serial(
				filePathsArr,
				async (filePaths, i) => {
					if (!arePathsInMediaLibrary(filePaths, list.playlistsPath, libItems)) {
						const playlist = playlists[i];
						const bUI = playlist.extension === '.ui';
						// Skip streams & look for absolute and relative paths (with and without .\)
						let bDead;
						await Promise.serial(
							filePaths.chunk(chunks),
							(filePathsChunk) => {
								if (!bDead) {
									bDead = filePathsChunk
										.map((path) => path.replace(subsongRe, ''))
										.some((path) => !testPath(path, list.playlistsPath) && !_isLink(path));
								}
							},
							15
						);
						if (bDead) {
							report.push((bUI ? playlist.nameId : playlist.path) + ' (contains dead items)');
						} else {
							report.push(bUI ? playlist.nameId : playlist.path);
						}
						found.push(playlist);
					}
					const progress = total ? Math.round(i / total * 10) * 10 : 100;
					if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking external items ' + progress + '%.'); }
				},
				60
			);
		}).then(() => {
			resolve({ found, report });
		});
	});
}

function findDead(chunks = 5) {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		const playlists = list.dataAll
			.filter((pls) => !pls.isAutoPlaylist && pls.extension !== '.xsp' && !pls.isFolder);
		const total = playlists.length - 1;
		let prevProgress = -1;
		const subsongRe = subsongRegex;
		const tf = fb.TitleFormat(pathTF);
		console.log('Playlist Manager: Retrieving file paths.');
		Promise.serial(
			playlists,
			(playlist) => {
				return (playlist.extension === '.ui'
					? tf.EvalWithMetadbs(getHandlesFromUIPlaylists([playlist.nameId], false))
					: getFilePathsFromPlaylist(playlist.path)
				).map((path) => path.replace(subsongRe, ''));
			},
			60
		).then((filePathsArr) => {
			return Promise.serial(
				filePathsArr,
				async (filePaths, i) => {
					// Skip streams & look for absolute and relative paths (with and without .\)
					let bDead;
					await Promise.serial(
						filePaths.chunk(chunks),
						(filePathsChunk) => {
							if (!bDead) {
								bDead = filePathsChunk.some((path) => {
									return !testPath(path, list.playlistsPath) && !_isLink(path);
								});
							}
						},
						15
					);
					if (bDead) { found.push(playlists[i]); }
					const progress = total ? Math.round(i / total * 10) * 10 : 100;
					if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking dead items ' + progress + '%.'); }
				},
				30
			);
		}).then(() => {
			if (found.length && !report.length) { found.forEach((pls) => { report.push(pls.extension === '.ui' ? pls.nameId : pls.path); }); }
			resolve({ found, report });
		});
	});
}

function findDuplicatesByPath() {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		const playlists = list.dataAll
			.filter((pls) => !pls.isAutoPlaylist && pls.extension !== '.xsp' && !pls.isFolder);
		const total = playlists.length - 1;
		let prevProgress = -1;
		const tf = fb.TitleFormat(pathTF);
		console.log('Playlist Manager: Retrieving file paths.');
		Promise.serial(
			playlists,
			(playlist) => {
				return (playlist.extension === '.ui'
					? tf.EvalWithMetadbs(getHandlesFromUIPlaylists([playlist.nameId], false))
					: getFilePathsFromPlaylist(playlist.path)
				);
			},
			60
		).then((filePathsArr) => {
			return Promise.serial(
				filePathsArr,
				(filePaths, i) => {
					if (new Set(filePaths).size !== filePaths.length) { found.push(playlists[i]); }
					const progress = total ? Math.round(i / total * 10) * 10 : 100;
					if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking duplicates ' + progress + '%.'); }
				},
				60
			);
		}).then(() => {
			if (found.length && !report.length) { found.forEach((pls) => { report.push(pls.extension === '.ui' ? pls.nameId : pls.path); }); }
			resolve({ found, report });
		});
	});
}

function findDuplicatesByTF(checkKeys = globTags.remDupl, mode = 'all' /* all|pls|autopls */) {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		const playlists = list.dataAll
			.filter(
				mode === 'all'
					? (pls) => !pls.isFolder
					: mode === 'pls'
						? (pls) => !pls.isAutoPlaylist && pls.extension !== '.xsp' && !pls.isFolder
						: (pls) => pls.isAutoPlaylist || (pls.extension === '.xsp' && pls.type === 'songs')
			);
		const libItems = fb.GetLibraryItems();
		const total = playlists.length - 1;
		let prevProgress = -1;
		// Handle lists require a lot of memory, so every playlist is processed serially, instead of caching all handles first
		console.log('Playlist Manager: Retrieving handles (serial).');
		Promise.serial(
			playlists,
			(playlist, i) => {
				return Promise.resolve(
					playlist.extension === '.ui'
						? getHandlesFromUIPlaylists([playlist.nameId], false)
						: playlist.isAutoPlaylist
							? fb.GetQueryItems(libItems, stripSort(playlist.query))
							: playlist.extension === '.fpl' && list.fplRules.bNonTrackedSupport
								? getHandlesFromPlaylistV2({ playlistPath: playlist.path, bOmitNotFound: true, bReturnNotFound: true, poolItems: libItems })
									.then((out) => out.handlePlaylist)
								: getHandlesFromPlaylist({ playlistPath: playlist.path, relPath: list.playlistsPath, bOmitNotFound: true, poolItems: libItems })
				)
					.then((handleList) => Promise.wait(15).then(() => handleList))
					.then((handleList) => {
						if (handleList) {
							const duplicates = showDuplicates({ handleList, checkKeys, bAdvTitle: list.bAdvTitle, bMultiple: list.bMultiple });
							const count = duplicates && duplicates.Count;
							let bDone = false;
							if (count) { report.push((playlist.path || playlist.name) + ' (' + count + ' duplicates)'); bDone = true; }
							if (bDone) { found.push(playlist); }
						}
						const progress = total ? Math.round(i / total * 10) * 10 : 100;
						if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking duplicates ' + progress + '%.'); }
					});
			},
			60
		).then(() => {
			resolve({ found, report });
		});
	});
}

function findSizeMismatch() {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		const playlists = list.dataAll
			.filter((pls) => !pls.isAutoPlaylist && pls.extension !== '.xsp' && pls.extension !== '.ui' && !pls.isFolder);
		const total = playlists.length - 1;
		let prevProgress = -1;
		const newLineRegex = /\r\n|\n\r|\n|\r/;
		console.log('Playlist Manager: Retrieving file paths.');
		Promise.serial(
			playlists,
			(playlist) => getFilePathsFromPlaylist(playlist.path).length,
			60
		).then((filePathsArr) => {
			return Promise.serial(
				filePathsArr,
				(filePathsNum, i) => {
					const playlist = playlists[i];
					const bFpl = playlist.extension === '.fpl';
					if (bFpl) { console.log(filePathsNum, playlist.path); }
					let text = _isFile(playlist.path) ? _open(playlist.path) : void (0);
					let size;
					if (!bFpl && typeof text !== 'undefined' && text.length) {
						const codePage = checkCodePage(text, playlist.extension);
						if (codePage !== -1) { text = _open(playlist.path, codePage, true); }
						if (playlist.extension === '.m3u8' || playlist.extension === '.m3u') {
							text = text.split(newLineRegex);
							const lines = text.length;
							let j = 0;
							while (j < lines) { // Changes size Line
								if (text[j].startsWith('#PLAYLISTSIZE:')) {
									size = Number(text[j].split(':')[1]);
									break;
								}
								j++;
							}
						} else if (playlist.extension === '.pls') {
							text = text.split(newLineRegex);
							const lines = text.length;
							if (text[lines - 2].startsWith('NumberOfEntries=')) {
								size = Number(text[lines - 2].split('=')[1]);
							}
						} else if (playlist.extension === '.strm') {
							text = text.split(newLineRegex);
							size = 0;
							for (let line of text) {
								if (line.trim().length) { size++; }
							}
						} else if (playlist.extension === '.xspf') {
							const bCache = xspfCache.has(playlist.path);
							const xmldom = bCache ? null : xmlDomCache.get(playlist.path) || XSPF.XMLfromString(text);
							const jspf = bCache ? xspfCache.get(playlist.path) : XSPF.toJSPF(xmldom, false);
							if (Object.hasOwn(jspf, 'playlist') && jspf.playlist) {
								const jPls = jspf.playlist;
								if (Object.hasOwn(jPls, 'meta') && Array.isArray(jPls.meta) && jPls.meta.length) {
									for (let metaData of jPls.meta) {
										if (Object.hasOwn(metaData, 'playlistSize')) { size = typeof metaData.playlistSize !== 'undefined' ? Number(metaData.playlistSize) : null; }
									}
								}
							}
						}
					} else if (bFpl) { size = playlist.size; } // Actual value
					let bDone = false;
					if ((typeof text === 'undefined' || !text.length) && !bFpl) { report.push(playlist.path + ' (blank)'); bDone = true; }
					else if (typeof size === 'undefined') { report.push(playlist.path + ' (no size tag found)'); bDone = true; }
					else if (filePathsNum !== size) { report.push(playlist.path + ' (tag: ' + size + ', paths: ' + filePathsNum + ')'); bDone = true; }
					else if (playlist.extension === '.strm' && size > 1) {
						report.push(playlist.path + ' (paths: ' + filePathsNum + ', .strm size can not be > 1)');
						bDone = true;
					}
					if (bDone) { found.push(playlist); }
					const progress = total ? Math.round(i / total * 10) * 10 : 100;
					if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking size ' + progress + '%.'); }
				},
				60
			);
		}).then(() => {
			resolve({ found, report });
		});
	});
}

function findDurationMismatch() {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		let bSave = false;
		const playlists = list.dataAll
			.filter((pls) => !pls.isAutoPlaylist && pls.extension !== '.xsp' && pls.extension !== '.ui' && !pls.isFolder);
		const libItems = fb.GetLibraryItems();
		const total = playlists.length - 1;
		let prevProgress = -1;
		const newLineRegex = /\r\n|\n\r|\n|\r/;
		// Handle lists require a lot of memory, so every playlist is processed serially, instead of caching all handles first
		console.log('Playlist Manager: Retrieving handles (serial).');
		Promise.serial(
			playlists,
			(playlist, i) => {
				return Promise.resolve(
					playlist.extension === '.fpl' && list.fplRules.bNonTrackedSupport
						? getHandlesFromPlaylistV2({ playlistPath: playlist.path, bOmitNotFound: true, bReturnNotFound: true, poolItems: libItems })
							.then((out) => out.handlePlaylist)
						: getHandlesFromPlaylist({ playlistPath: playlist.path, relPath: list.playlistsPath, poolItems: libItems })
				)
					.then((handleList) => Promise.wait(15).then(() => handleList))
					.then((handleList) => {
						if (handleList) {
							const bFpl = playlist.extension === '.fpl';
							const calcDuration = round(handleList.CalcTotalDuration(), 2);
							let text = _isFile(playlist.path) ? _open(playlist.path) : void (0);
							let duration;
							if (!bFpl && typeof text !== 'undefined' && text.length) {
								const codePage = checkCodePage(text, playlist.extension);
								if (codePage !== -1) { text = _open(playlist.path, codePage, true); }
								if (playlist.extension === '.m3u8' || playlist.extension === '.m3u') {
									text = text.split(newLineRegex);
									const lines = text.length;
									let j = 0;
									while (j < lines) { // Changes duration Line
										if (text[j].startsWith('#DURATION:')) {
											duration = Number(text[j].split(':')[1]);
											break;
										}
										j++;
									}
								} else if (playlist.extension === '.xspf') {
									const bCache = xspfCache.has(playlist.path);
									const xmldom = bCache ? null : xmlDomCache.get(playlist.path) || XSPF.XMLfromString(text);
									const jspf = bCache ? xspfCache.get(playlist.path) : XSPF.toJSPF(xmldom, false);
									if (Object.hasOwn(jspf, 'playlist') && jspf.playlist) {
										const jPls = jspf.playlist;
										if (Object.hasOwn(jPls, 'meta') && Array.isArray(jPls.meta) && jPls.meta.length) {
											for (let metaData of jPls.meta) {
												if (Object.hasOwn(metaData, 'duration')) { duration = typeof metaData.playlistSize !== 'undefined' ? Number(metaData.duration) : null; }
											}
										}
									}
								}
							} else if (bFpl) { // Cached value
								duration = playlist.duration;
								if (calcDuration !== duration) { // Also update value for future usage
									playlist.duration = calcDuration;
									bSave = true;
								}
							}
							let bDone = false;
							if (typeof duration === 'undefined') { report.push(playlist.path + ' (no duration tag found)'); bDone = true; }
							else if (calcDuration !== duration) { report.push(playlist.path + ' (tag: ' + duration + ', calculated: ' + calcDuration + ')'); bDone = true; }
							if (bDone) { found.push(playlist); }
						}
						const progress = total ? Math.round(i / total * 10) * 10 : 100;
						if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking duration ' + progress + '%.'); }
					});
			},
			60
		).then(() => {
			if (bSave) { list.save(); }
			resolve({ found, report });
		});
	});
}

function findBlank() {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		const playlists = list.dataAll
			.filter((pls) => !pls.isAutoPlaylist && pls.extension !== '.fpl' && pls.extension !== '.ui' && !pls.isFolder);
		const total = playlists.length - 1;
		let prevProgress = -1;
		const newLineRegex = /\r\n|\n\r|\n|\r/;
		Promise.serial(
			playlists,
			(playlist, i) => {
				let text = _isFile(playlist.path) ? _open(playlist.path) : void (0);
				let size, lines;
				if (typeof text !== 'undefined' && text.length) {
					const codePage = checkCodePage(text, playlist.extension);
					if (codePage !== -1) { text = _open(playlist.path, codePage, true); }
					lines = text.split(newLineRegex);
					size = lines.filter(Boolean).length;
					lines = lines.length;
				}
				let bDone = false;
				if (typeof text === 'undefined' || typeof size === 'undefined') { report.push(playlist.path + ' (blank)'); bDone = true; }
				else if (size !== lines) { report.push(playlist.path + ' (Blank: ' + (lines - size) + ', lines: ' + lines + ')'); bDone = true; }
				if (bDone) { found.push(playlist); }
				const progress = total ? Math.round(i / total * 10) * 10 : 100;
				if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking blank lines ' + progress + '%.'); }
			},
			60
		).then(() => {
			resolve({ found, report });
		});
	});
}

function findSubSongs(mode = 'pls' /* all|pls|autopls */) {
	const found = [];
	const report = [];
	mode = mode.toLowerCase();
	const filterFunc = mode === 'pls'
		? (pls) => !pls.isAutoPlaylist && pls.extension !== '.xsp' && !pls.isFolder
		: mode === 'autopls'
			? (pls) => pls.isAutoPlaylist || (Object.hasOwn(pls, 'type') && pls.type === 'songs')
			: (pls) => !pls.isFolder;
	return new Promise((resolve) => {
		const playlists = list.dataAll.filter(filterFunc);
		const libItems = fb.GetLibraryItems();
		const total = playlists.length - 1;
		let prevProgress = -1;
		const tf = fb.TitleFormat(pathTF);
		console.log('Playlist Manager: Retrieving handles and paths (serial).');
		Promise.serial(
			playlists,
			(playlist, i) => {
				const bUI = playlist.extension === '.ui';
				return Promise.resolve(
					// Needs a handle list for UI-only playlists, AutoPlaylists and Smart Playlists
					// Otherwise directly extracts the path for the playlist file
					playlist.isAutoPlaylist || playlist.query || !bUI
						? !bUI
							? playlist.isAutoPlaylist
								? fb.GetQueryItems(libItems, stripSort(playlist.query))
								: playlist.extension === '.fpl' && list.fplRules.bNonTrackedSupport
									? getHandlesFromPlaylistV2({ playlistPath: playlist.path, bOmitNotFound: true, bReturnNotFound: true, poolItems: libItems })
										.then((out) => out.handlePlaylist)
									: getHandlesFromPlaylist({ playlistPath: playlist.path, relPath: list.playlistsPath, bOmitNotFound: true, poolItems: libItems })
							: getHandlesFromUIPlaylists([playlist.nameId], false) // Omit not found
						: null
				)
					.then((handleList) => Promise.wait(15).then(() => handleList))
					.then((handleList) => handleList
						? tf.EvalWithMetadbs(handleList)
						: getFilePathsFromPlaylist(playlist.path)
					)
					.then((filePaths) => Promise.wait(15).then(() => filePaths))
					.then((filePaths) => {
						const count = filePaths.reduce((total, path) => (isSubsongPath(path) ? total + 1 : total), 0);
						if (count) {
							found.push(playlist);
							report.push((bUI || playlist.isAutoPlaylist ? playlist.nameId : playlist.path) + ' ' + _p(count + ' items'));
						}
						const progress = total ? Math.round(i / total * 10) * 10 : 100;
						if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking subsong items ' + progress + '%.'); }
					});
			},
			60
		).then(() => {
			resolve({ found, report });
		});
	});
}

function findFormatErrors() {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		const playlists = list.dataAll.filter((pls) => !pls.isFolder);
		const total = playlists.length - 1;
		let prevProgress = -1;
		const newLineRegex = /\r\n|\n\r|\n|\r/;
		Promise.serial(
			playlists,
			(playlist, i) => {
				let bDone = false;
				const errors = [];
				if ((playlist.isAutoPlaylist || playlist.query) && playlist.extension !== '.ui') { // Invalid queries
					if (!checkQuery(playlist.query, true, true, playlist.extension === '.xsp')) { // Allow #PLAYLIST# on XSP
						bDone = true;
						errors.push('Invalid query');
					}
				}
				if (playlist.extension === '.xsp') {
					if (Object.hasOwn(playlist, 'type') && playlist.type !== 'songs') { // Type on XSP playlists
						bDone = true;
						errors.push('Invalid type');
					}
				} else if (playlist.extension === '.strm') { // STRM with multiple lines
					let text = _isFile(playlist.path) ? _open(playlist.path) : void (0);
					let lines;
					if (typeof text !== 'undefined' && text.length) {
						const codePage = checkCodePage(text, playlist.extension);
						if (codePage !== -1) { text = _open(playlist.path, codePage, true); }
						lines = text.split(newLineRegex).filter(Boolean).length;
					}
					if (lines > 1) {
						bDone = true;
						errors.push('Multiple tracks');
					}
				} else if (playlist.extension === '.fpl') { // FPL not saved via 'Save playlist'
					const jspf = fplCache.get(playlist.path) || FPL.parseFile(playlist.path);
					if (jspf.playlist.meta.some((m) => Object.hasOwn(m, 'magic') && m.magic !== FPL.MAGIC)) {
						bDone = true;
						errors.push('Non recognized magic number');
					}
					if (!fplCache.has(playlist.path)) { fplCache.set(playlist.path, jspf); }
				}
				if (bDone) {
					found.push(playlist);
					report.push((playlist.extension === '.ui' || playlist.isAutoPlaylist ? playlist.nameId : playlist.path) + ' ' + _p(errors.join(', ')));
				}
				const progress = total ? Math.round(i / total * 10) * 10 : 100;
				if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking format errors ' + progress + '%.'); }
			},
			60
		).then(() => {
			resolve({ found, report });
		});
	});
}

function findCircularReferences() {
	const found = [];
	const report = [];
	return new Promise((resolve) => {
		const playlists = list.dataAll.filter((pls) => pls.extension === '.xsp' && pls.type === 'songs');
		const total = playlists.length - 1;
		let prevProgress = -1;
		Promise.serial(
			playlists,
			(playlist, i) => {
				if (list.checkCircularXsp({ pls: playlist })) {
					found.push(playlist);
					report.push(playlist.path);
				}
				const progress = total ? Math.round(i / total * 10) * 10 : 100;
				if (progress > prevProgress) { prevProgress = progress; console.log('Playlist Manager: Checking circular references ' + progress + '%.'); }
			},
			60
		).then(() => {
			resolve({ found, report });
		});
	});
}