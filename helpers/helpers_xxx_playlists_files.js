'use strict';
//19/12/23

/* exported savePlaylist, addHandleToPlaylist, precacheLibraryRelPaths, precacheLibraryPathsAsync, loadTracksFromPlaylist, arePathsInMediaLibrary, loadPlaylists */

include(fb.ComponentPath + 'docs\\Codepages.js');
include('helpers_xxx.js');
/* global globQuery:readable, iStepsLibrary:readable, iDelayLibraryPLM:readable */
include('helpers_xxx_prototypes.js');
/* global nextId:readable, _p:readable, isArrayStrings:readable, isArray:readable, escapeRegExp:readable */
include('helpers_xxx_file.js');
/* global _isFile:readable, _open:readable, checkCodePage:readable, _isLink:readable, utf8:readable, _save:readable */
include('helpers_xxx_tags.js');
/* global checkQuery:readable, getSortObj:readable, getTagsValuesV4:readable */
include('helpers_xxx_playlists.js');
/* global getHandleFromUIPlaylists:readable */
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
	'.m3u':			{isWritable: true,	isReadable: true,	isLoadable: true,	icon: '\uf15c', iconBg: null},
	'.m3u8':		{isWritable: true,	isReadable: true,	isLoadable: true,	icon: '\uf15c', iconBg: null},
	'.pls':			{isWritable: true,	isReadable: true,	isLoadable: true,	icon: '\uf15c', iconBg: null},
	'.xspf':		{isWritable: true,	isReadable: true,	isLoadable: true,	icon: '\uf1e0', iconBg: null},
	'.xsp':			{					isReadable: true,	isLoadable: true,	icon: '\uf0d0', iconBg: null},
	'.strm':		{					isReadable: true,	isLoadable: true,	icon: '\uf0f6', iconBg: null},
	'.fpl':			{					isReadable: true,	isLoadable: true,	icon: '\uf1c6', iconBg: null},
	// Abstract items
	'.ui':			{															icon: '\uf26c', iconBg: null},
	autoPlaylist:	{															icon: '\uf0e7', iconBg: '\uf15b'},
	blank:			{															icon: '\uf15b', iconBg: null},
	locked:			{															icon: '\uf023', iconBg: null}
};
const writablePlaylistFormats = new Set(); // Playlist formats which are writable
const readablePlaylistFormats = new Set(); // Playlist formats which are readable to retrieve paths
const loadablePlaylistFormats = new Set(); // Playlist formats which are loadable into the manager (shown as files)
Object.keys(playlistDescriptors).forEach((key) => {
	if (playlistDescriptors[key].isWritable) {writablePlaylistFormats.add(key);}
	if (playlistDescriptors[key].isReadable) {readablePlaylistFormats.add(key);}
	if (playlistDescriptors[key].isLoadable) {loadablePlaylistFormats.add(key);}
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
const queryCache = new Map(); // {Query: handleList}

// Path TitleFormat to compare tracks against library
const pathTF = '$put(path,$replace(%_PATH_RAW%,\'file://\',))$if($stricmp($ext($get(path)),iso),\',\'%SUBSONG%,)';

/*
	Playlist file manipulation
*/

//	For XSP playlists use this:
//		const jspPls = XSP.emptyJSP();
//		... (set rules) ...
//		const xspText = XSP.toXSP(jspPls);
//		_save(path, xspText.join('\r\n'));
function savePlaylist({playlistIndex, handleList, playlistPath, ext = '.m3u8', playlistName = '', UUID = null, useUUID = null, bLocked = false, category = '', tags = [], relPath = '', trackTags = [], playlist_mbid = '', author = 'Playlist-Manager-SMP', description = '', bBOM = false}) {
	if ((playlistIndex === -1 || typeof playlistIndex === 'undefined' || playlistIndex === null) && !handleList) {console.log('savePlaylist(): invalid sources ' + _p(playlistIndex + ', ' + !!handleList)); return false;}
	const extension = ext.toLowerCase();
	if (!writablePlaylistFormats.has(extension)){
		console.log('savePlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + [...writablePlaylistFormats].join(', '));
		return false;
	}
	if (!_isFile(playlistPath)) {
		if (!handleList) {handleList = plman.GetPlaylistItems(playlistIndex);}
		const itemsCount = handleList.Count;
		const arr = utils.SplitFilePath(playlistPath);
		playlistPath = playlistPath.replaceLast(arr[2], extension);
		if (!playlistName.length) {playlistName = (arr[1].endsWith(arr[2])) ? arr[1].replace(arr[2],'') : arr[1];} // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
		let playlistText = [];
		const relPathSplit = relPath.length ? relPath.split('\\').filter(Boolean) : null;
		// -------------- m3u
		if (extension === '.m3u8' || extension === '.m3u') {
			// Header text
			playlistText.push('#EXTM3U');
			playlistText.push('#EXTENC:UTF-8');
			playlistText.push('#PLAYLIST:' + playlistName);
			if (!UUID) {UUID = useUUID ? nextId(useUUID) : '';} // May be visible or invisible chars!
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
			// Tracks text
			if (playlistIndex !== -1) { // Tracks from playlist
				let trackText = [];
				const tfo = fb.TitleFormat('#EXTINF:%_LENGTH_SECONDS%\',\'%ARTIST% - %TITLE%$crlf()' + pathTF);
				trackText = tfo.EvalWithMetadbs(handleList);
				if (relPath.length) { // Relative path conversion
					let trackPath = '';
					let trackInfo = '';
					trackText = trackText.map((item) => {
						[trackInfo, trackPath] = item.split('\n');
						trackPath = _isLink(trackPath) ? trackPath : getRelPath(trackPath, relPathSplit);
						return trackInfo + '\n' + trackPath;
					});
				}
				playlistText[8] += itemsCount.toString(); // Add number of tracks to size
				playlistText[9] += handleList.CalcTotalDuration(); // Add time to duration
				playlistText = playlistText.concat(trackText);
			} else { //  Else empty playlist
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
						[trackPath, ...trackInfo] = item.split('\n');
						trackPath = _isLink(trackPath) ? trackPath : getRelPath(trackPath, relPathSplit);
						return trackInfoPre + trackPath + '\n' + trackInfo.join('\n');
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
			if (bHasAuthor) {playlist.info = 'https://listenbrainz.org/user/' + author + '/playlists/';}
			if (bHasAnnotation) {playlist.annotation = description;}
			playlist.meta = [
				{uuid: (useUUID ? nextId(useUUID) : '')},
				{locked: bLocked},
				{category},
				{tags: (isArrayStrings(tags) ? tags.join(';') : '')},
				{trackTags: (isArray(trackTags) ? JSON.stringify(trackTags) : '')},
				{playlistSize: 0},
				{duration: totalDuration},
				{playlist_mbid}
			];
			// Tracks text
			if (playlistIndex !== -1) { // Tracks from playlist
				const tags = getTagsValuesV4(handleList, ['TITLE', 'ARTIST', 'ALBUM', 'TRACK', 'LENGTH_SECONDS_FP', '_PATH_RAW', 'SUBSONG', 'MUSICBRAINZ_TRACKID']);
				for (let i = 0; i < itemsCount; i++) {
					const title = tags[0][i][0];
					const creator = tags[1][i].join(', ');
					const album = tags[2][i][0];
					const trackNum = Number(tags[3][i][0]);
					const duration = Math.round(Number(tags[4][i][0] * 1000)); // In ms
					totalDuration += Math.round(Number(tags[4][i][0])); // In s
					const location = [
						relPath.length && !_isLink(tags[5][i][0])
							? getRelPath(tags[5][i][0], relPathSplit)
							: tags[5][i][0]
					].map((path) => {
						return encodeURI(path.replace('file://', 'file:///').replace(/\\/g,'/').replace(/&/g,'%26'));
					});
					const subSong = Number(tags[6][i][0]);
					const meta = location[0].endsWith('.iso') ? [{subSong}] : [];
					const identifier = [tags[7][i][0]];
					playlist.track.push({
						location,
						annotation: void(0),
						title,
						creator,
						info: void(0),
						image: void(0),
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
				playlist.meta.find((obj) => {return Object.prototype.hasOwnProperty.call(obj, 'duration');}).duration = totalDuration;
				playlist.meta.find((obj) => {return Object.prototype.hasOwnProperty.call(obj, 'playlistSize');}).playlistSize = itemsCount;
			}
			playlistText = XSPF.toXSPF(jspf);
		}
		// Write to file
		playlistText = playlistText.join('\r\n');
		let bDone = _save(playlistPath, playlistText, bBOM);
		// Check
		if (_isFile(playlistPath) && bDone) {
			let check = _open(playlistPath, utf8);
			bDone = (check === playlistText);
		}
		return bDone ? playlistPath : false;
	}
	return false;
}

function addHandleToPlaylist(handleList, playlistPath, relPath = '', bBOM = false) {
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	if (!writablePlaylistFormats.has(extension)){
		console.log('addHandleToPlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + [...writablePlaylistFormats].join(', '));
		return false;
	}
	if (_isFile(playlistPath)) {
		// Read original file
		let originalText = _open(playlistPath);
		let bFound = false;
		const addSize = handleList.Count;
		if (!addSize) {return false;}
		const addDuration = handleList.CalcTotalDuration();
		let trackText = [];
		let size;
		let duration;
		if (typeof originalText !== 'undefined' && originalText.length) { // We don't check if it's a playlist by its content! Can break things if used wrong...
			// Safe checks to ensure proper encoding detection
			const codePage = checkCodePage(originalText, extension);
			if (codePage !== -1) {originalText = _open(playlistPath, codePage);}
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
						const newDuration = duration + addDuration;
						originalText[j] = '#DURATION:' + newDuration;
						break;
					}
					j++;
				}
				while (!originalText[originalText.length -1].trim().length) {originalText.pop();} // Remove blank lines at end
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
					while (!originalText[originalText.length -1].trim().length) {originalText.pop();} // Remove blank lines at end
					originalText.pop(); //Removes old NumberOfEntries=..
					originalText.pop(); //Removes old Version=..
				} else {return false;} // Safety check
			// ---------------- XSPF
			} else if (extension === '.xspf') {
				const bCache = xspfCache.has(playlistPath);
				const xmldom = bCache ? null : xmlDomCache.get(playlistPath) || XSPF.XMLfromString(originalText);
				const jspf = bCache ? xspfCache.get(playlistPath) : XSPF.toJSPF(xmldom, false);
				if (Object.prototype.hasOwnProperty.call(jspf, 'playlist') && jspf.playlist && Object.prototype.hasOwnProperty.call(jspf.playlist, 'track')) {bFound = true;} // Safety check
				else {return false;} // Safety check
				originalText = originalText.split(/\r\n|\n\r|\n|\r/);
				while (!originalText[originalText.length -1].trim().length) {originalText.pop();} // Remove blank lines at end
				originalText.pop(); //Removes </trackList>
				originalText.pop(); //Removes </playlist>
				trackText.push('	</trackList>');
				trackText.push('</playlist>');
			}
		}
		if (!bFound) {return false;} // Safety check
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
					[trackInfo, trackPath] = item.split('\n');
					trackPath = _isLink(trackPath) ? trackPath : getRelPath(trackPath, relPathSplit);
					return trackInfo + '\n' + trackPath;
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
					[trackPath, ...trackInfo] = item.split('\n');
					trackPath = _isLink(trackPath) ? trackPath : getRelPath(trackPath, relPathSplit);
					return trackInfoPre + trackPath + '\n' + trackInfo.join('\n');
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
			const bRel = relPath.length ? true : false;
			let trackPath = '';
			let pre = '' , post = '';
			newTrackText = newTrackText.map((item) => { // Encode file paths as URI
				[pre, trackPath , post] = item.split(/<location>|<\/location>/);
				trackPath = bRel && !_isLink(trackPath) ? getRelPath(trackPath, relPathSplit) : trackPath; // Relative path conversion
				return pre + '<location>file:///' + encodeURI(trackPath.replace('file://', 'file:///').replace(/\\/g,'/').replace(/&/g,'%26')) + '</location>' + post;
			});
			trackText = [...newTrackText, ...trackText];
			// Update size
			let idx = originalText.findIndex((line) => {return line.indexOf('<meta rel="playlistSize">') !== -1;});
			if (idx !== -1) {
				const size = Number(originalText[idx].replace('<meta rel="playlistSize">','').replace('</meta>','').trim()) + addSize;
				originalText[idx] = '	<meta rel="playlistSize">' + size + '</meta>';
			}
			// Update duration
			idx = originalText.findIndex((line) => {return line.indexOf('<meta rel="duration">') !== -1;});
			if (idx !== -1) {
				const size = Number(originalText[idx].replace('<meta rel="duration">','').replace('</meta>','').trim()) + Math.round(addDuration);
				originalText[idx] = '	<meta rel="duration">' + size + '</meta>';
			}
		}
		// Write to file
		trackText = trackText.join('\r\n');
		originalText = originalText.join('\r\n');
		let playlistText = originalText.concat('\r\n', trackText);
		let bDone = _save(playlistPath, playlistText, bBOM);
		// Check
		if (_isFile(playlistPath) && bDone) {
			let check = _open(playlistPath, utf8);
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
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	if (!readablePlaylistFormats.has(extension)){
		console.log('getFilePathsFromPlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + [...readablePlaylistFormats].join(', '));
		return paths;
	}
	if (_isFile(playlistPath)) { // TODO: skip blank lines ?
		// Read original file
		const bFpl = extension === '.fpl';
		let originalText = _open(playlistPath);
		if (!bFpl && typeof originalText !== 'undefined' && originalText.length) {
			// Safe checks to ensure proper encoding detection
			const codePage = checkCodePage(originalText, extension);
			if (codePage !== -1) {originalText = _open(playlistPath, codePage, true);}
			if (extension === '.m3u8' || extension === '.m3u' || extension === '.strm') {
				originalText = originalText.split(/\r\n|\n\r|\n|\r/);
				const lines = originalText.length;
				for (let j = 0; j < lines; j++) {
					if (!originalText[j].startsWith('#')) { // Spaces are not allowed as well as black lines
						let line = originalText[j].trim();
						if (line.length) {paths.push(line.replace(/\//g,'\\'));} // PATH
					}
				}
			} else if (extension === '.pls') {
				originalText = originalText.split(/\r\n|\n\r|\n|\r/);
				const lines = originalText.length;
				for (let j = 0; j < lines; j++) {
					if (originalText[j].startsWith('File')) { // Spaces are not allowed on variable no need to trim
						// Path may contain '=' so get anything past first '='
						let path = originalText[j].split('=').slice(1).join('=').replace(/\//g,'\\'); // fileX=PATH
						paths.push(path);
					}
				}
			} else if (extension === '.xspf') {
				const bCache = xspfCache.has(playlistPath);
				const xmldom = bCache ? null : xmlDomCache.get(playlistPath) || XSPF.XMLfromString(originalText);
				const jspf = bCache ? xspfCache.get(playlistPath) : XSPF.toJSPF(xmldom);
				if (!bCache) {xspfCache.set(playlistPath, jspf);}
				const playlist = jspf.playlist;
				const rows = playlist.track;
				const rowsLength = rows.length;
				for (let i = 0; i < rowsLength; i++) { // Spaces are not allowed in location no need to trim
					if (Object.prototype.hasOwnProperty.call(rows[i], 'location') && rows[i].location && rows[i].location.length) { // TODO multiple locations allowed
						let path = decodeURI(rows[i].location).replace('file:///','').replace(/\//g,'\\').replace(/%26/g,'&'); // file:///PATH/SUBPATH/...
						if (Object.prototype.hasOwnProperty.call(rows[i], 'meta') && rows[i].meta && rows[i].meta.length) { // Add subsong for DVDs
							const metaSubSong = rows[i].meta.find((obj) => {return Object.prototype.hasOwnProperty.call(obj, 'subSong');});
							if (metaSubSong) {path +=  ',' + metaSubSong.subSong;}
						}
						paths.push(path);
					}
				}
			}
		} else if (bFpl) {
			const bCache = fplCache.has(playlistPath);
			const jspf = bCache ? fplCache.get(playlistPath) : FPL.parseFile(playlistPath);
			if (!bCache) {fplCache.set(playlistPath, jspf);}
			const playlist = jspf.playlist;
			const rows = playlist.track;
			const rowsLength = rows.length;
			for (let i = 0; i < rowsLength; i++) { // Spaces are not allowed in location no need to trim
				if (Object.prototype.hasOwnProperty.call(rows[i], 'location') && rows[i].location && rows[i].location.length) {
					let path = decodeURI(rows[i].location).replace('file:///','').replace(/\//g,'\\').replace(/%26/g,'&'); // file:///PATH/SUBPATH/...
					if (Object.prototype.hasOwnProperty.call(rows[i], 'meta') && rows[i].meta && rows[i].meta.length) { // Add subsong for DVDs
						const metaSubSong = rows[i].meta.find((obj) => {return Object.prototype.hasOwnProperty.call(obj, 'subSong');});
						if (metaSubSong) {path +=  ',' + metaSubSong.subSong;}
					}
					paths.push(path);
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
						if (progress % 10 === 0 && progress > prevProgress) {prevProgress = progress; console.log('Caching library paths ' + progress + '%.');}
						if (libItemsAbsPaths.length === count) {new Error('already cached');}
						else {resolve('done');}
					}
				}, iDelay * i);
			}));
		}
		Promise.all(promises).then(() => {
			libItemsAbsPaths = libCopy;
			resolve('precacheLibraryPaths: got paths from ' + count + ' items.');
		}, (error) => {new Error(error);});
	});
}

async function precacheLibraryPathsAsync(iSteps = iStepsLibrary, iDelay = iDelayLibraryPLM) {
	return await precacheLibraryPaths(iSteps, iDelay);
}

function precacheLibraryRelPaths(relPath) {
	if (libItemsAbsPaths.length && relPath.length && (!Object.prototype.hasOwnProperty.call(libItemsRelPaths, relPath) || !libItemsRelPaths[relPath].length)) {
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
	let cache = '';
	relPathSplit.forEach((folder) => {
		const level = new RegExp(escapeRegExp(folder) + '\\\\', 'i');
		cache = itemPath.replace(level, '');
		if (itemPath === cache) {itemPath = '..\\' + cache;}
		else {itemPath = cache;}
	});
	if (!itemPath.startsWith('..\\')) {itemPath = '.\\' + itemPath;}
	return itemPath;
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function loadTracksFromPlaylist(playlistPath, playlistIndex, relPath = '', remDupl = []/*['title','artist','date']*/) {
	let bDone = false;
	if (!playlistPath || !playlistPath.length) {
		console.log('getFilePathsFromPlaylist(): no playlist path was provided');
		return bDone;
	}
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	if (!readablePlaylistFormats.has(extension)){
		console.log('getFilePathsFromPlaylist(): Wrong extension set \'' + extension + '\', only allowed ' + [...readablePlaylistFormats].join(', '));
		return bDone;
	}
	if (extension === '.strm') {
		const stream = getFilePathsFromPlaylist(playlistPath);
		plman.AddLocations(playlistIndex, stream, true);
		bDone = true;
	} else if (extension === '.fpl') { // TODO: add query matching
		plman.AddLocations(playlistIndex, [playlistPath], true);
		bDone = true;
	} else {
		const {handlePlaylist, pathsNotFound} = getHandlesFromPlaylist(playlistPath, relPath, void(0), remDupl, true);
		if (handlePlaylist) {
			if (pathsNotFound && pathsNotFound.length) {
				if (extension === '.xspf') {
					// plman.AddLocations(playlistIndex, pathsNotFound);
				} else {
					// Do nothing
				}
			} else {
				plman.InsertPlaylistItems(playlistIndex, 0, handlePlaylist);
				bDone = true;
			}
		}
	}
	return bDone;
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function getHandlesFromPlaylist(playlistPath, relPath = '', bOmitNotFound = false, remDupl = []/*['$ascii($lower($trim(%TITLE%)))','ARTIST','$year(%DATE%)']*/, bReturnNotFound = false, bAdvTitle = false) {
	let test = new FbProfiler('getHandlesFromPlaylist');
	const extension = utils.SplitFilePath(playlistPath)[2].toLowerCase();
	let handlePlaylist = null, pathsNotFound = null;
	if (extension === '.xsp') {
		const bCache = xspCache.has(playlistPath);
		let playlistText;
		if (!bCache) {
			playlistText = _open(playlistPath);
			if (typeof playlistText !== 'undefined' && playlistText.length) {
				// Safe checks to ensure proper encoding detection
				const codePage = checkCodePage(playlistText, extension);
				if (codePage !== -1) {playlistText = _open(playlistPath, codePage);}
			} else {return;}
		}
		const xmldom = bCache ? null : xmlDomCache.get(playlistPath) || XSP.XMLfromString(playlistText);
		const jsp = bCache ? xspCache.get(playlistPath) : XSP.toJSP(xmldom);
		if (!bCache) {xspCache.set(playlistPath, jsp);}
		const query = XSP.getQuery(jsp, true);
		const sort = XSP.getSort(jsp);
		if (XSP.hasQueryPlaylists(jsp)) { // Uses playlists as sources
			const queryPlaylists = XSP.getQueryPlaylists(jsp);
			// From playlist manager or loaded playlists
			const toIncludeHandle = typeof list !== 'undefined'
				? list.getHandleFromPlaylists(queryPlaylists.is) // eslint-disable-line no-undef
				: getHandleFromUIPlaylists(queryPlaylists.is);
			const toExcludeHandle = typeof list  !== 'undefined'
				? list.getHandleFromPlaylists(queryPlaylists.isnot) // eslint-disable-line no-undef
				: getHandleFromUIPlaylists(queryPlaylists.isnot);
			// Difference
			toIncludeHandle.Sort();
			toExcludeHandle.Sort();
			toIncludeHandle.MakeDifference(toExcludeHandle);
			// Filter if needed
			handlePlaylist = toIncludeHandle;
			if (query.length) {handlePlaylist = checkQuery(query, false) ? fb.GetQueryItems(handlePlaylist, query) : null;}
		} else if (checkQuery(query, false)) {handlePlaylist = fb.GetQueryItems(fb.GetLibraryItems(), query);}
		else {console.log('Error on XSP Playlist: ' + query);}
		if (handlePlaylist) {
			handlePlaylist.Sort();
			const sortObj = sort.length ? getSortObj(sort) : null;
			if (remDupl && remDupl.length && typeof removeDuplicatesV2 !== 'undefined') {
				handlePlaylist = removeDuplicatesV2({handleList: handlePlaylist, checkKeys: remDupl, sortBias: globQuery.remDuplBias, bPreserveSort: !sortObj, bAdvTitle}); // eslint-disable-line no-undef
			}
			if (sortObj) {handlePlaylist.OrderByFormat(sortObj.tf, sortObj.direction);}
			const limit = XSP.getLimit(jsp);
			if (isFinite(limit)) {handlePlaylist.RemoveRange(limit, handlePlaylist.Count);}
			console.log('Loaded successfully XSP Playlist: ' + query + ' ' + sort);
		}
	} else {
		const filePaths = getFilePathsFromPlaylist(playlistPath).map((path) => {return path.toLowerCase();});
		if (!filePaths.some((path) => {return !/[A-Z]*:\\/.test(path);})) {relPath = '';} // No need to check rel paths if they are all absolute
		const playlistLength = filePaths.length;
		handlePlaylist = [...Array(playlistLength)];
		const poolItems = fb.GetLibraryItems();
		const poolItemsCount = poolItems.Count;
		const newLibItemsAbsPaths = libItemsAbsPaths.length === poolItems.Count ? libItemsAbsPaths : fb.TitleFormat(pathTF).EvalWithMetadbs(poolItems);
		const newLibItemsRelPaths = relPath.length
			? (Object.prototype.hasOwnProperty.call(libItemsRelPaths, relPath) && libItemsRelPaths[relPath].length === poolItems.Count
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
				if (filePool.size === 0) {break;}
			}
		} else {
			for (let i = 0; i < poolItemsCount; i++) {
				path = newLibItemsAbsPaths[i].toLowerCase();
				if (filePool.has(path)) {
					filePool.delete(path);
					pathPool.set(path, i);
					continue;
				}
				if (filePool.size === 0) {break;}
			}
		}
		let count = 0;
		let notFound = new Set();
		let bXSPF = (extension === '.xspf' ? true : false);
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
			} else {notFound.add(i);}
		}

		if (bXSPF && count !== playlistLength) {
			bOmitNotFound = true; // Omit not found for xspf playlists, forced by specification
			let playlistText = _open(playlistPath);
			if (typeof playlistText !== 'undefined' && playlistText.length) {
				// Safe checks to ensure proper encoding detection
				const codePage = checkCodePage(playlistText, extension);
				if (codePage !== -1) {playlistText = _open(playlistPath, codePage, true);}
				const bCache = xspfCache.has(playlistPath);
				const xmldom = bCache ? null : xmlDomCache.get(playlistPath) || XSPF.XMLfromString(playlistText);
				const jspf = bCache ? xspfCache.get(playlistPath) : XSPF.toJSPF(xmldom);
				if (!bCache) {xspfCache.set(playlistPath, jspf);}
				const playlist = jspf.playlist;
				const rows = playlist.track;
				const rowsLength = rows.length;
				const lookupKeys = [{xspfKey: 'title', queryKey: 'TITLE'}, {xspfKey: 'creator', queryKey: 'ARTIST'}, {xspfKey: 'album', queryKey: 'ALBUM'}, {xspfKey: 'trackNum', queryKey: 'TRACK'}, {xspfKey: 'identifier', queryKey: 'MUSICBRAINZ_TRACKID'}];
				const conditions = [['TITLE','ARTIST','ALBUM','TRACK'], ['TITLE','ARTIST','ALBUM'], ['TRACK','ARTIST','ALBUM'], ['TITLE','ALBUM'],  ['TITLE','ARTIST'], ['IDENTIFIER']];
				const regExListenBrainz = typeof listenBrainz !== 'undefined'
					? listenBrainz.regEx // eslint-disable-line no-undef
					: /^(https:\/\/(listenbrainz|musicbrainz).org\/)|(recording)|(playlist)|\//g;
				const sort = globQuery.remDuplBias; // TODO: add as argument?
				const sortTF = sort.length ? fb.TitleFormat(sort) : null;
				for (let i = 0; i < rowsLength; i++) {
					if (!notFound.has(i)) {continue;}
					let query = '';
					let lookup = {};
					lookupKeys.forEach((look) => {
						const key = look.xspfKey;
						const queryKey = look.queryKey;
						if (Object.prototype.hasOwnProperty.call(rows[i], key) && rows[i][key] && rows[i][key].length) {
							lookup[queryKey] = queryKey + ' IS ' + (key === 'identifier' ? decodeURI(rows[i][key]).replace(regExListenBrainz, '') : rows[i][key]);
						}
					});
					for (let condition of conditions) {
						if (condition.every((tag) => {return Object.prototype.hasOwnProperty.call(lookup, tag);})) {
							query = condition.map((tag) => {return lookup[tag];}).join(' AND ');
							const matches = queryCache.has(query) ? queryCache.get(query) : (checkQuery(query, true) ? fb.GetQueryItems(poolItems, query) : null);
							if (!queryCache.has(query)) {queryCache.set(query, matches);}
							if (matches && matches.Count) {
								if (sortTF) {matches.OrderByFormat(sortTF, -1);}
								handlePlaylist[i] = matches[0];
								count++;
								break;
							}
						}
					}
					// if (!handlePlaylist[i]) {console.log(filePaths[i]);}
				}
			}
		}
		pathsNotFound = [...notFound].map((idx) => {return filePaths[idx];});
		if (playlistLength) {
			if (count === playlistLength) {
				console.log(playlistPath.split('\\').pop() + ': found all tracks on library.');
				handlePlaylist = new FbMetadbHandleList(handlePlaylist);
			} else if (bOmitNotFound && handlePlaylist !== null) {
				console.log(playlistPath.split('\\').pop() + ': omitting not found items on library (' + (playlistLength - count) + ').' + '\n' + pathsNotFound.join('\n'));
				handlePlaylist = new FbMetadbHandleList(handlePlaylist.filter((n) => n)); // Must filter since there are holes
			} else {
				console.log(playlistPath.split('\\').pop() + ': some items were not found on library (' + (playlistLength - count) + ').' + '\n' + pathsNotFound.join('\n'));
				handlePlaylist = null;
			}
		} else {
			console.log(playlistPath.split('\\').pop() + ': empty playlist.');
			handlePlaylist = null;
		}
		if (handlePlaylist !== null) {
			if (!libItemsAbsPaths.length) {libItemsAbsPaths = newLibItemsAbsPaths;}
			if (relPath.length && (!Object.prototype.hasOwnProperty.call(libItemsRelPaths, relPath) || !libItemsRelPaths[relPath].length)) {libItemsRelPaths[relPath] = newLibItemsRelPaths;}
		}
	}
	test.Print();
	return (!bReturnNotFound ? handlePlaylist : {handlePlaylist, pathsNotFound});
}

// Loading m3u, m3u8 & pls playlist files is really slow when there are many files
// Better to find matches on the library (by path) and use those! A query or addLocation approach is easily 100x times slower
function arePathsInMediaLibrary(filePaths, relPath = '') {
	// let test = new FbProfiler('arePathsInMediaLibrary');
	if (!filePaths.some((path) => {return !/[A-Z]*:\\/.test(path);})) {relPath = '';} // No need to check rel paths if they are all absolute
	const playlistLength = filePaths.length;
	const poolItems = fb.GetLibraryItems();
	const poolItemsCount = poolItems.Count;
	const newLibItemsAbsPaths = libItemsAbsPaths.length === poolItemsCount ? libItemsAbsPaths : fb.TitleFormat(pathTF).EvalWithMetadbs(poolItems);
	const poolItemsAbsPaths = new Set(newLibItemsAbsPaths.map((path) => {return path.toLowerCase();}));
	const newLibItemsRelPaths = relPath.length ? (Object.prototype.hasOwnProperty.call(libItemsRelPaths, relPath) && libItemsRelPaths[relPath].length === poolItemsCount ? libItemsRelPaths[relPath] : getRelPaths(newLibItemsAbsPaths, relPath)) : null; // Faster than tf again
	const poolItemsRelPaths = newLibItemsRelPaths ? new Set(newLibItemsRelPaths.map((path) => {return path.toLowerCase();})) : null;
	let filePool = new Set(filePaths.map((path) => {return path.toLowerCase();}));
	const filePoolSize = filePool.size;
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
	if (relPath.length && (!Object.prototype.hasOwnProperty.call(libItemsRelPaths, relPath) || !libItemsRelPaths[relPath].length)) {libItemsRelPaths[relPath] = newLibItemsRelPaths;}
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