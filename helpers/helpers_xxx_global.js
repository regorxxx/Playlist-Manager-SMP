'use strict';
//29/07/23

/* 
	Global tags, queries, RegExp
*/
function loadUserDefFile(def) {
	let bSave = false;
	if (_isFile(def._file)) {
		const data = _jsonParseFileCheck(def._file, 'User definition file', window.Name, utf8);
		if (data) {
			if (def._type === 'TF' || def._type === 'Query' || def._type === 'Font') {
				for (let key in data) {
					if (def.hasOwnProperty(key)) {
						def[key] = data[key];
						// TODO: add TF checking?
					}
				}
			} else if (def._type === 'RegExp') {
				for (let key in data) {
					if (def.hasOwnProperty(key)) {
						const back = {...def[key]};
						def[key] = data[key];
						if (def[key].hasOwnProperty('re')) { // Parse RegExp from strings and make sure it's valid or use default value
							let re, flag;
							try {
								[, re, flag] = def[key].re.match(/\/(.*)\/([a-z]+)?/)
								def[key].re = new RegExp(re, flag);
							} catch (e) {
								fb.ShowPopupMessage(
									'There has been an error trying to parse the RegExp expression:\n' + def[key].re.toSource() +
									'\n\nParsed as:\n' +  def[key].re +
									'\n\nExpression:\n' + re +
									'\n\nFlag:\n' + flag +
									'\n\nDefault value will be used:\n' + back.re.toSource()
									, 'Loading config from ' + def._file
								);
								def[key] = back;
							}
						}
					}
				}
			}
			const defKeys = Object.keys(def).filter((key) => key !== '_type' && key !== '_file');
			if (defKeys.length !== Object.keys(data).length) {bSave = true;}
		}
	} else {bSave = true;}
	if (bSave) {
		const { _type, _file, ...rest} = def;
		_save(def._file, JSON.stringify(rest, (key, value) => {return (value instanceof RegExp ? value.toSource() : value);}, '\t'));
	}
}

