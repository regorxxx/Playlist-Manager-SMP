'use strict';
//05/12/24

/* global list:readable, delayAutoUpdate:readable, checkLBToken:readable,  */
include('..\\..\\helpers\\helpers_xxx.js');
/* global globQuery:readable, popup:readable, folders:readable */
include('..\\..\\helpers\\helpers_xxx_basic_js.js');
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
/* global require:readable, nextId:readable, _q:readable, _t:readable, isArrayStrings:readable */
include('..\\..\\helpers\\helpers_xxx_file.js');
/* global _isFile:readable, _deleteFile:readable, _renameFile:readable, WshShell:readable, sanitize:readable, _jsonParseFileCheck:readable, utf8:readable, _save:readable */
include('..\\..\\helpers\\helpers_xxx_playlists.js');
/* global sendToPlaylist:readable */
include('..\\..\\helpers\\helpers_xxx_playlists_files.js');
/* global getHandlesFromPlaylist:readable, getHandlesFromUIPlaylists:readable, savePlaylist:readable */
include('..\\..\\helpers\\helpers_xxx_tags.js');
/* global getHandleListTags:readable, getHandleListTagsV2:readable, sanitizeTagIds:readable, sanitizeQueryVal:readable, checkQuery:readable, sanitizeQueryVal:readable, sanitizeTagValIds:readable */
include('..\\..\\helpers\\helpers_xxx_web.js');
/* global send:readable, paginatedFetch:readable */
include('..\\..\\helpers\\helpers_xxx_levenshtein.js');
/* global similarity:readable */
const SimpleCrypto = require('..\\helpers-external\\SimpleCrypto-js\\SimpleCrypto.min');

/**
 * Wrapper for ListenBrainz API and different methods related to foobar2000 integration
 * @namespace ListenBrainz
 */
const ListenBrainz = {
};

/**
 * See {@link https://musicbrainz.org/doc/jspf}
 *
 * @typedef {object} jspfPlaylistTrack
 * @property {object} track - Ordered list of track elements to be rendered. The sequence is a hint, not a requirement; renderers are advised to play tracks from top to bottom unless there is an indication otherwise. If a track element cannot be rendered, a user-agent MUST skip to the next track element and MUST NOT interrupt the sequence.
 * @property {string} track.title - Name of the track. This value is primarily for fuzzy lookups.
 * @property {string} track.identifier - Canonical ID for this resource. For ex. 'https://musicbrainz.org/recording/e8f9b188-f819-4e43-ab0f-4bd26ce9ff56'
 * @property {string} track.creator - Author of the track. This value is primarily for fuzzy lookups.
 * @property {string} track.album - For a song originally published as a part of a CD or LP, this would be the title of the original release. This value is primarily for fuzzy lookups.
 * @property {{'https://musicbrainz.org/doc/jspf#track':{added_by:string, artist_identifiers:string[], added_at:string, release_identifier:string, additional_metadata:object}}} track.extension - MusicBrainz track namespace
*/

/**
 * See {@link https://musicbrainz.org/doc/jspf}
 *
 * @typedef {object} jspfPlaylist
 * @property {object} playlist
 * @property {string} playlist.title - Playlist title.
 * @property {string} playlist.creator - User/software who created the playlist.
 * @property {string} playlist.annotation - Ccomment on the playlist.
 * @property {string} playlist.info - URI of a web page to find out more about the playlist.
 * @property {string} playlist.location - Source URI for the playlist.
 * @property {string} playlist.identifier - Canonical ID for this playlist. Likely to be a hash or other location-independent name.
 * @property {string} playlist.image - URI of an image to display in the absence of a playlist.trackList.image element.
 * @property {string} playlist.date - Creation date (not last-modified date) of the playlist, formatted as a XML schema dateTime (2005-01-08T17:10:47-05:00). In the absence of a timezone, the element MAY be assumed to use Coordinated Universal Time (UTC).
 * @property {string} playlist.license - URI of a resource that describes the license under which this playlist was released.
 * @property {{location:string, identifier:string}[]} playlist.attribution - An ordered list of URIs. The purpose is to satisfy licenses allowing modification but requiring attribution.
 * @property {{[string]:string}[]} playlist.link - The link element allows JSPF to be extended without the use of XML namespaces.
 * @property {{[string]:string}[]} playlist.meta - The meta element allows metadata fields to be added to JSPF.
 * @property {{'https://musicbrainz.org/doc/jspf#playlist':{created:string, created_for:string, collaborators:string[], copied_from:string, copied_from_deleted:boolean, public:boolean, last_modified_at:string, additional_metadata:object}}} playlist.extension - MusicBrainz playlist namespace
 * @property {jspfPlaylistTrack[]} playlist.track - Ordered list of track elements to be rendered. The sequence is a hint, not a requirement.
*/

/** RegExp to match ListenBrainz related urls */
ListenBrainz.regEx = /(^https:\/\/(listenbrainz|musicbrainz).org\/)|(recording)|(playlist)|(artist)|\//g;
/** Profiling setting */
ListenBrainz.bProfile = false;
/** Cache related settings (during session) */
ListenBrainz.cache = {
	user: new Map(),
	services: new Map([['global', ['spotify']]]),
	similarUsers: new Map(),
	following: new Map(),
	key: null,
};
/** Available algorithms for API recommendations. Only these are available. */
ListenBrainz.algorithm = {
	retrieveSimilarArtists: {
		v1: 'session_based_days_9000_session_300_contribution_5_threshold_15_limit_50_skip_30',
		v2: 'session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30',
	},
	retrieveSimilarRecordings: {
		v1: 'session_based_days_9000_session_300_contribution_5_threshold_15_limit_50_skip_30',
	},
};
ListenBrainz.jspfExt = 'https://musicbrainz.org/doc/jspf#playlist';
/** Listens cache related methods. Listens are saved into a persistent database in JSON. */
ListenBrainz.listensCache = {
	/**
	 * Gets validation file data
	 * @name getValidate
	 * @param {string} user
	 * @returns {{[user:string]:{maxDate:number, minDate:number, retrievalDate:number}}}
	 */
	getValidate: function (user) {
		const data = _jsonParseFileCheck(folders.data + 'listenbrainz_listens.json', 'ListenBrainz listens', 'ListenBrainz', utf8);
		return typeof user !== 'undefined'
			? data[this.sanitizeUser(user)]
			: data;
	},
	sanitizeUser: function (user) {
		return sanitize(user.toLowerCase());
	},
	getFile: function (user) {
		return folders.data + 'listenbrainz_listens_' + this.sanitizeUser(user) + '.json';
	},
	validate: function (user, maxDate = Date.now() / 1000, minDate = ListenBrainz.LISTEN_MINIMUM_TS) {
		if (_isFile(folders.data + 'listenbrainz_listens.json')) {
			const data = this.getValidate();
			user = this.sanitizeUser(user);
			if (data) {
				return data[user].maxRetrievalDate >= maxDate && data[user].minRetrievalDate <= minDate && (Date.now() / 1000 - data[user].retrievalDate) < 10 * 24 * 60 * 60;
			}
			return false;
		}
		return false;
	},
	set: function (user, listensData, maxRetrievalDate, minRetrievalDate) {
		if (!listensData.length) { return; }
		user = this.sanitizeUser(user);
		let validationData = {};
		if (_isFile(folders.data + 'listenbrainz_listens.json')) {
			validationData = this.getValidate();
		}
		validationData[user] = {
			maxDate: listensData[0].listened_at,
			minDate: listensData[listensData.length - 1].listened_at,
			minRetrievalDate,
			maxRetrievalDate,
			retrievalDate: Date.now() / 1000
		};
		_save(folders.data + 'listenbrainz_listens.json', JSON.stringify(validationData, null, '\t').replace(/\n/g, '\r\n'));
		_save(this.getFile(user), JSON.stringify(listensData, null, '\t').replace(/\n/g, '\r\n'));
	},
	get: function (user, maxDate = Date.now(), minDate = ListenBrainz.LISTEN_MINIMUM_TS) {
		user = this.sanitizeUser(user);
		if (this.validate(user, maxDate, minDate)) {
			const data = _jsonParseFileCheck(this.getFile(user), 'ListenBrainz listens cache file', 'ListenBrainz', utf8);
			if (data) {
				return data.filter((listen) => listen.listened_at > minDate && listen.listened_at < maxDate);
			}
		}
		return null;
	}
};
/**
 * API constants
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#constants}
 * @see {@link https://github.com/metabrainz/listenbrainz-server/blob/master/listenbrainz/webserver/views/api_tools.py}
*/
ListenBrainz.MAX_ITEMS_PER_GET = 1000;
ListenBrainz.MAX_LISTENS_PER_REQUEST = 1000;
ListenBrainz.DEFAULT_ITEMS_PER_GET = 25;
ListenBrainz.LISTEN_MINIMUM_TS = 1033430400;
ListenBrainz.MAX_RECORDINGS_PER_ADD = 100;

/* Helpers */

/**
 * Retrieves MBIDs (MUSICBRAINZ_TRACKID) for a handle list, using tags and [optionally] via API.
 * Output has the same length/sorting than input.
 * @see {@link ListenBrainz.lookupMBIDs}
 * @name getMBIDs
 * @kind method
 * @memberof ListenBrainz
 * @param {FbMetadbHandleList} handleList
 * @param {string} token
 * @param {Boolean} [bLookupMBIDs=true] - Lookup MBIDs using API for tracks without such tag
 * @returns {Promise.<string[]>}
 */
