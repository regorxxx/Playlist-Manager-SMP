'use strict';
//05/06/23

/* 
	Objects
*/

function compareKeys(a, b) {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	return JSON.stringify(aKeys) === JSON.stringify(bKeys);
}

function isJSON(str) {
	let bDone = true;
	try {JSON.parse(str);}
	catch (e) {bDone = false;}
	return bDone;
}

function roughSizeOfObject(object) {
	let objectList = [];
	let stack = [object];
	let bytes = 0;
	while (stack.length) {
		let value = stack.pop();
		if (typeof value === 'boolean') {
			bytes += 4;
		}
		else if (typeof value === 'string') {
			bytes += value.length * 2;
		}
		else if (typeof value === 'number') {
			bytes += 8;
		}
		else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
			objectList.push(value);
			for (let i in value) {if (!value.hasOwnProperty(i)) {continue;} stack.push(value[i]);}
		}
	} // TODO Handle lists? TF?
	return bytes;
}

// deepAssign()(x,y)
// https://stackoverflow.com/a/48579540
function deepAssign(options = {nonEnum: false, symbols: false, descriptors: false, proto: false}) {
	return function deepAssignWithOptions (target, ...sources) {
		sources.forEach( (source) => {
			if (!isDeepObject(source) || !isDeepObject(target)){return;}
			// Copy source's own properties into target's own properties
			function copyProperty(property) {
				const descriptor = Object.getOwnPropertyDescriptor(source, property);
				//default: omit non-enumerable properties
				if (descriptor.enumerable || options.nonEnum) {
					// Copy in-depth first
					if (isDeepObject(source[property]) && isDeepObject(target[property])) {
						descriptor.value = deepAssign(options)(target[property], source[property]);
					}
					//default: omit descriptors
					if (options.descriptors) {
						Object.defineProperty(target, property, descriptor); // shallow copy descriptor
					} else {
						target[property] = descriptor.value; // shallow copy value only
					}
				}
			}
			// Copy string-keyed properties
			Object.getOwnPropertyNames(source).forEach(copyProperty);
			//default: omit symbol-keyed properties
			if (options.symbols) {
				Object.getOwnPropertySymbols(source).forEach(copyProperty);
			}
			//default: omit prototype's own properties
			if (options.proto) {
				// Copy souce prototype's own properties into target prototype's own properties
				deepAssign(Object.assign({},options,{proto:false})) (// Prevent deeper copy of the prototype chain
					Object.getPrototypeOf(target),
					Object.getPrototypeOf(source)
				);
			}
		});
		return target;
	}
}

function toType(a) {
	// Get fine type (object, array, function, null, error, date ...)
	return ({}).toString.call(a).match(/([a-z]+)(:?\])/i)[1];
}

function isDeepObject(obj) {
	return "Object" === toType(obj);
}

// Throw errors when trying to get length from objects
// Forces using typeof recipe === 'string' and similar but leads to cleaner code and no errors
Object.defineProperty(Object.prototype, 'length', {get() {throw new Error('No length property on objects. Probably a coding error.');}});

// Stringify without quotes
Object.defineProperty(Object.prototype, 'toStr', {
	configurable: false,
	value: function toStr({bClosure = false, bCapitalizeKeys = false, separator = ', '} = {}) {
		return (bClosure ? '{' : '') + Object.entries(this).map((entry) => {
			return (typeof entry[0] === 'object' ? entry[0].toStr() : bCapitalizeKeys ? capitalize(entry[0].toString()) : entry[0].toString()) + ': ' + (typeof entry[1] === 'object' ? entry[1].toStr() : entry[1].toString());
		}).join(separator) + (bClosure ? '}' : '');
	}
});

/* 
	Maps
*/

class biMap {
	constructor(map) {
	   this.map = map;
	   this.uniMap = {...this.map};
	   for (const key in map) {
		  const value = map[key];
		  this.map[value] = key;   
	   }
	}
	get(key) {return this.map[key];}
	has(key) {return this.map.hasOwnProperty(key);}
	keys() {return Object.keys(this.map);}
	uniKeys() {return Object.keys(this.uniMap);}
	values() {return Object.values(this.map);}
	uniValues() {return Object.values(this.uniMap);}
	entries() {return Object.entries(this.map);}
	uniEntries() {return Object.entries(this.uniMap);}
	set(key, value) {this.map[key] = value; this.uniMap[key] = value;}
	unset(key) {delete this.map[key]; delete this.uniMap[key]}
}

