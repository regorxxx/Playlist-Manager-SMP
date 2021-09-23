'use strict';
//01/06/21
include(fb.ComponentPath + 'docs\\Codepages.js');
include(fb.ComponentPath + 'docs\\Flags.js');
include('helpers_xxx_basic_js.js');

/* 
	Global Variables 
*/

// Folders
const folders = {};
folders.xxxName = 'scripts\\SMP\\xxx-scripts\\'; // Edit here to change install path (this is relative to the profile path)
folders.dataName = 'js_data\\';
folders.xxx = fb.ProfilePath + folders.xxxName; 
folders.data = fb.ProfilePath + folders.dataName;

// Async processing
const iStepsLibrary = 100; // n steps to split whole library processing: check library tags, pre-cache paths, etc.
const iDelayLibrary = 100; // ms per step for whole handle processing
const iDelayPlaylists = 50; // ms per step for playlist processing: playlist manager
const iDelaySBDCache = 15; // ms per step for playlist processing: playlist manager

/* 
	Functions
*/

// Repeat execution indefinitely according to interval (ms). Ex:
// const repeatedFunction = repeatFn(function, ms);
// repeatedFunction(arguments);
const repeatFn = (func, ms) => {
	return (...args) => {return setInterval(func.bind(this, ...args), ms);};
};

// Delay execution according to interval (ms). Ex:
// const delayedFunction = delayFn(function, ms);
// delayedFunction(arguments);
const delayFn = (func, ms) => {
	return (...args) => {return setTimeout(func.bind(this, ...args), ms);};
};

// Halt execution if trigger rate is greater than delay (ms), so it fires only once after successive calls. Ex:
// const debouncedFunction = debounce(function, delay[, immediate]);
// debouncedFunction(arguments);
const debounce = (func, delay, immediate) => {
	let timerId;
	return (...args) => {
		const boundFunc = func.bind(this, ...args);
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
const throttle = (func, delay, immediate) => {
	let timerId;
	return (...args) => {
		const boundFunc = func.bind(this, ...args);
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
var doOnceCache = [];
const doOnce = (task, fn) => {
	return (...args) => {
		if(doOnceCache.indexOf(task) === -1) {
			doOnceCache.push(task);
			return fn(...args);
		}
	};
};

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