function addGlobTags() { // Add calculated properties
	globTags.title = '$ascii($lower($trim($replace(%' + globTags.titleRaw + '%,\'\',,`,,’,,´,,-,,\\,,/,,:,,$char(34),))))'; // Takes ~1 sec on 80K tracks;
	globTags.artist = globTags.artistRaw.indexOf('%') === -1 && globTags.artistRaw.indexOf('$') === -1 ? '%' + globTags.artistRaw + '%' : globTags.artistRaw;
	globTags.artistFallback = globTags.artistRaw.replace(/\$meta_sep\(ALBUM ARTIST,\'#\'\)/g, '$if2($meta_sep(ALBUM ARTIST,\'#\'), $meta_sep(ARTIST,\'#\'))');;
	globTags.sortPlayCount = '$sub(99999,' + globTags.playCount + ')';
	globTags.remDupl = [globTags.title, globTags.artist, globTags.date];
	globTags.genreStyle = [globTags.genre, globTags.style, globTags.folksonomy];
	globQuery.compareTitle = '"$stricmp(' + (globTags.title.indexOf('$') === -1 ? '%' + globTags.title + '%' : globTags.title) + ',#' + globTags.title + '#)" IS 1';
	globQuery.noFemale = 'NOT (' + globQuery.female + ')';
	globQuery.noInstrumental = 'NOT (' + globQuery.instrumental + ')';
	globQuery.noAcoustic = 'NOT (' + globQuery.acoustic + ')';
	globQuery.remDuplBias = globTags.rating + '|$ifgreater($strstr($lower(' + globTags.genreStyle.map((t) => '%' + t + '%').join('\', \'') + '),live),0,0,1)|$ifgreater($if2($strstr($lower(' + globTags.genreStyle.map((t) => '%' + t + '%').join('\', \'') + '),instrumental),$strstr($lower(%LANGUAGE%),zxx)),0,0,1)';
}

// Tags: user replaceable with a presets file at folders.data
const globTags = {
	_type: 'TF',
	_file: folders.userPresetsGlobal + 'globTags.json',
	_description: 'These tags are used across all tools, being the default values. In case you use other tags, for ex. for KEY, edit it here and every new panel installed will use the new value by default (not requiring manual tag remapping on every panel). Already existing panels will only load these values when using the "Reset to defaults" option (if available).',
	_usage: 'Don\'t add multiple tags to these variables. TITLE, DATE and RATING must be enclosed on %. Special characters like single quotes (\') or backslash (\\) must be properly escaped. Remember to also properly escape special characters according to TF rules!',
	titleRaw: 'TITLE',
	date: '$year(%DATE%)',
	artistRaw: 'ALBUM ARTIST',
	genre: 'GENRE',
	style: 'STYLE',
	mood: 'MOOD',
	bpm: 'BPM',
	key: 'KEY',
	rating: '%RATING%',
	acoustidFP: 'ACOUSTID_FINGERPRINT_RAW',
	fooidFP: 'FINGERPRINT_FOOID',
	playCount: '$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%)',
	folksonomy: 'FOLKSONOMY',
	feedback: 'FEEDBACK',
};

// Queries: user replaceable with a presets file at folders.data
const globQuery = {
	_type: 'Query',
	_file: folders.userPresetsGlobal + 'globQuery.json',
	_description: 'These are queries used across all the tools, being the default values. In case you want to expan the default queries with additional tags or values feel free to do so here. Every new panel installed will use the new values by default (not requiring manual editing on every panel). Already existing panels will only load these values when using the "Reset to defaults" option (if available).',
	_usage: 'Queries built with the globTags file. This file can be deleted to recreate it from the tags file. Otherwise feel free to finetune the queries. Special characters like single quotes (\') or backslash (\\) must be properly escaped. Remember to also properly escape special characters according to TF and query rules!',
	filter: 'NOT (' + globTags.rating + ' EQUAL 2 OR ' + globTags.rating + ' EQUAL 1) AND NOT (' + globTags.style + ' IS live AND NOT ' + globTags.style + ' IS hi-fi) AND %CHANNELS% LESS 3 AND NOT COMMENT HAS quad',
	female: globTags.style + ' IS female vocal OR ' + globTags.style + ' IS female OR ' + globTags.genre + ' IS female vocal OR ' + globTags.genre + ' IS female OR GENDER IS female',
	instrumental: globTags.style + ' IS instrumental OR ' + globTags.genre + ' IS instrumental OR SPEECHNESS EQUAL 0 OR LANGUAGE IS zxx',
	acoustic: globTags.style + ' IS acoustic OR ' + globTags.genre + ' IS acoustic OR ACOUSTICNESS GREATER 75',
	notLowRating: 'NOT (' + globTags.rating + ' EQUAL 2 OR ' + globTags.rating + ' EQUAL 1)',
	ratingGr2: globTags.rating + ' GREATER 2',
	ratingGr3: globTags.rating + ' GREATER 3',
	shortLength: '%LENGTH_SECONDS% LESS 360',
	stereo: '%CHANNELS% LESS 3 AND NOT COMMENT HAS quad',
	noRating: globTags.rating + ' MISSING',
	noLive: '(NOT ' + globTags.genre + ' IS live AND NOT ' + globTags.style + ' IS live) OR ((' + globTags.genre + ' IS live OR ' + globTags.style + ' IS live) AND ' + globTags.style + ' IS hi-fi)',
	noLiveNone: 'NOT ' + globTags.genre + ' IS live AND NOT ' + globTags.style + ' IS live',
	noSACD: 'NOT %_PATH% HAS .iso AND NOT CODEC IS MLP AND NOT CODEC IS DSD64 AND NOT CODEC IS DST64',
};

// RegExp: user replaceable with a presets file at folders.data
const globRegExp = {
	_type: 'RegExp',
	_file: folders.userPresetsGlobal + 'globRegExp.json',
	_description: 'RegExp expressions mostly used for track matching on duplicates removal. File is loaded on the fly at startup, so no hard-saving on properties is involved (thus only requiring a panel reload to use the new values).',
	_usage: 'Most users will probably not need to touch these. Edit the "re" value, "default" is only provided for reference. Special characters like single quotes (\') or backslash (\\) must be properly escaped.',
	title: {
		re: /(?!\s+[\(\[](?:part.*|pt.*|act.*|A|B|I+V?X?|V+I{0,3})[\)\]])(?:\s+[\(\[].*[\)\]])(?=\||$)/i,
		desc: 'Identifies duplicates with advanced partial title matching. For example, tracks like these would be considered to be duplicates:\nMy track (live) | My track (acoustic) | My track (2022 remix) | ...\n\nTracks containing these keywords on parentheses or brackets are skipped:\npart |pt. | act | A | B | Roman numerals\n\nI.E. these tracks would not be considered to be the \'same track\' (unless the entire title is matched):\nMy track (part 1) | My track (pt. 2) | My track (act 2) | ....\n\nObviously these are no real \'duplicates\', but the philosophy behind the \'remove duplicates\' concept is not having 2 times the same song on a playlist, so having multiple versions of the same track is undesirable in many cases.'
	},
	ingAposVerbs: {
		re: /in'(?=\s+)/i,
		desc: 'Replaces verb-in\' words with verb-ing versions'
	},
	ingVerbs: {
		re: /\b(?:walk|talk|rock|kick|mak|shak|work|look|knock|sneak|park|break|makin|fuck|smok|drink|chok|tak|pick|shak|reel|truck|pack|cook|break|someth|check|think|juk|jerk|speak|fak|mack|suck|skank|folk|stack)(in)(?=\s+)/i,
		desc: 'Replaces verb-in words with verb-ing versions'
	}
};
Object.keys(globRegExp).filter((k) => !k.startsWith('_')).forEach((k) => globRegExp[k].default = globRegExp[k].re); // Add default values

// Fonts: user replaceable with a presets file at folders.data
const globFonts = {
	_type: 'Font',
	_file: folders.userPresetsGlobal + 'globFonts.json',
	_description: 'Fonts used by scripts at multiple places on UI. File is loaded on the fly at startup, so no hard-saving on properties is involved (thus only requiring a panel reload to use the new values). The fallback font can not be changed, is forced by SMP/foobar2000.',
	_usage: 'Most users will probably not need to touch these. Adding a not-installed font should fallback into the default one (Segoe UI). Special characters like single quotes (\') or backslash (\\) must be properly escaped.',
	_fallback: {name: 'Segoe UI', size: 10},
	tooltip: {name: !soFeat.popup ? 'Arial Unicode MS' : 'Tahoma', size: 10},
	button: {name: 'Segoe UI', size: 12},
	buttonIcon: {name: 'FontAwesome', size: 12},
	standard: {name: 'Segoe UI', size: 10},
	standardMedium: {name: 'Segoe UI', size: 12},
	standardBig: {name: 'Segoe UI', size: 15}
};