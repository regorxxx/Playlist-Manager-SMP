'use strict';
//20/10/21

include('..\\helpers-external\\xsp-to-jsp-parser\\xsp_parser.js');

XSP.getQuerySort = function(jsp) {
	let query = this.getQuery(jsp);
	let sort = query.length ? ' ' + this.getSort(jsp) : '';
	return query + sort;
}

XSP.getQuery = function(jsp) {
	const playlist = jsp.playlist;
	const match = playlist.match === 'all' ? 'AND' : 'OR';
	const rules = playlist.rules;
	let query = [];
	for (let rule of rules) {
		const tag = rule.field;
		const op = rule.operator;
		const valueArr = rule.value;
		let fbTag = this.getFbTag(tag);
		if (!fbTag.length) {continue;} 
		let queryRule = '';
		switch (op) {
			case 'is': {
				queryRule = valueArr.map((val) => {return fbTag + ' IS ' + val;}).join(' OR ');
				break;
			}
			case 'isnot': {
				queryRule = 'NOT (' + valueArr.map((val) => {return fbTag + ' IS ' + val;}).join(' OR ') +')';
				break;
			}
			case 'contains': {
				queryRule = valueArr.map((val) => {return fbTag + ' HAS ' + val;}).join(' OR ');
				break;
			}
			case 'doesnotcontain': {
				queryRule = 'NOT (' + valueArr.map((val) => {return fbTag + ' HAS ' + val;}).join(' OR ') +')';
				break;
			}
			case 'startswith': { // $strstr(%artist%,Wilco) EQUAL 1
				queryRule = valueArr.map((val) => {return '"$strstr(%' + fbTag.replace(/["%]/g,'') + '%,' + val + ')" EQUAL 1';}).join(' OR ');
				break;
			}
			case 'endswith': { // $strstr($right(%artist%,$len(Wilco)),Wilco) EQUAL 1
				queryRule = valueArr.map((val) => {return '"$strstr($right(%' + fbTag.replace(/["%]/g,'') + '%,$len(' + val + ')),' + val + ')" EQUAL 1';}).join(' OR ');
				break;
			}
			case 'lessthan': {
				queryRule = valueArr.map((val) => {return fbTag + ' LESS ' + val;}).join(' OR ');
				break;
			}
			case 'greaterthan': {
				queryRule = valueArr.map((val) => {return fbTag + ' GREATER ' + val;}).join(' OR ');
				break;
			}
			case 'inthelast': {
				queryRule = valueArr.map((val) => {return fbTag + ' DURING LAST ' + val;}).join(' OR ');
				break;
			}
			case 'notinthelast': {
				queryRule = 'NOT (' + valueArr.map((val) => {return fbTag + ' DURING LAST ' + val;}).join(' OR ') +')';
				break;
			}
			default: {
				console.log('Operator not recognized: ' + op);
			}
		}
		if (queryRule.length) {query.push(queryRule);}
	}
	query = query_join(query, match);
	return query;
}

XSP.getSort = function(jsp) {
	const playlist = jsp.playlist;
	let sort = '';
	if (playlist.hasOwnProperty('order')) {
		const order = playlist.order[0];
		const keys = Object.keys(order);
		const direction = keys && keys.length ? keys[0] : null;
		const tag = order[direction];
		switch (direction) {
			case 'ascending': {sort = 'SORT ASCENDING BY'; break;}
			case 'descending': {sort = 'SORT DESCENDING BY'; break;}
			default: {console.log('Direction not recognized: ' + direction); break;}
		}
		if (sort.length) {
			let fbTag = this.getFbTag(tag);
			if (fbTag.length) {sort += ' ' + fbTag;}
		}
	}
	return sort;
}

XSP.getFbTag = function(tag) {
	let fbTag = '';
	switch (tag) {
		// As is
		case 'genre':
		case 'album':
		case 'artist':
		case 'title':
		case 'comment':
		case 'tracknumber': {fbTag = tag; break;}
		// Need %
		case 'filename':
		case 'path': {fbTag = '%' + tag + '%'; break;}
		// Are the same
		case 'rating':
		case 'userrating': {fbTag = '%rating%'; break;} // Requires foo playcount
		// Idem
		case 'year':
		case 'time': {fbTag = 'date'; break;}
		// Others...
		case 'moods': {fbTag = 'mood'; break;}
		case 'themes': {fbTag = 'theme'; break;}
		case 'styles': {fbTag = 'style'; break;}
		case 'albumartist': {fbTag = "album artist"; break;}
		case 'playcount': {fbTag = '%play_count%'; break;} // Requires foo playcount
		case 'lastplayed': {fbTag = '%last_played%'; break;} // Requires foo playcount
		default: {
			console.log('Tag not recognized: ' + op);
		}
	}
	return fbTag.toUpperCase();
}

XSP.getTag = function(fbTag) {
	let tag = '';
	let fbTaglw = fbTag.toLowerCase();
	switch (fbTaglw) {
		// As is
		case 'genre':
		case 'album':
		case 'artist':
		case 'title':
		case 'comment':
		case 'tracknumber': {tag = fbTaglw; break;}
		// Remove %
		case '%rating%': // Requires foo playcount 
		case '%filename%':
		case '%path%': {tag = fbTaglw.replace(/["%]/g,''); break;}
		// userrating has no correspondence
		// Idem
		case 'year':
		case 'date': {tag = 'year'; break;}
		// time has no correspondence
		// Others...
		case 'mood': {tag = 'moods'; break;}
		case 'theme': {tag = 'themes'; break;}
		case 'style': {tag = 'styles'; break;}
		case '"album artist"': {tag = 'albumartist'; break;}
		case '%play_count%': {tag = 'playcount'; break;} // Requires foo playcount
		case '%last_played%': {tag = 'lastplayed'; break;} // Requires foo playcount
		default: {
			console.log('Tag not recognized: ' + fbTag);
		}
	}
	return tag;
}

XSP.getMatch = function(jsp) {
	const playlist = jsp.playlist;
	return  playlist.match === 'all' ? 'AND' : 'OR';
}

XSP.getLimit = function(jsp) {
	const playlist = jsp.playlist;
	const limit = playlist.hasOwnProperty('limit') && playlist.limit !== void(0) ? Number(playlist.limit) : null;
	return  limit || Infinity; // 0 is not a valid limit
}

XSP.getOrder = function(queryOrSort) {
	let order = [{}]; // TODO [] ?
	let direction = '';
	let fbTag = '';
	if (queryOrSort.indexOf('SORT') !== -1) {
		if (queryOrSort.indexOf(' SORT BY ') !== -1) {direction = 'ascending'; fbTag = queryOrSort.split(' SORT BY ')[1];}
		else if (queryOrSort.indexOf(' SORT ASCENDING BY ') !== -1) {direction = 'ascending'; fbTag = queryOrSort.split(' SORT ASCENDING BY ')[1];}
		else if (queryOrSort.indexOf(' SORT DESCENDING BY ') !== -1) {direction = 'descending'; fbTag = queryOrSort.split(' SORT DESCENDING BY ')[1];}
		else if (queryOrSort.startsWith('SORT BY' )) {direction = 'ascending'; fbTag = queryOrSort.split('SORT BY ')[1];}
		else if (queryOrSort.startsWith('SORT ASCENDING BY ')) {direction = 'ascending'; fbTag = queryOrSort.split('SORT ASCENDING BY ')[1];}
		else if (queryOrSort.startsWith('SORT DESCENDING BY ')) {direction = 'descending'; fbTag = queryOrSort.split('SORT DESCENDING BY ')[1];}
		else {console.log('Sorting not recognized: ' + queryOrSort);}
	}
	if (direction.length && fbTag.length) {
		let tag = this.getTag(fbTag);
		if (tag.length) {order[0][direction] = tag;}
	}
	return order;
}

XSP.getRules = function(querySort) {
	let rules = [];
	let match = '';
	let query = stripSort(querySort); // Ensure there is no sort clause
	if (query.length) {
		const searches = [
			{regexp: /\) AND /g, split: [')','AND']},
			{regexp: /AND \(/g, split: ['AND', '(']},
			{regexp: /\) AND \(/g, split: [')','AND', '(']},
			{regexp: /\) AND NOT /g, split: [')','AND NOT']},
			{regexp: / AND NOT \(/g, split: ['AND NOT','(']},
			{regexp: /\) AND NOT \(/g, split: [')','AND NOT','(']},
			{regexp: / AND NOT /g, split: 'AND NOT'},
			{regexp: / AND /g, split: 'AND'},
			{regexp: / NOT /g, split: 'NOT'},
			{regexp: / OR /g, split: 'OR'},
			{regexp: /^\(/g, split: '('},
			{regexp: /\)$/g, split: ')'}
		];
		let querySplit = [query];
		for (let search of searches) {
			querySplit = recursiveSplit(querySplit, search.regexp, search.split).flat(Infinity);
		}
		
		let idx = [];
		querySplit.forEach((q, i) => {
			if (q === '(' || q === ')') {idx.push(i);}
		});
		idx = idx.reduce(function(result, value, index, array) {
			if (index % 2 === 0)
			result.push(array.slice(index, index + 2));
			return result;
		}, []);
		
		let querySplitCopy = [];
		querySplit.forEach((q, j) => {
			if (j < idx[0][0]) {querySplitCopy.push(q);}
			else if (j === idx[0][0]) {querySplitCopy.push([])}
			else if (j >= idx[0][1]) {idx.splice(0,1);}
			else {querySplitCopy[querySplitCopy.length - 1].push(q);}
		});
		console.log(querySplitCopy);
		match = rules.length === 1 || querySplitCopy.every((item) => {return item !== 'OR' && item !== 'OR NOT';}) ? 'all' : 'one'
		console.log(match);
		rules = querySplitCopy.map((query) => {return this.getRule(query);});
		console.log(rules);
		let rulesV2 = [];
		rules.forEach((query) => {
			if (Array.isArray(query)) {
				if (query.every((q) => {return q === 'is' || q === 'or';})) {rulesV2.push('is');}
			} else {
				if (query !== 'AND') {rulesV2.push(query);}
			}
		});
		console.log(rulesV2);
	}
	return rules;
}

XSP.getRule = function(query) {
	let rule = '';
	if (Array.isArray(query)) {rule = query.map((q) => {return this.getRule(q);});}
	else {
		if (new Set(['AND','AND NOT','OR']).has(query)) {rule = query;}
		else {
			switch (true) {
				case query.match(/["A-z,%0-9 ]* IS ["A-z,%0-9 ]*/g) !== null: {
					rule = 'is';
					break;
				}
				// case 'isnot': {
					// rule = 'NOT (' + valueArr.map((val) => {return fbTag + ' IS ' + val;}).join(' OR ') +')';
					// break;
				// }
				case query.match(/["A-z,%0-9 ]* HAS ["A-z,%0-9 ]*/g) !== null: {
					rule = 'contains';
					break;
				}
				// case 'doesnotcontain': {
					// rule = 'NOT (' + valueArr.map((val) => {return fbTag + ' HAS ' + val;}).join(' OR ') +')';
					// break;
				// }
				case query.match(/\$strstr\([A-z,%0-9]*\) EQUAL 1/g) !== null: { // $strstr(%artist%,Wilco) EQUAL 1
					rule = 'startswith'
					break;
				}
				case query.match(/\$strstr\(\$right\([A-z,%0-9]*,\$len\([A-z,%0-9]*\)\)[A-z,%0-9]*\) EQUAL 1/g) !== null: { // $strstr($right(%artist%,$len(Wilco)),Wilco) EQUAL 1
					rule = 'endswith';
					break;
				}
				case query.match(/["A-z,%0-9 ]* LESS ["A-z,%0-9 ]*/g) !== null: {
					rule = 'lessthan';
					break;
				}
				case query.match(/["A-z,%0-9 ]* GREATER ["A-z,%0-9 ]*/g) !== null: {
					rule = 'greaterthan';
					break;
				}
				case query.match(/["A-z,%0-9 ]* DURING LAST ["A-z,%0-9 ]*/g) !== null: {
					rule = 'inthelast';
					break;
				}
				// case query.match(/["A-z,%0-9 ]* HAS ["A-z,%0-9 ]*/g): {
					// rule = 'NOT (' + valueArr.map((val) => {return fbTag + ' DURING LAST ' + val;}).join(' OR ') +')';
					// break;
				// }
				default: {
					console.log('Operator not recognized: ' + query);
				}
			}
		}
	}
	return rule;
}

if (!query_join) {
	const logicDic = ['and', 'or', 'and not', 'or not', 'AND', 'OR', 'AND NOT', 'OR NOT'];
	// Joins an array of queries with 'SetLogic' between them: AND (NOT) / OR (NOT)
	var query_join = function(queryArray, setLogic) {
			if (logicDic.indexOf(setLogic) === -1) {
				console.log('query_join(): setLogic (' + setLogic + ') is wrong.');
				return;
			}
			let arrayLength = queryArray.length;
			// Wrong array
			let isArray = Object.prototype.toString.call(queryArray) === '[object Array]' ? 1 : 0; //queryArray
			if (!isArray || typeof queryArray === 'undefined' || queryArray === null || arrayLength === null || arrayLength === 0) {
				console.log('query_join(): queryArray [' + queryArray + '] was null, empty or not an array.');
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
	};
}

if (!stripSort) {
	var stripSort = function(query) {
		let queryNoSort = query;
		if (query.indexOf('SORT') !== -1) {
			if (query.indexOf(' SORT BY ') !== -1) {queryNoSort = query.split(' SORT BY ')[0];}
			else if (query.indexOf(' SORT DESCENDING BY ') !== -1) {queryNoSort = query.split(' SORT DESCENDING BY ')[0];}
			else if (query.indexOf(' SORT ASCENDING BY ') !== -1) {queryNoSort = query.split(' SORT ASCENDING BY ')[0];}
		}
		return queryNoSort;
	}
}

function recursiveSplit(arr, regExp, split) {
	let copy;
	if (Array.isArray(arr)) {
		copy = arr.map((_) => {return recursiveSplit(_, regExp, split);});
	} else {
		copy = arr.split(regExp).map((item, i, ori) => {return i === ori.length - 1 ? (item.length ? [item] : []) : (item.length ? [item, split] : [split]);}).flat(Infinity)
	}
	return copy;
}