/* 
	Functions
*/

function isFunction(obj) {
	return !!(obj && obj.constructor && obj.call && obj.apply);
}

Function.prototype.applyInChunks = function applyInChunks() {
	const len = arguments.length;
	const max = 32768;
	let result = [];
	for (let i = 0; i < len; i++) {
		const arg = [...arguments[i]];
		const subLen = arg.length;
		let subResult = [];
		for (let j = 0; j < subLen; j++) {
			subResult.push(this.apply(null, arg.slice(j, Math.min(j + max, subLen))));
		}
		result[i] = this.apply(null, subResult);
	}
	return this.apply(null, result);
}

/* 
	Promises
*/

function isPromise(prom) {
	return prom && Object.prototype.toString.call(prom) === '[object Promise]';
}

if (!Promise.allSettled) {
	Object.defineProperty(Promise, 'allSettled', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: ((promises) => Promise.all(promises.map(p => p
			.then(value => ({
				status: 'fulfilled', value
			}))
			.catch(reason => ({
				status: 'rejected', reason
			}))
		)))
	});
}

// Promise.serial(['arg1', 'arg2',...], asyncFunc).then(...)
Object.defineProperty(Promise, 'serial', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: (inputValues, mapper, timeout = 0) => {
		const reducer = (acc$, inputValue, i) =>
			acc$.then(acc => {
				return (timeout
						? new Promise((resolve) => {setTimeout(() => resolve(mapper(inputValue, i)), timeout)})
						: mapper(inputValue, i)
					).then(result => acc.push(result) && acc);
			});
		return inputValues.reduce(reducer, Promise.resolve([]));
	}
});

// Promise.parallel(['arg1', 'arg2',...], asyncFunc).then(...)
Object.defineProperty(Promise, 'parallel', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: (inputValues, mapper, timeout = 0) => {
		const reducer = (inputValue, i) => {
			return timeout
				? new Promise((resolve) => {setTimeout(() => resolve(mapper(inputValue, i)), timeout)})
				: mapper(inputValue, i);
		};
		return Promise.allSettled(inputValues.map(reducer));
	}
});

Object.defineProperty(Promise, 'wait', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: (ms) => {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
});

/* 
	Strings
*/

// https://www.dotnetforall.com/difference-between-typeof-and-valueof-in-javascript/
// We don't care about object-wrapped strings, they are deprecated and not recommended.
function isString(str){
	return (typeof str === 'string' && str.length > 0) ? true : false;
}

function isStringWeak(str){
	return (typeof str === 'string') ? true : false;
}

String.prototype.replaceLast = function replaceLast(word, newWord) {
	const n = this.lastIndexOf(word);
	return this.slice(0, n) + this.slice(n).replace(word, newWord);
};

String.prototype.replaceAll = function replaceAll(word, newWord) {
	let copy = this;
	while (copy.indexOf(word) !== -1) {copy = copy.replace(word, newWord);}
	return copy;
};

String.prototype.count = function count(c) { 
	let result = 0, i = 0;
	for (i; i < this.length; i++) {
		if (this[i] == c) {result++;}
	}
	return result;
};

function capitalize(s) {
	if (!isString(s)) {return '';}
	return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function capitalizePartial(s) {
	if (!isString(s)) {return '';}
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalizeAll(s, sep = ' ', bJoinSep = true) { // Can use RegEx as separator, when using RegEx with capture groups to also include separators on split array, bJoinSep should be false to join 'as is'
	if (typeof s !== 'string') {return '';}
	if (isArray(sep)) {
		const copy = [...s.toLowerCase()];
		const len = s.length;
		for (const sep_i of sep) {
			s = capitalizeAll(s, sep_i, bJoinSep);
			for (let i = 0; i < len; i++) {
				if (s[i] === s[i].toUpperCase()) {
					copy[i] = s[i];
				}
			}
		}
		return copy.join('');
	}
	return s.split(sep).map( (subS) => {return subS.charAt(0).toUpperCase() + subS.slice(1).toLowerCase();}).join(bJoinSep ? sep : ''); // Split, capitalize each subString and join
}

function _p(value) {
	return '(' + value + ')';
}

function _q(value) {
	return '"' + value + '"';
}

function _b(value) {
	return '[' + value + ']';
}

function _t(tag) {
	return '%' + tag + '%';
}

function _bt(tag) {
	return _b(_t(tag));
}


function _ascii(tag) { // Don't miss quotes on queries!
	return '$ascii(' + tag + ')';
}

function _asciify(value) { // Mimics $ascii() Title Format function
	return (isStringWeak(value) ? value : String(value)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0142/g, 'l');
}
/* 
	Arrays
*/

function isArray(checkKeys) {
	if (checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0){
		return false; //Array was null or not an array
	}
	return true;
}

function isArrayStrings(checkKeys, bAllowEmpty = false) {
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		return false; //Array was null or not an array
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object String]') {
				return false; //values were null or not strings
			}
			if (!bAllowEmpty && checkKeys[i] === '') {
				return false; //values were empty
			}
		}
	}
	return true;
}

