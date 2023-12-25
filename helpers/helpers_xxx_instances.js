'use strict';
//25/12/23

/* exported addInstance, getInstancesByKey, removeInstance */

include('helpers_xxx.js');
/* global folders:readable, lastStartup:readable */
include('helpers_xxx_prototypes.js');
/* global SetReplacer:readable */
include('helpers_xxx_file.js');
/* global _isFile:readable, _save:readable, _deleteFile:readable, _jsonParseFileCheck:readable, utf8:readable */

/*
	Instances Manager:
	Workaround to using window.notifyOthers with other panels. Functions on intervals/timeouts don't update
	properly variables modified via callbacks, so the actual panels IDs must be read from files.
	'removeInstance' must be called via 'on_script_unload' on every panel whenever a instance is logged
	using 'addInstance'. This ensures the file is empty of IDs when foobar2000 closes. Otherwise, the file
	is cleared on consecutive foobar2000 startups.
*/
folders.xxxInstances = folders.temp + 'xxxInstances.json';
const instances = {};
instances.date = lastStartup().toString(); // Alternative to checking new startup via SDK?
instances.id = window.ID; // Could be changed to an arbitrary Id per panel

// Create file the first time and ensure the file is up to date (avoids old Ids on file from previously crashed instances)
if (!_isFile(folders.xxxInstances)) {_save(folders.xxxInstances, JSON.stringify({date: instances.date}, null, '\t'));}
else {
	const newInstances = getInstances();
	if (!newInstances || !Object.hasOwn(newInstances, 'date') || instances.date !== newInstances.date) {
		_deleteFile(folders.xxxInstances);
		_save(folders.xxxInstances, JSON.stringify({date: instances.date}, null, '\t'));
	}
}

function addInstance(newKey = window.Name) {
	const newInstances = getInstances();
	let bDone = false;
	if (newInstances) {
		if (Object.hasOwn(newInstances, newKey)) {newInstances[newKey].add(instances.id); bDone = true;}
		else {newInstances[newKey] =  new Set([instances.id]); bDone = true;}
	}
	if (bDone) {_save(folders.xxxInstances, JSON.stringify(newInstances, (k, v) => {return SetReplacer(null, v);}, '\t'));}
	return bDone;
}

function getInstances() {
	const newInstances = _jsonParseFileCheck(folders.xxxInstances, 'Instances json file', void(0), utf8);
	if (newInstances) {
		for (let key of Object.keys(newInstances)) {if (key !== 'date') {newInstances[key] = new Set(newInstances[key]);}}
	}
	return newInstances;
}

function getInstancesByKey(key = window.Name) {
	return (getInstances() || {})[key] || new Set();
}

function removeInstance(key = window.Name) {
	const newInstances = getInstances();
	let bDone = false;
	if (newInstances && Object.hasOwn(newInstances, key) && newInstances[key].has(instances.id)) {
		newInstances[key].delete(instances.id);
		if (newInstances[key].size === 0) {delete newInstances[key];}
		bDone = true;
	}
	if (bDone) {_save(folders.xxxInstances, JSON.stringify(newInstances, (k, v) => {return SetReplacer(null, v);}, '\t'));}
	return bDone;
}