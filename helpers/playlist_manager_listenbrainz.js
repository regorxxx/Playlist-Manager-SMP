'use strict';
//12/09/22

include('helpers_xxx_tags.js');
include('..\\main\\remove_duplicates.js');
include('helpers_xxx_web.js');
const SimpleCrypto = require('..\\helpers-external\\SimpleCrypto-js\\SimpleCrypto.min');

// Post new playlist using the playlist file as reference and provides a new MBID
// Note posting multiple times the same playlist file will create different entities
// Use sync to edit already exported playlists
function exportToListenBrainz(pls /*{name, nameId, path}*/, root = '', token) {
	const bUI = pls.extension === '.ui';
	// Create new playlist and check paths
	const handleList = !bUI ? getHandlesFromPlaylist(pls.path, root, true) : getHandleFromUIPlaylists([pls.nameId], false); // Omit not found
	const mbid = getTagsValuesV3(handleList, ['MUSICBRAINZ_TRACKID'], true).flat().filter(Boolean);
	if (handleList.Count !== mbid.length) {console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted on exporting');}
	const track = mbid.map((tag) => {return {identifier: 'https://musicbrainz.org/recording/' + tag};});
	const data = { // JSPF playlist with minimum data
		playlist: {
			extension: {
				'https://musicbrainz.org/doc/jspf#playlist': {
					'public': true
				}
			},
			title: pls.name,
			track,	
		}
	};
	return send({
		method: 'POST', 
		URL: 'https://api.listenbrainz.org/1/playlist/create',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			console.log('exportToListenBrainz: ' + resolve);
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.playlist_mbid && response.playlist_mbid.length) {
					return response.playlist_mbid;
				}
				return '';
			}
			return '';
		},
		(reject) => {
			console.log('syncToListenBrainz: ' + reject.status + ' ' + reject.responseText);
			return '';
		}
	);
}

// Delete all tracks on online playlist and then add all tracks again using the playlist file as reference
// Easier than single edits, etc.
function syncToListenBrainz(pls /*{name, nameId, path, playlist_mbid}*/, root = '', token) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {return '';}
	const data = {
		index: 0,
		count: Number.MAX_VALUE
	};
	const bUI = pls.extension === '.ui';
	// Create new playlist and check paths
	const handleList = !bUI ? getHandlesFromPlaylist(pls.path, root, true) : getHandleFromUIPlaylists([pls.nameId], false); // Omit not found
	return send({
		method: 'POST', 
		URL: 'https://api.listenbrainz.org/1/playlist/' + pls.playlist_mbid + '/item/delete',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => { // After deleted all online tracks, add all offline tracks
			console.log('syncToListenBrainz: ' + resolve);
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.status === 'ok') {
					return handleList.Count ? addToListenBrainz(pls, handleList, void(0), token) : pls.playlist_mbid;
				}
				return '';
			}
			return '';
		},
		async (reject) => { // If the online playlist was already empty, let's simply add the new tracks
			console.log('syncToListenBrainz: ' + reject.status + ' ' + reject.responseText);
			if (reject.responseText.length) {
				const response = JSON.parse(reject.responseText);
				if (response.error === 'Failed to deleting recordings from the playlist. Please try again.') { // Playlist file was empty
					const jspf = await importFromListenBrainz(pls, token);
					if (jspf.playlist.track.length === 0) {
						return handleList.Count ? addToListenBrainz(pls, handleList, void(0), token) : pls.playlist_mbid;
					}
				} else if (response.code === 404 && response.error === ('Cannot find playlist: ' + pls.playlist_mbid)) { // Playlist file had a MBID not found on server
					return exportToListenBrainz(pls, root, token);
				}
				return '';
			}
			return '';
		}
	);
}

