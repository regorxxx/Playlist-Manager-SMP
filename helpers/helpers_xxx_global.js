'use strict';
//07/03/25

/* exported loadUserDefFile, addGlobValues, globFonts, globSettings*/

include('helpers_xxx.js');
/* global folders:readable */
include('helpers_xxx_file.js');
/* global _isFile:readable, _jsonParseFileCheck:readable, utf8:readable, _save:readable */

/*
	Global tags, queries, RegExp
*/
function loadUserDefFile(def) {
	let bSave = false;
	if (_isFile(def._file)) {
		const data = _jsonParseFileCheck(def._file, 'User definition file', window.Name, utf8);
		if (data) {
			const handleList = new FbMetadbHandleList();
			const skipCheckKeys = ['_description', '_usage'];
			if (def._type === 'TF' || def._type === 'Query' || def._type === 'Font' || def._type === 'Setting') {
				for (const key in data) {
					if (Object.hasOwn(def, key)) {
						def[key] = data[key];
						if (!skipCheckKeys.includes(key)) {
							if (def._type === 'Query' || def._type === 'TF') {
								if (!def[key] || !def[key].length) {
									fb.ShowPopupMessage(
										'There has been an error trying to parse the setting:\n' + key + ' (' + def._type + ' type)' +
										'\n\nValue is empty. It must be filled.'
										, 'Loading config from ' + def._file
									);
								}
								if (def._type === 'Query') {
									try {
										fb.GetQueryItems(handleList, def[key]);
										fb.GetQueryItems(handleList, '* HAS \'\' AND (' + def[key] + ')');
									} catch (e) { // eslint-disable-line no-unused-vars
										fb.ShowPopupMessage(
											'There has been an error trying to parse the setting:\n' + key + ' (' + def._type + ' type)' +
											'\n' + def[key] +
											'\n\nQuery non valid.'
											, 'Loading config from ' + def._file
										);
									}
								}
							} else if (def._type === 'Setting') {
								if (key.startsWith('b') && typeof def[key] !== 'boolean') {
									fb.ShowPopupMessage(
										'There has been an error trying to parse the setting:\n' + key + ' (' + def._type + ' type)' +
										'\n' + def[key] +
										'\n\nNot a boolean value (true/false).'
										, 'Loading config from ' + def._file
									);
								}
							} else if (def._type === 'Font') {
								if (!def[key] || !def[key].name || !def[key].name.length) {
									fb.ShowPopupMessage(
										'There has been an error trying to parse the setting:\n' + key + ' (' + def._type + ' type)' +
										'\n' + def[key] +
										'\n\nNo font name provided.'
										, 'Loading config from ' + def._file
									);
								} else if (!def[key].size || typeof def[key].size !== 'number') {
									fb.ShowPopupMessage(
										'There has been an error trying to parse the setting:\n' + key + ' (' + def._type + ' type)' +
										'\n' + def[key] +
										'\n\nNo font size provided.'
										, 'Loading config from ' + def._file
									);
									def[key].size = 10;
								}
							}
						}
					} else { bSave = true; }
				}
			} else if (def._type === 'RegExp') {
				for (const key in data) {
					if (Object.hasOwn(def, key)) {
						const back = { ...def[key] };
						def[key] = data[key];
						if (Object.hasOwn(def[key], 're')) { // Parse RegExp from strings and make sure it's valid or use default value
							let re, flag;
							try {
								[, re, flag] = def[key].re.match(/\/(.*)\/([a-z]+)?/);
								def[key].re = new RegExp(re, flag);
							} catch (e) { // eslint-disable-line no-unused-vars
								fb.ShowPopupMessage(
									'There has been an error trying to parse the RegExp expression:\n' + def[key].re +
									'\n\nParsed as:\n' + def[key].re +
									'\n\nExpression:\n' + re +
									'\n\nFlag:\n' + flag +
									'\n\nDefault value will be used:\n' + back.re.toSource()
									, 'Loading config from ' + def._file
								);
								def[key] = back;
							}
						} else { bSave = true; }
					}
				}
			}
			addGlobValues(def._type);
			if (!bSave) {
				const defKeys = Object.keys(def).filter((key) => key !== '_type' && key !== '_file');
				const fileKeys = Object.keys(data);
				if (defKeys.length !== fileKeys.length || defKeys.some((key) => !fileKeys.includes(key))) { bSave = true; }
			}
		}
	} else { addGlobValues(def._type); bSave = true; }
	if (bSave) {
		const { _type, _file, ...rest } = def; // eslint-disable-line no-unused-vars
		_save(_file, JSON.stringify(rest, (key, value) => { return (value instanceof RegExp ? value.toSource() : value); }, '\t').replace(/\n/g, '\r\n'));
	}
}

