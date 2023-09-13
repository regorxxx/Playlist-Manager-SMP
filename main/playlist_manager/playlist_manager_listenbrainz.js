'use strict';
//13/09/23

include('..\\..\\helpers\\helpers_xxx_basic_js.js');
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
include('..\\..\\helpers\\helpers_xxx_tags.js');
include('..\\..\\helpers\\helpers_xxx_web.js');
include('..\\..\\helpers\\helpers_xxx_levenshtein.js');
const SimpleCrypto = require('..\\helpers-external\\SimpleCrypto-js\\SimpleCrypto.min');

const listenBrainz = {
	regEx: /^(https:\/\/(listenbrainz|musicbrainz).org\/)|(recording)|(playlist)|(artist)|\//g,
	bProfile: false,
	cache: {
		user: new Map(),
		services: new Map([['global', ['spotify']]]),
		similarUsers: new Map(),
		following: new Map(),
		key: null,
	},
	algorithm: {
		retrieveSimilarArtists: {
			v1: 'session_based_days_9000_session_300_contribution_5_threshold_15_limit_50_skip_30',
			v2: 'session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30',
		},
		retrieveSimilarRecordings: {
			v1: 'session_based_days_9000_session_300_contribution_5_threshold_15_limit_50_skip_30',
		},
	},
	// API constants
	// https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#constants
	// https://github.com/metabrainz/listenbrainz-server/blob/master/listenbrainz/webserver/views/api_tools.py
	MAX_ITEMS_PER_GET: 100,
	MAX_LISTENS_PER_REQUEST: 1000,
	DEFAULT_ITEMS_PER_GET: 25
};

/*
	Helpers
*/
listenBrainz.getMBIDs = async function getMBIDs(handleList, token, bLookupMBIDs = true) {
	const tags = getTagsValuesV3(handleList, ['MUSICBRAINZ_TRACKID'], true).flat();
	// Try to retrieve missing MBIDs
	const missingIds = tags.multiIndexOf('');
	const missingCount = missingIds.length;
	if (bLookupMBIDs && missingCount) {
		const missingHandleList = new FbMetadbHandleList(missingIds.map((idx) => {return handleList[idx];}));
		const missingMBIDs = await this.lookupMBIDs(missingHandleList, token);
		if (missingMBIDs.length) {
			missingMBIDs.forEach((mbid, i) => {
				const idx = missingIds[i];
				tags[idx] = mbid;
			});
		}
	}
	return tags;
};

listenBrainz.getArtistMBIDs = async function getArtistMBIDs(handleList, token, bLookupMBIDs = true, bAlbumArtist = true, bRetry = true) {
	const tags = getTagsValuesV3(handleList, [bAlbumArtist ? 'MUSICBRAINZ_ALBUMARTISTID' : 'MUSICBRAINZ_ARTISTID'], true).flat();
	// Try to retrieve missing MBIDs
	const missingIds = tags.multiIndexOf('');
	const missingCount = missingIds.length;
	if (bLookupMBIDs && missingCount) {
		const missingHandleList = new FbMetadbHandleList(missingIds.map((idx) => {return handleList[idx];}));
		const missingMBIDs = await this.lookupArtistMBIDs(missingHandleList, token);
		if (missingMBIDs.length) {
			missingMBIDs.forEach((mbid, i) => {
				const idx = missingIds[i];
				tags[idx] = mbid;
			});
		}
	}
	if (tags.length === 1 && bRetry) {
		// https://musicbrainz.org/doc/Style/Unknown_and_untitled/Special_purpose_artist
		// https://musicbrainz.org/artist/4e46dd54-81a6-4a75-a666-d0e447861e3f wrong VA
		const specialIds = new Set(['f731ccc4-e22a-43af-a747-64213329e088', '33cf029c-63b0-41a0-9855-be2a3665fb3b', '314e1c25-dde7-4e4d-b2f4-0a7b9f7c56dc', 'eec63d3c-3b81-4ad4-b1e4-7c147d4d2b61', '9be7f096-97ec-4615-8957-8d40b5dcbc41', '125ec42a-7229-4250-afc5-e057484327fe', '89ad4ac3-39f7-470e-963a-56509c546377', '4e46dd54-81a6-4a75-a666-d0e447861e3f'])
		if (specialIds.has(tags[0])) {
			return this.getArtistMBIDs(handleList, token, bLookupMBIDs, !bAlbumArtist, false);
		}
	}
	return tags;
};

listenBrainz.joinArtistMBIDs = async function joinArtistMBIDs(artists, MBIds, token, bInverse = false) {
	const artistCount = artists.length;
	const MBIdsCount = MBIds.length;
	const results = new Array(MBIdsCount).fill({});
	const data = new Array(MBIdsCount).fill({});
	data.forEach((_, i, thisArr) => {
		thisArr[i] = {};
		results[i] = {artists: []};
		thisArr[i]['[artist_mbid]'] = results[i].mbid = MBIds[i];
	});
	return send({
		method: 'POST', 
		URL: 'https://datasets.listenbrainz.org/artist-lookup/json',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve); // [{artist_mbid, artist_name, artist_sortname, type}, ...]
				if (response) {
					response.forEach((found) => {
						const result = results.find((m) => m.mbid === found.artist_mbid);
						for (let i = 0; i < artistCount; i++) {
							const artist = artists[i];
							if (similarity(artist, found.artist_name) >= 0.90) {
								result.artists.push(artist);
							}
						}
					});
				}
			}
			return bInverse 
				? artists.map((artist) => {
						const obj = {artist, mbids: []};
						results.forEach((result) => {
							if (result.artists.indexOf(artist) !== -1) {
								obj.mbids.push(result.mbid);
							}
						});
						return obj;
					})
				: results;
		},
		(reject) => {
			console.log('joinArtistMBIDs: ' + reject.status + ' ' + reject.responseText);
			return results;
		}
	)
};

