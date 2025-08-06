'use strict';
//06/08/25

/* exported ImportTextPlaylist */

include('..\\..\\helpers\\helpers_xxx.js');
/* global folders:readable, globTags:readable, globQuery:readable  */
include('..\\..\\helpers\\helpers_xxx_tags.js');
/* global sanitizeTagTfo:readable, queryJoin:readable, queryCache:readable, checkQuery:readable */
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
/* global capitalize:readable */
include('..\\..\\helpers\\helpers_xxx_file.js');
/* global _isFile:readable, _open:readable, checkCodePage:readable */
include('..\\..\\helpers\\helpers_xxx_playlists_files.js');
include('..\\..\\helpers\\helpers_xxx_web.js');
/* global send:readable */

const ImportTextPlaylist = Object.seal(Object.freeze({
	// queryFilters will apply different conditions to the possible matches, and the ones which satisfy more will be selected
	// duplicatesMask will filter the matches allowing only 1 track with same tags (no duplicates)
	// Note in rare cases multiple matches could pass through the filter:
	// Track A by Artist A -> (importTextPlaylist) -> output:
	// 		01 - Track A -> Artist: Artist A//Artist B
	// 		01 - Track A -> Artist: Artist A
	// Since the default filter compares title and artist, both tracks are 'different' since only one artist
	// is matched. Thus both tracks would be sent to the playlist. This behavior is preferred to only use
	// title on the filter by default, since there could be cases where a list has same titles by different artists:
	// Track A by Artist A
	// ...
	// Track A by Artist B
	/**
	 * Imports a text file and creates a playlist from it using a mask
	 *
	 * @property
	 * @name getPlaylist
	 * @kind method
	 * @memberof ImportTextPlaylist
	 * @param {string} path
	 * @param {string[]} formatMask
	 * @param {string} discardMask
	 * @param {string[]} queryFilters
	 * @param {string} sortBias
	 * @returns {Promise.<{idx: Number, handleList: FbMetadbHandleList, handleArr: FbMetadbHandle[], notFound: {idx, identifier, title, creator, tags}[]}>}
	 */
	getPlaylist: function getPlaylist({
		path = folders.data + 'playlistImport.txt',
		formatMask = ['', '. ', '%TITLE%', ' - ', globTags.artist],
		discardMask = '',
		queryFilters = [globQuery.noLiveNone, globQuery.notLowRating],
		sortBias = globQuery.remDuplBias
	} = {}) {
		const data = { idx: -1, handleList: new FbMetadbHandleList, handleArr: [], notFound: [] };
		return this.importFile(path)
			.then((text) => typeof text !== 'undefined' && text.length
				? { ...data, ...this.createPlaylist(text, formatMask, discardMask, queryFilters, sortBias) }
				: data
			);
	},
	/**
	 * Imports a text file and get handles from it using a mask
	 *
	 * @property
	 * @name getHandles
	 * @kind method
	 * @memberof ImportTextPlaylist
	 * @param {string} path
	 * @param {string[]} formatMask
	 * @param {string} discardMask
	 * @param {string[]} queryFilters
	 * @param {string} sortBias
	 * @returns {Promise.<{idx: Number, handleList: FbMetadbHandleList, handleArr: FbMetadbHandle[], notFound: {idx, identifier, title, creator, tags}[]}>}
	 */
	getHandles: function getHandles({
		path = folders.data + 'playlistImport.txt',
		formatMask = ['', '. ', '%TITLE%', ' - ', globTags.artist],
		discardMask = '',
		queryFilters = [globQuery.noLiveNone, globQuery.notLowRating],
		sortBias = globQuery.remDuplBias,
	} = {}) {
		const data = { handleList: new FbMetadbHandleList, handleArr: [], notFound: [] };
		return this.importFile(path)
			.then((text) => typeof text !== 'undefined' && text.length
				? this.getHandlesFromText(text, formatMask, discardMask, queryFilters, sortBias)
				: data
			);
	},
	/**
	 * Retrieves text from file or link
	 *
	 * @property
	 * @name importFile
	 * @kind method
	 * @memberof ImportTextPlaylist
	 * @param {string} path
	 * @returns {Promise.<string>}
	 */
	importFile: function importFile(path) {
		if (!path || !path.length) {
			console.log('ImportTexTPlaylist.importFile(): no file was provided');
			return Promise.resolve('');
		}
		if (_isFile(path)) {
			let text = _open(path);
			if (!text.length) { return Promise.resolve(''); }
			const codePage = checkCodePage(text.split(/\r\n|\n\r|\n|\r/), '.' + path.split('.').pop(), true);
			if (codePage !== -1) { text = _open(path, codePage); }
			return Promise.resolve(text || '');
		} else if (/https?:\/\/|www./.test(path)) {
			return send({
				method: 'GET',
				URL: path,
				bypassCache: true,
				type: 'text'
			}).then(
				(resolve) => resolve || '',
				(reject) => {
					if (reject.responseText.startsWith('Type mismatch')) {
						console.log('ImportTexTPlaylist.importFile(): could not retrieve any text from ' + path);
						console.log('ImportTexTPlaylist.importFile(): ' + reject.responseText);
					} else {
						console.log('HTTP error: ' + reject.status);
					}
					return '';
				}
			);
		} else { console.log('ImportTexTPlaylist.importFile(): file does not exist. ' + path); return Promise.resolve(''); }
	},
	/**
	 * Retrieves handle list and not found items (in a library) from a text file.
	 *
	 * @property
	 * @name createPlaylist
	 * @kind method
	 * @memberof ImportTextPlaylist
	 * @param {string} text
	 * @param {string[]} formatMask
	 * @param {string} discardMask
	 * @param {string[]} queryFilters
	 * @param {string} sortBias
	 * @returns {{handleList: FbMetadbHandleList, handleArr: FbMetadbHandle[], notFound: {idx, identifier, title, creator, tags}[]}}
	 */
	createPlaylist: function createPlaylist(text, formatMask, discardMask, queryFilters, sortBias) {
		let { handleList, handleArr, notFound } = this.getHandlesFromText(text, formatMask, discardMask, queryFilters, sortBias);
		let idx = -1;
		if (notFound.length) {
			const report = notFound.reduce((acc, line) => { return acc + (acc.length ? '\n' : '') + 'Line ' + line.idx + '-> ' + Object.keys(line.tags).map((key) => { return capitalize(key) + ': ' + line.tags[key]; }).join(', '); }, '');
			const reportPls = notFound.reduce((acc, line) => { return acc + (acc.length ? '\n' : '') + Object.keys(line.tags).map((key) => { return line.tags[key]; }).join(' - '); }, '');
			fb.ShowPopupMessage(reportPls, 'Not found list');
			fb.ShowPopupMessage(report, 'Tracks not found at source');
		}
		if (handleList.Count) {
			idx = plman.FindOrCreatePlaylist('Import', true);
			plman.UndoBackup(idx);
			plman.ClearPlaylist(idx);
			plman.InsertPlaylistItems(idx, 0, handleList);
			plman.ActivePlaylist = idx;
		} else {
			console.log('ImportTexTPlaylist.createPlaylist(): could not find any track with the given text');
		}
		return { idx, handleList, handleArr, notFound };
	},
	/**
	 * Retrieves handle list and not found items (in a library) from a text file.
	 *
	 * @property
	 * @name getHandlesFromText
	 * @kind method
	 * @memberof ImportTextPlaylist
	 * @param {string} text
	 * @param {string[]} formatMask
	 * @param {string} discardMask
	 * @param {string[]} queryFilters
	 * @param {string} sort
	 * @returns {{handleList: FbMetadbHandleList, handleArr: FbMetadbHandle[], notFound: {idx, identifier, title, creator, tags}[]}}
	 */
	getHandlesFromText: function getHandlesFromText(text, formatMask, discardMask, queryFilters, sort) {
		if (typeof text !== 'undefined' && text.length) {
			const tags = this.getTagsFromText(text.split(/\r\n|\n\r|\n|\r/), formatMask, discardMask);
			if (tags && tags.length) {
				const { handleList, handleArr, notFound } = this.contentResolver(tags, queryFilters, sort);
				return { handleList, handleArr, notFound };
			} else { console.log('ImportTexTPlaylist.getHandlesFromText(): no tags retrieved'); }
		} else { console.log('ImportTexTPlaylist.getHandlesFromText(): text file is empty'); }
		return { handleList: new FbMetadbHandleList(), handleArr: [], notFound: [] };
	},
	/**
	 * Retrieves tag values from file using a format mask.
	 *
	 * @property
	 * @name getTagsFromText
	 * @kind method
	 * @memberof ImportTextPlaylist
	 * @param {string} text
	 * @param {string[]} formatMask
	 * @param {string} discardMask
	 * @returns {string[][]}
	 */
	getTagsFromText: function getTagsFromText(text, formatMask, discardMask = '') {
		let tags = [];
		if (typeof text !== 'undefined' && text.length) {
			const maskLength = formatMask.length;
			let lines = text.length;
			for (let j = 0; j < lines; j++) {
				const line = text[j];
				if (discardMask.length && line.startsWith(discardMask)) { continue; }
				let breakPoint = [];
				let prevIdx = 0;
				let bPrevTag = false;
				formatMask.forEach((mask, index) => {
					if (mask.length) { // It's a string to extract
						const nextIdx = line.indexOf(mask, prevIdx);
						if (!mask.includes('%')) { // It's breakpoint
							if (nextIdx !== -1 && bPrevTag) { breakPoint.push(nextIdx); }
							bPrevTag = false;
						} else if (index === 0) { // Or fist value is a tag, so extract from start
							breakPoint.push(0);
							bPrevTag = true;
						} else if (index === maskLength - 1) { // Or last value is a tag, so extract until the end
							breakPoint.push(prevIdx + formatMask[index - 1].length);
							breakPoint.push(line.length + 1);
						} else {
							breakPoint.push(prevIdx + formatMask[index - 1].length);
							bPrevTag = true;
						}
						if (nextIdx !== -1) { prevIdx = nextIdx; }
					}
				});
				let lineTags = {};
				if (breakPoint.length) {
					let idx = 0;
					formatMask.forEach((tag) => {
						if (tag.length) { // It's a string to extract
							if (tag.includes('%')) { // It's a tag to extract
								lineTags[tag.replace(/%/g, '').toLowerCase()] = line.slice(breakPoint[idx], breakPoint[idx + 1]).toLowerCase();
								idx += 2;
							}
						}
					});
				}
				if (!Object.keys(lineTags).length) { console.log('ImportTexTPlaylist.getTagsFromText(): line ' + (j + 1) + ' does not have tags matched by mask'); }
				tags.push(lineTags);
			}
		} else { console.log('ImportTexTPlaylist.getTagsFromText(): no text was provided.'); }
		return tags.length ? tags : null;
	},
	/**
	 * Content resolution for an array of tags against the library.
	 *
	 * @property
	 * @name contentResolver
	 * @kind method
	 * @memberof ImportTextPlaylist
	 * @param {string[]} tags
	 * @param {string[]} queryFilters
	 * @param {string[]} sortBias
	 * @returns {{handleList: FbMetadbHandleList, handleArr: FbMetadbHandle[], notFound: {idx, identifier, title, creator, tags}[]}}
	 */
	contentResolver: function contentResolver(tags, queryFilters, sortBias = globQuery.remDuplBias) {
		const handleArr = [];
		const notFound = [];
		const queryFiltersLength = queryFilters.length;
		const stripPrefix = ['a', 'an', 'the', 'la', 'los', 'las', 'el']; // match keys without prefixes
		const lookupKeys = new Map([
			['identifier', ['MUSICBRAINZ_TRACKID']],
			['title', ['TITLE']],
			['creator', ['ALBUM ARTIST', 'ARTIST']]
		].map((pair) => pair[1].map((key) => [key, pair[0]])).flat());
		const sortBiasTF = sortBias.length ? fb.TitleFormat(sortBias) : null;
		tags.forEach((handleTags, idx) => {
			if (Object.keys(handleTags).length) {
				const queryTags = Object.keys(handleTags).map((key) => {
					if (typeof handleTags[key] === 'undefined' || handleTags[key] === null || handleTags[key] === '') { return; }
					const query = key + ' IS ' + handleTags[key];
					if (key === 'artist' || key === 'album artist' || key === 'title') {
						const tfoKey = '"$stripprefix(%' + key + '%,' + stripPrefix.join(',') + ')"';
						const tagVal = sanitizeTagTfo(handleTags[key]); // Quote special chars
						const tfo = '$stripprefix(' + tagVal + ',' + stripPrefix.join(',') + ')';
						const tfoKeyVal = fb.TitleFormat(tfo).Eval(true);
						if (!tfoKeyVal.length) { console.log('Error creating query: ' + tfo); }
						const tfoQuery = tfoKey + ' IS ' + tfoKeyVal;
						let extraQuery = [];
						extraQuery.push('"$stricmp($ascii(%' + key + '%),$ascii(' + handleTags[key] + '))" IS 1');
						if ((key === 'artist' || key === 'album artist') && !handleTags[key].startsWith('the')) {
							extraQuery.push(key + ' IS the ' + handleTags[key]); // Done to match multi-valued tags with 'the' on any item
							extraQuery.push('"$stricmp($ascii(%' + key + '%),$ascii(the ' + handleTags[key] + '))" IS 1');
						} else if (key === 'title') {
							if (handleTags[key].includes(',')) {
								const val = handleTags[key].replace(/,/g, '');
								extraQuery.push(key + ' IS ' + val);
								extraQuery.push('"$stricmp($ascii(%' + key + '%),$ascii(' + val + '))" IS 1');
							}
							extraQuery.push('"$replace(%' + key + '%,\',\',)" IS ' + handleTags[key]);
							extraQuery.push('"$stricmp($ascii($replace(%' + key + '%,\',\',)),$ascii(' + handleTags[key] + '))" IS 1');
						}
						if (extraQuery.length) { extraQuery = queryJoin(extraQuery, 'OR'); }
						return query + ' OR ' + tfoQuery + (extraQuery.length ? ' OR ' + extraQuery : '');
					} else {
						return query;
					}
				}).filter(Boolean);
				if (!queryTags.length) { return; }
				const query = queryJoin(queryTags, 'AND');
				const handles = queryCache.has(query)
					? queryCache.get(query)
					: (
						checkQuery(query, true)
							? fb.GetQueryItems(fb.GetLibraryItems(), query)
							: null
					);
				if (handles && !queryCache.has(query)) {
					if (sortBiasTF) { handles.OrderByFormat(sortBiasTF, -1); }
					queryCache.set(query, handles);
				}
				let bDone = false;
				if (handles && handles.Count) { // Filter the results step by step to see which ones satisfy more conditions
					if (queryFiltersLength) {
						const handlesFilter = new Array(queryFiltersLength);
						handlesFilter[0] = handles.Clone();
						queryFilters.forEach((queryFilter, i) => {
							const prevResult = handlesFilter[i ? i - 1 : 0];
							const bEmpty = !prevResult.Count;
							handlesFilter[i] = bEmpty ? new FbMetadbHandleList() : fb.GetQueryItems(prevResult, queryFilter);
							if (i !== queryFiltersLength - 1) {
								handlesFilter[i + 1] = bEmpty ? new FbMetadbHandleList() : handlesFilter[i].Clone();
							}
						});
						for (let i = queryFiltersLength - 1; i >= 0; i--) { // The last results are the handles which passed all the filters successfully, are the preferred results
							if (handlesFilter[i].Count) { handleArr.push(handlesFilter[i][0]); bDone = true; break; }
						}
					}
					if (!bDone) { handleArr.push(handles[0]); bDone = true; }
				}
				if (!bDone) {
					const tags = {};
					const lookup = {};
					Object.keys(handleTags).forEach((key) => {
						tags[key] = handleTags[key];
						const lookupKey = lookupKeys.get(key.toUpperCase());
						if (lookupKey) { lookup[lookupKey] = handleTags[key]; } // For youTube search
					});
					handleArr.push(void (0));
					notFound.push({ idx, ...lookup, tags });
				}
			}
		});
		return { handleList: new FbMetadbHandleList(handleArr.filter((n) => n)), handleArr, notFound };
	},
}));