/* eslint-disable no-useless-escape */

/**
 * Add calculated properties to be saved on JSON
 *
 * @function
 * @name addGlobValues
 * @kind function
 * @param {('tags'|'query'|'all')} type
 * @returns {void}
 */
function addGlobValues(type) {
	const _t = (tag) => !tag.includes('%') && !tag.includes('$') ? '%' + tag+ '%' : tag;
	switch (type) {
		case 'TF':
			globTags.title = '$ascii($lower($trim($replace(' + _t(globTags.titleRaw) + ',\'\',,`,,’,,´,,-,,\\,,/,,:,,$char(34),))))'; // Takes ~1 sec on 80K tracks;
			globTags.artist = _t(globTags.artistRaw);
			globTags.artistFallback = globTags.artistRaw.replace(/\$meta_sep\(ALBUM ARTIST,'#'\)/g, '$if2($meta_sep(ALBUM ARTIST,\'#\'), $meta_sep(ARTIST,\'#\'))');
			globTags.sortPlayCount = '$sub(99999,' + _t(globTags.playCount) + ')';
			globTags.sortFirstPlayed = '$if3(%FIRST_PLAYED_ENHANCED%,%FIRST_PLAYED%,%2003_FIRST_PLAYED%)';
			globTags.sortLastPlayed = '$if3(%LAST_PLAYED_ENHANCED%,%LAST_PLAYED%,%2003_LAST_PLAYED%)';
			globTags.sortAdded = '$if3(%ADDED_ENHANCED%,%ADDED%,%2003_ADDED%)';
			globTags.isLoved = '$ifequal(' + _t(globTags.feedback) + ',1,1$not(0),0)';
			globTags.isHated = '$ifequal(' + _t(globTags.feedback) + ',-1,1$not(0),0)';
			globTags.isRatedTop = '$ifequal(' + _t(globTags.rating) + ',5,1$not(0),0)';
			globTags.remDupl = [globTags.title, globTags.artist, globTags.date];
			globTags.genreStyle = [globTags.genre, globTags.style, globTags.folksonomy];
			globTags.playCountRateSinceAdded = '$puts(val,$puts(pcr,$div($mul(' + globTags.playCount + ',100000),$add($mul($sub($year(' + globTags.sortLastPlayed + '),$year(' + globTags.sortAdded + ')),365),$mul($sub($month(' + globTags.sortLastPlayed + '),$month(' + globTags.sortAdded + ')),30),$sub($day_of_month(' + globTags.sortLastPlayed + '),$day_of_month(' + globTags.sortAdded + ')))))$left($ifgreater($mod($get(pcr),100000),0,$ifgreater($get(pcr),100000,,0)$insert($div($get(pcr),10000),\'.\',$sub($len($div($get(pcr),10000)),1))$ifgreater($mod($get(pcr),10000),0,$insert($div($get(pcr),1000),,$sub($len($div($get(pcr),1000)),1)),0),$div($get(pcr),100000)),4))$get(val)$iflonger($get(val),1,,.00)';
			globTags.playCountRateSincePlayed = '$puts(val,$puts(pcr,$div($mul(' + globTags.playCount + ',100000),$add($mul($sub($year(' + globTags.sortLastPlayed + '),$year(' + globTags.sortFirstPlayed + ')),365),$mul($sub($month(' + globTags.sortLastPlayed + '),$month(' + globTags.sortFirstPlayed + ')),30),$sub($day_of_month(' + globTags.sortLastPlayed + '),$day_of_month(' + globTags.sortFirstPlayed + ')))))$left($ifgreater($mod($get(pcr),100000),0,$ifgreater($get(pcr),100000,,0)$insert($div($get(pcr),10000),\'.\',$sub($len($div($get(pcr),10000)),1))$ifgreater($mod($get(pcr),10000),0,$insert($div($get(pcr),1000),,$sub($len($div($get(pcr),1000)),1)),0),$div($get(pcr),100000)),4)$get(val)$iflonger($get(val),1,,.00)';
			globTags.playCountRateGlobalDay = '$puts(val,$puts(pcr,$div($mul(' + globTags.playCount + ',100000),$add($mul($sub(#YEAR#,$year(' + globTags.sortAdded + ')),365),$mul($sub(#MONTH#,$month(' + globTags.sortAdded + ')),30),$sub(#DAY#,$day_of_month(' + globTags.sortAdded + ')))))$left($ifgreater($mod($get(pcr),100000),0,$ifgreater($get(pcr),100000,,0)$insert($div($get(pcr),10000),\'.\',$sub($len($div($get(pcr),10000)),1))$ifgreater($mod($get(pcr),10000),0,$insert($div($get(pcr),1000),,$sub($len($div($get(pcr),1000)),1)),0),$div($get(pcr),100000)),4))$get(val)$iflonger($get(val),1,,.00)';
			globTags.playCountRateGlobalWeek = '$puts(val,$puts(pcr,$div($mul(' + globTags.playCount + ',100000),$add($mul($sub(#YEAR#,$year(' + globTags.sortAdded + ')),52),$mul($sub(#MONTH#,$month(' + globTags.sortAdded + ')),4),$div($sub(#DAY#,$day_of_month(' + globTags.sortAdded + ')),7))))$left($ifgreater($mod($get(pcr),100000),0,$ifgreater($get(pcr),100000,,0)$insert($div($get(pcr),10000),\'.\',$sub($len($div($get(pcr),10000)),1))$ifgreater($mod($get(pcr),10000),0,$insert($div($get(pcr),1000),,$sub($len($div($get(pcr),1000)),1)),0),$div($get(pcr),100000)),4))$get(val)$iflonger($get(val),1,,.00)';
			globTags.playCountRateGlobalMonth = '$puts(val,$puts(pcr,$div($mul(' + globTags.playCount + ',100000),$add($mul($sub(#YEAR#,$year(' + globTags.sortAdded + ')),12),$sub(#MONTH#,$month(' + globTags.sortAdded + ')))))$left($ifgreater($mod($get(pcr),100000),0,$ifgreater($get(pcr),100000,,0)$insert($div($get(pcr),10000),\'.\',$sub($len($div($get(pcr),10000)),1))$ifgreater($mod($get(pcr),10000),0,$insert($div($get(pcr),1000),,$sub($len($div($get(pcr),1000)),1)),0),$div($get(pcr),100000)),4))$puts(dec,$muldiv($sub(#DAY#,$day_of_month(' + globTags.sortAdded + ')),100,30))$puts(dec,$ifgreater($get(dec),0,$get(dec),00))$puts(val,$get(val)$iflonger($get(val),1,,.$get(dec)))$get(val)$iflonger($get(val),3,,0)';
			globTags.playCountRateGlobalYear = '$puts(val,$puts(pcr,$div($mul(' + globTags.playCount + ',100000),$sub(#YEAR#,$year(' + globTags.sortAdded + '))))$left($ifgreater($mod($get(pcr),100000),0,$ifgreater($get(pcr),100000,,0)$insert($div($get(pcr),10000),\'.\',$sub($len($div($get(pcr),10000)),1))$ifgreater($mod($get(pcr),10000),0,$insert($div($get(pcr),1000),,$sub($len($div($get(pcr),1000)),1)),0),$div($get(pcr),100000)),4))$puts(dec,$muldiv($sub(#MONTH#,$month(' + globTags.sortAdded + ')),100,12))$puts(dec,$ifgreater($get(dec),0,$get(dec),00))$puts(val,$get(val)$iflonger($get(val),1,,.$get(dec)))$get(val)$iflonger($get(val),3,,0)';
			globTags.playCountExpectedSinceAdded = '$div($mul($div($mul(' + globTags.playCount + ',100000),$add($mul($sub($year(' + globTags.sortLastPlayed + '),$year(' + globTags.sortAdded + ')),365),$mul($sub($month(' + globTags.sortLastPlayed + '),$month(' + globTags.sortAdded + ')),30),$sub($day_of_month(' + globTags.sortLastPlayed + '),$day_of_month(' + globTags.sortAdded + ')))),$add($mul($sub(#YEAR#,$year(' + globTags.sortAdded + ')),365),$mul($sub(#MONTH#,$month(' + globTags.sortFirstPlayed + ')),30),$sub(#DAY#,$day_of_month(' + globTags.sortAdded + ')))),100000)';
			globTags.playCountExpectedSincePlayed = '$div($mul($div($mul(' + globTags.playCount + ',100000),$add($mul($sub($year(' + globTags.sortLastPlayed + '),$year(' + globTags.sortFirstPlayed + ')),365),$mul($sub($month(' + globTags.sortLastPlayed + '),$month(' + globTags.sortFirstPlayed + ')),30),$sub($day_of_month(' + globTags.sortLastPlayed + '),$day_of_month(' + globTags.sortFirstPlayed + ')))),$add($mul($sub(#YEAR#,$year(' + globTags.sortFirstPlayed + ')),365),$mul($sub(#MONTH#,$month(' + globTags.sortFirstPlayed + ')),30),$sub(#DAY#,$day_of_month(' + globTags.sortFirstPlayed + ')))),100000)';
			break;
		case 'Query':
			globQuery.noFemale = 'NOT (' + globQuery.female + ')';
			globQuery.noInstrumental = 'NOT (' + globQuery.instrumental + ')';
			globQuery.noAcoustic = 'NOT (' + globQuery.acoustic + ')';
			globQuery.liveHifi = '(' + globQuery.live + ') AND (' + globQuery.hifi + ')';
			globQuery.noLiveNone = 'NOT (' + globQuery.live + ')';
			globQuery.noLive = globQuery.noLiveNone + ' OR (' + globQuery.liveHifi + ')';
			globQuery.noSACD = 'NOT (' + globQuery.SACD + ')';
			globQuery.remDuplBias = globTags.rating +
				'|$ifgreater($strstr($lower(' + globTags.genreStyle.map((t) => _t(t)).join('\', \'') + '),live),0,0,1)' +
				'|$ifgreater($if2($strstr($lower(' + globTags.genreStyle.map((t) => _t(t)).join('\', \'') + '),instrumental),$strstr($lower(%LANGUAGE%),zxx)),0,0,1)' +
				'|$add(1,' + _t(globTags.feedback) + ')' +
				'|$if($strstr($lower(%TRACKDSP%),best),1,0)' +
				'|$ifgreater(%__CHANNELS%,2,0,1)' +
				'|$add($ifgreater(%__BITSPERSAMPLE%,16,0,1),$ifgreater(%__SAMPLERATE%,44100,0,1),$if($stricmp(%__ENCODING%,lossless),1,0))' +
				'|%DYNAMIC RANGE%' +
				'|' + globTags.playCount;
			globQuery.fav = '((' + globQuery.loved + ') OR (' + globQuery.ratingTop + '))';
			globQuery.compareTitle = '"$stricmp(' + _t(globTags.title) + ',#' + globTags.title + '#)" IS 1';
			break;
		case 'All':
			addGlobValues('tags');
			addGlobValues('query');
			break;
	}
}

