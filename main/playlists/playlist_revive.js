'use strict';
//20/05/24

/*
	Playlist Revive
	Alternative to foo_playlist_revive.
	Playlist Revive makes dead items in a playlist alive again by replacing them with the matching ones in media library.
	A handy utility for those who often move or rename their media files/folders.

	Matching:
		- Audio MD5 (Exact Match)
		- Title + Length + Size (Exact Match)
		- Tags (Similarity)

	Usage:
		- Select the tracks in the relevant playlist.
		- Apply script (using a button, menu entry, main menu SMP, etc. associated to it).

 */

include('..\\..\\helpers\\helpers_xxx.js');
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
include('..\\..\\helpers\\helpers_xxx_levenshtein.js');
/* global similarity:readable */
include('..\\..\\helpers\\helpers_xxx_tags.js');
/* global getHandleListTagsV2:readable, queryCombinations:readable, queryJoin:readable */

function playlistRevive({
	playlist = plman.ActivePlaylist, // Set to -1 to create a clone of selItems and output the revived list
	selItems = playlist !== -1 ? plman.GetPlaylistItems(playlist) : null,
	simThreshold = 1, // 1 only allows exact matches, lower allows some tag differences, but at least the main tag must be the same!
	bFindAlternative = false,
	bSimulate = false,
	bReportAllMatches = false,
	bSilent = false, // Probably should be false if processing only a HandleList!
} = {}) {
	if (typeof selItems === 'undefined' || selItems === null || selItems.Count === 0) {
		return null;
	}
	if (playlist === -1 && selItems) { selItems = selItems.Clone(); } // Don't edit original handleList

	let bLockedPls = false;
	if (playlist !== -1) {
		const locks = plman.GetPlaylistLockedActions(playlist);
		if (plman.IsAutoPlaylist(playlist) || locks.includes('RemoveItems') || locks.includes('AddItems')) { bLockedPls = true; bSimulate = true; }
	}

	let cache = new Set();
	const streamRegEx = /^file:\/\//i;

	// Filter items which already exist
	let items = new FbMetadbHandleList();
	selItems.Convert().forEach((handle) => {
		if (cache.has(handle.RawPath)) { return; }
		if (utils.FileExists(handle.Path)) { cache.add(handle.RawPath); return; }
		if (!streamRegEx.test(handle.RawPath)) { cache.add(handle.RawPath); return; } // Exclude streams and title-only tracks
		items.Insert(items.Count, handle);
	});
	if (!bSilent) {
		console.log('Found ' + items.Count + ' dead item(s) on ' + (plman.ActivePlaylist === playlist ? 'active' : '') + ' playlist: ' + plman.GetPlaylistName(playlist));
	}
	if (!items.Count) { return; }
	// Filter library with items with same tags
	// First tag is considered the main one -> Exact Match: first tag + length + size OR first tag is a requisite to match by similarity
	// The other tags are considered crc checks -> Exact Match: any crc tag is matched. Otherwise, continue checking the other tags (See above).
	const tagsToCheck = ['TITLE', 'AUDIOMD5', 'MD5', 'ACOUSTID_ID', 'MUSICBRAINZ_TRACKID', '%DIRECTORYNAME%', '%FILENAME%', (bFindAlternative || simThreshold < 1) ? '"$directory(%PATH%,2)"' : null].filter(Boolean);
	const tags = getHandleListTagsV2(items, tagsToCheck.map((tag) => { return tag.replace(/(^%)|(%$)/g, ''); }), { splitBy: null });
	if (tags === null || Object.prototype.toString.call(tags) !== '[object Array]' || tags.length === null || tags.length === 0) { return; }
	let queryArr = [];
	tagsToCheck.forEach((tagName, index) => {
		const values = new Set();
		const tagsArr = tags[index].filter(String).filter((arr) => {
			return !arr.every((tag) => {
				if (values.has(tag)) { return true; }
				else { values.add(tag); return false; }
			});
		}).flat();
		queryArr.push(tagsArr.length // Don't report missing tags for items without tags...
			? queryCombinations(tagsArr, tagName, 'OR')
			: ''
		);
	});
	// instead of using this, which would combine the different tags too
	// queryJoin(queryCombinations(tags, tagsToCheck, 'OR', 'OR'), 'OR');
	const query = queryJoin(queryArr.filter(Boolean), 'OR');
	if (!bSilent && bSimulate) { console.log('Filtered library by: ' + query); }
	try { fb.GetQueryItems(fb.GetLibraryItems(), query); } // Sanity check
	catch (e) { fb.ShowPopupMessage('Query not valid. Check query:\n' + query); return; }
	const libraryItems = fb.GetQueryItems(fb.GetLibraryItems(), query);
	const tagsLibrary = getHandleListTagsV2(libraryItems, tagsToCheck.slice(0, 5), { splitBy: null });  // discard path related tags
	const libraryItemsArr = libraryItems.Convert();
	// Find coincidences in library
	// Checks all tags from reference track and compares to all tags from library tracks that passed the filter
	// All tracks that pass the threshold are considered as alternatives, and sorted by similarity
	let alternatives = new Map();
	items.Convert().forEach((handle, index) => {
		let alternativesSet = new Set();
		let alternativesObj = []; // {idx: , simil: , bExact: }
		if (utils.IsFile(handle.Path)) { return; }
		const info = handle.GetFileInfo();
		if (!info || !info.MetaCount) { // When the old item has already been deleted from cache, no tags can be retrieved, compare filenames
			if (simThreshold === 1) { return; } // only items with same path would pass and if the path is the same, then it's not a dead item.
			libraryItemsArr.forEach((handleLibr, indexLibr) => {
				if (!alternativesSet.has(indexLibr)) {
					const path = handle.Path.toLowerCase(), pathLibr = handleLibr.Path.toLowerCase();
					const dir = path.split('\\').slice(-2)[0], dirLibr = pathLibr.split('\\').slice(-2)[0];
					const file = path.split('\\').slice(-1)[0], fileLibr = pathLibr.split('\\').slice(-1)[0];
					const pathSim = similarity(path, pathLibr);
					const dirSim = similarity(dir, dirLibr);
					const fileSim = similarity(file, fileLibr);
					let score = 0;
					if (dirSim >= 0.90 && fileSim >= 0.6) {
						const trackNum = file.match(/\d+ *- */);
						const trackNumLibr = fileLibr.match(/\d+ *- */);
						if (trackNum && trackNum.length && trackNumLibr && trackNumLibr.length) {
							if (trackNum[0] === trackNumLibr[0]) { score = Math.round((dirSim * 0.75 + fileSim * 0.25) * 100); }
						} else { score = Math.round((dirSim * 0.75 + fileSim * 0.25) * 100); }
					}
					else if (fileSim >= 0.90 && dirSim >= 0.60) { score = Math.round((dirSim * 0.25 + fileSim * 0.75) * 100); }
					else if (pathSim >= 0.95) { score = Math.round(pathSim * 100); }
					if (score >= simThreshold) {
						alternativesSet.add(indexLibr);
						alternativesObj.push({ idx: indexLibr, simil: score, bExact: false });
					} else if (bFindAlternative) {
						const trackNum = RegExp(/\d+ *- */).exec(file);
						const trackNumLibr = RegExp(/\d+ *- */).exec(fileLibr);
						const fileName = file.replace(String(trackNum), '');
						const fileNameLibr = fileLibr.replace(String(trackNumLibr), '');
						if (fileName === fileNameLibr) {
							alternativesSet.add(indexLibr);
							alternativesObj.push({ idx: indexLibr, simil: score, bExact: false });
						}
					}
				}
			});
		} else {
			let numTags = 0;
			for (let i = 0; i < info.MetaCount; i++) { numTags += info.MetaValueCount(i); }
			let bExact = false;
			// Check for MD5 exact matches
			libraryItemsArr.forEach((handleLibr, indexLibr) => {
				if (bExact) { return; } // No need to continue then
				const infoLibr = handleLibr.GetFileInfo();
				if (!infoLibr) { return; }
				// With same MD5 info, it's an exact match
				const md5Idx = info.InfoFind('MD5'), md5LibrIdx = infoLibr.InfoFind('MD5');
				if (md5Idx !== -1 && md5LibrIdx !== -1 && info.InfoValue(md5Idx) === infoLibr.InfoValue(md5LibrIdx)) { bExact = true; }
				// With same AUDIOMD5, MD5 tag, it's an exact match too
				let tag, tagLibr;
				for (let i = 1; i <= 2; i++) {
					tag = tags[i][index][0];
					tagLibr = tagsLibrary[i][indexLibr][0];
					if (tag.length && tagLibr.length && tag === tagLibr) { bExact = true; break; }
				}
				if (bExact && !alternativesSet.has(indexLibr)) {
					alternativesSet.add(indexLibr);
					alternativesObj.push({ idx: indexLibr, simil: 100, bExact });
				}
			});
			// Check for title + length + fileSize
			!bExact && libraryItemsArr.forEach((handleLibr, indexLibr) => {
				if (bExact) { return; } // No need to continue then
				if (new Set(tags[0][index]).intersectionSize(new Set(tagsLibrary[0][indexLibr]))) { // Instead of checking equality, tracks may have more than one title (?)
					if (handle.Length === handleLibr.Length && handle.FileSize === handleLibr.FileSize) { bExact = true; }  // may have changed nothing, being exact match
				}
				if (bExact && !alternativesSet.has(indexLibr)) {
					alternativesSet.add(indexLibr);
					alternativesObj.push({ idx: indexLibr, simil: 100, bExact });
				}
			});
			// Check for ACOUSTID_ID
			!bExact && libraryItemsArr.forEach((handleLibr, indexLibr) => {
				if (bExact) { return; } // No need to continue then
				const tag = tags[3][index][0], tagLibr = tagsLibrary[3][indexLibr][0];
				if (tag.length && tagLibr.length && tag === tagLibr) { bExact = true; }
				if (bExact && !alternativesSet.has(indexLibr)) {
					alternativesSet.add(indexLibr);
					alternativesObj.push({ idx: indexLibr, simil: 100, bExact });
				}
			});
			// Check for MUSICBRAINZ_TRACKID
			!bExact && libraryItemsArr.forEach((handleLibr, indexLibr) => {
				if (bExact) { return; } // No need to continue then
				const tag = tags[4][index][0], tagLibr = tagsLibrary[4][indexLibr][0];
				if (tag.length && tagLibr.length && tag === tagLibr) { bExact = true; }
				if (bExact && !alternativesSet.has(indexLibr)) {
					alternativesSet.add(indexLibr);
					alternativesObj.push({ idx: indexLibr, simil: 100, bExact });
				}
			});
			// Finally check tags for similarity
			!bExact && libraryItemsArr.forEach((handleLibr, indexLibr) => {
				const infoLibr = handleLibr.GetFileInfo();
				if (!infoLibr) { return; }
				let count = 0;
				if (new Set(tags[0][index]).intersectionSize(new Set(tagsLibrary[0][indexLibr]))) { // Instead of checking equality, tracks may have more than one title (?)
					if (handle.Length === handleLibr.Length) { count++; } // Bonus score if it changed tags and thus size but length is the same
					for (let i = 0; i < info.MetaCount; i++) {
						if (numTags === count) { break; }
						for (let j = 0; j < infoLibr.MetaCount; j++) {
							if (numTags === count) { break; }
							const numVal = info.MetaValueCount(i);
							const numValLibr = infoLibr.MetaValueCount(j);
							for (let ii = 0; ii < numVal; ii++) {
								for (let jj = 0; jj < numValLibr; jj++) {
									if (info.MetaValue(i, ii) === infoLibr.MetaValue(j, jj)) {
										count++;
										break;
									}
								}
							}
						}
					}
				}
				if (isFinite(numTags) && numTags !== 0 && count / numTags >= simThreshold && !alternativesSet.has(indexLibr)) {
					alternativesSet.add(indexLibr);
					alternativesObj.push({ idx: indexLibr, simil: Math.round(count / numTags * 100), bExact });
				}
			});
		}
		if (alternativesSet.size !== 0) {
			alternativesObj.sort((a, b) => b.simil - a.simil);
			alternatives.set(index, alternativesObj);
		}
	});
	if (!bSilent) { console.log('Found ' + alternatives.size + ' alternative(s) on active playlist'); }
	if (alternatives.size !== 0) {
		let bOverHundred = false;
		let bExact = false;
		let bDeadLibrary = false;
		// Process the alternatives
		alternatives.forEach((newHandleIdx, oldHandleIdx) => {
			const oldHandle = items[oldHandleIdx];
			const newHandleIdxBest = newHandleIdx.find((i) => utils.FileExists(libraryItemsArr[i.idx].Path));
			if (newHandleIdxBest !== newHandleIdx[0]) {
				if (!bSilent) { console.log(oldHandle.Path + '   ---->   \n                  ' + libraryItemsArr[newHandleIdx[0].idx].Path + '\n                  Warning: Best match on library is also a dead item. Rescan your library.'); }
				bDeadLibrary = true;
				return;
			}
			const newHandleBest = libraryItemsArr[newHandleIdxBest.idx];
			const idx = selItems.Find(oldHandle);
			if (!bSimulate || playlist !== -1 && selItems) { // Remove old items and insert new ones
				selItems.RemoveById(idx);
				selItems.Insert(idx, newHandleBest); // Always use the most similar item
				if (newHandleIdxBest.simil > 100) { bOverHundred = true; }
				if (newHandleIdxBest.bExact) { bExact = true; }
				if (!bSilent) { console.log(oldHandle.Path + '   --(' + (newHandleIdxBest.bExact ? 'Exact Match' : newHandleIdxBest.simil + '% ') + ')-->   \n                  ' + newHandleBest.Path); }
			} else { // Just console log
				if (bReportAllMatches) { // NOSONAR
					newHandleIdx.forEach((obj) => {
						if (obj.simil > 100) { bOverHundred = true; }
						if (obj.bExact) { bExact = true; }
						if (!bSilent) { console.log(oldHandle.Path + '   --(' + (obj.bExact ? 'Exact Match' : obj.simil + '% ') + ')-->   \n                  ' + libraryItemsArr[obj.idx].Path); }
					});
				} else {
					if (newHandleIdxBest.simil > 100) { bOverHundred = true; }
					if (newHandleIdxBest.bExact) { bExact = true; }
					if (!bSilent) { console.log(oldHandle.Path + '   --(' + (newHandleIdxBest.bExact ? 'Exact Match' : newHandleIdxBest.simil + '% ') + ')-->   \n                  ' + newHandleBest.Path); }
				}
			}
		});
		// Extra info
		if (!bSilent) {
			if (bDeadLibrary) {
				console.popup('There are dead items in your library. Re-scan it.', 'Playlist revive');
			}
			if (bLockedPls) {
				console.popup('There are dead items on a locked playlist:\n                  ' + plman.GetPlaylistName(playlist) + ' (locked by ' + (plman.GetPlaylistLockName(playlist) || '?') + ')', 'Playlist revive', true, false);
			}
			if (bOverHundred) {
				console.log('Tracks with a similarity value over 100% have been found. It\'s not an error, but an indicator that the new track matches all tags and has new ones compared to the dead one');
			}
			if (bExact) {
				console.log('Exact matches have been found. That means the tracks have the same Audio MD5, Title + Length + File Size, AcoustID or MBID.');
			}
		}
		// Remove all handles and insert new ones
		if (!bSimulate && playlist !== -1) {
			plman.UndoBackup(playlist);
			if (selItems.Count !== plman.PlaylistItemCount(playlist)) { // When selecting only a portion, replace selection and left the rest untouched
				const listItems = plman.GetPlaylistItems(playlist);
				let selectedIdx = [];
				listItems.Convert().forEach((handle, idx) => {
					if (plman.IsPlaylistItemSelected(playlist, idx)) {
						items.Convert().forEach((handleDead, idxDead) => {
							if (handle.RawPath === handleDead.RawPath) {
								if (alternatives.has(idxDead)) {
									listItems.RemoveById(idx);
									listItems.Insert(idx, libraryItemsArr[alternatives.get(idxDead)[0].idx]);
								}
							}
						});
						selectedIdx.push(idx);
					}
				});
				plman.ClearPlaylist(playlist);
				plman.InsertPlaylistItems(playlist, 0, listItems);
				plman.SetPlaylistSelection(playlist, selectedIdx, true);
				plman.SetPlaylistFocusItem(plman.ActivePlaylist, selectedIdx[selectedIdx.length - 1]);
			} else { 	// Just replace entire playlist
				plman.ClearPlaylist(playlist);
				plman.InsertPlaylistItems(playlist, 0, selItems);
			}
		}
	}
	if (!bSilent) { fb.ShowConsole(); }
	return selItems;
}

