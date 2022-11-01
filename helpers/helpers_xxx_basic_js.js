'use strict';
//01/10/22

// https://github.com/angus-c/just
/*
  Deep clones all properties except functions
*/
function clone(obj) {
	if (typeof obj === 'function') {return obj;}
	let result;
	if (obj instanceof Set) {
		result = new Set();
		for (let value of obj) {
			// include prototype properties
			let type = {}.toString.call(value).slice(8, -1);
			if (type === 'Array' || type === 'Object') {
				result.add(clone(value));
			} else if (type === 'Date') {
				result.add(new Date(value.getTime()));
			} else if (type === 'RegExp') {
				result.add(RegExp(value.source, getRegExpFlags(value)));
			} else {
				result.add(value);
			}
		}
		return result;
	} else if (obj instanceof Map) {
		result = new Map();
		for (let [key, value] of obj) {
			// include prototype properties
			let type = {}.toString.call(value).slice(8, -1);
			if (type === 'Array' || type === 'Object') {
				result.set(key, clone(value));
			} else if (type === 'Date') {
				result.set(key, new Date(value.getTime()));
			} else if (type === 'RegExp') {
				result.set(key, RegExp(value.source, getRegExpFlags(value)));
			} else {
				result.set(key, value);
			}
		}
		return result;
	} else {
		result = Array.isArray(obj) ? [] : {};
		for (let key in obj) {
			// include prototype properties
			let value = obj[key];
			let type = {}.toString.call(value).slice(8, -1);
			if (type === 'Array' || type === 'Object') {
				result[key] = clone(value);
			} else if (type === 'Date') {
				result[key] = new Date(value.getTime());
			} else if (type === 'RegExp') {
				result[key] = RegExp(value.source, getRegExpFlags(value));
			} else {
				result[key] = value;
			}
		}
	}
	return result;
}

function getRegExpFlags(regExp) {
		if (typeof regExp.source.flags === 'string') {
		return regExp.source.flags;
	} else {
		let flags = [];
		regExp.global && flags.push('g');
		regExp.ignoreCase && flags.push('i');
		regExp.multiline && flags.push('m');
		regExp.sticky && flags.push('y');
		regExp.unicode && flags.push('u');
		return flags.join('');
	}
}

function randomString(len, charSet) {
	charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let randomString = '';
	for (let i = 0; i < len; i++) {
		let randomPoz = Math.floor(Math.random() * charSet.length);
		randomString += charSet.substring(randomPoz, randomPoz + 1);
	}
	return randomString;
}

// Repeat execution indefinitely according to interval (ms). Ex:
// const repeatedFunction = repeatFn(function, ms);
// repeatedFunction(arguments);
const repeatFn = (fn, ms) => {
	return (ms > 0 && Number.isFinite(ms) ? (...args) => {return setInterval(fn.bind(this, ...args), ms);} : () => {return null;});
};

// Delay execution according to interval (ms). Ex:
// const delayedFunction = delayFn(function, ms);
// delayedFunction(arguments);
const delayFn = (fn, ms) => {
	return (ms >= 0 && Number.isFinite(ms) ? (...args) => {return setTimeout(fn.bind(this, ...args), ms);} : () => {return null;});
};

// Halt execution if trigger rate is greater than delay (ms), so it fires only once after successive calls. Ex:
// const debouncedFunction = debounce(function, delay[, immediate]);
// debouncedFunction(arguments);
const debounce = (fn, delay, immediate) => {
	let timerId;
	return (...args) => {
		const boundFunc = fn.bind(this, ...args);
		clearTimeout(timerId);
		if (immediate && !timerId) {
			boundFunc();
		}
		const calleeFunc = immediate ? () => {timerId = null;} : boundFunc;
		timerId = setTimeout(calleeFunc, delay);
	};
};

// Limit the rate at which a function can fire to delay (ms).
// var throttledFunction = throttle(function, delay[, immediate]);
// throttledFunction(arguments);
const throttle = (fn, delay, immediate) => {
	let timerId;
	return (...args) => {
		const boundFunc = fn.bind(this, ...args);
		if (timerId) {
			return;
		}
		if (immediate && !timerId) {
			boundFunc();
		}
		timerId = setTimeout(() => {
			if(!immediate) {
				boundFunc(); 
			}
			timerId = null; 
		}, delay);
	};
};

// Fire functions only once
const doOnceCache = [];
const doOnce = (task, fn) => {
	return (...args) => {
		if(doOnceCache.indexOf(task) === -1) {
			doOnceCache.push(task);
			return fn(...args);
		}
	};
};

function tryFunc(fn) {
	return (...args) => {
		let cache;
		try {cache = fn(...args);} catch(e) {/* continue regardless of error */}
		return cache;
	};
}

function tryMethod(fn, parent) {
	return (...args) => {
		let cache;
		try {cache = parent[fn](...args);} catch(e) {/* continue regardless of error */}
		return cache;
	};
}

/* 
	Array and objects manipulation 
*/

// Expects key,value,key,value,...
// or key,value,value;key,value,...
// Outputs {key: value, key: value, ...}
// or  {key: [value, ...], key: [value, ...]}
function convertStringToObject(string, valueType, separator = ',', secondSeparator) {
	if (string === null || string === '') {
		return null;
	} else {
		let output = {};
		let array = [];
		if (secondSeparator) { // Split 2 times
			array = string.split(secondSeparator);
			for (let j = 0; j < array.length; j++) {
				let subArray = array[j].split(separator);
				if (subArray.length >= 2) {
					output[subArray[0]] = []; // First value is always the key
					for (let i = 1; i < subArray.length; i++) {
						if (valueType === 'string') {
							output[subArray[0]].push(subArray[i]);
						} else if (valueType === 'number') {
							output[subArray[0]].push(Number(subArray[i]));
						}
					}
				}
			}
		} else { // Only once
			array = string.split(separator);
			for (let i = 0; i < array.length; i += 2) {
				if (valueType === 'string') {
					output[array[i]] = array[i + 1];
				} else if (valueType === 'number') {
					output[array[i]] = Number(array[i + 1]);
				}
			}
		}
		return output;
	}
}

// Expects {key: value, key: value, ...}
// or  {key: [value, ...], key: [value, ...]}
// Outputs key,value,key,value,...
// or key,value,value;key,value,...
function convertObjectToString(object, separator = ',') {
	if (!object || !Object.keys(object).length) {
		return '';
	} else {
		let keys = Object.keys(object);
		let output = '';
		for(let i = 0; i < keys.length; i++) {
			output += (output.length) ? separator + keys[i] + separator + object[keys[i]] : keys[i] + separator + object[keys[i]];
		}
		return output;
	}
}

function SetReplacer(key, value) {
	return (typeof value === 'object' && value instanceof Set ? [...value] : value);
}

function MapReplacer(key, value) {
	return (typeof value === 'object' && value instanceof Map ?  [...value.entries()] : value);
}

/*
	Script including
*/
let module = {}, exports = {};
module.exports = null;

function require(script) {
	let newScript = script;
	['helpers-external', 'main', 'examples', 'buttons'].forEach((folder) => {newScript.replace(new RegExp('^\.\\\\' + folder + '\\\\', 'i'), '..\\' + folder + '\\');});
	['helpers'].forEach((folder) => {newScript.replace(new RegExp('^\.\\\\' + folder + '\\\\', 'i'), '');});
	include(newScript + '.js');
	return module.exports;
}