/* eslint-enable no-useless-escape */

// Tags: user replaceable with a presets file at folders.data
const globTags = {
	_type: 'TF',
	_file: folders.userPresetsGlobal + 'globTags.json',
	_description: 'These tags are used across all tools, being the default values. In case you use other tags, for ex. for KEY, edit it here and every new panel installed will use the new value by default (not requiring manual tag remapping on every panel). Already existing panels will only load these values when using the "Reset to defaults" option (if available).',
	_usage: 'Don\'t add multiple tags to these variables. TITLE, DATE and RATING must be enclosed on %. Special characters like single quotes (\') or backslash (\\) must be properly escaped. Remember to also properly escape special characters according to TF rules!',
	titleRaw: 'TITLE',
	date: '$year(%DATE%)',
	artistRaw: 'ALBUM ARTIST',
	composer: 'COMPOSER',
	locale: 'LOCALE LAST.FM',
	genre: 'GENRE',
	style: 'STYLE',
	mood: 'MOOD',
	bpm: 'BPM',
	key: 'KEY',
	rating: '%RATING%',
	acoustidFP: 'ACOUSTID_FINGERPRINT_RAW',
	fooidFP: 'FINGERPRINT_FOOID',
	playCount: '$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%,%2003_PLAYCOUNT%,0)',
	skipCount: '$max(%SKIP_COUNT%,%SKIP_TRACK_SKIP_COUNT%,0)',
	folksonomy: 'FOLKSONOMY',
	feedback: 'FEEDBACK',
	related: 'RELATED',
	unrelated: 'UNRELATED',
	lbSimilarArtist: 'SIMILAR ARTISTS LISTENBRAINZ',
	sbdSimilarArtist: 'SIMILAR ARTISTS SEARCHBYDISTANCE',
	camelotKey: '$if($stricmp(%KEY%,G#m),$puts(kTrans,1A))$if($stricmp(%KEY%,Abm),$puts(kTrans,1A))$if($stricmp(%KEY%,D#m),$puts(kTrans,2A))$if($stricmp(%KEY%,Ebm),$puts(kTrans,2A))$if($stricmp(%KEY%,A#m),$puts(kTrans,3A))$if($stricmp(%KEY%,Bbm),$puts(kTrans,3A))$if($stricmp(%KEY%,Fm),$puts(kTrans,4A))$if($stricmp(%KEY%,Cm),$puts(kTrans,5A))$if($stricmp(%KEY%,Gm),$puts(kTrans,6A))$if($stricmp(%KEY%,Dm),$puts(kTrans,7A))$if($stricmp(%KEY%,Am),$puts(kTrans,8A))$if($stricmp(%KEY%,Em),$puts(kTrans,9A))$if($stricmp(%KEY%,Bm),$puts(kTrans,10A))$if($stricmp(%KEY%,F#m),$puts(kTrans,11A))$if($stricmp(%KEY%,Gbm),$puts(kTrans,11A))$if($stricmp(%KEY%,C#m),$puts(kTrans,12A))$if($stricmp(%KEY%,Dbm),$puts(kTrans,12A))$if($stricmp(%KEY%,6m),$puts(kTrans,1A))$if($stricmp(%KEY%,7m),$puts(kTrans,2A))$if($stricmp(%KEY%,8m),$puts(kTrans,3A))$if($stricmp(%KEY%,9m),$puts(kTrans,4A))$if($stricmp(%KEY%,10m),$puts(kTrans,5A))$if($stricmp(%KEY%,11m),$puts(kTrans,6A))$if($stricmp(%KEY%,12m),$puts(kTrans,7A))$if($stricmp(%KEY%,1m),$puts(kTrans,8A))$if($stricmp(%KEY%,2m),$puts(kTrans,9A))$if($stricmp(%KEY%,3m),$puts(kTrans,10A))$if($stricmp(%KEY%,4m),$puts(kTrans,11A))$if($stricmp(%KEY%,5m),$puts(kTrans,12A))$if($stricmp(%KEY%,B),$puts(kTrans,1B))$if($stricmp(%KEY%,F#),$puts(kTrans,2B))$if($stricmp(%KEY%,Gb),$puts(kTrans,2B))$if($stricmp(%KEY%,C#),$puts(kTrans,3B))$if($stricmp(%KEY%,Db),$puts(kTrans,3B))$if($stricmp(%KEY%,G#),$puts(kTrans,4B))$if($stricmp(%KEY%,Ab),$puts(kTrans,4B))$if($stricmp(%KEY%,D#),$puts(kTrans,5B))$if($stricmp(%KEY%,Eb),$puts(kTrans,5B))$if($stricmp(%KEY%,A#),$puts(kTrans,6B))$if($stricmp(%KEY%,Bb),$puts(kTrans,6B))$if($stricmp(%KEY%,F),$puts(kTrans,7B))$if($stricmp(%KEY%,C),$puts(kTrans,8B))$if($stricmp(%KEY%,G),$puts(kTrans,9B))$if($stricmp(%KEY%,D),$puts(kTrans,10B))$if($stricmp(%KEY%,A),$puts(kTrans,11B))$if($stricmp(%KEY%,E),$puts(kTrans,12B))$if($stricmp(%KEY%,6d),$puts(kTrans,1B))$if($stricmp(%KEY%,7d),$puts(kTrans,2B))$if($stricmp(%KEY%,8d),$puts(kTrans,3B))$if($stricmp(%KEY%,9d),$puts(kTrans,4B))$if($stricmp(%KEY%,10d),$puts(kTrans,5B))$if($stricmp(%KEY%,11d),$puts(kTrans,6B))$if($stricmp(%KEY%,12d),$puts(kTrans,7B))$if($stricmp(%KEY%,1d),$puts(kTrans,8B))$if($stricmp(%KEY%,2d),$puts(kTrans,9B))$if($stricmp(%KEY%,3d),$puts(kTrans,10B))$if($stricmp(%KEY%,4d),$puts(kTrans,11B))$if($stricmp(%KEY%,5d),$puts(kTrans,12B))$if($get(kTrans),,$puts(kTrans,[%KEY%]))$get(kTrans)',
	openKey: '$if($stricmp(%KEY%,G#m),$puts(kTrans,1A))$if($stricmp(%KEY%,Abm),$puts(kTrans,1A))$if($stricmp(%KEY%,D#m),$puts(kTrans,2A))$if($stricmp(%KEY%,Ebm),$puts(kTrans,2A))$if($stricmp(%KEY%,A#m),$puts(kTrans,3A))$if($stricmp(%KEY%,Bbm),$puts(kTrans,3A))$if($stricmp(%KEY%,Fm),$puts(kTrans,4A))$if($stricmp(%KEY%,Cm),$puts(kTrans,5A))$if($stricmp(%KEY%,Gm),$puts(kTrans,6A))$if($stricmp(%KEY%,Dm),$puts(kTrans,7A))$if($stricmp(%KEY%,Am),$puts(kTrans,8A))$if($stricmp(%KEY%,Em),$puts(kTrans,9A))$if($stricmp(%KEY%,Bm),$puts(kTrans,10A))$if($stricmp(%KEY%,F#m),$puts(kTrans,11A))$if($stricmp(%KEY%,Gbm),$puts(kTrans,11A))$if($stricmp(%KEY%,C#m),$puts(kTrans,12A))$if($stricmp(%KEY%,Dbm),$puts(kTrans,12A))$if($stricmp(%KEY%,B),$puts(kTrans,1B))$if($stricmp(%KEY%,F#),$puts(kTrans,2B))$if($stricmp(%KEY%,Gb),$puts(kTrans,2B))$if($stricmp(%KEY%,C#),$puts(kTrans,3B))$if($stricmp(%KEY%,Db),$puts(kTrans,3B))$if($stricmp(%KEY%,G#),$puts(kTrans,4B))$if($stricmp(%KEY%,Ab),$puts(kTrans,4B))$if($stricmp(%KEY%,D#),$puts(kTrans,5B))$if($stricmp(%KEY%,Eb),$puts(kTrans,5B))$if($stricmp(%KEY%,A#),$puts(kTrans,6B))$if($stricmp(%KEY%,Bb),$puts(kTrans,6B))$if($stricmp(%KEY%,F),$puts(kTrans,7B))$if($stricmp(%KEY%,C),$puts(kTrans,8B))$if($stricmp(%KEY%,G),$puts(kTrans,9B))$if($stricmp(%KEY%,D),$puts(kTrans,10B))$if($stricmp(%KEY%,A),$puts(kTrans,11B))$if($stricmp(%KEY%,E),$puts(kTrans,12B))$if($get(kTrans),,$puts(kTrans,[%KEY%]))$if($stricmp($get(kTrans),1A),$puts(kTrans,6m))$if($stricmp($get(kTrans),2A),$puts(kTrans,7m))$if($stricmp($get(kTrans),3A),$puts(kTrans,8m))$if($stricmp($get(kTrans),4A),$puts(kTrans,9m))$if($stricmp($get(kTrans),5A),$puts(kTrans,10m))$if($stricmp($get(kTrans),6A),$puts(kTrans,11m))$if($stricmp($get(kTrans),7A),$puts(kTrans,12m))$if($stricmp($get(kTrans),8A),$puts(kTrans,1m))$if($stricmp($get(kTrans),9A),$puts(kTrans,2m))$if($stricmp($get(kTrans),10A),$puts(kTrans,3m))$if($stricmp($get(kTrans),11A),$puts(kTrans,4m))$if($stricmp($get(kTrans),12A),$puts(kTrans,5m))$if($stricmp($get(kTrans),1B),$puts(kTrans,6d))$if($stricmp($get(kTrans),2B),$puts(kTrans,7d))$if($stricmp($get(kTrans),3B),$puts(kTrans,8d))$if($stricmp($get(kTrans),4B),$puts(kTrans,9d))$if($stricmp($get(kTrans),5B),$puts(kTrans,10d))$if($stricmp($get(kTrans),6B),$puts(kTrans,11d))$if($stricmp($get(kTrans),7B),$puts(kTrans,12d))$if($stricmp($get(kTrans),8B),$puts(kTrans,1d))$if($stricmp($get(kTrans),9B),$puts(kTrans,2d))$if($stricmp($get(kTrans),10B),$puts(kTrans,3d))$if($stricmp($get(kTrans),11B),$puts(kTrans,4d))$if($stricmp($get(kTrans),12B),$puts(kTrans,5d))$get(kTrans)',
};