function findDeadItems() {
	let deadItems = [];
	let cache = new Set();
	const streamRegEx = /^file:\/\//i;
	for (let i = 0; i < plman.PlaylistCount; i++) {
		const selItems = plman.GetPlaylistItems(i);
		let count = 0;
		selItems.Convert().forEach((handle) => {
			if (cache.has(handle.RawPath)) { return; }
			if (utils.IsFile(handle.Path)) { cache.add(handle.RawPath); return; }
			if (!streamRegEx.test(handle.RawPath)) { cache.add(handle.RawPath); return; } // Exclude streams and title-only tracks
			count++;
		});
		if (count) { deadItems.push({ name: plman.GetPlaylistName(i), idx: i, items: count }); }
	}
	if (deadItems.length) {
		const header = 'Found playlist(s) with dead items:';
		console.log(header); // DEBUG
		let list = '';
		deadItems.forEach((playlistObj) => {
			list += playlistObj.name + ': ' + playlistObj.items + '\n';
			console.log(playlistObj.name + ': ' + playlistObj.items); // DEBUG
		});
		fb.ShowPopupMessage(header + '\n' + list, 'Dead Playlists');
	} else {
		const header = 'No playlist found with dead items.';
		fb.ShowPopupMessage(header, 'Dead Playlists');
	}
	return deadItems;
}

