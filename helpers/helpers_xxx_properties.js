'use strict';
//01/09/26

/* exported setProperties, overwriteProperties, deleteProperties, getPropertyByKey, getPropertiesPairs, getPropertiesValues, getPropertiesKeys, enumeratePropertiesValues, checkJsonProperties, PanelProperties */

include('helpers_xxx_file.js');
/* global _isFile:readable, _isFolder:readable, doOnce:readable*/
include('helpers_xxx_prototypes.js');
/* global isJSON:readable */ /* window.FullPanelName:readable */

/*
	Properties
	propertiesObj 	--->	{propertyKey: [description, defaultValue, check, fallbackValue]}
	property			---> 	[description, defaultValue, check, fallbackValue]
	check			--->	{lower: val, greater: val, ...} (any combination)
	to add checks	--->	propertiesObj['propertyKey'].push(check, propertiesObj['propertyKey'][1])
*/

// Sets all properties at once using an object like this: {propertyKey : ['description',defaultValue]}
// Note it uses the get method by default. Change bForce to use Set method.
// For ex. for setting properties with UI buttons after initialization.
function setProperties(propertiesDescriptor, prefix = '', count = 1, bPadding = true, bForce = false) {
	const bNumber = count > 0;
	const propertiesDescriptorOut = { ...propertiesDescriptor };
	for (const k in propertiesDescriptor) {
		if (!Object.hasOwn(propertiesDescriptor, k)) { continue; }
		const property = propertiesDescriptorOut[k] = [...propertiesDescriptor[k]];
		const description = property[0] = prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + property[0];
		if (bForce) { // Only use set when overwriting... this is done to have default values set first and then overwriting if needed.
			if (checkProperty(property)) {
				window.SetProperty(description, property[1]);
			} else {
				window.SetProperty(description, property[3]);
			}
		} else {
			if (checkProperty(property)) {
				checkProperty(property, window.GetProperty(description, property[1]));
			} else {
				checkProperty(property, window.GetProperty(description, property[3]));
			}
		}
		if (bNumber) { count++; }
	}
	return propertiesDescriptorOut;
}

// Overwrites all properties at once
// For ex. for saving properties within a constructor (so this.propertiesDescriptor already contains count, padding, etc.).
function overwriteProperties(propertiesDescriptor) { // Equivalent to setProperties(propertiesDescriptor,'',0,false,true);
	for (const k in propertiesDescriptor) {
		if (!Object.hasOwn(propertiesDescriptor, k)) { continue; }
		const property = propertiesDescriptor[k];
		if (checkProperty(property)) {
			window.SetProperty(property[0], property[1]);
		} else {
			window.SetProperty(property[0], property[3]);
		}
	}
	return propertiesDescriptor;
}

// Deletes all properties at once
// Omits property checking so allows setting one to null and delete it, while overwriteProperties() will throw a checking popup
function deleteProperties(propertiesDescriptor) {
	for (const k in propertiesDescriptor) {
		if (!Object.hasOwn(propertiesDescriptor, k)) { continue; }
		window.SetProperty(propertiesDescriptor[k][0], null);
	}
	return propertiesDescriptor;
}

// Recreates the property object like this: {propertyKey : ['description',defaultValue]} -> {propertyKey : userSetValue}
// Returns the entire list of values
function getProperties(propertiesDescriptor, prefix = '', count = 1, bPadding = true) {
	const bNumber = count > 0;
	const output = {};
	for (const k in propertiesDescriptor) {
		if (!Object.hasOwn(propertiesDescriptor, k)) { continue; }
		output[k] = window.GetProperty(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]);
		if (bNumber) { count++; }
	}
	return output;
}

// // Recreates the property object and gets the property variable associated to propertyKey: {propertyKey : ['description', defaultValue]} -> userSetValue
function getPropertyByKey(propertiesDescriptor, key, prefix = '', count = 1, bPadding = true) {
	const bNumber = count > 0;
	let output = null;
	for (const k in propertiesDescriptor) {
		if (!Object.hasOwn(propertiesDescriptor, k)) { continue; }
		if (k === key) {
			output = window.GetProperty(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]);
			break;
		}
		if (bNumber) { count++; }
	}
	return output;
}