listenBrainz.consoleError = (message = 'Token can not be validated.') => {
	fb.ShowPopupMessage(
		message.trim() + ' Check console.\n\nSome possible errors:' + 
		'\n\t- 12029: Encrypted communication could not be established.' +
		'\n\t- 12007: Network error and/or non reachable server.' +
		'\n\t- 429: Too many requests on a short amount of time.' +
		'\n\t- 400: Only add max 100 recordings per call. (Bug at script level)' +
		'\n\t- 200: ListenBrainz Token not valid.'
		, window.Name
	);
};

/*
	Playlists
*/
// Post new playlist using the playlist file as reference and provides a new MBID
// Note posting multiple times the same playlist file will create different entities
// Use sync to edit already exported playlists
listenBrainz.exportPlaylist = async function exportPlaylist(pls /*{name, nameId, path, extension}*/, root = '', token, bLookupMBIDs = true) {
	if (!pls.path && !pls.extension || pls.extension && !pls.nameId || !pls.name) {console.log('exportPlaylist: no valid pls provided'); return Promise.resolve('');}
	const bUI = pls.extension === '.ui';
	// Create new playlist and check paths
	const handleList = !bUI ? getHandlesFromPlaylist(pls.path, root, true) : getHandleFromUIPlaylists([pls.nameId], false); // Omit not found
	const mbid = (await this.getMBIDs(handleList, token, bLookupMBIDs)).filter(Boolean);
	const missingCount = handleList.Count - mbid.length;
	if (missingCount) {console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted ' + missingCount + ' tracks on exporting');}
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
			console.log('exportPlaylist: ' + resolve);
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.playlist_mbid && response.playlist_mbid.length) {
					console.log('Playlist URL: ' + this.getPlaylistURL(response));
					return response.playlist_mbid;
				}
				return '';
			}
			return '';
		},
		(reject) => {
			console.log('exportPlaylist: ' + reject.status + ' ' + reject.responseText);
			return '';
		}
	);
};

// Delete all tracks on online playlist and then add all tracks again using the playlist file as reference
// Easier than single edits, etc.
listenBrainz.syncPlaylist = function syncPlaylist(pls /*{name, nameId, path, playlist_mbid}*/, root = '', token, bLookupMBIDs = true) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {console.log('syncPlaylist: no playlist_mbid provided'); return Promise.resolve('');}
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
			console.log('syncPlaylist: ' + resolve);
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.status === 'ok') {
					if (handleList.Count) {
						return this.addPlaylist(pls, handleList, void(0), token, bLookupMBIDs);
					} else {
						console.log('Playlist URL: ' + this.getPlaylistURL(pls));
						return pls.playlist_mbid;
					}
				}
				return '';
			}
			return '';
		},
		async (reject) => { // If the online playlist was already empty, let's simply add the new tracks
			console.log('syncPlaylist: ' + reject.status + ' ' + reject.responseText);
			if (reject.responseText.length) {
				const response = JSON.parse(reject.responseText);
				if (response.error === 'Failed to deleting recordings from the playlist. Please try again.') { // Playlist file was empty
					const jspf = await this.importPlaylist(pls, token);
					if (jspf.playlist.track.length === 0) {
						if (handleList.Count) {
							return this.addPlaylist(pls, handleList, void(0), token, bLookupMBIDs);
						} else {
							console.log('Playlist URL: ' + this.getPlaylistURL(pls));
							return pls.playlist_mbid;
						}
					}
				} else if (response.code === 404 && response.error === ('Cannot find playlist: ' + pls.playlist_mbid)) { // Playlist file had a MBID not found on server
					return this.exportPlaylist(pls, root, token);
				}
				return '';
			}
			return '';
		}
	);
};

/*{name, playlist_mbid}*/
// Add handleList to given online playlist
listenBrainz.addPlaylist = async function addPlaylist(pls, handleList, offset, token, bLookupMBIDs = true) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {console.log('addPlaylist: no playlist_mbid provided'); return Promise.resolve('');}
	if (!handleList || !handleList.Count) {console.log('addPlaylist: empty pls provided'); return Promise.resolve(pls.playlist_mbid);}
	const tags = getTagsValuesV3(handleList, ['MUSICBRAINZ_TRACKID'], true).flat();
	const mbid = (await this.getMBIDs(handleList, token, bLookupMBIDs)).filter(Boolean);
	const missingCount = handleList.Count - mbid.length;
	if (missingCount) {console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted ' + missingCount + ' tracks on exporting');}
	const track = mbid.map((tag) => {return {identifier: 'https://musicbrainz.org/recording/' + tag};});
	const addPlaylistSlice = (title, track, offset) => {
		const data = { // JSPF playlist with minimum data
			playlist: {
				extension: {
					'https://musicbrainz.org/doc/jspf#playlist': {
						'public': true
					}
				},
				title,
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
				console.log('addPlaylist: ' + resolve);
				if (resolve) {
					const response = JSON.parse(resolve);
					if (response.status === 'ok') {
						console.log('Playlist URL: ' + this.getPlaylistURL(pls));
						return pls.playlist_mbid;
					}
					return '';
				}
				return '';
			},
			(reject) => {
				console.log('addPlaylist: ' + reject.status + ' ' + reject.responseText);
				return '';
			}
		);
	};
	return new Promise(async (resolve, reject) => {
		let result;
		const num = track.length;
		for (let i = 0; i < num; i += 100) { // Add 100 tracks per call, server doesn't allow more
			console.log('addPlaylist: tracks ' + (i + 1) + ' to ' + ((i + 101) > num ? num : i + 101));
			result = await new Promise((res) => {
				setTimeout(async () => { // Limit rate to 30 ms per call
					res(await addPlaylistSlice(
						pls.name,
						track.slice(i, i + 100),
						i === 0 
							? offset 
							: typeof offset !== 'undefined'
								? offset + i
								: i
					));
				}, 30);
			});
		}
		if (result) {resolve(result);} else {reject('');}
	});
};

