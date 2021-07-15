'use strict';
//01/06/21

include('helpers_xxx.js');
include('helpers_xxx_foobar.js');

/* 
	Global Variables 
*/
// Tags descriptors: 
// Always use .toLowerCase first before checking if the set has the string. For ex
// numericTags.has(tagName.toLowerCase())
const dynamicTags = new Set(['rating','$year(%date%)']); // Tags only found by title formatting
const numericTags = new Set(['date','year','bpm','dynamic range','album dynamic range','rating','$year(%date%)']);  // These are tags which are always a number
const cyclicTags = new Set(['dynamic_genre']); // These are numeric tags with limited range: {0...K, k + 1 = 0}
// Put here the corresponding function for the cyclic tag. Swap lower/upper values before return if required. They must be always ordered.
// ALWAYS RETURN [valueLower, valueUpper, lowerLimit, upperLimit];
// Object keys must match the tag names at cyclicTags... 
const cyclicTagsDescriptor =	{	
									//dyngenre_map_xxx.js
									dynamic_genre(tagValue, valueRange, bReturnLimits) {return dyn_genre_range(tagValue, valueRange, bReturnLimits);},
								};
// Add here the external files required for cyclic tags
var bLoadTags; // This tells the helper to load tags descriptors extra files. False by default
if (bLoadTags) {
	let externalPath = 	[
						folders.xxx + 'helpers\\dyngenre_map_xxx.js', //for dynamic_genre range function
					];

	for (let i = 0; i < externalPath.length; i++) {
		const path = externalPath[i];
		if ((isCompatible('1.4.0') ? utils.IsFile(path) : utils.FileTest(path, 'e'))) { //TODO: Deprecated
			console.log('cyclicTagsDescriptor - File loaded: ' + path);
			include(path, {always_evaluate: false});
		} else {
			console.log('cyclicTagsDescriptor - WARNING missing: ' + path);
		}
	}
}

const logicDic = ['and', 'or', 'and not', 'or not', 'AND', 'OR', 'AND NOT', 'OR NOT'];

/* 
	Query and tag manipulation 
*/

// Replace #str# with current values, where 'str' is a TF expression which will be evaluated on handle
// Use try/catch to test validity of the query output
function queryReplaceWithCurrent(query, handle) {
	if (!query.length) {console.log('queryReplaceWithCurrent(): query is empty'); return;}
	if (query.indexOf('#') !== -1 && !handle) {console.log('queryReplaceWithCurrent(): handle is null'); return;}
	if (query.indexOf('#') !== -1) {
		let idx = [query.indexOf('#')];
		let curr = idx[idx.length - 1];
		let next = -1;
		while (curr !== next) {
			curr = idx[idx.length - 1];
			next = query.indexOf('#', curr + 1);
			if (next !== -1 && curr !== next) {idx.push(next);}
			else {break;}
		}
		let count = idx.length;
		const startQuery = query[0] === '(' ? query.slice(0, query.split('').findIndex((s) => {return s !== '(';})) : '';
		const endQuery = query.length > idx[count - 1] ? query.slice(idx[count - 1] + 1, query.length) : '';
		if (count % 2 === 0) { // Must be on pairs of 2
			let tempQuery = '';
			let tfo = '', tfoVal = '';
			for (let i = 0; i < count; i += 2) {
				tfo = query.slice(idx[i] + 1, idx[i + 1]);
				// tfo = tfo.indexOf('$') === -1 ? '[%' + tfo + '%]' : '[' + tfo + ']';
				tfo = tfo.indexOf('$') === -1 ? '[$meta_sep(' + tfo + ',\'#\')]' : '[' + tfo + ']'; // Split multivalue tags if possible!
				tfo = fb.TitleFormat(tfo);
				tfoVal = tfo.EvalWithMetadb(handle);
				if (tfoVal.indexOf('#') !== -1) { // Split multivalue tags if possible!
					// tempQuery += query.slice((i > 0 ? idx[i - 1] + 1 : (startQuery.length ? startQuery.length : 0)), idx[i]);
					const interText = query.slice((i > 0 ? idx[i - 1] + 1 : (startQuery.length ? startQuery.length : 0)), idx[i]);
					const interQueryStart = interText[0] === ')' ? interText.slice(0, interText.split('').findIndex((s) => {return s !== ')';})) : '';
					const breakPoint = interText.lastIndexOf(' (');
					const interQueryEnd = breakPoint !== -1 ? interText.slice(interQueryStart.length, breakPoint + 2 + interText.slice(breakPoint + 2).split('').findIndex((s) => {return s !== '(';})) : '';
					// const interQueryEnd = breakPoint !== -1 ? interText.slice(interQueryStart.length, breakPoint + 2) : '';
					const interQuery = interQueryStart + interQueryEnd;
					const multiQuery  = tfoVal.split('#').map((val) => {return query.slice((i > 0 ? idx[i - 1] + interQuery.length + 1 : (startQuery.length ? startQuery.length : 0)), idx[i]) + val;})
					// tempQuery = tfoVal.split('#').map((val) => {return tempQuery + query.slice((i > 0 ? idx[i - 1] + 1 : (startQuery.length ? startQuery.length : 0)), idx[i]) + val;})
					// tempQuery = query_join(tempQuery, 'AND');
					tempQuery += interQuery + query_join(multiQuery, 'AND');
				} else {
					tempQuery += query.slice((i > 0 ? idx[i - 1] + 1 : (startQuery.length ? startQuery.length : 0)), idx[i]) + tfoVal;
				}
				// tempQuery = tempQuery + query.slice((i > 0 ? idx[i - 1] + 1 : 0), idx[i]) + tfoVal;
			}
			query = startQuery + tempQuery + endQuery;
		}
	}
	return query;
}