function isArrayNumbers(checkKeys) {
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0) {
		return false; //Array was null or not an array
	} else {
		let i = checkKeys.length;
		while (i--){
			if (Object.prototype.toString.call(checkKeys[i]) !== '[object Number]') {
				return false; //values were null or not numbers
			}
		}
	}
	return true;
}

function isArrayEqual(arrayA, arrayB) {
	return new Set(arrayA).isEqual(new Set(arrayB));
}

// Cycles an array n times. Changes the original variable.
// Use this to change states on buttons on click. So every click changes to next state.
// arr = [0,1,2]; arr.rotate(1); -> [1,2,0]
Array.prototype.rotate = (function() {
	const unshift = Array.prototype.unshift, splice = Array.prototype.splice;
	return function(count) {
		const len = this.length >>> 0;
		count = count >> 0;
		unshift.apply(this, splice.call(this, count % len, len));
		return this;
	};
})();

Array.prototype.swap = function(i, j) { 
	[this[i], this[j]] = [this[j], this[i]];
	return this;
};

// Randomly rearranges the items in an array, modifies original. Fisher-Yates algorithm
Array.prototype.shuffle = function() {
	let last = this.length, n;
	while (last > 0) {
		n = Math.floor(Math.random() * last--);
		[this[n], this[last]] = [this[last], this[n]];
	}
	return this;
};

// [3, 4, 5, 1, 2].move(3, 0, 2) // => [1, 2, 3, 4, 5]
Array.prototype.move = function(from, to, on) {
	this.splice(to, 0, this.splice(from, on)[0]);
};

function zeroOrVal(e){
	return (e === 0 || e);
}

function emptyOrVal(e){
	return (e === '' || e);
}

// Fisher-Yates algorithm on multiple arrays at the same time
Array.shuffle = function() {
	let last = 0;
	const argsLength = arguments.length;
	for (let idx = 0; idx < argsLength; idx++) {
		if (!isArray(arguments[idx])) {throw new TypeError("Argument is not an array.");}
		if (idx === 0) {last = arguments[0].length;}
		if (last !== arguments[idx].length) {throw new RangeError("Array lengths do not match.");}
	}
	let n;
	while (last > 0) {
		n = Math.floor(Math.random() * last--);
		for (let argsIndex = 0; argsIndex < argsLength; argsIndex++) {
			arguments[argsIndex].swap(last, n);
		}
	}
	return [...arguments];
};

// Join array and split lines every n elements joined
Array.prototype.joinEvery = function(sep, n, newLineChar = '\n') {
	const len = this.length;
	let i = 0;
	let str = '';
	while (i < len) {
		str += (str.length ? sep + newLineChar : '') + this.slice(i, i + n).join(sep);
		i += n;
	}
	return str;
};

Array.prototype.joinUpToChars = function(sep, chars) {
	let str = '';
	str = this.join(sep);
	if (str.length > chars) {str = str.slice(0, chars) + '...';}
	return str;
};

Array.prototype.multiIndexOf = function (el) { 
	const idxs = [];
	for (let i = this.length - 1; i >= 0; i--) {
		if (this[i] === el) {idxs.unshift(i);}
	}
	return idxs;
};