ListenBrainz.getMBIDs = async function getMBIDs(handleList, token, bLookupMBIDs = true) {
	const tags = getHandleListTags(handleList, ['MUSICBRAINZ_TRACKID'], { bMerged: true }).flat();
	// Try to retrieve missing MBIDs
	const missingIds = tags.multiIndexOf('');
	const missingCount = missingIds.length;
	if (bLookupMBIDs && missingCount) {
		const missingHandleList = new FbMetadbHandleList(missingIds.map((idx) => { return handleList[idx]; }));
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
/**
 * Retrieves Artist MBID (ARTIST_MBID) for an artist names list via API.
 * Output may not have the same length/sorting than input.
 * @see {@link https://musicbrainz.org/doc/MusicBrainz_API}
 * @name lookupArtistMBIDsByName
 * @kind method
 * @memberof ListenBrainz
 * @param {string[]} names
 * @param {Boolean} bRetry - Retry on network error
 * @returns {Promise.<{ name:string, mbid:string}[]>}
 */
ListenBrainz.lookupArtistMBIDsByName = function lookupArtistMBIDsByName(names, bRetry) {
	const rate = 50;
	const retryMs = 500;
	return Promise.serial(
		names,
		(name) => send({
			method: 'GET',
			URL: 'https://musicbrainz.org/ws/2/artist/?fmt=json&limit=1&query=' + encodeURI(name)
		}).then(
			(resolve) => {
				if (resolve) {
					const response = JSON.parse(resolve); // [{artist_mbid, artist_name, artist_sortname, type}, ...]
					if (response && response.artists) {
						const artist = response.artists[0];
						if (artist.score >= 90) {
							return { name: artist.name, mbid: artist.id };
						}
					}
				}
				return null;
			},
			(reject) => {
				if (!bRetry) { console.log('lookupArtistMBIDsByName: ' + reject.status + ' ' + reject.responseText); }
				else { console.log('lookupArtistMBIDsByName: Retrying request for ' + name + ' to server on ' + retryMs + ' ms...'); }
				return bRetry ? Promise.wait(retryMs).then(() => this.lookupArtistMBIDsByName([name], false)) : null;
			}
		)
		, rate
	).then((results) => {
		const passed = results.filter(Boolean).length;
		const total = names.length;
		const nError = total - passed;
		console.log('lookupArtistMBIDsByName: ' + total + ' artists' + (nError ? ' (' + nError + ' failed)' : ''));
		return results;
	}, (error) => {
		console.log(error.message); // DEBUG
		return null;
	});
};
/**
 * Retrieves Artist MBID (MUSICBRAINZ_ALBUMARTISTID|MUSICBRAINZ_ARTISTID) for a handle list, using tags and [optionally] via API.
 * Output has the same length/sorting than input.
 *
 * There is additional handling for special artists if bRetry is set to true when passing a single handle, where it tryes to switch Album Artist/Artist to find a real artist MBID.
 * @see {@link https://musicbrainz.org/doc/Style/Unknown_and_untitled/Special_purpose_artist}
 * @see {@link https://musicbrainz.org/artist/4e46dd54-81a6-4a75-a666-d0e447861e3f}
 * @see {@link ListenBrainz.lookupArtistMBIDs}
 * @name getArtistMBIDs
 * @kind method
 * @memberof ListenBrainz
 * @param {FbMetadbHandleList} handleList
 * @param {string} token
 * @param {Boolean} [bLookupMBIDs=true] - Lookup MBIDs using API for tracks without such tag
 * @param {Boolean} [bAlbumArtist=true] - Prefer Album Artist(MUSICBRAINZ_ALBUMARTISTID) instead of Artist(MUSICBRAINZ_ARTISTID)
 * @param {Boolean} [bRetry=true] - Retry on network error
 * @returns {Promise.<string[][]>}
 */
ListenBrainz.getArtistMBIDs = async function getArtistMBIDs(handleList, token, bLookupMBIDs = true, bAlbumArtist = true, bRetry = true) {
	const tags = getHandleListTags(handleList, [bAlbumArtist ? 'MUSICBRAINZ_ALBUMARTISTID' : 'MUSICBRAINZ_ARTISTID'], { bMerged: true }).flat();
	// Try to retrieve missing MBIDs
	const missingIds = tags.multiIndexOf('');
	const missingCount = missingIds.length;
	if (bLookupMBIDs && missingCount) {
		const missingHandleList = new FbMetadbHandleList(missingIds.map((idx) => handleList[idx]));
		const missingMBIDs = await this.lookupArtistMBIDs(missingHandleList, token, bAlbumArtist);
		if (missingMBIDs.length) {
			missingMBIDs.forEach((mbid, i) => {
				const idx = missingIds[i];
				tags[idx] = mbid;
			});
		}
	}
	if (tags.length === 1 && bRetry) {
		const specialIds = new Set(['f731ccc4-e22a-43af-a747-64213329e088', '33cf029c-63b0-41a0-9855-be2a3665fb3b', '314e1c25-dde7-4e4d-b2f4-0a7b9f7c56dc', 'eec63d3c-3b81-4ad4-b1e4-7c147d4d2b61', '9be7f096-97ec-4615-8957-8d40b5dcbc41', '125ec42a-7229-4250-afc5-e057484327fe', '89ad4ac3-39f7-470e-963a-56509c546377', '4e46dd54-81a6-4a75-a666-d0e447861e3f']);
		if (specialIds.has(tags[0])) {
			return this.getArtistMBIDs(handleList, token, bLookupMBIDs, !bAlbumArtist, false);
		}
	}
	return tags;
};
/**
 * Creates a dictionary of MBIDs per Artist. Artists in ListenBrainz may not necessarily match the library ones, due to variations, etc. A lookupo is used for every MBID and once the canonical name is retrieved, it's matched against the list of artists passed on input if their similarity is high enough (Levenshtein distance > 90%).
 * @see {@link https://datasets.listenbrainz.org/artist-lookup}
 * @overload
 * @param {string[]} artists
 * @param {string[]|string[][]} MBIDs
 * @param {string} token
 * @param {false} bInverse
 * @returns {Promise.<{artist:string, mbids:string[]}[]>}
 */
/**
 * Creates a dictionary of Artists per MBID. Artists in ListenBrainz may not necessarily match the library ones, due to variations, etc. A lookupo is used for every MBID and once the canonical name is retrieved, it's matched against the list of artists passed on input if their similarity is high enough (Levenshtein distance > 90%).
 * @see {@link https://datasets.listenbrainz.org/artist-lookup}
 * @overload
 * @param {string[]} artists
 * @param {string[]|string[][]} MBIDs
 * @param {string} token
 * @param {true} bInverse
 * @returns {Promise.<{mbid:string, artists:string[]}[]>}
 */
/**
 * @name joinArtistMBIDs
 * @kind method
 * @memberof ListenBrainz
 * @param {string[]} artists
 * @param {string[]|string[][]} MBIDs - Only the first MBID will be used per index if passing a 2D array
 * @param {string} token
 * @param {Boolean} [bInverse=false] - If true, outputs MBIDs per Artist.
 * @returns {Promise.<{mbid:string, artists:string[]}[]>|Promise.<{artist:string, mbids:string[]}[]>}
 */
ListenBrainz.joinArtistMBIDs = function joinArtistMBIDs(artists, MBIDs, token, bInverse = false) {
	const artistCount = artists.length;
	const MBIDsCount = MBIDs.length;
	const results = new Array(MBIDsCount).fill({});
	const data = new Array(MBIDsCount).fill({});
	data.forEach((_, i, thisArr) => {
		thisArr[i] = {};
		results[i] = { artists: [] };
		thisArr[i]['[artist_mbid]'] = results[i].mbid = Array.isArray(MBIDs[i]) ? MBIDs[i][0] : MBIDs[i];
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
					const obj = { artist, mbids: [] };
					results.forEach((result) => {
						if (result.artists.includes(artist)) {
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
	);
};
/**
 * Helper to output common console errors.
 * @name consoleError
 * @kind method
 * @memberof ListenBrainz
 * @param {string} [message='Token can not be validated.']
 * @returns {void}
 */
ListenBrainz.consoleError = function consoleError(message = 'Token can not be validated.') {
	fb.ShowPopupMessage(
		message.trim() + ' Check console.\n\nSome possible errors:' +
		'\n\t- 12029: Encrypted communication could not be established.' +
		'\n\t- 12007: Network error and/or non reachable server.' +
		'\n\t- 429: Too many requests on a short amount of time.' +
		'\n\t- 400: Only add max ' + this.MAX_RECORDINGS_PER_ADD + ' recordings per call. (Bug at script level)' +
		'\n\t- 200: ListenBrainz Token not valid.'
		, window.Name
	);
};

/* Playlists */

/**
 * Uploads new playlist using the playlist file as reference and provides a new MBID. Note sending multiple times the same playlist file will create different entities; use sync to edit already exported playlists.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#post--1-playlist-create}
 * @name exportPlaylist
 * @kind method
 * @memberof ListenBrainz
 * @param {{name:string, nameId:string, path:string, extension:string}} pls - Playlist object which must contain at least those keys
 * @param {string} root - Path in case relative paths are used in playlist file
 * @param {string} token
 * @param {Boolean} [bLookupMBIDs=true] - Lookup MBIDs using API for tracks without such tag
 * @returns {Promise.<string>} Playlist MBID on sucess
 */
ListenBrainz.exportPlaylist = async function exportPlaylist(pls, root = '', token = '', bLookupMBIDs = true) { // NOSONAR
	if (!pls.path && !pls.extension || pls.extension && !pls.nameId || !pls.name) { console.log('exportPlaylist: no valid pls provided'); return Promise.resolve(''); }
	const bUI = pls.extension === '.ui';
	// Create new playlist and check paths
	const handleList = !bUI
		? getHandlesFromPlaylist({ playlistPath: pls.path, relPath: root, bOmitNotFound: true })
		: getHandlesFromUIPlaylists([pls.nameId], false); // Omit not found
	const mbid = (await this.getMBIDs(handleList, token, bLookupMBIDs)).filter(Boolean);
	const missingCount = handleList.Count - mbid.length;
	if (missingCount) { console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted ' + missingCount + ' tracks on exporting'); }
	const track = mbid.map((tag) => { return { identifier: 'https://musicbrainz.org/recording/' + tag }; });
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
/**
 * Deletes all tracks on a ListenBrainz playlist defined by its MBID and then adds all tracks again using the playlist file as reference. Easier than single edits, etc.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#post--1-playlist-(playlist_mbid)-item-delete}
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#post--1-playlist-create}
 * @name syncPlaylist
 * @kind method
 * @memberof ListenBrainz
 * @param {{name:string, nameId:string, path:string, extension:string, playlist_mbid:string}} pls - Playlist object which must contain at least those keys
 * @param {string} root - Path in case relative paths are used in playlist file
 * @param {string} token
 * @param {Boolean} [bLookupMBIDs=true] - Lookup MBIDs using API for tracks without such tag
 * @returns {Promise.<string>} Playlist MBID on sucess
 */
ListenBrainz.syncPlaylist = function syncPlaylist(pls, root = '', token = '', bLookupMBIDs = true) {// NOSONAR
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) { console.log('syncPlaylist: no playlist_mbid provided'); return Promise.resolve(''); }
	const data = {
		index: 0,
		count: Number.MAX_VALUE
	};
	const bUI = pls.extension === '.ui';
	// Create new playlist and check paths
	const handleList = !bUI
		? getHandlesFromPlaylist({ playlistPath: pls.path, relPath: root, bOmitNotFound: true })
		: getHandlesFromUIPlaylists([pls.nameId], false); // Omit not found
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
						return this.addPlaylist(pls, handleList, void (0), token, bLookupMBIDs);
					} else {
						console.log('Playlist URL: ' + this.getPlaylistURL(pls));
						return Promise.resolve(pls.playlist_mbid);
					}
				}
				return Promise.resolve('');
			}
			return Promise.resolve('');
		},
		async (reject) => { // If the online playlist was already empty, let's simply add the new tracks
			console.log('syncPlaylist: ' + reject.status + ' ' + reject.responseText);
			if (reject.responseText.length) {
				const response = JSON.parse(reject.responseText);
				if (response.error === 'Failed to deleting recordings from the playlist. Please try again.') { // Playlist file was empty
					const jspf = await this.importPlaylist(pls, token);
					if (jspf.playlist.track.length === 0) {
						if (handleList.Count) {
							return this.addPlaylist(pls, handleList, void (0), token, bLookupMBIDs);
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
			return Promise.resolve('');
		}
	);
};
/**
 * Adds a handle list to a ListenBrainz playlist defined by its MBID.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#post--1-playlist-(playlist_mbid)-item-add-(int-offset)}
 * @name addPlaylist
 * @kind method
 * @memberof ListenBrainz
 * @param {{playlist_mbid:string}} pls - Playlist object which must contain at least those keys
 * @param {number} offset- If the offset is providedm then the recordings will be added at that offset, otherwise they will be added at the end of the playlist.
 * @param {string} token
 * @param {Boolean} [bLookupMBIDs=true] - Lookup MBIDs using API for tracks without such tag
 * @returns {Promise.<string>} Playlist MBID on sucess
 */
ListenBrainz.addPlaylist = async function addPlaylist(pls, handleList, offset, token, bLookupMBIDs = true) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) { console.log('addPlaylist: no playlist_mbid provided'); return Promise.resolve(''); }
	if (!handleList || !handleList.Count) { console.log('addPlaylist: empty pls provided'); return Promise.resolve(pls.playlist_mbid); }
	const mbid = (await this.getMBIDs(handleList, token, bLookupMBIDs)).filter(Boolean);
	const missingCount = handleList.Count - mbid.length;
	if (missingCount) { console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted ' + missingCount + ' tracks on exporting'); }
	const track = mbid.map((tag) => { return { identifier: 'https://musicbrainz.org/recording/' + tag }; });
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
	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async (resolve) => { // NOSONAR
		let result;
		const num = track.length;
		const max = this.MAX_RECORDINGS_PER_ADD;
		for (let i = 0; i < num; i += max) { // Adds X tracks per call, server doesn't allow more
			console.log('addPlaylist: tracks ' + (i + 1) + ' to ' + ((i + max + 1) > num ? num : i + max + 1));
			result = await new Promise((res) => {
				setTimeout(async () => { // Limit rate to 30 ms per call
					res(await addPlaylistSlice(
						pls.name,
						track.slice(i, i + max),
						i === 0
							? offset
							: typeof offset !== 'undefined'
								? offset + i
								: i
					));
				}, 30);
			});
		}
		resolve(result || '');
	});
};
/**
 * Import playlist metadata and track list from ListenBrainz playlist defined by its MBID.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#get--1-playlist-(playlist_mbid)}
 * @name addPlaylist
 * @kind method
 * @memberof ListenBrainz
 * @param {{playlist_mbid:string}} pls - Playlist object which must contain at least those keys
 * @param {string} token
 * @returns {Promise.<null|jspfPlaylist>}
 */
ListenBrainz.importPlaylist = function importPlaylist(pls, token) { // NOSONAR
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) { console.log('importPlaylist: no playlist_mbid provided'); return Promise.resolve(null); }
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
					console.log('importPlaylist: ' + JSON.stringify({ creator: jspf.playlist.creator, identifier: jspf.playlist.identifier, tracks: jspf.playlist.track.length }));
					Object.defineProperty(jspf.playlist, 'description', { // Remap description to annotation
						set: function (x) { this.annotation = x; },
						get: function () { return this.annotation; }
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
/**
 * Imports all playlist into the current Playlist Manager panel @see {@link _list}. Retrieves the token directly from the manager.
 * @see {@link ListenBrainz.retrieveUserPlaylists}
 * @name importUserPlaylists
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @returns {Promise.<boolean>}
 */
ListenBrainz.importUserPlaylists = async function importUserPlaylists(user) {
	if (!await checkLBToken()) { return Promise.resolve(false); }
	let bDone = false;
	const jsfpArr = await this.retrieveUserPlaylists(user, this.decryptToken({ lBrainzToken: list.properties.lBrainzToken[1], bEncrypted: list.properties.lBrainzEncrypt[1] }));
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
					if (answer === popup.no) { return false; }
					_renameFile(playlistPath, backPath);
				}
				const useUUID = list.optionsUUIDTranslate();
				const playlistNameId = playlistName + (list.bUseUUID ? nextId(useUUID, false) : '');
				const category = list.categoryState.length === 1 && list.categoryState[0] !== list.categories(0) ? list.categoryState[0] : '';
				const tags = ['ListenBrainz'];
				const playlist_mbid = jspf.playlist.identifier.replace(this.regEx, '');
				const author = jspf.playlist.extension['https://musicbrainz.org/doc/jspf#playlist'].creator;
				const description = jspf.playlist.description;
				if (list.bAutoLoadTag) { tags.push('bAutoLoad'); }
				if (list.bAutoLockTag) { tags.push('bAutoLock'); }
				if (list.bMultMenuTag) { tags.push('bMultMenu'); }
				if (list.bAutoCustomTag) { list.autoCustomTag.forEach((tag) => { if (!new Set(tags).has(tag)) { tags.push(tag); } }); }
				bDone = savePlaylist({ handleList, playlistPath, ext: list.playlistsExtension, playlistName, category, tags, playlist_mbid, author, description, useUUID, bBOM: list.bBOM });
				// Restore backup in case something goes wrong
				if (!bDone) { console.log('Failed saving playlist: ' + playlistPath); _deleteFile(playlistPath); _renameFile(backPath, playlistPath); }
				else if (_isFile(backPath)) { _deleteFile(backPath); }
				if (bDone && plman.FindPlaylist(playlistNameId) !== -1) { sendToPlaylist(handleList, playlistNameId); }
			}
		});
		clearInterval(delay);
	}
	if (!bDone) { fb.ShowPopupMessage('There were some errors on playlist syncing. Check console.', window.Name); }
	return bDone;
};
/**
 * Returns the playlist URL on ListenBrainz servers
 * @name getPlaylistURL
 * @kind method
 * @memberof ListenBrainz
 * @param {{playlist_mbid}} pls - Playlist object which must contain at least those keys
 * @returns {string}
 */
ListenBrainz.getPlaylistURL = function getPlaylistURL(pls) {
	if (!pls.playlist_mbid || !pls.playlist_mbid.length) { return null; }
	return ('https://listenbrainz.org/playlist/' + pls.playlist_mbid + '/');
};

/* Feedback */

/**
 * Sends feedback data (hate/love) for a list of MBIDs
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/recordings.html#post--1-feedback-recording-feedback}
 * @overload
 * @param {string[]} handleList
 * @param {'love'|'hate'|null} feedback - Any string different than the 2 allowed will remove any present feedback
 * @param {string} token
 * @param {Boolean} [bLookupMBIDs=false] - Not used
 * @param {Boolean} [bRetry=true] - Retry on network failure
 * @param {'GET'|'POST'} [method='GET'] - GET method has a 75 tracks limit
 * @returns {Promise.<{created:number, recording_mbid:string, rating:string }>}
 */
/**
 * Sends feedback data (hate/love) for a handleList
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/recordings.html#post--1-feedback-recording-feedback}
 * @overload
 * @param {FbMetadbHandleList} handleList
 * @param {'love'|'hate'|null} feedback - Any string different than the 2 allowed will remove any present feedback
 * @param {string} token
 * @param {Boolean} [bLookupMBIDs=true] - Lookup MBIDs using API for tracks without such tag
 * @param {Boolean} [bRetry=true] - Retry on network failure
 * @param {'GET'|'POST'} [method='GET'] - GET method has a 75 tracks limit
 * @returns {Promise.<{created:number, recording_mbid:string, rating:string }>}
 */
/**
 * @name sendFeedback
 * @kind method
 * @memberof ListenBrainz
 * @param {FbMetadbHandleList|string[]} handleList
 * @param {'love'|'hate'|null} feedback - Any string different than the 2 allowed will remove any present feedback
 * @param {string} token
 * @param {Boolean} [bLookupMBIDs=true] - Lookup MBIDs using API for tracks without such tag, only relevant if passing a handleList
 * @param {Boolean} [bRetry=true] - Retry on network failure
 * @param {'GET'|'POST'} [method='GET'] - GET method has a 75 tracks limit
 * @returns {Promise.<{created:number, recording_mbid:string, rating:string }>}
 */
ListenBrainz.sendFeedback = async function sendFeedback(handleList, feedback = 'love', token = '', bLookupMBIDs = true, bRetry = true) {
	const byMbid = !(handleList instanceof FbMetadbHandleList);
	if (!byMbid && !isArrayStrings(handleList, true)) { return null; }
	const mbid = (byMbid
		? handleList
		: (await this.getMBIDs(handleList, token, bLookupMBIDs))
	).filter(Boolean);
	const mbidLen = mbid.length;
	const missingCount = byMbid ? 0 : handleList.Count - mbidLen;
	if (missingCount) { console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted ' + missingCount + ' tracks while setting feedback'); }
	const rate = 50;
	const retryMs = 500;
	let score = 0;
	switch ((feedback || '').toLowerCase()) {
		case 'love': { score = 1; break; }
		case 'hate': { score = -1; break; }
		default: { score = 0; break; }
	}
	return Promise.serial(mbid,
		(recording_mbid) => send({
			method: 'POST',
			URL: 'https://api.listenbrainz.org/1/feedback/recording-feedback',
			requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
			body: JSON.stringify({ 'recording_mbid': recording_mbid, 'score': score })
		}).then(
			(resolve) => {
				if (resolve) {
					const response = JSON.parse(resolve);
					return response.status === 'ok';
				}
				return false;
			},
			(reject) => {
				if (!bRetry) { console.log('sendFeedback: ' + reject.status + ' ' + reject.responseText); }
				else { console.log('sendFeedback: Retrying request for ' + recording_mbid + ' to server on ' + retryMs + ' ms...'); }
				return bRetry ? Promise.wait(retryMs).then(() => this.sendFeedback([recording_mbid], feedback, token, bLookupMBIDs, true, false)) : false;
			}
		)
		, rate)
		.then((results) => {
			if (results.length === 1 && !bRetry) {
				return Promise.wait(retryMs).then(() => results[0]);
			} else {
				const passed = results.filter(Boolean).length;
				const nError = mbidLen - passed;
				console.log('sendFeedback: ' + mbidLen + ' tracks' + (nError ? ' (' + nError + ' failed)' : ''));
				if (!missingCount && nError && !byMbid) {
					let report = ['List of failed tracks:'];
					results.forEach((result, i) => {
						if (!result) { report.push(handleList[i].RawPath); }
					});
					console.log(report.join('\n\t')); // DEBUG
				}
				return results;
			}
		}, (error) => {
			console.log(error.message); // DEBUG
			return false;
		});
};
/**
 * Retrieves feedback data (hate/love) for a handleList
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/recordings.html#get--1-feedback-user-(user_name)-get-feedback-for-recordings}
 * @name getFeedback
 * @kind method
 * @memberof ListenBrainz
 * @param {FbMetadbHandleList} handleList
 * @param {string} user
 * @param {string} token
 * @param {Boolean} [bLookupMBIDs=true] - Lookup MBIDs using API for tracks without such tag
 * @param {'GET'|'POST'} [method='GET'] - GET method has a 75 tracks limit
 * @returns {Promise.<{created:number, recording_mbid:string, rating:string }>}
 */
ListenBrainz.getFeedback = async function getFeedback(handleList, user, token, bLookupMBIDs = true, method = 'GET') {
	const bList = handleList instanceof FbMetadbHandleList;
	const mbid = bList
		? await this.getMBIDs(handleList, token, bLookupMBIDs)
		: handleList;
	const mbidSend = mbid.filter(Boolean);
	const missingCount = (bList ? handleList.Count : handleList.length) - mbidSend.length;
	if (missingCount) { console.log('Warning: some tracks don\'t have MUSICBRAINZ_TRACKID tag. Omitted ' + missingCount + ' tracks while getting feedback'); }
	if (mbidSend.Count > 70) { method = 'POST'; }
	const noData = { created: null, recording_mbid: null, recording_msid: null, score: 0, track_metadata: null, user_id: user };
	return (method === 'POST'
		? send({
			method: 'POST',
			URL: 'https://api.listenbrainz.org/1/feedback/user/' + user + '/get-feedback-for-recordings',
			requestHeader: [['Authorization', 'Token ' + token]],
			body: JSON.stringify({ recording_mbids: mbidSend.join(',') })
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
				if (Object.hasOwn(response, 'feedback')) {
					// Add null data to holes, so response respects input length
					const feedback = mbid.map((m) => {
						return { ...noData, ...{ recording_mbid: m || null } };
					});
					// And insert data, since it doesn't respect original sorting
					response.feedback.forEach((responseData) => {
						const idx = feedback.findIndex((data) => data.recording_mbid === responseData.recording_mbid);
						if (idx !== -1) { feedback[idx] = responseData; }
					});
					return feedback;
				}
				return [];
			}
			return [];
		},
		(reject) => {
			console.log('getFeedback: ' + reject.status + ' ' + reject.responseText);
			if (reject.status === 400 && /No valid recording msid or recording mbid found/.test(reject.responseText)) {
				return mbid.map(() => { return { ...noData }; });
			}
			return [];
		}
	);
};
/**
 * Retrieves all feedback data (hate/love) for user
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/recordings.html#get--1-feedback-user-(user_name)-get-feedback}
 * @name getUserFeedback
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @param {{score:string, count:number, offset:number, metadata:Boolean }} params - For score, see {@link https://github.com/metabrainz/listenbrainz-server/blob/master/listenbrainz/db/model/recommendation_feedback.py}
 * @param {string} token
 * @param {Boolean} [bPaginated=true] - Retrieves all values using automatic pagination
 * @returns {Promise.<{created:number, recording_mbid:string, rating:string }>}
 */
ListenBrainz.getUserFeedback = function getUserFeedback(user, params = {/*score, count, offset, metadata*/ }, token = '', bPaginated = true) {
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
		const queryParams = Object.keys(params).length ? '?' + Object.entries(params).map((pair) => { return pair[0] + '=' + pair[1]; }).join('&') : '';
		return send({
			method: 'GET',
			URL: 'https://api.listenbrainz.org/1/feedback/user/' + user + '/get-feedback' + queryParams,
			requestHeader: [['Authorization', 'Token ' + token]],
			bypassCache: true
		}).then(
			(resolve) => {
				if (resolve) {
					const response = JSON.parse(resolve);
					if (Object.hasOwn(response, 'feedback')) {
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
};

/* Tracks info */

/**
 * Retrieves all metadata from ListenBrainz for an artist/title tag list.
 * Output may not have the same length/sorting than input, but every element contains a property indicating the original index.
 * @see {@link https://labs.api.listenbrainz.org/mbid-mapping}
 * @overload
 * @param {[artist:string[], title:string[]]} handleList
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{index:number,(keys:string):any}[]>}
 */
/**
 * Retrieves all metadata from ListenBrainz for a handle list.
 * Output may not have the same length/sorting than input, but every element contains a property indicating the original index.
 * @see {@link https://labs.api.listenbrainz.org/mbid-mapping}
 * @overload
 * @param {FbMetadbHandleList} handleList
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{index:number,(keys:string):any}[]>}
 */
/**
 * @name lookupTracks
 * @kind method
 * @memberof ListenBrainz
 * @param {FbMetadbHandleList|[artist:string[], title:string[]]} handleList
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{index:number,(keys:string):any}[]>}
 */
ListenBrainz.lookupTracks = function lookupTracks(handleList, token, bAlbumArtist = true) {
	const bList = handleList instanceof FbMetadbHandleList;
	const count = bList ? handleList.Count : handleList[0].length;
	if (!count) { console.log('lookupTracks: no tracks provided'); return Promise.resolve([]); }
	if (!bList && count !== handleList[1].length) { console.log('lookupTracks: no tags provided'); return Promise.resolve([]); }
	const [artist, title] = bList ? getHandleListTagsV2(handleList, [bAlbumArtist ? 'ALBUM ARTIST' : 'ARTIST', 'TITLE']) : handleList;
	const data = new Array(count).fill({});
	data.forEach((_, i, thisArr) => {
		thisArr[i] = {};
		thisArr[i]['artist_credit_name'] = thisArr[i]['[artist_credit_name]'] = artist[i].join(', ');
		thisArr[i]['recording_name'] = thisArr[i]['[recording_name]'] = title[i].join(', ');
	});
	return send({
		method: 'POST',
		URL: 'https://labs.api.listenbrainz.org/mbid-mapping/json',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			if (resolve) { // Ensure it matches the ID
				const response = JSON.parse(resolve);
				console.log('lookupTracks: found ' + response.length + '/' + count + ' items');
				return response; // Response may contain fewer items than original list
			}
			return [];
		},
		(reject) => {
			console.log('lookupTracks: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
};
/**
 * Retrieves specific metadata from ListenBrainz for an artist/title tag list.
 * Output has the same length/sorting than input, but some tracks/tags may have missing values.
 * @see {@link ListenBrainz.lookupTracks}
 * @overload
 * @param {[artist:string[], title:string[]]} handleList
 * @param {string[]} [infoNames=['recording_mbid']]
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{(keys:string):string[][]}[]>}
 */
/**
 * Retrieves specific metadata from ListenBrainz for a handle list.
 * Output has the same length/sorting than input, but some tracks/tags may have missing values.
 * @see {@link ListenBrainz.lookupTracks}
 * @overload
 * @param {FbMetadbHandleList} handleList
 * @param {string[]} [infoNames=['recording_mbid']]
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{(keys:string):string[][]}[]>}
 */
/**
 * @name lookupRecordingInfo
 * @kind method
 * @memberof ListenBrainz
 * @param {FbMetadbHandleList|[artist:string[], title:string[]]} handleList
 * @param {string[]} [infoNames=['recording_mbid']]
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{(keys:string):string[][]}[]>}
 */
ListenBrainz.lookupRecordingInfo = function lookupRecordingInfo(handleList, infoNames = ['recording_mbid'], token = '', bAlbumArtist = true) {
	const allInfo = [
		'artist_credit_arg', 'artist_credit_id', 'artist_credit_name',
		'artist_mbids', 'index', 'match_type', 'recording_arg', 'recording_mbid',
		'recording_name', 'release_mbid', 'release_name', 'year'
	];
	if (!infoNames || !infoNames.length) { infoNames = allInfo; }
	return this.lookupTracks(handleList, token, bAlbumArtist).then(
		(resolve) => {
			const info = {};
			const count = handleList instanceof FbMetadbHandleList ? handleList.Count : handleList[0].length;
			infoNames.forEach((tag) => { info[tag] = new Array(count).fill(''); });
			if (resolve.length) {
				infoNames.forEach((tag) => {
					if (allInfo.includes(tag)) {
						resolve.forEach((obj) => { info[tag][obj.index] = obj[tag]; });
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
};
/**
 * Shorthand for lookupRecordingInfo when looking only for 'recording_mbid'.
 * Output has the same length/sorting than input, but some tracks/tags may have missing values.
 * @see {@link ListenBrainz.lookupTracks}
 * @overload
 * @param {[artist:string[], title:string[]]} handleList
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{(keys:string):string[][]}[]>}
 */
/**
 * Shorthand for lookupRecordingInfo when looking only for 'recording_mbid'.
 * Output has the same length/sorting than input, but some tracks/tags may have missing values.
 * @see {@link ListenBrainz.lookupTracks}
 * @overload
 * @param {FbMetadbHandleList} handleList
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{(keys:string):string[][]}[]>}
 */
/**
 * @name lookupMBIDs
 * @kind method
 * @memberof ListenBrainz
 * @param {FbMetadbHandleList|[artist:string[], title:string[]]} handleList
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{(keys:string):string[][]}[]>}
 */
ListenBrainz.lookupMBIDs = function lookupMBIDs(handleList, token, bAlbumArtist = true) {
	return this.lookupTracks(handleList, token, bAlbumArtist).then(
		(resolve) => {
			if (resolve.length) {
				const count = handleList instanceof FbMetadbHandleList ? handleList.Count : handleList[0].length;
				const MBIDs = new Array(count).fill('');
				resolve.forEach((obj) => { MBIDs[obj.index] = obj.recording_mbid; });
				return MBIDs; // Response may contain fewer items than original list
			}
			return [];
		},
		(reject) => {
			console.log('lookupMBIDs: ' + reject);
			return [];
		}
	);
};
/**
 * Shorthand for lookupRecordingInfo when looking only for 'artist_mbids'.
 * Output has the same length/sorting than input, but some tracks/tags may have missing values.
 * @see {@link ListenBrainz.lookupTracks}
 * @overload
 * @param {[artist:string[], title:string[]]} handleList
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{(keys:string):string[][]}[]>}
 */
/**
 * Shorthand for lookupRecordingInfo when looking only for 'artist_mbids'.
 * Output has the same length/sorting than input, but some tracks/tags may have missing values.
 * @see {@link ListenBrainz.lookupTracks}
 * @overload
 * @param {FbMetadbHandleList} handleList
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{(keys:string):string[][]}[]>}
 */
/**
 * @name lookupArtistMBIDs
 * @kind method
 * @memberof ListenBrainz
 * @param {FbMetadbHandleList|[artist:string[], title:string[]]} handleList
 * @param {string} token
 * @param {Boolean} [bAlbumArtist=true] - Prefer ALBUM ARTIST instead of ARTIST tags for lookup
 * @returns {Promise.<{(keys:string):string[][]}[]>}
 */
ListenBrainz.lookupArtistMBIDs = function lookupArtistMBIDs(handleList, token, bAlbumArtist = true) {
	return this.lookupTracks(handleList, token, bAlbumArtist).then(
		(resolve) => {
			if (resolve.length) {
				const count = handleList instanceof FbMetadbHandleList ? handleList.Count : handleList[0].length;
				const MBIDs = new Array(count).fill('');
				resolve.forEach((obj) => { MBIDs[obj.index] = obj.artist_mbids; });
				return MBIDs; // Response may contain fewer items than original list
			}
			return [];
		},
		(reject) => {
			console.log('lookupArtistMBIDs: ' + reject);
			return [];
		}
	);
};
/**
 * Same than {@link ListenBrainz.lookupTracks} but for a MBID recording list.
 * @see {@link https://labs.api.listenbrainz.org/recording-mbid-lookup}
 * @name lookupTracksByMBIDs
 * @kind method
 * @memberof ListenBrainz
 * @param {string[]} MBIDs
 * @param {string} token
 * @returns {Promise.<{index:number,(keys:string):any}[]>}
 */
ListenBrainz.lookupTracksByMBIDs = function lookupTracksByMBIDs(MBIDs, token) {
	const count = MBIDs.length;
	if (!count) { console.log('lookupTracksByMBIDs: no MBIDs provided'); return Promise.resolve([]); }
	const data = new Array(count).fill({});
	data.forEach((_, i, thisArr) => {
		thisArr[i] = {};
		// Old and new API just to be safe
		thisArr[i]['[recording_mbid]'] = thisArr[i]['recording_mbid'] = MBIDs[i];
	});
	return send({
		method: 'POST',
		URL: 'https://labs.api.listenbrainz.org/recording-mbid-lookup/json',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		body: JSON.stringify(data)
	}).then(
		(resolve) => {
			if (resolve) { // Ensure it matches the ID
				const response = JSON.parse(resolve);
				console.log('lookupTracksByMBIDs: found ' + response.length + '/' + count + ' items');
				return response; // Response should contain same items than original list
			}
			return [];
		},
		(reject) => {
			console.log('lookupTracksByMBIDs: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
};
/**
 * Same than {@link ListenBrainz.lookupRecordingInfo} for a MBID recording list.
 * Output has the same length/sorting than input, but some tracks/tags may have missing values.
 * @see {@link ListenBrainz.lookupTracksByMBIDs}
 *
 * @example
 * // Check Output with
 * if (infoNames.every((tag) => info.hasOwnProperty(tag))) {...}
 * @name lookupRecordingInfoByMBIDs
 * @kind method
 * @memberof ListenBrainz
 * @param {string[]} MBIDs
 * @param {string[]} [infoNames=['recording_mbid','recording_name','artist_credit_name']]
 * @param {string} token
 * @returns {Promise.<{index:number,(keys:string):any}[]>}
 */
ListenBrainz.lookupRecordingInfoByMBIDs = function lookupRecordingInfoByMBIDs(MBIDs, infoNames = ['recording_mbid', 'recording_name', 'artist_credit_name'], token = '') {
	const count = MBIDs.length;
	if (!count) { console.log('lookupRecordingInfoByMBIDs: no MBIDs provided'); return Promise.resolve({}); }
	const allInfo = [
		'recording_mbid', 'recording_name', 'length', 'artist_credit_id',
		'artist_credit_name', 'artist_credit_mbids',
		'canonical_recording_mbid', 'original_recording_mbid'
	];
	if (!infoNames || !infoNames.length) { infoNames = allInfo; }
	return this.lookupTracksByMBIDs(MBIDs, token).then(
		(resolve) => {
			const info = {};
			infoNames.forEach((tag) => { info[tag] = new Array(count).fill(''); });
			if (resolve.length) {
				infoNames.forEach((tag) => {
					if (allInfo.includes(tag)) {
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
};

/* Lookup recordings */

/**
 * To use along {@link ListenBrainz.retrieveSimilarArtists}
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#get--1-lb-radio-tags}
 * @name getEntitiesByTag
 * @kind method
 * @memberof ListenBrainz
 * @param {string[]} tagsArr - The MusicBrainz tag to fetch recordings for.
 * @param {string} token
 * @param {'artist'|null} [type='artist']
 * @param {number} [count=50] - Max number of recordings to return (may return less)
 * @param {'or'|'and'} [operator='or'] - Specify AND to retrieve recordings that have all the tags, otherwise specify OR to retrieve recordings that have any one of the tags.
 * @param {[number, number]} [popularity=[0,75]] -Measure of the recording’s popularity, preferred lower and upper bounds on the popularity of recordings to be returned.
 * @returns {Promise.<{recording_mbid:string}[]>}
 */
ListenBrainz.getEntitiesByTag = function getEntitiesByTag(tagsArr, token, type = 'artist', count = 50, operator = 'or', popularity = [0, 75]) {
	const queryParams = tagsArr.map((tag) => 'tag=' + encodeURIComponent(tag.toLowerCase())).join('&')
		+ '&operator=' + (operator || 'or').toLowerCase();
	return send({
		method: 'GET',
		URL: 'https://api.listenbrainz.org/1/lb-radio/tags?' + queryParams + '&pop_begin=' + popularity[0] + '&pop_end=' + popularity[1] + '&count=' + count,
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response) {
					if (type) {
						if (Object.hasOwn(response, type)) {
							console.log('getEntitiesByTag: found ' + response[type].length + ' items');
							return response[type]; // [{recording_mbid}, ...]
						}
						console.log('getEntitiesByTag: type not found - ' + type);
					} else {
						console.log('getEntitiesByTag: [all types] found items');
						return response; // [{recording_mbid}, ...]
					}
				}
			}
			return [];
		},
		(reject) => {
			console.log('getEntitiesByTag: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
};
/**
 * Meant to be used along {@link ListenBrainz.retrieveSimilarArtists}, to retrieve a list of recordings from artist similar to a reference.
 * @see {@link ListenBrainz.getEntitiesByTag}
 * @name getRecordingsByTag
 * @kind method
 * @memberof ListenBrainz
 * @param {string[]} tagsArr - The MusicBrainz tag to fetch recordings for.
 * @param {string} token
 * @param {number} [count=50] - Max number of recordings to return (may return less)
 * @param {'or'|'and'} [operator='or'] - Specify AND to retrieve recordings that have all the tags, otherwise specify OR to retrieve recordings that have any one of the tags.
 * @param {[number, number]} [popularity=[0,75]] -Measure of the recording’s popularity, preferred lower and upper bounds on the popularity of recordings to be returned.
 * @returns {Promise.<{recording_mbid:string}[]>}
 */
ListenBrainz.getRecordingsByTag = function getRecordingsByTag(tagsArr, token, count = 50, operator = 'or', popularity = [0, 75]) {
	return this.getEntitiesByTag(tagsArr, token, null, count, operator, popularity);
};

/* Statistics */

/**
 * Retrieves the most popular recordings for a given ListenBrainz user (or globally).
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/statistics.html#get--1-stats-user-(user_name)-artists}
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/statistics.html#get--1-stats-sitewide-recordings}
 * @name getTopRecordings
 * @kind method
 * @memberof ListenBrainz
 * @param {string} [user='sitewide'] - Use 'sitewide' for global stats.
 * @param {{count:number, offset:number, range:number}} params - Range allowed 'this_week'|'this_month'|'this_year'|'week'|'month'|'quarter'|'year'|'half_yearly'|'all_time'
 * @param {string} token
 * @returns {Promise.<{artist_mbids:string[], artist_name:string, caa_id:string, caa_release_mbid:string, listen_count:number, recording_mbid:string, release_mbid:string, release_name:string, track_name:string}[]>}
 */
ListenBrainz.getTopRecordings = function getTopRecordings(user = 'sitewide', params = {/*count, offset, range*/ }, token = '') {
	if (!user) { console.log('getTopRecordings: no user provided'); return Promise.resolve([]); }
	const queryParams = Object.keys(params).length
		? '?' + Object.entries(params).map((pair) => pair[0] + '=' + pair[1]).join('&')
		: '';
	return send({
		method: 'GET',
		URL: 'https://api.listenbrainz.org/1/stats/' + (user.toLowerCase() === 'sitewide' ? 'sitewide' : 'user/' + user) + '/recordings' + queryParams,
		requestHeader: [['Authorization', 'Token ' + token]],
		bypassCache: true
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response && Object.hasOwn(response, 'payload') && Object.hasOwn(response.payload, 'recordings')) {
					return response.payload.recordings; /* {artist_mbids: [], artist_name, caa_id, caa_release_mbid, listen_count, recording_mbid, release_mbid, release_name, track_name} */ // NOSONAR
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
};
/**
 * Retrieves recommended recordings sorted on rating and ratings for an user.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/recommendation.html#post--1-recommendation-feedback-submit}
 * @name getRecommendedRecordings
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @param {{artist_type:string, count:number, offset:number}} params
 * @param {string} token
 * @returns {Promise.<{recording_mbid:string, score:number}[]>}
 */
ListenBrainz.getRecommendedRecordings = function getRecommendedRecordings(user, params = { artist_type: 'top' /*count, offset*/ }, token = '') {
	if (!user) { console.log('getRecommendedRecordings: no user provided'); return Promise.resolve([]); }
	const queryParams = Object.keys(params).length
		? '?' + Object.entries(params).map((pair) => { return pair[0] + '=' + pair[1]; }).join('&')
		: '';
	return send({
		method: 'GET',
		URL: 'https://api.listenbrainz.org/1/cf/recommendation/user/' + user + '/recording' + queryParams,
		requestHeader: [['Authorization', 'Token ' + token]],
		bypassCache: true
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response && Object.hasOwn(response, 'payload') && Object.hasOwn(response.payload, 'mbids')) {
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
};
/**
 * Retrieves user recommendation playlists without recordings
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#get--1-user-(playlist_user_name)-playlists-createdfor}
 * @name retrieveUserRecommendedPlaylistsNames
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @param {{count:number, offset:number }} params
 * @param {string} token
 * @param {Boolean} [bPaginated=true] - Retrieves all values using automatic pagination
 * @returns {Promise.<jspfPlaylist[]>} Playlists metadata without recordings
 */
ListenBrainz.retrieveUserRecommendedPlaylistsNames = function retrieveUserRecommendedPlaylistsNames(user, params = {/*count, offset*/ }, token = '', bPaginated = true) {
	if (!user) { console.log('retrieveUserRecommendedPlaylistsNames: no user provided'); return Promise.resolve([]); }
	if (bPaginated) {
		return paginatedFetch({
			URL: 'https://api.listenbrainz.org/1/user/' + user + '/playlists/createdfor',
			queryParams: params,
			keys: ['playlists'],
			requestHeader: [['Authorization', 'Token ' + token]],
			increment: params.count,
		}).then(
			(response) => response,
			(reject) => {
				console.log('retrieveUserRecommendedPlaylistsNames: ' + reject);
				return [];
			}
		);
	} else {
		const queryParams = Object.keys(params).length
			? '?' + Object.entries(params).map((pair) => { return pair[0] + '=' + pair[1]; }).join('&')
			: '';
		return send({
			method: 'GET',
			URL: 'https://api.listenbrainz.org/1/user/' + user + '/playlists/createdfor' + queryParams,
			requestHeader: [['Authorization', 'Token ' + token]],
			bypassCache: true
		}).then(
			(resolve) => {
				if (resolve) {
					const response = JSON.parse(resolve);
					if (Object.hasOwn(response, 'playlists')) {
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
};
/**
 * To use along {@link ListenBrainz.retrieveSimilarArtists}
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/popularity.html#get--1-popularity-top-recordings-for-artist-(artist_mbid)}
 * @name getPopularRecordingsByArtist
 * @kind method
 * @memberof ListenBrainz
 * @param {string[]} artist_mbids
 * @param {string} token
 * @param {number} count
 * @returns {Promise.<{artist_mbids:string[], count:number, recording_mbid:string}[]>}
 */
ListenBrainz.getPopularRecordingsByArtist = function getPopularRecordingsByArtist(artist_mbids, token, count = 50) {
	if (!artist_mbids || !artist_mbids.filter(Boolean).length) { console.log('getPopularRecordingsByArtist: no artist_mbids provided'); return Promise.resolve([]); }
	return Promise.parallel(
		artist_mbids,
		(mbid) => send({
			method: 'GET',
			URL: 'https://api.listenbrainz.org/1/popularity/top-recordings-for-artist/' + mbid,
			requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]]
		})
		, 5
	).then((results) => {
		return results.map((response) => {
			if (response.status === 'rejected') {
				console.log('getPopularRecordingsByArtist: rejected ' + JSON.stringify(response.reason));
				return null;
			}
			return JSON.parse(response.value).slice(0, count);
		}).filter(Boolean).flat(Infinity);
	}).then((response) => {
		console.log('getPopularRecordingsByArtist: found ' + response.length + ' items');
		return response; // [{artist_mbids, count, recording_mbid}, ...]
	}).catch((reason) => {
		console.log('getPopularRecordingsByArtist: error ' + reason);
		return [];
	});
};

/* Similarity */

/**
 * Output similar artists (based on listening sessions) to the ones provided by MBIDs
 * @see {@link https://labs.api.listenbrainz.org/similar-artists}
 * @name retrieveSimilarArtists
 * @kind method
 * @memberof ListenBrainz
 * @param {string[]} artistMbids - Array of artist MBIDs
 * @param {string} token - ListenBrainz user token
 * @param {('v1'|'v2')} algorithm - [='v1'] see {@link ListenBrainz.algorithm.retrieveSimilarArtists} for further information
 * @param {boolean} bRetry - [=true] Tries v2 algorithm is the lookup doesnt return at least 5 results
 * @returns {Promise<{ {artist_mbid: string, comment:string, gender: string, name: string, reference_mbid: string, score: number, type: string }[]}>}
 */
ListenBrainz.retrieveSimilarArtists = function retrieveSimilarArtists(artistMbids, token, algorithm = 'v1', bRetry = true) {
	if (!artistMbids || !artistMbids.length) { console.log('retrieveSimilarArtists: no artistMbids provided'); return Promise.resolve([]); }
	if (Object.hasOwn(this.algorithm.retrieveSimilarArtists, algorithm.toLowerCase())) {
		algorithm = this.algorithm.retrieveSimilarArtists[algorithm.toLowerCase()];
	}
	const data = [{
		'artist_mbid': Array.isArray(artistMbids) ? artistMbids[0] : artistMbids,
		'artist_mbids': Array.isArray(artistMbids) ? artistMbids : [artistMbids],
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
				const response = JSON.parse(resolve) || [];
				if (response) {
					const count = response.length;
					if (count < 5 && bRetry && (algorithm !== 'v2' || algorithm !== this.algorithm.retrieveSimilarArtists.v2)) {
						console.log('retrieveSimilarArtists: not enough items found, retrying with v2 algorithm');
						return this.retrieveSimilarArtists(artistMbids, token, 'v2', false);
					} else if (count) {
						console.log('retrieveSimilarArtists: found ' + count + ' items');
						return response; // [{artist_mbid, comment, gender, name, reference_mbid, score, type}, ...]
					}
				}
			}
			return [];
		},
		(reject) => {
			console.log('retrieveSimilarArtists: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
};
/**
 * Output similar recordings (based on listening sessions) to the ones provided by MBIDs
 * @see {@link https://labs.api.listenbrainz.org/similar-recordings}
 * @name retrieveSimilarRecordings
 * @kind method
 * @memberof ListenBrainz
 * @param {string[]} recordingMBIDs - Array of recordings MBIDs
 * @param {string} token - ListenBrainz user token
 * @param {('v1')} algorithm - [='v1'] see {@link ListenBrainz.algorithm.retrieveSimilarRecordings} for further information
 * @returns {Promise<{{recording_mbid:string, recording_name:string, artist_credit_name:string, [artist_credit_mbids]:string[], caa_id:string, caa_release_mbid:string, canonical_recording_mbid:string, score:number, reference_mbid:string }[]}>}
 */
ListenBrainz.retrieveSimilarRecordings = function retrieveSimilarRecordings(recordingMBIDs, token, algorithm = 'v1') {
	if (!recordingMBIDs || !recordingMBIDs.length) { console.log('retrieveSimilarRecordings: no recordingMBIDs provided'); return Promise.resolve([]); }
	if (Object.hasOwn(this.algorithm.retrieveSimilarRecordings, algorithm)) { algorithm = this.algorithm.retrieveSimilarRecordings[algorithm]; }
	const data = [{
		'recording_mbid': Array.isArray(recordingMBIDs) ? recordingMBIDs[0] : recordingMBIDs,
		'recording_mbids': Array.isArray(recordingMBIDs) ? recordingMBIDs : [recordingMBIDs],
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
				const response = JSON.parse(resolve) || [];
				if (response.length) {
					console.log('retrieveSimilarRecordings: found ' + response.length + ' items');
					return response; // [{recording_mbid, recording_name, artist_credit_name, [artist_credit_mbids], caa_id, caa_release_mbid, canonical_recording_mbid, score, reference_mbid}, ...]
				} else {
					console.log('retrieveSimilarRecordings: No similar recordings found');
				}
			}
			return [];
		},
		(reject) => {
			console.log('retrieveSimilarRecordings: ' + reject.status + ' ' + reject.responseText);
			return [];
		}
	);
};
/**
 * Output similar users (based on listening sessions) to user provided
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#get--1-user-(user_name)-similar-users}
 * @name retrieveSimilarUsers
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @param {string} token - ListenBrainz user token
 * @param {number} iThreshold - [=0.7] Minimum score
 * @returns {Promise<{{user_name:string, similarity:strin}[]}>}
 */
ListenBrainz.retrieveSimilarUsers = function retrieveSimilarUsers(user, token, iThreshold = 0.7) {
	if (!user || !user.length || !token || !token.length) { console.log('retrieveSimilarUsers: no user/token provided'); return Promise.resolve([]); }
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
				if (response && Object.hasOwn(response, 'payload')) {
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

/* Content resolver by MBID */

/**
 * Content resolver for JSPF playlists provided by ListenBrainz.
 * @name contentResolver
 * @kind method
 * @memberof ListenBrainz
 * @param {jspfPlaylist} jspf
 * @param {string} filter - Recommended 'NOT (%RATING% EQUAL 1 OR %RATING% EQUAL 2) AND NOT (GENRE IS live OR STYLE IS live)'
 * @param {string} sort
 * @param {boolean} [bOnlyMBID=false] - Wether find matches by fuzzy lookup or only using MBIDs.
 * @returns {{handleList:FbMetadbHandleList, handleArr:(FbMetadbHandle|void)[], notFound:{creator:string, title:string, identifier:string, artistIndentifier:string[]}}} handleList contains all items found, but it may have less items than the input. handleArr contains all items by input order, wether they are found (handles) or not (void). notFound may be used to identify missing items and directly look for them using {@link youTube.searchForYoutubeTrack}.
 */
ListenBrainz.contentResolver = function contentResolver(jspf, filter = '', sort = globQuery.remDuplBias, bOnlyMBID = false) {
	if (!jspf) { return null; }
	const profiler = this.bProfile ? new FbProfiler('ListenBrainz.contentResolver') : null;
	// Query cache (Library)
	// Makes consecutive playlist loading by queries much faster (for ex. .xspf fuzzy matching)
	const queryCache = new Map(); // {Query: handleList} // NOSONAR
	let handleArr = [];
	const notFound = [];
	const playlist = jspf.playlist;
	const rows = playlist.track;
	const rowsLength = rows.length;
	const lookupKeys = [
		{ xspfKey: 'identifier', queryKey: 'MUSICBRAINZ_TRACKID' },
		{ xspfKey: 'title', queryKey: 'TITLE' },
		{ xspfKey: 'creator', queryKey: 'ALBUM ARTIST' },
		{ xspfKey: 'creator', queryKey: 'ARTIST' }
	];
	const conditions = bOnlyMBID ? [['MUSICBRAINZ_TRACKID']] : [['MUSICBRAINZ_TRACKID'], ['TITLE', 'ARTIST'], ['TITLE', 'ALBUM ARTIST'], ['TITLE']];
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
		const artistIndentifier = Object.hasOwn(rowExt, 'artist_identifiers') && rowExt.artist_identifiers && rowExt.artist_identifiers.length
			? rowExt.artist_identifiers.map((val) => decodeURI(val).replace(this.regEx, ''))
			: [''];
		lookupKeys.forEach((look) => {
			const key = look.xspfKey;
			const queryKey = _q(sanitizeTagIds(_t(look.queryKey)));
			if (Object.hasOwn(row, key)) {
				const value = row[key];
				if (value && value.length) {
					if (key === 'identifier') { identifier = decodeURI(value).replace(this.regEx, ''); }
					lookup[look.queryKey] = queryKey + ' IS ' + this.sanitizeQueryValue(key === 'identifier' ? identifier : value);
				}
			}
		});
		for (let condition of conditions) {
			if (condition.every((tag) => { return lookup.hasOwnProperty(tag); })) { // eslint-disable-line no-prototype-builtins
				query = condition.map((tag) => { return lookup[tag]; }).join(' AND ');
				const matches = queryCache.has(query) ? queryCache.get(query) : (checkQuery(query, true) ? fb.GetQueryItems(libItems, query) : null);
				if (!queryCache.has(query)) { queryCache.set(query, matches); }
				if (matches && matches.Count) {
					if (sortTF) { matches.OrderByFormat(sortTF, -1); }
					handleArr[i] = matches[0];
					break;
				}
			}
		}
		if (!handleArr[i]) {
			notFound.push({ creator: rows[i].creator, title: rows[i].title, identifier /* str */, artistIndentifier /* [str, ...]*/ });
			handleArr[i] = void (0);
		}
	}
	if (notFound.length) { console.log('Some tracks have not been found on library:\n\t' + notFound.map((row) => row.creator + ' - ' + row.title + ': ' + row.identifier).join('\n\t')); }
	if (this.bProfile) { profiler.Print(''); }
	return { handleList: new FbMetadbHandleList(handleArr.filter((n) => n)), handleArr, notFound };
};
/**
 * Helper to sanitize values for query usage within foobar2000.
 * @name sanitizeQueryValue
 * @kind method
 * @memberof ListenBrainz
 * @param {string} value
 * @returns {string}
 */
ListenBrainz.sanitizeQueryValue = function sanitizeQueryValue(value) {
	return sanitizeQueryVal(sanitizeTagValIds(value));
};

/* User related */

/**
 * Retrieves user playlists without recordings
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#get--1-user-(playlist_user_name)-playlists}
 * @name retrieveUserPlaylistsNames
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @param {{count:number, offset:number }} params
 * @param {string} token
 * @param {Boolean} [bPaginated=true] - Retrieves all values using automatic pagination
 * @returns {Promise.<jspfPlaylist[]>} Playlists metadata without recordings
 */
ListenBrainz.retrieveUserPlaylistsNames = function retrieveUserPlaylistsNames(user, params = {/* count, offset*/ }, token = '', bPaginated = true) {
	if (!user || !user.length || !token || !token.length) { console.log('retrieveUserPlaylistsNames: no user/token provided'); return Promise.resolve(null); }
	if (bPaginated) {
		return paginatedFetch({
			URL: 'https://api.listenbrainz.org/1/user/' + user + '/playlists',
			queryParams: params,
			keys: ['playlists'],
			requestHeader: [['Authorization', 'Token ' + token]],
			increment: params.count,
		}).then(
			(response) => response,
			(reject) => {
				console.log('retrieveUserPlaylistsNames: ' + reject);
				return [];
			}
		);
	} else {
		const queryParams = Object.keys(params).length ? '?' + Object.entries(params).map((pair) => { return pair[0] + '=' + pair[1]; }).join('&') : '';
		return send({
			method: 'GET',
			URL: 'https://api.listenbrainz.org/1/user/' + user + '/playlists' + queryParams,
			requestHeader: [['Authorization', 'Token ' + token]],
			bypassCache: true
		}).then(
			(resolve) => {
				const response = JSON.parse(resolve);
				if (Object.hasOwn(response, 'playlists')) {
					return response.playlists.map((pls) => {
						pls.date = new Date(pls.date);
						if (!Object.hasOwn(pls, 'extension')) { pls.extension = { [this.jspfExt]: {} }; }
						else if (!Object.hasOwn(pls.extension, this.jspfExt)) { pls.extension[this.jspfExt] = {}; }
						const ext = pls.extension[this.jspfExt];
						if (!ext.last_modified_at) { ext.last_modified_at = new Date(pls.date); }
						else { ext.last_modified_at = new Date(ext.last_modified_at); }
					});
				}
				return [];
			},
			(reject) => {
				console.log('retrieveUserPlaylistsNames: ' + reject.status + ' ' + reject.responseText);
				return [];
			}
		);
	}
};
/**
 * Validates token and returns associated user.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#get--1-validate-token}
 * @name retrieveUserResponse
 * @kind method
 * @memberof ListenBrainz
 * @param {string} token
 * @param {Boolean} [bLog=true] - Log errors
 * @returns {Promise.<{code:number, message:string, valid:boolean, user_name?:string}|null>}
 */
ListenBrainz.retrieveUserResponse = function retrieveUserResponse(token, bLog = true) {
	if ((!token || !token.length) && bLog) { console.log('retrieveUserResponse: no token provided'); return Promise.resolve(null); }
	return send({
		method: 'GET',
		URL: 'https://api.listenbrainz.org/1/validate-token?token=' + token,
		bypassCache: true
	}).then(
		(resolve) => {
			return JSON.parse(resolve);
		},
		(reject) => {
			if (bLog) { console.log('retrieveUserResponse: ' + JSON.stringify(reject)); }
			return reject.status === 12007
				? { code: 12007, message: 'Network error', valid: null }
				: null;
		}
	);
};
/**
 * Returns user associated to given token.
 * @see {@link ListenBrainz.retrieveUserResponse}
 * @name retrieveUser
 * @kind method
 * @memberof ListenBrainz
 * @param {string} token
 * @param {Boolean} [bLog=true] - Log errors
 * @returns {Promise.<string>}
 */
ListenBrainz.retrieveUser = async function retrieveUser(token, bLog = true) {
	let user = this.cache.user.get(token);
	if (!user) {
		const response = await this.retrieveUserResponse(token, bLog);
		user = response && response.valid ? response.user_name : '';
		if (user.length) { this.cache.user.set(token, response.user_name); }
	}
	return user;
};
/**
 * Retrieves user playlists with recordings
 * @see {@link ListenBrainz.retrieveUserResponse}
 * @name retrieveUserPlaylists
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @param {string} token
 * @returns {Promise.<jspfPlaylist[]>} Playlists with recordings
 */
ListenBrainz.retrieveUserPlaylists = function retrieveUserPlaylists(user, token) {
	if (!user || !user.length || !token || !token.length) { console.log('retrieveUserPlaylists: no user/token provided'); return Promise.resolve([]); }
	return this.retrieveUserPlaylistsNames(user, token).then(
		(playlists) => {
			const jsfpArr = playlists.map((pls) => { return this.importPlaylist(pls.identifier.replace(this.regEx, '')); });
			return Promise.all(jsfpArr);
		},
		(reject) => {
			console.log('retrieveUserPlaylists: ' + JSON.stringify(reject));
			return [];
		}
	);
};
/**
 * Follows an user (with the user associated to the given token).
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/social.html#post--1-user-(user_name)-follow}
 * @name followUser
 * @kind method
 * @memberof ListenBrainz
 * @param {string} userToFollow
 * @param {string} token
 * @returns {Promise.<boolean>}
 */
ListenBrainz.followUser = function followUser(userToFollow, token) {
	if (!userToFollow || !userToFollow.length || !token || !token.length) { console.log('followUser: no user/token provided'); return Promise.resolve(null); }
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
					if (!following.includes(userToFollow)) {
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
/**
 * Unfollows an user (with the user associated to the given token).
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/social.html#post--1-user-(user_name)-unfollow}
 * @name unFollowUser
 * @kind method
 * @memberof ListenBrainz
 * @param {string} userToUnfollow
 * @param {string} token
 * @returns {Promise.<boolean>}
 */
ListenBrainz.unFollowUser = function unFollowUser(userToUnfollow, token) {
	if (!userToUnfollow || !userToUnfollow.length || !token || !token.length) { console.log('unFollowUser: no user/token provided'); return Promise.resolve(null); }
	return send({
		method: 'POST',
		URL: 'https://api.listenbrainz.org/1/user/' + userToUnfollow + '/unfollow',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]]
	}).then(
		(resolve) => {
			console.log('unFollowUser: ' + userToUnfollow + ' -> ' + resolve);
			if (resolve) {
				const bDone = JSON.parse(resolve).status === 'ok';
				if (bDone && this.cache.user.has(token)) {
					const user = this.cache.user.get(token);
					const following = this.cache.following.get(user) || [];
					const idx = following.indexOf(userToUnfollow);
					if (idx !== -1) { following.splice(idx, 1); }
				}
				return bDone;
			}
			return false;
		},
		(reject) => {
			console.log('unFollowUser: ' + userToUnfollow + ' -> ' + reject.status + ' ' + reject.responseText);
			return reject.status === 400;
		}
	);
};
/**
 * Retrieves following list for a given user. Results are cached for later usage of {@link ListenBrainz.isFollowing}.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/social.html#post--1-user-(user_name)-follow}
 * @name retrieveFollowing
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @param {string} token
 * @returns {Promise.<string[]>}
 */
ListenBrainz.retrieveFollowing = function retrieveFollowing(user, token) {
	if (!user || !user.length || !token || !token.length) { console.log('retrieveFollowing: no user/token provided'); return Promise.resolve([]); }
	return send({
		method: 'GET',
		URL: 'https://api.listenbrainz.org/1/user/' + user + '/following',
		requestHeader: [['Authorization', 'Token ' + token]],
		bypassCache: true
	}).then(
		(resolve) => {
			const response = JSON.parse(resolve); // {user, following: []}
			if (Object.hasOwn(response, 'user') && response.user === user && Object.hasOwn(response, 'following')) {
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
/**
 * Checks if user follows another user. Following list must be retrieved first.
 * @see {@link ListenBrainz.retrieveFollowing}
 * @name isFollowing
 * @kind method
 * @memberof ListenBrainz
 * @param {string} toUser
 * @param {string} token
 * @returns {Promise.<boolean>}
 */
ListenBrainz.isFollowing = function isFollowing(toUser, token) {
	const user = this.cache.user.get(token);
	const following = user ? this.cache.following.get(user) || [] : [];
	return following.includes(toUser);
};
/**
 * Retrieves listens by given user within a specified time frame. Results are cached.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#get--1-user-(user_name)-listens}
 * @name retrieveListens
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @param {{max_ts:number, count?:number, min_ts?:number}} params - If no count is specified, it defaults to {@link ListenBrainz.MAX_ITEMS_PER_GET}
 * @param {string} token
 * @param {boolean} [bPaginated=true]
 * @returns {Promise.<{listened_at:number, track_metadata: {additional_info: {release_mbid?:string, artist_mbids?:string[],recording_mbid?:string, tags?:string[]}, artist_name:string, track_name:string, release_name?:string}}>}
 */
ListenBrainz.retrieveListens = function retrieveListens(user, params = { max_ts: Date.now() }, token = '', bPaginated = true) {
	if (!user || !user.length || !token || !token.length) { console.log('retrieveListens: no user/token provided'); return Promise.resolve(null); }
	if (!Object.hasOwn(params, 'count')) { params.count = this.MAX_ITEMS_PER_GET; }
	const cache = this.listensCache.get(user, params.max_ts, params.min_ts || this.LISTEN_MINIMUM_TS);
	if (cache) { return Promise.resolve(cache); }
	if (bPaginated) {
		return paginatedFetch({
			URL: 'https://api.listenbrainz.org/1/user/' + user + '/listens',
			queryParams: params,
			keys: ['payload', 'listens'],
			requestHeader: [['Authorization', 'Token ' + token]]
		}).then(
			(response) => {
				this.listensCache.set(user, response, params.max_ts, params.min_ts || this.LISTEN_MINIMUM_TS);
				return response;
			},
			(reject) => {
				console.log('retrieveListens: ' + reject);
				return [];
			}
		);
	} else {
		const queryParams = Object.keys(params).length ? '?' + Object.entries(params).map((pair) => { return pair[0] + '=' + pair[1]; }).join('&') : '';
		return send({
			method: 'GET',
			URL: 'https://api.listenbrainz.org/1/user/' + user + '/listens' + queryParams,
			requestHeader: [['Authorization', 'Token ' + token]],
			bypassCache: true
		}).then(
			(resolve) => {
				const response = JSON.parse(resolve);
				if (Object.hasOwn(response, 'payload')) {
					this.listensCache.set(user, response.payload.listens, params.max_ts, params.min_ts || this.LISTEN_MINIMUM_TS);
					return response.payload.listens;
				}
				return [];
			},
			(reject) => {
				console.log('retrieveListens: ' + reject.status + ' ' + reject.responseText);
				return [];
			}
		);
	}
};
/**
 * Retrieves listens for specific handle list by given user within a specified time frame. Listens are matched by MBID without any lookup. Results are cached.
 * @see {@link ListenBrainz.getMBIDs}
 * @see {@link ListenBrainz.retrieveListens}
 * @name retrieveListensForHandleList
 * @kind method
 * @memberof ListenBrainz
 * @param {FbMetadbHandleList} handleList
 * @param {string} user
 * @param {{max_ts:number, count?:number, min_ts?:number}} params - If no count is specified, it defaults to {@link ListenBrainz.MAX_ITEMS_PER_GET}
 * @param {string} token
 * @param {boolean} [bPaginated=true]
 * @returns {Promise.<string[][]>}
 */
ListenBrainz.retrieveListensForHandleList = function retrieveListensForHandleList(handleList, user, params = { max_ts: Date.now() }, token = '', bPaginated = true) {
	if (!user || !user.length || !token || !token.length) { console.log('retrieveListensForHandleList: no user/token provided'); return Promise.resolve(null); }
	if (!Object.hasOwn(params, 'count')) { params.count = this.MAX_ITEMS_PER_GET; }
	return this.retrieveListens(user, params, token, bPaginated)
		.then((listens) => {
			return this.getMBIDs(handleList, token, false).then((mbids) => {
				// Filter once entire list with all MBIDs to not iterate over entire listening history too many times
				listens = listens.filter((listen) => mbids.some((mbid) => listen.track_metadata.additional_info.recording_mbid === mbid));
				return listens.length
					? mbids.map((mbid) => listens.filter((listen) => listen.track_metadata.additional_info.recording_mbid === mbid))
					: mbids.map(() => []);
			});
		});
};

/* Services */

/**
 * Exports given playlist list (by MBID array) to an external service.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#post--1-playlist-(playlist_mbid)-export-(service)}
 * @overload
 * @name exportPlaylistToService
 * @kind method
 * @memberof ListenBrainz
 * @param {{playlist_mbid:string}[]} pls - Playlist object from Playlist manager
 * @param {string} service
 * @param {string} token
 * @param {boolean} bPublic - Should the exported playlist be public or not?
 * @returns {Promise.<boolean[]>}
 */
/**
 * Exports given playlist (by MBID) to an external service.
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#post--1-playlist-(playlist_mbid)-export-(service)}
 * @overload
 * @name exportPlaylistToService
 * @kind method
 * @memberof ListenBrainz
 * @param {{playlist_mbid:string}} pls - Playlist object from Playlist manager
 * @param {string} service
 * @param {string} token
 * @param {boolean} bPublic - Should the exported playlist be public or not?
 * @returns {Promise.<boolean>}
 */
/**
 * @name exportPlaylistToService
 * @kind method
 * @memberof ListenBrainz
 * @param {{playlist_mbid:string}|{playlist_mbid:string}[]} pls - Playlist object from Playlist manager
 * @param {string} service
 * @param {string} token
 * @param {boolean} [bPublic=false] - Should the exported playlist be public or not?
 * @returns {Promise.<boolean|boolean[]>}
 */
ListenBrainz.exportPlaylistToService = function exportPlaylistToService(pls, service, token, bPublic = false) {
	if (!token || !token.length || !service || !pls.playlist_mbid) { console.log('exportPlaylistToService: no pls/service/token provided'); return Promise.resolve(null); }
	if (Array.isArray(service)) {
		return Promise.serial(service,
			(s) => ListenBrainz.exportPlaylistToService(pls, s, token)
			, 50); // [{status, value}, ...]
	}
	const queryParams = bPublic ? '?bPublic=true' : '';
	return send({
		method: 'POST',
		URL: 'https://api.listenbrainz.org/1/playlist/' + pls.playlist_mbid + '/export/' + service + queryParams,
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
/**
 * Retrieves connected services to an user account
 * @see {@link https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#get--1-user-(user_name)-services}
 * @name getUserServices
 * @kind method
 * @memberof ListenBrainz
 * @param {string} user
 * @param {string} token
 * @returns {Promise.<boolean|boolean[]>}
 */
ListenBrainz.getUserServices = function getUserServices(user, token) {
	if (!user || !user.length || !token || !token.length) { console.log('getUserServices: no user/token provided'); return Promise.resolve([]); }
	const services = this.cache.services.get(user);
	return services || send({
		method: 'GET',
		URL: 'https://api.listenbrainz.org/1/user/' + user + '/services',
		requestHeader: [['Content-Type', 'application/json'], ['Authorization', 'Token ' + token]],
		bypassCache: true
	}).then(
		(resolve) => {
			const response = JSON.parse(resolve); // {"user_name": "hwnrwx", "services": ["spotify"]}
			if (Object.hasOwn(response, 'user_name') && response.user_name === user && Object.hasOwn(response, 'services')) {
				this.cache.services.set(user, response.services);
				return response.services; // ['spotify']
			}
			return [];
		},
		(reject) => {
			console.log('getUserServices: ' + JSON.stringify(reject));
			return [];
		}
	);
};

/* Token */

/**
 * Returns the user token without any encryption. Prompts the user to enter the password if needed the first time, then caches the results.
 * @name decryptToken
 * @kind method
 * @memberof ListenBrainz
 * @param {{lBrainzToken, bEncrypted:boolean}} args - By default bEncrypted is true
 * @returns {Promise.<string>}
 */
ListenBrainz.decryptToken = function decryptToken({ lBrainzToken, bEncrypted = true }) {
	if (bEncrypted && !this.cache.key) {
		let pass = '';
		try { pass = utils.InputBox(window.ID, 'Enter password:', window.Name, pass, true); }
		catch (e) { return null; }
		if (!pass.length) { return null; }
		this.cache.key = new SimpleCrypto(pass);
	}
	return (bEncrypted ? this.cache.key.decrypt(lBrainzToken) : lBrainzToken);
};
/**
 * Validates the token (and associated user)
 * @see {@link ListenBrainz.retrieveUserResponse}
 * @name validateToken
 * @kind method
 * @memberof ListenBrainz
 * @param {string} token
 * @param {boolean} bOmitNetworkError
 * @returns {Promise.<boolean|null>} Returns null if no response retrieved
 */
ListenBrainz.validateToken = async function validateToken(token, bOmitNetworkError = false) {
	const response = await this.retrieveUserResponse(token);
	return response // null | false | true
		? response.valid || bOmitNetworkError && response.code === 12007
		: null;
};