/**
 * Recreates the property object and returns it: {propertyKey : ['description',defaultValue]} -> {propertyKey : ['prefix + count(padded) + 'description', userSetValue]}
 * Use this to get descriptions along the values, instead of the previous ones
 *
 * @function
 * @name getPropertiesPairs
 * @kind function
 * @template P
 * @param {P} propertiesDescriptor
 * @param {string} prefix - [='']
 * @param {number} count - [=1]
 * @param {boolean} bPadding - [=true]
 * @param {boolean} bOnlyValues - [=false]
 * @returns {P}
 */
function getPropertiesPairs(propertiesDescriptor, prefix = '', count = 1, bPadding = true, bOnlyValues = false) {
	const bNumber = count > 0;
	const output = {};
	if (bOnlyValues) { // only outputs values, without description
		let cacheDescription = null;
		for (const k in propertiesDescriptor) {
			if (!Object.hasOwn(propertiesDescriptor, k)) { continue; }
			output[k] = null;
			cacheDescription = prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0];
			output[k] = window.GetProperty(cacheDescription);
			if (!checkProperty([cacheDescription, ...propertiesDescriptor[k].slice(1)], output[k])) {
				output[k] = propertiesDescriptor[k][3];
			}
			if (bNumber) { count++; }
		}
	} else {
		for (const k in propertiesDescriptor) { // entire properties object with fixed descriptions
			if (!Object.hasOwn(propertiesDescriptor, k)) { continue; }
			output[k] = [null, null];
			output[k][0] = prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0];
			output[k][1] = window.GetProperty(output[k][0]);
			if (propertiesDescriptor[k].length === 4) {
				if (!checkProperty([output[k][0], ...propertiesDescriptor[k].slice(1)], output[k][1])) {
					output[k][1] = propertiesDescriptor[k][3];
				}
				output[k][2] = propertiesDescriptor[k][2];
				output[k][3] = propertiesDescriptor[k][3];
			}
			if (bNumber) { count++; }
		}
	}
	return output;
}

// Like getProperties() but outputs just an array of values: {propertyKey : ['description',defaultValue]} -> [userSetValue1, userSetValue2, ...]
function getPropertiesValues(propertiesDescriptor, prefix = '', count = 1, skip = -1, bPadding = true) {
	const properties = getProperties(propertiesDescriptor, prefix, count, bPadding);
	const propertiesValues = [];
	if (skip === -1) { skip = Object.keys(propertiesDescriptor).length + 1; }
	let i = 0;
	for (const k in properties) {
		if (!Object.hasOwn(properties, k)) { continue; }
		i++;
		if (i < skip) {
			const property = properties[k];
			if (property !== null) { propertiesValues.push(property); }
		}
	}
	return propertiesValues;
}

// Like getPropertiesValues() but the array of keys: {propertyKey : ['description',defaultValue]} -> [propertyKey1, propertyKey2, ...]
function getPropertiesKeys(propertiesDescriptor, prefix = '', count = 1, skip = -1, bPadding = true) {
	const bNumber = count > 0;
	const propertiesKeys = [];
	if (skip === -1) { skip = Object.keys(propertiesDescriptor).length + 1; }
	let i = 0;
	for (const k in propertiesDescriptor) {
		if (!Object.hasOwn(propertiesDescriptor, k)) { continue; }
		i++;
		if (i < skip) {
			propertiesKeys.push(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]);
			if (bNumber) { count++; }
		}
	}
	return propertiesKeys;
}

// Recreates the property object and returns user set values: {propertyKey : ['description',defaultValue]} -> userSetValue1 , userSetValue2, ...
// Only returns an array of values; useful for enumerating properties at once (like tags, etc.)
function enumeratePropertiesValues(propertiesDescriptor, prefix = '', count = 1, sep = '|', skip = -1, bPadding = true) {
	const bNumber = count > 0;
	let output = '';
	if (skip === -1) { skip = Object.keys(propertiesDescriptor).length + 1; }
	let i = 0;
	for (const k in propertiesDescriptor) {
		if (!Object.hasOwn(propertiesDescriptor, k)) { continue; }
		i++;
		if (i < skip) {
			const value = String(window.GetProperty(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]));
			output += (output === '') ? value : sep + value;
			if (bNumber) { count++; }
		}
	}
	return output;
}

