'use strict';
//30/12/23

/*
  Meant to be called by name on json files or other external tools to limit eval usage.
  Playlist Manager:
	- bOverwrite: when is true, new value will replace the current tag in any case.
	- bMultiple: when is true, new value will be added to the current tag values (no overwriting it).
	- Both false: new value is only added if tag has not been set before.
*/

/* exported funcDict */

const funcDict = {
	todayDate: function todayDate() {
		let today = new Date();
		let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
		let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
		return { value: date + ' ' + time, bOverWrite: false, bMultiple: false };
	},
	playlistName: function playlistName(pls) {
		return { value: [pls.name], bOverWrite: true, bMultiple: false };
	},
	playlistCategory: function playlistCategory(pls) {
		return { value: [pls.category], bOverWrite: true, bMultiple: false };
	},
	playlistTags: function playlistTags(pls) {
		return { value: pls.tags.slice(), bOverWrite: true, bMultiple: false };
	},
	playlistMBID: function playlistMBID(pls) {
		return { value: [pls.playlist_mbid], bOverWrite: true, bMultiple: false };
	},
	playlistNameMult: function playlistNameMult(pls) {
		return { value: [pls.name], bOverWrite: false, bMultiple: true };
	},
	playlistCategoryMult: function playlistCategoryMult(pls) {
		return { value: [pls.category], bOverWrite: false, bMultiple: true };
	},
	playlistTagsMult: function playlistTagsMult(pls) {
		return { value: pls.tags.slice(), bOverWrite: false, bMultiple: true };
	},
	playlistMBIDMult: function playlistMBIDMult(pls) {
		return { value: [pls.playlist_mbid], bOverWrite: false, bMultiple: true };
	}
};