'use strict';
//09/09/22

include('helpers_xxx_tags.js');
include('..\\main\\remove_duplicates.js');
include('helpers_xxx_web.js');
const SimpleCrypto = require('..\\helpers-external\\SimpleCrypto-js\\SimpleCrypto.min');
const simpleCrypto = new SimpleCrypto('1c32c94fbe079f28048c58835bd83f8c');
const token = simpleCrypto.encrypt('2d4a0fda-441c-47b1-8193-0ae2f76539ce');

// Post new playlist using the playlist file as reference and provides a new MBID
// Note posting multiple times the same playlist file will create different entities
// Use sync to edit already exported playlists
function exportToListenBrainz(pls /*{name, nameId, path}*/, root = '') {
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
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + simpleCrypto.decrypt(token)]],
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
function syncToListenBrainz(pls /*{name, nameId, path, playlist_mbid}*/, root = '') {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {return false;}
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
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + simpleCrypto.decrypt(token)]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => { // After deleted all online tracks, add all offline tracks
			console.log('syncToListenBrainz: ' + resolve);
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.status === 'ok') {
					return handleList.Count ? addToListenBrainz(pls, handleList) : true;
				}
				return false;
			}
			return false;
		},
		(reject) => { // If the online playlist was already empty, let's simply add the new tracks
			console.log('syncToListenBrainz: ' + reject.status + ' ' + reject.responseText);
			if (reject.responseText.length) {
				const response = JSON.parse(reject.responseText);
				// TODO Check online playlist size to be sure
				if (response.error === 'Failed to deleting recordings from the playlist. Please try again.') {
					return handleList.Count ? addToListenBrainz(pls, handleList) : true;
				}
				return false;
			}
			return false;
		}
	);
}

// Add handleList to given online playlist
function addToListenBrainz(pls /*{name, playlist_mbid}*/, handleList, offset = '') {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {return false;}
	if (!handleList || !handleList.Count) {return true;}
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
		URL: 'https://api.listenbrainz.org/1/playlist/' + pls.playlist_mbid + '/item/add' + (offset.length ? '/' + offset : ''),
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + simpleCrypto.decrypt(token)]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			console.log('addToListenBrainz: ' + resolve);
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.status === 'ok') {
					return true;
				}
				return false;
			}
			return false;
		},
		(reject) => {
			console.log('addToListenBrainz: ' + reject.status + ' ' + reject.responseText);
			return false;
		}
	);
}

// Import playlist metadata and track list from online playlist
function importFromListenBrainz(pls /*{playlist_mbid}*/) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {return false;}
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/playlist/' + pls.playlist_mbid + '?fetch_metadata=true',
		requestHeader: [['Authorization', 'Token ' + simpleCrypto.decrypt(token)]]
	}).then(
		(resolve) => {
			if (resolve) { // Ensure it matches the ID
				const jspf = JSON.parse(resolve);
				if (jspf.playlist && jspf.playlist.identifier) {
					return pls.playlist_mbid === jspf.playlist.identifier.replace('https://listenbrainz.org/playlist/', '') ? JSON.parse(resolve) : null
				}
			}
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