// Queries: user replaceable with a presets file at folders.data
const globQuery = {
	_type: 'Query',
	_file: folders.userPresetsGlobal + 'globQuery.json',
	_description: 'These are queries used across all the tools, being the default values. In case you want to expan the default queries with additional tags or values feel free to do so here. Every new panel installed will use the new values by default (not requiring manual editing on every panel). Already existing panels will only load these values when using the "Reset to defaults" option (if available).',
	_usage: 'Queries built with the globTags file. This file can be deleted to recreate it from the tags file. Otherwise feel free to finetune the queries. Special characters like single quotes (\') or backslash (\\) must be properly escaped. Remember to also properly escape special characters according to TF and query rules!',
	filter: 'NOT (' + globTags.rating + ' EQUAL 2 OR ' + globTags.rating + ' EQUAL 1) AND NOT (' + globTags.style + ' IS live AND NOT ' + globTags.style + ' IS hi-fi) AND %CHANNELS% LESS 3 AND NOT COMMENT HAS quad',
	female: '(' + globTags.style + ' IS female vocal OR ' + globTags.style + ' IS female OR ' + globTags.genre + ' IS female vocal OR ' + globTags.genre + ' IS female OR GENDER IS female)',
	instrumental: '(' + globTags.style + ' IS instrumental OR ' + globTags.genre + ' IS instrumental OR SPEECHNESS EQUAL 0 OR LANGUAGE IS zxx)',
	acoustic: '(' + globTags.style + ' IS acoustic OR ' + globTags.genre + ' IS acoustic OR ACOUSTICNESS GREATER 75)',
	notLowRating: 'NOT (' + globTags.rating + ' EQUAL 2 OR ' + globTags.rating + ' EQUAL 1)',
	ratingGr2: globTags.rating + ' GREATER 2',
	ratingGr3: globTags.rating + ' GREATER 3',
	ratingTop: globTags.rating + ' EQUAL 5',
	shortLength: '%LENGTH_SECONDS% LESS 360',
	stereo: '(%CHANNELS% LESS 3 AND NOT COMMENT HAS quad)',
	noRating: globTags.rating + ' MISSING',
	live: '(' + globTags.genre + ' IS live OR ' + globTags.style + ' IS live)',
	hifi: globTags.style + ' IS hi-fi',
	SACD: '(%_PATH% HAS .iso OR CODEC IS mlp OR CODEC IS dsd64 OR CODEC IS dst64)',
	recent: '(%LAST_PLAYED_ENHANCED% DURING LAST 4 WEEKS OR %LAST_PLAYED% DURING LAST 4 WEEKS OR %2003_LAST_PLAYED% DURING LAST 4 WEEKS)',
	added: '(%ADDED_ENHANCED% DURING LAST 4 WEEKS OR %ADDED% DURING LAST 4 WEEKS OR %2003_ADDED% DURING LAST 4 WEEKS)',
	loved: globTags.feedback + ' IS 1',
	hated: globTags.feedback + ' IS -1'
};