// Add handleList to given online playlist
function addToListenBrainz(pls /*{name, playlist_mbid}*/, handleList, offset, token) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {return '';}
	if (!handleList || !handleList.Count) {return pls.playlist_mbid;}
	const mbid = getTagsValuesV3(handleList, ['MUSICBRAINZ_TRACKID'], true).flat().filter(Boolean);
	if (handleList.Count !== mbid.length) {console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted on exporting');}
	const track = mbid.map((tag) => {return {identifier: 'https://musicbrainz.org/recording/' + tag};});
	// TODO slice handleList into parts to not reach max tracks count on server
	const data = { // JSPF playlist with minimum data
		playlist: {
			extension: {
				'https://musicbrainz.org/doc/jspf#playlist': {
					'public': true
				}
			},
			title: pls.name,
			track,	
		}
	};
	return send({
		method: 'POST', 
		URL: 'https://api.listenbrainz.org/1/playlist/' + pls.playlist_mbid + '/item/add' + (typeof offset !== 'undefined' ? '/' + offset : ''),
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			console.log('addToListenBrainz: ' + resolve);
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.status === 'ok') {
					return pls.playlist_mbid;
				}
				return '';
			}
			return '';
		},
		(reject) => {
			console.log('addToListenBrainz: ' + reject.status + ' ' + reject.responseText);
			return '';
		}
	);
}

// Import playlist metadata and track list from online playlist
function importFromListenBrainz(pls /*{playlist_mbid}*/, token) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {return false;}
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/playlist/' + pls.playlist_mbid + '?fetch_metadata=true',
		requestHeader: [['Authorization', 'Token ' + token]]
	}).then(
		(resolve) => {
			if (resolve) { // Ensure it matches the ID
				const jspf = JSON.parse(resolve);
				if (jspf && jspf.playlist && jspf.playlist.identifier && pls.playlist_mbid === jspf.playlist.identifier.replace('https://listenbrainz.org/playlist/', '')) {
					console.log('importFromListenBrainz: ' + JSON.stringify({creator: jspf.playlist.creator, identifier: jspf.playlist.identifier}));
					return jspf;
				}
			}
			console.log('importFromListenBrainz: unknown error');
			return null;
		},
		(reject) => {
			console.log('importFromListenBrainz: ' + reject.status + ' -> ' + reject.responseText);
			return null;
		}
	);
}

function contentResolver(jspf) {
	if (!jspf) {return null;}
	// Query cache (Library)
	// Makes consecutive playlist loading by queries much faster (for ex. .xspf fuzzy matching)
	const queryCache = new Map(); // {Query: handleList}
	let handlePlaylist = [];
	let count = 0;
	const playlist = jspf.playlist;
	const rows = playlist.track;
	const rowsLength = rows.length;
	const lookupKeys = [{xspfKey: 'identifier', queryKey: 'MUSICBRAINZ_TRACKID'}, {xspfKey: 'title', queryKey: 'TITLE'}, {xspfKey: 'creator', queryKey: 'ARTIST'}];
	const conditions = [['MUSICBRAINZ_TRACKID'], ['TITLE','ARTIST'], ['TITLE']];
	for (let i = 0; i < rowsLength; i++) {
		let query = '';
		let lookup = {};
		lookupKeys.forEach((look) => {
			const key = look.xspfKey;
			const queryKey = look.queryKey;
			if (rows[i].hasOwnProperty(key) && rows[i][key] && rows[i][key].length) {
				lookup[queryKey] = queryKey + ' IS ' + (key === 'identifier' ? decodeURI(rows[i][key]).replace('https://musicbrainz.org/recording/','') : rows[i][key]);
			}
		});
		for (let condition of conditions) {
			if (condition.every((tag) => {return lookup.hasOwnProperty(tag);})) {
				query = condition.map((tag) => {return lookup[tag];}).join(' AND ');
				const matches = queryCache.has(query) ? queryCache.get(query) : (checkQuery(query, true) ? fb.GetQueryItems(fb.GetLibraryItems(), query) : null);
				if (!queryCache.has(query)) {queryCache.set(query, matches);}
				if (matches && matches.Count) {
					handlePlaylist[i] = matches[0];
					count++;
					break;
				}
			}
		}
		if (!handlePlaylist[i]) {console.log(rows[i].title, rows[i].creator, rows[i].identifier);}
	}
	return new FbMetadbHandleList(handlePlaylist);
}

function retrieveUserPlaylistsNames(user, token) {
	if (!token || !token.length || !user || !user.length) {return null;}
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/user/' + user + '/playlists',
		requestHeader: [['Authorization', 'Token ' + token]]
	}).then(
		(resolve) => {
			const response = JSON.parse(resolve);
			console.log('retrieveUserPlaylistsNames: ' + user + ' -> ' + response.playlist_count + ' playlists');
			return response;
		},
		(reject) => {
			console.log('retrieveUserPlaylistsNames: ' + reject);
			return null;
		}
	);
}

