'use strict';
//25/05/26

/* exported playlistCountLocked, removeNotSelectedTracks, getPlaylistNames, removePlaylistByName, clearPlaylistByName, arePlaylistNamesDuplicated, findPlaylistNamesDuplicated, sendToPlaylist, getHandlesFromUIPlaylists, getLocks, setLocks, getPlaylistSelectedIndexes, getPlaylistSelectedIndexFirst, getPlaylistSelectedIndexLast, getSource, MAX_QUEUE_ITEMS, focusOnItem, findTracksAtPlaylist, hasAnyLocks, movePlaylistSelection */

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

function findTracksAtPlaylist(plsIdx, handleArr, findTrack) {
	const selItems = [];
	const list = plman.GetPlaylistItems(plsIdx).Convert();
	const reference = { idx: -1, found: false };
	handleArr.forEach((h) => { // Select duplicates handles
		let i = 0;
		for (const handle of list) {
			if (handle.Compare(h)) { selItems.push(i); }
			if (!reference.found && findTrack && handle.Compare(findTrack)) { reference.idx = i; reference.found = true; }
			i++;
		}
	});
	return { selection: { idx: selItems, count: selItems.length, focus: selItems[0] }, plsIdx, reference };
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
function sendToPlaylist(handleList, playlistName, bLog = true) {
	// Clear playlist if needed. Preferred to removing it, since then we could undo later...
	// Look if target playlist already exists
	let i = 0;
	let plc = plman.PlaylistCount;
	while (i < plc) {
		if (plman.GetPlaylistName(i) === playlistName) {
			plman.ActivePlaylist = i;
			if (plman.PlaylistItemCount(i)) {
				plman.UndoBackup(plman.ActivePlaylist);
				plman.ClearPlaylist(plman.ActivePlaylist);
			}
			if (bLog) { console.log('Playlist used: ' + playlistName); }
			break;
		} else {
			i++;
		}
	}
	if (i === plc) { //if no playlist was found before
		plman.CreatePlaylist(plc, playlistName);
		plman.ActivePlaylist = plc;
		if (bLog) { console.log('Playlist created: ' + playlistName); }
	}
	// Create playlist
	if (Array.isArray(handleList)) {
		handleList = handleList.filter(Boolean);
		if (bLog) { console.log('Final selection: ' + handleList.length + ' tracks'); }
		plman.AddPlaylistItemsOrLocations(plman.ActivePlaylist, handleList, true);
	} else {
		if (bLog) { console.log('Final selection: ' + handleList.Count + ' tracks'); }
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

/**
 * Gets playlist locked actions, along lock owner and lock state
 *
 * @function
 * @name getLocks
 * @kind function
 * @param {number|string} plsNameOrIdx
 * @returns {{ isLocked: boolean, isSMPLock: boolean, name: string, types: ('AddItems'|'RemoveItems'|'ReorderItems'|'ReplaceItems'|'RenamePlaylist'|'RemovePlaylist'|'ExecuteDefaultAction')[], index: number }}
 */
function getLocks(plsNameOrIdx) {
	if (plsNameOrIdx === -1) { return { isLocked: false, isSMPLock: true, name: null, types: [], index: -1 }; }
	const index = typeof plsNameOrIdx === 'string'
		? plman.FindPlaylist(plsNameOrIdx)
		: plsNameOrIdx;
	const types = index === -1 ? [] : [...new Set(plman.GetPlaylistLockedActions(index))];
	const name = index === -1 ? '' : plman.GetPlaylistLockName(index);
	const isSMPLock = name === window.Parent || !name;
	const isLocked = !!types.length;
	return { isLocked, isSMPLock, name, types, index };
}

/**
 * Checks if playlist has specific locked actions
 *
 * @function
 * @name hasAnyLocks
 * @kind function
 * @param {number|string} plsNameOrIdx
 * @param {('AddItems'|'RemoveItems'|'ReorderItems'|'ReplaceItems'|'RenamePlaylist'|'RemovePlaylist'|'ExecuteDefaultAction')[]|Set<('AddItems'|'RemoveItems'|'ReorderItems'|'ReplaceItems'|'RenamePlaylist'|'RemovePlaylist'|'ExecuteDefaultAction')>} actions
 * @returns {boolean}
 */
function hasAnyLocks(plsNameOrIdx, actions) {
	const index = typeof plsNameOrIdx === 'string'
		? plman.FindPlaylist(plsNameOrIdx)
		: plsNameOrIdx;
	const types = new Set(index === -1 ? [] : plman.GetPlaylistLockedActions(index));
	return types.intersectionSize(new Set(actions)) > 0;
}

/**
 * Sets playlist locked actions
 *
 * @function
 * @name setLocks
 * @kind function
 * @param {number|string} plsNameOrIdx
 * @param {('AddItems'|'RemoveItems'|'ReorderItems'|'ReplaceItems'|'RenamePlaylist'|'RemovePlaylist'|'ExecuteDefaultAction')[]} lockTypes
 * @param {'add'|'switch'|'remove'|'replace'|'globalswitch'} logic? - [='replace']
 * @returns {boolean}
 */
function setLocks(plsNameOrIdx, lockTypes, logic = 'replace') {
	const index = typeof plsNameOrIdx === 'string'
		? plman.FindPlaylist(plsNameOrIdx)
		: plsNameOrIdx;
	if (index === -1) { return false; }
	let newLocks = new Set(plman.GetPlaylistLockedActions(index) || []);
	const lockName = plman.GetPlaylistLockName(index);
	if (lockName === window.Parent || !lockName) {
		switch (logic.toLowerCase()) {
			case 'switch':
				lockTypes.forEach((lock) => {
					if (newLocks.has(lock)) { newLocks.delete(lock); }
					else { newLocks.add(lock); }
				});
				break;
			case 'globalswitch':
				newLocks = newLocks.size
					? new Set()
					: new Set(lockTypes);
				break;
			case 'remove':
				newLocks = newLocks.difference(new Set(lockTypes));
				break;
			case 'replace':
				newLocks = new Set(lockTypes);
				break;
			case 'add':
			default:
				newLocks = newLocks.union(new Set(lockTypes));
		}
		// BUG: SMP if any lock is applied, playback doesn't work unless this is added
		if (window.Bugs.SetPlaylistLockedActions) {
			const locksNum = newLocks.size;
			if (locksNum === 1 && newLocks.has('ExecuteDefaultAction')) { newLocks.delete('ExecuteDefaultAction'); }
			else if (locksNum > 0) { newLocks.add('ExecuteDefaultAction'); }
		}
		plman.SetPlaylistLockedActions(index, [...newLocks]);
		return true;
	}
	return false;
}

function getPlaylistSelectedIndexes(playlistIndex) {
	if (playlistIndex === -1 || playlistIndex >= plman.PlaylistCount) { return null; }
	const arr = [];
	const count = plman.PlaylistItemCount(playlistIndex);
	for (let i = 0; i < count; i++) {
		if (plman.IsPlaylistItemSelected(playlistIndex, i)) { arr.push(i); }
	}
	return arr;
}

function getPlaylistSelectedIndexFirst(playlistIndex) {
	if (playlistIndex === -1 || playlistIndex >= plman.PlaylistCount) { return -1; }
	const count = plman.PlaylistItemCount(playlistIndex);
	for (let i = 0; i < count; i++) {
		if (plman.IsPlaylistItemSelected(playlistIndex, i)) { return i; }
	}
	return -1;
}

function getPlaylistSelectedIndexLast(playlistIndex) {
	if (playlistIndex === -1 || playlistIndex >= plman.PlaylistCount) { return -1; }
	const count = plman.PlaylistItemCount(playlistIndex);
	for (let i = count - 1; i >= 0; i--) {
		if (plman.IsPlaylistItemSelected(playlistIndex, i)) { return i; }
	}
	return -1;
}

function getSource(type, arg) {
	switch (type) {
		case 'playlist': return getHandlesFromUIPlaylists(arg, false); // [playlist names]
		case 'playingPlaylist': return plman.PlayingPlaylist !== -1 && fb.IsPlaying
			? plman.GetPlaylistItems(plman.PlayingPlaylist)
			: getSource('activePlaylist');
		case 'activePlaylist': return plman.ActivePlaylist === -1
			? new FbMetadbHandleList()
			: plman.GetPlaylistItems(plman.ActivePlaylist);
		case 'panel':
		case 'handleList': return arg;
		case 'library':
		default: return fb.GetLibraryItems();
	}
}

function focusOnItem(plsIdx, idx, selection = [], bClear = true) {
	if (plsIdx === -1) { return; }
	if (idx === -1) { idx = 0; }
	plman.ActivePlaylist = plsIdx;
	if (bClear) { plman.ClearPlaylistSelection(plsIdx); }
	if (selection && selection.length) { plman.SetPlaylistSelection(plman.ActivePlaylist, selection, true); }
	plman.SetPlaylistSelectionSingle(plsIdx, idx, true);
	plman.SetPlaylistFocusItem(plsIdx, idx);
	plman.EnsurePlaylistItemVisible(plsIdx, idx);
}

function movePlaylistSelection(plsIdx, posIdx, bScroll) { // Works with non contiguous selection
	const selIdxArr = getPlaylistSelectedIndexes(plsIdx);
	if (plman.GetPlaylistLockedActions(plsIdx).includes('ReorderItems')) { return selIdxArr;}
	plman.UndoBackup(plsIdx);
	let toPlsPos = posIdx === -1 ? plman.PlaylistItemCount(plsIdx) - 1 : Math.min(posIdx, plman.PlaylistItemCount(plsIdx) - 1);
	let bMoved = false;
	const toSel = [];
	const chunks = selIdxArr.chunkBy((curr, prev) => curr !== prev + 1);
	const middle = chunks.findIndex((arr) => arr.includes(posIdx));
	if (middle !== -1) { toPlsPos = chunks[middle].at(0) - 1; }
	let mBreak = middle === -1 ? chunks.findLastIndex((arr) => arr[0] < posIdx) : middle - 1;
	let toMove = mBreak === -1 ? [] : chunks.slice(0, mBreak + 1);
	if (middle === 0 && chunks.length === 1) {
		toPlsPos = posIdx === -1
			? plman.PlaylistItemCount(plsIdx) - 1
			: posIdx;
		if (chunks[0].at(0) === toPlsPos || toPlsPos + chunks[0].length > plman.PlaylistItemCount(plsIdx)) { toPlsPos = -1; }
		if (toPlsPos === -1) {
			selIdxArr.forEach((i) => toSel.push(i));
		} else {
			plman.ClearPlaylistSelection(plsIdx);
			plman.SetPlaylistSelection(plsIdx, chunks[0], true);
			plman.MovePlaylistSelection(plsIdx, toPlsPos - chunks[0].at(0));
			plman.ClearPlaylistSelection(plsIdx);
			chunks[0].forEach((i) => toSel.push(i + toPlsPos - chunks[0].at(0)));
		}
	} else {
		if (toMove.length) {
			bMoved = true;
			let movedCount = 0;
			toMove.reverse().forEach((arr) => {
				plman.ClearPlaylistSelection(plsIdx);
				plman.SetPlaylistSelection(plsIdx, arr, true);
				plman.MovePlaylistSelection(plsIdx, toPlsPos - arr.at(-1) - movedCount);
				movedCount += arr.length;
			});
			range(toPlsPos, toPlsPos - movedCount + 1, -1).forEach((i) => toSel.push(i));
			toSel.sort((a, b) => a - b);
		}
		toMove = selIdxArr.filter((idx) => idx > toPlsPos);
		if (bMoved) { toPlsPos += 1; }
		if (middle !== -1) { toPlsPos = chunks[middle].at(-1) + 1; chunks[middle].forEach((i) => toSel.push(i)); }
		mBreak = middle === -1 ? chunks.findLastIndex((arr) => arr[0] < posIdx) : middle;
		toMove = mBreak === -1 ? chunks : chunks.slice(mBreak + 1);
		if (toMove.length) {
			let movedCount = 0;
			toMove.forEach((arr) => {
				plman.ClearPlaylistSelection(plsIdx);
				plman.SetPlaylistSelection(plsIdx, arr, true);
				plman.MovePlaylistSelection(plsIdx, toPlsPos - arr.at(0) + movedCount);
				movedCount += arr.length;
			});
			range(toPlsPos, toPlsPos + movedCount - 1, 1).forEach((i) => toSel.push(i));
		}
	}
	plman.ClearPlaylistSelection(plsIdx);
	plman.SetPlaylistSelection(plsIdx, toSel, true);
	if (bScroll) {
		plman.ActivePlaylist = plsIdx;
		plman.SetPlaylistFocusItem(plman.ActivePlaylist, toSel[0]);
		plman.EnsurePlaylistItemVisible(plman.ActivePlaylist, toSel[0]);
	}
	return toSel;
}