// Import playlist metadata and track list from online playlist
listenBrainz.importPlaylist = function importPlaylist(pls /*{playlist_mbid}*/, token) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {console.log('importPlaylist: no playlist_mbid provided'); return Promise.resolve(null);}
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/playlist/' + pls.playlist_mbid + '?fetch_metadata=true',
		requestHeader: [['Authorization', 'Token ' + token]],
		bypassCache: true
	}).then(
		(resolve) => {
			if (resolve) { // Ensure it matches the ID
				const jspf = JSON.parse(resolve);
				if (jspf && jspf.playlist && jspf.playlist.identifier && pls.playlist_mbid === jspf.playlist.identifier.replace(this.regEx, '')) {
					console.log('importPlaylist: ' + JSON.stringify({creator: jspf.playlist.creator, identifier: jspf.playlist.identifier, tracks: jspf.playlist.track.length}));
					Object.defineProperty(jspf.playlist, 'description', { // Remap description to annotation
						set: function (x) {this.annotation = x;},
						get: function () {return this.annotation;}
					});
					return jspf;
				}
			}
			console.log('importPlaylist: unknown error');
			return null;
		},
		(reject) => {
			console.log('importPlaylist: ' + reject.status + ' -> ' + reject.responseText);
			return null;
		}
	);
};

listenBrainz.importUserPlaylists = async function importUserPlaylists(user) {
	if (!checkLBToken()) {return false;}
	let bDone = false;
	const jsfpArr = await this.retrieveUserPlaylists(user, this.decryptToken({lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1]}));
	if (jsfpArr.length) {
		const delay = setInterval(delayAutoUpdate, list.autoUpdateDelayTimer);
		jsfpArr.forEach((jspf) => {
			const handleList = this.contentResolver(jspf);
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
				const playlist_mbid = jspf.playlist.identifier.replace(this.regEx, '');
				const author =  jspf.playlist.extension['https://musicbrainz.org/doc/jspf#playlist'].creator;
				const description = jspf.playlist.description;
				if (list.bAutoLoadTag) {oPlaylistTags.push('bAutoLoad');}
				if (list.bAutoLockTag) {oPlaylistTags.push('bAutoLock');}
				if (list.bMultMenuTag) {oPlaylistTags.push('bMultMenu');}
				if (list.bAutoCustomTag) {list.autoCustomTag.forEach((tag) => {if (! new Set(oPlaylistTags).has(tag)) {oPlaylistTags.push(tag);}});}
				bDone = savePlaylist({handleList, playlistPath, ext: list.playlistsExtension, playlistName, category, tags, playlist_mbid, author, description, useUUID, bBOM: list.bBOM});
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
};

listenBrainz.getPlaylistURL = function getPlaylistURL(pls /*{playlist_mbid}*/) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) {return null;}
	return ('https://listenbrainz.org/playlist/' + pls.playlist_mbid + '/');
};

/*
	Feedback
*/
listenBrainz.sendFeedback = async function sendFeedback(handleList, feedback = 'love', token, bLookupMBIDs = true, byMbid = false, bRetry = true) {
	const mbid = (byMbid ? handleList : (await this.getMBIDs(handleList, token, bLookupMBIDs))).filter(Boolean);
	const mbidLen = mbid.length;
	const missingCount = byMbid ? 0 : handleList.Count - mbidLen;
	if (missingCount) {console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted ' + missingCount + ' tracks while setting feedback');}
	const rate = 50;
	const retryMs = 500;
	let score = 0;
	switch (feedback.toLowerCase()) {
		case 'love': {score = 1; break;}
		case 'hate': {score = -1; break;}
		default : {score = 0; break;}
	}
	return Promise.serial(mbid, 
		(recording_mbid, i) => send({
			method: 'POST', 
			URL: 'https://api.listenbrainz.org/1/feedback/recording-feedback',
			requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
			body: JSON.stringify({"recording_mbid": recording_mbid, "score" : score})
		}).then(
			(resolve) => {
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
				if (!bRetry) {console.log('sendFeedback: ' + reject.status + ' ' + reject.responseText);}
				else {console.log('sendFeedback: Retrying request for ' + recording_mbid + ' to server on ' + retryMs + ' ms...');}
				return bRetry ? Promise.wait(retryMs).then(() => listenBrainz.sendFeedback([recording_mbid], feedback, token, bLookupMBIDs, true, false)) : false;
			}
		)
	, rate).then((results) => {
		if (results.length === 1 && !bRetry) {
			return Promise.wait(retryMs).then(() => results[0]);
		} else {
			const passed = results.filter(Boolean).length;
			const nError = mbidLen - passed;
			console.log('sendFeedback: ' + mbidLen + ' tracks' + (nError ? ' (' + nError + ' failed)' : ''));
			if (!missingCount && nError && !byMbid) {
				let report = ['List of failed tracks:'];
				results.forEach((result, i) => {
					if (!result) {report.push(handleList[i].RawPath);}
				});
				console.log(report.join('\n\t'));
			}
			return results;
		}
	}, (error) => {console.log(error.message); return false;});
}

listenBrainz.getFeedback = async function getFeedback(handleList, user, token, bLookupMBIDs = true, method = 'GET') {
	const mbid = await this.getMBIDs(handleList, token, bLookupMBIDs);
	const mbidSend = mbid.filter(Boolean);
	const missingCount = handleList.Count - mbidSend.length;
	if (missingCount) {console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted ' + missingCount + ' tracks while getting feedback');}
	if (mbidSend.Count > 70) {method = 'POST';}
	const noData = {created: null, recording_mbid: null, recording_msid: null, score: 0, track_metadata: null, user_id: user};
	return (method === 'POST' 
		? send({
			method: 'POST', 
			URL: 'https://api.listenbrainz.org/1/feedback/user/' + user + '/get-feedback-for-recordings',
			requestHeader: [['Authorization', 'Token ' + token]],
			body: JSON.stringify({recording_mbids: mbidSend.join(',')})
		})
		: send({ // 75 track limit
			method: 'GET',
			URL: 'https://api.listenbrainz.org/1/feedback/user/' + user + '/get-feedback-for-recordings?recording_mbids=' + mbid.join(','),
			requestHeader: [['Authorization', 'Token ' + token]],
			bypassCache: true
		})
	).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.hasOwnProperty('feedback')) {
					// Add null data to holes, so response respects input length
					const feedback = mbid.map((m) => {
						return {...noData, ...{recording_mbid: m || null}};
					});
					// And insert data, since it doesn't respect original sorting
					response.feedback.forEach((responseData) => {
						const idx = feedback.findIndex((data) => data.recording_mbid === responseData.recording_mbid);
						if (idx !== -1) {feedback[idx] = responseData;}
					});
					return feedback;
				}
				return [];
			}
			return [];
		},
		(reject) => {
			console.log('getFeedback: ' + reject.status + ' ' + reject.responseText);
			if (reject.status === 400 && new RegExp('No valid recording msid or recording mbid found').test(reject.responseText)) {
				return mbid.map((m) => {return {...noData};});
			}
			return [];
		}
	);
}