// Checks property against given conditions. This is called every-time a property is set, overwritten
// or get from/to the properties panel. Therefore allows for generic error checking.
// propertiesObj 	--->	{propertyKey: [description, defaultValue, check, fallbackValue]}
// property			---> 	[description, defaultValue, check, fallbackValue]
// check			--->	{lower: val, greater: val, ...} (any combination)
// to add checks	--->	propertiesObj['propertyKey'].push(check, propertiesObj['propertyKey'][1])
function checkProperty(property, withValue) {
	let bPass = true;
	let report = '';
	if (property.length < 4) { return true; }  // No checks needed (?)
	const valToCheck = (typeof withValue === 'undefined' ? property[1] : withValue);
	const checks = property[2];
	if (Object.hasOwn(checks, 'lower') && valToCheck >= checks['lower']) {
		bPass = false; report += 'Value must be lower than ' + checks['lower'] + '\n';
	}
	if (Object.hasOwn(checks, 'lowerEq') && valToCheck > checks['lowerEq']) {
		bPass = false; report += 'Value must be lower than or equal to ' + checks['lowerEq'] + '\n';
	}
	if (Object.hasOwn(checks, 'greater') && valToCheck <= checks['greater']) {
		bPass = false; report += 'Value must be greater than ' + checks['greater'] + '\n';
	}
	if (Object.hasOwn(checks, 'greaterEq') && valToCheck < checks['greaterEq']) {
		bPass = false; report += 'Value must be greater than or equal to' + checks['greaterEQ'] + '\n';
	}
	if (Object.hasOwn(checks, 'eq') && !checks['eq'].includes(valToCheck)) {
		bPass = false; report += 'Value must be equal to (any) ' + checks['eq'].join(', ') + '\n';
	}
	if (Object.hasOwn(checks, 'range') && !checks['range'].some((pair) => (valToCheck >= pair[0] && valToCheck <= pair[1]))) {
		bPass = false; report += 'Value must be within range(any) ' + checks['range'].join(' or ') + '\n';
	}
	if (Object.hasOwn(checks, 'func') && checks['func'] && !checks['func'](valToCheck)) {
		bPass = false; report += 'Value obey this condition: ' + checks['func'] + '\n';
	}
	if (Object.hasOwn(checks, 'portable') && checks['portable'] && valToCheck !== property[3] && _isFile(fb.FoobarPath + 'portable_mode_enabled') && !_isFile(valToCheck) && !_isFolder(valToCheck)) {
		console.log(window.FullPanelName + ' - Portable installation: property \'' + property[0] + '\'\n\t Replacing path \'' + valToCheck + '\' --> \'' + property[3] + '\''); // Silent?
	}
	if (!bPass) {
		doOnce(
			property[0] + ': ' + valToCheck + ' -> ' + property[3],
			() => fb.ShowPopupMessage('Property value is wrong. Using default value as fallback:\n\'' + property[0] + '\'\n\nWrong value: ' + valToCheck + '\n\nReplaced with: ' + property[3] + '\n\n' + report)
		)();
	}
	return bPass;
}

function checkJsonProperties(propertiesDescriptor) {
	let bSave = false;
	const checkChild = (obj, def, key, info) => {
		if (!Object.hasOwn(obj, key)) {
			obj[key] = def[key];
			bSave = true;
			console.log(window.FullPanelName + ': Adding missing key (' + key + ') to property \'' + info + '\'');
			return true;
		} else if (def[key] && typeof def[key] === 'object' && !Array.isArray(def[key])) {
			let bReplace = false;
			if (!obj[key] || typeof obj[key] !== 'object' || Array.isArray(obj[key])) {
				obj[key] = def[key];
				bReplace = true;
				bSave = true;
				console.log(window.FullPanelName + ': Adding mismatched variable (' + key + ') to property \'' + info + '\'');
			} else {
				for (let subKey in def[key]) {
					if (checkChild(obj[key], def[key], subKey, info)) { bReplace = true; };
				}
			}
			return bReplace;

		}
		return false;
	};
	for (const k in propertiesDescriptor) {
		const prop = propertiesDescriptor[k];
		const checks = prop[2];
		let bReplace = false;
		if (checks && checks['forceDefaults'] && checks['func'] === isJSON) {
			const obj = JSON.parse(prop[1]);
			if (!Array.isArray(obj)) {
				const def = JSON.parse(prop[3]);
				for (let key in def) {
					if (checkChild(obj, def, key, prop[0])) { bReplace = true; };
				}
				if (bReplace) {
					prop[1] = JSON.stringify(obj);
				}
			}
		}
	}
	if (bSave) { overwriteProperties(propertiesDescriptor); }
}