// Joins an array of queries with 'SetLogic' between them: AND (NOT) / OR (NOT)
function query_join(queryArray, setLogic) {
		if (logicDic.indexOf(setLogic) === -1) {
			console.log('query_join(): setLogic (' + setLogic + ') is wrong');
			return;
		}
		let arrayLength = queryArray.length;
		// Wrong array
		let isArray = Object.prototype.toString.call(queryArray) === '[object Array]' ? 1 : 0; //queryArray
		if (!isArray || typeof queryArray === 'undefined' || queryArray === null || arrayLength === null || arrayLength === 0) {
			console.log('query_join(): queryArray [' + queryArray + '] was null, empty or not an array');
			return; //Array was null or not an array
		}
		
		let query = '';
		let i = 0;
		while (i < arrayLength) {
			if (i === 0) {
				query += (arrayLength > 1 ? '(' : '') + queryArray[i] + (arrayLength > 1 ? ')' : '');
			} else {
				query += ' ' + setLogic + ' (' + queryArray[i] + ')';
			}
			i++;
		}
		return query;
}

// It gets either a 2D array of tag values [[,],...], output from k_combinations(), or 1D array, and creates a query for all those combinations. 
// For 2D, every subset uses 'subtagsArrayLogic' between the tags. And then 'tagsArrayLogic' between subsets. QueryKey is the tag name.
// So that means you can create queries like:
// '(MOOD IS mood1 AND MOOD IS mood2) OR (MOOD IS mood1 AND MOOD IS mood3) OR ...'
// Currently configurable only AND (NOT) / OR (NOT) logics.
// For 1D arrays, only 'tagsArrayLogic' is used. i.e. 'STYLE IS style1 OR STYLE IS style2 ...'
function query_combinations(tagsArray, queryKey, tagsArrayLogic, subtagsArrayLogic) {
		// Wrong tagsArray
		if (tagsArray === null || Object.prototype.toString.call(tagsArray) !== '[object Array]' || tagsArray.length === null || tagsArray.length === 0) {
			console.log('query_combinations(): tagsArray [' + tagsArray + '] was null, empty or not an array');
			return; //Array was null or not an array
		}
		if (typeof queryKey === 'undefined' || queryKey === null || !queryKey) {
			console.log('query_combinations(): queryKey not set');
			return;
		}
		if (isArrayStrings(queryKey)) {
			let queryKeyLength = queryKey.length;
			let i = 0;
			let queryArray = [];
			while (i < queryKeyLength) {
				queryArray.push(query_combinations(tagsArray, queryKey[i], tagsArrayLogic, subtagsArrayLogic));
				i++;
			}
			return queryArray;
		}
		let tagsArrayLength = tagsArray.length;
		let query = '';
		let isArray = Object.prototype.toString.call(tagsArray[0]) === '[object Array]' ? 1 : 0; //subtagsArray
		if (!isArray) { //no subtagsArrays
			if (logicDic.indexOf(tagsArrayLogic) === -1) {
				console.log('query_combinations(): tagsArrayLogic (' + tagsArrayLogic + ') is wrong');
				return;
			}
			let i = 0;
			while (i < tagsArrayLength) {
				if (i === 0) {
					query += queryKey + ' IS ' + tagsArray[0];
				} else {
					query += ' ' + tagsArrayLogic + ' ' + queryKey + ' IS ' + tagsArray[i];
				}
				i++;
			}
		} else {
			if (logicDic.indexOf(tagsArrayLogic) === -1 || !logicDic.indexOf(subtagsArrayLogic) === -1) {
				console.log('query_combinations(): tagsArrayLogic (' + tagsArrayLogic + ') or subtagsArrayLogic (' + subtagsArrayLogic + ') are wrong');
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
						query += (k > 1 ? '(' : '') + queryKey + ' IS ' + tagsArray[i][0]; // only adds pharentesis when more than one subtag! Estetic fix...
					} else {
						query += ' ' + subtagsArrayLogic + ' ' + queryKey + ' IS ' + tagsArray[i][j];
					}
					j++;
				}
				query += (k > 1 ? ')' : '');
				i++;
			}
		}
		return query;
}

