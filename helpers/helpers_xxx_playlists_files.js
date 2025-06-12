'use strict';
//11/06/25

/* exported savePlaylist, addHandleToPlaylist, precacheLibraryRelPaths, precacheLibraryPathsAsync, loadTracksFromPlaylist, arePathsInMediaLibrary, loadPlaylists, getFileMetaFromPlaylist, loadXspPlaylist */

include(fb.ComponentPath + 'docs\\Codepages.js');
include('helpers_xxx.js');
/* global globQuery:readable, iStepsLibrary:readable, iDelayLibraryPLM:readable */
include('helpers_xxx_prototypes.js');
/* global nextId:readable, _p:readable, isArrayStrings:readable, isArray:readable, escapeRegExp:readable, round:readable, toType:readable */
include('helpers_xxx_file.js');
/* global _isFile:readable, _open:readable, checkCodePage:readable, _isLink:readable, utf8:readable, _save:readable, _copyFile:readable, _renameFile:readable, _deleteFile:readable, youTubeRegExp:readable */
include('helpers_xxx_tags.js');
/* global checkQuery:readable, getSortObj:readable, getHandleListTagsV2:readable, queryCombinations:readable, isSubsongPath:readable, fileRegex:readable */
include('helpers_xxx_playlists.js');
/* global getHandlesFromUIPlaylists:readable */
include('helpers_xxx_playlists_files_xspf.js');
/* global XSPF:readable*/
include('helpers_xxx_playlists_files_xsp.js');
/* global XSP:readable*/
include('helpers_xxx_playlists_files_fpl.js');
/* global FPL:readable*/

/*
	Global Variables
*/

// Playlists descriptors
const playlistDescriptors = {
	// Physical items
	'.m3u': /* .... */ { isWritable: true, isReadable: true, isLoadable: true, icon: '\uf15c', iconBg: null },
	'.m3u8': /* ... */ { isWritable: true, isReadable: true, isLoadable: true, icon: '\uf15c', iconBg: null },
	'.pls': /* .... */ { isWritable: true, isReadable: true, isLoadable: true, icon: '\uf15c', iconBg: null },
	'.xspf': /* ... */ { isWritable: true, isReadable: true, isLoadable: true, icon: '\uf1e0', iconBg: null },
	'.xsp': /* ...................... */ { isReadable: true, isLoadable: true, icon: '\uf0d0', iconBg: null },
	'.strm': /* ..................... */ { isReadable: true, isLoadable: true, icon: '\uf0f6', iconBg: null },
	'.fpl': /* ...................... */ { isReadable: true, isLoadable: true, icon: '\uf1c6', iconBg: null },
	// Abstract items
	'.ui': /* ........................................................... */ { icon: '\uf26c', iconBg: null },
	autoPlaylist: /* ................................................ */ { icon: '\uf0e7', iconBg: '\uf15b' },
	blank: /* ........................................................... */ { icon: '\uf15b', iconBg: null },
	locked: /* ........................................................... */ { icon: '\uf023', iconBg: null }
};
const writablePlaylistFormats = new Set(); // NOSONAR [Writable Formats]
const readablePlaylistFormats = new Set(); // NOSONAR [Readable Formats (to retrieve paths)]
const loadablePlaylistFormats = new Set(); // NOSONAR [loadable Formats (shown as files)]
Object.keys(playlistDescriptors).forEach((key) => {
	if (playlistDescriptors[key].isWritable) { writablePlaylistFormats.add(key); }
	if (playlistDescriptors[key].isReadable) { readablePlaylistFormats.add(key); }
	if (playlistDescriptors[key].isLoadable) { loadablePlaylistFormats.add(key); }
});

// XSPF cache
// Parser is too slow when retrieving tracks... so the object is cached for consecutive uses
const xspfCache = new Map(); // {PATH: JSPF playlist}

// XSP cache
// Not so slow than XSPF but doesn't hurt
const xspCache = new Map(); // {PATH: JSP playlist}

// FPL cache
// Parser is too slow when retrieving tracks... so the object is cached for consecutive uses
const fplCache = new Map(); // {PATH: FPL playlist}

// XML Dom cache
const xmlDomCache = new Map(); // {PATH: XSPF.XMLfromString() -> JSPF playlist}

// Query cache (Library)
// Makes consecutive playlist loading by queries much faster (for ex. .xspf fuzzy matching)
const queryCache = new Map(); // NOSONAR[{Query: handleList}]

// Path TitleFormat to compare tracks against library
const pathTF = '$puts(ext,$lower($ext(%_PATH_RAW%)))$replace(%_PATH_RAW%,\'file://\',,\'file-relative://\',)$if($if($stricmp($get(ext),dsf),$not(0),$if($stricmp($get(ext),wv),$if($strstr($lower($info(codec)),dst),$not(0),$if($strstr($lower($info(codec)),dsd),$not(0),)))),,$ifequal(%SUBSONG%,0,,\',\'%SUBSONG%))';

/*
	Playlist file manipulation
*/