class PanelProperty {
	constructor(name, initVal, check = {}, defVal = initVal, { prefix = '', count = 0, bPadding = true } = {}) {
		const bNumber = count > 0;
		this.name = name;
		this.id = prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + this.name;
		this.initVal = initVal;
		this.defVal = typeof defVal === 'undefined' ? initVal : defVal;
		this.check = check;
		this.value = checkProperty([this.name, this.initVal, this.check, this.defVal])
			? window.GetProperty(this.id, this.initVal)
			: window.GetProperty(this.id, this.defVal);
		this.temp = null;
	}
	get() {
		return this.value;
	}
	set(val) {
		let bDone;
		if (this.value !== val) {
			if (checkProperty([this.name, val, this.check, this.defVal])) {
				window.SetProperty(this.id, val);
				this.value = val;
			} else {
				window.SetProperty(this.id, this.defVal);
				this.value = this.defVal;
			}
			bDone = true;
		}
		this.temp = null;
		return bDone;
	}
	change(val) {
		if (this.temp !== val) {
			this.temp = val;
			return true;
		}
		return false;
	}
	apply() {
		return this.temp === null
			? false
			: this.set(this.temp);
	}
}

class PanelProperties {
	constructor(properties, options = {}) {
		this._nameList = new Set(); // debug
		this._pptList = {}; // debug
		if (properties) { this.init(properties, { options }); }
	}
	init(properties, { type = 'auto', thisArg, options = {} } = {}) {
		switch (type) {
			case 'manual':
				for (const key in properties) {
					thisArg[key] = this.get(properties[key][0], properties[key][1]);
				}
				break;
			case 'auto':
			default: {
				let count = options.count || 0;
				for (const key in properties) {
					this.validate(key, properties[key]); //debug
					this.add(key, properties[key], count > 0 ? { ...options, count } : { ...options });
					if (count) { count++; }
				}
				break;
			}
		}
	}
	validate(key, item) {
		if (!Array.isArray(item) || item.length < 2 || typeof item[0] !== 'string') {
			throw new Error('invalid property: requires array: [string, any [, object]]\n' + item);
		}
		if (['add', 'get', 'set', 'toggle', 'init', 'validate'].includes(key)) {
			throw new Error('property_id: ' + key + '\nThis id is reserved');
		}
		if (Object.hasOwn(this, key) || Object.hasOwn(this._pptList, key)) {
			throw new Error('property_id: ' + key + 'nThis id is already occupied');
		}
		if (this._nameList.has(item[0])) {
			throw new Error('property_name: ' + key + '\nThis name is already occupied');
		}
	}
	add(key, item, options) {
		this._nameList.add(item[0]); // debug
		this._pptList[key] = new PanelProperty(item[0], item[1], item[2], item[3], options);
		Object.defineProperty(this, key, {
			get() {
				return this._pptList[key].get();
			},
			set(val) {
				this._pptList[key].set(val);
			}
		});
	}
	get(name, defVal) {
		return window.GetProperty(name, defVal);
	}
	set(name, val) {
		return window.SetProperty(name, val);
	}
	toggle(key) {
		this[key] = !this[key];
	}
	change(key, val) {
		return this._pptList[key].change(val);
	}
	save() {
		let bDone;
		for (const key in this._pptList) {
			if (this._pptList[key].apply()) { bDone = true; }
		}
		return bDone;
	}
}