listenBrainz.getUserFeedback = async function getUserFeedback(user, params = {/*score, count, offset, metadata*/}, token, bPaginated = true) {
	if (bPaginated) {
		return paginatedFetch({
			URL: 'https://api.listenbrainz.org/1/feedback/user/' + user + '/get-feedback',
			queryParams: params,
			keys: ['feedback'],
			requestHeader: [['Authorization', 'Token ' + token]],
			increment: params.count,
		}).then(
			(response) => response,
			(reject) => {
				console.log('getFeedback: ' + reject);
				return [];
			}
		);
	} else {
		const queryParams = Object.keys(params).length ? '?' + Object.entries(params).map((pair) => {return pair[0] + '=' + pair[1];}).join('&') : '';
		return send({
			method: 'GET', 
			URL: 'https://api.listenbrainz.org/1/feedback/user/' + user + '/get-feedback' + queryParams,
			requestHeader: [['Authorization', 'Token ' + token]],
			bypassCache: true
		}).then(
			(resolve) => {
				if (resolve) {
					const response = JSON.parse(resolve);
					if (response.hasOwnProperty('feedback')) {
						return response.feedback;
					}
					return [];
				}
				return [];
			},
			(reject) => {
				console.log('getFeedback: ' + reject.status + ' ' + reject.responseText);
				return [];
			}
		);
	}
}

