'use strict';
//03/09/26

/* global removeEventListenerSelf:readable */

if (typeof addEventListener !== 'undefined' && typeof removeEventListenerSelf !== 'undefined') {
	/*
		Plman
	*/
	const playbackHistory = [];
	const addToPlaybackHistory = (handle) => {
		const pl = plman.GetPlayingItemLocation();
		const item = {
			handle,
			idx: pl.IsValid ? pl.PlaylistItemIndex : -1,
			plsIdx: pl.IsValid ? pl.PlaylistIndex : -1,
			plsName: pl.IsValid && pl.PlaylistIndex !== -1 ? plman.GetPlaylistName(pl.PlaylistIndex) : null,
			plsGUID: pl.IsValid && pl.PlaylistIndex !== -1 && pl.plsIdx < plman.PlaylistIndex ? plman.GetGUID(pl.PlaylistIndex) : null
		};
		if (playbackHistory.unshift(item) > 10) { playbackHistory.pop(); }
	};

	addEventListener('on_playback_new_track', addToPlaybackHistory);

	fb.GetPrevPlaying = (idx = fb.IsPlaying ? 1 : 0) => {
		if (typeof idx !== 'number' || idx < 0) { idx = 0; }
		const prev = playbackHistory[idx];
		if (prev) { // Refresh all data preferring old matches
			if (prev.plsGUID) {
				if (prev.plsIdx === -1 || prev.plsIdx > plman.PlaylistCount) { prev.plsIdx = -1; }
				if (prev.plsIdx === -1 || plman.GetGUID(prev.plsIdx) !== prev.plsGUID) { prev.plsIdx = plman.FindByGUID(prev.plsGUID); }
				if (prev.plsIdx !== -1) { prev.plsName = plman.GetPlaylistName(prev.plsIdx); };
			} else if (plman.GetPlaylistName(prev.plsIdx) !== prev.plsName) {
				prev.plsIdx = plman.FindPlaylist(prev.plsName);
			}
			if (prev.plsIdx !== -1) {
				const plsItems = plman.GetPlaylistItems(prev.plsIdx).Convert();
				if (plsItems[idx] !== prev.handle) {
					let i = 0;
					for (let handle of plsItems) {
						if (handle.Compare(prev.handle)) { prev.idx = i; break; }
						i++;
					}
				}
			}
		}
		return prev || null;
	};

	if (fb.IsPlaying) { addToPlaybackHistory(fb.GetNowPlaying()); }

	/*
		Utils
	*/

	if (utils.RunCmdAsync) {
		utils.RunCmdAsyncV2 = function () {
			let id;
			const prom = new Promise((resolve, reject) => {
				addEventListener('on_run_cmd_async_done', function (taskId, success, exitCode, stdout, stderr) {
					if (taskId === id) {
						if (success) { resolve(stdout); }
						else { reject(stderr); }
					}
				});
			});
			id = utils.RunCmdAsync(...arguments);
			return prom;
		};
	}

	if (utils.GetFolderSizeAsync) {
		utils.GetFolderSizeAsyncV2 = function () {
			let id;
			const prom = new Promise((resolve, reject) => {
				addEventListener('on_get_folder_size_done', (taskId, success, size, errorText) => {
					if (taskId === id) {
						if (success) { resolve(size); }
						else { reject(errorText); }
					}
				});
			});
			id = utils.GetFolderSizeAsync(...arguments);
			return prom;
		};
	}

}