/* eslint-disable no-useless-escape */
// RegExp: user replaceable with a presets file at folders.data
const globRegExp = {
	_type: 'RegExp',
	_file: folders.userPresetsGlobal + 'globRegExp.json',
	_description: 'RegExp expressions mostly used for track matching on duplicates removal. File is loaded on the fly at startup, so no hard-saving on properties is involved (thus only requiring a panel reload to use the new values).',
	_usage: 'Most users will probably not need to touch these. Edit the "re" value, "default" is only provided for reference. Special characters like single quotes (\') or backslash (\\) must be properly escaped.',
	title: {
		re: /(?!\s+[\(\[](?:part.*|pt.*|act.*|A|B|I+V?X?|V+I{0,3})[\)\]])(?:\s+[\(\[].*[\)\]])(?=\||$)/i, // NOSONAR [must be a single regEx]
		desc: 'Identifies duplicates with advanced partial title matching. For example, tracks like these would be considered to be duplicates:\nMy track (live) | My track (acoustic) | My track (2022 remix) | ...\n\nTracks containing these keywords on parentheses or brackets are skipped:\npart |pt. | act | A | B | Roman numerals\n\nI.E. these tracks would not be considered to be the \'same track\' (unless the entire title is matched):\nMy track (part 1) | My track (pt. 2) | My track (act 2) | ....\n\nObviously these are no real \'duplicates\', but the philosophy behind the \'remove duplicates\' concept is not having 2 times the same song on a playlist, so having multiple versions of the same track is undesirable in many cases.'
	},
	ingAposVerbs: {
		re: /in'(?=\s+)/i,
		desc: 'Replaces verb-in\' words with verb-ing versions'
	},
	ingVerbs: {
		re: /\b(?:walk|talk|rock|kick|mak|shak|work|look|knock|sneak|park|break|makin|fuck|smok|drink|chok|tak|pick|shak|reel|truck|pack|cook|break|someth|check|think|juk|jerk|speak|fak|mack|suck|skank|folk|stack)(in)(?=\s+)/i, // NOSONAR [must be a single regEx]
		desc: 'Replaces verb-in words with verb-ing versions'
	},
	singleTags: {
		re: /(^|%)(title|album|date|year|tracknumber|mastering|description|comment)($|%)/i, // NOSONAR [must be a single regEx]
		desc: 'Multi-value tags will be split by \', \' if possible and matched individually at duplicates removal.'
	}
};
Object.keys(globRegExp).filter((k) => !k.startsWith('_')).forEach((k) => globRegExp[k].default = globRegExp[k].re); // Add default values
/* eslint-enable no-useless-escape */