/*
	Tracks info
*/
listenBrainz.lookupTracks = function lookupTracks(handleList, token) {
	const count = handleList.Count;
	if (!handleList.Count) {console.log('lookupTracks: no tracks provided'); return Promise.resolve([]);}
	const [artist, title] = getTagsValuesV4(handleList, ['ARTIST', 'TITLE']);
	const data = new Array(count).fill({});
	data.forEach((_, i, thisArr) => {
		thisArr[i] = {};
		thisArr[i]['[artist_credit_name]'] = artist[i].join(', ');
		thisArr[i]['[recording_name]'] = title[i].join(', ');
	});
	return send({
		method: 'POST', 
		URL: 'https://labs.api.listenbrainz.org/mbid-mapping/json',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			if (resolve) { // Ensure it matches the ID
				const response  = JSON.parse(resolve);
				console.log('lookupTracks: ' + response.length + '/' + count + ' found items');
				return response; // Response may contain fewer items than original list
			}
			return []; 
		},
		(reject) => {
			console.log('lookupTracks: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
}

listenBrainz.lookupRecordingInfo = function lookupRecordingInfo(handleList, infoNames = ['recording_mbid'], token) {
	const allInfo = [
		'artist_credit_arg', 'artist_credit_id', 'artist_credit_name', 
		'artist_mbids', 'index', 'match_type', 'recording_arg', 'recording_mbid', 
		'recording_name', 'release_mbid', 'release_name', 'year'
	];
	if (!infoNames || !infoNames.length) {infoNames = allInfo;}
	return this.lookupTracks(handleList, token).then(
		(resolve) => {
			const info = {};
			infoNames.forEach((tag) => {info[tag] = new Array(handleList.Count).fill('');});
			if (resolve.length) {
				infoNames.forEach((tag) => {
					if (allInfo.indexOf(tag) !== -1) {
						resolve.forEach((obj, i) => {info[tag][obj.index] = obj[tag];});
					}
				});
			}
			return info; // Response may contain fewer items than original list
		},
		(reject) => {
			console.log('lookupMBIDs: ' + reject);
			return null;
		}
	);
}

listenBrainz.lookupMBIDs = function lookupMBIDs(handleList, token) { // Shorthand for lookupRecordingInfo when looking for 'recording_mbid'
	return this.lookupTracks(handleList, token).then(
		(resolve) => {
			if (resolve.length) {
				const MBIDs = new Array(handleList.Count).fill('');
				resolve.forEach((obj, i) => {MBIDs[obj.index] = obj.recording_mbid;});
				return MBIDs; // Response may contain fewer items than original list
			}
			return [];
		},
		(reject) => {
			console.log('lookupMBIDs: ' + reject);
			return [];
		}
	);
}

listenBrainz.lookupArtistMBIDs = function getArtistMBIDs(handleList, token) { // Shorthand for lookupRecordingInfo when looking for 'recording_mbid'
	return this.lookupTracks(handleList, token).then(
		(resolve) => {
			if (resolve.length) {
				const MBIDs = new Array(handleList.Count).fill('');
				resolve.forEach((obj, i) => {MBIDs[obj.index] = obj.artist_mbids;});
				return MBIDs; // Response may contain fewer items than original list
			}
			return [];
		},
		(reject) => {
			console.log('lookupArtistMBIDs: ' + reject);
			return [];
		}
	);
}

listenBrainz.lookupTracksByMBIDs = function lookupTracksByMBIDs(MBIds, token) {
	const count = MBIds.length;
	if (!count) {console.log('lookupTracks: no MBIds provided'); return Promise.resolve([]);}
	const data = new Array(count).fill({});
	data.forEach((_, i, thisArr) => {
		thisArr[i] = {};
		thisArr[i]['[recording_mbid]'] = MBIds[i];
	});
	return send({
		method: 'POST', 
		URL: 'https://labs.api.listenbrainz.org/recording-mbid-lookup/json',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			if (resolve) { // Ensure it matches the ID
				const response  = JSON.parse(resolve);
				console.log('lookupTracksByMBIDs: ' + response.length + '/' + count + ' found items');
				return response; // Response should contain same items than original list
			}
			return []; 
		},
		(reject) => {
			console.log('lookupTracksByMBIDs: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
}

// Check output with:
// if (infoNames.every((tag) => info.hasOwnProperty(tag))) {...}
listenBrainz.lookupRecordingInfoByMBIDs = function lookupRecordingInfoByMBIDs(MBIds, infoNames = ['recording_mbid', 'recording_name', 'artist_credit_name'], token) {
	const count = MBIds.length;
	if (!count) {console.log('lookupRecordingInfoByMBIDs: no MBIds provided'); return Promise.resolve({});}
	const allInfo = [
		'recording_mbid', 'recording_name', 'length', 'artist_credit_id', 
		'artist_credit_name', '[artist_credit_mbids]', 
		'canonical_recording_mbid', 'original_recording_mbid'
	];
	if (!infoNames || !infoNames.length) {infoNames = allInfo;}
	return this.lookupTracksByMBIDs(MBIds, token).then(
		(resolve) => {
			const info = {};
			infoNames.forEach((tag) => {info[tag] = new Array(count).fill('');});
			if (resolve.length) {
				infoNames.forEach((tag) => {
					if (allInfo.indexOf(tag) !== -1) {
						resolve.forEach((obj, i) => {
							info[tag][i] = obj[tag];
						});
					}
				});
			}
			return info; // Response should contain same items than original list
		},
		(reject) => {
			console.log('lookupRecordingInfoByMBIDs: ' + reject);
			return {};
		}
	);
}

/*
	Lookup recordings
*/

// To use along listenBrainz.retrieveSimilarArtists (unstable API)
listenBrainz.getRecordingsByTag = function getRecordingsByTag(tagsArr, token, bReleaseGroup = false) {
	const data = tagsArr.map((tag) => {return {"[tag]": tag, operator: 'and', threshold: '4'};}); // [{"[tag]": "rock", "operator": "and", "threshold": "4"}, ...]
	return send({
		method: 'POST', 
		URL: (bReleaseGroup ? 'https://datasets.listenbrainz.org/recording-from-rg-tag/json' : 'https://datasets.listenbrainz.org/recording-from-tag/json'),
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response) {
					console.log('getRecordingsByTag: ' + response.length + ' found items');
					return response; // [{recording_mbid}, ...]
				}
			}
			return []; 
		},
		(reject) => {
			console.log('getRecordingsByTag: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
}

/*
	Statistics
*/
listenBrainz.getTopRecordings = function getTopRecordings(user = 'sitewide', params = {/*count, offset, range*/}, token) {
	if (!user) {console.log('getTopRecordings: no user provided'); return Promise.resolve([]);}
	const queryParams = Object.keys(params).length ? '?' + Object.entries(params).map((pair) => {return pair[0] + '=' + pair[1];}).join('&') : '';
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/stats/' + (user.toLowerCase() === 'sitewide' ?  'sitewide' : 'user/' + user) + '/recordings' + queryParams,
		requestHeader: [['Authorization', 'Token ' + token]],
		bypassCache: true
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.hasOwnProperty('payload') && response.payload.hasOwnProperty('recordings')) {
					return response.payload.recordings; /* {artist_mbids: [], artist_name, caa_id, caa_release_mbid, listen_count, recording_mbid, release_mbid, release_name, track_name} */
				}
				return [];
			}
			return [];
		},
		(reject) => {
			console.log('getTopRecordings: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
}

listenBrainz.getRecommendedRecordings = function getRecommendedRecordings(user, params = {artist_type: 'top' /*count, offset*/}, token) {
	if (!user) {console.log('getRecommendedRecordings: no user provided'); return Promise.resolve([]);}
	const queryParams = Object.keys(params).length ? '?' + Object.entries(params).map((pair) => {return pair[0] + '=' + pair[1];}).join('&') : '';
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/cf/recommendation/user/'+ user + '/recording' + queryParams,
		requestHeader: [['Authorization', 'Token ' + token]],
		bypassCache: true
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.hasOwnProperty('payload') && response.payload.hasOwnProperty('mbids')) {
					return response.payload.mbids;
				}
				return [];
			}
			return [];
		},
		(reject) => {
			console.log('getRecommendedRecordings: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
}

listenBrainz.retrieveUserRecommendedPlaylistsNames = function retrieveUserRecommendedPlaylistsNames(user, params = {/*count, offset*/}, token) {
	if (!user) {console.log('retrieveUserRecommendedPlaylistsNames: no user provided'); return Promise.resolve([]);}
	const queryParams = Object.keys(params).length ? '?' + Object.entries(params).map((pair) => {return pair[0] + '=' + pair[1];}).join('&') : '';
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/user/'+ user + '/playlists/createdfor' + queryParams,
		requestHeader: [['Authorization', 'Token ' + token]],
		bypassCache: true
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.hasOwnProperty('playlists')) {
					return response.playlists;
				}
				return [];
			}
			return [];
		},
		(reject) => {
			console.log('retrieveUserRecommendedPlaylistsNames: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
}

// To use along listenBrainz.retrieveSimilarArtists (unstable API)
listenBrainz.getPopularRecordingsByArtist = function getPopularRecordingsByArtist(artist_mbids, token) {
	if (!artist_mbids || !artist_mbids.filter(Boolean).length) {console.log('getPopularRecordingsByArtist: no artist_mbids provided'); return Promise.resolve([]);}
	const data = artist_mbids.map((mbid) => {return {"[artist_mbid]": mbid};}); // [{"[artist_mbid]": "69ec6867-bda0-404b-bac4-338df8d73723"}, ...]
	return send({
		method: 'POST', 
		URL: 'https://datasets.listenbrainz.org/popular-recordings/json',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response) {
					console.log('getPopularRecordingsByArtist: ' + response.length + ' found items');
					return response; // [{artist_mbid, count, recording_mbid}, ...]
				}
			}
			return []; 
		},
		(reject) => {
			console.log('getPopularRecordingsByArtist: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
}

/*
	Similarity
*/
// Only default algorithms work
listenBrainz.retrieveSimilarArtists = function retrieveSimilarArtists(artistMbid, token, algorithm = 'v1') { // May add algorithm directly or by key
	if (!artistMbid || !artistMbid.length) {console.log('retrieveSimilarArtists: no artistMbid provided'); return Promise.resolve([]);}
	if (this.algorithm.retrieveSimilarArtists.hasOwnProperty(algorithm)) {algorithm = this.algorithm.retrieveSimilarArtists[algorithm];}
	const data = [{
		'artist_mbid': artistMbid,
		'algorithm': algorithm
	}];
	return send({
		method: 'POST', 
		URL: 'https://labs.api.listenbrainz.org/similar-artists/json',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			if (resolve) {
				const response = (JSON.parse(resolve) || Array(4))[3];
				if (response && response.hasOwnProperty('data')) {
					console.log('retrieveSimilarArtists: ' + response.data.length + ' found items');
					return response.data; // [{artist_mbid, comment, gender, name, reference_mbid, score, type}, ...]
				}
			}
			return []; 
		},
		(reject) => {
			console.log('retrieveSimilarArtists: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
}

// Only default algorithm works
listenBrainz.retrieveSimilarRecordings = function retrieveSimilarRecordings(recordingMBId, token, algorithm = 'v1') {
	if (!recordingMBId || !recordingMBId.length) {console.log('retrieveSimilarRecordings: no recordingMBId provided'); return Promise.resolve([]);}
	if (this.algorithm.retrieveSimilarRecordings.hasOwnProperty(algorithm)) {algorithm = this.algorithm.retrieveSimilarRecordings[algorithm];}
	const data = [{
		'recording_mbid': recordingMBId,
		'algorithm': algorithm
	}];
	return send({
		method: 'POST', 
		URL: 'https://labs.api.listenbrainz.org/similar-recordings/json',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			if (resolve) {
				const response = (JSON.parse(resolve) || Array(4))[3];
				if (response && response.hasOwnProperty('data')) {
					console.log('retrieveSimilarRecordings: ' + response.data.length + ' found items');
					return response.data; // [{recording_mbid, recording_name, artist_credit_name, [artist_credit_mbids], caa_id, caa_release_mbid, canonical_recording_mbid, score, reference_mbid}, ...]
				}
			}
			return []; 
		},
		(reject) => {
			console.log('retrieveSimilarRecordings: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
}

listenBrainz.retrieveSimilarUsers = function retrieveSimilarUsers(user, token, iThreshold = 0.7) {
	if (!user || !user.length || !token || !token.length) {console.log('retrieveSimilarUsers: no user/token provided'); return Promise.resolve([]);}
	const similar = this.cache.similarUsers.get(user);
	return similar
		? similar.filter((user) => user.similarity >= iThreshold)
		: send({
			method: 'GET', 
			URL: 'https://api.listenbrainz.org/1/user/' + user + '/similar-users',
			requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
			bypassCache: true
		}).then(
			(resolve) => {
				const response = JSON.parse(resolve);
				if (response && response.hasOwnProperty('payload')) {
					console.log('retrieveSimilarUsers: ' + user + ' -> ' + response.payload.length + ' similar users');
					this.cache.similarUsers.set(user, response.payload);
					return response.payload.filter((user) => user.similarity >= iThreshold); // [{user_name, similarity}]
					
				}
				return [];
			},
			(reject) => {
				console.log('retrieveSimilarUsers: ' + JSON.stringify(reject));
				return [];
			}
		);
};

/*
	Content resolver by MBID
*/
// Recommended filter: NOT (%RATING% EQUAL 1 OR %RATING% EQUAL 2) AND NOT (GENRE IS live OR STYLE IS live)
listenBrainz.contentResolver = function contentResolver(jspf, filter = '', sort = globQuery.remDuplBias, bOnlyMBID = false) {
	if (!jspf) {return null;}
	const profiler = this.bProfile ? new FbProfiler('listenBrainz.contentResolver') : null;
	// Query cache (Library)
	// Makes consecutive playlist loading by queries much faster (for ex. .xspf fuzzy matching)
	const queryCache = new Map(); // {Query: handleList}
	let handleArr = [];
	const notFound = [];
	let count = 0;
	const playlist = jspf.playlist;
	const rows = playlist.track;
	const rowsLength = rows.length;
	const lookupKeys = [
		{xspfKey: 'identifier', queryKey: 'MUSICBRAINZ_TRACKID'}, 
		{xspfKey: 'title', queryKey: 'TITLE'}, 
		{xspfKey: 'creator', queryKey: 'ALBUM ARTIST'},
		{xspfKey: 'creator', queryKey: 'ARTIST'}
	];
	const conditions = bOnlyMBID ? [['MUSICBRAINZ_TRACKID']] : [['MUSICBRAINZ_TRACKID'], ['TITLE','ARTIST'], ['TITLE','ALBUM ARTIST'], ['TITLE']];
	const libItems = checkQuery(filter, false) // Filtering can easily speedup the entire process up to 50%
		? fb.GetQueryItems(fb.GetLibraryItems(), filter + (bOnlyMBID ? ' AND MUSICBRAINZ_TRACKID PRESENT' : '')) 
		: bOnlyMBID 
			? fb.GetQueryItems(fb.GetLibraryItems(), 'MUSICBRAINZ_TRACKID PRESENT')
			: fb.GetLibraryItems();
	const sortTF = sort.length ? fb.TitleFormat(sort) : null;
	for (let i = 0; i < rowsLength; i++) {
		const row = rows[i];
		const rowExt = row.extension['https://musicbrainz.org/doc/jspf#track'];
		let query = '';
		let lookup = {};
		let identifier = '';
		const artistIndentifier = rowExt.hasOwnProperty('artist_identifiers') && rowExt.artist_identifiers && rowExt.artist_identifiers.length
			? rowExt.artist_identifiers.map((val) => decodeURI(val).replace(this.regEx,''))
			: [''];
		lookupKeys.forEach((look) => {
			const key = look.xspfKey;
			const queryKey = _q(sanitizeTagIds(_t(look.queryKey)));
			if (row.hasOwnProperty(key)) {
				const value = row[key];
				if (value && value.length) {
					if (key === 'identifier') {identifier = decodeURI(value).replace(this.regEx,'');}
					lookup[look.queryKey] = queryKey + ' IS ' + this.sanitizeQueryValue(key === 'identifier' ? identifier : value);
				}
			}
		});
		for (let condition of conditions) {
			if (condition.every((tag) => {return lookup.hasOwnProperty(tag);})) {
				query = condition.map((tag) => {return lookup[tag];}).join(' AND ');
				const matches = queryCache.has(query) ? queryCache.get(query) : (checkQuery(query, true) ? fb.GetQueryItems(libItems, query) : null);
				if (!queryCache.has(query)) {queryCache.set(query, matches);}
				if (matches && matches.Count) {
					if (sortTF) {matches.OrderByFormat(sortTF, -1);}
					handleArr[i] = matches[0];
					count++;
					break;
				}
			}
		}
		if (!handleArr[i]) {notFound.push({creator: rows[i].creator, title: rows[i].title, identifier /* str */, artistIndentifier /* [str, ...]*/});}
	}
	if (notFound.length) {console.log('Some tracks have not been found on library:\n\t' + notFound.map((row) => row.creator + ' - ' + row.title + ': ' + row.identifier).join('\n\t'));}
	if (this.bProfile) {profiler.Print('');}
	return {handleList: new FbMetadbHandleList(handleArr.filter((n) => n)), handleArr, notFound};
};

listenBrainz.sanitizeQueryValue = function sanitizeQueryValue(value) {
	return sanitizeQueryVal(sanitizeTagValIds(value));
};

/*
	User data
*/
listenBrainz.retrieveUserPlaylistsNames = function retrieveUserPlaylistsNames(user, token) {
	if (!user || !user.length || !token || !token.length) {console.log('retrieveUserPlaylistsNames: no user/token provided'); return Promise.resolve(null);}
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/user/' + user + '/playlists',
		requestHeader: [['Authorization', 'Token ' + token]],
		bypassCache: true
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
};

listenBrainz.retrieveUserResponse = function retrieveUserResponse(token, bLog = true) {
	if (!token || !token.length) {console.log('retrieveUserResponse: no token provided'); return Promise.resolve(null);}
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/validate-token?token=' + token,
		bypassCache: true
	}).then(
		(resolve) => {
			return JSON.parse(resolve);
		},
		(reject) => {
			if (bLog) {console.log('retrieveUserResponse: ' + JSON.stringify(reject));}
			return reject.status === 12007 
				? {valid: null, code: 12007}
				: null;
		}
	);
};

listenBrainz.retrieveUser = async function retrieveUser(token, bLog = true) {
	let user = this.cache.user.get(token);
	if (!user) {
		const response = await this.retrieveUserResponse(token, bLog);
		user = response && response.valid ? response.user_name : '';
		if (user.length) {this.cache.user.set(token, response.user_name);}
	}
	return user;
};

listenBrainz.retrieveUserPlaylists = function retrieveUserPlaylists(user, token) {
	if (!user || !user.length || !token || !token.length) {console.log('retrieveUserPlaylists: no user/token provided'); return Promise.resolve([]);}
	return this.retrieveUserPlaylistsNames(user, token).then(
		(resolve) => {
			const playlists = resolve.playlists;
			const jsfpArr = playlists.map((pls) => {return this.importPlaylist(pls.identifier.replace(this.regEx, ''));})
			return Promise.all(jsfpArr);
		},
		(reject) => {
			console.log('retrieveUserPlaylists: ' + JSON.stringify(reject));
			return [];
		}
	);
};

listenBrainz.followUser = function followUser(userToFollow, token) {
	if (!userToFollow || !userToFollow.length || !token || !token.length) {console.log('followUser: no user/token provided'); return Promise.resolve(null);}
	return send({
		method: 'POST', 
		URL: 'https://api.listenbrainz.org/1/user/' + userToFollow + '/follow',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]]
	}).then(
		(resolve) => {
			console.log('followUser: ' + userToFollow + ' -> ' + resolve);
			if (resolve) {
				const bDone = JSON.parse(resolve).status === 'ok';
				if (bDone && this.cache.user.has(token)) {
					const user = this.cache.user.get(token);
					const following = this.cache.following.get(user) || [];
					if (following.indexOf(userToFollow) === -1) {
						following.push(userToFollow);
						this.cache.following.set(user, following);
					}
				}
				return bDone;
			}
			return false;
		},
		(reject) => {
			console.log('followUser: ' + userToFollow + ' -> ' + reject.status + ' ' + reject.responseText);
			return reject.status === 400;
		}
	);
};

listenBrainz.retrieveFollowing = function retrieveFollowing(user, token) {
	if (!user || !user.length || !token || !token.length) {console.log('retrieveFollowing: no user/token provided'); return Promise.resolve([]);}
	return send({
		method: 'GET', 
		URL: 'https://api.listenbrainz.org/1/user/' + user +  '/following',
		requestHeader: [['Authorization', 'Token ' + token]],
		bypassCache: true
	}).then(
		(resolve) => {
				const response = JSON.parse(resolve); // {user, following: []}
				if (response.hasOwnProperty('user') && response.user === user && response.hasOwnProperty('following')) {
					this.cache.following.set(user, response.following);
					return response.following; // []
				}
				return [];
		},
		(reject) => {
			console.log('retrieveFollowing: ' + JSON.stringify(reject));
			return [];
		}
	);
};

// Retrieve following first for caching
listenBrainz.isFollowing = function isFollowing(token, toUser) {
	const user = this.cache.user.get(token);
	const following = user ? this.cache.following.get(user) || [] : [];
	return following.indexOf(toUser) !== -1;
};

/*
	Services
*/
listenBrainz.exportPlaylistToService = function exportPlaylistToService(pls /*{playlist_mbid}*/, service /*spotify*/, token) {
	if (!token || !token.length || !service || !pls.playlist_mbid) {console.log('exportPlaylistToService: no pls/service/token provided'); return Promise.resolve(null);}
	if (Array.isArray(service)) {
		return Promise.serial(service, 
			(s, i) => listenBrainz.exportPlaylistToService(pls, s, token)
		, 50); // [{status, value}, ...]
	};
	return send({
		method: 'POST', 
		URL: 'https://api.listenbrainz.org/1/playlist/' + pls.playlist_mbid + '/export/' + service,
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]]
	}).then(
		(resolve) => {
			console.log('exportPlaylistToService: ' + JSON.stringify(pls) + ' to ' + service + ' -> ' + resolve);
			if (resolve) {
				return JSON.parse(resolve).status === 'ok';
			}
			return false;
		},
		(reject) => {
			console.log('exportPlaylistToService: ' + JSON.stringify(pls) + ' to ' + service + ' -> ' + reject.status + ' ' + reject.responseText);
			return reject.status === 400;
		}
	);
};

listenBrainz.getUserServices = function getUserServices(user, token) {
	if (!user || !user.length || !token || !token.length) {console.log('getUserServices: no user/token provided'); return Promise.resolve([]);}
	const services = this.cache.services.get(user);
	return services 
		? services 
		: send({
			method: 'GET', 
			URL: 'https://api.listenbrainz.org/1/user/' + user + '/services',
			requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
			bypassCache: true
		}).then(
			(resolve) => {
				const response = JSON.parse(resolve); // {"user_name": "hwnrwx", "services": ["spotify"]}
				if (response.hasOwnProperty('user_name') && response.user_name === user && response.hasOwnProperty('services')) {
					this.cache.services.set(user, response.services);
					return response.services; // ['spotify']
				}
				return [];
			},
			(reject) => {
				console.log('getUserServices: ' + JSON.stringify(reject));
				return []
			}
		);
};

/*
	Token
*/
listenBrainz.decryptToken = function decryptToken({lBrainzToken, bEncrypted = true}) {
	if (bEncrypted && !this.cache.key) {
		let pass = '';
		try {pass = utils.InputBox(window.ID, 'Enter password:', window.Name, pass, true);} 
		catch(e) {return null;}
		if (!pass.length) {return null;}
		this.cache.key = new SimpleCrypto(pass);
	}
	return (bEncrypted ? this.cache.key.decrypt(lBrainzToken) : lBrainzToken);
}

listenBrainz.validateToken = async function validateToken(token, bOmitNetworError = false) {
	const response = await this.retrieveUserResponse(token);
	return response // null | false | true
		? response.valid || bOmitNetworError && response.code === 12007 
		: null;
};