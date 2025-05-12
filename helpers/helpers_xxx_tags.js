'use strict';
//14/03/25

/* exported dynamicTags, numericTags, cyclicTags, keyTags, sanitizeTagIds, sanitizeTagValIds, queryCombinations, queryReplaceWithCurrent, checkQuery, getHandleTags, getHandleListTags ,getHandleListTagsV2, getHandleListTagsTyped, cyclicTagsDescriptor, isQuery, fallbackTagsQuery, isSubsong, isSubsongPath, fileRegex */

include('helpers_xxx.js');
/* global globTags:readable, folders:readable */
include('helpers_xxx_prototypes.js');
/* global _isFile:readable, _q:readable, _asciify:readable, isArrayStrings:readable, _p:readable,_b:readable, isArray:readable */
include('helpers_xxx_cache_volatile.js');
/* global VolatileCache:readable */
include('callbacks_xxx.js');

/*
	Global Variables
*/
const tagsVolatileCache = new VolatileCache(1000); // Deleted every 1000 ms
addEventListener('on_metadb_changed', () => tagsVolatileCache.clear());

const subsongRegex = /,\d+$/;
const fileRegex = /^file(-relative)?:\/+/i;

// Tags descriptors:
// Always use .toLowerCase first before checking if the set has the string. For ex
// numericTags.has(tagName.toLowerCase())
const dynamicTags = new Set(['rating', globTags.date.toLowerCase()]); // Only found by title formatting
const numericTags = new Set(['date', 'year', 'bpm', 'dynamic range', 'album dynamic range', 'rating', globTags.date.toLowerCase()]);  // Always a number
const cyclicTags = new Set(['dynamic_genre']); // Numeric tags with limited range: {0...K, k + 1 = 0}
const keyTags = new Set(['KEY_BACKUP1', 'KEY_BACKUP2', 'INITIAL KEY', 'INITIALKEY', 'KEY_START', 'KEY', 'KEY_CAMELOT', 'KEY_OPENKEY']);

// Put here the corresponding function for the cyclic tag. Swap lower/upper values before return if required. They must be always ordered.
// ALWAYS RETURN [valueLower, valueUpper, lowerLimit, upperLimit];
// Object keys must match the tag names at cyclicTags...
const cyclicTagsDescriptor = {
	//dyngenre_map_xxx.js
	dynamic_genre(tagValue, valueRange, bReturnLimits) { return dynGenreRange(tagValue, valueRange, bReturnLimits); },
};
// Add here the external files required for cyclic tags
// This tells the helper to load tags descriptors extra files. False by default
/** * @type {boolean} */
var bLoadTags; // NOSONAR
if (bLoadTags) {
	let externalPath = [
		folders.xxx + 'helpers\\dyngenre_map_xxx.js', //for dynamic_genre range function
		/* global dynGenreRange:readable */
	];
	for (const path of externalPath) {
		if (_isFile(path)) {
			include(path, { always_evaluate: false });
		} else {
			console.log('cyclicTagsDescriptor - WARNING missing: ' + path);
		}
	}
}

const logicDic = ['AND', 'OR', 'AND NOT', 'OR NOT'];

/*
	Query and tag manipulation
*/

/**
 * Quote special chars according to https://wiki.hydrogenaud.io/index.php?title=Foobar2000:Titleformat_Reference#Syntax
 *
 * @function
 * @name sanitizeTagTfo
 * @kind function
 * @param {string} tag
 * @returns {string}
 */
function sanitizeTagTfo(tag) {
	return tag.replace(/'/g, '\'\'').replace(/%/g, '\'%\'').replace(/\$/g, '\'$$\'').replace(/\[/g, '\'[\'').replace(/\]/g, '\']\'').replace(/\(/g, '\'(\'').replace(/\)/g, '\')\'').replace(/,/g, '\',\'');
}

/**
 * Quote value if needed for queries
 *
 * @function
 * @name sanitizeQueryVal
 * @kind function
 * @param {string} val
 * @returns {string}
 */
function sanitizeQueryVal(val) {
	return (val.match(/[()]/g) ? _q(val) : val);
}

/**
 * Sanitizes a tag to retrieve a plain ASCII value via TF.
 *
 * @function
 * @name sanitizeTagIds
 * @kind function
 * @param {string} tag - Tag without %
 * @param {boolean} bSpace?
 * @returns {string}
 */
function sanitizeTagIds(tag, bSpace = true) {
	return '$ascii($lower($trim($replace(' + tag.toUpperCase() + ',\'\',,`,,’,,´,,-,,\\,,/,,:,,$char(34),' + (bSpace ? ', ,' : '') + '))))';
}

/**
 * Sanitizes a tag to retrieve a plain ASCII value via RegExp.
 *
 * @function
 * @name sanitizeTagValIds
 * @kind function
 * @param {string} val
 * @param {?boolean} bSpace
 * @returns {string}
 */