//	For XSP playlists use this:
//		const jspPls = XSP.emptyJSP();
//		... (set rules) ...
//		const xspText = XSP.toXSP(jspPls);
//		_save(path, xspText.join('\r\n'));
function savePlaylist({ playlistIndex, handleList, playlistPath, ext = '.m3u8', playlistName = '', UUID = null, useUUID = null, bLocked = false, category = '', tags = [], relPath = '', trackTags = [], playlist_mbid = '', author = 'Playlist-Manager-SMP', description = '', bBOM = false, bExtendedM3U = true }) {
	if ((playlistIndex === -1 || typeof playlistIndex === 'undefined' || playlistIndex === null) && !handleList) {
		console.log('savePlaylist(): invalid sources ' + _p(playlistIndex + ', handleList === false'));
		return false;
	}
	const extension = ext.toLowerCase();
	if (!writablePlaylistFormats.has(extension)) {
		console.log('savePlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + [...writablePlaylistFormats].join(', '));
		return false;
	}
	if (!_isFile(playlistPath)) {
		if (!handleList) { handleList = plman.GetPlaylistItems(playlistIndex); }
		const itemsCount = handleList.Count;
		const arr = utils.SplitFilePath(playlistPath);
		playlistPath = playlistPath.replaceLast(arr[2], extension);
		if (!playlistName.length) { playlistName = (arr[1].endsWith(arr[2])) ? arr[1].replace(arr[2], '') : arr[1]; } // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
		let playlistText = [];
		let jspfCache;
		let bSaveBuiltIn;
		const relPathSplit = relPath.length ? relPath.split('\\').filter(Boolean) : null;
		// -------------- m3u
		if (extension === '.m3u8' || extension === '.m3u') {
			if (bExtendedM3U) {
				// Header text
				playlistText.push('#EXTM3U');
				playlistText.push('#EXTENC:UTF-8');
				playlistText.push('#PLAYLIST:' + playlistName);
				if (!UUID) { UUID = useUUID ? nextId(useUUID) : ''; } // May be visible or invisible chars!
				playlistText.push('#UUID:' + UUID);
				playlistText.push('#LOCKED:' + bLocked);
				playlistText.push('#CATEGORY:' + category);
				playlistText.push('#TAGS:' + (isArrayStrings(tags) ? tags.join(';') : ''));
				playlistText.push('#TRACKTAGS:' + (isArray(trackTags) ? JSON.stringify(trackTags) : ''));
				playlistText.push('#PLAYLISTSIZE:');
				playlistText.push('#DURATION:');
				playlistText.push('#PLAYLIST_MBID:' + playlist_mbid);
				playlistText.push('#AUTHOR:' + author);
				playlistText.push('#DESCRIPTION:' + description);
			}
			// Tracks text
			if (playlistIndex !== -1) { // Tracks from playlist
				let trackText = [];
				const tfo = bExtendedM3U
					? fb.TitleFormat('#EXTINF:%_LENGTH_SECONDS%\',\'%ARTIST% - %TITLE%$crlf()' + pathTF)
					: fb.TitleFormat(pathTF);
				trackText = tfo.EvalWithMetadbs(handleList);
				if (bExtendedM3U) {
					if (relPath.length) { // Relative path conversion
						let trackPath = '';
						let trackInfo = '';
						trackText = trackText.map((item) => {
							[trackInfo, trackPath] = item.split(/\r\n|\n\r|\n|\r/);
							trackPath = _isLink(trackPath) ? trackPath : getRelPath(trackPath, relPathSplit);
							return trackInfo + '\r\n' + trackPath;
						});
					}
					playlistText[8] += itemsCount.toString(); // Add number of tracks to size
					playlistText[9] += round(handleList.CalcTotalDuration(), 2); // Add time to duration
					playlistText = playlistText.concat(trackText);
				} else {
					if (relPath.length) { // Relative path conversion
						trackText = trackText.map((item) => _isLink(item) ? item : getRelPath(item, relPathSplit));
					}
					playlistText = playlistText.concat(trackText);
				}
			} else if (bExtendedM3U) { //  Else empty playlist
				playlistText[8] += '0'; // Add number of tracks to size
				playlistText[9] += '0'; // Add time to duration
			}
			// ---------------- PLS
		} else if (extension === '.pls') { // The standard doesn't allow comments... so no UUID here.
			// Header text
			playlistText.push('[playlist]');
			// Tracks text
			if (playlistIndex !== -1) { // Tracks from playlist
				let trackText = [];
				const trackInfoPre = 'File#placeholder#=';
				const tfo = fb.TitleFormat((relPath.length ? '' : trackInfoPre) + '%PATH%' + '$crlf()Title#placeholder#=%TITLE%' + '$crlf()Length#placeholder#=%_LENGTH_SECONDS%');
				trackText = tfo.EvalWithMetadbs(handleList);
				if (relPath.length) { // Relative path conversion
					let trackPath = '';
					let trackInfo = '';
					trackText = trackText.map((item) => {
						[trackPath, ...trackInfo] = item.split(/\r\n|\n\r|\n|\r/);
						trackPath = _isLink(trackPath) ? trackPath : getRelPath(trackPath, relPathSplit);
						return trackInfoPre + trackPath + '\r\n' + trackInfo.join('\r\n');
					});
				}
				//Fix file numbering since foobar2000 doesn't output list index...
				let trackTextLength = trackText.length;
				for (let i = 0; i < trackTextLength; i++) { // It appears 3 times...
					trackText[i] = trackText[i].replace('#placeholder#', i + 1).replace('#placeholder#', i + 1).replace('#placeholder#', i + 1);
					trackText[i] += '\r\n'; // EoL after every track info group... just for readability
				}
				playlistText = playlistText.concat(trackText);
				playlistText.push('NumberOfEntries=' + itemsCount); // Add number of tracks to size footer
			} else { //  Else empty playlist footer
				playlistText.push('NumberOfEntries=0');
			}
			// End of Footer
			playlistText.push('Version=2');
			// ---------------- XSPF
		} else if (extension === '.xspf') {
			const jspf = XSPF.emptyJSPF();
			const playlist = jspf.playlist;
			const bHasAuthor = author && author.length;
			const bHasAnnotation = description && description.length;
			// Header text
			let totalDuration = 0; // In s
			playlist.title = playlistName;
			playlist.creator = (bHasAuthor ? author + ' - ' : '') + 'Playlist-Manager-SMP';
			playlist.date = new Date().toISOString();
			playlist.identifier = playlist_mbid.length ? 'https://listenbrainz.org/playlist/' + playlist_mbid : '';
			playlist.location = playlist.identifier;
			if (bHasAuthor) { playlist.info = 'https://listenbrainz.org/user/' + author + '/playlists/'; }
			if (bHasAnnotation) { playlist.annotation = description; }
			playlist.meta = [
				{ uuid: (useUUID ? nextId(useUUID) : '') },
				{ locked: bLocked },
				{ category },
				{ tags: (isArrayStrings(tags) ? tags.join(';') : '') },
				{ trackTags: (isArray(trackTags) ? JSON.stringify(trackTags) : '') },
				{ playlistSize: 0 },
				{ duration: totalDuration },
				{ playlist_mbid }
			];
			// Tracks text
			if (playlistIndex !== -1) { // Tracks from playlist
				const tags = getHandleListTagsV2(handleList, ['TITLE', 'ARTIST', 'ALBUM', 'TRACK', 'LENGTH_SECONDS_FP', '_PATH_RAW', 'SUBSONG', 'MUSICBRAINZ_TRACKID']);
				for (let i = 0; i < itemsCount; i++) {
					const title = tags[0][i][0];
					const creator = tags[1][i].join(', ');
					const album = tags[2][i][0];
					const trackNum = Number(tags[3][i][0]);
					const duration = Math.round(Number(tags[4][i][0] * 1000)); // In ms
					totalDuration += Math.round(Number(tags[4][i][0])); // In s
					const bLink = _isLink(tags[5][i][0]);
					const trackPath = tags[5][i][0].replace(fileRegex, '');
					const location = [
						relPath.length && !bLink
							? getRelPath(trackPath, relPathSplit)
							: trackPath
					].map((path) => {
						return (bLink ? '' : 'file:///') + encodeURIComponent(path.replace(/\\/g, '/'));
					});
					const subSong = Number(tags[6][i][0]);
					const meta = isSubsongPath(location[0] + ',' + subSong) ? [{ subSong }] : [];
					const identifier = [tags[7][i][0]];
					playlist.track.push({
						location,
						annotation: void (0),
						title,
						creator,
						info: void (0),
						image: void (0),
						album,
						duration,
						trackNum,
						identifier,
						extension: {},
						link: [],
						meta
					});
				}
				// Update total duration of playlist
				playlist.meta.find((obj) => { return Object.hasOwn(obj, 'duration'); }).duration = totalDuration;
				playlist.meta.find((obj) => { return Object.hasOwn(obj, 'playlistSize'); }).playlistSize = itemsCount;
			}
			playlistText = XSPF.toXSPF(jspf);
			jspfCache = jspf;
		} else if (extension === '.fpl') { // Requires JSplitter > v4.0.4/v3.7.2 or SMP marc2k3's mod > v1.6.2.25.05.13
			handleList.SaveAs(playlistPath);
			bSaveBuiltIn = true;
		}
		// Write to file
		if (!bSaveBuiltIn) { playlistText = playlistText.join('\r\n'); }
		let bDone = bSaveBuiltIn
			? _isFile(playlistPath)
			: _save(playlistPath, playlistText, bBOM);
		// Check
		if (bDone && !bSaveBuiltIn) {
			if (_isFile(playlistPath)) {
				let check = _open(playlistPath, utf8);
				bDone = (check === playlistText);
				// Delete cache after edit
				if (bDone && extension === '.xspf') {
					xmlDomCache.delete(playlistPath); // NOSONAR [cache filled elsewhere]
					xspfCache.set(playlistPath, jspfCache);
				}
			} else { bDone = false; }
		}
		return bDone ? playlistPath : false;
	}
	return false;
}

/**
 * Adds a handle list to a playlist file
 *
 * @function
 * @name addHandleToPlaylist
 * @kind function
 * @param {FbMetadbHandleList} handleList
 * @param {string} playlistPath
 * @param {string} relPath?
 * @param {boolean} bBOM?
 * @returns {boolean} Sucess flag
 */
function addHandleToPlaylist(handleList, playlistPath, relPath = '', bBOM = false) {
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	if (!writablePlaylistFormats.has(extension)) {
		console.log('addHandleToPlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + [...writablePlaylistFormats].join(', '));
		return false;
	}
	if (_isFile(playlistPath)) {
		let playlistText, bSaveBuiltIn;
		const backPath = playlistPath + '.back';
		if (extension === '.fpl') {
			const plsItems = getHandlesFromPlaylist({ playlistPath, relPath, bOmitNotFound: true, bReturnNotFound: true });
			if (plsItems.pathsNotFound.length) {
				console.log('addHandleToPlaylist(): .fpl playlists contains items non-tracked on library.');
				return false;
			}
			const oldHandleList = plsItems.handleList || new FbMetadbHandleList();
			oldHandleList.AddRange(handleList);
			_copyFile(playlistPath, backPath);
			oldHandleList.SaveAs(playlistPath);
			bSaveBuiltIn = true;
		} else {
			// Read original file
			let originalText = _open(playlistPath);
			let bFound = false;
			const addSize = handleList.Count;
			if (!addSize) { return false; }
			const addDuration = handleList.CalcTotalDuration();
			let trackText = [];
			let size;
			let duration;
			if (typeof originalText !== 'undefined' && originalText.length) { // We don't check if it's a playlist by its content! Can break things if used wrong...
				// Safe checks to ensure proper encoding detection
				const codePage = checkCodePage(originalText, extension);
				if (codePage !== -1) { originalText = _open(playlistPath, codePage); }
				// ---------------- M3U
				if (extension === '.m3u8' || extension === '.m3u') {
					bFound = true; // no check for m3u8 since it can be anything
					originalText = originalText.split(/\r\n|\n\r|\n|\r/);
					const lines = originalText.length;
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
					while (j < lines) { // Changes duration Line
						if (originalText[j].startsWith('#DURATION:')) {
							duration = Number(originalText[j].split(':')[1]);
							const newDuration = round(duration + addDuration, 2);
							originalText[j] = '#DURATION:' + newDuration;
							break;
						}
						j++;
					}
					while (!originalText[originalText.length - 1].trim().length) { originalText.pop(); } // Remove blank lines at end
					// ---------------- PLS
				} else if (extension === '.pls') {
					originalText = originalText.split(/\r\n|\n\r|\n|\r/);
					const lines = originalText.length;
					if (originalText[lines - 2].startsWith('NumberOfEntries=')) {
						bFound = true;
						// End of Footer
						size = Number(originalText[lines - 2].split('=')[1]);
						const newSize = size + addSize;
						trackText.push('NumberOfEntries=' + newSize);
						trackText.push('Version=2');
						while (!originalText[originalText.length - 1].trim().length) { originalText.pop(); } // Remove blank lines at end
						originalText.pop(); //Removes old NumberOfEntries=..
						originalText.pop(); //Removes old Version=..
					} else { return false; } // Safety check
					// ---------------- XSPF
				} else if (extension === '.xspf') {
					const bCache = xspfCache.has(playlistPath);
					const xmldom = bCache ? null : xmlDomCache.get(playlistPath) || XSPF.XMLfromString(originalText); // NOSONAR [cache filled elsewhere]
					const jspf = bCache ? xspfCache.get(playlistPath) : XSPF.toJSPF(xmldom, false); // NOSONAR [cache filled elsewhere]
					if (Object.hasOwn(jspf, 'playlist') && jspf.playlist && Object.hasOwn(jspf.playlist, 'track')) { bFound = true; } // Safety check
					else { return false; } // Safety check
					originalText = originalText.split(/\r\n|\n\r|\n|\r/);
					while (!originalText[originalText.length - 1].trim().length) { originalText.pop(); } // Remove blank lines at end
					originalText.pop(); //Removes </trackList>
					originalText.pop(); //Removes </playlist>
					trackText.push('	</trackList>');
					trackText.push('</playlist>');
				}
			}
			if (!bFound) { return false; } // Safety check
			// New text
			const relPathSplit = relPath.length ? relPath.split('\\').filter(Boolean) : null;
			// -------------- M3U
			if (extension === '.m3u8' || extension === '.m3u') {
				// Tracks text
				const tfo = fb.TitleFormat('#EXTINF:%_LENGTH_SECONDS%\',\'%ARTIST% - %TITLE%$crlf()' + pathTF);
				let newTrackText = tfo.EvalWithMetadbs(handleList);
				if (relPath.length) { // Relative path conversion
					let trackPath = '';
					let trackInfo = '';
					newTrackText = newTrackText.map((item) => {
						[trackInfo, trackPath] = item.split(/\r\n|\n\r|\n|\r/);
						trackPath = _isLink(trackPath) ? trackPath : getRelPath(trackPath, relPathSplit);
						return trackInfo + '\r\n' + trackPath;
					});
				}
				trackText = [...newTrackText, ...trackText];
				// ---------------- PLS
			} else if (extension === '.pls') { // The standard doesn't allow comments... so no UUID here.
				// Tracks text
				const trackInfoPre = 'File#placeholder#=';
				const tfo = fb.TitleFormat((relPath.length ? '' : trackInfoPre) + '%PATH%' + '$crlf()Title#placeholder#=%TITLE%' + '$crlf()Length#placeholder#=%_LENGTH_SECONDS%');
				let newTrackText = tfo.EvalWithMetadbs(handleList);
				if (relPath.length) { // Relative path conversion
					let trackPath = '';
					let trackInfo = '';
					newTrackText = newTrackText.map((item) => {
						[trackPath, ...trackInfo] = item.split(/\r\n|\n\r|\n|\r/);
						trackPath = _isLink(trackPath) ? trackPath : getRelPath(trackPath, relPathSplit);
						return trackInfoPre + trackPath + '\r\n' + trackInfo.join('\r\n');
					});
				}
				trackText = [...newTrackText, ...trackText];
				//Fix file numbering since foobar2000 doesn't output list index...
				let trackTextLength = trackText.length;
				for (let i = 0; i < trackTextLength - 2; i++) { // It appears 3 times per track...
					trackText[i] = trackText[i].replace('#placeholder#', size + 1).replace('#placeholder#', size + 1).replace('#placeholder#', size + 1);
					trackText[i] += '\r\n'; // EoL after every track info group... just for readability
				}
				// ---------------- XSPF
			} else if (extension === '.xspf') {
				const durationTF = '$puts(l,%LENGTH_SECONDS_FP%)$puts(d,$strchr($get(l),.))$puts(i,$substr($get(l),0,$sub($get(d),1)))$puts(f,$substr($get(l),$add($get(d),1),$add($get(d),3)))$add($mul($get(i),1000),$get(f))';
				const tfo = fb.TitleFormat('$tab(2)<track>$crlf()$tab(3)<location>$put(path,%_PATH_RAW%)</location>$crlf()$tab(3)<title>%TITLE%</title>$crlf()$tab(3)<creator>%ARTIST%</creator>$crlf()$tab(3)<album>%ALBUM%</album>$crlf()$tab(3)<duration>' + durationTF + '</duration>$crlf()$tab(3)<trackNum>%TRACK%</trackNum>$crlf()$tab(3)<identifier>%MUSICBRAINZ_TRACKID%</identifier>$if($stricmp($ext($get(path)),iso),$crlf()$tab(3)<subSong>%subsong%<subSong>,)$crlf()$tab(2)</track>');
				let newTrackText = tfo.EvalWithMetadbs(handleList);
				const bRel = !!relPath.length;
				let trackPath = '';
				let pre = '', post = '';
				newTrackText = newTrackText.map((item) => { // Encode file paths as URI
					[pre, trackPath, post] = item.split(/<location>|<\/location>/);
					const bLink = _isLink(trackPath);
					trackPath = trackPath.replace(fileRegex, '');
					trackPath = bRel && !bLink
						? getRelPath(trackPath, relPathSplit)
						: trackPath; // Relative path conversion
					return pre + '<location>' + (bLink ? '' : 'file:///') + encodeURIComponent(trackPath.replace(/\\/g, '/')) + '</location>' + post;
				});
				trackText = [...newTrackText, ...trackText];
				// Update size
				let idx = originalText.findIndex((line) => line.includes('<meta rel="playlistSize">'));
				if (idx !== -1) {
					const size = Number(originalText[idx].replace('<meta rel="playlistSize">', '').replace('</meta>', '').trim()) + addSize;
					originalText[idx] = '	<meta rel="playlistSize">' + size + '</meta>';
				}
				// Update duration
				idx = originalText.findIndex((line) => line.includes('<meta rel="duration">'));
				if (idx !== -1) {
					const size = Number(originalText[idx].replace('<meta rel="duration">', '').replace('</meta>', '').trim()) + Math.round(addDuration);
					originalText[idx] = '	<meta rel="duration">' + size + '</meta>';
				}
			}
			// Write to file
			trackText = trackText.join('\r\n');
			originalText = originalText.join('\r\n');
			playlistText = originalText.concat('\r\n', trackText);
			_copyFile(playlistPath, backPath);
		}
		let bDone = bSaveBuiltIn
			? _isFile(playlistPath)
			: _save(playlistPath, playlistText, bBOM);
		// Check
		if (bDone && !bSaveBuiltIn) {
			if (_isFile(playlistPath)) {
				let check = _open(playlistPath, utf8);
				bDone = (check === playlistText);
				// Delete cache after edit
				if (extension === '.xspf') {
					xmlDomCache.delete(playlistPath); // NOSONAR [cache filled elsewhere]
					xspfCache.delete(playlistPath); // NOSONAR [cache filled elsewhere]
				}
			} else { bDone = false; }
		}
		if (!bDone) {
			_renameFile(backPath, playlistPath); // Restore backup in case something goes wrong
			console.log('Playlist manager: Restoring backup...');
		} else if (_isFile(backPath)) { _deleteFile(backPath); }
		return bDone ? playlistPath : false;
	}
	return false;
}

/**
 * Adds a handle list to a playlist file
 *
 * @function
 * @name addHandleToPlaylistV2
 * @kind function
 * @param {FbMetadbHandleList} handleList
 * @param {string} playlistPath
 * @param {string} relPath?
 * @param {boolean} bBOM?
 * @returns {boolean} Sucess flag
 */
function addHandleToPlaylistV2(handleList, playlistPath, relPath = '', bBOM = false) { // eslint-disable-line no-unused-vars
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	if (!writablePlaylistFormats.has(extension)) {
		console.log('addHandleToPlaylistV2(): Wrong extension set \'' + extension + '\', only allowed ' + [...writablePlaylistFormats].join(', '));
		return false;
	}
	if (_isFile(playlistPath)) {
		if (extension === '.fpl') {
			if (!addHandleToPlaylist(...arguments)) {
				if (!fb.AddLocationsAsyncV2) { return false; }
				const backPath = playlistPath + '.back';
				fb.AddLocationsAsyncV2([playlistPath])
					.then((plsItems) => {
						if (!plsItems) { return false; }
						plsItems.AddRange(handleList);
						_copyFile(playlistPath, backPath);
						plsItems.SaveAs(playlistPath);
						let bDone = _isFile(playlistPath);
						// Check
						if (!bDone) {
							_renameFile(backPath, playlistPath); // Restore backup in case something goes wrong
							console.log('Playlist manager: Restoring backup...');
						} else if (_isFile(backPath)) { _deleteFile(backPath); }
						return bDone ? playlistPath : false;
					});
			}
			return playlistPath;
		} else {
			return addHandleToPlaylist(...arguments);
		}
	}
	return false;
}

function getFilePathsFromPlaylist(playlistPath, options = { bResolveXSPF: true }) {
	options = { bResolveXSPF: true, ...(options || {}) };
	let paths = [];
	if (!playlistPath || !playlistPath.length) {
		console.log('getFilePathsFromPlaylist(): no playlist path was provided');
		return paths;
	}
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	if (!readablePlaylistFormats.has(extension)) {
		console.log('getFilePathsFromPlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + [...readablePlaylistFormats].join(', '));
		return paths;
	}
	if (_isFile(playlistPath)) {
		// Read original file
		const bFpl = extension === '.fpl';
		let originalText = _open(playlistPath);
		if (!bFpl && typeof originalText !== 'undefined' && originalText.length) {
			// Safe checks to ensure proper encoding detection
			const codePage = checkCodePage(originalText, extension);
			if (codePage !== -1) { originalText = _open(playlistPath, codePage, true); }
			if (extension === '.m3u8' || extension === '.m3u' || extension === '.strm') {
				originalText = originalText.split(/\r\n|\n\r|\n|\r/);
				const lines = originalText.length;
				for (let j = 0; j < lines; j++) {
					if (!originalText[j].startsWith('#')) { // Spaces are not allowed as well as blank lines
						let line = originalText[j].trim();
						if (line.length) {
							let path = line; // PATH
							if (!_isLink(path)) { path = path.replace(/\//g, '\\'); }
							paths.push(path);
						}
					}
				}
			} else if (extension === '.pls') {
				originalText = originalText.split(/\r\n|\n\r|\n|\r/);
				const lines = originalText.length;
				for (let j = 0; j < lines; j++) {
					if (originalText[j].startsWith('File')) { // Spaces are not allowed on variable no need to trim
						// Path may contain '=' so get anything past first '='
						let path = originalText[j].split('=').slice(1).join('='); // fileX=PATH
						if (!_isLink(path)) { path = path.replace(/\//g, '\\'); }
						paths.push(path);
					}
				}
			} else if (extension === '.xspf') {
				const bCache = xspfCache.has(playlistPath);
				const xmldom = bCache ? null : xmlDomCache.get(playlistPath) || XSPF.XMLfromString(originalText);
				if (!xmlDomCache.has(playlistPath)) { xmlDomCache.set(playlistPath, xmldom); }
				const jspf = bCache ? xspfCache.get(playlistPath) : XSPF.toJSPF(xmldom);
				if (!bCache) { xspfCache.set(playlistPath, jspf); }
				const playlist = jspf.playlist;
				const rows = playlist.track;
				const rowsLength = rows.length;
				for (let i = 0; i < rowsLength; i++) { // Spaces are not allowed in location no need to trim
					const row = rows[i];
					if (Object.hasOwn(row, 'location') && row.location && row.location.length) {
						const rowPaths = [];
						for (const loc of row.location) {
							let path;
							try {
								path = decodeURIComponent(loc).replace('file:///', ''); // file:///PATH/SUBPATH/...
							} catch (e) { // eslint-disable-line no-unused-vars
								path = loc;
							}
							if (!_isLink(path)) { path = path.replace(/\//g, '\\'); }
							if (Object.hasOwn(row, 'meta') && row.meta && row.meta.length) { // Add subsong for containers
								const metaSubSong = row.meta.find((obj) => { return Object.hasOwn(obj, 'subSong'); });
								if (metaSubSong) { path += ',' + metaSubSong.subSong; }
							}
							rowPaths.push(path);
						}
						if (options.bResolveXSPF) {
							let bFound = false;
							for (const path of rowPaths) {
								if (!_isLink(path) && _isFile(path)) {
									paths.push(path);
									bFound = true;
									break;
								}
							}
							if (!bFound) { paths.push(rowPaths[rowPaths.length - 1]); }
						} else {
							rowPaths.forEach((path) => paths.push(path));
						}
					}
				}
			}
		} else if (bFpl) {
			const bCache = fplCache.has(playlistPath);
			const jspf = bCache ? fplCache.get(playlistPath) : FPL.parseFile(playlistPath);
			if (!bCache) { fplCache.set(playlistPath, jspf); }
			const playlist = jspf.playlist;
			const rows = playlist.track;
			const rowsLength = rows.length;
			for (let i = 0; i < rowsLength; i++) { // Spaces are not allowed in location no need to trim
				const row = rows[i];
				if (Object.hasOwn(row, 'location') && row.location && row.location.length) {
					let path;
					try {
						path = decodeURIComponent(row.location).replace('file:///', ''); // file:///PATH/SUBPATH/...
					} catch (e) { // eslint-disable-line no-unused-vars
						path = row.location;
					}
					if (!_isLink(path)) { path = path.replace(/\//g, '\\'); }
					if (Object.hasOwn(row, 'meta') && row.meta && row.meta.length) { // Add subsong for containers
						const metaSubSong = row.meta.find((obj) => { return Object.hasOwn(obj, 'subSong'); });
						if (metaSubSong) { path += ',' + metaSubSong.subSong; }
					}
					paths.push(path);
				}
			}
		}
	}
	return paths;
}

function getFileMetaFromPlaylist(playlistPath) {
	let meta = [];
	if (!playlistPath || !playlistPath.length) {
		console.log('getFileMetaFromPlaylist(): no playlist path was provided');
		return meta;
	}
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	if (!new Set(['.m3u8', '.m3u', '.pls', '.xspf']).has(extension)) {
		console.log('getFileMetaFromPlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + [...readablePlaylistFormats].join(', '));
		return meta;
	}
	if (_isFile(playlistPath)) {
		// Read original file
		let originalText = _open(playlistPath);
		if (typeof originalText !== 'undefined' && originalText.length) {
			// Safe checks to ensure proper encoding detection
			const codePage = checkCodePage(originalText, extension);
			if (codePage !== -1) { originalText = _open(playlistPath, codePage, true); }
			if (extension === '.m3u8' || extension === '.m3u') {
				originalText = originalText.split(/\r\n|\n\r|\n|\r/);
				const lines = originalText.length;
				const regExp = /#EXTINF:(\d*),([\w\s,]+?) - ([\w\s,]*$)/gi;
				for (let j = 0; j < lines; j++) {
					let line = originalText[j].trim();
					if (line.length && line.startsWith('#')) { // Spaces are not allowed as well as blank lines
						let title = null, artist = null, duration = null;
						const match = [...line.matchAll(regExp)];
						if (match && match[0]) { [, duration, artist, title] = match[0]; }
						meta.push({ duration, artist, title });
					}
				}
			} else if (extension === '.pls') {
				originalText = originalText.split(/\r\n|\n\r|\n|\r/);
				const lines = originalText.length;
				const regExpTitle = /TITLE\d=.*/gi;
				const regExpDuration = /LENGTH\d=.*/gi;
				for (let j = 0; j < lines; j++) {
					let line = originalText[j];
					if (!line.startsWith('File')) { // Spaces are not allowed on variable no need to trim
						let title = null, artist = null, duration = null;
						let match = [...line.matchAll(regExpTitle)];
						if (match && match[0]) {
							[, title] = match[0];
							j++; // NOSONAR [intended]
							line = originalText[j];
							match = [...line.matchAll(regExpDuration)];
							if (match && match[0]) { [, duration] = match[0]; }
						}
						meta.push({ duration, artist, title });
					}
				}
			} else if (extension === '.xspf') {
				const bCache = xspfCache.has(playlistPath);
				const xmldom = bCache ? null : xmlDomCache.get(playlistPath) || XSPF.XMLfromString(originalText);
				if (!xmlDomCache.has(playlistPath)) { xmlDomCache.set(playlistPath, xmldom); }
				const jspf = bCache ? xspfCache.get(playlistPath) : XSPF.toJSPF(xmldom);
				if (!bCache) { xspfCache.set(playlistPath, jspf); }
				const playlist = jspf.playlist;
				const rows = playlist.track;
				const rowsLength = rows.length;
				for (let i = 0; i < rowsLength; i++) { // Spaces are not allowed in location no need to trim
					const row = rows[i];
					let title = null, artist = null, duration = null;
					if (Object.hasOwn(row, 'title') && row.title && row.title.length) { title = row.title; }
					if (Object.hasOwn(row, 'creator') && row.creator && row.creator.length) { artist = row.creator; }
					if (Object.hasOwn(row, 'duration') && row.duration) { duration = row.duration / 1000; }
					meta.push({ duration, artist, title });
				}
			}
		}
	}
	return meta;
}

// Cache paths: calc once the paths for every item on library and share it with the other panels
// Relative paths are only calculated by specific panels, and is fast so it can be done on demand
var libItemsAbsPaths = []; // NOSONAR
var libItemsRelPaths = {}; // NOSONAR

// Calculate paths in x steps to not freeze the UI
function precacheLibraryPaths(iSteps, iDelay) {
	return new Promise((resolve) => {
		const items = fb.GetLibraryItems().Convert();
		const count = items.length;
		const total = Math.ceil(count / iSteps);
		let libCopy = [...libItemsAbsPaths];
		const promises = [];
		let prevProgress = -1;
		for (let i = 1; i <= total; i++) {
			promises.push(new Promise((resolve) => {
				setTimeout(() => {
					if (libCopy.length !== count && libItemsAbsPaths.length !== count) {
						const iItems = new FbMetadbHandleList(items.slice((i - 1) * iSteps, i === total ? count : i * iSteps));
						libCopy = libCopy.concat(fb.TitleFormat(pathTF).EvalWithMetadbs(iItems));
						const progress = Math.round(i / total * 100);
						if (progress % 10 === 0 && progress > prevProgress) { prevProgress = progress; console.log('Caching library paths ' + progress + '%.'); }
						if (libItemsAbsPaths.length === count) { throw new Error('already cached'); }
						else { resolve('done'); }
					}
				}, iDelay * i);
			}));
		}
		Promise.all(promises).then(() => {
			libItemsAbsPaths = libCopy;
			resolve('precacheLibraryPaths: got paths from ' + count + ' items.');
		}, (error) => { throw new Error(error); });
	});
}

async function precacheLibraryPathsAsync(iSteps = iStepsLibrary, iDelay = iDelayLibraryPLM) {
	return precacheLibraryPaths(iSteps, iDelay);
}

function precacheLibraryRelPaths(relPath) {
	if (libItemsAbsPaths.length && relPath.length && (!Object.hasOwn(libItemsRelPaths, relPath) || !libItemsRelPaths[relPath].length)) {
		libItemsRelPaths[relPath] = getRelPaths(libItemsAbsPaths, relPath);
		console.log('precacheLibraryRelPaths: got rel paths (' + relPath + ') from ' + libItemsRelPaths[relPath].length + ' items.');
	}
}

function getRelPaths(pathArr, relPath = '') {
	let relPathArr = [];
	if (isArrayStrings(pathArr)) {
		if (relPath.length) { // Relative path conversion
			const relPathSplit = relPath.split('\\').filter(Boolean);
			relPathArr = pathArr.map((item) => {
				return _isLink(item) ? item : getRelPath(item, relPathSplit);
			});
		}
	}
	return relPathArr;
}

function getRelPath(itemPath, relPathSplit) {
	if ((itemPath.match(/^\w:/g) || [''])[0].toLowerCase() === relPathSplit[0].toLowerCase()) { // Compare disks
		let cache = '';
		relPathSplit.forEach((folder) => {
			const level = new RegExp(escapeRegExp(folder) + '\\\\', 'i');
			cache = itemPath.replace(level, '');
			if (itemPath === cache) { itemPath = '..\\' + cache; }
			else { itemPath = cache; }
		});
		if (!itemPath.startsWith('..\\')) { itemPath = '.\\' + itemPath; }
	}
	return itemPath;
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function loadTracksFromPlaylist({ playlistPath, playlistIndex, relPath = '', remDupl = []/*['title','artist','date']*/, bAdvTitle = true, bMultiple = true, xspfRules = { bFallbackComponentXSPF: false, bLoadNotTrackedItems: false } } = {}) {
	let bDone = Promise.resolve(false);
	if (!playlistPath || !playlistPath.length) {
		console.log('loadTracksFromPlaylist(): no playlist path was provided');
		return bDone;
	}
	if (typeof playlistIndex === 'undefined' || playlistIndex === -1) {
		console.log('loadTracksFromPlaylist(): no playlist path was provided');
		return bDone;
	}
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	if (!readablePlaylistFormats.has(extension)) {
		console.log('loadTracksFromPlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + [...readablePlaylistFormats].join(', '));
		return bDone;
	}
	if (extension === '.strm') {
		const stream = getFilePathsFromPlaylist(playlistPath);
		bDone = plman.AddPlaylistItemsOrLocations(playlistIndex, stream, true);
	} else if (extension === '.fpl') { // Don't load by path since this also loads tags...
		bDone = plman.AddPlaylistItemsOrLocations(playlistIndex, [playlistPath], true);
	} else {
		const bFallbackComponentXSPF = xspfRules.bFallbackComponentXSPF && extension === '.xspf' && utils.CheckComponent('foo_xspf_1');
		const { handlePlaylist, pathsNotFound, locationsByOrder } = getHandlesFromPlaylist({ playlistPath, relPath, remDupl, bReturnNotFound: true, bAdvTitle, bMultiple, xspfRules: { ...xspfRules, bFallbackComponentXSPF } });
		if (handlePlaylist) {
			if (pathsNotFound && pathsNotFound.length) {
				if (extension === '.xspf') {
					if (xspfRules.bLoadNotTrackedItems) {
						if (bFallbackComponentXSPF) {
							console.log(playlistPath.split('\\').pop() + ': retrying playlist load using foo_xspf_1 component.');
							bDone = plman.AddPlaylistItemsOrLocations(playlistIndex, [playlistPath], true);
						} else if (pathsNotFound.some((path) => _isLink(path) || _isFile(path))) {
							console.log(playlistPath.split('\\').pop() + ': retrying playlist load using locations and links.');
							bDone = plman.AddPlaylistItemsOrLocations(
								playlistIndex,
								locationsByOrder.filter((item) => toType(item) === 'FbMetadbHandle' || _isLink(item) || _isFile(item)),
								true
							);
						}
					} else if (pathsNotFound.some((path) => _isLink(path))) {
						console.log(playlistPath.split('\\').pop() + ': retrying playlist load using links.');
						bDone = plman.AddPlaylistItemsOrLocations(
							playlistIndex,
							locationsByOrder.filter((item) => toType(item) === 'FbMetadbHandle' || _isLink(item)), true
						);
					} else {
						plman.InsertPlaylistItems(playlistIndex, 0, handlePlaylist);
						bDone = Promise.resolve(true);
					}
				} else {
					// Do nothing, handle this error
				}
			} else {
				plman.InsertPlaylistItems(playlistIndex, 0, handlePlaylist);
				bDone = Promise.resolve(true);
			}
		}
	}
	return bDone;
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function getHandlesFromPlaylist({ playlistPath, relPath = '', bOmitNotFound = false, remDupl = []/*['$ascii($lower($trim(%TITLE%)))','ARTIST','$year(%DATE%)']*/, bReturnNotFound = false, bAdvTitle = false, bMultiple = false, bLog = true, xspfRules = { bFallbackComponentXSPF: false }, poolItems = fb.GetLibraryItems() } = {}) {
	const test = bLog ? new FbProfiler('getHandlesFromPlaylist') : null;
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	let handlePlaylist = null, pathsNotFound = null, locationsByOrder = [];
	if (extension === '.xsp') {
		const jsp = loadXspPlaylist(playlistPath);
		if (jsp) {
			const query = XSP.getQuery(jsp, true);
			const sort = XSP.getSort(jsp);
			const bHasQueryPls = XSP.hasQueryPlaylists(jsp);
			if (bHasQueryPls) { // Uses playlists as sources
				const queryPlaylists = XSP.getQueryPlaylists(jsp);
				// From playlist manager or loaded playlists
				const toIncludeHandle = typeof list !== 'undefined'
					? list.getHandleFromPlaylists(queryPlaylists.is, void (0), bLog) // eslint-disable-line no-undef
					: getHandlesFromUIPlaylists(queryPlaylists.is);
				const toExcludeHandle = typeof list !== 'undefined'
					? list.getHandleFromPlaylists(queryPlaylists.isnot, void (0), bLog) // eslint-disable-line no-undef
					: getHandlesFromUIPlaylists(queryPlaylists.isnot);
				// Difference
				toIncludeHandle.Sort();
				toExcludeHandle.Sort();
				toIncludeHandle.MakeDifference(toExcludeHandle);
				// Filter if needed
				handlePlaylist = toIncludeHandle;
				if (query.length) { handlePlaylist = checkQuery(query, false) ? fb.GetQueryItems(handlePlaylist, query) : null; }
			} else if (checkQuery(query, false)) { handlePlaylist = fb.GetQueryItems(poolItems, query); }
			else { console.log('Error on XSP Playlist: ' + query); }
			if (handlePlaylist) {
				handlePlaylist.Sort();
				const sortObj = sort.length ? getSortObj(sort) : null;
				if (remDupl && remDupl.length && typeof removeDuplicates !== 'undefined') {
					handlePlaylist = removeDuplicates({ handleList: handlePlaylist, checkKeys: remDupl, sortBias: globQuery.remDuplBias, bPreserveSort: !sortObj, bAdvTitle, bMultiple }); // eslint-disable-line no-undef
				}
				if (sortObj) { handlePlaylist.OrderByFormat(sortObj.tf, sortObj.direction); }
				const limit = XSP.getLimit(jsp);
				if (isFinite(limit)) { handlePlaylist.RemoveRange(limit, handlePlaylist.Count - 1); }
				if (bLog) { console.log('Loaded successfully XSP Playlist: ' + (bHasQueryPls ? XSP.getQuery(jsp) : query) + ' ' + sort); }
			}
		} else {
			console.log(playlistPath.split('\\').pop() + ': playlist can not be loaded or parsed'); // DEBUG
		}
	} else {
		const filePathsNoFormat = getFilePathsFromPlaylist(playlistPath);
		const filePaths = filePathsNoFormat.map((path) => { return path.toLowerCase(); });
		if (!filePaths.some((path) => { return !/[A-Z]*:\\/.test(path); })) { relPath = ''; } // No need to check rel paths if they are all absolute
		const playlistLength = filePaths.length;
		handlePlaylist = [...Array(playlistLength)];
		const poolItemsCount = poolItems.Count;
		const newLibItemsAbsPaths = libItemsAbsPaths.length === poolItems.Count
			? libItemsAbsPaths
			: fb.TitleFormat(pathTF).EvalWithMetadbs(poolItems);
		const newLibItemsRelPaths = relPath.length
			? (Object.hasOwn(libItemsRelPaths, relPath) && libItemsRelPaths[relPath].length === poolItems.Count
				? libItemsRelPaths[relPath]
				: getRelPaths(newLibItemsAbsPaths, relPath))
			: null; // Faster than TF again
		let pathPool = new Map();
		let filePool = new Set(filePaths);
		let path;
		if (relPath.length) {
			for (let i = 0; i < poolItemsCount; i++) {
				path = newLibItemsAbsPaths[i].toLowerCase();
				if (filePool.has(path)) {
					filePool.delete(path);
					pathPool.set(path, i);
					continue;
				}
				path = newLibItemsRelPaths[i].toLowerCase();
				if (filePool.has(path)) {
					filePool.delete(path);
					pathPool.set(path, i);
					continue;
				}
				if (path.startsWith('.\\')) {
					path = path.replace('.\\', '');
					if (filePool.has(path)) {
						filePool.delete(path);
						pathPool.set(path, i);
						continue;
					}
				}
				if (filePool.size === 0) { break; }
			}
		} else {
			for (let i = 0; i < poolItemsCount; i++) {
				path = newLibItemsAbsPaths[i].toLowerCase();
				if (filePool.has(path)) {
					filePool.delete(path);
					pathPool.set(path, i);
					continue;
				}
				if (filePool.size === 0) { break; }
			}
		}
		let count = 0;
		let notFound = new Set();
		let bXSPF = extension === '.xspf';
		for (let i = 0; i < playlistLength; i++) {
			if (pathPool.has(filePaths[i])) {
				const idx = pathPool.get(filePaths[i]);
				handlePlaylist[i] = poolItems[idx];
				if (newLibItemsAbsPaths[idx].toLowerCase() !== filePaths[i] && (!newLibItemsRelPaths || newLibItemsRelPaths && newLibItemsRelPaths[idx].toLowerCase() !== filePaths[i])) { // Ensure the cache is up to date
					handlePlaylist = null;
					fb.ShowPopupMessage('The library cache is not up to date and is being rebuilt; the playlist will be loaded using the native Foobar2000 method if trying to load the playlist into the UI. You may abort it and try loading the playlist afterwards or wait.\n\n In any other case, wait for the cache to be rebuilt and execute the action again.', window.Name);
					break;
				}
				count++;
			} else { notFound.add(i); }
		}

		if (bXSPF && count !== playlistLength) {
			bOmitNotFound = true; // Omit not found for xspf playlists, forced by specification
			let playlistText = _open(playlistPath);
			if (typeof playlistText !== 'undefined' && playlistText.length) {
				// Safe checks to ensure proper encoding detection
				const codePage = checkCodePage(playlistText, extension);
				if (codePage !== -1) { playlistText = _open(playlistPath, codePage, true); }
				const bCache = xspfCache.has(playlistPath);
				const xmldom = bCache ? null : xmlDomCache.get(playlistPath) || XSPF.XMLfromString(playlistText);
				if (!xmlDomCache.has(playlistPath)) { xmlDomCache.set(playlistPath, xmldom); }
				const jspf = bCache ? xspfCache.get(playlistPath) : XSPF.toJSPF(xmldom);
				if (!bCache) { xspfCache.set(playlistPath, jspf); }
				const playlist = jspf.playlist;
				const rows = playlist.track;
				const rowsLength = rows.length;
				const lookupKeys = [{ xspfKey: 'title', queryKey: 'TITLE' }, { xspfKey: 'creator', queryKey: 'ARTIST' }, { xspfKey: 'album', queryKey: 'ALBUM' }, { xspfKey: 'trackNum', queryKey: 'TRACK' }, { xspfKey: 'identifier', queryKey: 'MUSICBRAINZ_TRACKID' }, { xspfKey: 'meta', xspfSubKey: 'md5', queryKey: '%__MD5%' }];
				const conditions = [['TITLE', 'ARTIST', 'ALBUM', 'TRACK'], ['TITLE', 'ARTIST', 'ALBUM'], ['TRACK', 'ARTIST', 'ALBUM'], ['TITLE', 'ALBUM'], ['TITLE', 'ARTIST'], ['%__MD5%'], ['MUSICBRAINZ_TRACKID']];
				const regExListenBrainz = typeof listenBrainz !== 'undefined'
					? listenBrainz.regEx // eslint-disable-line no-undef
					: /(^https:\/\/(listenbrainz|musicbrainz).org\/)|(recording)|(playlist)|\//g;
				const sort = globQuery.remDuplBias;
				const sortTF = sort.length ? fb.TitleFormat(sort) : null;
				for (let i = 0; i < rowsLength; i++) {
					if (!notFound.has(i)) { locationsByOrder.push(handlePlaylist[i]); continue; }
					let query = '';
					let lookup = {};
					const row = rows[i];
					lookupKeys.forEach((look) => {
						const key = look.xspfKey;
						const subKey = look.xspfSubKey;
						const queryKey = look.queryKey;
						if (Object.hasOwn(row, key) && row[key]) {
							const keyVal = subKey
								? Array.isArray(row[key]) // Meta is an array of objects
									? (row[key].find((obj) => Object.hasOwn(obj, subKey)) || {})[subKey] || ''
									: ''
								: row[key]; // Array or single value
							const bMultiple = Array.isArray(keyVal);
							if (bMultiple && keyVal.length || keyVal.toString().length) {
								if (bMultiple) {
									lookup[queryKey] = key === 'identifier'
										? queryCombinations(
											keyVal.map((val) => decodeURI(val).replace(regExListenBrainz, ''))
											, queryKey
											, 'OR'
										)
										: queryCombinations(keyVal, queryKey, 'OR');
								} else {
									lookup[queryKey] = queryKey + ' IS ' + keyVal;
								}
							}
						}
					});
					for (let condition of conditions) {
						if (condition.every((tag) => { return Object.hasOwn(lookup, tag); })) {
							query = condition.map((tag) => { return lookup[tag]; }).join(' AND ');
							const matches = queryCache.has(query) ? queryCache.get(query) : (checkQuery(query, true) ? fb.GetQueryItems(poolItems, query) : null);
							if (!queryCache.has(query)) { queryCache.set(query, matches); }
							if (matches && matches.Count) {
								if (sortTF) { matches.OrderByFormat(sortTF, -1); }
								handlePlaylist[i] = matches[0];
								locationsByOrder.push(matches[0]);
								notFound.delete(i);
								count++;
								break;
							}
						}
					}
					if (notFound.has(i)) {
						const filePath = filePaths[i];
						locationsByOrder.push(
							youTubeRegExp.test(filePath)
								? 'fy+' + filePathsNoFormat[i]
								: _isLink(filePath)
									? filePathsNoFormat[i]
									: filePath
						);
					}
				}
			}
		}
		pathsNotFound = Array.from(notFound, (idx) => filePaths[idx]);
		if (playlistLength) {
			if (count === playlistLength) {
				if (bLog) { console.log(playlistPath.split('\\').pop() + ': found all tracks on library.'); } // DEBUG
				handlePlaylist = new FbMetadbHandleList(handlePlaylist);
			} else if (bOmitNotFound && handlePlaylist !== null) {
				if (bLog) {
					let countNotFound = playlistLength - count;
					if (bXSPF) {
						countNotFound = pathsNotFound.reduce((total, curr) => total + (_isLink(curr) ? 0 : 1), 0);
					}
					if (countNotFound) {
						if (bXSPF) {
							console.log(
								playlistPath.split('\\').pop() + ':' +
								(xspfRules.bLoadNotTrackedItems ? '' : ' omitting') +
								' not found items on library (' + countNotFound + ').' +
								'\n\t ' + pathsNotFound.filter((path) => !_isLink(path)).join('\n\t ')
							); // DEBUG
							if ((playlistLength - count - countNotFound) !== 0) {
								console.log(
									playlistPath.split('\\').pop() + ': found links (' + (playlistLength - count - countNotFound) + ').' +
									'\n\t ' + pathsNotFound.filter((path) => _isLink(path)).join('\n\t ')
								); // DEBUG
							}
						} else {
							console.log(
								playlistPath.split('\\').pop() + ': omitting not found items on library (' + countNotFound + ').' +
								'\n\t ' + pathsNotFound.join('\n\t ')
							); // DEBUG
						}
					}
				}
				handlePlaylist = new FbMetadbHandleList(handlePlaylist.filter((n) => n)); // Must filter since there are holes
			} else {
				if (bLog) { console.log(playlistPath.split('\\').pop() + ': some items were not found on library (' + (playlistLength - count) + ').' + '\n\t ' + pathsNotFound.join('\n\t ')); } // DEBUG
				handlePlaylist = null;
			}
		} else {
			if (bLog) { console.log(playlistPath.split('\\').pop() + ': empty playlist.'); } // DEBUG
			handlePlaylist = null;
		}
		if (handlePlaylist !== null) {
			if (!libItemsAbsPaths.length) { libItemsAbsPaths = newLibItemsAbsPaths; }
			if (relPath.length && (!Object.hasOwn(libItemsRelPaths, relPath) || !libItemsRelPaths[relPath].length)) { libItemsRelPaths[relPath] = newLibItemsRelPaths; }
		}
	}
	if (bLog) { test.Print(); }
	return (bReturnNotFound ? { handlePlaylist, pathsNotFound, locationsByOrder } : handlePlaylist);
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function arePathsInMediaLibrary(filePaths, relPath = '', poolItems = fb.GetLibraryItems()) {
	if (!filePaths.some((path) => { return !/[A-Z]*:\\/.test(path); })) { relPath = ''; } // No need to check rel paths if they are all absolute
	const playlistLength = filePaths.length;
	const poolItemsCount = poolItems.Count;
	const newLibItemsAbsPaths = libItemsAbsPaths.length === poolItemsCount
		? libItemsAbsPaths
		: fb.TitleFormat(pathTF).EvalWithMetadbs(poolItems);
	const poolItemsAbsPaths = new Set(newLibItemsAbsPaths.map((path) => { return path.toLowerCase(); }));
	const newLibItemsRelPaths = relPath.length ? (Object.hasOwn(libItemsRelPaths, relPath) && libItemsRelPaths[relPath].length === poolItemsCount ? libItemsRelPaths[relPath] : getRelPaths(newLibItemsAbsPaths, relPath)) : null; // Faster than tf again
	const poolItemsRelPaths = newLibItemsRelPaths ? new Set(newLibItemsRelPaths.map((path) => { return path.toLowerCase(); })) : null;
	let filePool = new Set(filePaths.map((path) => { return path.toLowerCase(); }));
	const filePoolSize = filePool.size;
	let count = 0;
	if (relPath.length) {
		filePool.forEach((path) => {
			if (poolItemsAbsPaths.has(path) || poolItemsRelPaths.has(path) || poolItemsRelPaths.has('.\\' + path)) {
				count++;
			}
		});
	} else {
		count = poolItemsAbsPaths.intersectionSize(filePool);
	}
	if (!libItemsAbsPaths.length) { libItemsAbsPaths = newLibItemsAbsPaths; }
	if (relPath.length && (!Object.hasOwn(libItemsRelPaths, relPath) || !libItemsRelPaths[relPath].length)) { libItemsRelPaths[relPath] = newLibItemsRelPaths; }
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

function loadXspPlaylist(playlistPath, bSaveCache = true) {
	const bCache = xspCache.has(playlistPath);
	let playlistText = '';
	if (!bCache) {
		playlistText = _open(playlistPath);
		if (playlistText && playlistText.length) {
			// Safe checks to ensure proper encoding detection
			const codePage = checkCodePage(playlistText, '.xsp');
			if (codePage !== -1) { playlistText = _open(playlistPath, codePage); if (!playlistText.length) { return null; } }
		} else { return null; }
	}
	const xmldom = bCache ? null : xmlDomCache.get(playlistPath) || XSP.XMLfromString(playlistText);
	if (bSaveCache && (!bCache || !xmlDomCache.has(playlistPath))) { xmlDomCache.set(playlistPath, xmldom); }
	const jsp = bCache ? xspCache.get(playlistPath) : XSP.toJSP(xmldom);
	if (bSaveCache && !bCache) { xspCache.set(playlistPath, jsp); }
	return jsp;
}