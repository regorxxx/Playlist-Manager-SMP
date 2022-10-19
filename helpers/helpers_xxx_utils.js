'use strict';
//19/10/21

/*
  Meant to be called by name on json files or other external tools to limit eval usage.
*/

const funcDict = {
	todayDate: function todayDate() {
		let today = new Date();
		let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
		let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
		return date + ' ' + time;
	},
	playlistName: function playlistName(pls) {
		return pls.name;
	},
	playlistCategory: function playlistCategory(pls) {
		return pls.category;
	},
	playlistTags: function playlistTags(pls) {
		return pls.tags.join(',');
	},
	playlistMBID: function playlistMBID(pls) {
		return pls.playlist_mbid;
	}
};