function checkQuery(query, bAllowEmpty, bAllowSort = false) {
	let bPass = true;
	if (!bAllowEmpty && !query.length) {return false;}
	let queryNoSort = query;
	if (bAllowSort) {
		const fromIndex = query.indexOf('SORT');
		if (query.indexOf('SORT') !== -1) {
			if (query.indexOf(' SORT BY ') !== -1) {queryNoSort = query.split(' SORT BY ')[0]}
			else if (query.indexOf(' SORT DESCENDING BY ') !== -1) {queryNoSort = query.split(' SORT DESCENDING BY ')[0]}
			else if (query.indexOf(' SORT ASCENDING BY ') !== -1) {queryNoSort = query.split(' SORT ASCENDING BY ')[0]}
			else {return false;} // Has a typo on sort
			if (query.indexOf('$', fromIndex) !== -1) { // Functions require quotes around them
				const firstQuote = query.indexOf('"', fromIndex);
				if (firstQuote === -1)  {return false;} 
				else if (firstQuote === query.lastIndexOf('"')) {return false;}
				else if (query.slice(fromIndex).match(/"/g).length % 2 !== 0) {return false;}
			}
		}
	}
	try {fb.GetQueryItems(new FbMetadbHandleList(), queryNoSort);}
	catch (e) {bPass = false;}
	return bPass;
}

// Must check query first to be sure it's a valid query!
function stripSort(query) {
	let queryNoSort = query;
	if (query.indexOf('SORT') !== -1) {
		if (query.indexOf(' SORT BY ') !== -1) {queryNoSort = query.split(' SORT BY ')[0]}
		else if (query.indexOf(' SORT DESCENDING BY ') !== -1) {queryNoSort = query.split(' SORT DESCENDING BY ')[0]}
		else if (query.indexOf(' SORT ASCENDING BY ') !== -1) {queryNoSort = query.split(' SORT ASCENDING BY ')[0]}
	}
	return queryNoSort;
}

function getTagsValues(handle, tagsArray, bMerged = false) {
	if (!isArrayStrings (tagsArray)) {return null;}
	if (!handle) {return null;}
	
	const selInfo = sel.GetFileInfo();
	const tagArray_length = tagsArray.length;
	let outputArray = [];
	let i = 0;
	
	while (i < tagArray_length) {
		let tagValues = [];
		const tagIdx = selInfo.MetaFind(tagsArray[i]);
        const tagNumber = (tagIdx !== -1) ? selInfo.MetaValueCount(tagIdx) : 0;
		if (tagNumber !== 0) {
			let j = 0;
			while (j < tagNumber) {
				tagValues[j] = selInfo.MetaValue(tagIdx,j);
				j++;
			}
		}
		outputArray.push(tagValues);
		i++;
	}
	
	if (bMerged) {outputArray = outputArray.flat();}
	return outputArray;
}

function getTagsValuesV3(handle, tagsArray, bMerged = false) {
	if (!isArrayStrings (tagsArray)) {return null;}
	if (!handle) {return null;}
	
	const tagArray_length = tagsArray.length;
	let outputArray = [];
	let i = 0;
	let tagString = '';
	const outputArray_length = handle.Count;
	while (i < tagArray_length) {
		if (bMerged) {tagString += i === 0 ? '[%' + tagsArray[i] + '%]' : '[, ' + '%' + tagsArray[i] + '%]';} // We have all values separated by comma
		else {tagString += i === 0 ? '[%' + tagsArray[i] + '%]' : '| ' + '[%' + tagsArray[i] + '%]';} // We have tag values separated by comma and different tags by |
		i++;
	}
	let tfo = fb.TitleFormat(tagString);
	outputArray = tfo.EvalWithMetadbs(handle);
	if (bMerged) { // Just an array of values per track: n x 1
		for (let i = 0; i < outputArray_length; i++) {
			outputArray[i] = outputArray[i].split(', ');
			}
	} else { // Array of values tag and per track; n x tagNumber
		let tfo = fb.TitleFormat(tagString); 
		outputArray = tfo.EvalWithMetadbs(handle);
		for (let i = 0; i < outputArray_length; i++) {
			outputArray[i] = outputArray[i].split('| ');
			for (let j = 0; j < tagArray_length; j++) {
				outputArray[i][j] = outputArray[i][j].split(', ');
			}
		}
	}
	return outputArray;
}

function getTagsValuesV4(handle, tagsArray, bMerged = false, bEmptyVal = false) {
	if (!isArrayStrings (tagsArray)) {return null;}
	if (!handle) {return null;}
	
	const tagArray_length = tagsArray.length;
	let outputArrayi_length = handle.Count;
	let outputArray = [];
	let i = 0;
	while (i < tagArray_length) {
		if (tagsArray[i].toLowerCase() === 'skip') {
			outputArray[i] = [[]];
			i++;
			continue;
		}
		let tagString = ((tagsArray[i].indexOf('$') === -1) ? (bEmptyVal ? '%' + tagsArray[i] + '%' : '[%' + tagsArray[i] + '%]') : (bEmptyVal ? tagsArray[i]: '[' + tagsArray[i] + ']')); // Tagname or TF expression, with or without empty values
		let tfo = fb.TitleFormat(tagString);
		outputArray[i] = tfo.EvalWithMetadbs(handle);
		for (let j = 0; j < outputArrayi_length; j++) {
			outputArray[i][j] = outputArray[i][j].split(', ');
		}
		i++;
	}
	if (bMerged) {outputArray = outputArray.flat();}
	return outputArray;
}


function compareTagsValues(handle, tagsArray, bMerged = false) {
	
	let tags = getTagsValuesV3(handle, ['genre', 'composer'], true).flat();
	let genre = getTagsValuesV4(handle, ['genre', 'composer'], bMerged).flat(2);
	console.log(genre);
	console.log(tags);
	
	// let tagSet = new Set(tags[0][0].concat(tags[1][0]));
	// console.log(genreSet.difference(tagSet).size);
	// console.log(tagSet.difference(genreSet).size);
	// console.log([...genreSet]);
	// console.log([...tagSet]);
}