'use strict';
//01/06/21

include('helpers_xxx_file.js');

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
	let bNumber = count > 0 ? true : false;
	for (let k in propertiesDescriptor){
		if (!propertiesDescriptor.hasOwnProperty(k)) {continue;}
		let description = prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0];
		if (bForce) { // Only use set when overwriting... this is done to have default values set first and then overwriting if needed.
			if (!checkProperty(propertiesDescriptor[k])) {window.SetProperty(description, propertiesDescriptor[k][3]);}
			else {window.SetProperty(description, propertiesDescriptor[k][1]);}
		} else {
			if (!checkProperty(propertiesDescriptor[k])) {checkProperty(propertiesDescriptor[k], window.GetProperty(description, propertiesDescriptor[k][3]));}
			else {checkProperty(propertiesDescriptor[k], window.GetProperty(description, propertiesDescriptor[k][1]));}
		}
		if (bNumber) {count++;}
	}
	return propertiesDescriptor;
}

// Overwrites all properties at once
// For ex. for saving properties within a constructor (so this.propertiesDescriptor already contains count, padding, etc.).
function overwriteProperties(propertiesDescriptor) { // Equivalent to setProperties(propertiesDescriptor,'',0,false,true);
	for (let k in propertiesDescriptor){
		if (!propertiesDescriptor.hasOwnProperty(k)) {continue;}
		if (!checkProperty(propertiesDescriptor[k])) {
			window.SetProperty(propertiesDescriptor[k][0], propertiesDescriptor[k][3]);
		} else {
			window.SetProperty(propertiesDescriptor[k][0], propertiesDescriptor[k][1]);
		}
	}
	return propertiesDescriptor;
}

// Deletes all properties at once
// Omits property checking so allows setting one to null and delete it, while overwriteProperties() will throw a checking popup
function deleteProperties(propertiesDescriptor) { 
	for (let k in propertiesDescriptor) {
	if (!propertiesDescriptor.hasOwnProperty(k)) {continue;}
		window.SetProperty(propertiesDescriptor[k][0], null);
	}
	return propertiesDescriptor;
}

// Recreates the property object like this: {propertyKey : ['description',defaultValue]} -> {propertyKey : userSetValue}
// Returns the entire list of values
function getProperties(propertiesDescriptor, prefix = '', count = 1, bPadding = true) {
	let bNumber = count > 0 ? true : false;
	let output = {};
	for (let k in propertiesDescriptor){
		if (!propertiesDescriptor.hasOwnProperty(k)) {continue;}
		output[k] = window.GetProperty(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]);
		if (bNumber) {count++;}
	}
	return output;
}

// // Recreates the property object and gets the property variable associated to propertyKey: {propertyKey : ['description', defaultValue]} -> userSetValue
function getPropertyByKey(propertiesDescriptor, key, prefix = '', count = 1, bPadding = true) {
	let bNumber = count > 0 ? true : false;
	let output = null;
	for (let k in propertiesDescriptor){
		if (!propertiesDescriptor.hasOwnProperty(k)) {continue;}
		if (k === key) {
			output = window.GetProperty(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]);
			break;
		}
		if (bNumber) {count++;}
	}
	return output;
}

// Recreates the property object and returns it: {propertyKey : ['description',defaultValue]} -> {propertyKey : ['prefix + count(padded) + 'description', userSetValue]}
// Use this to get descriptions along the values, instead of the previous ones
function getPropertiesPairs(propertiesDescriptor, prefix = '', count = 1, bPadding = true, bOnlyValues = false) {
	let bNumber = count > 0 ? true : false;
	let output = {};
	if (bOnlyValues) { // only outputs values, without description
		let cacheDescription = null;
		for (let k in propertiesDescriptor){
			if (!propertiesDescriptor.hasOwnProperty(k)) {continue;}
			output[k] = null;
			cacheDescription = prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0];
			output[k] = window.GetProperty(cacheDescription);
			if (!checkProperty(propertiesDescriptor[k], output[k])) {
				output[k] = propertiesDescriptor[k][3];
			}
			if (bNumber) {count++;}
		}
	} else {
		for (let k in propertiesDescriptor){ // entire properties object with fixed descriptions
			if (!propertiesDescriptor.hasOwnProperty(k)) {continue;}
			output[k] = [null,null];
			output[k][0] =  prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0];
			output[k][1] = window.GetProperty(output[k][0]);
			if (propertiesDescriptor[k].length === 4) {
				if (!checkProperty(propertiesDescriptor[k], output[k][1])) {
					output[k][1] = propertiesDescriptor[k][3];
				}
				output[k][2] =  propertiesDescriptor[k][2];
				output[k][3] =  propertiesDescriptor[k][3];
			}
			if (bNumber) {count++;}
		}
	}
	return output;
}

