'use strict';
//07/10/21

include('helpers_xxx_prototypes.js');
include('helpers_xxx_file.js');

/* 
	Playlist manipulation 
*/

// Outputs indexes of all playlists with that name
function playlistCountNoLocked(type = []) {
	const playlistsNum = plman.PlaylistCount;
	const bAll = type.length ? true : false;
	let count = 0;
	for (let i = 0; i < playlistsNum; i++) {
		const lockActions = plman.GetPlaylistLockedActions(i);
		if (bAll && lockActions.length) {count++;}
		else if (!bAll && new Set(lockActions).isSuperset(new Set(type))) {count++;}
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
		start = sign < 0 && !start ?  plman.PlaylistItemCount(playlistIndex) - 1 : start;
		const selection = range(start, start + sign * (Math.abs(nTracks) - 1), sign);
        plman.SetPlaylistSelection(playlistIndex, selection, true);
        plman.RemovePlaylistSelection(playlistIndex, true);
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
	while (index !== -1){
		plman.RemovePlaylist(index);
		index = plman.FindPlaylist(name);
	}
}

// Clears all playlists with that name
function clearPlaylistByName(name) { 
	let index = getPlaylistIndexArray(name);
	if (isArrayNumbers(index)) {
		for (let i of index){
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
	return !(names.size === count);
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
	}
	if (plman.PlaylistItemCount(plman.ActivePlaylist)) {
		plman.UndoBackup(plman.ActivePlaylist);
		plman.ClearPlaylist(plman.ActivePlaylist);
	}
	// Create playlist
	console.log('Final selection: ' +  handleList.Count  + ' tracks');
	plman.InsertPlaylistItems(plman.ActivePlaylist, 0, handleList);
	return handleList;
}