function sanitizeTagValIds(val, bSpace = true) {
	return _asciify(val).trim().replace(
		bSpace
			? /['`’\-/\\ :"]/g
			: /['`’\-/\\:"]/g
		, ''
	).toLowerCase();
}

/**
 * Creates a query replacing given tag with fallbacks in case they are missing. Currently used only for ALBUM ARTIST multi-value handling
 *
 * @function
 * @name fallbackTagsQuery
 * @kind function
 * @param {string} tag
 * @param {string} value
 * @param {'IS'|'HAS'} logic
 * @returns {string}
 */
function fallbackTagsQuery(tag, value, logic = 'IS') {
	return /%?ALBUM ARTIST%?/i.test(tag)
		? '(ALBUM ARTIST PRESENT AND (ALBUM ARTIST ' + logic + ' ' + value + ')) OR (ALBUM ARTIST MISSING AND (ARTIST ' + logic + ' ' + value + '))'
		: tag + ' ' + logic + ' ' + value;
}

/**
 * Replace #strTF# with current values, where 'strTF' is a TF expression which will be evaluated on handle (or against tags).
 * Use try/catch to test validity of the query output
 *
 * @function
 * @name queryReplaceWithCurrent
 * @kind function
 * @param {string} query
 * @param {FbMetadbHandle} handle
 * @param {{string?: string}} tags - If no handle is provided, evaluates TF expression looking for 'strTF' property at the object
 * @param {{ expansionBy: ('AND'|'OR'|'AND NOT'|'OR NOT'), bToLowerCase: boolean, bDebug: boolean }} options - bToLowerCase: value from #strTF# will use lowercase
 * @returns {?string}
 */
function queryReplaceWithCurrent(query, handle, tags = {}, options = { expansionBy: 'AND', bToLowerCase: false, bDebug: false }) {
	options = { expansionBy: 'AND', bToLowerCase: false, bDebug: false, ...options };
	const oriQuery = query;
	if (options.bDebug) { console.log('Initial query:', oriQuery); }
	if (!query.length) { console.log('queryReplaceWithCurrent(): query is empty'); return ''; }
	if (handle && handle instanceof FbMetadbHandleList) {
		const queryArr = [...new Set(
			handle.Convert().map((h) => queryReplaceWithCurrent(query, h, { bToLowerCase: true }))
		)].sort((a, b) => a.localeCompare(b));
		return queryArr.length ? queryJoin(queryArr, 'OR') : '';
	}
	// global queries without handle required
	query = queryReplaceWithStatic(query, options);
	const bStatic = query !== oriQuery;
	// With handle
	if (!handle) {
		if ((query.match(/#/g) || []).length >= 2) {
			if (options.bDebug) { console.log(tags); }
			if (!tags) { console.log('queryReplaceWithCurrent(): handle is null'); return null; }
		} else { return query; }
	}
	if (/#NEXTKEY#|#PREVKEY#/i.test(query)) { console.log('queryReplaceWithCurrent(): found NEXTKEY|PREVKEY placeholders'); return null; }
	if (query.includes('#')) {
		if (/%ALBUM ARTIST% (IS|HAS) #ALBUM ARTIST#/i.test(query) && !/%?ARTIST%? (IS|HAS) #ARTIST#/i.test(query)) {
			query = query
				.replaceAll('%ALBUM ARTIST% IS #ALBUM ARTIST#', '(ALBUM ARTIST PRESENT AND (ALBUM ARTIST IS #ALBUM ARTIST#)) OR (ALBUM ARTIST MISSING AND (ARTIST IS #ARTIST#))')
				.replaceAll('%ALBUM ARTIST% HAS #ALBUM ARTIST#', '(ALBUM ARTIST PRESENT AND (ALBUM ARTIST HAS #ALBUM ARTIST#)) OR (ALBUM ARTIST MISSING AND (ARTIST HAS #ARTIST#))');
			if (options.bDebug) { console.log('ALBUM ARTISt expansion:', query); }
		}
		let idx = [query.indexOf('#')];
		let curr = idx[idx.length - 1];
		let next = -1;
		while (curr !== next) {
			curr = idx[idx.length - 1];
			next = query.indexOf('#', curr + 1);
			if (next !== -1 && curr !== next) { idx.push(next); }
			else { break; }
		}
		let count = idx.length;
		const startIdx = query.lastIndexOf('(', idx[0]);
		const startQuery = startIdx !== -1
			? query.slice(0, startIdx + 1)
			: '';
		const endQuery = query.length > idx[count - 1]
			? query.slice(idx[count - 1] + 1, query.length)
			: '';
		if (options.bDebug) { console.log('startQuery - endQuery:', startQuery, '-', endQuery); }
		if (count % 2 === 0) { // Must be on pairs of 2
			let tempQuery = '';
			let /** @type {FbTitleFormat|string} */ tfo = '', tfoVal = '';
			for (let i = 0; i < count; i += 2) {
				tfo = query.slice(idx[i] + 1, idx[i + 1]);
				const bIsWildcard = tfo.endsWith('*');
				tfo = tfo.replace(/\*$/, '');
				if (options.bDebug) { console.log('tfo:', tfo, bIsWildcard); }
				const tagKey = tfo;
				const bIsFunc = tfo.includes('$');
				const prevChar = query[idx[i] - 1];
				const nextChar = query[idx[i + 1] + 1];
				const bIsWithinFunc = (prevChar === '(' || prevChar === ',') && (nextChar === ')' || nextChar === ',');
				const sep = '|‎|';
				tfo = !bIsFunc
					? '[$meta_sep(' + tfo + ',\'' + sep + '\')]'
					: '[' + tfo + ']'; // Split multivalue tags if possible!
				// Workaround for album artist
				tfo = tfo.replace(/\$meta_sep\(ALBUM ARTIST,(.*)\)/g, '$if2($meta_sep(ALBUM ARTIST,$1), $meta_sep(ARTIST,$1))')
					.replace(/\$meta\(ALBUM ARTIST,(\d*)\)/g, '$if2($meta(ALBUM ARTIST,$1), $meta(ARTIST,$1))')
					.replace(/\$meta\(ALBUM ARTIST\)/g, '$if2($meta(ALBUM ARTIST), $meta(ARTIST))');
				if (options.bDebug) { console.log(tfo, ':', bIsFunc, prevChar, nextChar, bIsWithinFunc, tagKey); }
				tfo = handle || bStatic ? fb.TitleFormat(tfo) : null;
				tfoVal = bIsFunc || bIsWithinFunc
					? sanitizeTagTfo(handle
						? tfo.EvalWithMetadb(handle)
						: (tags[tagKey.toLowerCase()] || []).join(sep))
					: handle
						? tfo.EvalWithMetadb(handle)
						: (tags[tagKey.toLowerCase()] || []).join(sep);
				if (options.bToLowerCase && tfoVal && tfoVal.length) {
					tfoVal = tfoVal.toLowerCase();
				}
				// If no value is returned but using a static variable with no tags, retry without []
				if (bStatic && (typeof tfoVal === 'undefined' || tfoVal === null || tfoVal === '')) {
					tfo = fb.TitleFormat(tfo.Expression.slice(1, -1));
					tfoVal = sanitizeTagTfo(handle ? tfo.EvalWithMetadb(handle) : tfo.Eval(true));
				}
				if (options.bDebug) { console.log('tfoVal:', tfoVal); }
				if (options.bDebug) { console.log('multi-tag:', tfoVal.includes(sep)); }
				if (tfoVal.includes(sep)) { // Split multivalue tags if possible!
					const interText = query.slice((i > 0 ? idx[i - 1] + 1 : (startQuery.length ? startQuery.length : 0)), idx[i]);
					const interQueryStart = interText.startsWith(')')
						? interText.slice(0, interText.split('').findIndex((s) => s !== ')'))
						: '';
					const breakPoint = interText.lastIndexOf(' (');
					const interQueryEnd = breakPoint !== -1
						? interText.slice(interQueryStart.length, breakPoint + 2 + interText.slice(breakPoint + 2).split('').findIndex((s) => s !== '('))
						: '';
					const interQuery = interQueryStart + interQueryEnd;
					if (options.bDebug) { console.log('interQuery:', interQueryStart, interQueryEnd); }
					const multiQuery = tfoVal.split(sep).map((val) => {
						return query.slice(
							(i > 0
								? idx[i - 1] + interQuery.length + 1
								: (startQuery.length ? startQuery.length : 0)
							), idx[i]
						) + (!bIsWithinFunc ? sanitizeQueryVal(val) : val).trim() + (bIsWildcard ? '*' : '');
					});
					if (options.bDebug) { console.log('multiQuery:', multiQuery); }
					tempQuery += interQuery + queryJoin(multiQuery, options.expansionBy);
				} else {
					if (options.bDebug) { console.log(i > 0, startQuery.length, idx[i]); }
					tempQuery += query.slice(
						(i > 0
							? idx[i - 1] + 1
							: (startQuery.length ? startQuery.length : 0)
						), idx[i]
					) + (!bIsWithinFunc ? sanitizeQueryVal(tfoVal) : tfoVal).trim() + (bIsWildcard ? '*' : '');
				}
			}
			query = startQuery + tempQuery + endQuery;
			if (options.bDebug) { console.log(startQuery, '-', tempQuery, '-', endQuery); }
		}
	}
	return query;
}

/**
 * Replace #strTF# with static values, where 'strTF' is a TF expression which will be evaluated against a list of special variables.
 * Use try/catch to test validity of the query output
 *
 * @function
 * @name queryReplaceWithStatic
 * @kind function
 * @param {string} query
 * @param {{ bDebug: boolean }} options
 * @returns {?string}
 */
function queryReplaceWithStatic(query, options = { bDebug: false, bBooleanForce: true }) {
	options = { bDebug: false, ...options };
	if (options.bDebug) { console.log('Initial query:', query); }
	if (!query.length) { console.log('queryReplaceWithStatic(): query is empty'); return ''; }
	// Dates
	if (/#(MONTH|YEAR|DAY|NOW)#/i.test(query)) {
		const date = new Date();
		query = query.replace(/#YEAR#/gi, date.getFullYear().toString());
		query = query.replace(/#MONTH#/gi, (date.getMonth() + 1).toString());
		query = query.replace(/#DAY#/gi, date.getDate().toString());
		query = query.replace(/#NOW#/gi, date.getFullYear().toString() + '-' + (date.getMonth() + 1).toString() + '-' + date.getDate().toString());
	}
	// System
	if (/#(VOLUME|VOLUMEDB|VERSION|ISPLAYING|ISPAUSED|SAC|PLSCOUNT)#/i.test(query)) {
		query = query.replace(/#VOLUME#/gi, Math.round(100 + fb.Volume));
		query = query.replace(/#VOLUMEDB#/gi, fb.Volume.toFixed(2) + ' dB');
		query = query.replace(/#VERSION#/gi, fb.Version);
		query = query.replace(/#ISPLAYING#/gi, fb.IsPlaying ? '1' + (options.bBooleanForce ? '$not(0)' : '') : '');
		query = query.replace(/#ISPAUSED#/gi, fb.IsPaused ? '1' + (options.bBooleanForce ? '$not(0)' : '') : '');
		query = query.replace(/#ISPAUSED#/gi, fb.IsPaused ? '1' + (options.bBooleanForce ? '$not(0)' : '') : '');
		query = query.replace(/#SAC#/gi, fb.StopAfterCurrent  ? '1' + (options.bBooleanForce ? '$not(0)' : '') : '');
		query = query.replace(/#PLSCOUNT#/gi, plman.PlaylistCount);
	}
	if (/#(DEVICE|DEVICEID)#/i.test(query)) {
		let device;
		try { device = JSON.parse(fb.GetOutputDevices()).find((d) => d.active); } catch { } // eslint-disable-line no-empty
		query = query.replace(/#DEVICE#/gi, device ? device.name : '?');
		query = query.replace(/#DEVICEID#/gi, device ? device.device_id : '?');
	}
	if (/#(RGMODE)#/i.test(query)) {
		const rgModes = [
			'disabled',
			'track',
			'album',
			'by Playback Order',
		];
		query = query.replace(/#RGMODE#/gi, rgModes[fb.ReplaygainMode]);
	}
	if (/#(PLAYMODE)#/i.test(query)) {
		const playModes = [
			'default',
			'repeat (playlist)',
			'repeat (track)',
			'random',
			'shuffle (tracks)',
			'shuffle (albums',
			'shuffle (folders)'
		];
		query = query.replace(/#PLAYMODE#/gi, playModes[plman.PlaybackOrder]);
	}
	// Selection
	if (/#(SELTRACKS|SELDURATION|SELSIZE)#/i.test(query)) {
		const sel = fb.GetSelections(1);
		query = query.replace(/#SELTRACKS#/gi, sel ? sel.Count : 0);
		query = query.replace(/#SELDURATION#/gi, sel ? utils.FormatDuration(sel.CalcTotalDuration()) : '0:00');
		query = query.replace(/#SELSIZE#/gi, sel ? utils.FormatFileSize(sel.CalcTotalSize()) : '0 B');
	}
	// Selection (system)
	if (/#(SELTYPE)#/i.test(query)) {
		const selTypes = [
			'undefined $char(40)no item$char(41)',
			'active playlist',
			'caller active playlist',
			'playlist manager',
			'now playing',
			'keyboard shortcut list',
			'media library viewer'
		];
		query = query.replace(/#SELTYPE#/gi, selTypes[fb.GetSelectionType()]);
	}
	// Selection (focus)
	if (/#(SELPLAYING|SELINLIBRARY)#/i.test(query)) {
		const sel = fb.GetFocusItem(true);
		query = query.replace(/#SELPLAYING#/gi, sel ? (() => {
			const np = fb.GetNowPlaying();
			const compare = (a, b) => a.SubSong === b.SubSong && a.RawPath === b.RawPath;
			return np && compare(sel, np)
				? '1' + (options.bBooleanForce ? '$not(0)' : '')
				: '';
		})() : '');
		query = query.replace(/#SELINLIBRARY#/gi, sel ? fb.IsMetadbInMediaLibrary(sel) + (options.bBooleanForce ? '$not(0)' : '') : '');
	}
	// Playlist
	if (/#(PLSIDX|PLSNAME|PLSTRACKS|PLSISAUTOPLS|PLSISLOCKED|PLSLOCKS|PLSLOCKNAME)#/i.test(query)) {
		const pls = plman.ActivePlaylist;
		query = query.replace(/#PLSIDX#/gi, pls !== -1 ? pls : '?');
		query = query.replace(/#PLSNAME#/gi, pls !== -1 ? plman.GetPlaylistName(pls) : '?');
		query = query.replace(/#PLSTRACKS#/gi, pls !== -1 ? plman.PlaylistItemCount(pls) : '0');
		query = query.replace(/#PLSISAUTOPLS#/gi, pls !== -1 ? (plman.IsAutoPlaylist(pls) ? 1 + (options.bBooleanForce ? '$not(0)' : '') : '') : '');
		query = query.replace(/#PLSISLOCKED#/gi, pls !== -1 ? (plman.IsAutoPlaylist(pls) ? 1 + (options.bBooleanForce ? '$not(0)' : '') : '') : '');
		query = query.replace(/#PLSLOCKS#/gi, pls !== -1 ? plman.GetPlaylistLockedActions(pls).sort((a, b) => a.localeCompare(b)).join(', ') : '');
		query = query.replace(/#PLSLOCKNAME#/gi, pls !== -1 ? plman.GetPlaylistLockName(pls) || '' : '');
	}
	if (/#(PLSPLAYIDX|PLSPLAYNAME|PLSPLAYTRACKS)#/i.test(query)) {
		const pls = plman.PlayingPlaylist;
		query = query.replace(/#PLSPLAYIDX#/gi, pls !== -1 ? pls : '?');
		query = query.replace(/#PLSPLAYNAME#/gi, pls !== -1 ? plman.GetPlaylistName(pls) : '?');
		query = query.replace(/#PLSPLAYTRACKS#/gi, pls !== -1 ? plman.PlaylistItemCount(pls) : '0');
	}
	// Playlist items
	if (/#(PLSDURATION|PLSSIZE)#/i.test(query)) {
		const pls = plman.ActivePlaylist;
		const plsItems = pls !== -1 ? plman.GetPlaylistItems(pls) : null;
		query = query.replace(/#PLSDURATION#/gi, plsItems ? utils.FormatDuration(plsItems.CalcTotalDuration()) : '0:00');
		query = query.replace(/#PLSSIZE#/gi, plsItems ? utils.FormatFileSize(plsItems.CalcTotalSize()) : '0');
	}
	if (/#(PLSPLAYDURATION|PLSPLAYSIZE)#/i.test(query)) {
		const pls = plman.PlayingPlaylist;
		const plsItems = pls !== -1 ? plman.GetPlaylistItems(pls) : null;
		query = query.replace(/#PLSPLAYDURATION#/gi, plsItems ? utils.FormatDuration(plsItems.CalcTotalDuration()) : '0:00');
		query = query.replace(/#PLSPLAYSIZE#/gi, plsItems ? utils.FormatFileSize(plsItems.CalcTotalSize()) : '0');
	}
	return query;
}

/**
 * Joins an array of queries with 'SetLogic' between them: AND (NOT) / OR (NOT)
 *
 * @function
 * @name queryJoin
 * @kind function
 * @param {string[]} queryArray - Array of queries created by {@link queryCombinations}
 * @param {string} setLogic - [='AND'] May be: AND|OR|AND NOT|OR NOT
 * @returns {string|undefined}
 *  @example
 * // Returns '(ARTIST IS A OR ARTIST IS B) OR (TITLE IS A OR TITLE IS B)'
 * queryJoin(
 * 	queryCombinations(['A','B'], ['ARTIST', 'TITLE'], 'OR', void(0), 'IS')
 * 	, 'OR'
 * );
 */
function queryJoin(queryArray, setLogic = 'AND') {
	setLogic = (setLogic || '').toUpperCase();
	if (!logicDic.includes(setLogic)) {
		console.log('queryJoin(): setLogic (' + setLogic + ') is wrong.');
		return;
	}
	let arrayLength = queryArray.length;
	// Wrong array
	if (!Array.isArray(queryArray) || typeof queryArray === 'undefined' || queryArray === null || arrayLength === null || arrayLength === 0) {
		console.log('queryJoin(): queryArray [' + queryArray + '] was null, empty or not an array.');
		return; //Array was null or not an array
	}
	const allRegex = /ALL/;
	const copy = [...queryArray].filter((q) => q && !allRegex.test(q));
	arrayLength = copy.length;
	let query = '';
	let i = 0;
	while (i < arrayLength) {
		if (i === 0) {
			query += (arrayLength > 1 ? '(' : '') + copy[i] + (arrayLength > 1 ? ')' : '');
		} else {
			query += ' ' + setLogic + ' (' + copy[i] + ')';
		}
		i++;
	}
	return query;
}

/**
 * It gets either a 2D array of tag values [[,],...], output from k_combinations(), or 1D array, and creates a query for all those combinations.
 * For 2D, every subset uses 'subtagsArrayLogic' between the tags. And then 'tagsArrayLogic' between subsets. QueryKey is the tag name.
 * For 1D arrays, only 'tagsArrayLogic' is used.
 * When using an array as 'tagsArrayLogic', the output is also an array, meant to be used with {@link queryJoin}
 *
 * @function
 * @name queryCombinations
 * @kind function
 * @param {string[]|string[][]} tagsArray - The tag values in 1D or 2D array
 * @param {string|string[]} queryKey - May be a single or array of TitleFormat strings
 * @param {string} tagsArrayLogic - May be: AND|OR|AND NOT|OR NOT
 * @param {?string} subtagsArrayLogic - May be: AND|OR|AND NOT|OR NOT
 * @param {?string} [match='IS'] - [=IS] May be: IS|HAS|EQUAL
 * @returns {string|string[]|undefined}
 * @example
 * // Returns 'ARTIST IS A OR ARTIST IS B'
 * queryCombinations(['A','B'], 'ARTIST', 'OR', void(0), 'IS')
 * @example
 * // Returns '[ARTIST IS A OR ARTIST IS B, TITLE IS A OR TITLE IS B]
 * queryCombinations(['A','B'], ['ARTIST', 'TITLE'], 'OR', void(0), 'IS')
 */
function queryCombinations(tagsArray, queryKey, tagsArrayLogic /*AND, OR [NOT]*/, subtagsArrayLogic /*AND, OR [NOT]*/, match = 'IS' /*IS, HAS, EQUAL*/) {
	// Wrong tagsArray
	if (tagsArray === null || Object.prototype.toString.call(tagsArray) !== '[object Array]' || tagsArray.length === null || tagsArray.length === 0) {
		console.log('queryCombinations(): tagsArray [' + tagsArray + '] was null, empty or not an array. queryKey = ' + queryKey);
		return; //Array was null or not an array
	}
	if (typeof queryKey === 'undefined' || queryKey === null || !queryKey) {
		console.log('queryCombinations(): queryKey not set. tagsArray = ' + tagsArray);
		return;
	}
	tagsArrayLogic = (tagsArrayLogic || '').toUpperCase();
	subtagsArrayLogic = (subtagsArrayLogic || '').toUpperCase();
	match = (match || '').toUpperCase();
	if (isArrayStrings(queryKey)) {
		let queryKeyLength = queryKey.length;
		let i = 0;
		let queryArray = [];
		while (i < queryKeyLength) {
			queryArray.push(/** @type {string} */(queryCombinations(tagsArray, queryKey[i], tagsArrayLogic, subtagsArrayLogic, match)));
			i++;
		}
		return queryArray;
	}
	let tagsArrayLength = tagsArray.length;
	/** @type {string|string[]} */
	let query = '';
	if (!Array.isArray(tagsArray[0])) { //no subtagsArrays
		if (!logicDic.includes(tagsArrayLogic)) {
			console.log('queryCombinations(): tagsArrayLogic (' + tagsArrayLogic + ') is wrong');
			return;
		}
		let i = 0;
		while (i < tagsArrayLength) {
			if (i === 0) {
				query += queryKey + ' ' + match + ' ' + sanitizeQueryVal(/** @type {string} */(tagsArray[0]));
			} else {
				query += ' ' + tagsArrayLogic + ' ' + queryKey + ' ' + match + ' ' + sanitizeQueryVal(/** @type {string} */(tagsArray[i]));
			}
			i++;
		}
	} else {
		if (!logicDic.includes(tagsArrayLogic) || !logicDic.includes(subtagsArrayLogic)) {
			console.log('queryCombinations(): tagsArrayLogic (' + tagsArrayLogic + ') or subtagsArrayLogic (' + subtagsArrayLogic + ') are wrong');
			return;
		}
		let k = tagsArray[0].length; //SubtagsArrays length
		let i = 0;
		while (i < tagsArrayLength) {
			if (i !== 0) {
				query += ' ' + tagsArrayLogic + ' ';
			}
			let j = 0;
			while (j < k) {
				if (j === 0) {
					query += (k > 1 ? '(' : '') + queryKey + ' ' + match + ' ' + sanitizeQueryVal(tagsArray[i][0]); // only adds pharentesis when more than one subtag! Estetic fix...
				} else {
					query += ' ' + subtagsArrayLogic + ' ' + queryKey + ' ' + match + ' ' + sanitizeQueryVal(tagsArray[i][j]);
				}
				j++;
			}
			query += (k > 1 ? ')' : '');
			i++;
		}
	}
	return query;
}

/**
 * Checks if a query is valid
 *
 * @function
 * @name checkQuery
 * @kind function
 * @param {string} query
 * @param {boolean} bAllowEmpty - [=false] If false, empty queries are non-valid
 * @param {boolean} bAllowSort - [=false] If false, queries with 'SORT BY' expressions are non-valid
 * @param {boolean} bAllowPlaylist - [=false] If false, queries with '#PLAYLIST#' expressions are non-valid
 * @returns {boolean}
 */
function checkQuery(query, bAllowEmpty = false, bAllowSort = false, bAllowPlaylist = false) {
	let bPass = true;
	if (!bAllowEmpty && (!query || !query.length)) { return false; }
	let queryNoSort = query;
	if (bAllowSort) {
		queryNoSort = stripSort(query);
		if (!queryNoSort.length || queryNoSort !== query && !checkSort(query.replace(queryNoSort, ''))) { return false; }
	}
	try { fb.GetQueryItems(new FbMetadbHandleList(), queryNoSort); }  // Test query against empty handle list since it's much faster!
	catch (e) { bPass = false; } // eslint-disable-line no-unused-vars
	if (bPass) {
		// Allow simple search like 'rock' but don't allow single TF expressions
		if (hasQueryExpression(queryNoSort)) {
			try { fb.GetQueryItems(new FbMetadbHandleList(), '* HAS \'\' AND ' + _p(queryNoSort)); }  // Some expressions only throw inside parentheses!
			catch (e) { bPass = false; } // eslint-disable-line no-unused-vars
		} else if (/\$.*\(.*\)/.test(queryNoSort)) { bPass = false; }
	}
	if (!bAllowPlaylist && queryNoSort && RegExp(/.*#(PLAYLIST|playlist)# IS.*/).exec(queryNoSort)) { bPass = false; }
	return bPass;
}

/**
 * Checks if the SORT BY expression on a query string is valid.
 *
 * @function
 * @name checkSort
 * @kind function
 * @param {string} queryOrSort
 * @returns {boolean}
 */
function checkSort(queryOrSort) {
	let bPass = true;
	const sortObj = getSortObj(queryOrSort);
	if (!sortObj || !sortObj.tf) { bPass = false; }
	return bPass;
}

/**
 * Strips and SORT BY expression from a query string. Must check query too to be sure it's a valid query!
 *
 * @function
 * @name stripSort
 * @kind function
 * @param {string} query
 * @returns {string}
 */
function stripSort(query) {
	let queryNoSort = query;
	if (RegExp(/ *SORT .*$/).exec(query)) {
		if (RegExp(/ *SORT BY .*$/).exec(query)) { queryNoSort = query.split(/( *SORT BY ).*$/)[0]; }
		else if (RegExp(/ *SORT DESCENDING BY .*$/).exec(query)) { queryNoSort = query.split(/( *SORT DESCENDING BY ).*$/)[0]; }
		else if (RegExp(/ *SORT ASCENDING BY .*$/).exec(query)) { queryNoSort = query.split(/( *SORT ASCENDING BY ).*$/)[0]; }
		else { queryNoSort = ''; }
	}
	return queryNoSort;
}

/**
 * Process a sort or query string and outputs a sort object with direction, TF and tags
 *
 * @function
 * @name getSortObj
 * @kind function
 * @param {string} queryOrSort
 * @returns {{direction: number, tf: FbTitleFormat, tag: string}|null}
 */
function getSortObj(queryOrSort) { // {direction: 1, tf: [TFObject], tag: 'ARTIST'}
	const query = stripSort(queryOrSort);
	const sort = ((query && query.length ? queryOrSort.replace(query, '') : queryOrSort) || '').trimStart();
	/** @type {{direction?:number|string, tf?:FbTitleFormat, tag?:string}} */
	let sortObj = null;
	if (sort.length) {
		sortObj = {};
		[sortObj.direction, sortObj.tag] = sort.split(/(?: BY )(.*$)/i);
		if (!sortObj.tag || !sortObj.tag.length || !RegExp(/\w+$/).exec(sortObj.tag) && !RegExp(/"*\$.+\(.*\)"*$|%.+%$/).exec(sortObj.tag)) { sortObj = null; }
		else if (RegExp(/SORT$|SORT ASCENDING$/).exec(sortObj.direction)) { sortObj.direction = 1; }
		else if (RegExp(/SORT DESCENDING$/).exec(sortObj.direction)) { sortObj.direction = -1; }
		else { console.log('getSortObj: error identifying sort direction ' + queryOrSort); sortObj = null; }
	}
	if (sortObj) { sortObj.tf = fb.TitleFormat(sortObj.tag); }
	return sortObj;
}

/**
 * Checks if a string has any query operator
 *
 * @function
 * @name hasQueryExpression
 * @kind function
 * @param {string} query
 * @returns {boolean}
 */
function hasQueryExpression(query) {
	return query && query.length && ['PRESENT', 'HAS', 'IS', 'LESS', 'GREATER', 'EQUAL', 'MISSING', 'BEFORE', 'AFTER', 'SINCE', 'DURING'].some((key) => query.includes(key));
}

/**
 * Checks if a string is valid query
 *
 * @function
 * @name isQuery
 * @kind function
 * @param {string} query
 * @param {boolean} bAllowEmpty - If false, empty strings are non-valid
 * @param {boolean} bAllowSort? - If false, strings with 'SORT BY' expressions are non-valid
 * @param {boolean} bAllowPlaylist? - If false, strings with '#PLAYLIST#' expressions are non-valid
 * @returns {boolean}
 */
function isQuery(query, bAllowEmpty = false, bAllowSort = false, bAllowPlaylist = false) {
	let bPass = true;
	if (query && query.length) {
		bPass = hasQueryExpression(query) && checkQuery(query, false, bAllowSort, bAllowPlaylist);
	} else if (!bAllowEmpty) { bPass = false; }
	return bPass;
}

/**
 * Retrieve tags from a handle using .GetFileInfo(). Returns an array of arrays
 * with length equal to the number of tags. [n Tags]
 *
 * @function
 * @name getHandleTags
 * @kind function
 * @param {FbMetadbHandle} handle
 * @param {string[]} tagsArray
 * @param {{ bMerged: boolean, bCached: boolean }} options
 * @returns {string[][]|string[]}
 */
function getHandleTags(handle, tagsArray, options = { bMerged: false, bCached: false }) {
	if (!isArrayStrings(tagsArray)) { return null; }
	if (!handle) { return null; }
	options = { bMerged: false, bCached: false, ...(options || {}) };
	const tagArrayLen = tagsArray.length;
	const toCache = new Set(tagsArray);
	let outputArray = new Array(tagArrayLen);
	if (options.bCached) {
		const values = tagsVolatileCache.get(handle, tagsArray) || {};
		for (const key in values) { outputArray[tagsArray.indexOf(key)] = values[key]; toCache.delete(key); }
	}
	if (outputArray.filter(Boolean).length !== tagArrayLen) {
		const handleInfo = handle.GetFileInfo();
		let i = 0;
		while (i < tagArrayLen) {
			let tagValues = [];
			const tagIdx = handleInfo.MetaFind(tagsArray[i]);
			const tagNumber = (tagIdx !== -1) ? handleInfo.MetaValueCount(tagIdx) : 0;
			if (tagNumber !== 0) {
				let j = 0;
				while (j < tagNumber) {
					tagValues[j] = handleInfo.MetaValue(tagIdx, j);
					j++;
				}
			}
			outputArray[i] = tagValues;
			i++;
		}
		if (toCache.size) {
			tagsVolatileCache.set(
				handle,
				Object.fromEntries(outputArray.map((tag, i) => {
					const key = tagsArray[i];
					return toCache.has(key) ? [tagsArray[i], tag] : null;
				}).filter(Boolean))
			);
		}
	}
	if (options.bMerged) { outputArray = outputArray.flat(); }
	return outputArray;
}

/**
 * Retrieve tags from a handle list using .EvalWithMetadbs(). Tags are split by ', '.
 * Returns an array of arrays with length equal to the number of handles. [handle count x [n Tags]]
 *
 * @function
 * @name getHandleListTags
 * @kind function
 * @param {FbMetadbHandleList} handleList
 * @param {string[]} tagsArray
 * @param {{ bMerged: boolean, bCached: boolean }} options
 * @returns {string[][]|string[]}
 */
function getHandleListTags(handleList, tagsArray, options = { bMerged: false, bCached: false }) {
	if (!isArrayStrings(tagsArray)) { return null; }
	if (!handleList) { return null; }
	options = { bMerged: false, bCached: false, ...(options || {}) };
	const tagArray_length = tagsArray.length;
	/** @type {any[]|any[][]} */
	let outputArray = [];
	let i = 0;
	let tagString = '';
	const outputArray_length = handleList.Count;
	const sep = '|‎|'; // Contains U+200E invisible char
	while (i < tagArray_length) {
		const tagStr = !tagsArray[i].includes('$')
			? !tagsArray[i].includes('%')
				? '%' + tagsArray[i] + '%'
				: tagsArray[i]
			: tagsArray[i];
		if (options.bMerged) { tagString += _b((i === 0 ? '' : ', ') + tagStr); } // We have all values separated by comma
		else { tagString += (i === 0 ? '' : sep) + _b(tagStr); } // We have tag values separated by comma and different tags by |
		i++;
	}
	let tfo = fb.TitleFormat(tagString);
	outputArray = tfo.EvalWithMetadbs(handleList);
	if (options.bMerged) { // Just an array of values per track: n x 1
		for (let i = 0; i < outputArray_length; i++) {
			outputArray[i] = outputArray[i].split(', ');
		}
	} else { // Array of values tag and per track; n x tagNumber
		for (let i = 0; i < outputArray_length; i++) {
			outputArray[i] = outputArray[i].split(sep);
			for (let j = 0; j < tagArray_length; j++) {
				outputArray[i][j] = outputArray[i][j].split(', ');
			}
		}
	}
	return outputArray;
}

/**
 * Retrieve tags from a handle list using .EvalWithMetadbs(). Tags are split by ', '.
 * Returns an array of arrays with length equal to the number of tags. [n Tags x [handle count]]
 *
 * @function
 * @name getHandleListTagsV2
 * @kind function
 * @param {FbMetadbHandleList} handleList
 * @param {string[]} tagsArray
 * @param {{ bMerged: boolean, bEmptyVal: boolean, splitBy: string, iLimit: number, bCached: boolean }} options
 * @returns {string[][]|string[]}
 */
function getHandleListTagsV2(handleList, tagsArray, options = { bMerged: false, bEmptyVal: false, splitBy: ', ', iLimit: -1, bCached: false }) {
	if (!isArrayStrings(tagsArray)) { return null; }
	if (!handleList) { return null; }
	options = { bMerged: false, bEmptyVal: false, splitBy: ', ', iLimit: -1, bCached: false, ...(options || {}) };
	if (options.iLimit === Infinity) { options.iLimit = -1; } // .split() doesn't behave as expected with Infinity...
	const tagArray_length = tagsArray.length;
	let outputArrayi_length = handleList.Count;
	/** @type {any[]|any[][]} */
	let outputArray = [];
	let i = 0;
	while (i < tagArray_length) {
		if (tagsArray[i].toLowerCase() === 'skip') {
			outputArray[i] = [[]];
			i++;
			continue;
		}
		// Tagname or TF expression, with or without empty values
		let tagString = !tagsArray[i].includes('$')
			? !tagsArray[i].includes('%')
				? '%' + tagsArray[i] + '%'
				: tagsArray[i]
			: tagsArray[i];
		tagString = options.bEmptyVal
			? tagString
			: '[' + tagString + ']';
		let tfo = fb.TitleFormat(tagString);
		outputArray[i] = tfo.EvalWithMetadbs(handleList);
		if (options.splitBy && options.splitBy.length) {
			for (let j = 0; j < outputArrayi_length; j++) {
				outputArray[i][j] = outputArray[i][j].split(options.splitBy, options.iLimit);
			}
		} else {
			for (let j = 0; j < outputArrayi_length; j++) {
				outputArray[i][j] = [outputArray[i][j]];
			}
		}
		i++;
	}
	if (options.bMerged) { outputArray = outputArray.flat(); }
	return outputArray;
}

/**
 * Retrieve tags from a handle list using .EvalWithMetadbs(). Tags are split by ', '. Values are
 * cast to the given type provided at 'tagsArray'.
 * Returns an array of arrays with length equal to the number of tags. [n Tags x [handle count]]
 *
 * @function
 * @name getHandleListTagsTyped
 * @kind function
 * @param {FbMetadbHandleList} handleList
 * @param {{name: string, type: string}[]} tagsArray - Type: number|string
 * @param {{ bMerged: boolean, bEmptyVal: boolean, splitBy: string, iLimit: number, bCached: boolean }} options
 * @returns {string[][]|string[]|number[][]|number[]}
 */
function getHandleListTagsTyped(handleList, tagsArray, options = { bMerged: false, bEmptyVal: false, splitBy: ', ', iLimit: -1, bCached: false }) {
	if (!isArray(tagsArray)) { return null; }
	if (!handleList) { return null; }
	options = { bMerged: false, bEmptyVal: false, splitBy: ', ', iLimit: -1, bCached: false, ...(options || {}) };
	if (options.iLimit === Infinity) { options.iLimit = -1; } // .split() doesn't behave as expected with Infinity...
	const tagArray_length = tagsArray.length;
	let outputArrayi_length = handleList.Count;
	/** @type {any[]|any[][]} */
	let outputArray = [];
	let i = 0;
	while (i < tagArray_length) {
		const tagName = tagsArray[i].name;
		const type = tagsArray[i].type;
		if (tagName.toLowerCase() === 'skip') {
			outputArray[i] = [[]];
			i++;
			continue;
		}
		let tagString = !tagName.includes('$') // Tagname or TF expression, with or without empty values
			? (options.bEmptyVal ? '%' + tagName + '%' : '[%' + tagName + '%]')
			: (options.bEmptyVal ? tagName : '[' + tagName + ']');
		let tfo = fb.TitleFormat(tagString);
		outputArray[i] = tfo.EvalWithMetadbs(handleList);
		if (options.splitBy && options.splitBy.length) {
			for (let j = 0; j < outputArrayi_length; j++) {
				outputArray[i][j] = outputArray[i][j].split(options.splitBy, options.iLimit);
				if (type) {
					outputArray[i][j] = outputArray[i][j].map((val) => {
						switch (type) {
							case 'number': { return Number(val); }
							case 'string': { return String(val); }
						}
						return val;
					});
				}
			}
		} else {
			for (let j = 0; j < outputArrayi_length; j++) {
				if (type) {
					switch (type) {
						case 'number': { outputArray[i][j] = Number(outputArray[i][j]); break; }
						case 'string': { outputArray[i][j] = String(outputArray[i][j]); break; }
					}
				}
				outputArray[i][j] = [outputArray[i][j]];
			}
		}
		i++;
	}
	if (options.bMerged) { outputArray = outputArray.flat(); }
	return outputArray;
}

/**
 * Checks if a track references a container with subsongs
 *
 * @function
 * @name function isSubsong
 * @kind function
 * @param {FbMetadbHandle} handle - Track
 * @param {string} ext - [=''] Track extension (provide it if already known)
 * @returns {boolean}
 */
function isSubsong(handle, ext = '') {
	const blackList = new Set(['dsf']);
	return handle.SubSong !== 0 && !blackList.has(ext || handle.Path.split('.').pop());
}

/**
 * Checks wether a path references a container or not.
 *
 * @function
 * @name function isSubsongPath
 * @kind function
 * @param {string} path
 * @param {string} extension
 * @returns {boolean}
 */
function isSubsongPath(path, ext = '') {
	const blackList = new Set(['dsf']);
	const subsong = path.split(',').pop();
	return subsongRegex.test(path) && subsong !== '0' && !blackList.has(ext || path.split('.').pop().replace(',' + subsong, ''));
}