/* exported selectDeadItems */
function selectDeadItems(playlistIndex, bUpdateUi = true) {
	if (playlistIndex === -1 || playlistIndex >= plman.PlaylistCount) { return; }
	plman.ClearPlaylistSelection(playlistIndex);
	let deadItems = [];
	let cache = new Set();
	const streamRegEx = /^file:\/\//i;
	// Also checks AutoPlaylists, since dead items may be on library
	const selItems = plman.GetPlaylistItems(playlistIndex);
	selItems.Convert().forEach((handle, idx) => {
		if (cache.has(handle.RawPath)) { return; }
		if (utils.IsFile(handle.Path)) { cache.add(handle.RawPath); return; }
		if (!streamRegEx.test(handle.RawPath)) { cache.add(handle.RawPath); return; } // Exclude streams and title-only tracks
		deadItems.push({ handle, idx });
	});
	if (bUpdateUi && deadItems.length) {
		plman.ActivePlaylist = playlistIndex;
		plman.SetPlaylistSelection(playlistIndex, deadItems.map((_) => _.idx), true);
		plman.SetPlaylistFocusItem(playlistIndex, deadItems[0].idx);
	}
	return deadItems;
}

/* exported playlistReviveAll */
function playlistReviveAll() {
	const deadItems = findDeadItems();
	if (deadItems.length) {
		deadItems.forEach((playlistObj) => {
			if (playlistObj.name === plman.GetPlaylistName(playlistObj.idx)) { // Safety check
				playlistRevive({ playlist: playlistObj.idx, selItems: plman.GetPlaylistItems(playlistObj.idx), simThreshold: 1 });
			}
		});
	}
}