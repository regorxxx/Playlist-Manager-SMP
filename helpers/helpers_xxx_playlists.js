'use strict';
//10/01/25

/* exported playlistCountLocked, removeNotSelectedTracks, getPlaylistNames, removePlaylistByName, clearPlaylistByName, arePlaylistNamesDuplicated, findPlaylistNamesDuplicated, sendToPlaylist, getHandlesFromUIPlaylists, getLocks, setLocks, getPlaylistSelectedIndexes, getPlaylistSelectedIndexFirst, getPlaylistSelectedIndexLast, getSource, MAX_QUEUE_ITEMS */

include('helpers_xxx_prototypes.js');
/* global range:readable, isArrayNumbers:readable */

const MAX_QUEUE_ITEMS = 256;

/*
	Playlist manipulation
*/

// Count locked playlist by type
function playlistCountLocked(type = []) {
	const playlistsNum = plman.PlaylistCount;
	const bAll = !type.length;
	let count = 0;
	for (let i = 0; i < playlistsNum; i++) {
		const lockActions = plman.GetPlaylistLockedActions(i);
		if (bAll && lockActions.length || !bAll && new Set(lockActions).isSuperset(new Set(type))) { count++; }
	}
	return count;
}

// Select n tracks from playlist and remove the rest
// Start is zero by default
// When nTracks is negative, then the count is done
// reversed from start to zero
// When nTracks is negative and start is zero or not provided,
// then start is set to playlist length
function removeNotSelectedTracks(playlistIndex, nTracks, start = 0) {
	plman.ClearPlaylistSelection(playlistIndex);
	const sign = Math.sign(nTracks);
	start = sign < 0 && !start ? plman.PlaylistItemCount(playlistIndex) - 1 : start;
	const selection = range(start, start + sign * (Math.abs(nTracks) - 1), sign);
	plman.SetPlaylistSelection(playlistIndex, selection, true);
	plman.RemovePlaylistSelection(playlistIndex, true);
}

// Outputs names of all playlists
function getPlaylistNames() {
	let names = [];
	for (let i = 0; i < plman.PlaylistCount; i++) { names.push({ name: plman.GetPlaylistName(i), idx: i }); }
	return names;
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
	while (index !== -1) {
		plman.RemovePlaylist(index);
		index = plman.FindPlaylist(name);
	}
}

// Clears all playlists with that name
function clearPlaylistByName(name) {
	let index = getPlaylistIndexArray(name);
	if (isArrayNumbers(index)) {
		for (let i of index) {
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
	return (names.size !== count);
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

/**
 * The `sendToPlaylist` function is used to send a list of handles (tracks) to a specified playlist.
 *
 * @function
 * @name sendToPlaylist
 * @kind function
 * @param {FbMetadbHandleList|(FbMetadbHandle|string)[]} handleList
 * @param {string} playlistName
 * @returns {FbMetadbHandleList\|(FbMetadbHandle|string)[]}
 */
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
		console.log('Playlist created: ' + playlistName);
	}
	if (plman.PlaylistItemCount(plman.ActivePlaylist)) {
		plman.UndoBackup(plman.ActivePlaylist);
		plman.ClearPlaylist(plman.ActivePlaylist);
		console.log('Playlist used: ' + playlistName);
	}
	// Create playlist
	if (Array.isArray(handleList)) {
		handleList = handleList.filter(Boolean);
		console.log('Final selection: ' + handleList.length + ' tracks');
		plman.AddPlaylistItemsOrLocations(plman.ActivePlaylist, handleList, true);
	} else {
		console.log('Final selection: ' + handleList.Count + ' tracks');
		plman.InsertPlaylistItems(plman.ActivePlaylist, 0, handleList);
	}
	return handleList;
}

function getHandlesFromUIPlaylists(names = [], bSort = true) {
	let playlists = new Set();
	names.forEach((name) => { playlists = playlists.union(new Set(getPlaylistIndexArray(name))); });
	let output = new FbMetadbHandleList();
	playlists.forEach((idx) => { output.AddRange(plman.GetPlaylistItems(idx)); });
	if (bSort) { output.Sort(); }
	return output;
}

function getLocks(plsName) {
	const index = plman.FindPlaylist(plsName);
	const types = index !== -1 ? [...new Set(plman.GetPlaylistLockedActions(index))] : [];
	const name = index !== -1 ? plman.GetPlaylistLockName(index) : '';
	const isSMPLock = name === window.Parent || !name;
	const isLocked = !!types.length;
	return { isLocked, isSMPLock, name, types, index };
}

function setLocks(playlistIndex, lockTypes, logic = 'add' /* add|switch|remove*/) {
	if (playlistIndex === -1) { return false; }
	let newLocks = new Set(plman.GetPlaylistLockedActions(playlistIndex) || []);
	const lockName = plman.GetPlaylistLockName(playlistIndex);
	if (lockName === window.Parent || !lockName) {
		switch (logic.toLowerCase()) {
			case 'switch':
				lockTypes.forEach((lock) => {
					if (newLocks.has(lock)) { newLocks.delete(lock); }
					else { newLocks.add(lock.type); }
				});
				break;
			case 'remove':
				newLocks = newLocks.difference(new Set(lockTypes));
				break;
			case 'add':
			default:
				newLocks = newLocks.union(new Set(lockTypes));
		}
		plman.SetPlaylistLockedActions(playlistIndex, [...newLocks]);
		return true;
	}
	return false;
}

function getPlaylistSelectedIndexes(playlistIndex) {
	if (playlistIndex === -1 || playlistIndex >= plman.PlaylistCount) { return null; }
	return range(0, plman.PlaylistItemCount(playlistIndex) - 1, 1)
		.map((idx) => plman.IsPlaylistItemSelected(playlistIndex, idx) ? idx : null).filter((n) => n !== null);
}

function getPlaylistSelectedIndexFirst(playlistIndex) {
	if (playlistIndex === -1 || playlistIndex >= plman.PlaylistCount) { return -1; }
	return range(0, plman.PlaylistItemCount(playlistIndex) - 1, 1)
		.findIndex((idx) => plman.IsPlaylistItemSelected(playlistIndex, idx));
}

function getPlaylistSelectedIndexLast(playlistIndex) {
	if (playlistIndex === -1 || playlistIndex >= plman.PlaylistCount) { return -1; }
	return range(plman.PlaylistItemCount(playlistIndex) - 1, 0, -1)
		.findIndex((idx) => plman.IsPlaylistItemSelected(playlistIndex, idx));
}

function getSource(type, arg) {
	switch (type) {
		case 'playlist': return getHandlesFromUIPlaylists(arg, false); // [playlist names]
		case 'playingPlaylist': return (plman.PlayingPlaylist !== -1 && fb.IsPlaying ? plman.GetPlaylistItems(plman.PlayingPlaylist) : getSource('activePlaylist'));
		case 'activePlaylist': return (plman.ActivePlaylist !== -1 ? plman.GetPlaylistItems(plman.ActivePlaylist) : new FbMetadbHandleList());
		case 'handleList': return arg;
		case 'library':
		default: return fb.GetLibraryItems();
	}
}