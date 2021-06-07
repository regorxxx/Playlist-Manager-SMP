'use strict';
//01/06/21

/* 
	Objects
*/

function compareKeys(a, b) {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	return JSON.stringify(aKeys) === JSON.stringify(bKeys);
}

/* 
	Functions
*/

function _isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

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

function capitalize(s) {
  if (!isString(s)) {return '';}
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalizeAll(s, sep = ' ') {
  if (typeof s !== 'string') {return '';}
  return s.split(sep).map( (subS) => {return subS.charAt(0).toUpperCase() + subS.slice(1);}).join(sep); // Split, capitalize each subString and join
}

/* 
	Arrays
*/

function isArray(checkKeys) {
	if ( checkKeys === null || Object.prototype.toString.call(checkKeys) !== '[object Array]' || checkKeys.length === null || checkKeys.length === 0){
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
	var unshift = Array.prototype.unshift, splice = Array.prototype.splice;
	return function(count) {
		var len = this.length >>> 0, count = count >> 0;
		unshift.apply(this, splice.call(this, count % len, len));
		return this;
	};
})();

// Randomly rearanges the items in an array
Array.prototype.shuffle = function() {
	const result = [];
	const len = this.length;
	for (let i = len - 1; i >= 0; i--) {
		// picks an integer between 0 and i:
		const r = Math.floor(Math.random() * (i + 1));   // NOTE: use a better RNG if cryptographic security is needed
		// inserts the arr[i] element in the r-th free space in the shuffled array:
		for (let j = 0, k = 0; j <= len - 1; j++) {
			if (typeof result[j] === 'undefined') {
				if (k === r) {
					result[j] = this[i];    // NOTE: if array contains objects, this doesn't clone them! Use a better clone function instead, if that is needed. 
					break;
				}
				k++;
			}
		}
	}
	return result;
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
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
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

const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1}, (_, i) => start + (i * step));

function round(floatnum, decimals){
	let result;
	if (decimals > 0) {
		if (decimals === 15) {result = floatnum;}
		else {result = Math.round(floatnum * Math.pow(10, decimals)) / Math.pow(10, decimals);}
	} else {result =  Math.round(floatnum);}
	return result;
}

/* 
	Booleans
*/

// From Underscore 
function isBoolean(obj) {
   return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
}