Array.prototype.partialSort = function (order, bOptimze = true) {
	if (bOptimize) {order = [...(new Set(order).intersection(new Set(this)))];}
	const profiler = new FbProfiler('partialSort');
	const orderIndex = [];
	const orderLen = order.length;
	for (let i = 0; i < orderLen; i++) {
		const idx = this.indexOf(order[i]);
		if (idx != -1) {orderIndex[i] = idx;}
	}
	const orderIdxLen = orderIndex.length;
	for (let i = 0; i < orderIdxLen; i++) {
		let indexI = orderIndex[i];
		for (let j = i + 1; j < orderIdxLen; j++) {
			const indexJ = orderIndex[j];
			if (indexI > indexJ) {
				[this[indexI], this[indexJ]] = [this[indexJ], this[indexI]];
				[orderIndex[i], orderIndex[j]] = [indexJ, indexI];
				indexI = indexJ;
			}
		}
	}
	profiler.Print();
	return this;
};

/* 
	Sets
*/

Set.prototype.isSuperset = function(subset) {
	for (let elem of subset) {
		if (!this.has(elem)) {
			return false;
		}
	}
	return true;
};

Set.prototype.union = function(setB) {
	let union = new Set(this);
	for (let elem of setB) {
		union.add(elem);
	}
	return union;
};

Set.prototype.intersection = function(setB) {
	let intersection = new Set();
	for (let elem of setB) {
		if (this.has(elem)) {
			intersection.add(elem);
		}
	}
	return intersection;
};

Set.prototype.difference = function(setB) {
	let difference = new Set(this);
	for (let elem of setB) {
		difference.delete(elem);
	}
	return difference;
};

Set.prototype.isEqual = function(subset) {
	return (this.size === subset.size && this.isSuperset(subset));
};

Set.prototype.unionSize = function(setB) {
	let size = 0;
	for (let elem of setB) {
		if (!this.has(elem)) {size++;}
	}
	return size;
};

Set.prototype.intersectionSize = function(setB) {
	let size = 0;
	for (let elem of setB) {
		if (this.has(elem)) {size++;}
	}
	return size;
};

Set.prototype.differenceSize = function(setB) {
	let size = this.size;
	for (let elem of setB) {
		if (this.has(elem)) {size--;}
	}
	return size;
};

/* 
	Numbers
*/

function isInt(n){
    return Number(n) === n && Number.isFinite(n) && n <= Number.MAX_SAFE_INTEGER && n % 1 === 0;
}

function isFloat(n){
    return Number(n) === n && Number.isFinite(n) && n % 1 !== 0;
}

// Adds/subtracts 'offset' to 'reference' considering the values must follow cyclic logic within 'limits' range (both values included)
// Ex: [1,8], x = 5 -> x + 4 = 1 <=> cyclicOffset(5, 4, [1,8])
function cyclicOffset(reference, offset, limits) {
		if (offset && reference >= limits[0] && reference <= limits[1]) {
			reference += offset;
			if (reference < limits[0]) {reference += limits[1];}
			if (reference > limits[1]) {reference -= limits[1];}
		}
		return reference;
}

const range = (start, stop, step) => new Array(Math.round((stop - start) / step + 1)).fill(void(0)).map((_, i) => start + (i * step));

function round(floatnum, decimals, eps = 10**-14){
	let result;
	if (decimals > 0) {
		if (decimals === 15) {result = floatnum;}
		else {result = Math.round(floatnum * Math.pow(10, decimals) + eps) / Math.pow(10, decimals);}
	} else {result =  Math.round(floatnum);}
	return result;
}

Math.randomNum = function randomNum(min, max, options = {integer: false, includeMax: false}) {
	if (options.integer) {
		min = Math.ceil(min);
		max = Math.floor(max) + (options.includeMax ? 1 : 0);
		return (Math.random() * (max - min) | 0) + min;
	} else {
		return Math.random() * (max - min + (options.includeMax ? 1 : 0)) + min;
	}
}

Math.randomInt = function randomNum(min, max, includeMax = false) {
	return Math.randomNum(min, max, {integer: true, includeMax});
}

/* 
	Booleans
*/

// From Underscore 
function isBoolean(obj) {
	return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
}

const regExBool = /^b[A-Z]\w*/;

/* 
	Maps
*/
// Allows forward and backward iteration
try {include('..\\helpers-external\\reverse-iterable-map-5.0.0\\reverse-iterable-map.js');} catch (e) {/* continue regardless of error */}

/* 
	SMP
*/
include('helpers_xxx_prototypes_smp.js');