function retrieveUserPlaylists(user, token) {
	if (!token || !token.length || !user || !user.length) {return null;}
	return retrieveUserPlaylistsNames(user, token).then(
		(resolve) => {
			const playlists = resolve.playlists;
			const jsfpArr = playlists.map((pls) => {return importFromListenBrainz(pls.identifier.replace('https://listenbrainz.org/playlist/', ''));})
			return Promise.all(jsfpArr);
		},
		(reject) => {
			console.log('retrieveUserPlaylists: ' + reject);
			return null;
		}
	);
}

async function importUserPlaylists(user) {
	if (!checkLBToken()) {return false;}
	let bDone = false;
	const jspf = await retrieveUserPlaylists(user, decryptToken({lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1]}));
	if (jsfpArr && jsfpArr.length) {
		const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
		jsfpArr.forEach((jspf) => {
			const handleList = contentResolver(jspf);
			if (handleList) {
				const playlistName = jspf.playlist.title;
				const playlistPath = list.playlistsPath + sanitize(playlistName) + list.playlistsExtension;
				const backPath = playlistPath + '.back';
				if (_isFile(playlistPath)) {
					let answer = WshShell.Popup('There is a playlist with same name/path.\nDo you want to overwrite it?.', 0, window.Name, popup.question + popup.yes_no);
					if (answer === popup.no) {return false;}
					_renameFile(playlistPath, backPath);
				}
				const useUUID = list.optionsUUIDTranslate();
				const playlistNameId = playlistName + (list.bUseUUID ? nextId(useUUID, false) : '');
				const category = list.categoryState.length === 1 && list.categoryState[0] !== list.categories(0) ? list.categoryState[0] : '';
				const tags = ['ListenBrainz'];
				if (list.bAutoLoadTag) {oPlaylistTags.push('bAutoLoad');}
				if (list.bAutoLockTag) {oPlaylistTags.push('bAutoLock');}
				if (list.bMultMenuTag) {oPlaylistTags.push('bMultMenu');}
				if (list.bAutoCustomTag) {list.autoCustomTag.forEach((tag) => {if (! new Set(oPlaylistTags).has(tag)) {oPlaylistTags.push(tag);}});}	
				bDone = savePlaylist({handleList, playlistPath, ext: list.playlistsExtension, playlistName, category, tags, playlist_mbid, useUUID, bBOM: list.bBOM});
				// Restore backup in case something goes wrong
				if (!bDone) {console.log('Failed saving playlist: ' + playlistPath); _deleteFile(playlistPath); _renameFile(backPath, playlistPath);}
				else if (_isFile(backPath)) {_deleteFile(backPath);}
				if (bDone && plman.FindPlaylist(playlistNameId) !== -1) {sendToPlaylist(handleList, playlistNameId);}
			}
		});
		clearInterval(delay);
	}
	if (!bDone) {fb.ShowPopupMessage('There were some errors on playlist syncing. Check console.', window.Name);}
	return bDone;
}

function decryptToken({lBrainzToken, bEncrypted = true}) {
	let key = '';
	if (bEncrypted) {
		let pass = '';
		try {pass = utils.InputBox(window.ID, 'Enter password:', window.Name, pass, true);} 
		catch(e) {return;}
		if (!pass.length) {return;}
		key = new SimpleCrypto(pass);
	}
	return (bEncrypted ? key.decrypt(lBrainzToken) : lBrainzToken);
}

function retrieveUserResponse(token) {
	if (!token || !token.length) {return null;}
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/validate-token?token=' + token
	}).then(
		(resolve) => {
			return JSON.parse(resolve);
		},
		(reject) => {
			console.log('retrieveUser: ' + reject);
			return null;
		}
	);
}

async function retrieveUser(token) {
	const response = await retrieveUserResponse(token);
	return response && response.valid ? response.user_name : '';
}

async function validateToken(token) {
	const response = await retrieveUserResponse(token);
	console.log(response);
	return (response && response.valid);
}