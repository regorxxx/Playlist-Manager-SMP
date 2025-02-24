'use strict';
//24/02/25

include('helpers_xxx.js');
include('..\\helpers-external\\xsp-to-jsp-parser\\xsp_parser.js');
/* global XSP:readable*/

XSP.isFoec = (typeof isEnhPlayCount !== 'undefined' && isEnhPlayCount) || (typeof isEnhPlayCount === 'undefined' && typeof utils.CheckComponent !== 'undefined' && utils.CheckComponent('foo_enhanced_playcount')); // eslint-disable-line no-undef
XSP.isFo2k3 = (typeof isPlaycount2003 !== 'undefined' && isPlaycount2003) || (typeof isPlaycount2003 === 'undefined' && typeof utils.CheckComponent !== 'undefined' && utils.CheckComponent('foo_playcount_2003')); // eslint-disable-line no-undef

XSP.getQuerySort = function (jsp) {
	let query = this.getQuery(jsp);
	let sort = query.length ? ' ' + this.getSort(jsp) : '';
	return query + sort;
};

XSP.getQuery = function (jsp, bOmitPlaylist = false) {
	const playlist = jsp.playlist;
	const match = playlist.match === 'all' ? 'AND' : 'OR';
	const rules = playlist.rules.filter((rule) => { return (typeof rule === 'object' && rule.field.length && rule.operator.length && rule.value.length); });
	if (rules.length !== playlist.rules.length) {
		console.log('Malformed XSP playlist: ' + jsp.playlist.name);
		console.log('There are empty or non recognized rules.');
	}
	const query = [];
	const textTags = new Set([
		'GENRE', 'ALBUM', 'ARTIST', 'TITLE', 'COMMENT', 'TRACKNUMBER', '%FILENAME%', '%PATH%', '%RATING%', 'DATE', 'MOOD', 'THEME', 'STYLE', '"ALBUM ARTIST"',
		'"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%)"', '"$max(%LASTFM_PLAY_COUNT%,%PLAY_COUNT%)"',
		'"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,0)"', '"$max(%LASTFM_PLAY_COUNT%,%PLAY_COUNT%,0)"',
		'"$max(%PLAY_COUNT%,%2003_PLAYCOUNT%)"', '"$max(%2003_PLAYCOUNT%,%PLAY_COUNT%)"',
		'"$max(%PLAY_COUNT%,%2003_PLAYCOUNT%,0)"', '"$max(%2003_PLAYCOUNT%,%PLAY_COUNT%,0)"',
		'"$max(%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%)"', '"$max(%2003_PLAYCOUNT%,%LASTFM_PLAY_COUNT%)"',
		'"$max(%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%,0)"', '"$max(%2003_PLAYCOUNT%,%LASTFM_PLAY_COUNT%,0)"',
		'"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%,0)"', '"$max(%2003_PLAYCOUNT%,%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,0)"', '"$max(%LASTFM_PLAY_COUNT%,%PLAY_COUNT%,%2003_PLAYCOUNT%,0)"',
		'"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%)"', '"$max(%2003_PLAYCOUNT%,%PLAY_COUNT%,%LASTFM_PLAY_COUNT%)"', '"$max(%LASTFM_PLAY_COUNT%,%PLAY_COUNT%,%2003_PLAYCOUNT%)"',
		'%PLAY_COUNT%', '%2003_PLAYCOUNT%',
		'%2003_LAST_PLAYED%', '%LAST_PLAYED_ENHANCED%', '%LAST_PLAYED%',
		'#PLAYLIST#'
	]);
	const numTags = new Set([
		'TRACKNUMBER', '%RATING%', '%2003_RATING%', 'DATE',
		'"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%)"', '"$max(%LASTFM_PLAY_COUNT%,%PLAY_COUNT%)"',
		'"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,0)"', '"$max(%LASTFM_PLAY_COUNT%,%PLAY_COUNT%,0)"',
		'"$max(%PLAY_COUNT%,%2003_PLAYCOUNT%)"', '"$max(%2003_PLAYCOUNT%,%PLAY_COUNT%)"',
		'"$max(%PLAY_COUNT%,%2003_PLAYCOUNT%,0)"', '"$max(%2003_PLAYCOUNT%,%PLAY_COUNT%,0)"',
		'"$max(%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%)"', '"$max(%2003_PLAYCOUNT%,%LASTFM_PLAY_COUNT%)"',
		'"$max(%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%,0)"', '"$max(%2003_PLAYCOUNT%,%LASTFM_PLAY_COUNT%,0)"',
		'"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%,0)"', '"$max(%2003_PLAYCOUNT%,%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,0)"', '"$max(%LASTFM_PLAY_COUNT%,%PLAY_COUNT%,%2003_PLAYCOUNT%,0)"',
		'"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%)"', '"$max(%2003_PLAYCOUNT%,%PLAY_COUNT%,%LASTFM_PLAY_COUNT%)"', '"$max(%LASTFM_PLAY_COUNT%,%PLAY_COUNT%,%2003_PLAYCOUNT%)"',
		'%PLAY_COUNT%', '%2003_PLAYCOUNT%',
	]);
	const dateTags = new Set(['DATE', '%LAST_PLAYED_ENHANCED%', '%LAST_PLAYED%', '%2003_LAST_PLAYED%', '%ADDED_ENHANCED%', '%2003_ADDED%', '%ADDED%']);
	for (let rule of rules) {
		const tag = rule.field;
		const op = rule.operator;
		const valueArr = rule.value;
		const fbTag = this.getFbTag(tag);
		if (!fbTag.length || (bOmitPlaylist && fbTag === '#PLAYLIST#')) { continue; }
		let queryRule = '';
		// Check operators match specific tags
		switch (op) {
			case 'is': {
				if (textTags.has(fbTag)) {
					queryRule = valueArr.map((val) => { return fbTag + ' IS ' + val; }).join(' OR ');
				}
				break;
			}
			case 'isnot': {
				if (textTags.has(fbTag)) {
					queryRule = 'NOT (' + valueArr.map((val) => { return fbTag + ' IS ' + val; }).join(' OR ') + ')';
				}
				break;
			}
			case 'contains': {
				if (textTags.has(fbTag)) {
					queryRule = valueArr.map((val) => { return fbTag + ' HAS ' + val; }).join(' OR ');
				}
				break;
			}
			case 'doesnotcontain': {
				if (textTags.has(fbTag)) {
					queryRule = 'NOT (' + valueArr.map((val) => { return fbTag + ' HAS ' + val; }).join(' OR ') + ')';
				}
				break;
			}
			case 'startswith': { // $strstr(%artist%,Wilco) EQUAL 1
				if (textTags.has(fbTag)) {
					queryRule = valueArr.map((val) => { return '"$strstr(%' + fbTag.replace(/["%]/g, '') + '%,' + val + ')" EQUAL 1'; }).join(' OR ');
				}
				break;
			}
			case 'endswith': { // $strstr($right(%artist%,$len(Wilco)),Wilco) EQUAL 1
				if (textTags.has(fbTag)) {
					queryRule = valueArr.map((val) => { return '"$strstr($right(%' + fbTag.replace(/["%]/g, '') + '%,$len(' + val + ')),' + val + ')" EQUAL 1'; }).join(' OR ');
				}
				break;
			}
			case 'lessthan': {
				if (numTags.has(fbTag)) {
					queryRule = valueArr.map((val) => { return fbTag + ' LESS ' + val; }).join(' OR ');
				}
				break;
			}
			case 'greaterthan': {
				if (numTags.has(fbTag)) {
					queryRule = valueArr.map((val) => { return fbTag + ' GREATER ' + val; }).join(' OR ');
				}
				break;
			}
			case 'after': {
				if (dateTags.has(fbTag)) {
					queryRule = valueArr.map((val) => { return fbTag + ' AFTER ' + val; }).join(' OR ');
				}
				break;
			}
			case 'before': {
				if (dateTags.has(fbTag)) {
					queryRule = valueArr.map((val) => { return fbTag + ' BEFORE ' + val; }).join(' OR ');
				}
				break;
			}
			case 'inthelast': {
				if (dateTags.has(fbTag)) {
					queryRule = valueArr.map((val) => { return fbTag + ' DURING LAST ' + val; }).join(' OR ');
				}
				break;
			}
			case 'notinthelast': {
				if (dateTags.has(fbTag)) {
					queryRule = 'NOT (' + valueArr.map((val) => { return fbTag + ' DURING LAST ' + val; }).join(' OR ') + ')';
				}
				break;
			}
			default: {
				console.log('Operator not recognized: ' + op);
			}
		}
		if (queryRule.length) { query.push(queryRule); }
	}
	return (query.length ? this.queryJoin(query, match) || '' : '');
};

XSP.hasQueryPlaylists = function (jsp) {
	const playlist = jsp.playlist;
	const rules = playlist.rules;
	let bPlaylists = false;
	for (let rule of rules) { if (this.getFbTag(rule.field) === '#PLAYLIST#') { bPlaylists = true; break; } }
	return bPlaylists;
};

XSP.getQueryPlaylists = function (jsp) {
	const playlist = jsp.playlist;
	const rules = playlist.rules;
	const fields = new Set(rules.map((rule) => rule.field));
	if (fields.has('playlist') && fields.size > 1) { console.log('Warning: XSP Playlist with mixed standard queries and playlists as sources.'); }
	const query = { is: [], isnot: [] };
	for (let rule of rules) {
		const tag = rule.field;
		const op = rule.operator;
		const valueArr = rule.value;
		if (tag !== 'playlist') { continue; }
		switch (op) {
			case 'is': {
				query.is = query.is.concat(valueArr);
				break;
			}
			case 'isnot': {
				query.isnot = query.isnot.concat(valueArr);
				break;
			}
			default: {
				console.log('Operator not recognized: ' + op);
			}
		}
	}
	return query;
};

XSP.getSort = function (jsp) {
	const playlist = jsp.playlist;
	let sort = '';
	if (Object.hasOwn(playlist, 'order')) {
		const order = playlist.order[0];
		const keys = Object.keys(order);
		const direction = keys && keys.length ? keys[0] : null;
		if (direction) {
			const tag = order[direction];
			switch (direction) {
				case 'ascending': { sort = 'SORT ASCENDING BY'; break; }
				case 'descending': { sort = 'SORT DESCENDING BY'; break; }
				default: { console.log('Direction not recognized: ' + direction + (Object.hasOwn(jsp.playlist, 'name') && jsp.playlist.name.length ? ' (playlist \'' + jsp.playlist.name + '\')' : '')); break; }
			}
			if (sort.length) {
				let fbTag = this.getFbTag(tag);
				if (fbTag.length) { sort += ' ' + (!fbTag.match(/[%$]/g) ? '%' + fbTag + '%' : fbTag); }
			}
		}
	}
	return sort;
};

XSP.getFbTag = function (tag) {
	let fbTag = '';
	switch (tag) {
		// As is
		case 'genre':
		case 'album':
		case 'artist':
		case 'title':
		case 'comment':
		case 'bpm':
		case 'samplerate':
		case 'bitrate':
		case 'tracknumber': { fbTag = tag.toUpperCase(); break; }
		// Need %
		case 'filename':
		case 'path': { fbTag = '%' + tag.toUpperCase() + '%'; break; }
		// Are the same
		case 'rating':
		case 'userrating': { // Requires foo_playcount / foo_playcount_2003
			fbTag = XSP.isFo2k3 ? '$if2(%2003_RATING%,%RATING%)' : '%RATING%';
			break;
		}
		// Others...
		case 'noofchannels':
		case 'channels': { fbTag = '$info(CHANNELS)'; break; }
		case 'musicbitrate': { fbTag = '%BITRATE%'; break; }
		case 'year': { fbTag = 'DATE'; break; }
		case 'origyear': { fbTag = 'ORIGYEAR'; break; }
		case 'time': { fbTag = '%LENGTH_SECONDS%'; break; }
		case 'moods': { fbTag = 'MOOD'; break; }
		case 'themes': { fbTag = 'THEME'; break; }
		case 'styles': { fbTag = 'STYLE'; break; }
		case 'albumartist': { fbTag = '"ALBUM ARTIST"'; break; }
		case 'playcount': { // Requires foo_enhanced_playcount / foo_playcount / foo_playcount_2003
			fbTag = XSP.isFoec
				? XSP.isFo2k3
					? '"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%,0)"'
					: '"$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,0)"'
				: XSP.isFo2k3
					? '"$max(%PLAY_COUNT%,%2003_PLAYCOUNT%,0)"'
					: '%PLAY_COUNT%';
			break;
		}
		case 'lastplayed': { // Requires foo_enhanced_playcount / foo_playcount / foo_playcount_2003
			fbTag = XSP.isFoec
				? '%LAST_PLAYED_ENHANCED%'
				: XSP.isFo2k3
					? '%2003_LAST_PLAYED%'
					: '%LAST_PLAYED%';
			break;
		}
		case 'datenew':
		case 'dateadded': { // Requires foo_enhanced_playcount / foo_playcount / foo_playcount_2003
			fbTag = XSP.isFoec
				? '%ADDED_ENHANCED%'
				: XSP.isFo2k3
					? '%2003_ADDED%'
					: '%ADDED%';
			break;
		}
		case 'datemodified': { fbTag = '%LAST_MODIFIED%'; break; }
		// Special Tags
		case 'virtualfolder': // Remap to playlist which is the most similar thing...
		case 'playlist': { fbTag = '#PLAYLIST#'; break; } // Does not work in foobar2000 queries
		case 'random': { fbTag = '$rand()'; break; } // Does not work in foobar2000 queries
		default: {
			console.log('Tag not recognized: ' + tag);
		}
	}
	return fbTag;
};

XSP.getTag = function (fbTag) {
	let tag = '';
	let fbTaguc = fbTag.toUpperCase().replace(/["%]/g, ''); // removes % in any case to match all possibilities
	switch (fbTaguc) {
		case 'GENRE':
		case 'ALBUM':
		case 'ARTIST':
		case 'TITLE':
		case 'COMMENT':
		case 'TRACKNUMBER':
		case 'RATING': // Requires foo_playcount, userrating has no correspondence
		case 'FILENAME':
		case 'BPM':
		case 'SAMPLERATE':
		case 'BITRATE':
		case 'ORIGYEAR':
		case 'PATH': { tag = fbTaguc.toLowerCase(); break; }
		case 'YEAR':
		case 'DATE': { tag = 'year'; break; }
		case 'LENGTH_SECONDS': { tag = 'time'; break; }
		case 'MOOD': { tag = 'moods'; break; }
		case 'THEME': { tag = 'themes'; break; }
		case 'STYLE': { tag = 'styles'; break; }
		case 'ALBUM ARTIST': { tag = 'albumartist'; break; }
		case '$INFO(CHANNELS)': { tag = 'noofchannels'; break; }
		case '$MAX(PLAY_COUNT,LASTFM_PLAY_COUNT)': // Requires foo_enhanced_playcount
		case '$MAX(LASTFM_PLAY_COUNT,PLAY_COUNT)':
		case 'PLAY_COUNT': { tag = 'playcount'; break; } // Requires foo_playcount
		case 'LAST_PLAYED_ENHANCED': // Requires foo_enhanced_playcount
		case 'LAST_PLAYED': { tag = 'lastplayed'; break; } // Requires foo_playcount
		case 'ADDED_ENHANCED': // Requires foo_enhanced_playcount
		case 'ADDED': { tag = 'dateadded'; break; } // Requires foo_playcount
		case 'LAST_MODIFIED': { tag = 'datemodified'; break; } // Requires foo_playcount
		// Special tags
		case '#PLAYLIST#': { tag = 'playlist'; break; } // Does not work in foobar2000 queries, 'virtualfolder' will never be used here
		case '$RAND()': { tag = 'random'; break; } // Does not work in foobar2000 queries
		default: {
			console.log('Tag not recognized: ' + fbTag);
		}
	}
	return tag;
};

XSP.getMatch = function (jsp) {
	const playlist = jsp.playlist;
	return playlist.match === 'all' ? 'AND' : 'OR';
};

XSP.getLimit = function (jsp) {
	const playlist = jsp.playlist;
	const limit = Object.hasOwn(playlist, 'limit') && playlist.limit !== void (0) ? Number(playlist.limit) : null;
	return limit || Infinity; // 0 retrieves All
};

XSP.getOrder = function (queryOrSort) {
	let order = [];
	let direction = '';
	let fbTag = '';
	if (queryOrSort.match(/ *SORT.*$/)) {
		if (queryOrSort.match(/ *SORT BY .*$/)) { direction = 'ascending'; fbTag = queryOrSort.match(/(?: *SORT BY )(.*$)/)[1]; }
		else if (queryOrSort.match(/ *SORT DESCENDING BY .*$/)) { direction = 'descending'; fbTag = queryOrSort.match(/(?: *SORT DESCENDING BY )(.*$)/)[1]; }
		else if (queryOrSort.match(/ *SORT ASCENDING BY .*$/)) { direction = 'ascending'; fbTag = queryOrSort.match(/(?: *SORT ASCENDING BY )(.*$)/)[1]; }
		else { console.log('Sorting not recognized: ' + queryOrSort); }
	}
	if (direction.length && fbTag.length) {
		let tag = this.getTag(fbTag);
		if (tag.length) { order.push({ [direction]: tag }); }
	}
	return order;
};

XSP.getRules = function (querySort) {
	const bDebug = false;
	let rules = [];
	let match = '';
	let query = this.stripSort(querySort); // Ensure there is no sort clause
	if (query.length) {
		const searches = [
			{ regexp: /\) AND /g, split: [')', 'AND'] },
			{ regexp: /AND \(/g, split: ['AND', '('] },
			{ regexp: /\) AND \(/g, split: [')', 'AND', '('] },
			{ regexp: / AND /g, split: 'AND' },
			{ regexp: / OR /g, split: 'OR' },
			{ regexp: / *NOT \(/g, split: ['NOT', '('] },
			{ regexp: /^\(/g, split: '(' },
			{ regexp: /\)$/g, split: ')' }
		];
		const opposites = new Map([['is', 'isnot'], ['contains', 'doesnotcontain'], ['inthelast', 'notinthelast']]);
		let querySplit = [query];
		for (let search of searches) {
			querySplit = this.recursiveSplit(querySplit, search.regexp, search.split).flat(Infinity);
		}

		let idx = [];
		querySplit.forEach((q, i) => {
			if (q === '(' || q === ')') { idx.push(i); }
		});
		idx = idx.reduce(function (result, value, index, array) {
			if (index % 2 === 0) { result.push(array.slice(index, index + 2)); }
			return result;
		}, []);

		let querySplitCopy = [];
		if (idx.length) {
			querySplit.forEach((q, j) => {
				if (j < idx[0][0]) { querySplitCopy.push(q); }
				else if (j === idx[0][0]) { querySplitCopy.push([]); }
				else if (j >= idx[0][1]) { idx.splice(0, 1); }
				else { querySplitCopy[querySplitCopy.length - 1].push(q); }
			});
		} else { querySplitCopy = querySplit; }
		match = rules.length === 1 || querySplitCopy.every((item) => { return item !== 'OR' && item !== 'OR NOT'; }) ? 'all' : 'one';
		let prevOp = '';
		rules = querySplitCopy.map((query) => { return this.getRule(query); });
		let rulesV2 = rules.map((rule) => {
			if (Array.isArray(rule)) {
				return rule.map((r) => { return r.field || r; });
			} else { return rule.field || rule; }
		});
		let rulesV3 = [];
		const opSet = new Set(['is', 'contains', 'startswith', 'endswith', 'lessthan', 'greaterthan', 'inthelast']);
		rules.forEach((rule, i) => {
			if (Array.isArray(rule)) {
				let field = '';
				let operator = '';
				if (prevOp === 'NOT') { // Then also i !== 0
					if (rule.every((q) => {
						if (!field.length && q.field) { field = q.field; }
						if (!operator.length && q.operator) { operator = q.operator; }
						if (typeof q === 'object') { return q.field === field && q.operator === operator && opSet.has(operator); }
						else { return q === 'AND'; }
					})) { if (opposites.has(operator)) { rulesV3.push(opposites.get(operator)); } }
				} else {
					if (rule.every((q) => {
						if (!field.length && q.field) { field = q.field; }
						if (!operator.length && q.operator) { operator = q.operator; }
						if (typeof q === 'object') { return q.field === field && q.operator === operator && opSet.has(operator); }
						else { return q === 'OR'; }
					})) { rulesV3.push(operator); }
					else if (i === 0 && rule.every((q) => {
						if (typeof q === 'object') { return opSet.has(q.operator); }
						else { return q === 'AND'; }
					})) { rulesV3 = rulesV3.concat(rule.filter((q) => { return q !== 'AND'; }).map((q) => { return q.operator; })); }
					else if (prevOp === 'AND' && rule.every((q) => {
						if (typeof q === 'object') { return opSet.has(q.operator); }
						else { return q === 'AND'; }
					})) { rulesV3 = rulesV3.concat(rule.filter((q) => { return q !== 'AND'; }).map((q) => { return q.operator; })); }
				}
				prevOp = '';
			} else {
				prevOp = '';
				if (opSet.has(rule.operator)) { rulesV3.push(rule.operator); }
				else if (rule === 'AND') { prevOp = 'AND'; }
				else if (rule === 'NOT') { prevOp = 'NOT'; }
				else { rulesV3.push(rule); }
			}
		});
		let rulesV4 = [];
		prevOp = '';
		rules.forEach((rule, i) => {
			if (Array.isArray(rule)) {
				let field = '';
				let operator = '';
				let value = [];
				if (prevOp === 'NOT') { // Then also i !== 0
					if (rule.every((q) => {
						if (!field.length && q.field) { field = q.field; }
						if (!operator.length && q.operator) { operator = q.operator; }
						if (q.value && q.value.length) { value = value.concat(...q.value); }
						if (typeof q === 'object') { return q.field === field && q.operator === operator && opSet.has(operator); }
						else { return q === 'AND'; }
					})) { if (opposites.has(operator)) { rulesV4.push({ operator: opposites.get(operator), field, value }); } }
				} else {
					if (rule.every((q) => {
						if (!field.length && q.field) { field = q.field; }
						if (!operator.length && q.operator) { operator = q.operator; }
						if (q.value && q.value.length) { value = value.concat(...q.value); }
						if (typeof q === 'object') { return q.field === field && q.operator === operator && opSet.has(operator); }
						else { return q === 'OR'; }
					})) { rulesV4.push({ operator, field, value }); }
					else if (i === 0 && rule.every((q) => {
						if (typeof q === 'object') { return opSet.has(q.operator); }
						else { return q === 'AND'; }
					})) { rulesV4 = rulesV4.concat(rule.filter((q) => { return q !== 'AND'; })); }
					else if (prevOp === 'AND' && rule.every((q) => {
						if (typeof q === 'object') { return opSet.has(q.operator); }
						else { return q === 'AND'; }
					})) { rulesV4 = rulesV4.concat(rule.filter((q) => { return q !== 'AND'; })); }
				}
				prevOp = '';
			} else {
				prevOp = '';
				if (opSet.has(rule.operator)) { rulesV4.push(rule); }
				else if (rule === 'AND') { prevOp = 'AND'; }
				else if (rule === 'NOT') { prevOp = 'NOT'; }
				else { rulesV4.push(rule); }
			}
		});
		if (bDebug) {
			console.log(match); // DEBUG
			console.log('Split query in groups:\n', querySplitCopy); // DEBUG
			console.log('Retrieved rules:\n', rules); // DEBUG
			console.log('Tags:\n', rulesV2); // DEBUG
			console.log('Values:\n', rulesV3); // DEBUG
			console.log('Final rules after discarding and grouping:\n', rulesV4); // DEBUG
		}
		rules = (rulesV4 || []).filter((rule) => { return (typeof rule === 'object' && rule.field.length && rule.operator.length && rule.value.length); });
	}
	return { rules, match };
};

XSP.getRule = function (query) { // NOSONAR
	/** @type {{operator:string, field:string, value: any[]}|{operator:string, filed:string, value: any[]}[]} */
	let rule = { operator: '', field: '', value: [] };
	if (Array.isArray(query)) { rule = query.map((q) => { return this.getRule(q); }); }
	else {
		if (new Set(['AND', 'AND NOT', 'OR', 'NOT']).has(query)) { rule = query; }
		else {
			switch (true) {
				case query.match(/NOT [ #"%.+\-<>\w]* IS [ #,"%.+\-<>\w]*/g) !== null: {
					rule.operator = 'isnot';
					[, rule.field, rule.value] = query.match(/NOT ([ #"%.+\-<>\w]*) IS ([ #,"%.+\-<>\w]*)/);
					break;
				}
				case query.match(/[ #"%.+\-<>\w]* IS [ #,"%.+\-<>\w]*/g) !== null: {
					rule.operator = 'is';
					[, rule.field, rule.value] = query.match(/([ #"%.+\-<>\w]*) IS ([ #,"%.+\-<>\w]*)/);
					break;
				}
				case query.match(/NOT [ #"%.+\-<>\w]* HAS [ #,"%.+\-<>\w]*/g) !== null: {
					rule.operator = 'doesnotcontain';
					[, rule.field, rule.value] = query.match(/NOT ([ #"%.+\-<>\w]*) HAS ([ #,"%.+\-<>\w]*)/);
					break;
				}
				case query.match(/[ #"%.+\-<>\w]* HAS [ #,"%.+\-<>\w]*/g) !== null: {
					rule.operator = 'contains';
					[, rule.field, rule.value] = query.match(/([ #"%.+\-<>\w]*) HAS ([ #,"%.+\-<>\w]*)/);
					break;
				}
				case query.match(/\$strstr\([ %.+\-<>\w]*\) EQUAL 1/g) !== null: { // $strstr(%artist%,Wilco) EQUAL 1
					rule.operator = 'startswith';
					[, rule.field, rule.value] = query.match(/\$strstr\(([ %.+\-<>\w]*),([ ,#"%.+\-\w]*)/);
					break;
				}
				case query.match(/\$strstr\(\$right\([ %.+\-<>\w]*,\$len\([ #,"%.+\-<>\w]*\)\)[ #,"%.+\-<>\w]*\) EQUAL 1/g) !== null: { // $strstr($right(%artist%,$len(Wilco)),Wilco) EQUAL 1
					rule.operator = 'endswith';
					[, rule.field, rule.value] = query.match(/\$strstr\(\$right\(([ %.+\-<>\w]*),\$len\(([ #,"%.+\-<>\w]*)/);
					break;
				}
				case query.match(/[ %.+\-<>\w]* LESS [ \d]*/g) !== null: {
					rule.operator = 'lessthan';
					[, rule.field, rule.value] = query.match(/([ %.+\-<>\w]*) LESS ([ \d]*)/);
					break;
				}
				case query.match(/[ %.+\-<>\w]* GREATER [ \d]*/g) !== null: {
					rule.operator = 'greaterthan';
					[, rule.field, rule.value] = query.match(/([ %.+\-<>\w]*) GREATER ([ \d]*)/);
					break;
				}
				case query.match(/[ %.+\-<>\w]* AFTER [ \d]*/g) !== null: {
					rule.operator = 'after';
					[, rule.field, rule.value] = query.match(/([ ",%.-\w]*) AFTER ([ \d]*)/);
					break;
				}
				case query.match(/[ %.+\-<>\w]* BEFORE [ \d]*/g) !== null: {
					rule.operator = 'before';
					[, rule.field, rule.value] = query.match(/([ ",%.+\-\w]*) BEFORE ([ \d]*)/);
					break;
				}
				case query.match(/NOT [ %.+\-<>\w]* DURING LAST [ \w]*/g) !== null: {
					rule.operator = 'notinthelast';
					[, rule.field, rule.value] = query.match(/NOT ([ ",%.+\-\w]*) DURING LAST ([ \w]*)/);
					break;
				}
				case query.match(/[ %.+\-<>\w]* DURING LAST [ \w]*/g) !== null: {
					rule.operator = 'inthelast';
					[, rule.field, rule.value] = query.match(/([ ",%.+\-\w]*) DURING LAST ([ \w]*)/);
					break;
				}
				default: {
					console.log('Operator not recognized: ' + query);
				}
			}
			if (rule.value.length) { rule.value = [rule.value.trim().replace(/(^")|("$)/g, '')]; }
			if (rule.field.length) { rule.field = this.getTag(rule.field); }
		}
	}
	return rule;
};

// Joins an array of queries with 'SetLogic' between them: AND (NOT) / OR (NOT)
XSP.queryJoin = typeof queryJoin !== 'undefined'
	? queryJoin // eslint-disable-line no-undef
	: function (queryArray, setLogic = 'AND') {
		const logicDic = ['AND', 'OR', 'AND NOT', 'OR NOT'];
		setLogic = (setLogic || '').toUpperCase();
		if (!logicDic.includes(setLogic)) {
			console.log('queryJoin(): setLogic (' + setLogic + ') is wrong.');
			return '';
		}
		let arrayLen = queryArray.length;
		// Wrong array
		if (!Array.isArray(queryArray) || typeof queryArray === 'undefined' || queryArray === null || arrayLen === null || arrayLen === 0) {
			console.log('queryJoin(): queryArray [' + queryArray + '] was null, empty or not an array.');
			return ''; //Array was null or not an array
		}
		let query = '';
		let i = 0;
		while (i < arrayLen) {
			if (i === 0) {
				query += (arrayLen > 1 ? '(' : '') + queryArray[i] + (arrayLen > 1 ? ')' : '');
			} else {
				query += ' ' + setLogic + ' (' + queryArray[i] + ')';
			}
			i++;
		}
		return query;
	};

XSP.stripSort = typeof stripSort !== 'undefined'
	? stripSort // eslint-disable-line no-undef
	: function (query) { // NOSONAR
		let queryNoSort = query;
		if (RegExp(/ *SORT .*$/).exec(query)) {
			if (RegExp(/ *SORT BY .*$/).exec(query)) { queryNoSort = query.split(/( *SORT BY ).*$/)[0]; }
			else if (RegExp(/ *SORT DESCENDING BY .*$/).exec(query)) { queryNoSort = query.split(/( *SORT DESCENDING BY ).*$/)[0]; }
			else if (RegExp(/ *SORT ASCENDING BY .*$/).exec(query)) { queryNoSort = query.split(/( *SORT ASCENDING BY ).*$/)[0]; }
			else { queryNoSort = ''; }
		}
		return queryNoSort;
	};

XSP.recursiveSplit = function recursiveSplit(arr, regExp, split) {
	let copy;
	if (Array.isArray(arr)) {
		copy = arr.map((newArr) => this.recursiveSplit(newArr, regExp, split));
	} else {
		copy = arr.split(regExp)
			.map((item, i, ori) => i === ori.length - 1 ? (item.length ? [item] : []) : (item.length ? [item, split] : [split]))
			.flat(Infinity);
	}
	return copy;
};