// Like getProperties() but outputs just an array of values: {propertyKey : ['description',defaultValue]} -> [userSetValue1, userSetValue2, ...]
function getPropertiesValues(propertiesDescriptor, prefix = '', count = 1, skip = -1, bPadding = true) {
	let properties = getProperties(propertiesDescriptor, prefix, count, bPadding);
	let propertiesValues = [];
	if (skip === -1) {skip = Object.keys(propertiesDescriptor).length + 1;}
	let i = 0;
	for (let k in properties){
		if (!properties.hasOwnProperty(k)) {continue;}
		i++;
		if (i < skip) {
			let property = properties[k];
			if (property !== null) {propertiesValues.push(property);}
		}
	}
	return propertiesValues;
}

// Like getPropertiesValues() but the array of keys: {propertyKey : ['description',defaultValue]} -> [propertyKey1, propertyKey2, ...]
function getPropertiesKeys(propertiesDescriptor, prefix = '', count = 1, skip = -1, bPadding = true) {
	let bNumber = count > 0 ? true : false;
	let propertiesKeys = [];
	if (skip === -1) {skip = Object.keys(propertiesDescriptor).length + 1;}
	let i = 0;
	for (let k in propertiesDescriptor){
		if (!propertiesDescriptor.hasOwnProperty(k)) {continue;}
		i++;
		if (i < skip) {
			propertiesKeys.push(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0]);
			if (bNumber) {count++;}
		}
	}
	return propertiesKeys;
}

// Recreates the property object and returns user set values: {propertyKey : ['description',defaultValue]} -> userSetValue1 , userSetValue2, ...
// Only returns an array of values; useful for enumerating properties at once (like tags, etc.)
function enumeratePropertiesValues(propertiesDescriptor, prefix = '', count = 1, sep = '|', skip = -1, bPadding = true) {
	let bNumber = count > 0 ? true : false;
	let output = '';
	if (skip === -1) {skip = Object.keys(propertiesDescriptor).length + 1;}
	let i = 0;
	for (let k in propertiesDescriptor){
		if (!propertiesDescriptor.hasOwnProperty(k)) {continue;}
		i++;
		if (i < skip) {
			let value = String(window.GetProperty(prefix + (bNumber ? (bPadding ? ('00' + count).slice(-2) : count) : '') + ((prefix || bNumber) ? '.' : '') + propertiesDescriptor[k][0])); // TODO: toString();
			output += (output === '') ? value : sep + value ;
			if (bNumber) {count++;}
		}
	}
	return output;
}

// Checks property against given conditions. This is called everytime a property is set, overwritten
// or get from/to the properties panel. Therefore allows for generic error checking.
// propertiesObj 	--->	{propertyKey: [description, defaultValue, check, fallbackValue]}
// property			---> 	[description, defaultValue, check, fallbackValue]
// check			--->	{lower: val, greater: val, ...} (any combination)
// to add checks	--->	propertiesObj['propertyKey'].push(check, propertiesObj['propertyKey'][1])
function checkProperty(property, withValue) {
	let bPass = true;
	let report = '';
	if (property.length !== 4) {return true;}  // No checks needed (?)
	const valToCheck = (typeof withValue !== 'undefined' ? withValue : property[1]);
	const checks = property[2];
	if (checks.hasOwnProperty('lower') && valToCheck >= checks['lower']) {
		bPass = false; report += 'Value must be lower than ' + checks['lower'] + '\n';
	}
	if (checks.hasOwnProperty('lowerEq') && valToCheck > checks['lowerEq']) {
		bPass = false; report += 'Value must be lower than or equal to ' + checks['lowerEq'] + '\n';
	}
	if (checks.hasOwnProperty('greater') && valToCheck <= checks['greater']) {
		bPass = false; report += 'Value must be greater than ' + checks['greater'] + '\n';
	}
	if (checks.hasOwnProperty('greaterEq') && valToCheck < checks['greaterEq']) {
		bPass = false; report += 'Value must be greater than or equal to' + checks['greaterEQ'] + '\n';
	}
	if (checks.hasOwnProperty('eq') && checks['eq'].indexOf(valToCheck) === -1) {
		bPass = false; report += 'Value must be equal to (any) ' + checks['eq'].join(', ') + '\n';
	}
	if (checks.hasOwnProperty('range') && !checks['range'].some( (pair) => {return (valToCheck >= pair[0] && valToCheck <= pair[1]);})) {
		bPass = false; report += 'Value must be within range(any) ' + checks['range'].join(' or ') + '\n';
	}
	if (checks.hasOwnProperty('func') && checks['func'] && !checks['func'](valToCheck)) {
		bPass = false; report += 'Value obey this condition: ' + checks['func'] + '\n';
	}
	if (checks.hasOwnProperty('portable') && checks['portable'] && valToCheck !== property[3] && _isFile(fb.FoobarPath + 'portable_mode_enabled') && !_isFile(valToCheck) && !_isFolder(valToCheck)) {
		console.log(window.Name + ' - Portable installation: property \'' + property[0] + '\'\nReplacing path \'' + valToCheck + '\' --> \'' + property[3] + '\''); // Silent?
		// TODO warn about using relative paths?
	}
	if (!bPass) {
		fb.ShowPopupMessage('Property value is wrong. Using default value as fallback:\n\'' + property[0] + '\'\nWrong value: ' + valToCheck + '\nReplaced with: ' + property[3] + '\n' + report);
	}
	return bPass;
}