// Fonts: user replaceable with a presets file at folders.data
const globFonts = {
	_type: 'Font',
	_file: folders.userPresetsGlobal + 'globFonts.json',
	_description: 'Fonts used by scripts at multiple places on UI. File is loaded on the fly at startup, so no hard-saving on properties is involved (thus only requiring a panel reload to use the new values). The fallback font can not be changed, is forced by SMP/foobar2000. Default fonts may be found within scripts/packages folders at \'_resources\\fonts\'.',
	_usage: 'Most users will probably not need to touch these. Adding a not-installed font should fallback into the default one (Segoe UI). Special characters like single quotes (\') or backslash (\\) must be properly escaped.',
	_fallback: { name: 'Segoe UI', size: 10 },
	button: { name: 'Segoe UI', size: 12 },
	buttonIcon: { name: 'FontAwesome', size: 12 },
	standard: { name: 'Segoe UI', size: 10 },
	standardSmall: { name: 'Segoe UI', size: 8 },
	standardMedium: { name: 'Segoe UI', size: 12 },
	standardBig: { name: 'Segoe UI', size: 15 }
};

// Fonts: user replaceable with a presets file at folders.data
const globSettings = {
	_type: 'Setting',
	_file: folders.userPresetsGlobal + 'globSettings.json',
	_description: 'Settings used by scripts at multiple places. File is loaded on the fly at startup, so no hard-saving on properties is involved (thus only requiring a panel reload to use the new values). The fallback font can not be changed, is forced by SMP/foobar2000.',
	_usage: 'Most users will probably not need to touch these, unless a setting wants to be applied to all new scripts installed by default',
	bAutoUpdateCheck: true,
	bAutoUpdateDownload: false,
	bAutoUpdateOpenWeb: true,
	// bAutoUpdateApply: false,
	bPopupOnCheckSOFeatures: true,
	bCheckSoFeatures: true,
	bProfileInit: false,
	bDebugPaint: false,
	bTooltip: true,
	bLogToFile: false,
	instanceManager: 'v1'
};